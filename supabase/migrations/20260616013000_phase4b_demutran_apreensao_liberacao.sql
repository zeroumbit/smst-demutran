DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'demutran_local_custodia'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.demutran_local_custodia AS ENUM (
      'automoveis',
      'motos',
      'motos_delegacia',
      'veiculos_forum'
    );
  END IF;
END $$;

ALTER TABLE public.veiculos_recolhidos
  ADD COLUMN IF NOT EXISTS descricao_veiculo text,
  ADD COLUMN IF NOT EXISTS situacao text,
  ADD COLUMN IF NOT EXISTS local_custodia public.demutran_local_custodia,
  ADD COLUMN IF NOT EXISTS numero_liberacao text;

UPDATE public.veiculos_recolhidos
SET
  descricao_veiculo = COALESCE(descricao_veiculo, 'Nao informado'),
  situacao = COALESCE(situacao, CASE WHEN status = 'liberado' THEN 'Liberado' ELSE 'Apreendido' END),
  local_custodia = COALESCE(local_custodia, 'automoveis'::public.demutran_local_custodia)
WHERE descricao_veiculo IS NULL
   OR situacao IS NULL
   OR local_custodia IS NULL;

ALTER TABLE public.veiculos_recolhidos
  ALTER COLUMN descricao_veiculo SET NOT NULL,
  ALTER COLUMN descricao_veiculo SET DEFAULT 'Nao informado',
  ALTER COLUMN situacao SET NOT NULL,
  ALTER COLUMN situacao SET DEFAULT 'Apreendido',
  ALTER COLUMN local_custodia SET NOT NULL,
  ALTER COLUMN local_custodia SET DEFAULT 'automoveis'::public.demutran_local_custodia;

CREATE INDEX IF NOT EXISTS veiculos_recolhidos_local_custodia_idx
  ON public.veiculos_recolhidos (local_custodia);

CREATE OR REPLACE FUNCTION public.liberar_veiculo_recolhido(
  _veiculo_id uuid,
  _data_liberacao timestamptz DEFAULT now(),
  _numero_liberacao text DEFAULT NULL,
  _situacao text DEFAULT 'Liberado',
  _observacao text DEFAULT NULL
)
RETURNS public.veiculos_recolhidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.veiculos_recolhidos%ROWTYPE;
BEGIN
  SELECT *
  INTO v_row
  FROM public.veiculos_recolhidos
  WHERE id = _veiculo_id;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Veiculo nao encontrado.';
  END IF;

  IF NOT public.can_manage_setor_content(v_row.setor_id) THEN
    RAISE EXCEPTION 'Sem permissao para liberar este veiculo.';
  END IF;

  UPDATE public.veiculos_recolhidos
  SET
    status = 'liberado',
    data_liberacao = COALESCE(_data_liberacao, now()),
    numero_liberacao = CASE
      WHEN v_row.local_custodia = 'motos_delegacia'::public.demutran_local_custodia
        THEN COALESCE(NULLIF(trim(_numero_liberacao), ''), numero_liberacao)
      ELSE numero_liberacao
    END,
    situacao = COALESCE(NULLIF(trim(_situacao), ''), 'Liberado'),
    observacao = CASE
      WHEN NULLIF(trim(_observacao), '') IS NULL THEN observacao
      WHEN observacao IS NULL OR observacao = '' THEN trim(_observacao)
      ELSE observacao || E'\n' || trim(_observacao)
    END,
    updated_at = now()
  WHERE id = _veiculo_id
  RETURNING * INTO v_row;

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (
    auth.uid(),
    v_row.setor_id,
    'veiculos_recolhidos',
    v_row.id,
    'liberar_veiculo_recolhido',
    jsonb_build_object(
      'placa', v_row.placa,
      'data_liberacao', v_row.data_liberacao,
      'numero_liberacao', v_row.numero_liberacao
    )
  );

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.liberar_veiculo_recolhido(uuid, timestamptz, text, text, text) TO authenticated;
