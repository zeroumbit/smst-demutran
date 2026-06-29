DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.setores
    WHERE slug = 'fala-cidadao'
  ) THEN
    INSERT INTO public.setores (nome, slug, descricao)
    VALUES ('Fala Cidadao', 'fala-cidadao', 'Canal oficial de atendimento ao cidadao');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'fala_prioridade'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.fala_prioridade AS ENUM ('baixa', 'media', 'alta', 'urgente');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'fala_status'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.fala_status AS ENUM ('recebido', 'analise', 'execucao', 'concluido', 'arquivado', 'transferido');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.fala_secretarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  sigla text NOT NULL UNIQUE,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fala_assuntos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secretaria_id uuid NOT NULL REFERENCES public.fala_secretarias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(secretaria_id, nome)
);

CREATE TABLE IF NOT EXISTS public.usuario_secretarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secretaria_id uuid NOT NULL REFERENCES public.fala_secretarias(id) ON DELETE CASCADE,
  cargo text NOT NULL DEFAULT 'responsavel',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(usuario_id, secretaria_id)
);

CREATE TABLE IF NOT EXISTS public.fala_demandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo text NOT NULL UNIQUE,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_externo_id uuid REFERENCES public.demutran_usuarios_externos(id) ON DELETE SET NULL,
  cpf text NOT NULL,
  nome_cidadao text NOT NULL,
  email text,
  telefone text,
  secretaria_id uuid NOT NULL REFERENCES public.fala_secretarias(id),
  secretaria_atual_id uuid NOT NULL REFERENCES public.fala_secretarias(id),
  assunto_id uuid REFERENCES public.fala_assuntos(id) ON DELETE SET NULL,
  assunto_outro text,
  descricao text NOT NULL,
  endereco text NOT NULL,
  bairro text,
  ponto_referencia text,
  prioridade public.fala_prioridade NOT NULL DEFAULT 'media',
  status public.fala_status NOT NULL DEFAULT 'recebido',
  resposta_cidadao text,
  observacao_interna text,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  data_abertura timestamptz NOT NULL DEFAULT now(),
  data_conclusao timestamptz,
  avaliacao integer CHECK (avaliacao BETWEEN 0 AND 10),
  avaliacao_comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fala_historico_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.fala_demandas(id) ON DELETE CASCADE,
  status_anterior public.fala_status,
  status_novo public.fala_status NOT NULL,
  observacao text,
  resposta_publica text,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fala_transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.fala_demandas(id) ON DELETE CASCADE,
  secretaria_origem_id uuid NOT NULL REFERENCES public.fala_secretarias(id),
  secretaria_destino_id uuid NOT NULL REFERENCES public.fala_secretarias(id),
  justificativa text NOT NULL,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fala_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid REFERENCES public.fala_demandas(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acao text NOT NULL,
  dados_anteriores jsonb,
  dados_novos jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fala_assuntos_secretaria ON public.fala_assuntos(secretaria_id, ativo, ordem);
CREATE INDEX IF NOT EXISTS idx_usuario_secretarias_usuario ON public.usuario_secretarias(usuario_id, ativo);
CREATE INDEX IF NOT EXISTS idx_usuario_secretarias_secretaria ON public.usuario_secretarias(secretaria_id, ativo);
CREATE INDEX IF NOT EXISTS idx_fala_demandas_protocolo ON public.fala_demandas(protocolo);
CREATE INDEX IF NOT EXISTS idx_fala_demandas_cpf ON public.fala_demandas(cpf);
CREATE INDEX IF NOT EXISTS idx_fala_demandas_status ON public.fala_demandas(status);
CREATE INDEX IF NOT EXISTS idx_fala_demandas_secretaria_atual ON public.fala_demandas(secretaria_atual_id, status);
CREATE INDEX IF NOT EXISTS idx_fala_demandas_usuario_externo ON public.fala_demandas(usuario_externo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fala_demandas_usuario_auth ON public.fala_demandas(usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fala_historico_demanda ON public.fala_historico_status(demanda_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fala_transferencias_demanda ON public.fala_transferencias(demanda_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fala_auditoria_demanda ON public.fala_auditoria(demanda_id, created_at DESC);

DROP TRIGGER IF EXISTS trigger_atualizar_fala_secretarias_updated_at ON public.fala_secretarias;
CREATE TRIGGER trigger_atualizar_fala_secretarias_updated_at
BEFORE UPDATE ON public.fala_secretarias
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_atualizar_fala_assuntos_updated_at ON public.fala_assuntos;
CREATE TRIGGER trigger_atualizar_fala_assuntos_updated_at
BEFORE UPDATE ON public.fala_assuntos
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_atualizar_usuario_secretarias_updated_at ON public.usuario_secretarias;
CREATE TRIGGER trigger_atualizar_usuario_secretarias_updated_at
BEFORE UPDATE ON public.usuario_secretarias
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_atualizar_fala_demandas_updated_at ON public.fala_demandas;
CREATE TRIGGER trigger_atualizar_fala_demandas_updated_at
BEFORE UPDATE ON public.fala_demandas
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

CREATE OR REPLACE FUNCTION public.get_fala_cidadao_setor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id
  FROM public.setores
  WHERE slug = 'fala-cidadao'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_fala_cidadao_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.perfis_usuarios pu
      WHERE pu.user_id = auth.uid()
        AND pu.setor_id = public.get_fala_cidadao_setor_id()
        AND pu.ativo = true
        AND pu.papel IN ('gestor'::public.papel_usuario, 'admin_setor'::public.papel_usuario, 'tecnico'::public.papel_usuario)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_fala_secretaria(_secretaria_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.usuario_secretarias us
      JOIN public.perfis_usuarios pu
        ON pu.user_id = us.usuario_id
      WHERE us.usuario_id = auth.uid()
        AND us.secretaria_id = _secretaria_id
        AND us.ativo = true
        AND pu.ativo = true
        AND pu.setor_id = public.get_fala_cidadao_setor_id()
    );
$$;

CREATE OR REPLACE FUNCTION public.gerar_protocolo_fala_cidadao()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_protocolo text;
BEGIN
  LOOP
    v_protocolo := 'FALA-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.fala_demandas
      WHERE protocolo = v_protocolo
    );
  END LOOP;

  RETURN v_protocolo;
END;
$$;

CREATE OR REPLACE FUNCTION public.fala_normalizar_cpf(_cpf text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(coalesce(_cpf, ''), '\D', '', 'g');
$$;

CREATE OR REPLACE FUNCTION public.registrar_historico_inicial_fala()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.fala_historico_status (
    demanda_id,
    status_anterior,
    status_novo,
    observacao,
    resposta_publica,
    usuario_id
  ) VALUES (
    NEW.id,
    NULL,
    NEW.status,
    'Demanda registrada',
    NEW.resposta_cidadao,
    NEW.responsavel_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_registrar_historico_inicial_fala ON public.fala_demandas;
CREATE TRIGGER trigger_registrar_historico_inicial_fala
AFTER INSERT ON public.fala_demandas
FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_inicial_fala();

CREATE OR REPLACE FUNCTION public.registrar_auditoria_fala_cidadao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.fala_auditoria (demanda_id, usuario_id, acao, dados_anteriores, dados_novos)
    VALUES (NEW.id, auth.uid(), 'update_demanda', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.fala_auditoria (demanda_id, usuario_id, acao, dados_anteriores)
    VALUES (OLD.id, auth.uid(), 'delete_demanda', to_jsonb(OLD));
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_fala_auditoria_demanda ON public.fala_demandas;
CREATE TRIGGER trigger_fala_auditoria_demanda
AFTER UPDATE OR DELETE ON public.fala_demandas
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_fala_cidadao();

CREATE OR REPLACE FUNCTION public.criar_demanda_fala_cidadao(
  _cpf text,
  _nome_cidadao text,
  _email text DEFAULT NULL,
  _telefone text DEFAULT NULL,
  _secretaria_id uuid DEFAULT NULL,
  _assunto_id uuid DEFAULT NULL,
  _assunto_outro text DEFAULT NULL,
  _descricao text DEFAULT NULL,
  _endereco text DEFAULT NULL,
  _bairro text DEFAULT NULL,
  _ponto_referencia text DEFAULT NULL,
  _prioridade public.fala_prioridade DEFAULT 'media',
  _session_token uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  protocolo text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cpf text := public.fala_normalizar_cpf(_cpf);
  v_usuario_externo_id uuid;
  v_usuario_auth uuid := auth.uid();
  v_secretaria_id uuid;
  v_assunto_id uuid;
  v_row public.fala_demandas%ROWTYPE;
BEGIN
  IF length(v_cpf) <> 11 THEN
    RAISE EXCEPTION 'CPF invalido.';
  END IF;

  IF length(trim(coalesce(_nome_cidadao, ''))) < 3 THEN
    RAISE EXCEPTION 'Nome do cidadao invalido.';
  END IF;

  IF length(trim(coalesce(_descricao, ''))) < 10 THEN
    RAISE EXCEPTION 'Descreva a demanda com mais detalhes.';
  END IF;

  IF length(trim(coalesce(_endereco, ''))) < 5 THEN
    RAISE EXCEPTION 'Informe um endereco valido.';
  END IF;

  IF _session_token IS NOT NULL THEN
    SELECT s.usuario_externo_id
    INTO v_usuario_externo_id
    FROM public.demutran_externo_sessoes s
    WHERE s.token = _session_token
      AND s.expires_at > now();
  END IF;

  v_secretaria_id := _secretaria_id;

  IF v_secretaria_id IS NULL AND _assunto_id IS NOT NULL THEN
    SELECT a.secretaria_id
    INTO v_secretaria_id
    FROM public.fala_assuntos a
    WHERE a.id = _assunto_id
      AND a.ativo = true;
  END IF;

  IF v_secretaria_id IS NULL THEN
    RAISE EXCEPTION 'Selecione uma secretaria valida.';
  END IF;

  SELECT a.id
  INTO v_assunto_id
  FROM public.fala_assuntos a
  WHERE a.id = _assunto_id
    AND a.secretaria_id = v_secretaria_id
    AND a.ativo = true;

  INSERT INTO public.fala_demandas (
    protocolo,
    usuario_id,
    usuario_externo_id,
    cpf,
    nome_cidadao,
    email,
    telefone,
    secretaria_id,
    secretaria_atual_id,
    assunto_id,
    assunto_outro,
    descricao,
    endereco,
    bairro,
    ponto_referencia,
    prioridade,
    status
  ) VALUES (
    public.gerar_protocolo_fala_cidadao(),
    v_usuario_auth,
    v_usuario_externo_id,
    v_cpf,
    trim(_nome_cidadao),
    NULLIF(trim(coalesce(_email, '')), ''),
    NULLIF(trim(coalesce(_telefone, '')), ''),
    v_secretaria_id,
    v_secretaria_id,
    v_assunto_id,
    NULLIF(trim(coalesce(_assunto_outro, '')), ''),
    trim(_descricao),
    trim(_endereco),
    NULLIF(trim(coalesce(_bairro, '')), ''),
    NULLIF(trim(coalesce(_ponto_referencia, '')), ''),
    coalesce(_prioridade, 'media'::public.fala_prioridade),
    'recebido'::public.fala_status
  )
  RETURNING * INTO v_row;

  RETURN QUERY
  SELECT v_row.id, v_row.protocolo;
END;
$$;

CREATE OR REPLACE FUNCTION public.consultar_demanda_fala_cidadao(
  _protocolo text,
  _cpf text
)
RETURNS TABLE (
  id uuid,
  protocolo text,
  secretaria_nome text,
  assunto_nome text,
  descricao text,
  endereco text,
  bairro text,
  prioridade public.fala_prioridade,
  status public.fala_status,
  resposta_cidadao text,
  data_abertura timestamptz,
  data_conclusao timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    d.id,
    d.protocolo,
    s.nome,
    coalesce(a.nome, d.assunto_outro),
    d.descricao,
    d.endereco,
    d.bairro,
    d.prioridade,
    d.status,
    d.resposta_cidadao,
    d.data_abertura,
    d.data_conclusao
  FROM public.fala_demandas d
  JOIN public.fala_secretarias s ON s.id = d.secretaria_id
  LEFT JOIN public.fala_assuntos a ON a.id = d.assunto_id
  WHERE upper(trim(d.protocolo)) = upper(trim(coalesce(_protocolo, '')))
    AND d.cpf = public.fala_normalizar_cpf(_cpf)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.listar_minhas_solicitacoes_fala_cidadao(
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
  SELECT s.usuario_externo_id
  INTO v_user_id
  FROM public.demutran_externo_sessoes s
  WHERE s.token = _session_token
    AND s.expires_at > now();

  IF v_user_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'protocolo', d.protocolo,
        'secretaria_nome', s.nome,
        'assunto_nome', coalesce(a.nome, d.assunto_outro),
        'descricao', d.descricao,
        'status', d.status,
        'prioridade', d.prioridade,
        'resposta_cidadao', d.resposta_cidadao,
        'data_abertura', d.data_abertura,
        'data_conclusao', d.data_conclusao
      )
      ORDER BY d.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.fala_demandas d
  JOIN public.fala_secretarias s ON s.id = d.secretaria_id
  LEFT JOIN public.fala_assuntos a ON a.id = d.assunto_id
  WHERE d.usuario_externo_id = v_user_id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_status_fala_cidadao(
  _demanda_id uuid,
  _status public.fala_status,
  _resposta_cidadao text DEFAULT NULL,
  _observacao_interna text DEFAULT NULL
)
RETURNS public.fala_demandas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.fala_demandas%ROWTYPE;
  v_old_status public.fala_status;
BEGIN
  SELECT *
  INTO v_row
  FROM public.fala_demandas
  WHERE id = _demanda_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Demanda nao encontrada.';
  END IF;

  IF NOT public.can_access_fala_secretaria(v_row.secretaria_atual_id) THEN
    RAISE EXCEPTION 'Sem permissao para atualizar esta demanda.';
  END IF;

  v_old_status := v_row.status;

  UPDATE public.fala_demandas
  SET
    status = _status,
    resposta_cidadao = COALESCE(NULLIF(trim(coalesce(_resposta_cidadao, '')), ''), resposta_cidadao),
    observacao_interna = COALESCE(NULLIF(trim(coalesce(_observacao_interna, '')), ''), observacao_interna),
    responsavel_id = coalesce(responsavel_id, auth.uid()),
    data_conclusao = CASE WHEN _status = 'concluido'::public.fala_status THEN now() ELSE data_conclusao END,
    updated_at = now()
  WHERE id = _demanda_id
  RETURNING * INTO v_row;

  INSERT INTO public.fala_historico_status (
    demanda_id,
    status_anterior,
    status_novo,
    observacao,
    resposta_publica,
    usuario_id
  ) VALUES (
    v_row.id,
    v_old_status,
    _status,
    NULLIF(trim(coalesce(_observacao_interna, '')), ''),
    NULLIF(trim(coalesce(_resposta_cidadao, '')), ''),
    auth.uid()
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.transferir_demanda_fala_cidadao(
  _demanda_id uuid,
  _secretaria_destino_id uuid,
  _justificativa text
)
RETURNS public.fala_demandas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.fala_demandas%ROWTYPE;
  v_origem uuid;
BEGIN
  SELECT *
  INTO v_row
  FROM public.fala_demandas
  WHERE id = _demanda_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Demanda nao encontrada.';
  END IF;

  IF NOT public.can_access_fala_secretaria(v_row.secretaria_atual_id) THEN
    RAISE EXCEPTION 'Sem permissao para transferir esta demanda.';
  END IF;

  IF length(trim(coalesce(_justificativa, ''))) < 5 THEN
    RAISE EXCEPTION 'Informe uma justificativa valida.';
  END IF;

  v_origem := v_row.secretaria_atual_id;

  INSERT INTO public.fala_transferencias (
    demanda_id,
    secretaria_origem_id,
    secretaria_destino_id,
    justificativa,
    usuario_id
  ) VALUES (
    v_row.id,
    v_origem,
    _secretaria_destino_id,
    trim(_justificativa),
    auth.uid()
  );

  UPDATE public.fala_demandas
  SET
    secretaria_atual_id = _secretaria_destino_id,
    status = 'transferido'::public.fala_status,
    responsavel_id = auth.uid(),
    updated_at = now()
  WHERE id = _demanda_id
  RETURNING * INTO v_row;

  INSERT INTO public.fala_historico_status (
    demanda_id,
    status_anterior,
    status_novo,
    observacao,
    usuario_id
  ) VALUES (
    v_row.id,
    'recebido'::public.fala_status,
    'transferido'::public.fala_status,
    trim(_justificativa),
    auth.uid()
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.avaliar_demanda_fala_cidadao(
  _session_token uuid,
  _demanda_id uuid,
  _avaliacao integer,
  _comentario text DEFAULT NULL
)
RETURNS public.fala_demandas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_usuario_externo_id uuid;
  v_row public.fala_demandas%ROWTYPE;
BEGIN
  IF _avaliacao < 0 OR _avaliacao > 10 THEN
    RAISE EXCEPTION 'Avaliacao invalida.';
  END IF;

  SELECT s.usuario_externo_id
  INTO v_usuario_externo_id
  FROM public.demutran_externo_sessoes s
  WHERE s.token = _session_token
    AND s.expires_at > now();

  IF v_usuario_externo_id IS NULL THEN
    RAISE EXCEPTION 'Sessao invalida.';
  END IF;

  UPDATE public.fala_demandas
  SET
    avaliacao = _avaliacao,
    avaliacao_comentario = NULLIF(trim(coalesce(_comentario, '')), ''),
    updated_at = now()
  WHERE id = _demanda_id
    AND usuario_externo_id = v_usuario_externo_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Demanda nao encontrada para o usuario.';
  END IF;

  RETURN v_row;
END;
$$;

ALTER TABLE public.fala_secretarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fala_assuntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_secretarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fala_demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fala_historico_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fala_transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fala_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read fala secretarias" ON public.fala_secretarias;
CREATE POLICY "Public can read fala secretarias"
ON public.fala_secretarias
FOR SELECT
TO anon, authenticated
USING (ativo = true OR public.is_fala_cidadao_admin());

DROP POLICY IF EXISTS "Public can read fala assuntos" ON public.fala_assuntos;
CREATE POLICY "Public can read fala assuntos"
ON public.fala_assuntos
FOR SELECT
TO anon, authenticated
USING (
  ativo = true
  OR public.is_fala_cidadao_admin()
);

DROP POLICY IF EXISTS "Fala super admins manage secretarias" ON public.fala_secretarias;
CREATE POLICY "Fala super admins manage secretarias"
ON public.fala_secretarias
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Fala super admins manage assuntos" ON public.fala_assuntos;
CREATE POLICY "Fala super admins manage assuntos"
ON public.fala_assuntos
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Users can view secretaria assignment" ON public.usuario_secretarias;
CREATE POLICY "Users can view secretaria assignment"
ON public.usuario_secretarias
FOR SELECT
TO authenticated
USING (
  usuario_id = auth.uid()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "Super admins manage secretaria assignment" ON public.usuario_secretarias;
CREATE POLICY "Super admins manage secretaria assignment"
ON public.usuario_secretarias
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admin can view fala demandas" ON public.fala_demandas;
CREATE POLICY "Admin can view fala demandas"
ON public.fala_demandas
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.can_access_fala_secretaria(secretaria_atual_id)
);

DROP POLICY IF EXISTS "Admin can update fala demandas" ON public.fala_demandas;
CREATE POLICY "Admin can update fala demandas"
ON public.fala_demandas
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR public.can_access_fala_secretaria(secretaria_atual_id)
)
WITH CHECK (
  public.is_super_admin()
  OR public.can_access_fala_secretaria(secretaria_atual_id)
);

DROP POLICY IF EXISTS "Admin can view fala historico" ON public.fala_historico_status;
CREATE POLICY "Admin can view fala historico"
ON public.fala_historico_status
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.fala_demandas d
    WHERE d.id = fala_historico_status.demanda_id
      AND (
        public.is_super_admin()
        OR public.can_access_fala_secretaria(d.secretaria_atual_id)
      )
  )
);

DROP POLICY IF EXISTS "Admin can insert fala historico" ON public.fala_historico_status;
CREATE POLICY "Admin can insert fala historico"
ON public.fala_historico_status
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.fala_demandas d
    WHERE d.id = fala_historico_status.demanda_id
      AND (
        public.is_super_admin()
        OR public.can_access_fala_secretaria(d.secretaria_atual_id)
      )
  )
);

DROP POLICY IF EXISTS "Admin can view fala transferencias" ON public.fala_transferencias;
CREATE POLICY "Admin can view fala transferencias"
ON public.fala_transferencias
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.can_access_fala_secretaria(secretaria_origem_id)
  OR public.can_access_fala_secretaria(secretaria_destino_id)
);

DROP POLICY IF EXISTS "Admin can insert fala transferencias" ON public.fala_transferencias;
CREATE POLICY "Admin can insert fala transferencias"
ON public.fala_transferencias
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR public.can_access_fala_secretaria(secretaria_origem_id)
);

DROP POLICY IF EXISTS "Admin can view fala auditoria" ON public.fala_auditoria;
CREATE POLICY "Admin can view fala auditoria"
ON public.fala_auditoria
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.fala_demandas d
    WHERE d.id = fala_auditoria.demanda_id
      AND (
        public.is_super_admin()
        OR public.can_access_fala_secretaria(d.secretaria_atual_id)
      )
  )
);

GRANT SELECT ON public.fala_secretarias TO anon, authenticated;
GRANT SELECT ON public.fala_assuntos TO anon, authenticated;
GRANT SELECT ON public.fala_demandas TO authenticated;
GRANT UPDATE ON public.fala_demandas TO authenticated;
GRANT SELECT, INSERT ON public.fala_historico_status TO authenticated;
GRANT SELECT, INSERT ON public.fala_transferencias TO authenticated;
GRANT SELECT ON public.fala_auditoria TO authenticated;
GRANT SELECT ON public.usuario_secretarias TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_fala_cidadao_setor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_fala_cidadao_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_fala_secretaria(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_protocolo_fala_cidadao() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.criar_demanda_fala_cidadao(text, text, text, text, uuid, uuid, text, text, text, text, text, public.fala_prioridade, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consultar_demanda_fala_cidadao(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.listar_minhas_solicitacoes_fala_cidadao(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_fala_cidadao(uuid, public.fala_status, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transferir_demanda_fala_cidadao(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.avaliar_demanda_fala_cidadao(uuid, uuid, integer, text) TO anon, authenticated;

INSERT INTO public.fala_secretarias (nome, sigla, descricao)
VALUES
  ('Infraestrutura', 'INFRA', 'Demandas urbanas de vias, drenagem e calcamento'),
  ('Saude', 'SAUDE', 'Demandas de unidades, atendimentos e vigilancia'),
  ('Seguranca Publica', 'SEG', 'Demandas de seguranca urbana e apoio operacional'),
  ('Meio Ambiente', 'MEIO', 'Demandas ambientais, poda e descarte'),
  ('SAAE', 'SAAE', 'Demandas de agua e esgoto')
ON CONFLICT (sigla) DO NOTHING;

INSERT INTO public.fala_assuntos (secretaria_id, nome, ordem)
SELECT s.id, assunto.nome, assunto.ordem
FROM public.fala_secretarias s
JOIN (
  VALUES
    ('INFRA', 'Buraco na via', 1),
    ('INFRA', 'Calcada danificada', 2),
    ('INFRA', 'Semaforo com defeito', 3),
    ('SAUDE', 'Atendimento em unidade', 1),
    ('SAUDE', 'Falta de insumos', 2),
    ('SEG', 'Iluminacao publica', 1),
    ('SEG', 'Ocorrencia em area publica', 2),
    ('MEIO', 'Poda de arvore', 1),
    ('MEIO', 'Descarte irregular', 2),
    ('SAAE', 'Falta de agua', 1),
    ('SAAE', 'Vazamento', 2),
    ('SAAE', 'Esgoto a ceu aberto', 3)
) AS assunto(sigla, nome, ordem)
  ON assunto.sigla = s.sigla
ON CONFLICT (secretaria_id, nome) DO NOTHING;

