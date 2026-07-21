-- =====================================================
-- Migration: Adiciona coluna vinculos a guarda_frota_veiculos
-- =====================================================

ALTER TABLE public.guarda_frota_veiculos
ADD COLUMN IF NOT EXISTS vinculos text[] NOT NULL DEFAULT ARRAY[]::text[];
