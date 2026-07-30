-- =====================================================
-- MIGRATION: Guarda Escalas Ciencias, Versoes e Solicitações
-- =====================================================

-- 1. Ampliar tabela guarda_escalas com versao
ALTER TABLE public.guarda_escalas
  ADD COLUMN IF NOT EXISTS versao integer NOT NULL DEFAULT 1;

-- 2. Ampliar tabela guarda_escala_ciencias com versao e status
ALTER TABLE public.guarda_escala_ciencias
  ADD COLUMN IF NOT EXISTS escala_versao integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status_ciencia text NOT NULL DEFAULT 'PENDENTE_CIENCIA';

-- 3. Tabela de Versões / Snapshots da Escala
CREATE TABLE IF NOT EXISTS public.guarda_escala_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id uuid NOT NULL REFERENCES public.guarda_escalas(id) ON DELETE CASCADE,
  versao integer NOT NULL,
  titulo text NOT NULL,
  data_inicio timestamptz NOT NULL,
  data_fim timestamptz NOT NULL,
  posto_texto text,
  tipo_servico_nome text,
  equipe_nome text,
  grupamento text,
  ponto_apresentacao text,
  observacoes text,
  agentes_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  viaturas_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  alterado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guarda_escala_versoes_escala ON public.guarda_escala_versoes (escala_id, versao DESC);

-- 4. Sequência e Tabela de Solicitações do Guarda (Central "Minhas Solicitações")
CREATE SEQUENCE IF NOT EXISTS public.guarda_solicitacoes_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.guarda_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo text NOT NULL UNIQUE DEFAULT ('SOL-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.guarda_solicitacoes_seq')::text, 5, '0')),
  guarda_id uuid NOT NULL REFERENCES public.guardas_municipais(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- 'TROCA_SERVICO', 'ESCLARECIMENTO_ESCALA', 'CORRECAO_ESCALA', 'ATUALIZACAO_CADASTRAL', 'PROBLEMA_EQUIPAMENTO', 'SOLICITACAO_ADMINISTRATIVA', 'OUTRO'
  assunto text NOT NULL,
  descricao text,
  escala_id uuid REFERENCES public.guarda_escalas(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'PENDENTE', -- 'PENDENTE', 'EM_ANALISE', 'AGUARDANDO_INFORMACAO', 'APROVADA', 'RECUSADA', 'CONCLUIDA', 'CANCELADA'
  analisado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  analisado_em timestamptz,
  resposta_gestao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guarda_solicitacoes_guarda ON public.guarda_solicitacoes (guarda_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guarda_solicitacoes_escala ON public.guarda_solicitacoes (escala_id);

-- 5. Tabela de Interações da Solicitação (Linha do Tempo)
CREATE TABLE IF NOT EXISTS public.guarda_solicitacao_interacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.guarda_solicitacoes(id) ON DELETE CASCADE,
  autor_usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_tipo text NOT NULL DEFAULT 'GUARDA', -- 'GUARDA', 'GESTAO', 'SISTEMA'
  mensagem text NOT NULL,
  anexos jsonb NOT NULL DEFAULT '[]'::jsonb,
  status_anterior text,
  status_novo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guarda_solicitacao_interacoes_solicitacao ON public.guarda_solicitacao_interacoes (solicitacao_id, created_at ASC);

-- 6. Trigger para updated_at de solicitações
DROP TRIGGER IF EXISTS trigger_atualizar_guarda_solicitacoes_updated_at ON public.guarda_solicitacoes;
CREATE TRIGGER trigger_atualizar_guarda_solicitacoes_updated_at
  BEFORE UPDATE ON public.guarda_solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- 7. RPC: Confirmar Ciência da Escala (Atualizado para lidar com versão)
CREATE OR REPLACE FUNCTION public.confirmar_ciencia_guarda_escala(p_escala_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda_id uuid;
  v_escala public.guarda_escalas%ROWTYPE;
  v_novo_status text;
BEGIN
  v_guarda_id := public.get_guarda_id_by_user(auth.uid());
  IF v_guarda_id IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Guarda não identificado.');
  END IF;

  SELECT * INTO v_escala FROM public.guarda_escalas WHERE id = p_escala_id;
  IF NOT FOUND OR v_escala.status <> 'PUBLICADA' THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Escala publicada não encontrada para este guarda.');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.guarda_escala_agentes
    WHERE escala_id = p_escala_id AND guarda_id = v_guarda_id
  ) THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Você não faz parte desta escala.');
  END IF;

  v_novo_status := CASE WHEN coalesce(v_escala.versao, 1) > 1 THEN 'CIENTE_ALTERACAO' ELSE 'CIENTE' END;

  INSERT INTO public.guarda_escala_ciencias (
    escala_id, guarda_id, visualizado_em, confirmado_em, escala_versao, status_ciencia
  )
  VALUES (
    p_escala_id, v_guarda_id, now(), now(), coalesce(v_escala.versao, 1), v_novo_status
  )
  ON CONFLICT (escala_id, guarda_id)
  DO UPDATE SET
    visualizado_em = coalesce(public.guarda_escala_ciencias.visualizado_em, now()),
    confirmado_em = now(),
    escala_versao = coalesce(v_escala.versao, 1),
    status_ciencia = v_novo_status,
    updated_at = now();

  PERFORM public.registrar_guarda_escala_historico(
    p_escala_id, NULL, v_guarda_id, 'CIENCIA_CONFIRMADA',
    'Guarda confirmou ciência da escala (v' || coalesce(v_escala.versao, 1)::text || ')'
  );

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Ciência confirmada com sucesso.', 'versao', coalesce(v_escala.versao, 1));
END;
$$;

-- 8. RPC: Resumo de Ciências da Escala para o Gestor
CREATE OR REPLACE FUNCTION public.obter_resumo_ciencias_gestor(p_escala_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_escala public.guarda_escalas%ROWTYPE;
  v_total_agentes integer := 0;
  v_cientes integer := 0;
  v_pendentes integer := 0;
  v_alteradas integer := 0;
  v_agentes_list jsonb;
BEGIN
  IF NOT public.can_manage_guarda_escalas() THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Sem permissão.');
  END IF;

  SELECT * INTO v_escala FROM public.guarda_escalas WHERE id = p_escala_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Escala não encontrada.');
  END IF;

  SELECT count(*) INTO v_total_agentes
  FROM public.guarda_escala_agentes
  WHERE escala_id = p_escala_id;

  SELECT
    count(*) FILTER (WHERE gc.status_ciencia IN ('CIENTE', 'CIENTE_ALTERACAO') AND gc.escala_versao = coalesce(v_escala.versao, 1)),
    count(*) FILTER (WHERE gc.status_ciencia = 'ALTERADA_APOS_CIENCIA' OR (gc.status_ciencia IN ('CIENTE', 'CIENTE_ALTERACAO') AND gc.escala_versao < coalesce(v_escala.versao, 1))),
    count(*) FILTER (WHERE gc.id IS NULL OR gc.confirmado_em IS NULL OR gc.status_ciencia = 'PENDENTE_CIENCIA')
  INTO v_cientes, v_alteradas, v_pendentes
  FROM public.guarda_escala_agentes gea
  LEFT JOIN public.guarda_escala_ciencias gc ON gc.escala_id = gea.escala_id AND gc.guarda_id = gea.guarda_id
  WHERE gea.escala_id = p_escala_id;

  SELECT jsonb_agg(
    jsonb_build_object(
      'guarda_id', gm.id,
      'nome', gm.nome,
      'matricula', gm.matricula,
      'funcao', gea.funcao,
      'status_ciencia', CASE
        WHEN gc.id IS NULL OR gc.confirmado_em IS NULL THEN 'PENDENTE_CIENCIA'
        WHEN gc.escala_versao < coalesce(v_escala.versao, 1) OR gc.status_ciencia = 'ALTERADA_APOS_CIENCIA' THEN 'ALTERADA_APOS_CIENCIA'
        ELSE gc.status_ciencia
      END,
      'confirmado_em', gc.confirmado_em,
      'escala_versao', gc.escala_versao
    ) ORDER BY gm.nome
  ) INTO v_agentes_list
  FROM public.guarda_escala_agentes gea
  JOIN public.guardas_municipais gm ON gm.id = gea.guarda_id
  LEFT JOIN public.guarda_escala_ciencias gc ON gc.escala_id = gea.escala_id AND gc.guarda_id = gea.guarda_id
  WHERE gea.escala_id = p_escala_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'versao_atual', coalesce(v_escala.versao, 1),
    'total_agentes', v_total_agentes,
    'cientes', v_cientes,
    'pendentes', v_pendentes,
    'alteradas_pendentes', v_alteradas,
    'agentes', coalesce(v_agentes_list, '[]'::jsonb)
  );
END;
$$;

-- 9. RPC: Solicitar Esclarecimento de Escala
CREATE OR REPLACE FUNCTION public.solicitar_esclarecimento_escala(
  p_escala_id uuid,
  p_assunto text,
  p_descricao text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda_id uuid;
  v_escala public.guarda_escalas%ROWTYPE;
  v_solicitacao_id uuid;
  v_protocolo text;
BEGIN
  v_guarda_id := public.get_guarda_id_by_user(auth.uid());
  IF v_guarda_id IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Guarda não identificado.');
  END IF;

  SELECT * INTO v_escala FROM public.guarda_escalas WHERE id = p_escala_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Escala não encontrada.');
  END IF;

  INSERT INTO public.guarda_solicitacoes (
    guarda_id, tipo, assunto, descricao, escala_id, status
  )
  VALUES (
    v_guarda_id,
    'ESCLARECIMENTO_ESCALA',
    trim(p_assunto),
    nullif(trim(p_descricao), ''),
    p_escala_id,
    'PENDENTE'
  )
  RETURNING id, protocolo INTO v_solicitacao_id, v_protocolo;

  INSERT INTO public.guarda_solicitacao_interacoes (
    solicitacao_id, autor_usuario_id, autor_tipo, mensagem, status_novo
  )
  VALUES (
    v_solicitacao_id, auth.uid(), 'GUARDA', 'Solicitação de esclarecimento aberta referente à escala: ' || v_escala.titulo, 'PENDENTE'
  );

  PERFORM public.registrar_guarda_escala_historico(
    p_escala_id, NULL, v_guarda_id, 'ESCLARECIMENTO_SOLICITADO',
    'Guarda abriu solicitação de esclarecimento (' || v_protocolo || ')'
  );

  RETURN jsonb_build_object(
    'sucesso', true,
    'mensagem', 'Solicitação de esclarecimento enviada com sucesso.',
    'solicitacao_id', v_solicitacao_id,
    'protocolo', v_protocolo
  );
END;
$$;

-- 10. RPC: Criar Solicitação Geral do Guarda
CREATE OR REPLACE FUNCTION public.criar_guarda_solicitacao(
  p_tipo text,
  p_assunto text,
  p_descricao text DEFAULT NULL,
  p_escala_id uuid DEFAULT NULL,
  p_anexos jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda_id uuid;
  v_solicitacao_id uuid;
  v_protocolo text;
BEGIN
  v_guarda_id := public.get_guarda_id_by_user(auth.uid());
  IF v_guarda_id IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Guarda não identificado.');
  END IF;

  INSERT INTO public.guarda_solicitacoes (
    guarda_id, tipo, assunto, descricao, escala_id, status
  )
  VALUES (
    v_guarda_id,
    trim(p_tipo),
    trim(p_assunto),
    nullif(trim(coalesce(p_descricao, '')), ''),
    p_escala_id,
    'PENDENTE'
  )
  RETURNING id, protocolo INTO v_solicitacao_id, v_protocolo;

  INSERT INTO public.guarda_solicitacao_interacoes (
    solicitacao_id, autor_usuario_id, autor_tipo, mensagem, anexos, status_novo
  )
  VALUES (
    v_solicitacao_id,
    auth.uid(),
    'GUARDA',
    coalesce(nullif(trim(p_descricao), ''), 'Solicitação criada pelo guarda.'),
    coalesce(p_anexos, '[]'::jsonb),
    'PENDENTE'
  );

  RETURN jsonb_build_object(
    'sucesso', true,
    'mensagem', 'Solicitação registrada com sucesso.',
    'solicitacao_id', v_solicitacao_id,
    'protocolo', v_protocolo
  );
END;
$$;

-- 11. RPC: Listar Minhas Solicitações
CREATE OR REPLACE FUNCTION public.listar_minhas_solicitacoes(
  p_status text DEFAULT NULL,
  p_tipo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda_id uuid;
  v_solicitacoes jsonb;
BEGIN
  v_guarda_id := public.get_guarda_id_by_user(auth.uid());
  IF v_guarda_id IS NULL AND NOT public.can_manage_guarda_escalas() THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'protocolo', s.protocolo,
        'guarda_id', s.guarda_id,
        'guarda_nome', gm.nome,
        'tipo', s.tipo,
        'assunto', s.assunto,
        'descricao', s.descricao,
        'escala_id', s.escala_id,
        'escala_titulo', ge.titulo,
        'status', s.status,
        'analisado_em', s.analisado_em,
        'created_at', s.created_at,
        'updated_at', s.updated_at
      ) ORDER BY s.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_solicitacoes
  FROM public.guarda_solicitacoes s
  JOIN public.guardas_municipais gm ON gm.id = s.guarda_id
  LEFT JOIN public.guarda_escalas ge ON ge.id = s.escala_id
  WHERE (v_guarda_id IS NULL OR s.guarda_id = v_guarda_id)
    AND (p_status IS NULL OR s.status = p_status)
    AND (p_tipo IS NULL OR s.tipo = p_tipo);

  RETURN v_solicitacoes;
END;
$$;

-- 12. RPC: Obter Detalhes da Solicitação com Linha do Tempo
CREATE OR REPLACE FUNCTION public.obter_detalhes_solicitacao(p_solicitacao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda_id uuid;
  v_solicitacao record;
  v_interacoes jsonb;
BEGIN
  v_guarda_id := public.get_guarda_id_by_user(auth.uid());

  SELECT s.*, gm.nome as guarda_nome, ge.titulo as escala_titulo
  INTO v_solicitacao
  FROM public.guarda_solicitacoes s
  JOIN public.guardas_municipais gm ON gm.id = s.guarda_id
  LEFT JOIN public.guarda_escalas ge ON ge.id = s.escala_id
  WHERE s.id = p_solicitacao_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Solicitação não encontrada.');
  END IF;

  IF v_guarda_id IS NOT NULL AND v_solicitacao.guarda_id <> v_guarda_id AND NOT public.can_manage_guarda_escalas() THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Sem permissão para visualizar esta solicitação.');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'autor_usuario_id', i.autor_usuario_id,
      'autor_tipo', i.autor_tipo,
      'mensagem', i.mensagem,
      'anexos', i.anexos,
      'status_anterior', i.status_anterior,
      'status_novo', i.status_novo,
      'created_at', i.created_at
    ) ORDER BY i.created_at ASC
  ) INTO v_interacoes
  FROM public.guarda_solicitacao_interacoes i
  WHERE i.solicitacao_id = p_solicitacao_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'solicitacao', jsonb_build_object(
      'id', v_solicitacao.id,
      'protocolo', v_solicitacao.protocolo,
      'guarda_id', v_solicitacao.guarda_id,
      'guarda_nome', v_solicitacao.guarda_nome,
      'tipo', v_solicitacao.tipo,
      'assunto', v_solicitacao.assunto,
      'descricao', v_solicitacao.descricao,
      'escala_id', v_solicitacao.escala_id,
      'escala_titulo', v_solicitacao.escala_titulo,
      'status', v_solicitacao.status,
      'resposta_gestao', v_solicitacao.resposta_gestao,
      'analisado_em', v_solicitacao.analisado_em,
      'created_at', v_solicitacao.created_at,
      'updated_at', v_solicitacao.updated_at
    ),
    'interacoes', coalesce(v_interacoes, '[]'::jsonb)
  );
END;
$$;

-- 13. RPC: Adicionar Interação na Solicitação
CREATE OR REPLACE FUNCTION public.adicionar_solicitacao_interacao(
  p_solicitacao_id uuid,
  p_mensagem text,
  p_anexos jsonb DEFAULT '[]'::jsonb,
  p_novo_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda_id uuid;
  v_solicitacao public.guarda_solicitacoes%ROWTYPE;
  v_autor_tipo text := 'GUARDA';
  v_status_anterior text;
BEGIN
  v_guarda_id := public.get_guarda_id_by_user(auth.uid());

  SELECT * INTO v_solicitacao FROM public.guarda_solicitacoes WHERE id = p_solicitacao_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Solicitação não encontrada.');
  END IF;

  v_status_anterior := v_solicitacao.status;

  IF public.can_manage_guarda_escalas() AND (v_guarda_id IS NULL OR v_solicitacao.guarda_id <> v_guarda_id) THEN
    v_autor_tipo := 'GESTAO';
  END IF;

  IF v_autor_tipo = 'GUARDA' AND v_solicitacao.guarda_id <> v_guarda_id THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Sem permissão.');
  END IF;

  IF v_solicitacao.status IN ('CONCLUIDA', 'CANCELADA', 'RECUSADA') THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Esta solicitação já foi encerrada.');
  END IF;

  IF p_novo_status IS NOT NULL AND p_novo_status <> v_solicitacao.status THEN
    UPDATE public.guarda_solicitacoes
    SET status = p_novo_status,
        analisado_por = CASE WHEN v_autor_tipo = 'GESTAO' THEN auth.uid() ELSE analisado_por END,
        analisado_em = CASE WHEN v_autor_tipo = 'GESTAO' THEN now() ELSE analisado_em END
    WHERE id = p_solicitacao_id;
  ELSIF v_autor_tipo = 'GUARDA' AND v_solicitacao.status = 'AGUARDANDO_INFORMACAO' THEN
    UPDATE public.guarda_solicitacoes SET status = 'EM_ANALISE' WHERE id = p_solicitacao_id;
  END IF;

  INSERT INTO public.guarda_solicitacao_interacoes (
    solicitacao_id, autor_usuario_id, autor_tipo, mensagem, anexos, status_anterior, status_novo
  )
  VALUES (
    p_solicitacao_id,
    auth.uid(),
    v_autor_tipo,
    trim(p_mensagem),
    coalesce(p_anexos, '[]'::jsonb),
    v_status_anterior,
    coalesce(p_novo_status, v_solicitacao.status)
  );

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Interação registrada.');
END;
$$;

-- 14. RPC: Cancelar Solicitação pelo Guarda
CREATE OR REPLACE FUNCTION public.cancelar_guarda_solicitacao(p_solicitacao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda_id uuid;
  v_solicitacao public.guarda_solicitacoes%ROWTYPE;
BEGIN
  v_guarda_id := public.get_guarda_id_by_user(auth.uid());

  SELECT * INTO v_solicitacao FROM public.guarda_solicitacoes WHERE id = p_solicitacao_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Solicitação não encontrada.');
  END IF;

  IF v_solicitacao.guarda_id <> v_guarda_id THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Sem permissão.');
  END IF;

  IF v_solicitacao.status IN ('CONCLUIDA', 'CANCELADA', 'RECUSADA') THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Esta solicitação já foi encerrada e não pode ser cancelada.');
  END IF;

  UPDATE public.guarda_solicitacoes SET status = 'CANCELADA' WHERE id = p_solicitacao_id;

  INSERT INTO public.guarda_solicitacao_interacoes (
    solicitacao_id, autor_usuario_id, autor_tipo, mensagem, status_anterior, status_novo
  )
  VALUES (
    p_solicitacao_id, auth.uid(), 'GUARDA', 'Solicitação cancelada pelo próprio guarda.', v_solicitacao.status, 'CANCELADA'
  );

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Solicitação cancelada.');
END;
$$;

-- 15. RLS Policies
ALTER TABLE public.guarda_escala_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_solicitacao_interacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver versoes escala" ON public.guarda_escala_versoes;
CREATE POLICY "Ver versoes escala" ON public.guarda_escala_versoes FOR SELECT TO authenticated USING (
  public.can_manage_guarda_escalas() OR EXISTS (
    SELECT 1 FROM public.guarda_escala_agentes gea WHERE gea.escala_id = guarda_escala_versoes.escala_id AND gea.guarda_id = public.get_guarda_id_by_user(auth.uid())
  )
);

DROP POLICY IF EXISTS "Gerenciar solicitacoes" ON public.guarda_solicitacoes;
CREATE POLICY "Gerenciar solicitacoes" ON public.guarda_solicitacoes FOR ALL TO authenticated USING (
  public.can_manage_guarda_escalas() OR guarda_id = public.get_guarda_id_by_user(auth.uid())
) WITH CHECK (
  public.can_manage_guarda_escalas() OR guarda_id = public.get_guarda_id_by_user(auth.uid())
);

DROP POLICY IF EXISTS "Gerenciar interacoes solicitacoes" ON public.guarda_solicitacao_interacoes;
CREATE POLICY "Gerenciar interacoes solicitacoes" ON public.guarda_solicitacao_interacoes FOR ALL TO authenticated USING (
  public.can_manage_guarda_escalas() OR EXISTS (
    SELECT 1 FROM public.guarda_solicitacoes s WHERE s.id = guarda_solicitacao_interacoes.solicitacao_id AND s.guarda_id = public.get_guarda_id_by_user(auth.uid())
  )
) WITH CHECK (
  public.can_manage_guarda_escalas() OR EXISTS (
    SELECT 1 FROM public.guarda_solicitacoes s WHERE s.id = guarda_solicitacao_interacoes.solicitacao_id AND s.guarda_id = public.get_guarda_id_by_user(auth.uid())
  )
);

GRANT EXECUTE ON FUNCTION public.confirmar_ciencia_guarda_escala(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_resumo_ciencias_gestor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.solicitar_esclarecimento_escala(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_guarda_solicitacao(text, text, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_minhas_solicitacoes(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_detalhes_solicitacao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adicionar_solicitacao_interacao(uuid, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_guarda_solicitacao(uuid) TO authenticated;
