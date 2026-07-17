-- Migration: Make operacao_id nullable in public.iro_candidaturas
-- to support manual IROs that are not linked to a standard operation.

ALTER TABLE public.iro_candidaturas
  ALTER COLUMN operacao_id DROP NOT NULL;
