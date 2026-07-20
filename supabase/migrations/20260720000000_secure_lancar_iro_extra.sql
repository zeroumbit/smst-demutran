-- Garante que o RPC de IRO extra sem operacao tambem valide a permissao no servidor.
-- A funcao original permanece privada para preservar a implementacao/auditoria existente.

DO $$
BEGIN
  IF to_regprocedure('public.lancar_iro_extra_internal_20260717(uuid,numeric,text,uuid,text,date)') IS NULL
     AND to_regprocedure('public.lancar_iro_extra(uuid,numeric,text,uuid,text,date)') IS NOT NULL THEN
    ALTER FUNCTION public.lancar_iro_extra(uuid, numeric, text, uuid, text, date)
      RENAME TO lancar_iro_extra_internal_20260717;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.lancar_iro_extra_internal_20260717(uuid, numeric, text, uuid, text, date)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.lancar_iro_extra(
  p_usuario_id uuid,
  p_quantidade_horas numeric,
  p_motivo text,
  p_operacao_id uuid DEFAULT NULL,
  p_operacao_nome text DEFAULT NULL,
  p_data_operacao date DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  -- Com operacao, a funcao interna valida o setor da propria operacao.
  -- Sem operacao, o lancamento pertence necessariamente ao setor da Guarda.
  IF p_operacao_id IS NULL
     AND NOT public.can_lancar_iro_manual(public.get_guarda_municipal_setor_id()) THEN
    RAISE EXCEPTION 'Sem permissao para lancar IRO extra.';
  END IF;

  RETURN public.lancar_iro_extra_internal_20260717(
    p_usuario_id,
    p_quantidade_horas,
    p_motivo,
    p_operacao_id,
    p_operacao_nome,
    p_data_operacao
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lancar_iro_extra(uuid, numeric, text, uuid, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lancar_iro_extra(uuid, numeric, text, uuid, text, date) TO authenticated;
