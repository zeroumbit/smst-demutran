-- Migration: Ajuste de numeração de Ordens de Serviço da Guarda Municipal (OS 002 -> 285)
-- Date: 2026-08-07 02:00:00

-- 1. Atualizar Ordem de Serviço Nº 002 (ou numero = 2) da Guarda Municipal de 2026 para 285
DO $$
DECLARE
  v_guarda_setor_id uuid;
BEGIN
  v_guarda_setor_id := public.get_guarda_municipal_setor_id();

  -- Atualizar registro principal na tabela guarda_ordens_servico
  UPDATE public.guarda_ordens_servico
  SET
    numero = 285,
    numero_formatado = 'O.S. Nº 285/2026',
    updated_at = now()
  WHERE setor_id = v_guarda_setor_id
    AND ano = 2026
    AND (numero = 2 OR numero_formatado LIKE '%002%' OR numero_formatado LIKE '% 02/%');

  -- Atualizar descrições no histórico de auditoria
  UPDATE public.guarda_ordens_servico_historico h
  SET descricao = replace(replace(h.descricao, '002/2026', '285/2026'), '02/2026', '285/2026')
  FROM public.guarda_ordens_servico os
  WHERE h.ordem_servico_id = os.id
    AND os.setor_id = v_guarda_setor_id
    AND os.numero = 285;

  -- Atualizar notificações vinculadas
  UPDATE public.admin_notifications
  SET
    titulo = replace(replace(titulo, '002/2026', '285/2026'), '02/2026', '285/2026'),
    mensagem = replace(replace(mensagem, '002/2026', '285/2026'), '02/2026', '285/2026')
  WHERE titulo LIKE '%002/2026%' OR titulo LIKE '%02/2026%'
     OR mensagem LIKE '%002/2026%' OR mensagem LIKE '%02/2026%';
END;
$$;

-- 2. Atualizar RPC publicar_ordem_servico com lpad 2 dígitos para suporte a 01/2027
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

  -- Formatação de 2 dígitos mínimos (ex: 01/2027), expandindo dinamicamente (ex: 285/2026, 286/2026)
  v_num_fmt := 'O.S. Nº ' || lpad(v_prox_num::text, 2, '0') || '/' || v_ano::text;

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

GRANT EXECUTE ON FUNCTION public.publicar_ordem_servico(uuid) TO authenticated;
