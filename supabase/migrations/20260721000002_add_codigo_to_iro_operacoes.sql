-- ============================================
-- Adiciona código sequencial às operações IRO
-- Formato: OPIRO001, OPIRO002, ...
-- ============================================

CREATE SEQUENCE IF NOT EXISTS public.seq_iro_operacoes_codigo
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

ALTER TABLE public.iro_operacoes
ADD COLUMN IF NOT EXISTS codigo varchar(20);

CREATE OR REPLACE FUNCTION public.gerar_codigo_iro_operacao()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.codigo IS NULL THEN
    NEW.codigo := 'OPIRO' || LPAD(nextval('public.seq_iro_operacoes_codigo')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_iro_operacoes_codigo
  BEFORE INSERT ON public.iro_operacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_codigo_iro_operacao();

-- Backfill existing rows
DO $$
DECLARE
  r RECORD;
BEGIN
  PERFORM setval('public.seq_iro_operacoes_codigo', 1, false);
  FOR r IN SELECT id FROM public.iro_operacoes WHERE codigo IS NULL ORDER BY created_at
  LOOP
    UPDATE public.iro_operacoes
    SET codigo = 'OPIRO' || LPAD(nextval('public.seq_iro_operacoes_codigo')::text, 3, '0')
    WHERE id = r.id;
  END LOOP;
END;
$$;

ALTER TABLE public.iro_operacoes
ALTER COLUMN codigo SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_iro_operacoes_codigo ON public.iro_operacoes(codigo);
