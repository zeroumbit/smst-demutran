-- =====================================================
-- MIGRATION: Protocolo para veiculos_recolhidos
-- + consulta publica segura (protocolo + CPF)
-- =====================================================

-- =====================================================
-- 1. ADD protocolo COLUMN
-- =====================================================

ALTER TABLE public.veiculos_recolhidos
  ADD COLUMN IF NOT EXISTS protocolo text NOT NULL
    DEFAULT public.generate_demutran_protocol('APR');

CREATE UNIQUE INDEX IF NOT EXISTS veiculos_recolhidos_protocolo_unq
  ON public.veiculos_recolhidos (protocolo);

-- Backfill existing records with a protocol
UPDATE public.veiculos_recolhidos
SET protocolo = public.generate_demutran_protocol('APR')
WHERE protocolo IS NULL OR protocolo = '';

-- =====================================================
-- 2. RPC: CONSULTAR VEICULO POR PROTOCOLO + CPF
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
AS $$
DECLARE
  v_row public.veiculos_recolhidos%ROWTYPE;
  v_dias int;
  v_valor numeric;
BEGIN
  SELECT * INTO v_row
  FROM public.veiculos_recolhidos
  WHERE upper(protocolo) = upper(trim(_protocolo))
    AND regexp_replace(coalesce(proprietario_cpf_cnpj, ''), '[^0-9]', '', 'g')
      = regexp_replace(trim(_cpf_cnpj), '[^0-9]', '', 'g');

  IF v_row.id IS NULL THEN
    RETURN;
  END IF;

  v_dias := CASE
    WHEN v_row.status = 'liberado' THEN
      EXTRACT(DAY FROM (v_row.data_liberacao - v_row.data_recolhimento))::int
    ELSE
      EXTRACT(DAY FROM (now() - v_row.data_recolhimento))::int
  END;

  v_valor := CASE
    WHEN v_row.status = 'recolhido' THEN v_dias * coalesce(v_row.taxa_diaria, 0)
    ELSE v_dias * coalesce(v_row.taxa_diaria, 0)
  END;

  RETURN QUERY
  SELECT
    v_row.protocolo,
    v_row.placa,
    v_row.descricao_veiculo,
    v_row.local_custodia::text,
    v_row.data_recolhimento,
    v_dias,
    v_row.motivo,
    v_row.taxa_diaria,
    v_valor,
    v_row.status,
    v_row.situacao,
    v_row.proprietario_nome;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consultar_veiculo_recolhido_por_protocolo(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_veiculo_recolhido_por_protocolo(text, text) TO anon, authenticated;

-- =====================================================
-- 3. RPC: RECOLHER VEICULO (insert + return protocolo)
-- =====================================================

CREATE OR REPLACE FUNCTION public.recolher_veiculo(
  _placa text,
  _proprietario_nome text,
  _proprietario_cpf_cnpj text DEFAULT NULL,
  _chassi text DEFAULT NULL,
  _descricao_veiculo text DEFAULT 'Nao informado',
  _data_recolhimento timestamptz DEFAULT now(),
  _motivo text DEFAULT NULL,
  _situacao text DEFAULT 'Apreendido',
  _local_custodia public.demutran_local_custodia DEFAULT 'automoveis',
  _observacao text DEFAULT NULL
)
RETURNS TABLE (id uuid, protocolo text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.veiculos_recolhidos%ROWTYPE;
BEGIN
  INSERT INTO public.veiculos_recolhidos (
    setor_id, placa, chassi, descricao_veiculo,
    proprietario_nome, proprietario_cpf_cnpj,
    data_recolhimento, motivo, status, situacao,
    local_custodia, observacao
  )
  VALUES (
    public.get_demutran_setor_id(),
    upper(regexp_replace(trim(_placa), '[^A-Z0-9]', '', 'g')),
    NULLIF(upper(trim(_chassi)), ''),
    trim(_descricao_veiculo),
    trim(_proprietario_nome),
    NULLIF(regexp_replace(trim(_proprietario_cpf_cnpj), '[^0-9]', '', 'g'), ''),
    _data_recolhimento,
    trim(_motivo),
    'recolhido',
    trim(_situacao),
    _local_custodia,
    NULLIF(trim(_observacao), '')
  )
  RETURNING * INTO v_row;

  RETURN QUERY SELECT v_row.id, v_row.protocolo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recolher_veiculo(
  text, text, text, text, text, timestamptz, text, text, public.demutran_local_custodia, text
) TO authenticated;
