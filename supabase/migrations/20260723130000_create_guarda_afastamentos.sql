-- Afastamentos funcionais dos guardas e bloqueio de candidatura em IRO.

CREATE TABLE IF NOT EXISTS public.guarda_afastamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guarda_id uuid NOT NULL REFERENCES public.guardas_municipais(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  observacao text,
  criado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT DEFAULT auth.uid(),
  cancelado_em timestamptz,
  cancelado_por uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guarda_afastamentos_tipo_check
    CHECK (tipo IN ('ferias', 'licenca_premio', 'outro')),
  CONSTRAINT guarda_afastamentos_periodo_check
    CHECK (data_fim >= data_inicio),
  CONSTRAINT guarda_afastamentos_outro_observacao_check
    CHECK (tipo <> 'outro' OR length(btrim(coalesce(observacao, ''))) >= 3),
  CONSTRAINT guarda_afastamentos_cancelamento_check
    CHECK (
      (cancelado_em IS NULL AND cancelado_por IS NULL)
      OR (cancelado_em IS NOT NULL AND cancelado_por IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS guarda_afastamentos_guarda_periodo_idx
  ON public.guarda_afastamentos (guarda_id, data_inicio, data_fim)
  WHERE cancelado_em IS NULL;

CREATE OR REPLACE FUNCTION public.can_manage_guarda_afastamentos()
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
          pu.papel IN (
            'gestor'::public.papel_usuario,
            'admin_setor'::public.papel_usuario
          )
          OR (
            pu.papel = 'tecnico'::public.papel_usuario
            AND coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb)
                ? 'guardas'
          )
        )
    );
$$;

REVOKE ALL ON FUNCTION public.can_manage_guarda_afastamentos()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_guarda_afastamentos()
  TO authenticated;

DROP TRIGGER IF EXISTS trigger_atualizar_guarda_afastamentos_updated_at
  ON public.guarda_afastamentos;
CREATE TRIGGER trigger_atualizar_guarda_afastamentos_updated_at
  BEFORE UPDATE ON public.guarda_afastamentos
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

ALTER TABLE public.guarda_afastamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Administracao da Guarda pode ver afastamentos"
  ON public.guarda_afastamentos;
CREATE POLICY "Administracao da Guarda pode ver afastamentos"
  ON public.guarda_afastamentos
  FOR SELECT
  TO authenticated
  USING (
    public.can_manage_guarda_afastamentos()
    OR EXISTS (
      SELECT 1
      FROM public.guardas_usuarios gu
      WHERE gu.guarda_id = guarda_afastamentos.guarda_id
        AND gu.usuario_id = auth.uid()
    )
  );

-- Escritas passam exclusivamente pelas RPCs abaixo.
REVOKE INSERT, UPDATE, DELETE ON public.guarda_afastamentos FROM authenticated;
GRANT SELECT ON public.guarda_afastamentos TO authenticated;

CREATE OR REPLACE FUNCTION public.criar_guarda_afastamento(
  p_guarda_id uuid,
  p_tipo text,
  p_data_inicio date,
  p_data_fim date,
  p_observacao text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.can_manage_guarda_afastamentos() THEN
    RAISE EXCEPTION 'Apenas o gestor ou administrativo da Guarda pode registrar afastamentos.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.guardas_municipais WHERE id = p_guarda_id
  ) THEN
    RAISE EXCEPTION 'Guarda municipal não encontrado.';
  END IF;

  IF p_tipo NOT IN ('ferias', 'licenca_premio', 'outro') THEN
    RAISE EXCEPTION 'Tipo de afastamento inválido.';
  END IF;

  IF p_data_inicio IS NULL OR p_data_fim IS NULL OR p_data_fim < p_data_inicio THEN
    RAISE EXCEPTION 'O período do afastamento é inválido.';
  END IF;

  IF p_tipo = 'outro' AND length(btrim(coalesce(p_observacao, ''))) < 3 THEN
    RAISE EXCEPTION 'Descreva o outro tipo de afastamento.';
  END IF;

  -- Serializa registros do mesmo guarda para impedir períodos concorrentes.
  PERFORM 1
  FROM public.guardas_municipais
  WHERE id = p_guarda_id
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM public.guarda_afastamentos ga
    WHERE ga.guarda_id = p_guarda_id
      AND ga.cancelado_em IS NULL
      AND daterange(ga.data_inicio, ga.data_fim, '[]')
          && daterange(p_data_inicio, p_data_fim, '[]')
  ) THEN
    RAISE EXCEPTION 'Já existe um afastamento ativo que coincide com esse período.';
  END IF;

  INSERT INTO public.guarda_afastamentos (
    guarda_id, tipo, data_inicio, data_fim, observacao, criado_por
  )
  VALUES (
    p_guarda_id,
    p_tipo,
    p_data_inicio,
    p_data_fim,
    nullif(btrim(coalesce(p_observacao, '')), ''),
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_guarda_afastamento(
  p_afastamento_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.can_manage_guarda_afastamentos() THEN
    RAISE EXCEPTION 'Apenas o gestor ou administrativo da Guarda pode cancelar afastamentos.';
  END IF;

  UPDATE public.guarda_afastamentos
  SET cancelado_em = now(),
      cancelado_por = auth.uid()
  WHERE id = p_afastamento_id
    AND cancelado_em IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Afastamento não encontrado ou já cancelado.';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_guarda_afastamento(uuid, text, date, date, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancelar_guarda_afastamento(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_guarda_afastamento(uuid, text, date, date, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_guarda_afastamento(uuid)
  TO authenticated;

-- Mantém as validações mais recentes da candidatura e acrescenta o afastamento.
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
  v_candidatura_existente record;
  v_operacao_existe boolean;
  v_elegivel_guarda boolean;
  v_afastamento record;
BEGIN
  IF p_usuario_id IS NULL OR p_usuario_id <> auth.uid() THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', 'A candidatura só pode ser realizada pelo próprio usuário autenticado.'
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
      AND pu.graduacao_id IS NOT NULL
      AND (
        (
          pu.setor_id = public.get_guarda_municipal_setor_id()
          AND pu.papel IN ('gestor', 'admin_setor', 'tecnico')
        )
        OR (
          pu.setor_id <> public.get_guarda_municipal_setor_id()
          AND pu.papel IN ('gestor', 'admin_setor')
        )
      )
  ) INTO v_elegivel_guarda;

  IF NOT v_elegivel_guarda THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Apenas guardas municipais ativos, ou chefes de outros setores com graduação funcional vinculada, podem se candidatar às operações.'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.iro_operacoes o
    JOIN public.iro_operacao_datas d ON d.operacao_id = o.id
    WHERE o.id = p_operacao_id
      AND o.ativo = true
      AND d.data = p_data
  ) INTO v_operacao_existe;

  IF NOT v_operacao_existe THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Operação não encontrada, inativa ou data não disponível para esta operação.'
    );
  END IF;

  SELECT ga.tipo, ga.data_inicio, ga.data_fim, ga.observacao
  INTO v_afastamento
  FROM public.guarda_afastamentos ga
  JOIN public.guardas_usuarios gu ON gu.guarda_id = ga.guarda_id
  WHERE gu.usuario_id = p_usuario_id
    AND ga.cancelado_em IS NULL
    AND p_data BETWEEN ga.data_inicio AND ga.data_fim
  ORDER BY ga.data_inicio DESC
  LIMIT 1;

  IF v_afastamento.tipo IS NOT NULL THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem',
      CASE v_afastamento.tipo
        WHEN 'ferias' THEN 'Candidatura não permitida: você está de férias nesta data.'
        WHEN 'licenca_premio' THEN 'Candidatura não permitida: você está de licença-prêmio nesta data.'
        ELSE 'Candidatura não permitida: você está em período de afastamento nesta data.'
      END,
      'motivo', v_afastamento.tipo,
      'data_inicio', v_afastamento.data_inicio,
      'data_fim', v_afastamento.data_fim
    );
  END IF;

  SELECT id, status
  INTO v_candidatura_existente
  FROM public.iro_candidaturas
  WHERE operacao_id = p_operacao_id
    AND usuario_id = p_usuario_id
    AND data_operacao = p_data
  LIMIT 1;

  IF v_candidatura_existente.id IS NOT NULL
     AND v_candidatura_existente.status IN ('pendente', 'confirmado', 'realizado') THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Você já está cadastrado nesta operação para esta data.'
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
      'mensagem', 'Não há vagas disponíveis para esta data.'
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
      'mensagem', 'Limite mensal de 72h excedido. Você já possui ' || v_total_mes || 'h no mês.'
    );
  END IF;

  IF v_candidatura_existente.id IS NOT NULL THEN
    UPDATE public.iro_candidaturas
    SET status = 'confirmado',
        horas_trabalhadas = v_horas_por_dia,
        observacao = NULL,
        updated_at = now()
    WHERE id = v_candidatura_existente.id;
  ELSE
    INSERT INTO public.iro_candidaturas (
      operacao_id, usuario_id, data_operacao, horas_trabalhadas, status
    )
    VALUES (
      p_operacao_id, p_usuario_id, p_data, v_horas_por_dia, 'confirmado'
    );
  END IF;

  IF (v_total_mes + v_horas_por_dia) >= (v_limite_mes * 0.8) THEN
    INSERT INTO public.iro_notificacoes (usuario_id, titulo, mensagem, tipo)
    VALUES (
      p_usuario_id,
      'Atenção: limite de IRO',
      'Você está próximo de atingir o limite mensal de 72h. Total atual: ' ||
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

REVOKE ALL ON FUNCTION public.candidatar_se_iro(uuid, uuid, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.candidatar_se_iro(uuid, uuid, date)
  TO authenticated;
