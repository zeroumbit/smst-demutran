-- Torna o provisionamento idempotente: uma repeticao reaproveita a conta
-- Auth e cria/atualiza somente o perfil administrativo solicitado.
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
  v_user_id uuid;
  v_perfil_id uuid;
  v_app_meta jsonb;
  v_reused_auth_user boolean := false;
  v_reused_profile boolean := false;
BEGIN
  v_requester_id := auth.uid();
  IF v_requester_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;

  SELECT pu.papel, pu.setor_id
    INTO v_requester_papel, v_requester_setor_id
  FROM public.perfis_usuarios pu
  WHERE pu.user_id = v_requester_id AND pu.ativo
  ORDER BY CASE pu.papel
    WHEN 'super_admin' THEN 1 WHEN 'gestor' THEN 2 ELSE 3
  END
  LIMIT 1;
  v_requester_is_super_admin := v_requester_papel = 'super_admin';

  IF lower(trim(_email)) !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RETURN jsonb_build_object('error', 'Invalid email format.');
  END IF;
  IF length(trim(_password)) < 6 THEN
    RETURN jsonb_build_object('error', 'Password must be at least 6 characters.');
  END IF;
  IF length(trim(_first_name)) NOT BETWEEN 1 AND 100 THEN
    RETURN jsonb_build_object('error', 'First name must be between 1 and 100 characters.');
  END IF;
  IF length(trim(_last_name)) NOT BETWEEN 1 AND 100 THEN
    RETURN jsonb_build_object('error', 'Last name must be between 1 and 100 characters.');
  END IF;
  IF _papel = 'super_admin' AND NOT v_requester_is_super_admin THEN
    RETURN jsonb_build_object('error', 'Only super admins can create another super admin.');
  END IF;
  IF _papel = 'gestor' AND NOT v_requester_is_super_admin THEN
    RETURN jsonb_build_object('error', 'Only super admins can create gestores.');
  END IF;
  IF NOT v_requester_is_super_admin
     AND (v_requester_setor_id IS NULL OR v_requester_setor_id <> _setor_id) THEN
    RETURN jsonb_build_object('error', 'You can only create users for your own setor.');
  END IF;
  IF NOT v_requester_is_super_admin AND v_requester_papel NOT IN ('gestor') THEN
    RETURN jsonb_build_object('error', 'Your profile cannot create administrative users.');
  END IF;
  IF _papel <> 'super_admin' AND _setor_id IS NULL THEN
    RETURN jsonb_build_object('error', 'setorId is required for this role.');
  END IF;
  IF _modulos IS NOT NULL AND jsonb_typeof(_modulos) <> 'array' THEN
    RETURN jsonb_build_object('error', 'Modules must be an array.');
  END IF;

  PERFORM public.lock_admin_user_email(_email);
  SELECT au.id INTO v_user_id
  FROM auth.users au
  WHERE lower(au.email) = lower(trim(_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := extensions.gen_random_uuid();
    v_app_meta := jsonb_build_object(
      'provider', 'email', 'providers', jsonb_build_array('email')
    );
    IF _modulos IS NOT NULL AND jsonb_array_length(_modulos) > 0 THEN
      v_app_meta := v_app_meta || jsonb_build_object('modulos', _modulos);
    END IF;

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      confirmation_sent_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token, aud, role
    ) VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000',
      lower(trim(_email)),
      extensions.crypt(_password, extensions.gen_salt('bf')),
      now(), now(), v_app_meta,
      jsonb_build_object(
        'name', trim(_first_name) || ' ' || trim(_last_name),
        'first_name', trim(_first_name), 'last_name', trim(_last_name)
      ),
      now(), now(), '', '', '', '', 'authenticated', 'authenticated'
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_user_id, v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(_email))),
      'email', lower(trim(_email)), now(), now(), now()
    );
  ELSE
    v_reused_auth_user := true;
    -- A senha e a identidade existentes nunca sao alteradas.
    IF _modulos IS NOT NULL AND jsonb_array_length(_modulos) > 0 THEN
      UPDATE auth.users au
      SET raw_app_meta_data =
            coalesce(au.raw_app_meta_data, '{}'::jsonb)
            || jsonb_build_object(
              'modulos',
              (
                SELECT coalesce(
                  jsonb_agg(module_name ORDER BY module_name), '[]'::jsonb
                )
                FROM (
                  SELECT DISTINCT module_name
                  FROM jsonb_array_elements_text(
                    coalesce(au.raw_app_meta_data -> 'modulos', '[]'::jsonb)
                    || _modulos
                  ) AS modules(module_name)
                ) unique_modules
              )
            ),
          updated_at = now()
      WHERE au.id = v_user_id;
    END IF;
  END IF;

  IF _papel = 'gestor' AND _setor_id IS NOT NULL THEN
    UPDATE public.perfis_usuarios
    SET ativo = false, updated_at = now()
    WHERE setor_id = _setor_id AND papel = 'gestor' AND ativo
      AND user_id <> v_user_id;
  END IF;

  SELECT pu.id INTO v_perfil_id
  FROM public.perfis_usuarios pu
  WHERE pu.user_id = v_user_id
    AND (
      (_papel = 'super_admin' AND pu.papel = 'super_admin')
      OR (_papel <> 'super_admin' AND pu.setor_id = _setor_id)
    )
  ORDER BY pu.ativo DESC, pu.created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_perfil_id IS NULL THEN
    INSERT INTO public.perfis_usuarios (
      user_id, setor_id, papel, nome, sobrenome, ativo, graduacao_id
    ) VALUES (
      v_user_id,
      CASE WHEN _papel = 'super_admin' THEN NULL ELSE _setor_id END,
      _papel, trim(_first_name), trim(_last_name), _active, _graduacao_id
    )
    RETURNING id INTO v_perfil_id;
  ELSE
    v_reused_profile := true;
    UPDATE public.perfis_usuarios
    SET papel = _papel,
        setor_id = CASE WHEN _papel = 'super_admin' THEN NULL ELSE _setor_id END,
        nome = trim(_first_name),
        sobrenome = trim(_last_name),
        ativo = _active,
        graduacao_id = _graduacao_id,
        updated_at = now()
    WHERE id = v_perfil_id;
  END IF;

  IF _setor_id = public.get_guarda_municipal_setor_id()
     AND _graduacao_id IS NOT NULL THEN
    PERFORM public.sync_guarda_usuario_link(v_user_id);
  END IF;

  INSERT INTO public.auditoria_logs (
    user_id, setor_id, entidade, entidade_id, acao, payload_resumido
  ) VALUES (
    v_requester_id,
    CASE WHEN _papel = 'super_admin' THEN NULL ELSE _setor_id END,
    'perfis_usuarios', v_perfil_id,
    CASE
      WHEN v_reused_profile THEN 'reprovision_admin_profile'
      WHEN v_reused_auth_user THEN 'provision_existing_auth_user'
      ELSE 'provision_admin_user'
    END,
    jsonb_build_object(
      'email', lower(trim(_email)), 'papel', _papel, 'active', _active,
      'reusedAuthUser', v_reused_auth_user,
      'reusedProfile', v_reused_profile
    )
  );

  RETURN jsonb_build_object(
    'success', true, 'userId', v_user_id, 'perfilId', v_perfil_id,
    'reusedAuthUser', v_reused_auth_user,
    'reusedProfile', v_reused_profile
  );
END;
$$;

REVOKE ALL ON FUNCTION public.provision_admin_user(
  text, text, text, text, uuid, public.papel_usuario, boolean, jsonb, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_admin_user(
  text, text, text, text, uuid, public.papel_usuario, boolean, jsonb, uuid
) TO authenticated;
