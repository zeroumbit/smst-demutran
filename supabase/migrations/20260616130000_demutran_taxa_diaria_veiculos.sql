ALTER TABLE public.veiculos_recolhidos
  ADD COLUMN IF NOT EXISTS taxa_diaria numeric(10,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.atualizar_taxa_veiculo_recolhido(
  _veiculo_id uuid,
  _taxa_diaria numeric
)
RETURNS public.veiculos_recolhidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.veiculos_recolhidos%ROWTYPE;
BEGIN
  IF _taxa_diaria IS NULL OR _taxa_diaria < 0 THEN
    RAISE EXCEPTION 'Informe uma taxa diaria valida.';
  END IF;

  SELECT *
  INTO v_row
  FROM public.veiculos_recolhidos
  WHERE id = _veiculo_id;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Veiculo nao encontrado.';
  END IF;

  IF NOT public.can_manage_setor_content(v_row.setor_id) THEN
    RAISE EXCEPTION 'Sem permissao para atualizar a taxa deste veiculo.';
  END IF;

  UPDATE public.veiculos_recolhidos
  SET
    taxa_diaria = round(_taxa_diaria, 2),
    updated_at = now()
  WHERE id = _veiculo_id
  RETURNING * INTO v_row;

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (
    auth.uid(),
    v_row.setor_id,
    'veiculos_recolhidos',
    v_row.id,
    'atualizar_taxa_veiculo_recolhido',
    jsonb_build_object(
      'placa', v_row.placa,
      'taxa_diaria', v_row.taxa_diaria
    )
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_taxa_diaria_veiculos_recolhidos_setor(
  _setor_id uuid,
  _taxa_diaria numeric
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total integer := 0;
BEGIN
  IF _taxa_diaria IS NULL OR _taxa_diaria < 0 THEN
    RAISE EXCEPTION 'Informe uma taxa diaria valida.';
  END IF;

  IF _setor_id IS NULL THEN
    RAISE EXCEPTION 'Setor nao informado.';
  END IF;

  IF NOT public.can_manage_setor_content(_setor_id) THEN
    RAISE EXCEPTION 'Sem permissao para atualizar as taxas deste setor.';
  END IF;

  UPDATE public.veiculos_recolhidos
  SET
    taxa_diaria = round(_taxa_diaria, 2),
    updated_at = now()
  WHERE setor_id = _setor_id;

  GET DIAGNOSTICS v_total = ROW_COUNT;

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (
    auth.uid(),
    _setor_id,
    'veiculos_recolhidos',
    NULL,
    'atualizar_taxa_diaria_veiculos_recolhidos_setor',
    jsonb_build_object(
      'taxa_diaria', round(_taxa_diaria, 2),
      'registros_atualizados', v_total
    )
  );

  RETURN v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.atualizar_taxa_veiculo_recolhido(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_taxa_diaria_veiculos_recolhidos_setor(uuid, numeric) TO authenticated;
