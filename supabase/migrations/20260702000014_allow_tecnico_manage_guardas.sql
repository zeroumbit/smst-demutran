-- =====================================================
-- Permite que tecnico do setor guarda-municipal gerencie guardas
-- =====================================================

DROP POLICY IF EXISTS "Guardas can manage guardas municipais" ON public.guardas_municipais;

CREATE POLICY "Guardas can manage guardas municipais"
ON public.guardas_municipais
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
      AND pu.papel = 'tecnico'::public.papel_usuario
      AND pu.setor_id = public.get_guarda_municipal_setor_id()
  )
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
      AND pu.papel = 'tecnico'::public.papel_usuario
      AND pu.setor_id = public.get_guarda_municipal_setor_id()
  )
);

-- Tambem ajusta a policy da tabela de vinculo guardas_usuarios
DROP POLICY IF EXISTS "Gestores and Super admins can manage guardas_usuarios" ON public.guardas_usuarios;

CREATE POLICY "Gestores and Super admins can manage guardas_usuarios"
ON public.guardas_usuarios
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
      AND pu.papel = 'tecnico'::public.papel_usuario
      AND pu.setor_id = public.get_guarda_municipal_setor_id()
  )
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
      AND pu.papel = 'tecnico'::public.papel_usuario
      AND pu.setor_id = public.get_guarda_municipal_setor_id()
  )
);
