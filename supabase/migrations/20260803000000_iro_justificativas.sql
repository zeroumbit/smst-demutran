-- =====================================================
-- MÓDULO IRO: Justificativa de falta (não punição)
--
-- Cria a tabela iro_justificativas, adiciona o status
-- 'justificado' às candidaturas e a RPC justificar_falta_iro.
-- Guardas com justificativa registrada NÃO podem ser punidos,
-- mas as horas/valores da candidatura deixam de ser contabilizados
-- (o status sai de 'confirmado'/'realizado', que são os únicos
-- considerados em limites, banco de horas e relatórios).
-- =====================================================

-- === 1. Tabela de justificativas ===
CREATE TABLE IF NOT EXISTS public.iro_justificativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id uuid NOT NULL REFERENCES public.iro_candidaturas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operacao_id uuid REFERENCES public.iro_operacoes(id) ON DELETE SET NULL,
  justificativa text NOT NULL,
  tipo_documento text NOT NULL CHECK (tipo_documento IN ('atestado_medico', 'declaracao', 'outro')),
  numero_documento text,
  emissor_documento text,
  data_documento date,
  arquivo_url text,
  gestor_id uuid REFERENCES public.perfis_usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iro_justificativas_candidatura
  ON public.iro_justificativas (candidatura_id);

CREATE INDEX IF NOT EXISTS idx_iro_justificativas_usuario
  ON public.iro_justificativas (usuario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_iro_justificativas_operacao
  ON public.iro_justificativas (operacao_id);

ALTER TABLE public.iro_justificativas ENABLE ROW LEVEL SECURITY;

-- === 2. Novo status 'justificado' nas candidaturas ===
ALTER TABLE public.iro_candidaturas
  DROP CONSTRAINT IF EXISTS iro_candidaturas_status_check;

ALTER TABLE public.iro_candidaturas
  ADD CONSTRAINT iro_candidaturas_status_check
  CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'realizado', 'justificado'));

-- === 3. RPC justificar_falta_iro ===
CREATE OR REPLACE FUNCTION public.justificar_falta_iro(
  p_candidatura_id uuid,
  p_justificativa text,
  p_tipo_documento text DEFAULT 'outro',
  p_numero_documento text DEFAULT NULL,
  p_emissor_documento text DEFAULT NULL,
  p_data_documento date DEFAULT NULL,
  p_arquivo_url text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_candidatura public.iro_candidaturas%ROWTYPE;
  v_perfil_id uuid;
  v_guarda_nome text;
  v_operacao_nome text;
  v_valor_hora numeric;
  v_banco_resultado jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  IF NOT public.can_manage_iro_extra_guarda() THEN
    RAISE EXCEPTION 'Sem permissão para registrar justificativa de falta.';
  END IF;

  IF p_justificativa IS NULL OR char_length(trim(p_justificativa)) < 10 THEN
    RAISE EXCEPTION 'Descreva o motivo da justificativa com no mínimo 10 caracteres.';
  END IF;

  SELECT *
  INTO v_candidatura
  FROM public.iro_candidaturas
  WHERE id = p_candidatura_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidatura não encontrada.';
  END IF;

  IF v_candidatura.status IN ('cancelado', 'justificado') THEN
    RAISE EXCEPTION 'Esta candidatura já foi cancelada ou justificada.';
  END IF;

  SELECT pu.id
  INTO v_perfil_id
  FROM public.perfis_usuarios pu
  WHERE pu.user_id = auth.uid()
    AND pu.ativo = true
  ORDER BY pu.created_at DESC
  LIMIT 1;

  SELECT gm.nome
  INTO v_guarda_nome
  FROM public.guardas_usuarios gu
  JOIN public.guardas_municipais gm ON gm.id = gu.guarda_id
  WHERE gu.usuario_id = v_candidatura.usuario_id
    AND gm.ativo = true
  LIMIT 1;

  SELECT o.nome
  INTO v_operacao_nome
  FROM public.iro_operacoes o
  WHERE o.id = v_candidatura.operacao_id;

  SELECT ivg.valor_hora
  INTO v_valor_hora
  FROM public.guardas_usuarios gu
  JOIN public.guardas_municipais gm ON gm.id = gu.guarda_id
  JOIN public.iro_valores_graduacao ivg ON ivg.graduacao_id = gm.graduacao_id
    AND ivg.ativo = true
  WHERE gu.usuario_id = v_candidatura.usuario_id
  ORDER BY ivg.updated_at DESC
  LIMIT 1;

  INSERT INTO public.iro_justificativas (
    candidatura_id,
    usuario_id,
    operacao_id,
    justificativa,
    tipo_documento,
    numero_documento,
    emissor_documento,
    data_documento,
    arquivo_url,
    gestor_id
  )
  VALUES (
    v_candidatura.id,
    v_candidatura.usuario_id,
    v_candidatura.operacao_id,
    trim(p_justificativa),
    p_tipo_documento,
    NULLIF(trim(coalesce(p_numero_documento, '')), ''),
    NULLIF(trim(coalesce(p_emissor_documento, '')), ''),
    p_data_documento,
    NULLIF(trim(coalesce(p_arquivo_url, '')), ''),
    v_perfil_id
  );

  UPDATE public.iro_candidaturas
  SET
    status = 'justificado',
    observacao = 'Falta justificada: ' || trim(p_justificativa),
    updated_at = now()
  WHERE id = v_candidatura.id;

  INSERT INTO public.iro_notificacoes (
    usuario_id,
    titulo,
    mensagem,
    tipo,
    link
  )
  VALUES (
    v_candidatura.usuario_id,
    '🛡️ Falta Justificada',
    'A sua falta na operação "' || coalesce(v_operacao_nome, v_candidatura.operacao_nome, 'IRO') ||
      '" do dia ' || to_char(v_candidatura.data_operacao, 'DD/MM/YYYY') ||
      ' foi justificada. Você NÃO será punido, porém as horas (' || round(v_candidatura.horas_trabalhadas::numeric, 2) || 'h) e os valores desta operação não serão recebidos.',
    'info',
    '/admin/perfil-guardas/guarda-municipal/iros/historico'
  );

  v_banco_resultado := public.recalcular_banco_horas_iro_total(v_candidatura.usuario_id);

  RETURN jsonb_build_object(
    'sucesso', true,
    'candidatura_id', v_candidatura.id,
    'guarda_nome', v_guarda_nome,
    'operacao_nome', v_operacao_nome,
    'horas_removidas', round(v_candidatura.horas_trabalhadas::numeric, 2),
    'valor_removido', round((coalesce(v_valor_hora, 0) * v_candidatura.horas_trabalhadas)::numeric, 2),
    'banco_horas', v_banco_resultado->>'banco_horas',
    'mensagem', 'Justificativa registrada. O guarda não será punido, mas não receberá as horas e os valores desta operação.'
  );
END;
$$;

-- === 4. RLS da tabela de justificativas ===
DROP POLICY IF EXISTS "Gestor can view iro_justificativas" ON public.iro_justificativas;
CREATE POLICY "Gestor can view iro_justificativas"
ON public.iro_justificativas
FOR SELECT
TO authenticated
USING (
  public.can_manage_iro_extra_guarda()
  OR usuario_id = auth.uid()
);

DROP POLICY IF EXISTS "Gestor can insert iro_justificativas" ON public.iro_justificativas;
CREATE POLICY "Gestor can insert iro_justificativas"
ON public.iro_justificativas
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_iro_extra_guarda()
);

-- === 5. Grants ===
GRANT SELECT ON public.iro_justificativas TO authenticated;
GRANT EXECUTE ON FUNCTION public.justificar_falta_iro(uuid, text, text, text, text, date, text) TO authenticated;
