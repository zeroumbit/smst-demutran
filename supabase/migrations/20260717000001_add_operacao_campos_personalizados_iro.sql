-- =====================================================
-- Migration: Add custom operation name/date fields for IRO Extras
--
-- IROs Extras agora podem ser lançadas sem vincular a uma
-- operação padrão. O gestor pode informar manualmente o
-- nome e a data da operação.
-- =====================================================

-- === iro_candidaturas ===
ALTER TABLE public.iro_candidaturas
  ALTER COLUMN operacao_id DROP NOT NULL;

ALTER TABLE public.iro_candidaturas
  ADD COLUMN IF NOT EXISTS operacao_nome text;

-- === iro_auditoria_manual ===
ALTER TABLE public.iro_auditoria_manual
  ALTER COLUMN operacao_id DROP NOT NULL;

ALTER TABLE public.iro_auditoria_manual
  ADD COLUMN IF NOT EXISTS operacao_nome text;

-- =====================================================
-- Recreate lancar_iro_extra with optional operation
-- =====================================================

DROP FUNCTION IF EXISTS public.lancar_iro_extra(uuid, uuid, numeric, text);
DROP FUNCTION IF EXISTS public.lancar_iro_extra(uuid, numeric, text, uuid, text, date);
DROP FUNCTION IF EXISTS public.lancar_iro_extra(uuid, uuid, numeric, text, text, date);

CREATE OR REPLACE FUNCTION public.lancar_iro_extra(
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
AS $$
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

  -- Verificar conflito na data de referência
  IF EXISTS (
    SELECT 1
    FROM public.iro_candidaturas c
    WHERE c.usuario_id = p_usuario_id
      AND c.data_operacao = v_data_ref
      AND c.status IN ('confirmado', 'realizado')
  ) THEN
    RAISE EXCEPTION 'Já existe IRO registrada para a data %.', to_char(v_data_ref, 'DD/MM/YYYY');
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
$$;

GRANT EXECUTE ON FUNCTION public.lancar_iro_extra(uuid, numeric, text, uuid, text, date) TO authenticated;
