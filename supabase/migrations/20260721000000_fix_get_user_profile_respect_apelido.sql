-- ============================================
-- Corrige get_user_profile para respeitar o apelido
-- O apelido (raw_user_meta_data->>'name') definido
-- no auto cadastro deve ser priorizado como nome
-- de exibição do usuário.
-- ============================================

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
    s.slug AS setor_slug,
    pu.graduacao_id,
    ggn.nome AS graduacao_nome
  INTO profile_row
  FROM public.perfis_usuarios pu
  LEFT JOIN public.setores s ON s.id = pu.setor_id
  LEFT JOIN public.guarda_municipal_graduacoes ggn ON ggn.id = pu.graduacao_id
  WHERE pu.user_id = auth.uid()
    AND pu.ativo = true
  ORDER BY CASE pu.papel
    WHEN 'super_admin' THEN 1
    WHEN 'gestor' THEN 2
    WHEN 'admin_setor' THEN 3
    ELSE 4
  END
  LIMIT 1;

  -- Prioriza o apelido/nome de exibição salvo nos metadados
  -- (definido pelo guarda no auto cadastro como "Como deseja ser chamado").
  -- Se não houver, monta a partir do nome/sobrenome do perfil ou
  -- first_name/last_name dos metadados. Como último fallback, usa o email.
  resolved_name := COALESCE(
    NULLIF(auth_user.raw_user_meta_data ->> 'name', ''),
    NULLIF(trim(
      COALESCE(profile_row.nome, auth_user.raw_user_meta_data ->> 'first_name', '')
      || ' '
      || COALESCE(profile_row.sobrenome, auth_user.raw_user_meta_data ->> 'last_name', '')
    ), ''),
    auth_user.email
  );

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
      'legacy_admin', true,
      'graduacao_id', NULL,
      'graduacao_nome', NULL
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
      'legacy_admin', false,
      'graduacao_id', NULL,
      'graduacao_nome', NULL
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
    'legacy_admin', false,
    'graduacao_id', profile_row.graduacao_id,
    'graduacao_nome', profile_row.graduacao_nome
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_profile() TO authenticated;
