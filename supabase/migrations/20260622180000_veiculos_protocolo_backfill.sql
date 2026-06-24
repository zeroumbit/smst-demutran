-- =====================================================
-- MIGRATION: Backfill protocolo, prevent edits, CPF edit RPC
-- =====================================================

-- 1. Backfill any existing records that still have NULL/empty protocolo
UPDATE public.veiculos_recolhidos
SET protocolo = public.generate_demutran_protocol('APR')
WHERE protocolo IS NULL OR protocolo = '';

-- 2. Ensure NOT NULL constraint (in case migration 1700 didn't apply)
ALTER TABLE public.veiculos_recolhidos
  ALTER COLUMN protocolo SET NOT NULL;

-- 3. Recreate unique index if missing (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS veiculos_recolhidos_protocolo_unq
  ON public.veiculos_recolhidos (protocolo);

-- 4. Trigger to prevent protocolo from being updated after creation
CREATE OR REPLACE FUNCTION public.prevent_protocolo_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.protocolo IS DISTINCT FROM NEW.protocolo THEN
    RAISE EXCEPTION 'O protocolo nao pode ser alterado apos a criacao do registro.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_protocolo_update ON public.veiculos_recolhidos;
CREATE TRIGGER trigger_prevent_protocolo_update
  BEFORE UPDATE ON public.veiculos_recolhidos
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_protocolo_update();

-- 5. RPC for admin to add/edit CPF on existing vehicles (requires justification)
CREATE OR REPLACE FUNCTION public.atualizar_cpf_veiculo_recolhido(
  _veiculo_id uuid,
  _cpf_cnpj text,
  _justificativa text
)
RETURNS public.veiculos_recolhidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.veiculos_recolhidos%ROWTYPE;
  v_novo_cpf text;
BEGIN
  IF trim(coalesce(_justificativa, '')) = '' THEN
    RAISE EXCEPTION 'Justificativa obrigatoria para alteracao de CPF/CNPJ.';
  END IF;

  v_novo_cpf := NULLIF(regexp_replace(trim(_cpf_cnpj), '[^0-9]', '', 'g'), '');

  UPDATE public.veiculos_recolhidos
  SET
    proprietario_cpf_cnpj = v_novo_cpf,
    observacao = CASE
      WHEN observacao IS NULL OR observacao = ''
        THEN '[CPF] ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || ' - ' || _justificativa
      ELSE observacao || E'\n[CPF] ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || ' - ' || _justificativa
    END
  WHERE id = _veiculo_id
    AND setor_id = public.get_demutran_setor_id()
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Veiculo nao encontrado ou sem permissao.';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.atualizar_cpf_veiculo_recolhido(uuid, text, text) TO authenticated;
