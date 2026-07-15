-- Self-registration for concessionários (similar to guardas flow)
-- Adds: email + data_autocadastro columns, bridge table, validation + creation RPCs

-- 1. Add columns to demutran_concessionarios
ALTER TABLE public.demutran_concessionarios
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS data_autocadastro timestamptz;

-- 2. Create bridge table (concessionario <-> auth.users)
CREATE TABLE IF NOT EXISTS public.demutran_concessionario_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concessionario_id uuid NOT NULL REFERENCES public.demutran_concessionarios(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (concessionario_id, usuario_id)
);

ALTER TABLE public.demutran_concessionario_usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage concessionario usuarios" ON public.demutran_concessionario_usuarios;
CREATE POLICY "Admins can manage concessionario usuarios"
ON public.demutran_concessionario_usuarios
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_demutran_content(dc.setor_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_demutran_content(dc.setor_id)
  )
);

-- 3. RPC: validate concessionário by CPF
CREATE OR REPLACE FUNCTION public.validar_dados_concessionario(
  p_cpf text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.demutran_concessionarios%ROWTYPE;
  v_cpf_limpo text;
BEGIN
  v_cpf_limpo := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');

  IF char_length(v_cpf_limpo) <> 11 THEN
    RETURN jsonb_build_object('status', 'nao_encontrado', 'mensagem', 'CPF inválido.');
  END IF;

  SELECT *
  INTO v_row
  FROM public.demutran_concessionarios
  WHERE regexp_replace(coalesce(cpf, ''), '\D', '', 'g') = v_cpf_limpo
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('status', 'nao_encontrado', 'mensagem', 'CPF não encontrado. Verifique se o concessionário já foi cadastrado pelo DEMUTRAN.');
  END IF;

  IF v_row.ativo = false THEN
    RETURN jsonb_build_object('status', 'nao_encontrado', 'mensagem', 'Este concessionário está inativo. Procure o DEMUTRAN.');
  END IF;

  -- Check if already has self-registration
  IF v_row.data_autocadastro IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'ja_cadastrado', 'mensagem', 'Este concessionário já possui cadastro de acesso. Faça login com seu CPF e senha.');
  END IF;

  RETURN jsonb_build_object(
    'status', 'ok',
    'concessionario_id', v_row.id,
    'nome', v_row.titular_nome,
    'categoria', v_row.categoria,
    'categoria_label',
      CASE v_row.categoria
        WHEN 'mototaxi' THEN 'Moto-taxi'
        WHEN 'taxi' THEN 'Taxi'
        WHEN 'carro_horario' THEN 'Carro de horário'
        WHEN 'fretista' THEN 'Fretista'
        ELSE v_row.categoria::text
      END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validar_dados_concessionario(text) TO anon, authenticated;

-- 4. RPC: create concessionário access (auth.users + link + update acessos table)
CREATE OR REPLACE FUNCTION public.criar_acesso_concessionario(
  p_concessionario_id uuid,
  p_email text,
  p_senha text,
  p_nome text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_concessionario public.demutran_concessionarios%ROWTYPE;
  v_cpf_limpo text;
  v_user_id uuid;
  v_email_normalizado text;
  v_nome_exibir text;
BEGIN
  v_email_normalizado := lower(trim(p_email));

  IF v_email_normalizado = '' THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Informe um e-mail válido.');
  END IF;

  IF length(coalesce(p_senha, '')) < 6 THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'A senha precisa ter pelo menos 6 caracteres.');
  END IF;

  SELECT *
  INTO v_concessionario
  FROM public.demutran_concessionarios
  WHERE id = p_concessionario_id
    AND ativo = true;

  IF v_concessionario.id IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Concessionário não encontrado ou inativo.');
  END IF;

  v_cpf_limpo := regexp_replace(coalesce(v_concessionario.cpf, ''), '\D', '', 'g');
  IF char_length(v_cpf_limpo) <> 11 THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'CPF inválido no cadastro. Procure o DEMUTRAN.');
  END IF;

  -- Check if already has self-registration
  IF v_concessionario.data_autocadastro IS NOT NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Este concessionário já possui cadastro de acesso.');
  END IF;

  -- Check if email already in use by another concessionário user
  IF EXISTS (
    SELECT 1
    FROM public.demutran_concessionario_usuarios dcu
    JOIN auth.users u ON u.id = dcu.usuario_id
    WHERE u.email = v_email_normalizado
      AND dcu.concessionario_id <> p_concessionario_id
  ) THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Este e-mail já está em uso por outro concessionário.');
  END IF;

  v_nome_exibir := COALESCE(NULLIF(trim(p_nome), ''), 'Concessionário');

  -- Create auth.users
  INSERT INTO auth.users (
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    aud,
    role
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_email_normalizado,
    extensions.crypt(p_senha, extensions.gen_salt('bf')),
    now(),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('name', v_nome_exibir, 'full_name', v_nome_exibir, 'tipo', 'concessionario'),
    now(),
    now(),
    '',
    '',
    '',
    '',
    'authenticated',
    'authenticated'
  )
  RETURNING id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Erro ao criar usuário de autenticação.');
  END IF;

  -- Create identity (email provider)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email_normalizado),
    'email',
    v_email_normalizado,
    now(),
    now(),
    now()
  );

  -- Link concessionário to auth user
  INSERT INTO public.demutran_concessionario_usuarios (concessionario_id, usuario_id)
  VALUES (p_concessionario_id, v_user_id);

  -- Sync password to demutran_concessionario_acessos (so CPF + senha login also works)
  INSERT INTO public.demutran_concessionario_acessos (
    concessionario_id,
    cpf_normalizado,
    senha_hash
  )
  VALUES (
    p_concessionario_id,
    v_cpf_limpo,
    extensions.crypt(p_senha, extensions.gen_salt('bf'))
  )
  ON CONFLICT (concessionario_id)
  DO UPDATE SET
    cpf_normalizado = EXCLUDED.cpf_normalizado,
    senha_hash = EXCLUDED.senha_hash,
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = now();

  -- Update concessionário record
  UPDATE public.demutran_concessionarios
  SET
    email = v_email_normalizado,
    data_autocadastro = now(),
    updated_at = now()
  WHERE id = p_concessionario_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'user_id', v_user_id,
    'concessionario_id', p_concessionario_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_acesso_concessionario(uuid, text, text, text) TO anon, authenticated;
