-- =====================================================
-- Migration: Restaurar leitura publica para tabelas publicas
-- Descricao: Grant SELECT para anon + politicas RLS
-- =====================================================

-- =====================================================
-- 1. Conceder SELECT para anon nas tabelas publicas
--    (REVOKE foi feito no security_hardening, mas essas
--     tabelas precisam de leitura publica)
-- =====================================================

GRANT SELECT ON TABLE public.documentos TO anon;
GRANT SELECT ON TABLE public.noticias TO anon;
GRANT SELECT ON TABLE public.eventos TO anon;
GRANT SELECT ON TABLE public.galeria_fotos TO anon;
GRANT SELECT ON TABLE public.equipe TO anon;
GRANT SELECT ON TABLE public.banners TO anon;

-- =====================================================
-- 2. Politica de leitura publica para documentos
--    (apenas registros ativos)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'documentos' AND schemaname = 'public'
    AND policyname = 'Public read active documentos'
  ) THEN
    CREATE POLICY "Public read active documentos"
    ON public.documentos
    FOR SELECT
    TO anon
    USING (ativo = true);
  END IF;
END
$$;

-- =====================================================
-- 3. Garantir que as outras tabelas tambem tenham
--    politicas de leitura publica
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'noticias' AND schemaname = 'public'
    AND policyname = 'Public read active noticias'
  ) THEN
    CREATE POLICY "Public read active noticias"
    ON public.noticias
    FOR SELECT
    TO anon
    USING (ativo = true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'eventos' AND schemaname = 'public'
    AND policyname = 'Public read active eventos'
  ) THEN
    CREATE POLICY "Public read active eventos"
    ON public.eventos
    FOR SELECT
    TO anon
    USING (ativo = true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'galeria_fotos' AND schemaname = 'public'
    AND policyname = 'Public read active galeria_fotos'
  ) THEN
    CREATE POLICY "Public read active galeria_fotos"
    ON public.galeria_fotos
    FOR SELECT
    TO anon
    USING (ativo = true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'equipe' AND schemaname = 'public'
    AND policyname = 'Public read active equipe'
  ) THEN
    CREATE POLICY "Public read active equipe"
    ON public.equipe
    FOR SELECT
    TO anon
    USING (ativo = true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'banners' AND schemaname = 'public'
    AND policyname = 'Public read active banners'
  ) THEN
    CREATE POLICY "Public read active banners"
    ON public.banners
    FOR SELECT
    TO anon
    USING (ativo = true);
  END IF;
END
$$;
