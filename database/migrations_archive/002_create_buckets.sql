-- =====================================================
-- CONFIGURAÇÃO DOS BUCKETS DE STORAGE
-- =====================================================
-- Projeto: dtuojkipijsmrmsynqjw
-- URL: https://dtuojkipijsmrmsynqjw.supabase.co
-- =====================================================

-- =====================================================
-- 1. CRIAR BUCKET "imagens" (para logo e imagens)
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('imagens', 'imagens', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. CRIAR BUCKET "documentos" (para arquivos PDF)
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. POLÍTICAS DE ACESSO - BUCKET "imagens"
-- =====================================================

-- Permitir leitura pública
DROP POLICY IF EXISTS "Permitir leitura pública de imagens" ON storage.objects;
CREATE POLICY "Permitir leitura pública de imagens"
ON storage.objects FOR SELECT
USING (bucket_id = 'imagens');

-- Permitir upload de authenticated users
DROP POLICY IF EXISTS "Permitir upload de imagens" ON storage.objects;
CREATE POLICY "Permitir upload de imagens"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'imagens');

-- Permitir update de authenticated users
DROP POLICY IF EXISTS "Permitir update de imagens" ON storage.objects;
CREATE POLICY "Permitir update de imagens"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'imagens');

-- Permitir delete de authenticated users
DROP POLICY IF EXISTS "Permitir delete de imagens" ON storage.objects;
CREATE POLICY "Permitir delete de imagens"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'imagens');

-- =====================================================
-- 4. POLÍTICAS DE ACESSO - BUCKET "documentos"
-- =====================================================

-- Permitir leitura pública
DROP POLICY IF EXISTS "Permitir leitura pública de documentos" ON storage.objects;
CREATE POLICY "Permitir leitura pública de documentos"
ON storage.objects FOR SELECT
USING (bucket_id = 'documentos');

-- Permitir upload de authenticated users
DROP POLICY IF EXISTS "Permitir upload de documentos" ON storage.objects;
CREATE POLICY "Permitir upload de documentos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos');

-- Permitir update de authenticated users
DROP POLICY IF EXISTS "Permitir update de documentos" ON storage.objects;
CREATE POLICY "Permitir update de documentos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documentos');

-- Permitir delete de authenticated users
DROP POLICY IF EXISTS "Permitir delete de documentos" ON storage.objects;
CREATE POLICY "Permitir delete de documentos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documentos');

-- =====================================================
-- FIM DO SCRIPT DE CONFIGURAÇÃO DOS BUCKETS
-- =====================================================
