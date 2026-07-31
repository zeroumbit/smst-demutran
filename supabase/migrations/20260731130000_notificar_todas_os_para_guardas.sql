-- Todas as novas Ordens de Serviço devem aparecer nas notificações de TODOS os
-- guardas vinculados a usuários (guardas_usuarios), e não apenas dos líderes
-- das equipes vinculadas.

-- 1. publicar_ordem_servico: notificar todos os guardas
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

  -- Notificar TODOS os guardas vinculados a usuários
  INSERT INTO public.admin_notifications (user_id, titulo, mensagem, tipo, link)
  SELECT DISTINCT gu.usuario_id,
    'Nova Ordem de Serviço ' || v_num_fmt,
    'Disponível O.S. ' || v_num_fmt || ' — ' || v_os.assunto || '. Execução em ' || to_char(v_os.data_execucao_inicio, 'DD/MM/YYYY') || '.',
    'info',
    '/admin/perfil-guardas/guarda-municipal/ordens-servico'
  FROM public.guardas_usuarios gu;

  RETURN jsonb_build_object('sucesso', true, 'numero_formatado', v_num_fmt);
END;
$$;

-- 2. substituir_ordem_servico: nova versão também notifica todos os guardas
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

  -- Notificar TODOS os guardas vinculados a usuários
  INSERT INTO public.admin_notifications (user_id, titulo, mensagem, tipo, link)
  SELECT DISTINCT gu.usuario_id,
    'Nova versão da Ordem de Serviço ' || v_antiga.numero_formatado,
    'Nova versão ' || v_prox_versao || ' da O.S. ' || v_antiga.numero_formatado || ' — ' || coalesce(p_assunto, v_antiga.assunto) || '.',
    'info',
    '/admin/perfil-guardas/guarda-municipal/ordens-servico'
  FROM public.guardas_usuarios gu;

  RETURN jsonb_build_object('sucesso', true, 'nova_ordem_id', v_nova_id, 'versao', v_prox_versao);
END;
$$;

GRANT EXECUTE ON FUNCTION public.publicar_ordem_servico(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.substituir_ordem_servico TO authenticated;
