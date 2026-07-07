-- Create standalone RPCs for guarda self-registration flow
-- These functions are required by the frontend at /guardas/cadastro
-- They are idempotent and can be safely applied even if the refactoring
-- migration (20260702000020) was never run.

-- 1. Validate guarda data for self-registration
CREATE OR REPLACE FUNCTION public.validar_dados_guarda(
  p_cpf text,
  p_matricula text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda public.guardas_municipais%ROWTYPE;
  v_graduacao_nome text;
  v_ja_possui_conta boolean;
BEGIN
  SELECT gm.* INTO v_guarda
  FROM public.guardas_municipais gm
  WHERE gm.cpf = p_cpf AND gm.matricula = p_matricula
  LIMIT 1;

  IF v_guarda.id IS NULL THEN
    RETURN jsonb_build_object('status', 'nao_encontrado', 'mensagem', 'O CPF e a matrícula informados não conferem com o cadastro da Guarda Municipal. Procure o gestor da Guarda Municipal.');
  END IF;

  IF v_guarda.ativo = false THEN
    RETURN jsonb_build_object('status', 'nao_encontrado', 'mensagem', 'Este Guarda Municipal está inativo. Procure o gestor da Guarda Municipal.');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.guardas_usuarios WHERE guarda_id = v_guarda.id
  ) INTO v_ja_possui_conta;

  IF v_ja_possui_conta THEN
    RETURN jsonb_build_object('status', 'ja_possui_conta', 'mensagem', 'Este Guarda Municipal já possui uma conta cadastrada. Procure o login.');
  END IF;

  SELECT nome INTO v_graduacao_nome
  FROM public.guarda_municipal_graduacoes
  WHERE id = v_guarda.graduacao_id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'guarda_id', v_guarda.id,
    'nome', v_guarda.nome,
    'matricula', v_guarda.matricula,
    'graduacao_id', v_guarda.graduacao_id,
    'graduacao_nome', v_graduacao_nome
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validar_dados_guarda(text, text) TO anon, authenticated;

-- 2. Create auth user and link to guarda (used after self-registration validation)
CREATE OR REPLACE FUNCTION public.criar_acesso_guarda(
  p_guarda_id uuid,
  p_email text,
  p_senha text,
  p_nome text DEFAULT NULL,
  p_apelido text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_user_id uuid;
  v_ja_possui boolean;
  v_nome_exibir text;
BEGIN
  v_nome_exibir := COALESCE(NULLIF(trim(p_apelido), ''), NULLIF(trim(p_nome), ''), 'Guarda Municipal');

  SELECT EXISTS(
    SELECT 1 FROM public.guardas_usuarios WHERE guarda_id = p_guarda_id
  ) INTO v_ja_possui;

  IF v_ja_possui THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Este Guarda Municipal já possui uma conta cadastrada.');
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(p_email))) THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Este e-mail já está em uso por outro usuário.');
  END IF;

  v_new_user_id := extensions.gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    aud, role
  ) VALUES (
    v_new_user_id,
    '00000000-0000-0000-0000-000000000000',
    lower(trim(p_email)),
    extensions.crypt(p_senha, extensions.gen_salt('bf')),
    now(), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('name', v_nome_exibir, 'full_name', p_nome, 'tipo', 'guarda_municipal'),
    now(), now(),
    '', '', '', '',
    'authenticated', 'authenticated'
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_new_user_id,
    v_new_user_id,
    jsonb_build_object('sub', v_new_user_id::text, 'email', lower(trim(p_email))),
    'email',
    lower(trim(p_email)),
    now(), now(), now()
  );

  INSERT INTO public.guardas_usuarios (guarda_id, usuario_id)
  VALUES (p_guarda_id, v_new_user_id);

  RETURN jsonb_build_object(
    'sucesso', true,
    'user_id', v_new_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_acesso_guarda(uuid, text, text, text, text) TO anon;
