-- =====================================================
-- Migration: Adicionar motorista_responsavel na frota
-- Fase: Phase 4 - DEMUTRAN
-- =====================================================

ALTER TABLE public.demutran_veiculos_municipais
ADD COLUMN IF NOT EXISTS motorista_responsavel text;
