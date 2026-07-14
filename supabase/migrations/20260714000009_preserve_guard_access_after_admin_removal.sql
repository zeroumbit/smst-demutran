-- =====================================================
-- MIGRATION: Preserve guarda access after admin profile removal/deactivation
-- 1. Materializes guardas_usuarios links for Guarda-sector profiles with graduacao
-- 2. Ensures profile create/update/deactivate keep that link synchronized
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_guarda_usuario_link(
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile record;
  v_email text;
  v_guarda_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT pu.id, pu.nome, pu.sobrenome, pu.graduacao_id, pu.setor_id
  INTO v_profile
  FROM public.perfis_usuarios pu
  WHERE pu.user_id = p_user_id
    AND pu.setor_id = public.get_guarda_municipal_setor_id()
    AND pu.graduacao_id IS NOT NULL
  ORDER BY pu.ativo DESC, pu.updated_at DESC
  LIMIT 1;

  IF v_profile.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT lower(email)
  INTO v_email
  FROM auth.users
  WHERE id = p_user_id
  LIMIT 1;

  SELECT gm.id
  INTO v_guarda_id
  FROM public.guardas_municipais gm
  WHERE gm.ativo = true
    AND (
      (v_email IS NOT NULL AND lower(coalesce(gm.email, '')) = v_email)
      OR lower(trim(gm.nome)) = lower(trim(concat_ws(' ', v_profile.nome, v_profile.sobrenome)))
    )
  ORDER BY CASE
    WHEN v_email IS NOT NULL AND lower(coalesce(gm.email, '')) = v_email THEN 0
    ELSE 1
  END, gm.updated_at DESC
  LIMIT 1;

  IF v_guarda_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.guardas_usuarios (guarda_id, usuario_id)
  VALUES (v_guarda_id, p_user_id)
  ON CONFLICT (guarda_id, usuario_id) DO NOTHING;

  RETURN v_guarda_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_guarda_usuario_link(uuid) TO authenticated;

DO $$
DECLARE
  v_row record;
BEGIN
  FOR v_row IN
    SELECT DISTINCT pu.user_id
    FROM public.perfis_usuarios pu
    WHERE pu.setor_id = public.get_guarda_municipal_setor_id()
      AND pu.graduacao_id IS NOT NULL
  LOOP
    PERFORM public.sync_guarda_usuario_link(v_row.user_id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.provision_admin_user(
  _email text,
  _password text,
  _first_name text,
  _last_name text,
  _setor_id uuid,
  _papel public.papel_usuario,
  _active boolean DEFAULT true,
  _modulos jsonb DEFAULT NULL,
  _graduacao_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_requester_id uuid;
  v_requester_papel public.papel_usuario;
  v_requester_setor_id uuid;
  v_requester_is_super_admin boolean;
  v_new_user_id uuid;
  v_perfil_id uuid;
  v_app_meta jsonb;
BEGIN
  v_requester_id := auth.uid();
  IF v_requester_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;

  SELECT pu.papel, pu.setor_id
  INTO v_requester_papel, v_requester_setor_id
  FROM public.perfis_usuarios pu
  WHERE pu.user_id = v_requester_id
    AND pu.ativo = true
  ORDER BY CASE pu.papel
    WHEN 'super_admin' THEN 1
    WHEN 'gestor' THEN 2
    ELSE 3
  END
  LIMIT 1;

  v_requester_is_super_admin := v_requester_papel = 'super_admin';

  IF lower(trim(_email)) !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RETURN jsonb_build_object('error', 'Invalid email format.');
  END IF;

  IF length(trim(_password)) < 6 THEN
    RETURN jsonb_build_object('error', 'Password must be at least 6 characters.');
  END IF;

  IF length(trim(_first_name)) < 1 OR length(trim(_first_name)) > 100 THEN
    RETURN jsonb_build_object('error', 'First name must be between 1 and 100 characters.');
  END IF;

  IF length(trim(_last_name)) < 1 OR length(trim(_last_name)) > 100 THEN
    RETURN jsonb_build_object('error', 'Last name must be between 1 and 100 characters.');
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(_email))) THEN
    RETURN jsonb_build_object('error', 'Email already registered.');
  END IF;

  IF _papel = 'super_admin' AND NOT v_requester_is_super_admin THEN
    RETURN jsonb_build_object('error', 'Only super admins can create another super admin.');
  END IF;

  IF _papel = 'gestor' AND NOT v_requester_is_super_admin THEN
    RETURN jsonb_build_object('error', 'Only super admins can create gestores.');
  END IF;

  IF NOT v_requester_is_super_admin AND (v_requester_setor_id IS NULL OR v_requester_setor_id <> _setor_id) THEN
    RETURN jsonb_build_object('error', 'You can only create users for your own setor.');
  END IF;

  IF NOT v_requester_is_super_admin AND v_requester_papel NOT IN ('gestor') THEN
    RETURN jsonb_build_object('error', 'Your profile cannot create administrative users.');
  END IF;

  IF _papel <> 'super_admin' AND _setor_id IS NULL THEN
    RETURN jsonb_build_object('error', 'setorId is required for this role.');
  END IF;

  v_new_user_id := extensions.gen_random_uuid();

  v_app_meta := jsonb_build_object(
    'provider', 'email',
    'providers', jsonb_build_array('email')
  );

  IF _modulos IS NOT NULL AND jsonb_array_length(_modulos) > 0 THEN
    v_app_meta := v_app_meta || jsonb_build_object('modulos', _modulos);
  END IF;

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    aud, role
  ) VALUES (
    v_new_user_id,
    '00000000-0000-0000-0000-000000000000',
    lower(trim(_email)),
    extensions.crypt(_password, extensions.gen_salt('bf')),
    now(), now(),
    v_app_meta,
    jsonb_build_object(
      'name', trim(_first_name) || ' ' || trim(_last_name),
      'first_name', trim(_first_name),
      'last_name', trim(_last_name)
    ),
    now(), now(),
    '', '', '', '',
    'authenticated', 'authenticated'
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_new_user_id,
    v_new_user_id,
    jsonb_build_object('sub', v_new_user_id::text, 'email', lower(trim(_email))),
    'email',
    lower(trim(_email)),
    now(), now(), now()
  );

  IF _papel = 'gestor' AND _setor_id IS NOT NULL THEN
    UPDATE public.perfis_usuarios
    SET ativo = false, updated_at = now()
    WHERE setor_id = _setor_id
      AND papel = 'gestor'
      AND ativo = true;
  END IF;

  INSERT INTO public.perfis_usuarios (user_id, setor_id, papel, nome, sobrenome, ativo, graduacao_id)
  VALUES (
    v_new_user_id,
    CASE WHEN _papel = 'super_admin' THEN NULL ELSE _setor_id END,
    _papel,
    trim(_first_name),
    trim(_last_name),
    _active,
    _graduacao_id
  )
  RETURNING id INTO v_perfil_id;

  IF _setor_id = public.get_guarda_municipal_setor_id() AND _graduacao_id IS NOT NULL THEN
    PERFORM public.sync_guarda_usuario_link(v_new_user_id);
  END IF;

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (
    v_requester_id,
    CASE WHEN _papel = 'super_admin' THEN NULL ELSE _setor_id END,
    'perfis_usuarios',
    v_perfil_id,
    'provision_admin_user',
    jsonb_build_object('email', lower(trim(_email)), 'papel', _papel, 'active', _active)
  );

  RETURN jsonb_build_object(
    'success', true,
    'userId', v_new_user_id,
    'perfilId', v_perfil_id
  );
END;
$$;

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
  SELECT * INTO profile_row
  FROM public.perfis_usuarios
  WHERE id = _perfil_id;

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
    setor_id = CASE
      WHEN _papel = 'super_admin'::public.papel_usuario THEN NULL
      ELSE COALESCE(_setor_id, setor_id)
    END,
    graduacao_id = COALESCE(_graduacao_id, graduacao_id),
    updated_at = now()
  WHERE id = _perfil_id
  RETURNING * INTO profile_row;

  IF profile_row.setor_id = public.get_guarda_municipal_setor_id()
     AND profile_row.graduacao_id IS NOT NULL THEN
    PERFORM public.sync_guarda_usuario_link(profile_row.user_id);
  END IF;

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (
    auth.uid(),
    profile_row.setor_id,
    'perfis_usuarios',
    profile_row.id,
    'update_profile',
    jsonb_build_object('papel', profile_row.papel)
  );

  RETURN profile_row;
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

  IF profile_row.setor_id = public.get_guarda_municipal_setor_id()
     AND profile_row.graduacao_id IS NOT NULL THEN
    PERFORM public.sync_guarda_usuario_link(profile_row.user_id);
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
