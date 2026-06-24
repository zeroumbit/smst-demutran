-- =====================================================
-- Migration: Garantir permissões de CRUD para authenticated
-- em documentos (estava faltando GRANT no initial_schema)
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.documentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.documentos TO service_role;
