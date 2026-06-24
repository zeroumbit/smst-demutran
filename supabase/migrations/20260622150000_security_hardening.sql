-- =====================================================
-- MIGRATION: Security Hardening
-- Fixes RLS, rate limiting, input validation, secrets
-- =====================================================

-- =====================================================
-- 1. demutran-anexos STORAGE RLS
-- =====================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Public can upload demutran anexos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can manage demutran anexos" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload public demutran documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload demutran documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read demutran documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update demutran documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete demutran documents" ON storage.objects;

-- Anon can only upload to credenciais/ and recursos/ folders
CREATE POLICY "Anon can upload public demutran documents"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'demutran-anexos'
  AND (storage.foldername(name))[1] IN ('credenciais', 'recursos')
);

-- Authenticated users can only upload files they own
CREATE POLICY "Authenticated can upload demutran documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'demutran-anexos'
  AND auth.uid() = owner
);

-- Authenticated can read: own files OR if they manage demutran content
CREATE POLICY "Authenticated can read demutran documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'demutran-anexos'
  AND (
    auth.uid() = owner
    OR public.is_admin_of_setor(public.get_demutran_setor_id())
  )
);

-- Authenticated can update: own files OR if they manage demutran content
CREATE POLICY "Authenticated can update demutran documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'demutran-anexos'
  AND (
    auth.uid() = owner
    OR public.is_admin_of_setor(public.get_demutran_setor_id())
  )
)
WITH CHECK (
  bucket_id = 'demutran-anexos'
  AND (
    auth.uid() = owner
    OR public.is_admin_of_setor(public.get_demutran_setor_id())
  )
);

-- Authenticated can delete: own files OR if they manage demutran content
CREATE POLICY "Authenticated can delete demutran documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'demutran-anexos'
  AND (
    auth.uid() = owner
    OR public.is_admin_of_setor(public.get_demutran_setor_id())
  )
);

-- =====================================================
-- 2. CONTATOS TABLE - Restrict public access
-- =====================================================

-- Revoke dangerous grants to anon
REVOKE ALL ON TABLE public.contatos FROM anon;

-- Drop public read policy (internal data, not for public)
DROP POLICY IF EXISTS "Public read active contatos" ON public.contatos;

ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;

-- Admin-only management policy (contatos has no setor_id column)
DROP POLICY IF EXISTS "Admins can manage contatos" ON public.contatos;
DROP POLICY IF EXISTS "Admins can manage all contatos" ON public.contatos;
CREATE POLICY "Admins can manage contatos"
ON public.contatos
FOR ALL
TO authenticated
USING (public.is_super_admin() OR EXISTS (
  SELECT 1 FROM public.perfis_usuarios
  WHERE user_id = auth.uid() AND ativo = true
  AND papel IN ('gestor'::public.papel_usuario, 'admin_setor'::public.papel_usuario)
))
WITH CHECK (public.is_super_admin() OR EXISTS (
  SELECT 1 FROM public.perfis_usuarios
  WHERE user_id = auth.uid() AND ativo = true
  AND papel IN ('gestor'::public.papel_usuario, 'admin_setor'::public.papel_usuario)
));

-- =====================================================
-- 3. AUTENTICAR_CONCESSIONARIO - Rate limiting
-- =====================================================

ALTER TABLE public.demutran_concessionario_acessos
  ADD COLUMN IF NOT EXISTS failed_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz;

CREATE OR REPLACE FUNCTION public.autenticar_concessionario(
  _cpf text,
  _senha text
)
RETURNS TABLE (
  session_token uuid,
  concessionario jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(_cpf, ''), '\D', '', 'g');
  v_access public.demutran_concessionario_acessos%ROWTYPE;
  v_concessionario public.demutran_concessionarios%ROWTYPE;
  v_session public.demutran_concessionario_sessoes%ROWTYPE;
BEGIN
  -- Find access record
  SELECT *
  INTO v_access
  FROM public.demutran_concessionario_acessos
  WHERE cpf_normalizado = v_cpf;

  IF v_access.concessionario_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if account is locked
  IF v_access.locked_until IS NOT NULL AND v_access.locked_until > now() THEN
    RETURN;
  END IF;

  -- Verify password
  IF v_access.senha_hash <> extensions.crypt(_senha, v_access.senha_hash) THEN
    -- Increment failed attempts
    UPDATE public.demutran_concessionario_acessos
    SET
      failed_attempts = v_access.failed_attempts + 1,
      locked_until = CASE
        WHEN v_access.failed_attempts + 1 >= 5 THEN now() + interval '15 minutes'
        ELSE NULL
      END,
      updated_at = now()
    WHERE concessionario_id = v_access.concessionario_id;
    RETURN;
  END IF;

  -- Check concessionario exists
  SELECT *
  INTO v_concessionario
  FROM public.demutran_concessionarios
  WHERE id = v_access.concessionario_id;

  IF v_concessionario.id IS NULL THEN
    RETURN;
  END IF;

  -- Create session
  INSERT INTO public.demutran_concessionario_sessoes (concessionario_id)
  VALUES (v_concessionario.id)
  RETURNING * INTO v_session;

  -- Reset failed attempts on success, update last login
  UPDATE public.demutran_concessionario_acessos
  SET
    ultimo_login = now(),
    updated_at = now(),
    failed_attempts = 0,
    locked_until = NULL
  WHERE concessionario_id = v_concessionario.id;

  RETURN QUERY
  SELECT
    v_session.token,
    jsonb_build_object(
      'id', v_concessionario.id,
      'categoria', v_concessionario.categoria,
      'origem_planilha', v_concessionario.origem_planilha,
      'taxi_grupo', v_concessionario.taxi_grupo,
      'estacionamento', v_concessionario.estacionamento,
      'ponto_referencia', v_concessionario.ponto_referencia,
      'numero_vaga', v_concessionario.numero_vaga,
      'titular_nome', v_concessionario.titular_nome,
      'endereco', v_concessionario.endereco,
      'veiculo', v_concessionario.veiculo,
      'placa', v_concessionario.placa,
      'fabricacao', v_concessionario.fabricacao,
      'ultimo_alvara', v_concessionario.ultimo_alvara,
      'exercicio', v_concessionario.exercicio,
      'email_notificacao', v_concessionario.email_notificacao,
      'telefone_notificacao', v_concessionario.telefone_notificacao,
      'aceita_notificacoes', v_concessionario.aceita_notificacoes,
      'boleto_url', v_concessionario.boleto_url
    );

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.autenticar_concessionario(text, text) TO anon;

-- =====================================================
-- 4. PROVISION_ADMIN_USER - Remove legacy dependency,
--    add input validation
-- =====================================================

CREATE OR REPLACE FUNCTION public.provision_admin_user(
  _email text,
  _password text,
  _first_name text,
  _last_name text,
  _setor_id uuid,
  _papel public.papel_usuario,
  _active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_requester_id uuid;
  v_requester_papel public.papel_usuario;
  v_requester_setor_id uuid;
  v_requester_is_super_admin boolean;
  v_new_user_id uuid;
  v_perfil_id uuid;
BEGIN
  -- --- Authentication ---
  v_requester_id := auth.uid();
  IF v_requester_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;

  -- Get requester profile
  SELECT pu.papel, pu.setor_id
  INTO v_requester_papel, v_requester_setor_id
  FROM public.perfis_usuarios pu
  WHERE pu.user_id = v_requester_id AND pu.ativo = true
  ORDER BY CASE pu.papel
    WHEN 'super_admin' THEN 1 WHEN 'gestor' THEN 2 ELSE 3
  END
  LIMIT 1;

  v_requester_is_super_admin := v_requester_papel = 'super_admin';

  -- --- Input validation ---
  IF lower(trim(_email)) !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RETURN jsonb_build_object('error', 'Invalid email format.');
  END IF;

  IF length(trim(_password)) < 6 THEN
    RETURN jsonb_build_object('error', 'Password must be at least 6 characters.');
  END IF;

  IF length(trim(_first_name)) < 1 OR length(trim(_first_name)) > 100 THEN
    RETURN jsonb_build_object('error', 'First name must be between 1 and 100 characters.');
  END IF;

  IF length(trim(_last_name)) < 1 OR length(trim(_last_name)) > 100 THEN
    RETURN jsonb_build_object('error', 'Last name must be between 1 and 100 characters.');
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(_email))) THEN
    RETURN jsonb_build_object('error', 'Email already registered.');
  END IF;

  -- --- Permission checks ---
  IF _papel = 'super_admin' AND NOT v_requester_is_super_admin THEN
    RETURN jsonb_build_object('error', 'Only super admins can create another super admin.');
  END IF;

  IF _papel = 'gestor' AND NOT v_requester_is_super_admin THEN
    RETURN jsonb_build_object('error', 'Only super admins can create gestores.');
  END IF;

  IF NOT v_requester_is_super_admin AND (v_requester_setor_id IS NULL OR v_requester_setor_id <> _setor_id) THEN
    RETURN jsonb_build_object('error', 'You can only create users for your own setor.');
  END IF;

  IF NOT v_requester_is_super_admin AND v_requester_papel NOT IN ('gestor', 'admin_setor') THEN
    RETURN jsonb_build_object('error', 'Your profile cannot create administrative users.');
  END IF;

  IF _papel <> 'super_admin' AND _setor_id IS NULL THEN
    RETURN jsonb_build_object('error', 'setorId is required for this role.');
  END IF;

  -- --- Create user in Auth ---
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
    lower(trim(_email)),
    extensions.crypt(_password, extensions.gen_salt('bf')),
    now(), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object(
      'name', trim(_first_name) || ' ' || trim(_last_name),
      'first_name', trim(_first_name),
      'last_name', trim(_last_name)
    ),
    now(), now(),
    '', '', '', '',
    'authenticated', 'authenticated'
  );

  -- Identity
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_new_user_id,
    v_new_user_id,
    jsonb_build_object('sub', v_new_user_id::text, 'email', lower(trim(_email))),
    'email',
    now(), now(), now()
  );

  -- --- Deactivate previous gestor if applicable ---
  IF _papel = 'gestor' AND _setor_id IS NOT NULL THEN
    UPDATE public.perfis_usuarios
    SET ativo = false, updated_at = now()
    WHERE setor_id = _setor_id AND papel = 'gestor' AND ativo = true;
  END IF;

  -- --- Create profile ---
  INSERT INTO public.perfis_usuarios (user_id, setor_id, papel, nome, sobrenome, ativo)
  VALUES (
    v_new_user_id,
    CASE WHEN _papel = 'super_admin' THEN NULL ELSE _setor_id END,
    _papel,
    trim(_first_name),
    trim(_last_name),
    _active
  )
  RETURNING id INTO v_perfil_id;

  -- --- Audit ---
  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (
    v_requester_id,
    CASE WHEN _papel = 'super_admin' THEN NULL ELSE _setor_id END,
    'perfis_usuarios',
    v_perfil_id,
    'provision_admin_user',
    jsonb_build_object('email', lower(trim(_email)), 'papel', _papel, 'active', _active)
  );

  RETURN jsonb_build_object(
    'success', true,
    'userId', v_new_user_id,
    'perfilId', v_perfil_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- =====================================================
-- 5. REVOKE EXCESSIVE GRANTS FROM ANON ON OTHER TABLES
-- =====================================================

REVOKE ALL ON TABLE public.equipe FROM anon;
REVOKE ALL ON TABLE public.eventos FROM anon;
REVOKE ALL ON TABLE public.galeria_fotos FROM anon;
REVOKE ALL ON TABLE public.noticias FROM anon;
REVOKE ALL ON TABLE public.projetos FROM anon;
REVOKE ALL ON TABLE public.paginas FROM anon;
REVOKE ALL ON TABLE public.documentos FROM anon;
REVOKE ALL ON TABLE public.banners FROM anon;
