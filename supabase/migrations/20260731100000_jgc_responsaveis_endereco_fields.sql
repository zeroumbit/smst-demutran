-- Migration: Add structured address fields (logradouro, numero, bairro) to jgc_responsaveis table
-- Date: 2026-07-31

ALTER TABLE public.jgc_responsaveis
  ADD COLUMN IF NOT EXISTS logradouro text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS bairro text;

COMMENT ON COLUMN public.jgc_responsaveis.logradouro IS 'Logradouro do responsável (Rua, Avenida, Travessa, etc.)';
COMMENT ON COLUMN public.jgc_responsaveis.numero IS 'Número do endereço ou S/N (até 10 caracteres)';
COMMENT ON COLUMN public.jgc_responsaveis.bairro IS 'Bairro do endereço do responsável';
