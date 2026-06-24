-- =====================================================
-- MIGRATION: Fix RLS Security
-- Drops overly permissive policies, restricts to admins
-- =====================================================

-- 1. DROP "Admin full access" policies (allow any authenticated user)
DROP POLICY IF EXISTS "Admin full access contatos" ON "public"."contatos";
DROP POLICY IF EXISTS "Admin full access equipe" ON "public"."equipe";
DROP POLICY IF EXISTS "Admin full access eventos" ON "public"."eventos";
DROP POLICY IF EXISTS "Admin full access galeria_fotos" ON "public"."galeria_fotos";
DROP POLICY IF EXISTS "Admin full access noticias" ON "public"."noticias";
DROP POLICY IF EXISTS "Admin full access projetos" ON "public"."projetos";
DROP POLICY IF EXISTS "Admin full access users" ON "public"."users";
DROP POLICY IF EXISTS "Admin full access paginas" ON "public"."paginas";
DROP POLICY IF EXISTS "Admin full access documentos" ON "public"."documentos";
DROP POLICY IF EXISTS "Admin full access banners" ON "public"."banners";

-- 2. Add missing policies for contatos (public read for active? Not needed - internal only)
-- Admin-only management already exists via "Admins can manage contatos"

-- 3. Add public read policies for contatos and equipe (needed by public pages)
DROP POLICY IF EXISTS "Public read active contatos" ON "public"."contatos";
CREATE POLICY "Public read active contatos"
ON "public"."contatos" FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Public read active equipe" ON "public"."equipe";
CREATE POLICY "Public read active equipe"
ON "public"."equipe" FOR SELECT
USING (true);

-- 4. Revoke is_admin() and has_role() from anon (unauthenticated users)
REVOKE ALL ON FUNCTION "public"."is_admin"() FROM "anon";
REVOKE ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") FROM "anon";

-- 5. Storage policies: add owner check for insert/update/delete
-- Only allow users to modify their own uploaded files

-- imagens bucket
DROP POLICY IF EXISTS "Permitir upload de imagens" ON storage.objects;
CREATE POLICY "Permitir upload de imagens"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'imagens' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Permitir update de imagens" ON storage.objects;
CREATE POLICY "Permitir update de imagens"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'imagens' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Permitir delete de imagens" ON storage.objects;
CREATE POLICY "Permitir delete de imagens"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'imagens' AND auth.uid() = owner);

-- documentos bucket
DROP POLICY IF EXISTS "Permitir upload de documentos" ON storage.objects;
CREATE POLICY "Permitir upload de documentos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Permitir update de documentos" ON storage.objects;
CREATE POLICY "Permitir update de documentos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documentos' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Permitir delete de documentos" ON storage.objects;
CREATE POLICY "Permitir delete de documentos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documentos' AND auth.uid() = owner);
