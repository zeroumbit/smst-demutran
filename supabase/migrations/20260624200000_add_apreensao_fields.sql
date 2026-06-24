-- Add new fields to veiculos_recolhidos for seizure/impoundment details
ALTER TABLE public.veiculos_recolhidos
  ADD COLUMN IF NOT EXISTS ano text,
  ADD COLUMN IF NOT EXISTS cor text,
  ADD COLUMN IF NOT EXISTS modelo text,
  ADD COLUMN IF NOT EXISTS municipio text,
  ADD COLUMN IF NOT EXISTS infrator_nome text,
  ADD COLUMN IF NOT EXISTS bairro_apreensao text;

-- Update recolher_veiculo RPC to accept new fields
CREATE OR REPLACE FUNCTION public.recolher_veiculo(
  _placa text,
  _proprietario_nome text DEFAULT 'Nao informado',
  _proprietario_cpf_cnpj text DEFAULT NULL,
  _chassi text DEFAULT NULL,
  _descricao_veiculo text DEFAULT ''::text,
  _ano text DEFAULT NULL,
  _cor text DEFAULT NULL,
  _modelo text DEFAULT NULL,
  _municipio text DEFAULT NULL,
  _infrator_nome text DEFAULT NULL,
  _bairro_apreensao text DEFAULT NULL,
  _data_recolhimento timestamptz DEFAULT now(),
  _motivo text DEFAULT ''::text,
  _situacao text DEFAULT 'Apreendido'::text,
  _local_custodia text DEFAULT 'automoveis'::text,
  _observacao text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_setor_id uuid;
  v_existing_id uuid;
  v_protocolo text;
  v_veiculo_id uuid;
BEGIN
  SELECT setor_id INTO v_setor_id
  FROM public.perfis_usuarios
  WHERE user_id = auth.uid() AND ativo = true
  LIMIT 1;

  IF v_setor_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Perfil administrativo nao encontrado ou inativo.');
  END IF;

  SELECT id INTO v_existing_id
  FROM public.veiculos_recolhidos
  WHERE placa = upper(trim(_placa)) AND status = 'recolhido'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Veiculo ja esta recolhido.');
  END IF;

  v_protocolo := 'APR-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || upper(substr(md5(random()::text), 1, 6));

  INSERT INTO public.veiculos_recolhidos (
    setor_id, placa, chassi, descricao_veiculo,
    ano, cor, modelo, municipio,
    proprietario_nome, proprietario_cpf_cnpj, infrator_nome, bairro_apreensao,
    data_recolhimento, motivo, status, situacao,
    local_custodia, observacao, protocolo
  ) VALUES (
    v_setor_id,
    upper(trim(_placa)),
    nullif(trim(_chassi), ''),
    _descricao_veiculo,
    nullif(trim(_ano), ''),
    nullif(trim(_cor), ''),
    nullif(trim(_modelo), ''),
    nullif(trim(_municipio), ''),
    _proprietario_nome,
    nullif(trim(_proprietario_cpf_cnpj), ''),
    nullif(trim(_infrator_nome), ''),
    nullif(trim(_bairro_apreensao), ''),
    _data_recolhimento,
    _motivo,
    'recolhido',
    _situacao,
    _local_custodia,
    nullif(trim(_observacao), ''),
    v_protocolo
  )
  RETURNING id INTO v_veiculo_id;

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (auth.uid(), v_setor_id, 'veiculos_recolhidos', v_veiculo_id, 'recolher_veiculo', jsonb_build_object('placa', upper(trim(_placa)), 'protocolo', v_protocolo));

  RETURN jsonb_build_object('success', true, 'protocolo', v_protocolo, 'veiculo_id', v_veiculo_id);
END;
$$;
