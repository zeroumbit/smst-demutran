-- =====================================================
-- Migration: Adiciona suporte a modulos em perfis admin
-- 1. provision_admin_user aceita _modulos
-- 2. get_admin_profiles retorna modulos do usuario
-- 3. update_profile_modulos RPC para editar modulos
-- =====================================================

-- Atualiza provision_admin_user para aceitar _modulos
CREATE OR REPLACE FUNCTION public.provision_admin_user(
  _email text,
  _password text,
  _first_name text,
  _last_name text,
  _setor_id uuid,
  _papel public.papel_usuario,
  _active boolean DEFAULT true,
  _modulos jsonb DEFAULT NULL
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
  v_has_legacy boolean;
  v_app_meta jsonb;
BEGIN
  v_requester_id := auth.uid();
  IF v_requester_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;

  SELECT pu.papel, pu.setor_id
  INTO v_requester_papel, v_requester_setor_id
  FROM public.perfis_usuarios pu
  WHERE pu.user_id = v_requester_id AND pu.ativo = true
  ORDER BY CASE pu.papel
    WHEN 'super_admin' THEN 1 WHEN 'gestor' THEN 2 ELSE 3
  END
  LIMIT 1;

  SELECT COUNT(*) > 0 INTO v_has_legacy
  FROM public.user_roles
  WHERE user_id = v_requester_id AND role = 'admin';

  v_requester_is_super_admin := v_requester_papel = 'super_admin' OR v_has_legacy;

  IF _papel = 'super_admin' AND NOT v_requester_is_super_admin THEN
    RETURN jsonb_build_object('error', 'Only super admins can create another super admin.');
  END IF;

  IF _papel = 'gestor' AND NOT v_requester_is_super_admin THEN
    RETURN jsonb_build_object('error', 'Only super admins can create gestores.');
  END IF;

  IF NOT v_requester_is_super_admin AND (v_requester_setor_id IS NULL OR v_requester_setor_id <> _setor_id) THEN
    RETURN jsonb_build_object('error', 'You can only create users for your own setor.');
  END IF;

  IF NOT v_requester_is_super_admin AND v_requester_papel NOT IN ('gestor', 'admin_setor') THEN
    RETURN jsonb_build_object('error', 'Your profile cannot create administrative users.');
  END IF;

  IF _papel <> 'super_admin' AND _setor_id IS NULL THEN
    RETURN jsonb_build_object('error', 'setorId is required for this role.');
  END IF;

  v_new_user_id := extensions.gen_random_uuid();

  v_app_meta := jsonb_build_object(
    'provider', 'email',
    'providers', jsonb_build_array('email'),
    'created_via', 'provision-admin-user'
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
    id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_new_user_id,
    v_new_user_id,
    jsonb_build_object('sub', v_new_user_id::text, 'email', lower(trim(_email))),
    'email',
    now(), now(), now()
  );

  IF _papel = 'gestor' AND _setor_id IS NOT NULL THEN
    UPDATE public.perfis_usuarios
    SET ativo = false, updated_at = now()
    WHERE setor_id = _setor_id AND papel = 'gestor' AND ativo = true;
  END IF;

  INSERT INTO public.perfis_usuarios (user_id, setor_id, papel, nome, sobrenome, ativo)
  VALUES (
    v_new_user_id,
    CASE WHEN _papel = 'super_admin' THEN NULL ELSE _setor_id END,
    _papel,
    trim(_first_name),
    trim(_last_name),
    _active
  )
  RETURNING id INTO v_perfil_id;

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

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Atualiza get_admin_profiles para retornar modulos
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
    au.raw_app_meta_data -> 'modulos' AS modulos,
    pu.created_at
  FROM public.perfis_usuarios pu
  JOIN auth.users au ON au.id = pu.user_id
  LEFT JOIN public.setores s ON s.id = pu.setor_id
  WHERE (
      public.is_super_admin()
      OR (_setor_id IS NOT NULL AND public.is_admin_of_setor(_setor_id))
    )
    AND (_setor_id IS NULL OR pu.setor_id = _setor_id)
  ORDER BY s.nome NULLS FIRST, pu.created_at DESC;
$$;

-- RPC para atualizar modulos de um usuario
CREATE OR REPLACE FUNCTION public.update_profile_modulos(
  _user_id uuid,
  _modulos jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_requester_id uuid;
  v_requester_is_super_admin boolean;
  v_target_setor_id uuid;
  v_requester_setor_id uuid;
BEGIN
  v_requester_id := auth.uid();
  IF v_requester_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;

  v_requester_is_super_admin := public.is_super_admin();

  IF NOT v_requester_is_super_admin THEN
    SELECT pu.setor_id INTO v_requester_setor_id
    FROM public.perfis_usuarios pu
    WHERE pu.user_id = v_requester_id AND pu.ativo = true
    LIMIT 1;

    SELECT pu.setor_id INTO v_target_setor_id
    FROM public.perfis_usuarios pu
    WHERE pu.user_id = _user_id AND pu.ativo = true
    LIMIT 1;

    IF v_requester_setor_id IS NULL OR v_requester_setor_id <> v_target_setor_id THEN
      RETURN jsonb_build_object('error', 'You can only update modules for users in your own setor.');
    END IF;
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = 
    CASE 
      WHEN _modulos IS NULL OR jsonb_array_length(_modulos) = 0 
      THEN raw_app_meta_data - 'modulos'
      ELSE raw_app_meta_data || jsonb_build_object('modulos', _modulos)
    END,
    updated_at = now()
  WHERE id = _user_id;

  RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;
