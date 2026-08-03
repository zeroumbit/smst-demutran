-- =====================================================
-- Migration: Permitir múltiplas IROs extras no mesmo dia
--
-- Remove das RPCs o bloqueio de conflito de data (mesmo dia)
-- na criação e edição de IRO extra, mantendo o limite mensal
-- de 72h e as demais validações.
-- =====================================================

-- === lancar_iro_extra_internal_20260717 ===
CREATE OR REPLACE FUNCTION public.lancar_iro_extra_internal_20260717(
  p_usuario_id uuid,
  p_quantidade_horas numeric,
  p_motivo text,
  p_operacao_id uuid DEFAULT NULL,
  p_operacao_nome text DEFAULT NULL,
  p_data_operacao date DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_operacao public.iro_operacoes%ROWTYPE;
  v_operacao_nome text;
  v_perfil_id uuid;
  v_guarda_nome text;
  v_guarda_graduacao_id uuid;
  v_guarda_graduacao_nome text;
  v_valor_hora numeric;
  v_horas_mes_existentes numeric := 0;
  v_horas_mes_total numeric := 0;
  v_limite_mes constant numeric := 72;
  v_candidatura_id uuid;
  v_data_ref date;
  v_mes_ref date;
  v_banco_resultado jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  IF p_motivo IS NULL OR char_length(trim(p_motivo)) < 10 THEN
    RAISE EXCEPTION 'Informe um motivo com no mínimo 10 caracteres.';
  END IF;

  IF p_quantidade_horas IS NULL OR p_quantidade_horas <= 0 THEN
    RAISE EXCEPTION 'Informe uma quantidade de horas válida.';
  END IF;

  IF p_operacao_id IS NOT NULL THEN
    SELECT *
    INTO v_operacao
    FROM public.iro_operacoes
    WHERE id = p_operacao_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Operação não encontrada.';
    END IF;

    IF NOT public.can_lancar_iro_manual(v_operacao.setor_id) THEN
      RAISE EXCEPTION 'Sem permissão para lançar IRO extra.';
    END IF;

    v_data_ref := v_operacao.data_inicio;
    v_operacao_nome := COALESCE(p_operacao_nome, v_operacao.nome);
  ELSE
    v_operacao_nome := p_operacao_nome;
    v_data_ref := COALESCE(p_data_operacao, CURRENT_DATE);
  END IF;

  SELECT pu.id
  INTO v_perfil_id
  FROM public.perfis_usuarios pu
  WHERE pu.user_id = auth.uid()
    AND pu.ativo = true
  ORDER BY pu.created_at DESC
  LIMIT 1;

  IF v_perfil_id IS NULL THEN
    RAISE EXCEPTION 'Perfil administrativo não encontrado para registrar a auditoria.';
  END IF;

  SELECT gm.nome, gm.graduacao_id, gmg.nome
  INTO v_guarda_nome, v_guarda_graduacao_id, v_guarda_graduacao_nome
  FROM public.guardas_usuarios gu
  JOIN public.guardas_municipais gm ON gm.id = gu.guarda_id
  JOIN public.guarda_municipal_graduacoes gmg ON gmg.id = gm.graduacao_id
  WHERE gu.usuario_id = p_usuario_id
    AND gm.ativo = true
  LIMIT 1;

  IF v_guarda_nome IS NULL OR v_guarda_graduacao_id IS NULL THEN
    RAISE EXCEPTION 'O guarda selecionado não está ativo ou não possui graduação vinculada.';
  END IF;

  SELECT ivg.valor_hora
  INTO v_valor_hora
  FROM public.iro_valores_graduacao ivg
  WHERE ivg.graduacao_id = v_guarda_graduacao_id
    AND ivg.ativo = true
  ORDER BY ivg.updated_at DESC
  LIMIT 1;

  IF v_valor_hora IS NULL THEN
    RAISE EXCEPTION 'A graduação atual do guarda não possui valor/hora configurado.';
  END IF;

  -- Verificar limite mensal de 72h
  v_mes_ref := date_trunc('month', v_data_ref)::date;

  SELECT coalesce(sum(c.horas_trabalhadas), 0)
  INTO v_horas_mes_existentes
  FROM public.iro_candidaturas c
  WHERE c.usuario_id = p_usuario_id
    AND c.status IN ('confirmado', 'realizado')
    AND date_trunc('month', c.data_operacao) = date_trunc('month', v_mes_ref);

  v_horas_mes_total := v_horas_mes_existentes + p_quantidade_horas;

  IF v_horas_mes_total > v_limite_mes THEN
    RAISE EXCEPTION '%',
      'Limite mensal de 72h excedido para ' ||
      to_char(v_mes_ref, 'MM/YYYY') ||
      '. Disponível: ' ||
      round(greatest(v_limite_mes - v_horas_mes_existentes, 0)::numeric, 2) ||
      'h.';
  END IF;

  -- Criar única candidatura com as horas manuais
  INSERT INTO public.iro_candidaturas (
    operacao_id,
    usuario_id,
    data_operacao,
    horas_trabalhadas,
    status,
    adicionado_manual,
    observacao,
    motivo_manual,
    gestor_responsavel_id,
    operacao_nome
  )
  VALUES (
    p_operacao_id,
    p_usuario_id,
    v_data_ref,
    p_quantidade_horas,
    'confirmado',
    true,
    'IRO extra lançada manualmente.',
    trim(p_motivo),
    v_perfil_id,
    v_operacao_nome
  )
  RETURNING id INTO v_candidatura_id;

  -- Registrar auditoria
  INSERT INTO public.iro_auditoria_manual (
    candidatura_id,
    gestor_id,
    guarda_id,
    operacao_id,
    motivo,
    horas_adicionadas,
    data_referencia,
    operacao_nome
  )
  VALUES (
    v_candidatura_id,
    v_perfil_id,
    p_usuario_id,
    p_operacao_id,
    trim(p_motivo),
    p_quantidade_horas,
    v_data_ref,
    v_operacao_nome
  );

  -- Notificar o guarda
  INSERT INTO public.iro_notificacoes (
    usuario_id,
    titulo,
    mensagem,
    tipo,
    link
  )
  VALUES (
    p_usuario_id,
    '📋 IRO Extra Adicionada',
    'O gestor adicionou ' || round(p_quantidade_horas::numeric, 2) || 'h de IRO extra' ||
      CASE WHEN v_operacao_nome IS NOT NULL THEN ' referente à "' || v_operacao_nome || '"' ELSE '' END ||
      '. Motivo: ' || trim(p_motivo),
    'manual',
    '/admin/perfil-guardas/guarda-municipal/iros/historico'
  );

  v_banco_resultado := public.recalcular_banco_horas_iro_total(p_usuario_id);

  RETURN jsonb_build_object(
    'sucesso', true,
    'operacao_id', p_operacao_id,
    'operacao_nome', v_operacao_nome,
    'guarda_nome', v_guarda_nome,
    'graduacao_nome', v_guarda_graduacao_nome,
    'horas_adicionadas', round(p_quantidade_horas::numeric, 2),
    'valor_hora', round(v_valor_hora::numeric, 2),
    'valor_total', round((p_quantidade_horas * v_valor_hora)::numeric, 2),
    'banco_horas', v_banco_resultado->>'banco_horas',
    'mensagem', 'IRO extra lançada com sucesso.'
  );
END;
$func$;

-- === editar_iro_extra ===
CREATE OR REPLACE FUNCTION public.editar_iro_extra(
  p_candidatura_id uuid,
  p_quantidade_horas numeric,
  p_motivo text,
  p_operacao_nome text DEFAULT NULL,
  p_data_operacao date DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_candidatura public.iro_candidaturas%ROWTYPE;
  v_perfil_id uuid;
  v_data_ref date;
  v_horas_mes_existentes numeric := 0;
  v_limite_mes constant numeric := 72;
  v_delta_horas numeric := 0;
  v_banco_resultado jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  IF NOT public.can_manage_iro_extra_guarda() THEN
    RAISE EXCEPTION 'Sem permissao para editar IRO extra.';
  END IF;

  IF p_quantidade_horas IS NULL OR p_quantidade_horas <= 0 THEN
    RAISE EXCEPTION 'Informe uma quantidade de horas valida.';
  END IF;

  IF p_motivo IS NULL OR char_length(trim(p_motivo)) < 10 THEN
    RAISE EXCEPTION 'Informe um motivo com no minimo 10 caracteres.';
  END IF;

  SELECT *
  INTO v_candidatura
  FROM public.iro_candidaturas
  WHERE id = p_candidatura_id
    AND adicionado_manual = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'IRO extra nao encontrada.';
  END IF;

  IF v_candidatura.status = 'cancelado' THEN
    RAISE EXCEPTION 'IRO extra cancelada nao pode ser editada.';
  END IF;

  v_data_ref := COALESCE(p_data_operacao, v_candidatura.data_operacao);

  SELECT coalesce(sum(c.horas_trabalhadas), 0)
  INTO v_horas_mes_existentes
  FROM public.iro_candidaturas c
  WHERE c.usuario_id = v_candidatura.usuario_id
    AND c.id <> v_candidatura.id
    AND c.status IN ('confirmado', 'realizado')
    AND date_trunc('month', c.data_operacao) = date_trunc('month', v_data_ref);

  IF v_horas_mes_existentes + p_quantidade_horas > v_limite_mes THEN
    RAISE EXCEPTION '%',
      'Limite mensal de 72h excedido para ' ||
      to_char(v_data_ref, 'MM/YYYY') ||
      '. Disponivel: ' ||
      round(greatest(v_limite_mes - v_horas_mes_existentes, 0)::numeric, 2) ||
      'h.';
  END IF;

  SELECT pu.id
  INTO v_perfil_id
  FROM public.perfis_usuarios pu
  WHERE pu.user_id = auth.uid()
    AND pu.ativo = true
  ORDER BY pu.created_at DESC
  LIMIT 1;

  IF v_perfil_id IS NULL THEN
    RAISE EXCEPTION 'Perfil administrativo nao encontrado para registrar a auditoria.';
  END IF;

  v_delta_horas := p_quantidade_horas - v_candidatura.horas_trabalhadas;

  PERFORM set_config('app.iro_manual_rpc', 'on', true);

  UPDATE public.iro_candidaturas
  SET
    data_operacao = v_data_ref,
    horas_trabalhadas = p_quantidade_horas,
    status = 'realizado',
    motivo_manual = trim(p_motivo),
    operacao_nome = NULLIF(trim(COALESCE(p_operacao_nome, '')), ''),
    observacao = 'IRO extra editada pela gestao da Guarda.',
    gestor_responsavel_id = v_perfil_id,
    updated_at = now()
  WHERE id = v_candidatura.id;

  INSERT INTO public.iro_auditoria_manual (
    candidatura_id,
    gestor_id,
    guarda_id,
    operacao_id,
    motivo,
    horas_adicionadas,
    data_referencia,
    operacao_nome
  )
  VALUES (
    v_candidatura.id,
    v_perfil_id,
    v_candidatura.usuario_id,
    v_candidatura.operacao_id,
    'Edicao de IRO extra. ' || trim(p_motivo),
    v_delta_horas,
    v_data_ref,
    NULLIF(trim(COALESCE(p_operacao_nome, v_candidatura.operacao_nome, '')), '')
  );

  INSERT INTO public.iro_notificacoes (
    usuario_id,
    titulo,
    mensagem,
    tipo,
    link
  )
  VALUES (
    v_candidatura.usuario_id,
    'IRO Extra Atualizada',
    'Sua IRO extra de ' || to_char(v_data_ref, 'DD/MM/YYYY') ||
      ' foi atualizada para ' || round(p_quantidade_horas::numeric, 2) ||
      'h. Motivo: ' || trim(p_motivo),
    'manual',
    '/admin/perfil-guardas/guarda-municipal/iros/historico'
  );

  v_banco_resultado := public.recalcular_banco_horas_iro_total(v_candidatura.usuario_id);

  RETURN jsonb_build_object(
    'sucesso', true,
    'candidatura_id', v_candidatura.id,
    'horas', round(p_quantidade_horas::numeric, 2),
    'banco_horas', v_banco_resultado->>'banco_horas',
    'mensagem', 'IRO extra editada com sucesso.'
  );
END;
$func$;