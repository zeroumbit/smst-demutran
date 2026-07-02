-- =====================================================
-- MIGRATION: Allow guard-municipal technical staff to manage graduacoes
-- Updates the RLS policy on public.guarda_municipal_graduacoes
-- =====================================================

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
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios
    WHERE user_id = auth.uid() AND ativo = true
      AND papel = 'gestor'::public.papel_usuario
  )
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
      AND pu.papel = 'tecnico'::public.papel_usuario
      AND pu.setor_id = public.get_guarda_municipal_setor_id()
  )
);
