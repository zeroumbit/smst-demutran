-- =====================================================
-- Add JGC perfil (functional role) to get_admin_profiles
-- so the admin UI can display the correct JGC role
-- (administrativo, professor, multiprofissional)
-- instead of showing all JGC users as "Administrativo".
-- =====================================================

DROP FUNCTION IF EXISTS public.get_admin_profiles(uuid);

CREATE FUNCTION public.get_admin_profiles(_setor_id uuid DEFAULT NULL)
RETURNS TABLE (
  perfil_id uuid,
  user_id uuid,
  email text,
  nome text,
  sobrenome text,
  nome_completo text,
  setor_id uuid,
  setor_nome text,
  setor_slug text,
  papel public.papel_usuario,
  ativo boolean,
  modulos jsonb,
  created_at timestamptz,
  graduacao_id uuid,
  graduacao_nome text,
  jgc_perfil text,
  jgc_area_atuacao text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    pu.id AS perfil_id,
    pu.user_id,
    au.email::text AS email,
    pu.nome::text AS nome,
    pu.sobrenome::text AS sobrenome,
    trim(
      COALESCE(pu.nome, au.raw_user_meta_data ->> 'first_name', '')
      || ' '
      || COALESCE(pu.sobrenome, au.raw_user_meta_data ->> 'last_name', '')
    )::text AS nome_completo,
    s.id AS setor_id,
    s.nome AS setor_nome,
    s.slug AS setor_slug,
    pu.papel,
    pu.ativo,
    au.raw_app_meta_data -> 'modulos' AS modulos,
    pu.created_at,
    pu.graduacao_id,
    ggn.nome::text AS graduacao_nome,
    jp.perfil::text AS jgc_perfil,
    jp.area_atuacao::text AS jgc_area_atuacao
  FROM public.perfis_usuarios pu
  JOIN auth.users au ON au.id = pu.user_id
  LEFT JOIN public.setores s ON s.id = pu.setor_id
  LEFT JOIN public.guarda_municipal_graduacoes ggn ON ggn.id = pu.graduacao_id
  LEFT JOIN public.jgc_perfis jp ON jp.perfil_usuario_id = pu.id AND jp.ativo
  WHERE (
      public.is_super_admin()
      OR (_setor_id IS NOT NULL AND public.is_admin_of_setor(_setor_id))
    )
    AND (_setor_id IS NULL OR pu.setor_id = _setor_id)
  ORDER BY s.nome NULLS FIRST, pu.created_at DESC;
$$;
