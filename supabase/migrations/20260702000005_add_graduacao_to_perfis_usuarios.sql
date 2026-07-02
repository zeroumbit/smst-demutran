-- ============================================
-- Adiciona vínculo de graduação a perfis de usuário
-- Permite que gestores/administrativos também atuem como guardas
-- ============================================

ALTER TABLE public.perfis_usuarios ADD COLUMN IF NOT EXISTS graduacao_id uuid REFERENCES public.guarda_municipal_graduacoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_perfis_usuarios_graduacao ON public.perfis_usuarios (graduacao_id);

-- ============================================
-- Atualiza get_user_profile para incluir graduacao
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

-- ============================================
-- Atualiza get_admin_profiles para incluir graduacao
-- ============================================
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
  created_at timestamptz,
  graduacao_id uuid,
  graduacao_nome text
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
    pu.created_at,
    pu.graduacao_id,
    ggn.nome::text AS graduacao_nome
  FROM public.perfis_usuarios pu
  JOIN auth.users au ON au.id = pu.user_id
  LEFT JOIN public.setores s ON s.id = pu.setor_id
  LEFT JOIN public.guarda_municipal_graduacoes ggn ON ggn.id = pu.graduacao_id
  WHERE (
      public.is_super_admin()
      OR (_setor_id IS NOT NULL AND public.is_gestor_setor(_setor_id))
    )
    AND (_setor_id IS NULL OR pu.setor_id = _setor_id)
  ORDER BY s.nome NULLS FIRST, pu.created_at DESC;
$$;

-- ============================================
-- Atualiza update_profile para aceitar graduacao_id
-- ============================================
DROP FUNCTION IF EXISTS public.update_profile(uuid, text, text, public.papel_usuario, uuid);

CREATE OR REPLACE FUNCTION public.update_profile(
  _perfil_id uuid,
  _nome text DEFAULT NULL,
  _sobrenome text DEFAULT NULL,
  _papel public.papel_usuario DEFAULT NULL,
  _setor_id uuid DEFAULT NULL,
  _graduacao_id uuid DEFAULT NULL
)
RETURNS public.perfis_usuarios
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_row public.perfis_usuarios;
BEGIN
  SELECT * INTO profile_row FROM public.perfis_usuarios WHERE id = _perfil_id;

  IF profile_row.id IS NULL THEN
    RAISE EXCEPTION 'Perfil nao encontrado.';
  END IF;

  IF NOT public.is_super_admin() AND NOT public.is_admin_of_setor(profile_row.setor_id) THEN
    RAISE EXCEPTION 'Sem permissao para editar este perfil.';
  END IF;

  UPDATE public.perfis_usuarios
  SET
    nome = COALESCE(_nome, nome),
    sobrenome = COALESCE(_sobrenome, sobrenome),
    papel = COALESCE(_papel, papel),
    setor_id = CASE WHEN _papel = 'super_admin'::public.papel_usuario THEN NULL ELSE COALESCE(_setor_id, setor_id) END,
    graduacao_id = COALESCE(_graduacao_id, graduacao_id),
    updated_at = now()
  WHERE id = _perfil_id
  RETURNING * INTO profile_row;

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (auth.uid(), profile_row.setor_id, 'perfis_usuarios', profile_row.id, 'update_profile', jsonb_build_object('papel', profile_row.papel));

  RETURN profile_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_profile(uuid, text, text, public.papel_usuario, uuid, uuid) TO authenticated;
