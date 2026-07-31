-- =====================================================
-- Migration: Ordens de Serviço multi-setor (Guarda Municipal + Demutran)
--
-- Permite que o setor DEMUTRAN crie e gerencie suas próprias Ordens de
-- Serviço seguindo o mesmo trâmite já estabelecido para a Guarda Municipal
-- (rascunho -> publicar -> substituir -> cancelar/arquivar), com escopo
-- separado por setor (coluna setor_id).
--
-- 1. Adiciona setor_id em guarda_ordens_servico (default Guarda Municipal).
-- 2. Função can_manage_ordens_servico(_setor_id) generalizada para ambos os setores.
-- 3. RPCs setor-aware: numeração sequencial por setor/ano, permissão por setor
--    e notificações direcionadas (guarda -> todos os guardas; demutran -> usuários do setor).
-- =====================================================

-- 1. Coluna setor_id na tabela principal
ALTER TABLE public.guarda_ordens_servico
  ADD COLUMN IF NOT EXISTS setor_id uuid;

UPDATE public.guarda_ordens_servico
SET setor_id = public.get_guarda_municipal_setor_id()
WHERE setor_id IS NULL;

ALTER TABLE public.guarda_ordens_servico
  ALTER COLUMN setor_id SET NOT NULL,
  ALTER COLUMN setor_id SET DEFAULT public.get_guarda_municipal_setor_id();

ALTER TABLE public.guarda_ordens_servico
  DROP CONSTRAINT IF EXISTS guarda_ordens_servico_setor_id_fkey;

ALTER TABLE public.guarda_ordens_servico
  ADD CONSTRAINT guarda_ordens_servico_setor_id_fkey
  FOREIGN KEY (setor_id) REFERENCES public.setores(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_guarda_os_setor_id ON public.guarda_ordens_servico(setor_id);

-- Constraint de número único por setor + ano + versão quando publicada
DROP INDEX IF EXISTS idx_guarda_os_numero_ano_versao;
CREATE UNIQUE INDEX IF NOT EXISTS idx_guarda_os_numero_ano_versao
  ON public.guarda_ordens_servico(setor_id, numero, ano, versao)
  WHERE numero IS NOT NULL;

-- 2. Função de permissão generalizada para Ordens de Serviço
CREATE OR REPLACE FUNCTION public.can_manage_ordens_servico(_setor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _setor_id IS NOT NULL AND (
    public.is_super_admin()
    OR public.is_admin_of_setor(_setor_id)
    OR (
      EXISTS (
        SELECT 1
        FROM public.perfis_usuarios pu
        WHERE pu.user_id = auth.uid()
          AND pu.setor_id = _setor_id
          AND pu.papel = 'tecnico'::public.papel_usuario
          AND pu.ativo = true
      )
      AND (
        _setor_id = public.get_demutran_setor_id()
        OR (
          _setor_id = public.get_guarda_municipal_setor_id()
          AND (
            coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'guarda_escalas'
            OR coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'guardas'
          )
        )
      )
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_ordens_servico(uuid) TO authenticated;

-- 3. RPC: Salvar Rascunho de Ordem de Serviço (setor-aware)
-- IMPORTANTE: a assinatura muda (ganha o p_setor_id no início). Para não deixar
-- overloads órfãos (que tornam os GRANTs ambíguos e quebram o CREATE OR REPLACE),
-- derrubamos TODOS os overloads de salvar_rascunho_ordem_servico e de
-- listar_ordens_servico antes de recriar com a assinatura nova.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('salvar_rascunho_ordem_servico', 'listar_ordens_servico')
  LOOP
    EXECUTE format('DROP FUNCTION public.%I(%s)', r.proname, r.args);
  END LOOP;
END;
$$;
CREATE OR REPLACE FUNCTION public.salvar_rascunho_ordem_servico(
  p_setor_id uuid DEFAULT NULL,
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
  v_setor_id uuid;
BEGIN
  v_user_id := auth.uid();
  v_setor_id := p_setor_id;

  IF v_setor_id IS NULL THEN
    SELECT pu.setor_id INTO v_setor_id
    FROM public.perfis_usuarios pu
    WHERE pu.user_id = v_user_id AND pu.ativo = true
    LIMIT 1;
  END IF;

  IF NOT public.can_manage_ordens_servico(v_setor_id) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas gestores podem criar ou editar Ordens de Serviço.';
  END IF;

  IF p_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.guarda_ordens_servico
      WHERE id = p_id AND status = 'RASCUNHO' AND setor_id = v_setor_id
    ) THEN
      RAISE EXCEPTION 'Rascunho não encontrado ou sem permissão para editá-lo.';
    END IF;

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
    WHERE id = p_id AND status = 'RASCUNHO' AND setor_id = v_setor_id;

    v_os_id := p_id;
  ELSE
    INSERT INTO public.guarda_ordens_servico (
      setor_id, origem, origem_outros, numero_documento_origem, assunto,
      data_execucao_inicio, data_execucao_fim, hora_inicio, hora_fim, ate_termino,
      descricao, local_execucao, ponto_apresentacao, observacoes,
      solicitante_nome, solicitante_orgao, solicitante_funcao,
      solicitante_telefone, solicitante_whatsapp, solicitante_email,
      status, criado_por
    ) VALUES (
      v_setor_id, p_origem, p_origem_outros, p_numero_documento_origem, p_assunto,
      p_data_execucao_inicio, p_data_execucao_fim, p_hora_inicio, p_hora_fim, p_ate_termino,
      p_descricao, p_local_execucao, p_ponto_apresentacao, p_observacoes,
      p_solicitante_nome, p_solicitante_orgao, p_solicitante_funcao,
      p_solicitante_telefone, p_solicitante_whatsapp, p_solicitante_email,
      'RASCUNHO', v_user_id
    ) RETURNING id INTO v_os_id;
  END IF;

  -- Atualizar equipes vinculadas (apenas Guarda Municipal possui equipes)
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

-- 4. RPC: Publicar Ordem de Serviço (setor-aware + notificações por setor)
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
  v_setor_id uuid;
BEGIN
  v_user_id := auth.uid();

  SELECT * INTO v_os FROM public.guarda_ordens_servico WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de Serviço não encontrada.';
  END IF;

  v_setor_id := v_os.setor_id;

  IF NOT public.can_manage_ordens_servico(v_setor_id) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas gestores podem publicar Ordens de Serviço.';
  END IF;

  IF v_os.status <> 'RASCUNHO' THEN
    RAISE EXCEPTION 'Apenas Ordens de Serviço em Rascunho podem ser publicadas.';
  END IF;

  v_ano := extract(year FROM CURRENT_DATE);

  -- Gerar número oficial sequencial por setor + ano
  SELECT coalesce(max(numero), 0) + 1 INTO v_prox_num
  FROM public.guarda_ordens_servico
  WHERE setor_id = v_setor_id AND ano = v_ano AND status <> 'RASCUNHO';

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

  -- Notificações direcionadas por setor
  IF v_setor_id = public.get_demutran_setor_id() THEN
    -- Demutran: notificar todos os usuários ativos do setor
    INSERT INTO public.admin_notifications (user_id, titulo, mensagem, tipo, link)
    SELECT pu.user_id,
      'Nova Ordem de Serviço ' || v_num_fmt,
      'Disponível O.S. ' || v_num_fmt || ' — ' || v_os.assunto || '. Execução em ' || to_char(v_os.data_execucao_inicio, 'DD/MM/YYYY') || '.',
      'info',
      '/admin/demutran/ordens-servico'
    FROM public.perfis_usuarios pu
    WHERE pu.setor_id = v_setor_id AND pu.ativo = true;
  ELSE
    -- Guarda Municipal: notificar todos os guardas vinculados a usuários
    INSERT INTO public.admin_notifications (user_id, titulo, mensagem, tipo, link)
    SELECT DISTINCT gu.usuario_id,
      'Nova Ordem de Serviço ' || v_num_fmt,
      'Disponível O.S. ' || v_num_fmt || ' — ' || v_os.assunto || '. Execução em ' || to_char(v_os.data_execucao_inicio, 'DD/MM/YYYY') || '.',
      'info',
      '/admin/perfil-guardas/guarda-municipal/ordens-servico'
    FROM public.guardas_usuarios gu;
  END IF;

  RETURN jsonb_build_object('sucesso', true, 'numero_formatado', v_num_fmt);
END;
$$;

-- 5. RPC: Substituir Ordem de Serviço (setor-aware + notificações por setor)
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
  v_setor_id uuid;
BEGIN
  v_user_id := auth.uid();

  SELECT * INTO v_antiga FROM public.guarda_ordens_servico WHERE id = p_ordem_antiga_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de Serviço original não encontrada.';
  END IF;

  v_setor_id := v_antiga.setor_id;

  IF NOT public.can_manage_ordens_servico(v_setor_id) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas gestores podem substituir Ordens de Serviço.';
  END IF;

  IF v_antiga.status <> 'PUBLICADA' THEN
    RAISE EXCEPTION 'Apenas Ordens de Serviço PUBLICADAS podem ser substituídas.';
  END IF;

  v_prox_versao := v_antiga.versao + 1;

  -- Criar nova versão (mesmo setor da antiga)
  INSERT INTO public.guarda_ordens_servico (
    setor_id, numero, ano, numero_formatado, versao, origem, origem_outros, numero_documento_origem,
    assunto, data_emissao, data_execucao_inicio, data_execucao_fim, hora_inicio, hora_fim, ate_termino,
    descricao, local_execucao, ponto_apresentacao, observacoes,
    solicitante_nome, solicitante_orgao, solicitante_funcao, solicitante_telefone, solicitante_whatsapp, solicitante_email,
    status, criado_por, publicado_por, publicado_em, ordem_substituida_id
  ) VALUES (
    v_setor_id, v_antiga.numero, v_antiga.ano, v_antiga.numero_formatado, v_prox_versao,
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

  -- Notificações direcionadas por setor
  IF v_setor_id = public.get_demutran_setor_id() THEN
    INSERT INTO public.admin_notifications (user_id, titulo, mensagem, tipo, link)
    SELECT pu.user_id,
      'Nova versão da Ordem de Serviço ' || v_antiga.numero_formatado,
      'Nova versão ' || v_prox_versao || ' da O.S. ' || v_antiga.numero_formatado || ' — ' || coalesce(p_assunto, v_antiga.assunto) || '.',
      'info',
      '/admin/demutran/ordens-servico'
    FROM public.perfis_usuarios pu
    WHERE pu.setor_id = v_setor_id AND pu.ativo = true;
  ELSE
    INSERT INTO public.admin_notifications (user_id, titulo, mensagem, tipo, link)
    SELECT DISTINCT gu.usuario_id,
      'Nova versão da Ordem de Serviço ' || v_antiga.numero_formatado,
      'Nova versão ' || v_prox_versao || ' da O.S. ' || v_antiga.numero_formatado || ' — ' || coalesce(p_assunto, v_antiga.assunto) || '.',
      'info',
      '/admin/perfil-guardas/guarda-municipal/ordens-servico'
    FROM public.guardas_usuarios gu;
  END IF;

  RETURN jsonb_build_object('sucesso', true, 'nova_ordem_id', v_nova_id, 'versao', v_prox_versao);
END;
$$;

-- 6. RPC: Cancelar Ordem de Serviço (setor-aware)
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
  v_setor_id uuid;
BEGIN
  v_user_id := auth.uid();

  SELECT numero_formatado, setor_id INTO v_num_fmt, v_setor_id
  FROM public.guarda_ordens_servico WHERE id = p_id;

  IF v_setor_id IS NULL THEN
    RAISE EXCEPTION 'Ordem de Serviço não encontrada.';
  END IF;

  IF NOT public.can_manage_ordens_servico(v_setor_id) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas gestores podem cancelar Ordens de Serviço.';
  END IF;

  IF coalesce(trim(p_motivo), '') = '' THEN
    RAISE EXCEPTION 'O motivo do cancelamento é obrigatório.';
  END IF;

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

-- 7. RPC: Arquivar Ordem de Serviço (setor-aware)
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
  v_setor_id uuid;
BEGIN
  v_user_id := auth.uid();

  SELECT setor_id INTO v_setor_id FROM public.guarda_ordens_servico WHERE id = p_id;

  IF v_setor_id IS NULL THEN
    RAISE EXCEPTION 'Ordem de Serviço não encontrada.';
  END IF;

  IF NOT public.can_manage_ordens_servico(v_setor_id) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas gestores podem arquivar Ordens de Serviço.';
  END IF;

  UPDATE public.guarda_ordens_servico SET status = 'ARQUIVADA', updated_at = now() WHERE id = p_id;

  INSERT INTO public.guarda_ordens_servico_historico (ordem_servico_id, usuario_id, acao, descricao)
  VALUES (p_id, v_user_id, 'ARQUIVADA', 'Ordem de Serviço arquivada.');

  RETURN jsonb_build_object('sucesso', true);
END;
$$;

-- 8. RPC: Excluir definitivamente O.S. em RASCUNHO (setor-aware)
CREATE OR REPLACE FUNCTION public.excluir_rascunho_ordem_servico(
  p_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_os public.guarda_ordens_servico%ROWTYPE;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  SELECT * INTO v_os FROM public.guarda_ordens_servico WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de Serviço não encontrada.';
  END IF;

  IF NOT public.can_manage_ordens_servico(v_os.setor_id) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas gestores podem excluir Ordens de Serviço.';
  END IF;

  IF v_os.status <> 'RASCUNHO' THEN
    RAISE EXCEPTION 'Apenas Ordens de Serviço em Rascunho podem ser excluídas. Ordens já publicadas devem ser canceladas.';
  END IF;

  DELETE FROM public.guarda_ordens_servico WHERE id = p_id;

  RETURN jsonb_build_object('sucesso', true, 'ordem_servico_id', p_id);
END;
$$;

-- 9. RPC: Registrar Acesso (Visualização, Download, Impressão)
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
  v_setor_id uuid;
BEGIN
  v_guarda_id := public.get_guarda_id_by_user(auth.uid());

  IF v_guarda_id IS NOT NULL THEN
    SELECT setor_id INTO v_setor_id FROM public.guarda_ordens_servico WHERE id = p_ordem_id;

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
      AND (e.responsavel_guarda_id = v_guarda_id OR public.can_manage_ordens_servico(v_setor_id));
  END IF;

  RETURN jsonb_build_object('sucesso', true);
END;
$$;

-- 10. RPC: Listar Ordens de Serviço (setor-aware)
-- Overloads antigos já foram removidos pelo DO block na seção 3.
CREATE OR REPLACE FUNCTION public.listar_ordens_servico(
  p_status text DEFAULT NULL,
  p_ano integer DEFAULT NULL,
  p_busca text DEFAULT NULL,
  p_setor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda_id uuid;
  v_is_gestor boolean;
  v_setor_id uuid;
  v_res jsonb;
BEGIN
  v_setor_id := p_setor_id;

  IF v_setor_id IS NULL THEN
    SELECT pu.setor_id INTO v_setor_id
    FROM public.perfis_usuarios pu
    WHERE pu.user_id = auth.uid() AND pu.ativo = true
    ORDER BY (pu.setor_id = public.get_guarda_municipal_setor_id()) DESC
    LIMIT 1;
  END IF;

  IF v_setor_id IS NULL THEN
    v_setor_id := public.get_guarda_municipal_setor_id();
  END IF;

  v_guarda_id := public.get_guarda_id_by_user(auth.uid());
  v_is_gestor := public.can_manage_ordens_servico(v_setor_id);

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', os.id,
        'setor_id', os.setor_id,
        'setor_slug', (SELECT s.slug FROM public.setores s WHERE s.id = os.setor_id),
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
  WHERE os.setor_id = v_setor_id
    AND (p_status IS NULL OR os.status = p_status)
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

-- 11. Grants
GRANT EXECUTE ON FUNCTION public.can_manage_ordens_servico(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_rascunho_ordem_servico(
  uuid, uuid, text, text, text, text, date, date, text, text, boolean,
  text, text, text, text, text, text, text, text, text, text, text, uuid[]
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publicar_ordem_servico(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.substituir_ordem_servico TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_ordem_servico TO authenticated;
GRANT EXECUTE ON FUNCTION public.arquivar_ordem_servico TO authenticated;
GRANT EXECUTE ON FUNCTION public.excluir_rascunho_ordem_servico(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_acesso_ordem_servico TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_ordens_servico(text, integer, text, uuid) TO authenticated;
