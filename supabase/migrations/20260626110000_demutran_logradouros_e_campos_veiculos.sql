ALTER TABLE public.veiculos_recolhidos
  ADD COLUMN IF NOT EXISTS genero_condutor text,
  ADD COLUMN IF NOT EXISTS restricao_legal text,
  ADD COLUMN IF NOT EXISTS envolvimento_acidente text;

ALTER TABLE public.veiculos_recolhidos
  DROP CONSTRAINT IF EXISTS veiculos_recolhidos_genero_condutor_check,
  DROP CONSTRAINT IF EXISTS veiculos_recolhidos_restricao_legal_check,
  DROP CONSTRAINT IF EXISTS veiculos_recolhidos_envolvimento_acidente_check;

ALTER TABLE public.veiculos_recolhidos
  ADD CONSTRAINT veiculos_recolhidos_genero_condutor_check
    CHECK (
      genero_condutor IS NULL
      OR genero_condutor IN ('masculino', 'feminino', 'nao_informado', 'outro')
    ),
  ADD CONSTRAINT veiculos_recolhidos_restricao_legal_check
    CHECK (
      restricao_legal IS NULL
      OR restricao_legal IN (
        'busca_apreensao',
        'restricao_circulacao_penhora',
        'restricao_transferencia',
        'alienacao_fiduciaria',
        'alerta_roubo_furto',
        'apropriacao_indebita',
        'bloqueio_falta_transferencia',
        'restricao_media_grande_monta',
        'queixa_duble_clonagem'
      )
    ),
  ADD CONSTRAINT veiculos_recolhidos_envolvimento_acidente_check
    CHECK (
      envolvimento_acidente IS NULL
      OR envolvimento_acidente IN ('nao', 'sem_vitima', 'com_vitima')
    );

CREATE TABLE IF NOT EXISTS public.demutran_logradouros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  nome text NOT NULL,
  bairro text,
  cep text,
  municipio text,
  uf text,
  origem text NOT NULL DEFAULT 'manual',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS demutran_logradouros_setor_nome_unq
  ON public.demutran_logradouros (setor_id, lower(nome));

CREATE INDEX IF NOT EXISTS demutran_logradouros_busca_idx
  ON public.demutran_logradouros (setor_id, ativo, lower(nome));

DROP TRIGGER IF EXISTS trigger_atualizar_demutran_logradouros_updated_at ON public.demutran_logradouros;
CREATE TRIGGER trigger_atualizar_demutran_logradouros_updated_at
BEFORE UPDATE ON public.demutran_logradouros
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

ALTER TABLE public.demutran_logradouros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage demutran logradouros" ON public.demutran_logradouros;
CREATE POLICY "Admins can manage demutran logradouros"
ON public.demutran_logradouros
FOR ALL
TO authenticated
USING (public.can_manage_setor_content(setor_id))
WITH CHECK (public.can_manage_setor_content(setor_id));

DROP POLICY IF EXISTS "Admins can view demutran logradouros" ON public.demutran_logradouros;
CREATE POLICY "Admins can view demutran logradouros"
ON public.demutran_logradouros
FOR SELECT
TO authenticated
USING (public.can_view_setor_content(setor_id));

CREATE OR REPLACE FUNCTION public.listar_logradouros_demutran(
  _setor_id uuid,
  _search text DEFAULT NULL,
  _limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  nome text,
  bairro text,
  cep text,
  municipio text,
  uf text,
  origem text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    dl.id,
    dl.nome,
    dl.bairro,
    dl.cep,
    dl.municipio,
    dl.uf,
    dl.origem
  FROM public.demutran_logradouros dl
  WHERE dl.setor_id = _setor_id
    AND dl.ativo = true
    AND (
      nullif(trim(coalesce(_search, '')), '') IS NULL
      OR lower(dl.nome) LIKE '%' || lower(trim(_search)) || '%'
      OR lower(coalesce(dl.bairro, '')) LIKE '%' || lower(trim(_search)) || '%'
      OR regexp_replace(coalesce(dl.cep, ''), '\D', '', 'g') LIKE '%' || regexp_replace(trim(_search), '\D', '', 'g') || '%'
    )
  ORDER BY
    CASE
      WHEN nullif(trim(coalesce(_search, '')), '') IS NULL THEN 1
      WHEN lower(dl.nome) = lower(trim(_search)) THEN 0
      WHEN lower(dl.nome) LIKE lower(trim(_search)) || '%' THEN 1
      ELSE 2
    END,
    dl.nome
  LIMIT greatest(coalesce(_limit, 50), 1);
$$;

CREATE OR REPLACE FUNCTION public.upsert_logradouro_demutran(
  _setor_id uuid,
  _nome text,
  _bairro text DEFAULT NULL,
  _cep text DEFAULT NULL,
  _municipio text DEFAULT NULL,
  _uf text DEFAULT NULL,
  _origem text DEFAULT 'manual'
)
RETURNS public.demutran_logradouros
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.demutran_logradouros;
BEGIN
  IF nullif(trim(coalesce(_nome, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Nome do logradouro e obrigatorio.';
  END IF;

  INSERT INTO public.demutran_logradouros (
    setor_id,
    nome,
    bairro,
    cep,
    municipio,
    uf,
    origem
  )
  VALUES (
    _setor_id,
    trim(_nome),
    nullif(trim(_bairro), ''),
    nullif(regexp_replace(coalesce(_cep, ''), '\D', '', 'g'), ''),
    nullif(trim(_municipio), ''),
    nullif(upper(trim(_uf)), ''),
    coalesce(nullif(trim(_origem), ''), 'manual')
  )
  ON CONFLICT (setor_id, lower(nome))
  DO UPDATE SET
    bairro = coalesce(excluded.bairro, public.demutran_logradouros.bairro),
    cep = coalesce(excluded.cep, public.demutran_logradouros.cep),
    municipio = coalesce(excluded.municipio, public.demutran_logradouros.municipio),
    uf = coalesce(excluded.uf, public.demutran_logradouros.uf),
    origem = coalesce(excluded.origem, public.demutran_logradouros.origem),
    ativo = true,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

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
    proprietario_nome, proprietario_cpf_cnpj, infrator_nome, bairro_apreensao, logradouro,
    genero_condutor, restricao_legal, envolvimento_acidente,
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
    nullif(trim(_logradouro), ''),
    nullif(trim(_genero_condutor), ''),
    nullif(trim(_restricao_legal), ''),
    nullif(trim(_envolvimento_acidente), ''),
    _data_recolhimento,
    _motivo,
    'recolhido',
    _situacao,
    _local_custodia,
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demutran_logradouros TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_logradouros_demutran(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_logradouro_demutran(uuid, text, text, text, text, text, text) TO authenticated;
