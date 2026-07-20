-- Expõe o vínculo administrativo com a Guarda separadamente do perfil
-- principal, pois um mesmo usuário pode possuir perfis em vários setores.

CREATE OR REPLACE FUNCTION public.get_guarda_iro_management_access()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'can_manage', EXISTS (
      SELECT 1
      FROM public.perfis_usuarios pu
      WHERE pu.user_id = auth.uid()
        AND pu.setor_id = public.get_guarda_municipal_setor_id()
        AND pu.papel IN ('gestor'::public.papel_usuario, 'admin_setor'::public.papel_usuario)
        AND pu.ativo = true
    ),
    'setor_id', public.get_guarda_municipal_setor_id()
  );
$$;

REVOKE ALL ON FUNCTION public.get_guarda_iro_management_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_guarda_iro_management_access() TO authenticated;
