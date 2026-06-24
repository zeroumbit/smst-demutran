-- =====================================================
-- Migration: Adiciona coluna liberado_por em veiculos_recolhidos
-- Apos liberar, o nome do usuario que liberou fica gravado
-- e nao pode ser editado.
-- =====================================================

ALTER TABLE public.veiculos_recolhidos
  ADD COLUMN IF NOT EXISTS liberado_por text;

-- Atualiza a funcao liberar_veiculo_recolhido
-- para registrar quem liberou o veiculo
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
  v_user_name text;
BEGIN
  SELECT *
  INTO v_row
  FROM public.veiculos_recolhidos
  WHERE id = _veiculo_id;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Veiculo nao encontrado.';
  END IF;

  IF NOT public.can_manage_demutran_content(v_row.setor_id) THEN
    RAISE EXCEPTION 'Sem permissao para liberar este veiculo.';
  END IF;

  -- Obtem o nome do usuario autenticado
  SELECT TRIM(COALESCE(pu.nome, '') || ' ' || COALESCE(pu.sobrenome, ''))
  INTO v_user_name
  FROM public.perfis_usuarios pu
  WHERE pu.user_id = auth.uid() AND pu.ativo = true
  LIMIT 1;

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
    liberacao_registrada_no_sistema = true,
    liberado_por = COALESCE(NULLIF(trim(v_user_name), ''), liberado_por),
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
      'numero_liberacao', v_row.numero_liberacao,
      'liberado_por', v_row.liberado_por
    )
  );

  RETURN v_row;
END;
$$;
