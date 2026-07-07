-- =====================================================
-- MIGRATION: Refactor Guardas Auth — Remove dual auth
-- Separates functional registration from authentication.
-- Auth is now exclusively handled by Supabase Auth.
-- =====================================================

-- 1. Drop trigger and function that was hashing passwords on INSERT/UPDATE
DROP TRIGGER IF EXISTS trigger_hash_guarda_senha ON public.guardas_municipais;
DROP FUNCTION IF EXISTS public.trigger_hash_guarda_senha();

-- 2. Drop auth-related RPCs no longer needed
DROP FUNCTION IF EXISTS public.gerar_senha_guarda();
DROP FUNCTION IF EXISTS public.gerar_senha_unica_guarda();
DROP FUNCTION IF EXISTS public.autenticar_guarda(text, text);
DROP FUNCTION IF EXISTS public.alterar_senha_guarda(uuid, text, text);
DROP FUNCTION IF EXISTS public.provision_all_guardas_auth();

-- 3. Recreate profile-detection functions (may not exist if old migrations weren't applied)
CREATE OR REPLACE FUNCTION public.is_guarda() RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.guardas_usuarios
    WHERE usuario_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.buscar_guarda_por_usuario(
  p_usuario_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda record;
BEGIN
  SELECT gm.id, gm.matricula, gm.nome, gm.cpf, gm.graduacao_id,
         gm.email, gm.telefone,
         ggn.nome as graduacao_nome
  INTO v_guarda
  FROM public.guardas_municipais gm
  JOIN public.guardas_usuarios gu ON gu.guarda_id = gm.id
  LEFT JOIN public.guarda_municipal_graduacoes ggn ON ggn.id = gm.graduacao_id
  WHERE gu.usuario_id = p_usuario_id;

  IF v_guarda.id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_guarda.id,
    'matricula', v_guarda.matricula,
    'nome', v_guarda.nome,
    'cpf', v_guarda.cpf,
    'graduacao_id', v_guarda.graduacao_id,
    'graduacao_nome', v_guarda.graduacao_nome,
    'email', v_guarda.email,
    'telefone', v_guarda.telefone
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_guarda() TO authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_guarda_por_usuario(uuid) TO authenticated;

-- 4. Remove auth columns from guardas_municipais (functional data only)
ALTER TABLE public.guardas_municipais
  DROP COLUMN IF EXISTS senha,
  DROP COLUMN IF EXISTS senha_provisoria,
  DROP COLUMN IF EXISTS primeira_vez_acesso,
  DROP COLUMN IF EXISTS data_criacao_senha,
  DROP COLUMN IF EXISTS data_ultimo_acesso;

-- 5. RPC: Validate guarda data for self-registration
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

-- 6. RPC: Create auth user and link to guarda (used after self-registration validation)
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

-- 7. RPC: Temporary password reset for existing guards (CPF-based, transition only)
CREATE OR REPLACE FUNCTION public.redefinir_senha_guarda(
  p_cpf text,
  p_nova_senha text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda_id uuid;
  v_usuario_id uuid;
BEGIN
  SELECT gm.id INTO v_guarda_id
  FROM public.guardas_municipais gm
  WHERE gm.cpf = p_cpf AND gm.ativo = true;

  IF v_guarda_id IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Guarda não encontrado ou inativo.');
  END IF;

  SELECT gu.usuario_id INTO v_usuario_id
  FROM public.guardas_usuarios gu
  WHERE gu.guarda_id = v_guarda_id;

  IF v_usuario_id IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Guarda não possui conta de acesso. Utilize o link de cadastro enviado pelo gestor.');
  END IF;

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_nova_senha, extensions.gen_salt('bf'))
  WHERE id = v_usuario_id;

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Senha redefinida com sucesso. Agora faça login com seu e-mail e a nova senha.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.redefinir_senha_guarda(text, text) TO anon;

-- 8. Update RLS policies for guardas_municipais and guardas_usuarios
DROP POLICY IF EXISTS "Guardas can manage guardas municipais" ON public.guardas_municipais;
DROP POLICY IF EXISTS "Gestores and Super admins can manage guardas_usuarios" ON public.guardas_usuarios;
DROP POLICY IF EXISTS "guardas_usuarios_policy" ON public.guardas_usuarios;

CREATE POLICY "Guardas can manage guardas municipais"
ON public.guardas_municipais
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
      AND pu.papel = 'tecnico'::public.papel_usuario
      AND pu.setor_id = public.get_guarda_municipal_setor_id()
  )
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
      AND pu.papel = 'tecnico'::public.papel_usuario
      AND pu.setor_id = public.get_guarda_municipal_setor_id()
  )
);

CREATE POLICY "guardas_usuarios_policy"
ON public.guardas_usuarios
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
      AND pu.papel = 'tecnico'::public.papel_usuario
      AND pu.setor_id = public.get_guarda_municipal_setor_id()
  )
  OR usuario_id = auth.uid()
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
      AND pu.papel = 'tecnico'::public.papel_usuario
      AND pu.setor_id = public.get_guarda_municipal_setor_id()
  )
);
