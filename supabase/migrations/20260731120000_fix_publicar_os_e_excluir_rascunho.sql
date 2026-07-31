-- Fix: publicar_ordem_servico referenciava user_id inexistente em guardas_municipais.
-- O vinculo guarda <-> auth.users vive em guardas_usuarios(guarda_id, usuario_id).
-- Alem disso, adiciona exclusao definitiva apenas para O.S. em RASCUNHO.

-- 1. Corrigir publicar_ordem_servico (notificacao aos responsaveis das equipes)
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
      SELECT usuario_id INTO v_user_resp FROM public.guardas_usuarios WHERE guarda_id = v_equipe_row.lider_id LIMIT 1;
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

-- 2. RPC: Excluir definitivamente O.S. que ainda está em RASCUNHO
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
  IF NOT public.can_manage_guarda_escalas() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas gestores podem excluir Ordens de Serviço.';
  END IF;

  SELECT * INTO v_os FROM public.guarda_ordens_servico WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de Serviço não encontrada.';
  END IF;

  IF v_os.status <> 'RASCUNHO' THEN
    RAISE EXCEPTION 'Apenas Ordens de Serviço em Rascunho podem ser excluídas. Ordens já publicadas devem ser canceladas.';
  END IF;

  DELETE FROM public.guarda_ordens_servico WHERE id = p_id;

  RETURN jsonb_build_object('sucesso', true, 'ordem_servico_id', p_id);
END;
$$;

REVOKE ALL ON FUNCTION public.excluir_rascunho_ordem_servico(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_rascunho_ordem_servico(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publicar_ordem_servico(uuid) TO authenticated;
