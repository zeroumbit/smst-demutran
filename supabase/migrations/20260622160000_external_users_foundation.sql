-- =====================================================
-- MIGRATION: External Users Foundation
-- Unified system for external users (PCD, idosos,
-- motoristas, concessionarios, etc.) to have their
-- own portal access and view only their submissions.
-- =====================================================

-- =====================================================
-- 1. UNIFIED EXTERNAL USERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.demutran_usuarios_externos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf_normalizado text NOT NULL UNIQUE,
  nome_completo text NOT NULL,
  email text,
  telefone text,
  senha_hash text NOT NULL,
  tipo text NOT NULL DEFAULT 'geral',
  ativo boolean NOT NULL DEFAULT true,
  ultimo_login timestamptz,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_externos_cpf
  ON public.demutran_usuarios_externos (cpf_normalizado);
CREATE INDEX IF NOT EXISTS idx_usuarios_externos_tipo
  ON public.demutran_usuarios_externos (tipo, ativo);

-- =====================================================
-- 2. EXTERNAL USER SESSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.demutran_externo_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_externo_id uuid NOT NULL
    REFERENCES public.demutran_usuarios_externos(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_externo_sessoes_token
  ON public.demutran_externo_sessoes (token, expires_at);
CREATE INDEX IF NOT EXISTS idx_externo_sessoes_usuario
  ON public.demutran_externo_sessoes (usuario_externo_id);

-- =====================================================
-- 3. ADD usuario_externo_id TO EXISTING TABLES
-- =====================================================

ALTER TABLE public.demutran_credenciais_solicitacoes
  ADD COLUMN IF NOT EXISTS usuario_externo_id uuid
    REFERENCES public.demutran_usuarios_externos(id) ON DELETE SET NULL;

ALTER TABLE public.demutran_recursos
  ADD COLUMN IF NOT EXISTS usuario_externo_id uuid
    REFERENCES public.demutran_usuarios_externos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_credenciais_usuario_externo
  ON public.demutran_credenciais_solicitacoes (usuario_externo_id);
CREATE INDEX IF NOT EXISTS idx_recursos_usuario_externo
  ON public.demutran_recursos (usuario_externo_id);

-- =====================================================
-- 4. EXTERNAL USER ACCESS: THROUGH RPCS ONLY
-- External users NEVER query tables directly.
-- All data access goes through SECURITY DEFINER RPCs
-- that validate session tokens server-side.
-- Existing admin RLS policies remain unchanged.
-- =====================================================

-- =====================================================
-- 5. RPC: REGISTRAR USUARIO EXTERNO (self-register)
-- =====================================================

CREATE OR REPLACE FUNCTION public.registrar_usuario_externo(
  _cpf text,
  _nome_completo text,
  _senha text,
  _email text DEFAULT NULL,
  _telefone text DEFAULT NULL,
  _tipo text DEFAULT 'geral'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(_cpf, ''), '\D', '', 'g');
  v_user_id uuid;
BEGIN
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('error', 'CPF invalido.');
  END IF;

  IF length(trim(_senha)) < 6 THEN
    RETURN jsonb_build_object('error', 'Senha deve ter no minimo 6 caracteres.');
  END IF;

  IF length(trim(_nome_completo)) < 3 THEN
    RETURN jsonb_build_object('error', 'Nome completo deve ter ao menos 3 caracteres.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.demutran_usuarios_externos WHERE cpf_normalizado = v_cpf) THEN
    RETURN jsonb_build_object('error', 'CPF ja cadastrado.');
  END IF;

  INSERT INTO public.demutran_usuarios_externos (
    cpf_normalizado, nome_completo, email, telefone, senha_hash, tipo
  ) VALUES (
    v_cpf,
    trim(_nome_completo),
    NULLIF(trim(_email), ''),
    NULLIF(trim(_telefone), ''),
    extensions.crypt(_senha, extensions.gen_salt('bf')),
    coalesce(nullif(trim(_tipo), ''), 'geral')
  )
  RETURNING id INTO v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'usuario_externo_id', v_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_usuario_externo(text, text, text, text, text, text) TO anon;

-- =====================================================
-- 6. RPC: AUTENTICAR USUARIO EXTERNO (login)
-- =====================================================

CREATE OR REPLACE FUNCTION public.autenticar_usuario_externo(
  _cpf text,
  _senha text
)
RETURNS TABLE (
  session_token uuid,
  usuario jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(_cpf, ''), '\D', '', 'g');
  v_user public.demutran_usuarios_externos%ROWTYPE;
  v_session public.demutran_externo_sessoes%ROWTYPE;
BEGIN
  SELECT * INTO v_user
  FROM public.demutran_usuarios_externos
  WHERE cpf_normalizado = v_cpf AND ativo = true;

  IF v_user.id IS NULL THEN
    RETURN;
  END IF;

  IF v_user.locked_until IS NOT NULL AND v_user.locked_until > now() THEN
    RETURN;
  END IF;

  IF v_user.senha_hash <> extensions.crypt(_senha, v_user.senha_hash) THEN
    UPDATE public.demutran_usuarios_externos
    SET
      failed_attempts = v_user.failed_attempts + 1,
      locked_until = CASE
        WHEN v_user.failed_attempts + 1 >= 5 THEN now() + interval '15 minutes'
        ELSE NULL
      END,
      updated_at = now()
    WHERE id = v_user.id;
    RETURN;
  END IF;

  INSERT INTO public.demutran_externo_sessoes (usuario_externo_id)
  VALUES (v_user.id)
  RETURNING * INTO v_session;

  UPDATE public.demutran_usuarios_externos
  SET
    ultimo_login = now(),
    updated_at = now(),
    failed_attempts = 0,
    locked_until = NULL
  WHERE id = v_user.id;

  RETURN QUERY
  SELECT
    v_session.token,
    jsonb_build_object(
      'id', v_user.id,
      'nome_completo', v_user.nome_completo,
      'email', v_user.email,
      'telefone', v_user.telefone,
      'tipo', v_user.tipo,
      'cpf', v_user.cpf_normalizado
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.autenticar_usuario_externo(text, text) TO anon;

-- =====================================================
-- 7. RPC: VALIDAR SESSAO EXTERNA
-- =====================================================

CREATE OR REPLACE FUNCTION public.validar_sessao_externa(
  _session_token uuid
)
RETURNS TABLE (
  valido boolean,
  usuario jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session public.demutran_externo_sessoes%ROWTYPE;
  v_user public.demutran_usuarios_externos%ROWTYPE;
BEGIN
  SELECT * INTO v_session
  FROM public.demutran_externo_sessoes
  WHERE token = _session_token AND expires_at > now();

  IF v_session.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::jsonb;
    RETURN;
  END IF;

  UPDATE public.demutran_externo_sessoes
  SET last_seen_at = now()
  WHERE id = v_session.id;

  SELECT * INTO v_user
  FROM public.demutran_usuarios_externos
  WHERE id = v_session.usuario_externo_id AND ativo = true;

  IF v_user.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::jsonb;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    true,
    jsonb_build_object(
      'id', v_user.id,
      'nome_completo', v_user.nome_completo,
      'email', v_user.email,
      'telefone', v_user.telefone,
      'tipo', v_user.tipo,
      'cpf', v_user.cpf_normalizado
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validar_sessao_externa(uuid) TO anon;

-- =====================================================
-- 8. RPC: LISTAR MINHAS SOLICITACOES
-- =====================================================

CREATE OR REPLACE FUNCTION public.listar_minhas_solicitacoes(
  _session_token uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_result jsonb;
BEGIN
  SELECT s.usuario_externo_id INTO v_user_id
  FROM public.demutran_externo_sessoes s
  WHERE s.token = _session_token AND s.expires_at > now();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_array();
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'tipo', 'credencial',
      'id', c.id,
      'protocolo', c.protocolo,
      'status', c.status,
      'tipo_credencial', c.tipo,
      'created_at', c.created_at,
      'analisado_em', c.analisado_em
    )
    ORDER BY c.created_at DESC
  ) INTO v_result
  FROM public.demutran_credenciais_solicitacoes c
  WHERE c.usuario_externo_id = v_user_id;

  v_result := coalesce(v_result, '[]'::jsonb);

  v_result := v_result || coalesce(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'tipo', 'recurso',
        'id', r.id,
        'protocolo', r.protocolo,
        'status', r.status,
        'tipo_recurso', r.tipo,
        'created_at', r.created_at,
        'analisado_em', r.analisado_em
      )
      ORDER BY r.created_at DESC
    )
    FROM public.demutran_recursos r
    WHERE r.usuario_externo_id = v_user_id),
    '[]'::jsonb
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.listar_minhas_solicitacoes(uuid) TO anon;

-- =====================================================
-- 9. UPDATE criar_solicitacao_credencial to accept
--    optional session token for linking submissions
-- =====================================================

DROP FUNCTION IF EXISTS public.criar_solicitacao_credencial(
  public.demutran_credencial_tipo,
  text, text, text, text, text, text, text, text, text, text, text, text, text
);

CREATE OR REPLACE FUNCTION public.criar_solicitacao_credencial(
  _tipo public.demutran_credencial_tipo,
  _nome_completo text,
  _cpf text,
  _rg text DEFAULT NULL,
  _email text DEFAULT NULL,
  _telefone text DEFAULT NULL,
  _logradouro text DEFAULT NULL,
  _numero text DEFAULT NULL,
  _bairro text DEFAULT NULL,
  _complemento text DEFAULT NULL,
  _observacao text DEFAULT NULL,
  _documento_identidade_url text DEFAULT NULL,
  _comprovante_residencia_url text DEFAULT NULL,
  _laudo_medico_url text DEFAULT NULL,
  _session_token uuid DEFAULT NULL
)
RETURNS TABLE (id uuid, protocolo text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.demutran_credenciais_solicitacoes%ROWTYPE;
  v_external_user_id uuid;
BEGIN
  IF _session_token IS NOT NULL THEN
    SELECT s.usuario_externo_id INTO v_external_user_id
    FROM public.demutran_externo_sessoes s
    WHERE s.token = _session_token AND s.expires_at > now();
  END IF;

  INSERT INTO public.demutran_credenciais_solicitacoes (
    setor_id, tipo, nome_completo, cpf, rg, email, telefone,
    logradouro, numero, bairro, complemento, observacao,
    documento_identidade_url, comprovante_residencia_url, laudo_medico_url,
    usuario_externo_id
  )
  VALUES (
    public.get_demutran_setor_id(),
    _tipo,
    trim(_nome_completo),
    trim(_cpf),
    NULLIF(trim(_rg), ''),
    NULLIF(trim(_email), ''),
    NULLIF(trim(_telefone), ''),
    trim(_logradouro),
    trim(_numero),
    trim(_bairro),
    NULLIF(trim(_complemento), ''),
    NULLIF(trim(_observacao), ''),
    NULLIF(trim(_documento_identidade_url), ''),
    NULLIF(trim(_comprovante_residencia_url), ''),
    NULLIF(trim(_laudo_medico_url), ''),
    v_external_user_id
  )
  RETURNING * INTO v_row;

  RETURN QUERY SELECT v_row.id, v_row.protocolo;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_solicitacao_credencial FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.criar_solicitacao_credencial TO anon, authenticated;

-- =====================================================
-- 10. UPDATE criar_recurso_demutran to accept
--     optional session token for linking submissions
-- =====================================================

DROP FUNCTION IF EXISTS public.criar_recurso_demutran(
  public.demutran_recurso_tipo,
  text, text, text, text, text, text, text, text
);

CREATE OR REPLACE FUNCTION public.criar_recurso_demutran(
  _tipo public.demutran_recurso_tipo,
  _nome_completo text,
  _cpf text,
  _email text DEFAULT NULL,
  _telefone text DEFAULT NULL,
  _placa text DEFAULT NULL,
  _auto_infracao text DEFAULT NULL,
  _defesa_documento_url text DEFAULT NULL,
  _observacao text DEFAULT NULL,
  _session_token uuid DEFAULT NULL
)
RETURNS TABLE (id uuid, protocolo text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.demutran_recursos%ROWTYPE;
  v_external_user_id uuid;
BEGIN
  IF _session_token IS NOT NULL THEN
    SELECT s.usuario_externo_id INTO v_external_user_id
    FROM public.demutran_externo_sessoes s
    WHERE s.token = _session_token AND s.expires_at > now();
  END IF;

  INSERT INTO public.demutran_recursos (
    setor_id, tipo, nome_completo, cpf, email, telefone,
    placa, auto_infracao, defesa_documento_url, observacao,
    usuario_externo_id
  )
  VALUES (
    public.get_demutran_setor_id(),
    _tipo,
    trim(_nome_completo),
    trim(_cpf),
    NULLIF(trim(_email), ''),
    NULLIF(trim(_telefone), ''),
    NULLIF(upper(regexp_replace(trim(coalesce(_placa, '')), '[^A-Z0-9]', '', 'g')), ''),
    trim(_auto_infracao),
    trim(_defesa_documento_url),
    NULLIF(trim(_observacao), ''),
    v_external_user_id
  )
  RETURNING * INTO v_row;

  RETURN QUERY SELECT v_row.id, v_row.protocolo;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_recurso_demutran FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.criar_recurso_demutran TO anon, authenticated;

-- =====================================================
-- 11. GRANTS: Only service_role and SECURITY DEFINER
--     RPCs can manage external user data.
--     No direct table access for anon or authenticated.
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demutran_usuarios_externos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demutran_externo_sessoes TO service_role;
