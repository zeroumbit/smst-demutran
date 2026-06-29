-- =====================================================
-- Migration: Adicionar campos detalhados na frota municipal
-- =====================================================

ALTER TABLE public.demutran_veiculos_municipais
ADD COLUMN IF NOT EXISTS tipo text,
ADD COLUMN IF NOT EXISTS ano text,
ADD COLUMN IF NOT EXISTS modelo text,
ADD COLUMN IF NOT EXISTS marca text,
ADD COLUMN IF NOT EXISTS cor text,
ADD COLUMN IF NOT EXISTS principal_local_atuacao text;
