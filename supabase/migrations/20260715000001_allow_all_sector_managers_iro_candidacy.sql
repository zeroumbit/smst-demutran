-- =====================================================
-- MIGRATION: Allow managers/gestores from other sectors with active functional graduacao to apply to IROs
-- =====================================================

CREATE OR REPLACE FUNCTION public.candidatar_se_iro(
  p_operacao_id uuid,
  p_usuario_id uuid,
  p_data date
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_disponivel integer;
  v_vagas_por_dia integer;
  v_horas_por_dia numeric;
  v_mes date;
  v_total_mes numeric;
  v_limite_mes numeric := 72;
  v_ja_candidatou boolean;
  v_operacao_existe boolean;
  v_elegivel_guarda boolean;
BEGIN
  IF p_usuario_id IS NULL OR p_usuario_id <> auth.uid() THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', 'A candidatura so pode ser realizada pelo proprio usuario autenticado.'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.guardas_usuarios gu
    JOIN public.guardas_municipais gm ON gm.id = gu.guarda_id
    WHERE gu.usuario_id = p_usuario_id
      AND gm.ativo = true
  ) OR EXISTS (
    SELECT 1
    FROM public.perfis_usuarios pu
    WHERE pu.user_id = p_usuario_id
      AND pu.ativo = true
      AND (
        -- Regras da Guarda Municipal (permanecem 100% inalteradas)
        (pu.setor_id = public.get_guarda_municipal_setor_id() AND pu.papel IN ('gestor', 'admin_setor', 'tecnico') AND pu.graduacao_id IS NOT NULL)
        OR
        -- Outros chefes de setores (gestor ou admin_setor de setores diferentes da Guarda) com graduacao
        (pu.setor_id <> public.get_guarda_municipal_setor_id() AND pu.papel IN ('gestor', 'admin_setor') AND pu.graduacao_id IS NOT NULL)
      )
  )
  INTO v_elegivel_guarda;

  IF NOT v_elegivel_guarda THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Apenas guardas municipais ativos, ou chefes de outros setores com graduacao funcional vinculada, podem se candidatar as operacoes.'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.iro_operacoes
    WHERE id = p_operacao_id
      AND ativo = true
      AND p_data BETWEEN data_inicio AND data_fim
  ) INTO v_operacao_existe;

  IF NOT v_operacao_existe THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Operacao nao encontrada, inativa ou data fora do periodo'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.iro_candidaturas
    WHERE operacao_id = p_operacao_id
      AND usuario_id = p_usuario_id
      AND data_operacao = p_data
      AND status IN ('confirmado', 'realizado')
  ) INTO v_ja_candidatou;

  IF v_ja_candidatou THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Voce ja esta cadastrado nesta operacao para esta data'
    );
  END IF;

  SELECT vagas_por_dia, horas_por_dia
  INTO v_vagas_por_dia, v_horas_por_dia
  FROM public.iro_operacoes
  WHERE id = p_operacao_id;

  v_disponivel := public.verificar_disponibilidade_iro(p_operacao_id, p_data);

  IF v_disponivel <= 0 THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Nao ha vagas disponiveis para esta data'
    );
  END IF;

  v_mes := date_trunc('month', p_data);

  SELECT coalesce(sum(horas_trabalhadas), 0)
  INTO v_total_mes
  FROM public.iro_candidaturas
  WHERE usuario_id = p_usuario_id
    AND date_trunc('month', data_operacao) = v_mes
    AND status IN ('confirmado', 'realizado');

  IF (v_total_mes + v_horas_por_dia) > v_limite_mes THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Limite mensal de 72h excedido. Voce ja possui ' || v_total_mes || 'h no mes'
    );
  END IF;

  INSERT INTO public.iro_candidaturas (
    operacao_id,
    usuario_id,
    data_operacao,
    horas_trabalhadas,
    status
  )
  VALUES (
    p_operacao_id,
    p_usuario_id,
    p_data,
    v_horas_por_dia,
    'confirmado'
  );

  IF (v_total_mes + v_horas_por_dia) >= (v_limite_mes * 0.8) THEN
    INSERT INTO public.iro_notificacoes (usuario_id, titulo, mensagem, tipo)
    VALUES (
      p_usuario_id,
      'Atencao: Limite de IRO',
      'Voce esta proximo de atingir o limite mensal de 72h. Total atual: ' ||
      round((v_total_mes + v_horas_por_dia)::numeric, 2) || 'h',
      'alerta'
    );
  END IF;

  RETURN jsonb_build_object(
    'sucesso', true,
    'mensagem', 'Candidatura realizada com sucesso!',
    'total_mes', round((v_total_mes + v_horas_por_dia)::numeric, 2)
  );
END;
$$;
