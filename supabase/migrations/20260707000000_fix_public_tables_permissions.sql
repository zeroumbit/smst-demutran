-- =====================================================
-- Migration: Restaurar permissões de leitura pública
-- Correção: 401/403 em banners, galeria_fotos, equipe, documentos
-- =====================================================

-- 1. GRANT SELECT para anon em todas as tabelas públicas
GRANT SELECT ON TABLE public.banners TO anon;
GRANT SELECT ON TABLE public.documentos TO anon;
GRANT SELECT ON TABLE public.noticias TO anon;
GRANT SELECT ON TABLE public.eventos TO anon;
GRANT SELECT ON TABLE public.galeria_fotos TO anon;
GRANT SELECT ON TABLE public.equipe TO anon;

-- 2. Garantir políticas de leitura pública (apenas ativos)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'banners' AND policyname = 'Public read active banners') THEN
    CREATE POLICY "Public read active banners" ON public.banners FOR SELECT TO anon USING (ativo = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documentos' AND policyname = 'Public read active documentos') THEN
    CREATE POLICY "Public read active documentos" ON public.documentos FOR SELECT TO anon USING (ativo = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'noticias' AND policyname = 'Public read active noticias') THEN
    CREATE POLICY "Public read active noticias" ON public.noticias FOR SELECT TO anon USING (ativo = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'eventos' AND policyname = 'Public read active eventos') THEN
    CREATE POLICY "Public read active eventos" ON public.eventos FOR SELECT TO anon USING (ativo = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'galeria_fotos' AND policyname = 'Public read active galeria_fotos') THEN
    CREATE POLICY "Public read active galeria_fotos" ON public.galeria_fotos FOR SELECT TO anon USING (ativo = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'equipe' AND policyname = 'Public read active equipe') THEN
    CREATE POLICY "Public read active equipe" ON public.equipe FOR SELECT TO anon USING (ativo = true);
  END IF;
END
$$;
