ALTER TABLE public.demutran_concessionarios
  ADD COLUMN IF NOT EXISTS email_notificacao text,
  ADD COLUMN IF NOT EXISTS telefone_notificacao text,
  ADD COLUMN IF NOT EXISTS aceita_notificacoes boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.demutran_concessionario_acessos (
  concessionario_id uuid PRIMARY KEY REFERENCES public.demutran_concessionarios(id) ON DELETE CASCADE,
  cpf_normalizado text NOT NULL,
  senha_hash text NOT NULL,
  ultimo_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demutran_concessionario_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concessionario_id uuid NOT NULL REFERENCES public.demutran_concessionarios(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demutran_concessionario_notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concessionario_id uuid NOT NULL REFERENCES public.demutran_concessionarios(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo text NOT NULL DEFAULT 'geral',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  lida_em timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS demutran_concessionario_acessos_cpf_idx
  ON public.demutran_concessionario_acessos (cpf_normalizado);
CREATE INDEX IF NOT EXISTS demutran_concessionario_sessoes_token_idx
  ON public.demutran_concessionario_sessoes (token, expires_at);
CREATE INDEX IF NOT EXISTS demutran_concessionario_notificacoes_idx
  ON public.demutran_concessionario_notificacoes (concessionario_id, created_at DESC);

DROP TRIGGER IF EXISTS trigger_atualizar_demutran_concessionario_acessos_updated_at ON public.demutran_concessionario_acessos;
CREATE TRIGGER trigger_atualizar_demutran_concessionario_acessos_updated_at
BEFORE UPDATE ON public.demutran_concessionario_acessos
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

ALTER TABLE public.demutran_concessionario_acessos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demutran_concessionario_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demutran_concessionario_notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage concessionario acessos" ON public.demutran_concessionario_acessos;
CREATE POLICY "Admins can manage concessionario acessos"
ON public.demutran_concessionario_acessos
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_setor_content(dc.setor_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_setor_content(dc.setor_id)
  )
);

DROP POLICY IF EXISTS "Admins can manage concessionario sessoes" ON public.demutran_concessionario_sessoes;
CREATE POLICY "Admins can manage concessionario sessoes"
ON public.demutran_concessionario_sessoes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_setor_content(dc.setor_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_setor_content(dc.setor_id)
  )
);

DROP POLICY IF EXISTS "Admins can manage concessionario notificacoes" ON public.demutran_concessionario_notificacoes;
CREATE POLICY "Admins can manage concessionario notificacoes"
ON public.demutran_concessionario_notificacoes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_setor_content(dc.setor_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_setor_content(dc.setor_id)
  )
);

CREATE OR REPLACE FUNCTION public.definir_acesso_concessionario(
  _concessionario_id uuid,
  _senha text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.demutran_concessionarios%ROWTYPE;
  v_cpf text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Nao autenticado.');
  END IF;

  SELECT *
  INTO v_row
  FROM public.demutran_concessionarios
  WHERE id = _concessionario_id;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Concessionario nao encontrado.');
  END IF;

  IF NOT public.can_manage_setor_content(v_row.setor_id) THEN
    RETURN jsonb_build_object('error', 'Sem permissao para este cadastro.');
  END IF;

  v_cpf := regexp_replace(coalesce(v_row.cpf, ''), '\D', '', 'g');
  IF char_length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('error', 'O concessionario precisa ter CPF valido para receber acesso.');
  END IF;

  IF length(coalesce(_senha, '')) < 6 THEN
    RETURN jsonb_build_object('error', 'A senha precisa ter pelo menos 6 caracteres.');
  END IF;

  INSERT INTO public.demutran_concessionario_acessos (
    concessionario_id,
    cpf_normalizado,
    senha_hash
  )
  VALUES (
    _concessionario_id,
    v_cpf,
    extensions.crypt(_senha, extensions.gen_salt('bf'))
  )
  ON CONFLICT (concessionario_id)
  DO UPDATE SET
    cpf_normalizado = EXCLUDED.cpf_normalizado,
    senha_hash = EXCLUDED.senha_hash,
    updated_at = now();

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (
    auth.uid(),
    v_row.setor_id,
    'demutran_concessionario_acessos',
    _concessionario_id,
    'definir_acesso_concessionario',
    jsonb_build_object('cpf', v_cpf)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

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
  SELECT *
  INTO v_access
  FROM public.demutran_concessionario_acessos
  WHERE cpf_normalizado = v_cpf;

  IF v_access.concessionario_id IS NULL THEN
    RETURN;
  END IF;

  IF v_access.senha_hash <> extensions.crypt(_senha, v_access.senha_hash) THEN
    RETURN;
  END IF;

  SELECT *
  INTO v_concessionario
  FROM public.demutran_concessionarios
  WHERE id = v_access.concessionario_id;

  IF v_concessionario.id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.demutran_concessionario_sessoes (concessionario_id)
  VALUES (v_concessionario.id)
  RETURNING * INTO v_session;

  UPDATE public.demutran_concessionario_acessos
  SET ultimo_login = now(), updated_at = now()
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
      'cpf', v_concessionario.cpf,
      'inicio_atividade', v_concessionario.inicio_atividade,
      'cnh_numero', v_concessionario.cnh_numero,
      'validade_cnh', v_concessionario.validade_cnh,
      'atividade_remunerada', v_concessionario.atividade_remunerada,
      'curso', v_concessionario.curso,
      'motorista_auxiliar', v_concessionario.motorista_auxiliar,
      'cnh_auxiliar', v_concessionario.cnh_auxiliar,
      'validade_cnh_auxiliar', v_concessionario.validade_cnh_auxiliar,
      'categoria_cnh', v_concessionario.categoria_cnh,
      'rota', v_concessionario.rota,
      'observacoes', v_concessionario.observacoes,
      'email_notificacao', v_concessionario.email_notificacao,
      'telefone_notificacao', v_concessionario.telefone_notificacao,
      'aceita_notificacoes', v_concessionario.aceita_notificacoes,
      'ativo', v_concessionario.ativo
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_perfil_concessionario(
  _session_token uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_concessionario public.demutran_concessionarios%ROWTYPE;
BEGIN
  SELECT dc.*
  INTO v_concessionario
  FROM public.demutran_concessionario_sessoes s
  JOIN public.demutran_concessionarios dc ON dc.id = s.concessionario_id
  WHERE s.token = _session_token
    AND s.expires_at > now()
  LIMIT 1;

  IF v_concessionario.id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.demutran_concessionario_sessoes
  SET last_seen_at = now()
  WHERE token = _session_token;

  RETURN jsonb_build_object(
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
    'cpf', v_concessionario.cpf,
    'inicio_atividade', v_concessionario.inicio_atividade,
    'cnh_numero', v_concessionario.cnh_numero,
    'validade_cnh', v_concessionario.validade_cnh,
    'atividade_remunerada', v_concessionario.atividade_remunerada,
    'curso', v_concessionario.curso,
    'motorista_auxiliar', v_concessionario.motorista_auxiliar,
    'cnh_auxiliar', v_concessionario.cnh_auxiliar,
    'validade_cnh_auxiliar', v_concessionario.validade_cnh_auxiliar,
    'categoria_cnh', v_concessionario.categoria_cnh,
    'rota', v_concessionario.rota,
    'observacoes', v_concessionario.observacoes,
    'email_notificacao', v_concessionario.email_notificacao,
    'telefone_notificacao', v_concessionario.telefone_notificacao,
    'aceita_notificacoes', v_concessionario.aceita_notificacoes,
    'ativo', v_concessionario.ativo
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_perfil_concessionario_publico(
  _session_token uuid,
  _endereco text DEFAULT NULL,
  _veiculo text DEFAULT NULL,
  _placa text DEFAULT NULL,
  _observacoes text DEFAULT NULL,
  _email_notificacao text DEFAULT NULL,
  _telefone_notificacao text DEFAULT NULL,
  _aceita_notificacoes boolean DEFAULT true,
  _nova_senha text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session public.demutran_concessionario_sessoes%ROWTYPE;
  v_row public.demutran_concessionarios%ROWTYPE;
BEGIN
  SELECT *
  INTO v_session
  FROM public.demutran_concessionario_sessoes
  WHERE token = _session_token
    AND expires_at > now()
  LIMIT 1;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Sessao invalida.');
  END IF;

  UPDATE public.demutran_concessionarios
  SET
    endereco = NULLIF(trim(coalesce(_endereco, '')), ''),
    veiculo = NULLIF(trim(coalesce(_veiculo, '')), ''),
    placa = NULLIF(upper(regexp_replace(trim(coalesce(_placa, '')), '[^A-Z0-9-]', '', 'g')), ''),
    observacoes = NULLIF(trim(coalesce(_observacoes, '')), ''),
    email_notificacao = NULLIF(trim(coalesce(_email_notificacao, '')), ''),
    telefone_notificacao = NULLIF(trim(coalesce(_telefone_notificacao, '')), ''),
    aceita_notificacoes = coalesce(_aceita_notificacoes, true),
    updated_at = now()
  WHERE id = v_session.concessionario_id
  RETURNING * INTO v_row;

  IF coalesce(_nova_senha, '') <> '' THEN
    IF length(_nova_senha) < 6 THEN
      RETURN jsonb_build_object('error', 'A nova senha precisa ter pelo menos 6 caracteres.');
    END IF;

    UPDATE public.demutran_concessionario_acessos
    SET senha_hash = extensions.crypt(_nova_senha, extensions.gen_salt('bf')),
        updated_at = now()
    WHERE concessionario_id = v_row.id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_notificacoes_concessionario(
  _session_token uuid
)
RETURNS TABLE (
  id uuid,
  titulo text,
  mensagem text,
  tipo text,
  created_at timestamptz,
  lida_em timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_concessionario_id uuid;
BEGIN
  SELECT concessionario_id
  INTO v_concessionario_id
  FROM public.demutran_concessionario_sessoes
  WHERE token = _session_token
    AND expires_at > now()
  LIMIT 1;

  IF v_concessionario_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT n.id, n.titulo, n.mensagem, n.tipo, n.created_at, n.lida_em
  FROM public.demutran_concessionario_notificacoes n
  WHERE n.concessionario_id = v_concessionario_id
  ORDER BY n.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.marcar_notificacao_concessionario_lida(
  _session_token uuid,
  _notificacao_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_concessionario_id uuid;
BEGIN
  SELECT concessionario_id
  INTO v_concessionario_id
  FROM public.demutran_concessionario_sessoes
  WHERE token = _session_token
    AND expires_at > now()
  LIMIT 1;

  IF v_concessionario_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Sessao invalida.');
  END IF;

  UPDATE public.demutran_concessionario_notificacoes
  SET lida_em = now()
  WHERE id = _notificacao_id
    AND concessionario_id = v_concessionario_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.enviar_notificacao_concessionario(
  _concessionario_id uuid,
  _titulo text,
  _mensagem text,
  _tipo text DEFAULT 'geral'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.demutran_concessionarios%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Nao autenticado.');
  END IF;

  SELECT *
  INTO v_row
  FROM public.demutran_concessionarios
  WHERE id = _concessionario_id;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Concessionario nao encontrado.');
  END IF;

  IF NOT public.can_manage_setor_content(v_row.setor_id) THEN
    RETURN jsonb_build_object('error', 'Sem permissao para este cadastro.');
  END IF;

  INSERT INTO public.demutran_concessionario_notificacoes (
    concessionario_id,
    titulo,
    mensagem,
    tipo,
    created_by
  )
  VALUES (
    _concessionario_id,
    trim(_titulo),
    trim(_mensagem),
    coalesce(nullif(trim(_tipo), ''), 'geral'),
    auth.uid()
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demutran_concessionario_acessos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demutran_concessionario_sessoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demutran_concessionario_notificacoes TO authenticated;

GRANT EXECUTE ON FUNCTION public.definir_acesso_concessionario(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.autenticar_concessionario(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.autenticar_concessionario(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_perfil_concessionario(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.obter_perfil_concessionario(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_perfil_concessionario_publico(uuid, text, text, text, text, text, text, boolean, text) TO anon;
GRANT EXECUTE ON FUNCTION public.atualizar_perfil_concessionario_publico(uuid, text, text, text, text, text, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_notificacoes_concessionario(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.listar_notificacoes_concessionario(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_notificacao_concessionario_lida(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.marcar_notificacao_concessionario_lida(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enviar_notificacao_concessionario(uuid, text, text, text) TO authenticated;
