-- =====================================================
-- Migration: Modulo Escalas da Guarda Municipal
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'guarda_escala_status' AND n.nspname = 'public') THEN
    CREATE TYPE public.guarda_escala_status AS ENUM ('RASCUNHO', 'PUBLICADA', 'CANCELADA');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'guarda_escala_troca_tipo' AND n.nspname = 'public') THEN
    CREATE TYPE public.guarda_escala_troca_tipo AS ENUM ('TROCA', 'SUBSTITUICAO');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'guarda_escala_troca_status' AND n.nspname = 'public') THEN
    CREATE TYPE public.guarda_escala_troca_status AS ENUM (
      'AGUARDANDO_ACEITE',
      'AGUARDANDO_APROVACAO',
      'APROVADA',
      'RECUSADA_PELO_GUARDA',
      'REJEITADA_PELA_ADMINISTRACAO',
      'CANCELADA',
      'EXPIRADA'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'guarda_escala_recorrencia_tipo' AND n.nspname = 'public') THEN
    CREATE TYPE public.guarda_escala_recorrencia_tipo AS ENUM ('NAO_REPETIR', 'DIARIA', 'SEMANAL', 'DIAS_SEMANA', 'CICLO_HORAS', 'PERSONALIZADO');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_guarda_escalas()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_super_admin()
    OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
    OR EXISTS (
      SELECT 1
      FROM public.perfis_usuarios pu
      WHERE pu.user_id = auth.uid()
        AND pu.ativo = true
        AND pu.setor_id = public.get_guarda_municipal_setor_id()
        AND pu.papel = 'tecnico'::public.papel_usuario
        AND (
          coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'guarda_escalas'
          OR coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'guardas'
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.get_guarda_id_by_user(p_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT gu.guarda_id
  FROM public.guardas_usuarios gu
  JOIN public.guardas_municipais gm ON gm.id = gu.guarda_id
  WHERE gu.usuario_id = p_user_id
    AND gm.ativo = true
  ORDER BY gu.created_at ASC
  LIMIT 1;
$$;

CREATE TABLE IF NOT EXISTS public.guarda_tipos_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  cor text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guarda_tipos_servico_nome_unq UNIQUE (nome)
);

CREATE TABLE IF NOT EXISTS public.guarda_postos_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  endereco text,
  bairro text,
  ponto_referencia text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guarda_postos_servico_nome_unq UNIQUE (nome)
);

CREATE TABLE IF NOT EXISTS public.guarda_escalas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL DEFAULT public.get_guarda_municipal_setor_id() REFERENCES public.setores(id) ON DELETE RESTRICT,
  titulo text NOT NULL,
  tipo_servico_id uuid REFERENCES public.guarda_tipos_servico(id) ON DELETE SET NULL,
  descricao text,
  observacoes text,
  data_inicio timestamptz NOT NULL,
  data_fim timestamptz NOT NULL,
  posto_id uuid REFERENCES public.guarda_postos_servico(id) ON DELETE SET NULL,
  local_texto text,
  ponto_apresentacao text,
  area_atuacao text,
  equipe_id uuid REFERENCES public.guarda_equipes(id) ON DELETE SET NULL,
  grupamento text,
  status public.guarda_escala_status NOT NULL DEFAULT 'RASCUNHO',
  recorrencia_tipo public.guarda_escala_recorrencia_tipo NOT NULL DEFAULT 'NAO_REPETIR',
  recorrencia_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorrencia_origem_id uuid REFERENCES public.guarda_escalas(id) ON DELETE SET NULL,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  publicado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  publicado_em timestamptz,
  cancelado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cancelado_em timestamptz,
  motivo_cancelamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guarda_escalas_periodo_check CHECK (data_fim > data_inicio),
  CONSTRAINT guarda_escalas_setor_check CHECK (setor_id = public.get_guarda_municipal_setor_id())
);

CREATE INDEX IF NOT EXISTS guarda_escalas_periodo_idx ON public.guarda_escalas (data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS guarda_escalas_status_idx ON public.guarda_escalas (status, data_inicio);
CREATE INDEX IF NOT EXISTS guarda_escalas_tipo_idx ON public.guarda_escalas (tipo_servico_id);
CREATE INDEX IF NOT EXISTS guarda_escalas_posto_idx ON public.guarda_escalas (posto_id);
CREATE INDEX IF NOT EXISTS guarda_escalas_equipe_idx ON public.guarda_escalas (equipe_id);

CREATE TABLE IF NOT EXISTS public.guarda_escala_agentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id uuid NOT NULL REFERENCES public.guarda_escalas(id) ON DELETE CASCADE,
  guarda_id uuid NOT NULL REFERENCES public.guardas_municipais(id) ON DELETE RESTRICT,
  funcao text NOT NULL DEFAULT 'Patrulheiro',
  observacao text,
  conflito_autorizado boolean NOT NULL DEFAULT false,
  motivo_conflito text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guarda_escala_agentes_unq UNIQUE (escala_id, guarda_id)
);

CREATE INDEX IF NOT EXISTS guarda_escala_agentes_escala_idx ON public.guarda_escala_agentes (escala_id);
CREATE INDEX IF NOT EXISTS guarda_escala_agentes_guarda_idx ON public.guarda_escala_agentes (guarda_id);

CREATE TABLE IF NOT EXISTS public.guarda_escala_viaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id uuid NOT NULL REFERENCES public.guarda_escalas(id) ON DELETE CASCADE,
  veiculo_id uuid REFERENCES public.guarda_frota_veiculos(id) ON DELETE SET NULL,
  agente_id uuid REFERENCES public.guarda_escala_agentes(id) ON DELETE SET NULL,
  observacao text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guarda_escala_viaturas_escala_idx ON public.guarda_escala_viaturas (escala_id);
CREATE INDEX IF NOT EXISTS guarda_escala_viaturas_veiculo_idx ON public.guarda_escala_viaturas (veiculo_id);

CREATE TABLE IF NOT EXISTS public.guarda_escala_ciencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id uuid NOT NULL REFERENCES public.guarda_escalas(id) ON DELETE CASCADE,
  guarda_id uuid NOT NULL REFERENCES public.guardas_municipais(id) ON DELETE CASCADE,
  visualizado_em timestamptz,
  confirmado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guarda_escala_ciencias_unq UNIQUE (escala_id, guarda_id)
);

CREATE INDEX IF NOT EXISTS guarda_escala_ciencias_guarda_idx ON public.guarda_escala_ciencias (guarda_id, confirmado_em);

CREATE TABLE IF NOT EXISTS public.guarda_escala_trocas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.guarda_escala_troca_tipo NOT NULL,
  solicitante_guarda_id uuid NOT NULL REFERENCES public.guardas_municipais(id) ON DELETE RESTRICT,
  destinatario_guarda_id uuid NOT NULL REFERENCES public.guardas_municipais(id) ON DELETE RESTRICT,
  escala_origem_id uuid NOT NULL REFERENCES public.guarda_escalas(id) ON DELETE CASCADE,
  escala_destino_id uuid REFERENCES public.guarda_escalas(id) ON DELETE SET NULL,
  status public.guarda_escala_troca_status NOT NULL DEFAULT 'AGUARDANDO_ACEITE',
  motivo_solicitacao text,
  observacao text,
  motivo_recusa text,
  motivo_rejeicao text,
  solicitado_em timestamptz NOT NULL DEFAULT now(),
  visualizado_em timestamptz,
  respondido_em timestamptz,
  aprovado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aprovado_em timestamptz,
  cancelado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guarda_escala_trocas_guardas_check CHECK (solicitante_guarda_id <> destinatario_guarda_id),
  CONSTRAINT guarda_escala_trocas_destino_check CHECK (tipo = 'SUBSTITUICAO' OR escala_destino_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS guarda_escala_trocas_status_idx ON public.guarda_escala_trocas (status, solicitado_em DESC);
CREATE INDEX IF NOT EXISTS guarda_escala_trocas_solicitante_idx ON public.guarda_escala_trocas (solicitante_guarda_id, solicitado_em DESC);
CREATE INDEX IF NOT EXISTS guarda_escala_trocas_destinatario_idx ON public.guarda_escala_trocas (destinatario_guarda_id, solicitado_em DESC);

CREATE TABLE IF NOT EXISTS public.guarda_escala_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id uuid REFERENCES public.guarda_escalas(id) ON DELETE CASCADE,
  troca_id uuid REFERENCES public.guarda_escala_trocas(id) ON DELETE CASCADE,
  guarda_id uuid REFERENCES public.guardas_municipais(id) ON DELETE SET NULL,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acao text NOT NULL,
  descricao text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guarda_escala_historico_escala_idx ON public.guarda_escala_historico (escala_id, created_at DESC);
CREATE INDEX IF NOT EXISTS guarda_escala_historico_troca_idx ON public.guarda_escala_historico (troca_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.guarda_escala_configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.registrar_guarda_escala_historico(
  p_escala_id uuid,
  p_troca_id uuid,
  p_guarda_id uuid,
  p_acao text,
  p_descricao text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.guarda_escala_historico (escala_id, troca_id, guarda_id, usuario_id, acao, descricao, metadata)
  VALUES (p_escala_id, p_troca_id, p_guarda_id, auth.uid(), p_acao, p_descricao, coalesce(p_metadata, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.guarda_escala_notify_guarda(
  p_guarda_id uuid,
  p_titulo text,
  p_mensagem text,
  p_tipo text DEFAULT 'info',
  p_link text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.admin_notifications (user_id, titulo, mensagem, tipo, link)
  SELECT gu.usuario_id, p_titulo, p_mensagem, p_tipo, p_link
  FROM public.guardas_usuarios gu
  WHERE gu.guarda_id = p_guarda_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.guarda_escala_has_access(p_escala_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.can_manage_guarda_escalas()
    OR EXISTS (
      SELECT 1
      FROM public.guarda_escala_agentes gea
      JOIN public.guarda_escalas ge ON ge.id = gea.escala_id
      WHERE gea.escala_id = p_escala_id
        AND ge.status = 'PUBLICADA'
        AND gea.guarda_id = public.get_guarda_id_by_user(auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.guarda_escala_trocas t
      WHERE (t.escala_origem_id = p_escala_id OR t.escala_destino_id = p_escala_id)
        AND public.get_guarda_id_by_user(auth.uid()) IN (t.solicitante_guarda_id, t.destinatario_guarda_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.detectar_conflitos_guarda_escala(
  p_guarda_id uuid,
  p_inicio timestamptz,
  p_fim timestamptz,
  p_ignorar_escala_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'escala_id', ge.id,
        'titulo', ge.titulo,
        'data_inicio', ge.data_inicio,
        'data_fim', ge.data_fim
      )
      ORDER BY ge.data_inicio
    ),
    '[]'::jsonb
  )
  FROM public.guarda_escala_agentes gea
  JOIN public.guarda_escalas ge ON ge.id = gea.escala_id
  WHERE gea.guarda_id = p_guarda_id
    AND ge.status IN ('RASCUNHO', 'PUBLICADA')
    AND (p_ignorar_escala_id IS NULL OR ge.id <> p_ignorar_escala_id)
    AND ge.data_inicio < p_fim
    AND ge.data_fim > p_inicio;
$$;

CREATE OR REPLACE FUNCTION public.guarda_escalas_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.registrar_guarda_escala_historico(NEW.id, NULL, NULL, 'ESCALA_CRIADA', 'Escala cadastrada', to_jsonb(NEW));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM public.registrar_guarda_escala_historico(
        NEW.id,
        NULL,
        NULL,
        'STATUS_ALTERADO',
        'Status alterado de ' || OLD.status::text || ' para ' || NEW.status::text,
        jsonb_build_object('status_anterior', OLD.status, 'status_novo', NEW.status)
      );
    ELSE
      PERFORM public.registrar_guarda_escala_historico(NEW.id, NULL, NULL, 'ESCALA_ATUALIZADA', 'Dados da escala atualizados');
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guarda_escala_agentes_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.registrar_guarda_escala_historico(NEW.escala_id, NULL, NEW.guarda_id, 'AGENTE_ADICIONADO', 'Agente adicionado a escala', to_jsonb(NEW));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    PERFORM public.registrar_guarda_escala_historico(NEW.escala_id, NULL, NEW.guarda_id, 'AGENTE_ATUALIZADO', 'Agente atualizado na escala');
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.registrar_guarda_escala_historico(OLD.escala_id, NULL, OLD.guarda_id, 'AGENTE_REMOVIDO', 'Agente removido da escala', to_jsonb(OLD));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_atualizar_guarda_tipos_servico_updated_at ON public.guarda_tipos_servico;
CREATE TRIGGER trigger_atualizar_guarda_tipos_servico_updated_at BEFORE UPDATE ON public.guarda_tipos_servico FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_atualizar_guarda_postos_servico_updated_at ON public.guarda_postos_servico;
CREATE TRIGGER trigger_atualizar_guarda_postos_servico_updated_at BEFORE UPDATE ON public.guarda_postos_servico FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_atualizar_guarda_escalas_updated_at ON public.guarda_escalas;
CREATE TRIGGER trigger_atualizar_guarda_escalas_updated_at BEFORE UPDATE ON public.guarda_escalas FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_audit_guarda_escalas ON public.guarda_escalas;
CREATE TRIGGER trigger_audit_guarda_escalas AFTER INSERT OR UPDATE ON public.guarda_escalas FOR EACH ROW EXECUTE FUNCTION public.guarda_escalas_audit_trigger();

DROP TRIGGER IF EXISTS trigger_atualizar_guarda_escala_agentes_updated_at ON public.guarda_escala_agentes;
CREATE TRIGGER trigger_atualizar_guarda_escala_agentes_updated_at BEFORE UPDATE ON public.guarda_escala_agentes FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_audit_guarda_escala_agentes ON public.guarda_escala_agentes;
CREATE TRIGGER trigger_audit_guarda_escala_agentes AFTER INSERT OR UPDATE OR DELETE ON public.guarda_escala_agentes FOR EACH ROW EXECUTE FUNCTION public.guarda_escala_agentes_audit_trigger();

DROP TRIGGER IF EXISTS trigger_atualizar_guarda_escala_ciencias_updated_at ON public.guarda_escala_ciencias;
CREATE TRIGGER trigger_atualizar_guarda_escala_ciencias_updated_at BEFORE UPDATE ON public.guarda_escala_ciencias FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_atualizar_guarda_escala_trocas_updated_at ON public.guarda_escala_trocas;
CREATE TRIGGER trigger_atualizar_guarda_escala_trocas_updated_at BEFORE UPDATE ON public.guarda_escala_trocas FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_atualizar_guarda_escala_configuracoes_updated_at ON public.guarda_escala_configuracoes;
CREATE TRIGGER trigger_atualizar_guarda_escala_configuracoes_updated_at BEFORE UPDATE ON public.guarda_escala_configuracoes FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

CREATE OR REPLACE FUNCTION public.publicar_guarda_escala(p_escala_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_escala public.guarda_escalas%ROWTYPE;
  v_agente record;
  v_qtd integer := 0;
BEGIN
  IF NOT public.can_manage_guarda_escalas() THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Sem permissao.');
  END IF;

  SELECT * INTO v_escala FROM public.guarda_escalas WHERE id = p_escala_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Escala nao encontrada.');
  END IF;
  IF v_escala.status = 'CANCELADA' THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Escala cancelada nao pode ser publicada.');
  END IF;

  SELECT count(*) INTO v_qtd FROM public.guarda_escala_agentes WHERE escala_id = p_escala_id;
  IF v_qtd = 0 THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Adicione ao menos um agente antes de publicar.');
  END IF;

  UPDATE public.guarda_escalas
  SET status = 'PUBLICADA',
      publicado_por = auth.uid(),
      publicado_em = now()
  WHERE id = p_escala_id;

  INSERT INTO public.guarda_escala_ciencias (escala_id, guarda_id)
  SELECT p_escala_id, gea.guarda_id
  FROM public.guarda_escala_agentes gea
  WHERE gea.escala_id = p_escala_id
  ON CONFLICT (escala_id, guarda_id) DO NOTHING;

  FOR v_agente IN SELECT guarda_id FROM public.guarda_escala_agentes WHERE escala_id = p_escala_id LOOP
    PERFORM public.guarda_escala_notify_guarda(
      v_agente.guarda_id,
      'Nova escala de servico',
      'Voce possui uma nova escala publicada.',
      'info',
      '/admin/perfil-guardas/guarda-municipal/escalas'
    );
  END LOOP;

  PERFORM public.registrar_guarda_escala_historico(p_escala_id, NULL, NULL, 'ESCALA_PUBLICADA', 'Escala publicada e agentes notificados');
  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Escala publicada.', 'agentes', v_qtd);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_guarda_escala(p_escala_id uuid, p_motivo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agente record;
BEGIN
  IF NOT public.can_manage_guarda_escalas() THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Sem permissao.');
  END IF;

  UPDATE public.guarda_escalas
  SET status = 'CANCELADA',
      cancelado_por = auth.uid(),
      cancelado_em = now(),
      motivo_cancelamento = nullif(trim(coalesce(p_motivo, '')), '')
  WHERE id = p_escala_id
    AND status = 'PUBLICADA';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Somente escalas publicadas podem ser canceladas por este fluxo.');
  END IF;

  FOR v_agente IN SELECT guarda_id FROM public.guarda_escala_agentes WHERE escala_id = p_escala_id LOOP
    PERFORM public.guarda_escala_notify_guarda(
      v_agente.guarda_id,
      'Escala cancelada',
      'Uma das suas escalas foi cancelada.',
      'warning',
      '/admin/perfil-guardas/guarda-municipal/escalas'
    );
  END LOOP;

  PERFORM public.registrar_guarda_escala_historico(p_escala_id, NULL, NULL, 'ESCALA_CANCELADA', p_motivo);
  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Escala cancelada.');
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_ciencia_guarda_escala(p_escala_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda_id uuid;
BEGIN
  v_guarda_id := public.get_guarda_id_by_user(auth.uid());
  IF v_guarda_id IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Guarda nao identificado.');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.guarda_escala_agentes gea
    JOIN public.guarda_escalas ge ON ge.id = gea.escala_id
    WHERE gea.escala_id = p_escala_id
      AND gea.guarda_id = v_guarda_id
      AND ge.status = 'PUBLICADA'
  ) THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Escala nao encontrada para este guarda.');
  END IF;

  INSERT INTO public.guarda_escala_ciencias (escala_id, guarda_id, visualizado_em, confirmado_em)
  VALUES (p_escala_id, v_guarda_id, now(), now())
  ON CONFLICT (escala_id, guarda_id)
  DO UPDATE SET visualizado_em = coalesce(public.guarda_escala_ciencias.visualizado_em, now()), confirmado_em = coalesce(public.guarda_escala_ciencias.confirmado_em, now());

  PERFORM public.registrar_guarda_escala_historico(p_escala_id, NULL, v_guarda_id, 'CIENCIA_CONFIRMADA', 'Guarda confirmou ciencia da escala');
  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Ciencia confirmada.');
END;
$$;

CREATE OR REPLACE FUNCTION public.criar_solicitacao_troca_escala(
  p_tipo public.guarda_escala_troca_tipo,
  p_escala_origem_id uuid,
  p_destinatario_guarda_id uuid,
  p_escala_destino_id uuid DEFAULT NULL,
  p_motivo text DEFAULT NULL,
  p_observacao text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_solicitante uuid;
  v_troca_id uuid;
  v_inicio timestamptz;
BEGIN
  v_solicitante := public.get_guarda_id_by_user(auth.uid());
  IF v_solicitante IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Guarda nao identificado.');
  END IF;
  IF v_solicitante = p_destinatario_guarda_id THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Destinatario invalido.');
  END IF;
  IF p_tipo = 'TROCA' AND p_escala_destino_id IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Informe a escala oferecida.');
  END IF;

  SELECT data_inicio INTO v_inicio
  FROM public.guarda_escalas ge
  JOIN public.guarda_escala_agentes gea ON gea.escala_id = ge.id
  WHERE ge.id = p_escala_origem_id
    AND ge.status = 'PUBLICADA'
    AND ge.data_inicio > now()
    AND gea.guarda_id = v_solicitante;

  IF v_inicio IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'A escala de origem nao permite troca.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.guardas_municipais WHERE id = p_destinatario_guarda_id AND ativo = true) THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Destinatario inativo ou nao encontrado.');
  END IF;

  IF p_tipo = 'TROCA' AND NOT EXISTS (
    SELECT 1
    FROM public.guarda_escalas ge
    JOIN public.guarda_escala_agentes gea ON gea.escala_id = ge.id
    WHERE ge.id = p_escala_destino_id
      AND ge.status = 'PUBLICADA'
      AND ge.data_inicio > now()
      AND gea.guarda_id = p_destinatario_guarda_id
  ) THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'A escala oferecida nao pertence ao destinatario ou nao permite troca.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.guarda_escala_trocas
    WHERE status IN ('AGUARDANDO_ACEITE', 'AGUARDANDO_APROVACAO')
      AND (escala_origem_id = p_escala_origem_id OR escala_destino_id = p_escala_origem_id OR escala_origem_id = p_escala_destino_id OR escala_destino_id = p_escala_destino_id)
  ) THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Ja existe uma solicitacao pendente envolvendo esta escala.');
  END IF;

  INSERT INTO public.guarda_escala_trocas (
    tipo, solicitante_guarda_id, destinatario_guarda_id, escala_origem_id, escala_destino_id, motivo_solicitacao, observacao
  )
  VALUES (p_tipo, v_solicitante, p_destinatario_guarda_id, p_escala_origem_id, p_escala_destino_id, nullif(trim(coalesce(p_motivo, '')), ''), nullif(trim(coalesce(p_observacao, '')), ''))
  RETURNING id INTO v_troca_id;

  PERFORM public.registrar_guarda_escala_historico(p_escala_origem_id, v_troca_id, v_solicitante, 'TROCA_SOLICITADA', 'Solicitacao de troca criada');
  PERFORM public.guarda_escala_notify_guarda(p_destinatario_guarda_id, 'Solicitacao de troca', 'Voce recebeu uma solicitacao de troca de servico.', 'info', '/admin/perfil-guardas/guarda-municipal/escalas');

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Solicitacao criada.', 'troca_id', v_troca_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.responder_solicitacao_troca_escala(
  p_troca_id uuid,
  p_aceitar boolean,
  p_motivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda_id uuid;
  v_troca public.guarda_escala_trocas%ROWTYPE;
BEGIN
  v_guarda_id := public.get_guarda_id_by_user(auth.uid());
  SELECT * INTO v_troca FROM public.guarda_escala_trocas WHERE id = p_troca_id;

  IF NOT FOUND OR v_troca.destinatario_guarda_id <> v_guarda_id THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Solicitacao nao encontrada.');
  END IF;
  IF v_troca.status <> 'AGUARDANDO_ACEITE' THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Solicitacao nao esta aguardando aceite.');
  END IF;

  UPDATE public.guarda_escala_trocas
  SET status = CASE WHEN p_aceitar THEN 'AGUARDANDO_APROVACAO'::public.guarda_escala_troca_status ELSE 'RECUSADA_PELO_GUARDA'::public.guarda_escala_troca_status END,
      motivo_recusa = CASE WHEN p_aceitar THEN NULL ELSE nullif(trim(coalesce(p_motivo, '')), '') END,
      visualizado_em = coalesce(visualizado_em, now()),
      respondido_em = now()
  WHERE id = p_troca_id;

  PERFORM public.registrar_guarda_escala_historico(v_troca.escala_origem_id, p_troca_id, v_guarda_id, CASE WHEN p_aceitar THEN 'TROCA_ACEITA' ELSE 'TROCA_RECUSADA' END, p_motivo);
  PERFORM public.guarda_escala_notify_guarda(v_troca.solicitante_guarda_id, CASE WHEN p_aceitar THEN 'Troca aceita' ELSE 'Troca recusada' END, CASE WHEN p_aceitar THEN 'Sua solicitacao aguarda aprovacao administrativa.' ELSE 'Sua solicitacao foi recusada pelo destinatario.' END, CASE WHEN p_aceitar THEN 'success' ELSE 'warning' END, '/admin/perfil-guardas/guarda-municipal/escalas');

  RETURN jsonb_build_object('sucesso', true, 'mensagem', CASE WHEN p_aceitar THEN 'Solicitacao aceita.' ELSE 'Solicitacao recusada.' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_solicitacao_troca_escala(p_troca_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda_id uuid;
BEGIN
  v_guarda_id := public.get_guarda_id_by_user(auth.uid());

  UPDATE public.guarda_escala_trocas
  SET status = 'CANCELADA',
      cancelado_em = now()
  WHERE id = p_troca_id
    AND solicitante_guarda_id = v_guarda_id
    AND status IN ('AGUARDANDO_ACEITE', 'AGUARDANDO_APROVACAO');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Solicitacao nao pode ser cancelada.');
  END IF;

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Solicitacao cancelada.');
END;
$$;

CREATE OR REPLACE FUNCTION public.aprovar_solicitacao_troca_escala(
  p_troca_id uuid,
  p_aprovar boolean,
  p_motivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_troca public.guarda_escala_trocas%ROWTYPE;
  v_origem_agente public.guarda_escala_agentes%ROWTYPE;
  v_destino_agente public.guarda_escala_agentes%ROWTYPE;
BEGIN
  IF NOT public.can_manage_guarda_escalas() THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Sem permissao.');
  END IF;

  SELECT * INTO v_troca FROM public.guarda_escala_trocas WHERE id = p_troca_id FOR UPDATE;
  IF NOT FOUND OR v_troca.status <> 'AGUARDANDO_APROVACAO' THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Solicitacao nao esta aguardando aprovacao.');
  END IF;

  IF NOT p_aprovar THEN
    UPDATE public.guarda_escala_trocas
    SET status = 'REJEITADA_PELA_ADMINISTRACAO',
        motivo_rejeicao = nullif(trim(coalesce(p_motivo, '')), ''),
        aprovado_por = auth.uid(),
        aprovado_em = now()
    WHERE id = p_troca_id;

    PERFORM public.registrar_guarda_escala_historico(v_troca.escala_origem_id, p_troca_id, NULL, 'TROCA_REJEITADA', p_motivo);
    PERFORM public.guarda_escala_notify_guarda(v_troca.solicitante_guarda_id, 'Troca rejeitada', 'Sua solicitacao de troca nao foi aprovada.', 'warning', '/admin/perfil-guardas/guarda-municipal/escalas');
    PERFORM public.guarda_escala_notify_guarda(v_troca.destinatario_guarda_id, 'Troca rejeitada', 'Uma solicitacao de troca aceita por voce foi rejeitada.', 'warning', '/admin/perfil-guardas/guarda-municipal/escalas');
    RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Solicitacao rejeitada.');
  END IF;

  SELECT * INTO v_origem_agente
  FROM public.guarda_escala_agentes
  WHERE escala_id = v_troca.escala_origem_id
    AND guarda_id = v_troca.solicitante_guarda_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Agente solicitante nao encontrado na escala original.');
  END IF;

  IF v_troca.tipo = 'TROCA' THEN
    SELECT * INTO v_destino_agente
    FROM public.guarda_escala_agentes
    WHERE escala_id = v_troca.escala_destino_id
      AND guarda_id = v_troca.destinatario_guarda_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Agente destinatario nao encontrado na escala oferecida.');
    END IF;

    UPDATE public.guarda_escala_agentes
    SET guarda_id = v_troca.destinatario_guarda_id
    WHERE id = v_origem_agente.id;

    UPDATE public.guarda_escala_agentes
    SET guarda_id = v_troca.solicitante_guarda_id
    WHERE id = v_destino_agente.id;
  ELSE
    UPDATE public.guarda_escala_agentes
    SET guarda_id = v_troca.destinatario_guarda_id
    WHERE id = v_origem_agente.id;
  END IF;

  UPDATE public.guarda_escala_trocas
  SET status = 'APROVADA',
      aprovado_por = auth.uid(),
      aprovado_em = now()
  WHERE id = p_troca_id;

  PERFORM public.registrar_guarda_escala_historico(v_troca.escala_origem_id, p_troca_id, NULL, 'TROCA_APROVADA', 'Troca aprovada e escala oficial atualizada');
  PERFORM public.guarda_escala_notify_guarda(v_troca.solicitante_guarda_id, 'Troca aprovada', 'Sua troca de servico foi aprovada.', 'success', '/admin/perfil-guardas/guarda-municipal/escalas');
  PERFORM public.guarda_escala_notify_guarda(v_troca.destinatario_guarda_id, 'Troca aprovada', 'Uma troca de servico envolvendo voce foi aprovada.', 'success', '/admin/perfil-guardas/guarda-municipal/escalas');

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Troca aprovada e aplicada.');
END;
$$;

ALTER TABLE public.guarda_tipos_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_postos_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_escala_agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_escala_viaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_escala_ciencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_escala_trocas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_escala_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_escala_configuracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage guarda tipos servico" ON public.guarda_tipos_servico;
CREATE POLICY "Admins can manage guarda tipos servico" ON public.guarda_tipos_servico FOR ALL TO authenticated USING (public.can_manage_guarda_escalas()) WITH CHECK (public.can_manage_guarda_escalas());

DROP POLICY IF EXISTS "Authenticated can view active guarda tipos servico" ON public.guarda_tipos_servico;
CREATE POLICY "Authenticated can view active guarda tipos servico" ON public.guarda_tipos_servico FOR SELECT TO authenticated USING (ativo = true OR public.can_manage_guarda_escalas());

DROP POLICY IF EXISTS "Admins can manage guarda postos servico" ON public.guarda_postos_servico;
CREATE POLICY "Admins can manage guarda postos servico" ON public.guarda_postos_servico FOR ALL TO authenticated USING (public.can_manage_guarda_escalas()) WITH CHECK (public.can_manage_guarda_escalas());

DROP POLICY IF EXISTS "Authenticated can view active guarda postos servico" ON public.guarda_postos_servico;
CREATE POLICY "Authenticated can view active guarda postos servico" ON public.guarda_postos_servico FOR SELECT TO authenticated USING (ativo = true OR public.can_manage_guarda_escalas());

DROP POLICY IF EXISTS "Escalas access policy" ON public.guarda_escalas;
CREATE POLICY "Escalas access policy" ON public.guarda_escalas FOR SELECT TO authenticated USING (public.can_manage_guarda_escalas() OR public.guarda_escala_has_access(id));

DROP POLICY IF EXISTS "Admins can insert guarda escalas" ON public.guarda_escalas;
CREATE POLICY "Admins can insert guarda escalas" ON public.guarda_escalas FOR INSERT TO authenticated WITH CHECK (public.can_manage_guarda_escalas() AND setor_id = public.get_guarda_municipal_setor_id());

DROP POLICY IF EXISTS "Admins can update guarda escalas" ON public.guarda_escalas;
CREATE POLICY "Admins can update guarda escalas" ON public.guarda_escalas FOR UPDATE TO authenticated USING (public.can_manage_guarda_escalas()) WITH CHECK (public.can_manage_guarda_escalas() AND setor_id = public.get_guarda_municipal_setor_id());

DROP POLICY IF EXISTS "Admins can delete draft guarda escalas" ON public.guarda_escalas;
CREATE POLICY "Admins can delete draft guarda escalas" ON public.guarda_escalas FOR DELETE TO authenticated USING (public.can_manage_guarda_escalas() AND status = 'RASCUNHO');

DROP POLICY IF EXISTS "Escala agentes access policy" ON public.guarda_escala_agentes;
CREATE POLICY "Escala agentes access policy" ON public.guarda_escala_agentes FOR SELECT TO authenticated USING (public.can_manage_guarda_escalas() OR public.guarda_escala_has_access(escala_id));

DROP POLICY IF EXISTS "Admins can manage escala agentes" ON public.guarda_escala_agentes;
CREATE POLICY "Admins can manage escala agentes" ON public.guarda_escala_agentes FOR ALL TO authenticated USING (public.can_manage_guarda_escalas()) WITH CHECK (public.can_manage_guarda_escalas());

DROP POLICY IF EXISTS "Escala viaturas access policy" ON public.guarda_escala_viaturas;
CREATE POLICY "Escala viaturas access policy" ON public.guarda_escala_viaturas FOR SELECT TO authenticated USING (public.can_manage_guarda_escalas() OR public.guarda_escala_has_access(escala_id));

DROP POLICY IF EXISTS "Admins can manage escala viaturas" ON public.guarda_escala_viaturas;
CREATE POLICY "Admins can manage escala viaturas" ON public.guarda_escala_viaturas FOR ALL TO authenticated USING (public.can_manage_guarda_escalas()) WITH CHECK (public.can_manage_guarda_escalas());

DROP POLICY IF EXISTS "Ciencias own access" ON public.guarda_escala_ciencias;
CREATE POLICY "Ciencias own access" ON public.guarda_escala_ciencias FOR SELECT TO authenticated USING (public.can_manage_guarda_escalas() OR guarda_id = public.get_guarda_id_by_user(auth.uid()));

DROP POLICY IF EXISTS "Ciencias own update" ON public.guarda_escala_ciencias;
CREATE POLICY "Ciencias own update" ON public.guarda_escala_ciencias FOR UPDATE TO authenticated USING (guarda_id = public.get_guarda_id_by_user(auth.uid())) WITH CHECK (guarda_id = public.get_guarda_id_by_user(auth.uid()));

DROP POLICY IF EXISTS "Trocas access policy" ON public.guarda_escala_trocas;
CREATE POLICY "Trocas access policy" ON public.guarda_escala_trocas FOR SELECT TO authenticated USING (public.can_manage_guarda_escalas() OR public.get_guarda_id_by_user(auth.uid()) IN (solicitante_guarda_id, destinatario_guarda_id));

DROP POLICY IF EXISTS "Trocas admin manage" ON public.guarda_escala_trocas;
CREATE POLICY "Trocas admin manage" ON public.guarda_escala_trocas FOR ALL TO authenticated USING (public.can_manage_guarda_escalas()) WITH CHECK (public.can_manage_guarda_escalas());

DROP POLICY IF EXISTS "Historico access policy" ON public.guarda_escala_historico;
CREATE POLICY "Historico access policy" ON public.guarda_escala_historico FOR SELECT TO authenticated USING (public.can_manage_guarda_escalas() OR (escala_id IS NOT NULL AND public.guarda_escala_has_access(escala_id)));

DROP POLICY IF EXISTS "Admins can manage guarda escala configuracoes" ON public.guarda_escala_configuracoes;
CREATE POLICY "Admins can manage guarda escala configuracoes" ON public.guarda_escala_configuracoes FOR ALL TO authenticated USING (public.can_manage_guarda_escalas()) WITH CHECK (public.can_manage_guarda_escalas());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarda_tipos_servico TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarda_postos_servico TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarda_escalas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarda_escala_agentes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarda_escala_viaturas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.guarda_escala_ciencias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarda_escala_trocas TO authenticated;
GRANT SELECT ON public.guarda_escala_historico TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarda_escala_configuracoes TO authenticated;

GRANT EXECUTE ON FUNCTION public.can_manage_guarda_escalas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_guarda_id_by_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_guarda_escala_historico(uuid, uuid, uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detectar_conflitos_guarda_escala(uuid, timestamptz, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publicar_guarda_escala(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_guarda_escala(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_ciencia_guarda_escala(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_solicitacao_troca_escala(public.guarda_escala_troca_tipo, uuid, uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.responder_solicitacao_troca_escala(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_solicitacao_troca_escala(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aprovar_solicitacao_troca_escala(uuid, boolean, text) TO authenticated;

INSERT INTO public.guarda_tipos_servico (nome, descricao, cor, ordem)
VALUES
  ('Patrulhamento Ostensivo', 'Patrulhamento preventivo e ostensivo.', '#2563eb', 10),
  ('Patrulhamento Escolar', 'Atuacao preventiva em ambiente escolar.', '#16a34a', 20),
  ('Guarda Patrimonial', 'Protecao de predios e patrimonio publico.', '#475569', 30),
  ('Fiscalizacao', 'Servico de fiscalizacao e apoio operacional.', '#dc2626', 40),
  ('Operacao Especial', 'Operacao planejada com finalidade especifica.', '#7c3aed', 50),
  ('Evento', 'Apoio em eventos publicos.', '#ea580c', 60),
  ('Apoio', 'Servico de apoio operacional.', '#0891b2', 70),
  ('Ronda', 'Ronda preventiva.', '#0f766e', 80),
  ('Servico Administrativo', 'Servico interno ou administrativo.', '#64748b', 90),
  ('Outro', 'Outro tipo de servico.', '#334155', 100)
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.guarda_escala_configuracoes (chave, valor)
VALUES
  ('trocas', jsonb_build_object('prazo_minimo_horas', 12, 'motivo_obrigatorio', true))
ON CONFLICT (chave) DO NOTHING;

UPDATE auth.users au
SET raw_app_meta_data = jsonb_set(
  coalesce(au.raw_app_meta_data, '{}'::jsonb),
  '{modulos}',
  (
    SELECT jsonb_agg(DISTINCT value)
    FROM jsonb_array_elements_text(
      coalesce(au.raw_app_meta_data->'modulos', '[]'::jsonb) || '["guarda_escalas"]'::jsonb
    ) AS value
  ),
  true
)
FROM public.perfis_usuarios pu
WHERE pu.user_id = au.id
  AND pu.ativo = true
  AND pu.setor_id = public.get_guarda_municipal_setor_id()
  AND pu.papel IN ('gestor'::public.papel_usuario, 'admin_setor'::public.papel_usuario, 'tecnico'::public.papel_usuario)
  AND coalesce(au.raw_app_meta_data->'modulos', '[]'::jsonb) <> '[]'::jsonb
  AND NOT (coalesce(au.raw_app_meta_data->'modulos', '[]'::jsonb) ? 'guarda_escalas');
