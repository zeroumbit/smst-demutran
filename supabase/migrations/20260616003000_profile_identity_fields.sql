ALTER TABLE public.perfis_usuarios
  ADD COLUMN IF NOT EXISTS nome text,
  ADD COLUMN IF NOT EXISTS sobrenome text;

UPDATE public.perfis_usuarios pu
SET
  nome = COALESCE(
    pu.nome,
    au.raw_user_meta_data ->> 'first_name',
    split_part(COALESCE(au.raw_user_meta_data ->> 'name', au.email), ' ', 1)
  ),
  sobrenome = COALESCE(
    pu.sobrenome,
    au.raw_user_meta_data ->> 'last_name',
    NULLIF(
      trim(
        replace(
          COALESCE(au.raw_user_meta_data ->> 'name', ''),
          split_part(COALESCE(au.raw_user_meta_data ->> 'name', ''), ' ', 1),
          ''
        )
      ),
      ''
    )
  )
FROM auth.users au
WHERE pu.user_id = au.id
  AND (pu.nome IS NULL OR pu.sobrenome IS NULL);

CREATE OR REPLACE FUNCTION public.get_user_profile()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_user auth.users%ROWTYPE;
  profile_row RECORD;
  resolved_name text;
BEGIN
  SELECT *
  INTO auth_user
  FROM auth.users
  WHERE id = auth.uid();

  IF auth_user.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    pu.id AS perfil_id,
    pu.papel,
    pu.ativo,
    pu.nome,
    pu.sobrenome,
    s.id AS setor_id,
    s.nome AS setor_nome,
    s.slug AS setor_slug
  INTO profile_row
  FROM public.perfis_usuarios pu
  LEFT JOIN public.setores s ON s.id = pu.setor_id
  WHERE pu.user_id = auth.uid()
    AND pu.ativo = true
  ORDER BY CASE pu.papel
    WHEN 'super_admin' THEN 1
    WHEN 'gestor' THEN 2
    WHEN 'admin_setor' THEN 3
    ELSE 4
  END
  LIMIT 1;

  resolved_name := trim(
    COALESCE(profile_row.nome, auth_user.raw_user_meta_data ->> 'first_name', '')
    || ' '
    || COALESCE(profile_row.sobrenome, auth_user.raw_user_meta_data ->> 'last_name', '')
  );

  IF resolved_name = '' THEN
    resolved_name := COALESCE(auth_user.raw_user_meta_data ->> 'name', auth_user.email);
  END IF;

  IF profile_row.perfil_id IS NULL AND public.has_legacy_admin(auth.uid()) THEN
    RETURN jsonb_build_object(
      'user_id', auth_user.id,
      'email', auth_user.email,
      'name', resolved_name,
      'first_name', auth_user.raw_user_meta_data ->> 'first_name',
      'last_name', auth_user.raw_user_meta_data ->> 'last_name',
      'papel', 'super_admin',
      'perfil_id', NULL,
      'setor_id', NULL,
      'setor_nome', NULL,
      'setor_slug', NULL,
      'ativo', true,
      'legacy_admin', true
    );
  END IF;

  IF profile_row.perfil_id IS NULL THEN
    RETURN jsonb_build_object(
      'user_id', auth_user.id,
      'email', auth_user.email,
      'name', resolved_name,
      'first_name', auth_user.raw_user_meta_data ->> 'first_name',
      'last_name', auth_user.raw_user_meta_data ->> 'last_name',
      'papel', NULL,
      'perfil_id', NULL,
      'setor_id', NULL,
      'setor_nome', NULL,
      'setor_slug', NULL,
      'ativo', false,
      'legacy_admin', false
    );
  END IF;

  RETURN jsonb_build_object(
    'user_id', auth_user.id,
    'email', auth_user.email,
    'name', resolved_name,
    'first_name', profile_row.nome,
    'last_name', profile_row.sobrenome,
    'papel', profile_row.papel,
    'perfil_id', profile_row.perfil_id,
    'setor_id', profile_row.setor_id,
    'setor_nome', profile_row.setor_nome,
    'setor_slug', profile_row.setor_slug,
    'ativo', profile_row.ativo,
    'legacy_admin', false
  );
END;
$$;

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
  created_at timestamptz
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
    pu.created_at
  FROM public.perfis_usuarios pu
  JOIN auth.users au ON au.id = pu.user_id
  LEFT JOIN public.setores s ON s.id = pu.setor_id
  WHERE (
      public.is_super_admin()
      OR (_setor_id IS NOT NULL AND public.is_gestor_setor(_setor_id))
    )
    AND (_setor_id IS NULL OR pu.setor_id = _setor_id)
  ORDER BY s.nome NULLS FIRST, pu.created_at DESC;
$$;
