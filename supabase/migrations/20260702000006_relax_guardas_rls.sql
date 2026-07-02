-- =====================================================
-- MIGRATION: Relax Guardas RLS Policies for Gestores
-- =====================================================

-- 1. Update guardas_municipais policy
DROP POLICY IF EXISTS "Guardas can manage guardas municipais" ON public.guardas_municipais;
CREATE POLICY "Guardas can manage guardas municipais"
ON public.guardas_municipais
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios
    WHERE user_id = auth.uid() AND ativo = true
      AND papel = 'gestor'::public.papel_usuario
  )
)
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios
    WHERE user_id = auth.uid() AND ativo = true
      AND papel = 'gestor'::public.papel_usuario
  )
);

-- 2. Update guarda_municipal_graduacoes policy
DROP POLICY IF EXISTS "Guardas can manage graduacoes" ON public.guarda_municipal_graduacoes;
CREATE POLICY "Guardas can manage graduacoes"
ON public.guarda_municipal_graduacoes
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios
    WHERE user_id = auth.uid() AND ativo = true
      AND papel = 'gestor'::public.papel_usuario
  )
)
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios
    WHERE user_id = auth.uid() AND ativo = true
      AND papel = 'gestor'::public.papel_usuario
  )
);

-- 3. Update guardas_usuarios policy
DROP POLICY IF EXISTS "Super admins can manage guardas_usuarios" ON public.guardas_usuarios;
DROP POLICY IF EXISTS "Gestores and Super admins can manage guardas_usuarios" ON public.guardas_usuarios;
CREATE POLICY "Gestores and Super admins can manage guardas_usuarios"
ON public.guardas_usuarios
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios
    WHERE user_id = auth.uid() AND ativo = true
      AND papel = 'gestor'::public.papel_usuario
  )
)
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios
    WHERE user_id = auth.uid() AND ativo = true
      AND papel = 'gestor'::public.papel_usuario
  )
);
