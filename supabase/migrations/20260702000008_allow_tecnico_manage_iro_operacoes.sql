-- Allow tecnico (with iros module) to manage iro_operacoes
DROP POLICY IF EXISTS "Super admin and gestor can manage iro_operacoes" ON public.iro_operacoes;
CREATE POLICY "Super admin and gestor can manage iro_operacoes"
ON public.iro_operacoes
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin_of_setor(setor_id)
  OR EXISTS (
    SELECT 1
    FROM public.perfis_usuarios pu
    JOIN auth.users au ON au.id = pu.user_id
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
      AND pu.papel = 'tecnico'::public.papel_usuario
      AND pu.setor_id = iro_operacoes.setor_id
      AND au.raw_app_meta_data->'modulos' ? 'iros'
  )
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_admin_of_setor(setor_id)
  OR EXISTS (
    SELECT 1
    FROM public.perfis_usuarios pu
    JOIN auth.users au ON au.id = pu.user_id
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
      AND pu.papel = 'tecnico'::public.papel_usuario
      AND pu.setor_id = iro_operacoes.setor_id
      AND au.raw_app_meta_data->'modulos' ? 'iros'
  )
);
