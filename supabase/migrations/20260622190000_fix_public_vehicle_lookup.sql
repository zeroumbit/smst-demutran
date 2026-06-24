-- =====================================================
-- MIGRATION: Fix public vehicle lookup by protocol + CPF
-- Ensures the public RPC works reliably for anon users.
-- =====================================================

CREATE OR REPLACE FUNCTION public.consultar_veiculo_recolhido_por_protocolo(
  _protocolo text,
  _cpf_cnpj text
)
RETURNS TABLE (
  protocolo text,
  placa text,
  descricao_veiculo text,
  local_custodia text,
  data_recolhimento timestamptz,
  dias_apreendido int,
  motivo text,
  taxa_diaria numeric,
  valor_estimado numeric,
  status text,
  situacao text,
  proprietario_nome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $$
DECLARE
  v_row public.veiculos_recolhidos%ROWTYPE;
  v_dias int := 0;
BEGIN
  IF trim(coalesce(_protocolo, '')) = '' OR trim(coalesce(_cpf_cnpj, '')) = '' THEN
    RETURN;
  END IF;

  SELECT *
  INTO v_row
  FROM public.veiculos_recolhidos vr
  WHERE upper(trim(vr.protocolo)) = upper(trim(_protocolo))
    AND regexp_replace(coalesce(vr.proprietario_cpf_cnpj, ''), '[^0-9]', '', 'g')
      = regexp_replace(coalesce(_cpf_cnpj, ''), '[^0-9]', '', 'g')
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN;
  END IF;

  v_dias := GREATEST(
    CEIL(
      EXTRACT(
        EPOCH FROM (
          COALESCE(v_row.data_liberacao, now()) - v_row.data_recolhimento
        )
      ) / 86400
    )::int,
    0
  );

  RETURN QUERY
  SELECT
    v_row.protocolo,
    v_row.placa,
    v_row.descricao_veiculo,
    v_row.local_custodia::text,
    v_row.data_recolhimento,
    v_dias,
    coalesce(v_row.motivo, 'Nao informado'),
    v_row.taxa_diaria,
    coalesce(v_row.taxa_diaria, 0) * v_dias,
    v_row.status,
    coalesce(v_row.situacao, 'Nao informado'),
    coalesce(v_row.proprietario_nome, 'Nao informado');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consultar_veiculo_recolhido_por_protocolo(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_veiculo_recolhido_por_protocolo(text, text) TO anon, authenticated;
