-- =====================================================
-- MÓDULO IRO: lançamento manual de IROs extras
-- =====================================================

ALTER TABLE public.iro_candidaturas
  ADD COLUMN IF NOT EXISTS motivo_manual text,
  ADD COLUMN IF NOT EXISTS gestor_responsavel_id uuid REFERENCES public.perfis_usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_iro_candidaturas_manual
  ON public.iro_candidaturas (adicionado_manual, data_operacao);

CREATE INDEX IF NOT EXISTS idx_iro_candidaturas_gestor_manual
  ON public.iro_candidaturas (gestor_responsavel_id);

CREATE TABLE IF NOT EXISTS public.iro_auditoria_manual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id uuid NOT NULL REFERENCES public.iro_candidaturas(id) ON DELETE RESTRICT,
  gestor_id uuid NOT NULL REFERENCES public.perfis_usuarios(id) ON DELETE RESTRICT,
  guarda_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  operacao_id uuid NOT NULL REFERENCES public.iro_operacoes(id) ON DELETE RESTRICT,
  motivo text NOT NULL,
  horas_adicionadas numeric(5,2) NOT NULL,
  data_referencia date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iro_auditoria_manual_guarda_data
  ON public.iro_auditoria_manual (guarda_id, data_referencia DESC);

CREATE INDEX IF NOT EXISTS idx_iro_auditoria_manual_operacao
  ON public.iro_auditoria_manual (operacao_id);

CREATE INDEX IF NOT EXISTS idx_iro_auditoria_manual_gestor
  ON public.iro_auditoria_manual (gestor_id, created_at DESC);

ALTER TABLE public.iro_auditoria_manual ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_lancar_iro_manual(p_setor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_super_admin()
    OR public.is_admin_of_setor(p_setor_id)
    OR EXISTS (
      SELECT 1
      FROM public.perfis_usuarios pu
      WHERE pu.user_id = auth.uid()
        AND pu.ativo = true
        AND pu.papel = 'tecnico'::public.papel_usuario
        AND pu.setor_id = p_setor_id
        AND coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'iros'
    );
$$;

CREATE OR REPLACE FUNCTION public.recalcular_banco_horas_iro_total(p_usuario_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_banco numeric := 0;
BEGIN
  SELECT coalesce(sum(excedente_mes), 0)
  INTO v_total_banco
  FROM (
    SELECT greatest(sum(horas_mes) - 72, 0) AS excedente_mes
    FROM (
      SELECT
        date_trunc('month', c.data_operacao)::date AS mes_ref,
        coalesce(sum(c.horas_trabalhadas), 0) AS horas_mes
      FROM public.iro_candidaturas c
      WHERE c.usuario_id = p_usuario_id
        AND c.status IN ('confirmado', 'realizado')
      GROUP BY 1

      UNION ALL

      SELECT
        date_trunc('month', hm.data_referencia)::date AS mes_ref,
        coalesce(sum(hm.quantidade_horas), 0) AS horas_mes
      FROM public.iro_horas_manuais hm
      WHERE hm.usuario_id = p_usuario_id
      GROUP BY 1
    ) base
    GROUP BY mes_ref
  ) meses;

  IF EXISTS (
    SELECT 1
    FROM public.iro_banco_horas
    WHERE usuario_id = p_usuario_id
  ) THEN
    UPDATE public.iro_banco_horas
    SET
      horas_excedentes = v_total_banco,
      descricao = CASE
        WHEN v_total_banco > 0 THEN 'Banco de horas IRO recalculado automaticamente'
        ELSE 'Banco de horas IRO zerado automaticamente'
      END,
      updated_at = now()
    WHERE usuario_id = p_usuario_id;
  ELSIF v_total_banco > 0 THEN
    INSERT INTO public.iro_banco_horas (usuario_id, horas_excedentes, origem, descricao)
    VALUES (p_usuario_id, v_total_banco, 'automatico', 'Banco de horas IRO recalculado automaticamente');
  END IF;

  RETURN jsonb_build_object(
    'usuario_id', p_usuario_id,
    'banco_horas', round(v_total_banco::numeric, 2)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.lancar_iro_extra(
  p_operacao_id uuid,
  p_usuario_id uuid,
  p_data_inicio date,
  p_data_fim date,
  p_motivo text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_operacao public.iro_operacoes%ROWTYPE;
  v_perfil_id uuid;
  v_guarda_nome text;
  v_guarda_graduacao_id uuid;
  v_guarda_graduacao_nome text;
  v_valor_hora numeric;
  v_horas_mes_existentes numeric := 0;
  v_horas_mes_novas numeric := 0;
  v_horas_mes_total numeric := 0;
  v_horas_totais numeric := 0;
  v_dias_afetados integer := 0;
  v_limite_mes constant numeric := 72;
  v_datas_conflito text[];
  v_candidatura_id uuid;
  v_data date;
  v_mes_ref date;
  v_banco_resultado jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  IF p_motivo IS NULL OR char_length(trim(p_motivo)) < 10 THEN
    RAISE EXCEPTION 'Informe um motivo com no mínimo 10 caracteres.';
  END IF;

  IF p_data_inicio IS NULL OR p_data_fim IS NULL THEN
    RAISE EXCEPTION 'Informe o período do lançamento manual.';
  END IF;

  IF p_data_inicio > p_data_fim THEN
    RAISE EXCEPTION 'A data inicial não pode ser maior que a data final.';
  END IF;

  IF p_data_inicio > current_date OR p_data_fim > current_date THEN
    RAISE EXCEPTION 'Não é permitido lançar IROs para datas futuras.';
  END IF;

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

  IF p_data_inicio < v_operacao.data_inicio OR p_data_fim > v_operacao.data_fim THEN
    RAISE EXCEPTION 'O período informado precisa estar contido no período da operação.';
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

  SELECT array_agg(to_char(c.data_operacao, 'YYYY-MM-DD') ORDER BY c.data_operacao)
  INTO v_datas_conflito
  FROM public.iro_candidaturas c
  WHERE c.usuario_id = p_usuario_id
    AND c.data_operacao BETWEEN p_data_inicio AND p_data_fim
    AND c.status IN ('confirmado', 'realizado');

  IF v_datas_conflito IS NOT NULL THEN
    RAISE EXCEPTION 'Já existe IRO registrada para os dias: %.', array_to_string(v_datas_conflito, ', ');
  END IF;

  FOR v_mes_ref IN
    SELECT DISTINCT date_trunc('month', gs)::date
    FROM generate_series(p_data_inicio, p_data_fim, interval '1 day') AS gs
    ORDER BY 1
  LOOP
    SELECT coalesce(sum(c.horas_trabalhadas), 0)
    INTO v_horas_mes_existentes
    FROM public.iro_candidaturas c
    WHERE c.usuario_id = p_usuario_id
      AND c.status IN ('confirmado', 'realizado')
      AND date_trunc('month', c.data_operacao) = date_trunc('month', v_mes_ref);

    SELECT count(*) * v_operacao.horas_por_dia
    INTO v_horas_mes_novas
    FROM generate_series(
      greatest(p_data_inicio, v_mes_ref),
      least(p_data_fim, (v_mes_ref + interval '1 month - 1 day')::date),
      interval '1 day'
    ) AS mes_dias;

    v_horas_mes_total := v_horas_mes_existentes + v_horas_mes_novas;

    IF v_horas_mes_total > v_limite_mes THEN
      RAISE EXCEPTION '%',
        'Limite mensal de 72h excedido para ' ||
        to_char(v_mes_ref, 'MM/YYYY') ||
        '. Disponível: ' ||
        round(greatest(v_limite_mes - v_horas_mes_existentes, 0)::numeric, 2) ||
        'h.';
    END IF;
  END LOOP;

  FOR v_data IN
    SELECT gs::date
    FROM generate_series(p_data_inicio, p_data_fim, interval '1 day') AS gs
    ORDER BY 1
  LOOP
    INSERT INTO public.iro_candidaturas (
      operacao_id,
      usuario_id,
      data_operacao,
      horas_trabalhadas,
      status,
      adicionado_manual,
      observacao,
      motivo_manual,
      gestor_responsavel_id
    )
    VALUES (
      p_operacao_id,
      p_usuario_id,
      v_data,
      v_operacao.horas_por_dia,
      'confirmado',
      true,
      'IRO extra lançada manualmente.',
      trim(p_motivo),
      v_perfil_id
    )
    RETURNING id INTO v_candidatura_id;

    INSERT INTO public.iro_auditoria_manual (
      candidatura_id,
      gestor_id,
      guarda_id,
      operacao_id,
      motivo,
      horas_adicionadas,
      data_referencia
    )
    VALUES (
      v_candidatura_id,
      v_perfil_id,
      p_usuario_id,
      p_operacao_id,
      trim(p_motivo),
      v_operacao.horas_por_dia,
      v_data
    );

    v_dias_afetados := v_dias_afetados + 1;
    v_horas_totais := v_horas_totais + v_operacao.horas_por_dia;
  END LOOP;

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
    'O gestor adicionou ' || round(v_horas_totais::numeric, 2) || 'h de IRO referente à operação "' || v_operacao.nome ||
      '" para o período de ' || to_char(p_data_inicio, 'DD/MM/YYYY') || ' a ' || to_char(p_data_fim, 'DD/MM/YYYY') ||
      '. Motivo: ' || trim(p_motivo),
    'manual',
    '/admin/perfil-guardas/guarda-municipal/iros/historico'
  );

  v_banco_resultado := public.recalcular_banco_horas_iro_total(p_usuario_id);

  RETURN jsonb_build_object(
    'sucesso', true,
    'operacao_id', v_operacao.id,
    'operacao_nome', v_operacao.nome,
    'guarda_nome', v_guarda_nome,
    'graduacao_nome', v_guarda_graduacao_nome,
    'dias_afetados', v_dias_afetados,
    'horas_adicionadas', round(v_horas_totais::numeric, 2),
    'valor_hora', round(v_valor_hora::numeric, 2),
    'valor_total', round((v_horas_totais * v_valor_hora)::numeric, 2),
    'banco_horas', v_banco_resultado->>'banco_horas',
    'mensagem', 'IRO extra lançada com sucesso.'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.proteger_iro_manual()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.adicionado_manual AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'IRO manual não pode ser alterada ou removida por este perfil.';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_iro_manual_update ON public.iro_candidaturas;
CREATE TRIGGER trg_proteger_iro_manual_update
BEFORE UPDATE ON public.iro_candidaturas
FOR EACH ROW
WHEN (OLD.adicionado_manual IS TRUE)
EXECUTE FUNCTION public.proteger_iro_manual();

DROP TRIGGER IF EXISTS trg_proteger_iro_manual_delete ON public.iro_candidaturas;
CREATE TRIGGER trg_proteger_iro_manual_delete
BEFORE DELETE ON public.iro_candidaturas
FOR EACH ROW
WHEN (OLD.adicionado_manual IS TRUE)
EXECUTE FUNCTION public.proteger_iro_manual();

DROP POLICY IF EXISTS "Gestor can view iro_auditoria_manual" ON public.iro_auditoria_manual;
CREATE POLICY "Gestor can view iro_auditoria_manual"
ON public.iro_auditoria_manual
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.iro_operacoes o
    WHERE o.id = iro_auditoria_manual.operacao_id
      AND public.can_lancar_iro_manual(o.setor_id)
  )
);

DROP POLICY IF EXISTS "Gestor can insert iro_auditoria_manual" ON public.iro_auditoria_manual;
CREATE POLICY "Gestor can insert iro_auditoria_manual"
ON public.iro_auditoria_manual
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.iro_operacoes o
    WHERE o.id = iro_auditoria_manual.operacao_id
      AND public.can_lancar_iro_manual(o.setor_id)
  )
);

GRANT SELECT ON public.iro_auditoria_manual TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_lancar_iro_manual(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalcular_banco_horas_iro_total(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lancar_iro_extra(uuid, uuid, date, date, text) TO authenticated;
