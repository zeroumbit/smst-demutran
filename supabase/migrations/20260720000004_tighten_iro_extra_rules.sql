-- Regras finais para IRO extra:
-- - extra manual sempre representa hora ja cumprida;
-- - editar/cancelar extra somente por gestor da Guarda ou administrativo da
--   Guarda com modulo iros;
-- - guarda visualiza suas extras, sem acao operacional sobre elas.

CREATE OR REPLACE FUNCTION public.can_manage_iro_extra_guarda()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.perfis_usuarios pu
      WHERE pu.user_id = auth.uid()
        AND pu.ativo = true
        AND pu.setor_id = public.get_guarda_municipal_setor_id()
        AND (
          pu.papel = 'gestor'::public.papel_usuario
          OR (
            pu.papel IN ('admin_setor'::public.papel_usuario, 'tecnico'::public.papel_usuario)
            AND coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'iros'
          )
        )
    );
$$;

SELECT set_config('app.iro_manual_rpc', 'on', true);

UPDATE public.iro_candidaturas
SET
  status = 'realizado',
  observacao = coalesce(observacao, 'IRO extra registrada como cumprida.'),
  updated_at = now()
WHERE adicionado_manual = true
  AND status IN ('pendente', 'confirmado');

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
AS $$
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

  IF EXISTS (
    SELECT 1
    FROM public.iro_candidaturas c
    WHERE c.usuario_id = v_candidatura.usuario_id
      AND c.id <> v_candidatura.id
      AND c.data_operacao = v_data_ref
      AND c.status IN ('confirmado', 'realizado')
  ) THEN
    RAISE EXCEPTION 'Ja existe IRO registrada para a data %.', to_char(v_data_ref, 'DD/MM/YYYY');
  END IF;

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
$$;

CREATE OR REPLACE FUNCTION public.cancelar_iro_extra(
  p_candidatura_id uuid,
  p_motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_candidatura public.iro_candidaturas%ROWTYPE;
  v_perfil_id uuid;
  v_motivo text;
  v_banco_resultado jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  IF NOT public.can_manage_iro_extra_guarda() THEN
    RAISE EXCEPTION 'Sem permissao para cancelar IRO extra.';
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
    RAISE EXCEPTION 'IRO extra ja esta cancelada.';
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

  v_motivo := COALESCE(NULLIF(trim(p_motivo), ''), 'Cancelamento de IRO extra pela gestao da Guarda.');

  PERFORM set_config('app.iro_manual_rpc', 'on', true);

  UPDATE public.iro_candidaturas
  SET
    status = 'cancelado',
    observacao = v_motivo,
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
    v_motivo,
    -v_candidatura.horas_trabalhadas,
    v_candidatura.data_operacao,
    v_candidatura.operacao_nome
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
    'IRO Extra Cancelada',
    'Sua IRO extra de ' || to_char(v_candidatura.data_operacao, 'DD/MM/YYYY') ||
      ' foi cancelada. Motivo: ' || v_motivo,
    'manual',
    '/admin/perfil-guardas/guarda-municipal/iros/historico'
  );

  v_banco_resultado := public.recalcular_banco_horas_iro_total(v_candidatura.usuario_id);

  RETURN jsonb_build_object(
    'sucesso', true,
    'candidatura_id', v_candidatura.id,
    'banco_horas', v_banco_resultado->>'banco_horas',
    'mensagem', 'IRO extra cancelada com sucesso.'
  );
END;
$$;

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
  v_result jsonb;
  v_data_ref date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  IF NOT public.can_manage_iro_extra_guarda() THEN
    RAISE EXCEPTION 'Sem permissao para lancar IRO extra.';
  END IF;

  IF p_operacao_id IS NOT NULL THEN
    SELECT o.data_inicio
    INTO v_data_ref
    FROM public.iro_operacoes o
    WHERE o.id = p_operacao_id;
  END IF;

  v_data_ref := COALESCE(v_data_ref, p_data_operacao, CURRENT_DATE);

  v_result := public.lancar_iro_extra_internal_20260717(
    p_usuario_id,
    p_quantidade_horas,
    p_motivo,
    p_operacao_id,
    p_operacao_nome,
    p_data_operacao
  );

  PERFORM set_config('app.iro_manual_rpc', 'on', true);

  UPDATE public.iro_candidaturas c
  SET
    status = 'realizado',
    observacao = coalesce(c.observacao, 'IRO extra registrada como cumprida.'),
    updated_at = now()
  WHERE c.usuario_id = p_usuario_id
    AND c.adicionado_manual = true
    AND c.status IN ('pendente', 'confirmado')
    AND c.data_operacao = v_data_ref
    AND c.horas_trabalhadas = p_quantidade_horas
    AND (
      (p_operacao_id IS NULL AND c.operacao_id IS NULL)
      OR c.operacao_id = p_operacao_id
    );

  RETURN v_result || jsonb_build_object('status', 'realizado');
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_iro_extra_guarda() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.editar_iro_extra(uuid, numeric, text, text, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancelar_iro_extra(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lancar_iro_extra(uuid, numeric, text, uuid, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_iro_extra_guarda() TO authenticated;
GRANT EXECUTE ON FUNCTION public.editar_iro_extra(uuid, numeric, text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_iro_extra(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lancar_iro_extra(uuid, numeric, text, uuid, text, date) TO authenticated;
