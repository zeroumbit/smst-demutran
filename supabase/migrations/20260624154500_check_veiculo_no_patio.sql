-- =====================================================
-- Replaces recolher_veiculo to prevent duplicate entries
-- Checks if vehicle with same plate is already in yard
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
  v_placa_limpa text;
BEGIN
  v_placa_limpa := upper(regexp_replace(trim(_placa), '[^A-Z0-9]', '', 'g'));

  IF EXISTS (
    SELECT 1 FROM public.veiculos_recolhidos
    WHERE placa = v_placa_limpa AND status = 'recolhido'
  ) THEN
    RAISE EXCEPTION 'Veiculo com placa % ja esta no patio (status: recolhido). Libere o veiculo antes de registrar uma nova apreensao.', v_placa_limpa;
  END IF;

  INSERT INTO public.veiculos_recolhidos (
    setor_id, placa, chassi, descricao_veiculo,
    proprietario_nome, proprietario_cpf_cnpj,
    data_recolhimento, motivo, status, situacao,
    local_custodia, observacao
  )
  VALUES (
    public.get_demutran_setor_id(),
    v_placa_limpa,
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
