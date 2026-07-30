-- Migration: Módulo de Ordens de Serviço (O.S.) da Guarda Municipal
-- Date: 2026-07-30 16:00:00

-- 1. Criar Tabela Principal de Ordens de Serviço
CREATE TABLE IF NOT EXISTS public.guarda_ordens_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer,
  ano integer NOT NULL DEFAULT extract(year FROM CURRENT_DATE),
  numero_formatado text,
  versao integer NOT NULL DEFAULT 1,
  origem text NOT NULL DEFAULT 'Ofício',
  origem_outros text,
  numero_documento_origem text,
  assunto text NOT NULL,
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  data_execucao_inicio date NOT NULL,
  data_execucao_fim date,
  hora_inicio text NOT NULL,
  hora_fim text,
  ate_termino boolean NOT NULL DEFAULT false,
  descricao text NOT NULL,
  local_execucao text NOT NULL,
  ponto_apresentacao text,
  observacoes text,
  solicitante_nome text,
  solicitante_orgao text,
  solicitante_funcao text,
  solicitante_telefone text,
  solicitante_whatsapp text,
  solicitante_email text,
  status text NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO', 'PUBLICADA', 'SUBSTITUIDA', 'CANCELADA', 'ARQUIVADA')),
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  publicado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  publicado_em timestamptz,
  cancelado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cancelado_em timestamptz,
  motivo_cancelamento text,
  ordem_substituida_id uuid REFERENCES public.guarda_ordens_servico(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Constraint para garantir número + ano + versão únicos quando publicada
CREATE UNIQUE INDEX IF NOT EXISTS idx_guarda_os_numero_ano_versao
  ON public.guarda_ordens_servico(numero, ano, versao)
  WHERE numero IS NOT NULL;

-- Indexes para busca rápida
CREATE INDEX IF NOT EXISTS idx_guarda_os_status ON public.guarda_ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_guarda_os_ano ON public.guarda_ordens_servico(ano);

-- 2. Tabela de Distribuição para Equipes
CREATE TABLE IF NOT EXISTS public.guarda_ordens_servico_equipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id uuid NOT NULL REFERENCES public.guarda_ordens_servico(id) ON DELETE CASCADE,
  equipe_id uuid NOT NULL REFERENCES public.guarda_equipes(id) ON DELETE CASCADE,
  responsavel_equipe_id_no_momento uuid REFERENCES public.guardas_municipais(id) ON DELETE SET NULL,
  distribuida_em timestamptz NOT NULL DEFAULT now(),
  primeira_visualizacao_em timestamptz,
  ultima_visualizacao_em timestamptz,
  baixada_em timestamptz,
  impressa_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ordem_servico_id, equipe_id)
);

-- 3. Tabela de Histórico / Auditoria
CREATE TABLE IF NOT EXISTS public.guarda_ordens_servico_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id uuid NOT NULL REFERENCES public.guarda_ordens_servico(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acao text NOT NULL,
  descricao text NOT NULL,
  dados_anteriores jsonb,
  dados_novos jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.guarda_ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_ordens_servico_equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_ordens_servico_historico ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Access guarda_ordens_servico" ON public.guarda_ordens_servico;
CREATE POLICY "Access guarda_ordens_servico" ON public.guarda_ordens_servico
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Access guarda_ordens_servico_equipes" ON public.guarda_ordens_servico_equipes;
CREATE POLICY "Access guarda_ordens_servico_equipes" ON public.guarda_ordens_servico_equipes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Access guarda_ordens_servico_historico" ON public.guarda_ordens_servico_historico;
CREATE POLICY "Access guarda_ordens_servico_historico" ON public.guarda_ordens_servico_historico
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. RPC: Salvar Rascunho de Ordem de Serviço
CREATE OR REPLACE FUNCTION public.salvar_rascunho_ordem_servico(
  p_id uuid DEFAULT NULL,
  p_origem text DEFAULT 'Ofício',
  p_origem_outros text DEFAULT NULL,
  p_numero_documento_origem text DEFAULT NULL,
  p_assunto text DEFAULT '',
  p_data_execucao_inicio date DEFAULT CURRENT_DATE,
  p_data_execucao_fim date DEFAULT NULL,
  p_hora_inicio text DEFAULT '08:00',
  p_hora_fim text DEFAULT NULL,
  p_ate_termino boolean DEFAULT false,
  p_descricao text DEFAULT '',
  p_local_execucao text DEFAULT '',
  p_ponto_apresentacao text DEFAULT NULL,
  p_observacoes text DEFAULT NULL,
  p_solicitante_nome text DEFAULT NULL,
  p_solicitante_orgao text DEFAULT NULL,
  p_solicitante_funcao text DEFAULT NULL,
  p_solicitante_telefone text DEFAULT NULL,
  p_solicitante_whatsapp text DEFAULT NULL,
  p_solicitante_email text DEFAULT NULL,
  p_equipes_ids uuid[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_os_id uuid;
  v_equipe_id uuid;
  v_resp_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF NOT public.can_manage_guarda_escalas() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas gestores podem criar ou editar Ordens de Serviço.';
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE public.guarda_ordens_servico SET
      origem = p_origem,
      origem_outros = p_origem_outros,
      numero_documento_origem = p_numero_documento_origem,
      assunto = p_assunto,
      data_execucao_inicio = p_data_execucao_inicio,
      data_execucao_fim = p_data_execucao_fim,
      hora_inicio = p_hora_inicio,
      hora_fim = p_hora_fim,
      ate_termino = p_ate_termino,
      descricao = p_descricao,
      local_execucao = p_local_execucao,
      ponto_apresentacao = p_ponto_apresentacao,
      observacoes = p_observacoes,
      solicitante_nome = p_solicitante_nome,
      solicitante_orgao = p_solicitante_orgao,
      solicitante_funcao = p_solicitante_funcao,
      solicitante_telefone = p_solicitante_telefone,
      solicitante_whatsapp = p_solicitante_whatsapp,
      solicitante_email = p_solicitante_email,
      updated_at = now()
    WHERE id = p_id AND status = 'RASCUNHO';

    v_os_id := p_id;
  ELSE
    INSERT INTO public.guarda_ordens_servico (
      origem, origem_outros, numero_documento_origem, assunto,
      data_execucao_inicio, data_execucao_fim, hora_inicio, hora_fim, ate_termino,
      descricao, local_execucao, ponto_apresentacao, observacoes,
      solicitante_nome, solicitante_orgao, solicitante_funcao,
      solicitante_telefone, solicitante_whatsapp, solicitante_email,
      status, criado_por
    ) VALUES (
      p_origem, p_origem_outros, p_numero_documento_origem, p_assunto,
      p_data_execucao_inicio, p_data_execucao_fim, p_hora_inicio, p_hora_fim, p_ate_termino,
      p_descricao, p_local_execucao, p_ponto_apresentacao, p_observacoes,
      p_solicitante_nome, p_solicitante_orgao, p_solicitante_funcao,
      p_solicitante_telefone, p_solicitante_whatsapp, p_solicitante_email,
      'RASCUNHO', v_user_id
    ) RETURNING id INTO v_os_id;
  END IF;

  -- Atualizar equipes vinculadas
  DELETE FROM public.guarda_ordens_servico_equipes WHERE ordem_servico_id = v_os_id;

  IF array_length(p_equipes_ids, 1) > 0 THEN
    FOREACH v_equipe_id IN ARRAY p_equipes_ids LOOP
      SELECT responsavel_guarda_id INTO v_resp_id FROM public.guarda_equipes WHERE id = v_equipe_id;
      INSERT INTO public.guarda_ordens_servico_equipes (
        ordem_servico_id, equipe_id, responsavel_equipe_id_no_momento
      ) VALUES (
        v_os_id, v_equipe_id, v_resp_id
      ) ON CONFLICT (ordem_servico_id, equipe_id) DO NOTHING;
    END LOOP;
  END IF;

  -- Registrar histórico
  INSERT INTO public.guarda_ordens_servico_historico (ordem_servico_id, usuario_id, acao, descricao)
  VALUES (v_os_id, v_user_id, 'RASCUNHO_SALVO', 'Rascunho da Ordem de Serviço salvo com sucesso.');

  RETURN jsonb_build_object('sucesso', true, 'ordem_servico_id', v_os_id);
END;
$$;

-- 7. RPC: Publicar Ordem de Serviço
CREATE OR REPLACE FUNCTION public.publicar_ordem_servico(
  p_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_os public.guarda_ordens_servico%ROWTYPE;
  v_prox_num integer;
  v_num_fmt text;
  v_user_id uuid;
  v_ano integer;
  v_equipe_row RECORD;
  v_user_resp uuid;
BEGIN
  v_user_id := auth.uid();
  IF NOT public.can_manage_guarda_escalas() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas gestores podem publicar Ordens de Serviço.';
  END IF;

  SELECT * INTO v_os FROM public.guarda_ordens_servico WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de Serviço não encontrada.';
  END IF;

  IF v_os.status <> 'RASCUNHO' THEN
    RAISE EXCEPTION 'Apenas Ordens de Serviço em Rascunho podem ser publicadas.';
  END IF;

  v_ano := extract(year FROM CURRENT_DATE);

  -- Gerar número oficial sequencial para o ano atual
  SELECT coalesce(max(numero), 0) + 1 INTO v_prox_num
  FROM public.guarda_ordens_servico
  WHERE ano = v_ano AND status <> 'RASCUNHO';

  v_num_fmt := 'O.S. Nº ' || lpad(v_prox_num::text, 3, '0') || '/' || v_ano::text;

  UPDATE public.guarda_ordens_servico SET
    numero = v_prox_num,
    ano = v_ano,
    numero_formatado = v_num_fmt,
    status = 'PUBLICADA',
    publicado_por = v_user_id,
    publicado_em = now(),
    updated_at = now()
  WHERE id = p_id;

  -- Histórico
  INSERT INTO public.guarda_ordens_servico_historico (ordem_servico_id, usuario_id, acao, descricao)
  VALUES (p_id, v_user_id, 'PUBLICADA', 'Ordem de Serviço publicada com o número ' || v_num_fmt);

  -- Notificar responsáveis das equipes vinculadas
  FOR v_equipe_row IN
    SELECT q.equipe_id, e.nome AS equipe_nome, e.responsavel_guarda_id AS lider_id
    FROM public.guarda_ordens_servico_equipes q
    JOIN public.guarda_equipes e ON e.id = q.equipe_id
    WHERE q.ordem_servico_id = p_id
  LOOP
    IF v_equipe_row.lider_id IS NOT NULL THEN
      SELECT user_id INTO v_user_resp FROM public.guardas_municipais WHERE id = v_equipe_row.lider_id;
      IF v_user_resp IS NOT NULL THEN
        INSERT INTO public.admin_notifications (user_id, titulo, mensagem, tipo, link)
        VALUES (
          v_user_resp,
          'Nova Ordem de Serviço ' || v_num_fmt,
          'Disponível O.S. ' || v_num_fmt || ' — ' || v_os.assunto || '. Execução em ' || to_char(v_os.data_execucao_inicio, 'DD/MM/YYYY') || '.',
          'info',
          '/admin/perfil-guardas/guarda-municipal/ordens-servico'
        );
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('sucesso', true, 'numero_formatado', v_num_fmt);
END;
$$;

-- 8. RPC: Substituir Ordem de Serviço
CREATE OR REPLACE FUNCTION public.substituir_ordem_servico(
  p_ordem_antiga_id uuid,
  p_assunto text DEFAULT NULL,
  p_descricao text DEFAULT NULL,
  p_local_execucao text DEFAULT NULL,
  p_observacoes text DEFAULT NULL,
  p_equipes_ids uuid[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_antiga public.guarda_ordens_servico%ROWTYPE;
  v_nova_id uuid;
  v_prox_versao integer;
  v_user_id uuid;
  v_equipe_id uuid;
  v_resp_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF NOT public.can_manage_guarda_escalas() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas gestores podem substituir Ordens de Serviço.';
  END IF;

  SELECT * INTO v_antiga FROM public.guarda_ordens_servico WHERE id = p_ordem_antiga_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de Serviço original não encontrada.';
  END IF;

  IF v_antiga.status <> 'PUBLICADA' THEN
    RAISE EXCEPTION 'Apenas Ordens de Serviço PUBLICADAS podem ser substituídas.';
  END IF;

  v_prox_versao := v_antiga.versao + 1;

  -- Criar nova versão
  INSERT INTO public.guarda_ordens_servico (
    numero, ano, numero_formatado, versao, origem, origem_outros, numero_documento_origem,
    assunto, data_emissao, data_execucao_inicio, data_execucao_fim, hora_inicio, hora_fim, ate_termino,
    descricao, local_execucao, ponto_apresentacao, observacoes,
    solicitante_nome, solicitante_orgao, solicitante_funcao, solicitante_telefone, solicitante_whatsapp, solicitante_email,
    status, criado_por, publicado_por, publicado_em, ordem_substituida_id
  ) VALUES (
    v_antiga.numero, v_antiga.ano, v_antiga.numero_formatado, v_prox_versao,
    v_antiga.origem, v_antiga.origem_outros, v_antiga.numero_documento_origem,
    coalesce(p_assunto, v_antiga.assunto), CURRENT_DATE, v_antiga.data_execucao_inicio, v_antiga.data_execucao_fim,
    v_antiga.hora_inicio, v_antiga.hora_fim, v_antiga.ate_termino,
    coalesce(p_descricao, v_antiga.descricao), coalesce(p_local_execucao, v_antiga.local_execucao),
    v_antiga.ponto_apresentacao, coalesce(p_observacoes, v_antiga.observacoes),
    v_antiga.solicitante_nome, v_antiga.solicitante_orgao, v_antiga.solicitante_funcao,
    v_antiga.solicitante_telefone, v_antiga.solicitante_whatsapp, v_antiga.solicitante_email,
    'PUBLICADA', v_user_id, v_user_id, now(), p_ordem_antiga_id
  ) RETURNING id INTO v_nova_id;

  -- Marcar antiga como SUBSTITUIDA
  UPDATE public.guarda_ordens_servico SET status = 'SUBSTITUIDA', updated_at = now() WHERE id = p_ordem_antiga_id;

  -- Vincular equipes
  IF array_length(p_equipes_ids, 1) > 0 THEN
    FOREACH v_equipe_id IN ARRAY p_equipes_ids LOOP
      SELECT responsavel_guarda_id INTO v_resp_id FROM public.guarda_equipes WHERE id = v_equipe_id;
      INSERT INTO public.guarda_ordens_servico_equipes (ordem_servico_id, equipe_id, responsavel_equipe_id_no_momento)
      VALUES (v_nova_id, v_equipe_id, v_resp_id);
    END LOOP;
  ELSE
    -- Copiar equipes da antiga
    INSERT INTO public.guarda_ordens_servico_equipes (ordem_servico_id, equipe_id, responsavel_equipe_id_no_momento)
    SELECT v_nova_id, equipe_id, responsavel_equipe_id_no_momento
    FROM public.guarda_ordens_servico_equipes WHERE ordem_servico_id = p_ordem_antiga_id;
  END IF;

  -- Histórico
  INSERT INTO public.guarda_ordens_servico_historico (ordem_servico_id, usuario_id, acao, descricao)
  VALUES (v_nova_id, v_user_id, 'SUBSTITUIDA', 'Nova versão ' || v_prox_versao || ' gerada para a ' || v_antiga.numero_formatado);

  RETURN jsonb_build_object('sucesso', true, 'nova_ordem_id', v_nova_id, 'versao', v_prox_versao);
END;
$$;

-- 9. RPC: Cancelar Ordem de Serviço
CREATE OR REPLACE FUNCTION public.cancelar_ordem_servico(
  p_id uuid,
  p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_num_fmt text;
BEGIN
  v_user_id := auth.uid();
  IF NOT public.can_manage_guarda_escalas() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas gestores podem cancelar Ordens de Serviço.';
  END IF;

  IF coalesce(trim(p_motivo), '') = '' THEN
    RAISE EXCEPTION 'O motivo do cancelamento é obrigatório.';
  END IF;

  SELECT numero_formatado INTO v_num_fmt FROM public.guarda_ordens_servico WHERE id = p_id;

  UPDATE public.guarda_ordens_servico SET
    status = 'CANCELADA',
    cancelado_por = v_user_id,
    cancelado_em = now(),
    motivo_cancelamento = p_motivo,
    updated_at = now()
  WHERE id = p_id;

  INSERT INTO public.guarda_ordens_servico_historico (ordem_servico_id, usuario_id, acao, descricao)
  VALUES (p_id, v_user_id, 'CANCELADA', 'Ordem de Serviço cancelada. Motivo: ' || p_motivo);

  RETURN jsonb_build_object('sucesso', true);
END;
$$;

-- 10. RPC: Arquivar Ordem de Serviço
CREATE OR REPLACE FUNCTION public.arquivar_ordem_servico(
  p_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF NOT public.can_manage_guarda_escalas() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas gestores podem arquivar Ordens de Serviço.';
  END IF;

  UPDATE public.guarda_ordens_servico SET status = 'ARQUIVADA', updated_at = now() WHERE id = p_id;

  INSERT INTO public.guarda_ordens_servico_historico (ordem_servico_id, usuario_id, acao, descricao)
  VALUES (p_id, v_user_id, 'ARQUIVADA', 'Ordem de Serviço arquivada.');

  RETURN jsonb_build_object('sucesso', true);
END;
$$;

-- 11. RPC: Registrar Acesso (Visualização, Download, Impressão)
CREATE OR REPLACE FUNCTION public.registrar_acesso_ordem_servico(
  p_ordem_id uuid,
  p_acao text DEFAULT 'VISUALIZACAO' -- VISUALIZACAO, DOWNLOAD, IMPRESSAO
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda_id uuid;
  v_equipe_id uuid;
BEGIN
  v_guarda_id := public.get_guarda_id_by_user(auth.uid());

  IF v_guarda_id IS NOT NULL THEN
    -- Atualizar primeiro/último acesso na tabela equipes
    UPDATE public.guarda_ordens_servico_equipes q
    SET
      primeira_visualizacao_em = coalesce(q.primeira_visualizacao_em, now()),
      ultima_visualizacao_em = now(),
      baixada_em = CASE WHEN p_acao = 'DOWNLOAD' THEN now() ELSE q.baixada_em END,
      impressa_em = CASE WHEN p_acao = 'IMPRESSAO' THEN now() ELSE q.impressa_em END
    FROM public.guarda_equipes e
    WHERE q.ordem_servico_id = p_ordem_id
      AND q.equipe_id = e.id
      AND (e.responsavel_guarda_id = v_guarda_id OR public.can_manage_guarda_escalas());
  END IF;

  RETURN jsonb_build_object('sucesso', true);
END;
$$;

-- 12. RPC: Listar Ordens de Serviço
CREATE OR REPLACE FUNCTION public.listar_ordens_servico(
  p_status text DEFAULT NULL,
  p_ano integer DEFAULT NULL,
  p_busca text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda_id uuid;
  v_is_gestor boolean;
  v_res jsonb;
BEGIN
  v_guarda_id := public.get_guarda_id_by_user(auth.uid());
  v_is_gestor := public.can_manage_guarda_escalas();

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', os.id,
        'numero', os.numero,
        'ano', os.ano,
        'numero_formatado', os.numero_formatado,
        'versao', os.versao,
        'origem', os.origem,
        'origem_outros', os.origem_outros,
        'numero_documento_origem', os.numero_documento_origem,
        'assunto', os.assunto,
        'data_emissao', os.data_emissao,
        'data_execucao_inicio', os.data_execucao_inicio,
        'data_execucao_fim', os.data_execucao_fim,
        'hora_inicio', os.hora_inicio,
        'hora_fim', os.hora_fim,
        'ate_termino', os.ate_termino,
        'descricao', os.descricao,
        'local_execucao', os.local_execucao,
        'ponto_apresentacao', os.ponto_apresentacao,
        'observacoes', os.observacoes,
        'solicitante_nome', os.solicitante_nome,
        'solicitante_orgao', os.solicitante_orgao,
        'solicitante_funcao', os.solicitante_funcao,
        'solicitante_telefone', os.solicitante_telefone,
        'solicitante_whatsapp', os.solicitante_whatsapp,
        'solicitante_email', os.solicitante_email,
        'status', os.status,
        'publicado_em', os.publicado_em,
        'cancelado_em', os.cancelado_em,
        'motivo_cancelamento', os.motivo_cancelamento,
        'created_at', os.created_at,
        'equipes', (
          SELECT coalesce(
            jsonb_agg(
              jsonb_build_object(
                'equipe_id', q.equipe_id,
                'equipe_nome', e.nome,
                'lider_nome', gm.nome,
                'primeira_visualizacao_em', q.primeira_visualizacao_em,
                'ultima_visualizacao_em', q.ultima_visualizacao_em,
                'baixada_em', q.baixada_em,
                'impressa_em', q.impressa_em
              )
            ),
            '[]'::jsonb
          )
          FROM public.guarda_ordens_servico_equipes q
          JOIN public.guarda_equipes e ON e.id = q.equipe_id
          LEFT JOIN public.guardas_municipais gm ON gm.id = e.responsavel_guarda_id
          WHERE q.ordem_servico_id = os.id
        )
      ) ORDER BY os.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_res
  FROM public.guarda_ordens_servico os
  WHERE (p_status IS NULL OR os.status = p_status)
    AND (p_ano IS NULL OR os.ano = p_ano)
    AND (
      p_busca IS NULL
      OR os.assunto ILIKE '%' || p_busca || '%'
      OR os.numero_formatado ILIKE '%' || p_busca || '%'
      OR os.local_execucao ILIKE '%' || p_busca || '%'
      OR os.descricao ILIKE '%' || p_busca || '%'
    )
    AND (
      v_is_gestor = true
      OR (
        os.status <> 'RASCUNHO'
        AND EXISTS (
          SELECT 1
          FROM public.guarda_ordens_servico_equipes q
          JOIN public.guarda_equipes e ON e.id = q.equipe_id
          WHERE q.ordem_servico_id = os.id
            AND (e.responsavel_guarda_id = v_guarda_id OR EXISTS (
              SELECT 1 FROM public.guarda_equipe_membros m WHERE m.equipe_id = e.id AND m.guarda_id = v_guarda_id AND m.ativo = true
            ))
        )
      )
    );

  RETURN v_res;
END;
$$;

-- 13. Grants
GRANT EXECUTE ON FUNCTION public.salvar_rascunho_ordem_servico TO authenticated;
GRANT EXECUTE ON FUNCTION public.publicar_ordem_servico TO authenticated;
GRANT EXECUTE ON FUNCTION public.substituir_ordem_servico TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_ordem_servico TO authenticated;
GRANT EXECUTE ON FUNCTION public.arquivar_ordem_servico TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_acesso_ordem_servico TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_ordens_servico TO authenticated;
