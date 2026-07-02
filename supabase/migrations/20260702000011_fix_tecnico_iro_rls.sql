-- =====================================================
-- MIGRATION: Fix RLS Policy for iro_operacoes using auth.jwt()
-- Bypasses auth.users join which throws 403 Permission Denied for authenticated users
-- =====================================================

DROP POLICY IF EXISTS "Super admin and gestor can manage iro_operacoes" ON public.iro_operacoes;

CREATE POLICY "Super admin and gestor can manage iro_operacoes"
ON public.iro_operacoes
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin_of_setor(setor_id)
  OR (
    EXISTS (
      SELECT 1
      FROM public.perfis_usuarios pu
      WHERE pu.user_id = auth.uid()
        AND pu.ativo = true
        AND pu.papel = 'tecnico'::public.papel_usuario
        AND pu.setor_id = iro_operacoes.setor_id
    )
    AND coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'iros'
  )
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_admin_of_setor(setor_id)
  OR (
    EXISTS (
      SELECT 1
      FROM public.perfis_usuarios pu
      WHERE pu.user_id = auth.uid()
        AND pu.ativo = true
        AND pu.papel = 'tecnico'::public.papel_usuario
        AND pu.setor_id = iro_operacoes.setor_id
    )
    AND coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'iros'
  )
);
