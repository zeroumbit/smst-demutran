CREATE OR REPLACE FUNCTION public.listar_iro_datas_disponiveis(
  p_usuario_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  operacao_id uuid,
  data date,
  vagas_disponiveis integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH ocupacao AS (
    SELECT
      c.operacao_id,
      c.data_operacao,
      count(*)::integer AS ocupadas
    FROM public.iro_candidaturas c
    WHERE c.status IN ('pendente', 'confirmado', 'realizado')
    GROUP BY c.operacao_id, c.data_operacao
  )
  SELECT
    o.id AS operacao_id,
    d.data,
    greatest(o.vagas_por_dia - coalesce(oc.ocupadas, 0), 0)::integer AS vagas_disponiveis
  FROM public.iro_operacoes o
  JOIN public.iro_operacao_datas d ON d.operacao_id = o.id
  LEFT JOIN ocupacao oc ON oc.operacao_id = o.id AND oc.data_operacao = d.data
  WHERE auth.uid() IS NOT NULL
    AND coalesce(p_usuario_id, auth.uid()) = auth.uid()
    AND o.ativo = true
    AND o.data_fim >= current_date
    AND d.data >= current_date
    AND NOT EXISTS (
      SELECT 1
      FROM public.iro_candidaturas propria
      WHERE propria.operacao_id = o.id
        AND propria.data_operacao = d.data
        AND propria.usuario_id = coalesce(p_usuario_id, auth.uid())
        AND propria.status IN ('pendente', 'confirmado', 'realizado')
    )
    AND greatest(o.vagas_por_dia - coalesce(oc.ocupadas, 0), 0) > 0
  ORDER BY d.data;
$$;

GRANT EXECUTE ON FUNCTION public.listar_iro_datas_disponiveis(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.listar_iro_disponibilidade_dias_admin()
RETURNS TABLE (
  operacao_id uuid,
  data date,
  vagas_total integer,
  vagas_ocupadas integer,
  vagas_disponiveis integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH ocupacao AS (
    SELECT
      c.operacao_id,
      c.data_operacao,
      count(*)::integer AS ocupadas
    FROM public.iro_candidaturas c
    WHERE c.status IN ('pendente', 'confirmado', 'realizado')
    GROUP BY c.operacao_id, c.data_operacao
  )
  SELECT
    o.id AS operacao_id,
    d.data,
    o.vagas_por_dia::integer AS vagas_total,
    coalesce(oc.ocupadas, 0)::integer AS vagas_ocupadas,
    greatest(o.vagas_por_dia - coalesce(oc.ocupadas, 0), 0)::integer AS vagas_disponiveis
  FROM public.iro_operacoes o
  JOIN public.iro_operacao_datas d ON d.operacao_id = o.id
  LEFT JOIN ocupacao oc ON oc.operacao_id = o.id AND oc.data_operacao = d.data
  WHERE auth.uid() IS NOT NULL
    AND public.can_manage_iro_extra_guarda()
    AND o.ativo = true
    AND o.data_fim >= current_date
    AND d.data >= current_date
  ORDER BY d.data, o.horario_previsto, o.nome;
$$;

GRANT EXECUTE ON FUNCTION public.listar_iro_disponibilidade_dias_admin() TO authenticated;
