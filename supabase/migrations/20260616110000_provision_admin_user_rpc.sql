-- =====================================================
-- Migration: RPC para provisionar usuario administrativo
-- Substitui a Edge Function provision-admin-user
-- Chamada via supabase.rpc('provision_admin_user', {...})
-- =====================================================

CREATE OR REPLACE FUNCTION public.provision_admin_user(
  _email text,
  _password text,
  _first_name text,
  _last_name text,
  _setor_id uuid,
  _papel public.papel_usuario,
  _active boolean DEFAULT true
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
BEGIN
  -- --- Autenticacao e autorizacao ---
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

  -- Permission checks
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

  -- --- Criacao do usuario no Auth ---
  v_new_user_id := extensions.gen_random_uuid();

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
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object(
      'name', trim(_first_name) || ' ' || trim(_last_name),
      'first_name', trim(_first_name),
      'last_name', trim(_last_name)
    ),
    now(), now(),
    '', '', '', '',
    'authenticated', 'authenticated'
  );

  -- Identity
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

  -- --- Desativar gestor anterior se for gestor ---
  IF _papel = 'gestor' AND _setor_id IS NOT NULL THEN
    UPDATE public.perfis_usuarios
    SET ativo = false, updated_at = now()
    WHERE setor_id = _setor_id AND papel = 'gestor' AND ativo = true;
  END IF;

  -- --- Criar perfil ---
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

  -- --- Auditoria ---
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
