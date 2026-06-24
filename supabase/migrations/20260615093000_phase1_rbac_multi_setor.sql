DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'papel_usuario'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.papel_usuario AS ENUM (
      'super_admin',
      'gestor',
      'admin_setor',
      'tecnico'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.perfis_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  setor_id uuid REFERENCES public.setores(id) ON DELETE CASCADE,
  papel public.papel_usuario NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perfis_usuarios_super_admin_setor_check
    CHECK (
      (papel = 'super_admin' AND setor_id IS NULL)
      OR (papel <> 'super_admin' AND setor_id IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS public.auditoria_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  setor_id uuid REFERENCES public.setores(id) ON DELETE SET NULL,
  entidade text NOT NULL,
  entidade_id uuid,
  acao text NOT NULL,
  payload_resumido jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS setores_slug_idx ON public.setores (slug);
CREATE UNIQUE INDEX IF NOT EXISTS perfis_usuarios_super_admin_unq
  ON public.perfis_usuarios (user_id)
  WHERE papel = 'super_admin' AND ativo = true;
CREATE UNIQUE INDEX IF NOT EXISTS perfis_usuarios_user_setor_unq
  ON public.perfis_usuarios (user_id, setor_id)
  WHERE setor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS perfis_usuarios_user_idx ON public.perfis_usuarios (user_id);
CREATE INDEX IF NOT EXISTS perfis_usuarios_setor_idx ON public.perfis_usuarios (setor_id);
CREATE INDEX IF NOT EXISTS auditoria_logs_setor_idx ON public.auditoria_logs (setor_id, created_at DESC);

DROP TRIGGER IF EXISTS trigger_atualizar_setores_updated_at ON public.setores;
CREATE TRIGGER trigger_atualizar_setores_updated_at
BEFORE UPDATE ON public.setores
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_atualizar_perfis_usuarios_updated_at ON public.perfis_usuarios;
CREATE TRIGGER trigger_atualizar_perfis_usuarios_updated_at
BEFORE UPDATE ON public.perfis_usuarios
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_legacy_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfis_usuarios
    WHERE user_id = auth.uid()
      AND papel = 'super_admin'::public.papel_usuario
      AND ativo = true
  ) OR public.has_legacy_admin(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_gestor_setor(_setor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.perfis_usuarios
      WHERE user_id = auth.uid()
        AND setor_id = _setor_id
        AND papel = 'gestor'::public.papel_usuario
        AND ativo = true
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of_setor(_setor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.perfis_usuarios
      WHERE user_id = auth.uid()
        AND setor_id = _setor_id
        AND papel IN ('gestor'::public.papel_usuario, 'admin_setor'::public.papel_usuario)
        AND ativo = true
    );
$$;

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

  IF profile_row.perfil_id IS NULL AND public.has_legacy_admin(auth.uid()) THEN
    RETURN jsonb_build_object(
      'user_id', auth_user.id,
      'email', auth_user.email,
      'name', COALESCE(auth_user.raw_user_meta_data ->> 'name', auth_user.email),
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
      'name', COALESCE(auth_user.raw_user_meta_data ->> 'name', auth_user.email),
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
    'name', COALESCE(auth_user.raw_user_meta_data ->> 'name', auth_user.email),
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

CREATE OR REPLACE FUNCTION public.get_manageable_setores()
RETURNS TABLE (
  id uuid,
  nome text,
  slug text,
  descricao text,
  ativo boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.nome, s.slug, s.descricao, s.ativo, s.created_at, s.updated_at
  FROM public.setores s
  WHERE public.is_super_admin()
     OR EXISTS (
       SELECT 1
       FROM public.perfis_usuarios pu
       WHERE pu.user_id = auth.uid()
         AND pu.setor_id = s.id
         AND pu.ativo = true
     )
  ORDER BY s.nome;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_profiles(_setor_id uuid DEFAULT NULL)
RETURNS TABLE (
  perfil_id uuid,
  user_id uuid,
  email text,
  nome text,
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
    COALESCE(au.raw_user_meta_data ->> 'name', au.email)::text AS nome,
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

CREATE OR REPLACE FUNCTION public.assign_user_to_setor(
  _email text,
  _setor_id uuid,
  _papel public.papel_usuario
)
RETURNS public.perfis_usuarios
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id uuid;
  result_row public.perfis_usuarios;
BEGIN
  IF _papel = 'super_admin' THEN
    RAISE EXCEPTION 'Use a funcao especifica para super admin.';
  END IF;

  IF NOT public.is_admin_of_setor(_setor_id) THEN
    RAISE EXCEPTION 'Sem permissao para gerenciar este setor.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.perfis_usuarios
    WHERE user_id = auth.uid()
      AND setor_id = _setor_id
      AND papel = 'gestor'::public.papel_usuario
      AND ativo = true
  ) AND _papel = 'gestor' THEN
    RAISE EXCEPTION 'Somente super admin pode definir gestores.';
  END IF;

  SELECT id
  INTO target_user_id
  FROM auth.users
  WHERE lower(email) = lower(_email)
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario com email % nao encontrado no Auth.', _email;
  END IF;

  INSERT INTO public.perfis_usuarios (user_id, setor_id, papel, ativo)
  VALUES (target_user_id, _setor_id, _papel, true)
  ON CONFLICT (user_id, setor_id)
  DO UPDATE SET
    papel = EXCLUDED.papel,
    ativo = true,
    updated_at = now()
  RETURNING * INTO result_row;

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (
    auth.uid(),
    _setor_id,
    'perfis_usuarios',
    result_row.id,
    'assign_user_to_setor',
    jsonb_build_object('email', _email, 'papel', _papel)
  );

  RETURN result_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_setor_gestor(
  _email text,
  _setor_id uuid
)
RETURNS public.perfis_usuarios
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_row public.perfis_usuarios;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Somente super admin pode definir gestores.';
  END IF;

  UPDATE public.perfis_usuarios
  SET ativo = false,
      updated_at = now()
  WHERE setor_id = _setor_id
    AND papel = 'gestor'::public.papel_usuario
    AND ativo = true;

  SELECT *
  INTO result_row
  FROM public.assign_user_to_setor(_email, _setor_id, 'gestor'::public.papel_usuario);

  RETURN result_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_profile(_perfil_id uuid)
RETURNS public.perfis_usuarios
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_row public.perfis_usuarios;
BEGIN
  SELECT *
  INTO profile_row
  FROM public.perfis_usuarios
  WHERE id = _perfil_id;

  IF profile_row.id IS NULL THEN
    RAISE EXCEPTION 'Perfil nao encontrado.';
  END IF;

  IF NOT public.is_admin_of_setor(profile_row.setor_id) THEN
    RAISE EXCEPTION 'Sem permissao para desativar este perfil.';
  END IF;

  IF profile_row.papel = 'gestor'::public.papel_usuario AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Somente super admin pode desativar gestor.';
  END IF;

  UPDATE public.perfis_usuarios
  SET ativo = false,
      updated_at = now()
  WHERE id = _perfil_id
  RETURNING * INTO profile_row;

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (
    auth.uid(),
    profile_row.setor_id,
    'perfis_usuarios',
    profile_row.id,
    'deactivate_profile',
    jsonb_build_object('papel', profile_row.papel)
  );

  RETURN profile_row;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.setores
    WHERE slug = 'guarda-municipal'
  ) THEN
    INSERT INTO public.setores (nome, slug, descricao)
    VALUES
      ('Guarda Municipal', 'guarda-municipal', 'Setor da Guarda Municipal'),
      ('DEMUTRAN', 'demutran', 'Departamento Municipal de Transito'),
      ('Jovem Guarda', 'jovem-guarda', 'Setor Jovem Guarda'),
      ('ROPE', 'rope', 'Setor ROPE'),
      ('Defesa Civil', 'defesa-civil', 'Setor Defesa Civil'),
      ('GMAM', 'gmam', 'Setor GMAM'),
      ('GSU', 'gsu', 'Setor GSU');
  END IF;
END $$;

DROP POLICY IF EXISTS "Super admins can manage setores" ON public.setores;
CREATE POLICY "Super admins can manage setores"
ON public.setores
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Authenticated can view manageable setores" ON public.setores;
CREATE POLICY "Authenticated can view manageable setores"
ON public.setores
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.perfis_usuarios pu
    WHERE pu.user_id = auth.uid()
      AND pu.setor_id = setores.id
      AND pu.ativo = true
  )
);

DROP POLICY IF EXISTS "Users can view own profile row" ON public.perfis_usuarios;
CREATE POLICY "Users can view own profile row"
ON public.perfis_usuarios
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_super_admin()
  OR public.is_gestor_setor(setor_id)
);

DROP POLICY IF EXISTS "Super admins can manage profiles" ON public.perfis_usuarios;
CREATE POLICY "Super admins can manage profiles"
ON public.perfis_usuarios
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admins can view auditoria do setor" ON public.auditoria_logs;
CREATE POLICY "Admins can view auditoria do setor"
ON public.auditoria_logs
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin_of_setor(setor_id)
);

GRANT SELECT, INSERT, UPDATE ON public.setores TO authenticated;
GRANT SELECT ON public.perfis_usuarios TO authenticated;
GRANT SELECT ON public.auditoria_logs TO authenticated;

GRANT EXECUTE ON FUNCTION public.has_legacy_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gestor_setor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_of_setor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_manageable_setores() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_profiles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_to_setor(text, uuid, public.papel_usuario) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_setor_gestor(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_profile(uuid) TO authenticated;
