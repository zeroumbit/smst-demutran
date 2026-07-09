-- Add _numero_liberacao to recolher_veiculo so motos_delegacia can set it during apprehension
-- Also fix _descricao_veiculo to use COALESCE default when null is sent
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
  _logradouro text DEFAULT NULL,
  _genero_condutor text DEFAULT NULL,
  _restricao_legal text DEFAULT NULL,
  _envolvimento_acidente text DEFAULT NULL,
  _data_recolhimento timestamptz DEFAULT now(),
  _motivo text DEFAULT ''::text,
  _situacao text DEFAULT 'Apreendido'::text,
  _local_custodia public.demutran_local_custodia DEFAULT 'automoveis',
  _numero_liberacao text DEFAULT NULL,
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
    proprietario_nome, proprietario_cpf_cnpj, infrator_nome, bairro_apreensao, logradouro,
    genero_condutor, restricao_legal, envolvimento_acidente,
    data_recolhimento, motivo, status, situacao,
    local_custodia, numero_liberacao, observacao, protocolo
  ) VALUES (
    v_setor_id,
    upper(trim(_placa)),
    nullif(trim(_chassi), ''),
    COALESCE(NULLIF(TRIM(_descricao_veiculo), ''), 'Nao informado'),
    nullif(trim(_ano), ''),
    nullif(trim(_cor), ''),
    nullif(trim(_modelo), ''),
    nullif(trim(_municipio), ''),
    _proprietario_nome,
    nullif(trim(_proprietario_cpf_cnpj), ''),
    nullif(trim(_infrator_nome), ''),
    nullif(trim(_bairro_apreensao), ''),
    nullif(trim(_logradouro), ''),
    nullif(trim(_genero_condutor), ''),
    nullif(trim(_restricao_legal), ''),
    nullif(trim(_envolvimento_acidente), ''),
    _data_recolhimento,
    _motivo,
    'recolhido',
    _situacao,
    _local_custodia,
    nullif(trim(_numero_liberacao), ''),
    nullif(trim(_observacao), ''),
    v_protocolo
  )
  RETURNING id INTO v_veiculo_id;

  IF nullif(trim(_logradouro), '') IS NOT NULL THEN
    PERFORM public.upsert_logradouro_demutran(
      v_setor_id,
      _logradouro,
      _bairro_apreensao,
      NULL,
      _municipio,
      NULL,
      'veiculo_recolhido'
    );
  END IF;

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (auth.uid(), v_setor_id, 'veiculos_recolhidos', v_veiculo_id, 'recolher_veiculo', jsonb_build_object('placa', upper(trim(_placa)), 'protocolo', v_protocolo));

  RETURN jsonb_build_object('success', true, 'protocolo', v_protocolo, 'veiculo_id', v_veiculo_id);
END;
$$;
