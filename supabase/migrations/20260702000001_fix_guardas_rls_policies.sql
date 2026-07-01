-- Fix RLS policies for guardas_municipais and guarda_municipal_graduacoes
-- Allow gestor and admin_setor of guarda-municipal setor to access these tables (not just super_admin)

-- 1. Helper function to get guarda-municipal setor ID
CREATE OR REPLACE FUNCTION public.get_guarda_municipal_setor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id
  FROM public.setores
  WHERE slug = 'guarda-municipal'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_guarda_municipal_setor_id() TO anon;
GRANT EXECUTE ON FUNCTION public.get_guarda_municipal_setor_id() TO authenticated;

-- 2. Update guarda_municipal_graduacoes policy
DROP POLICY IF EXISTS "Super admins can manage guarda municipal graduacoes" ON public.guarda_municipal_graduacoes;
DROP POLICY IF EXISTS "Guardas can manage graduacoes" ON public.guarda_municipal_graduacoes;
CREATE POLICY "Guardas can manage graduacoes"
ON public.guarda_municipal_graduacoes
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
);

-- 3. Update guardas_municipais policy
DROP POLICY IF EXISTS "Super admins can manage guardas municipais" ON public.guardas_municipais;
DROP POLICY IF EXISTS "Guardas can manage guardas municipais" ON public.guardas_municipais;
CREATE POLICY "Guardas can manage guardas municipais"
ON public.guardas_municipais
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
);
