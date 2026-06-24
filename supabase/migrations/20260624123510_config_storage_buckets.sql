-- =====================================================
-- Migration: Configurar buckets de storage (imagens, documentos)
-- Descricao: Cria politicas RLS e atualiza configuracoes
-- =====================================================

-- =====================================================
-- 1. IMAGENS BUCKET - Políticas RLS
-- =====================================================

-- Public read (imagens sao publicas por natureza)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Public read imagens'
  ) THEN
    CREATE POLICY "Public read imagens"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'imagens');
  END IF;
END
$$;

-- Authenticated upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Authenticated upload imagens'
  ) THEN
    CREATE POLICY "Authenticated upload imagens"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'imagens');
  END IF;
END
$$;

-- Authenticated update own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Authenticated update own imagens'
  ) THEN
    CREATE POLICY "Authenticated update own imagens"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'imagens' AND auth.uid() = owner)
    WITH CHECK (bucket_id = 'imagens' AND auth.uid() = owner);
  END IF;
END
$$;

-- Authenticated delete own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Authenticated delete own imagens'
  ) THEN
    CREATE POLICY "Authenticated delete own imagens"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'imagens' AND auth.uid() = owner);
  END IF;
END
$$;

-- Admin can manage any imagens (super_admin, gestor, admin_setor)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Admin manage all imagens'
  ) THEN
    CREATE POLICY "Admin manage all imagens"
    ON storage.objects FOR ALL
    TO authenticated
    USING (
      bucket_id = 'imagens'
      AND public.is_admin_of_setor(NULL)
    )
    WITH CHECK (
      bucket_id = 'imagens'
      AND public.is_admin_of_setor(NULL)
    );
  END IF;
END
$$;

-- =====================================================
-- 2. DOCUMENTOS BUCKET - Políticas RLS
-- =====================================================

-- Public read (documentos compartilhados publicamente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Public read documentos'
  ) THEN
    CREATE POLICY "Public read documentos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'documentos');
  END IF;
END
$$;

-- Authenticated upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Authenticated upload documentos'
  ) THEN
    CREATE POLICY "Authenticated upload documentos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'documentos');
  END IF;
END
$$;

-- Authenticated update own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Authenticated update own documentos'
  ) THEN
    CREATE POLICY "Authenticated update own documentos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'documentos' AND auth.uid() = owner)
    WITH CHECK (bucket_id = 'documentos' AND auth.uid() = owner);
  END IF;
END
$$;

-- Authenticated delete own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Authenticated delete own documentos'
  ) THEN
    CREATE POLICY "Authenticated delete own documentos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'documentos' AND auth.uid() = owner);
  END IF;
END
$$;

-- Admin can manage any documentos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Admin manage all documentos'
  ) THEN
    CREATE POLICY "Admin manage all documentos"
    ON storage.objects FOR ALL
    TO authenticated
    USING (
      bucket_id = 'documentos'
      AND public.is_admin_of_setor(NULL)
    )
    WITH CHECK (
      bucket_id = 'documentos'
      AND public.is_admin_of_setor(NULL)
    );
  END IF;
END
$$;
