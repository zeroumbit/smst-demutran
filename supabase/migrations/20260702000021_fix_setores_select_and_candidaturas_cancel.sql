-- =====================================================
-- MIGRATION: Fix setores select and iro_candidaturas cancel/update policies
-- 1. Relaxes SELECT on public.setores to all authenticated users so guardas can read their sector ID
-- 2. Allows authenticated users to UPDATE (cancel) their own candidaturas
-- =====================================================

-- 1. Relaxes setores select policy
DROP POLICY IF EXISTS "Authenticated can view manageable setores" ON public.setores;

CREATE POLICY "Authenticated can view manageable setores"
ON public.setores
FOR SELECT
TO authenticated
USING (true);

-- 2. Add update policy for users to cancel their own candidacy
DROP POLICY IF EXISTS "Users can update own iro_candidaturas" ON public.iro_candidaturas;

CREATE POLICY "Users can update own iro_candidaturas"
ON public.iro_candidaturas
FOR UPDATE
TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());
