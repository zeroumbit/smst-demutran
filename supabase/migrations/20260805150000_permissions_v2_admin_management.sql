-- =====================================================
-- Migration: Permissions V2 - Gestao de perfis funcionais
--            e excecoes individuais
-- Fase: Entrega 3
-- Descricao:
--   1. Estende provision_admin_user com _perfil_funcional_id
--      e _permissoes_individuais (mantendo _modulos na transicao).
--   2. RPCs de gestao: definir perfil funcional, upsert/remover
--      excecao individual, listar permissoes de um usuario.
--   3. Auditoria em todas as acoes.
-- Reversivel: DROP das funcoes novas e re-criacao da provision
--             original (contida em 20260724000001_*).
-- =====================================================

-- -----------------------------------------------------
-- 1. provision_admin_user estendida
--    Remove overloads antigos (8 e 9 params) para que a
--    assinatura nova (11 params, com defaults) seja unica.
-- -----------------------------------------------------
DROP FUNCTION IF EXISTS public.provision_admin_user(
  text, text, text, text, uuid, public.papel_usuario, boolean, jsonb
);
DROP FUNCTION IF EXISTS public.provision_admin_user(
  text, text, text, text, uuid, public.papel_usuario, boolean, jsonb, uuid
);

CREATE OR REPLACE FUNCTION public.provision_admin_user(
  _email text,
  _password text,
  _first_name text,
  _last_name text,
  _setor_id uuid,
  _papel public.papel_usuario,
  _active boolean DEFAULT true,
  _modulos jsonb DEFAULT NULL,
  _graduacao_id uuid DEFAULT NULL,
  _perfil_funcional_id uuid DEFAULT NULL,
  _permissoes_individuais jsonb DEFAULT NULL
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
  v_item jsonb;
  v_perm_id uuid;
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
  IF _permissoes_individuais IS NOT NULL AND jsonb_typeof(_permissoes_individuais) <> 'array' THEN
    RETURN jsonb_build_object('error', 'Individual permissions must be an array.');
  END IF;
  -- Perfil funcional deve pertencer ao mesmo setor (ou ser global)
  IF _perfil_funcional_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.perfis_funcionais pf
       WHERE pf.id = _perfil_funcional_id
         AND pf.ativo
         AND (pf.setor_id IS NULL OR pf.setor_id = _setor_id)
     ) THEN
    RETURN jsonb_build_object('error', 'Perfil funcional invalido ou de outro setor.');
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
      user_id, setor_id, papel, nome, sobrenome, ativo, graduacao_id,
      perfil_funcional_id
    ) VALUES (
      v_user_id,
      CASE WHEN _papel = 'super_admin' THEN NULL ELSE _setor_id END,
      _papel, trim(_first_name), trim(_last_name), _active, _graduacao_id,
      _perfil_funcional_id
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
        perfil_funcional_id = _perfil_funcional_id,
        updated_at = now()
    WHERE id = v_perfil_id;
  END IF;

  -- Sincroniza excecoes individuais (upsert aditivo, nunca remove sem pedido)
  IF _permissoes_individuais IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(_permissoes_individuais)
    LOOP
      SELECT ps.id INTO v_perm_id
      FROM public.permissoes_sistema ps
      WHERE ps.codigo = (v_item ->> 'codigo') AND ps.ativo
      LIMIT 1;
      IF v_perm_id IS NULL THEN
        RETURN jsonb_build_object(
          'error', 'Permissao desconhecida no catalogo: ' || (v_item ->> 'codigo')
        );
      END IF;
      INSERT INTO public.usuario_permissoes (
        perfil_usuario_id, permissao_id, efeito, motivo, created_by
      ) VALUES (
        v_perfil_id, v_perm_id,
        CASE WHEN (v_item ->> 'efeito') = 'NEGAR' THEN 'NEGAR' ELSE 'PERMITIR' END,
        v_item ->> 'motivo', v_requester_id
      )
      ON CONFLICT (perfil_usuario_id, permissao_id)
      DO UPDATE SET
        efeito = CASE WHEN (v_item ->> 'efeito') = 'NEGAR' THEN 'NEGAR' ELSE 'PERMITIR' END,
        motivo = v_item ->> 'motivo',
        created_by = v_requester_id;
    END LOOP;
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
      'perfilFuncional', _perfil_funcional_id,
      'individualPerms', coalesce(jsonb_array_length(_permissoes_individuais), 0),
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
  text, text, text, text, uuid, public.papel_usuario, boolean, jsonb, uuid, uuid, jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_admin_user(
  text, text, text, text, uuid, public.papel_usuario, boolean, jsonb, uuid, uuid, jsonb
) TO authenticated;

-- -----------------------------------------------------
-- 2. Definir perfil funcional de um usuario (NULL limpa)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_usuario_perfil_funcional(
  _perfil_usuario_id uuid,
  _perfil_funcional_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_requester_id uuid;
  v_target_setor uuid;
  v_perfil_setor uuid;
  v_nome_perfil text;
BEGIN
  v_requester_id := auth.uid();
  IF v_requester_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;

  SELECT setor_id INTO v_target_setor
  FROM public.perfis_usuarios
  WHERE id = _perfil_usuario_id;

  IF v_target_setor IS NULL THEN
    RETURN jsonb_build_object('error', 'Perfil de usuario nao encontrado.');
  END IF;

  IF NOT (public.is_super_admin() OR public.is_gestor_setor(v_target_setor)) THEN
    RETURN jsonb_build_object('error', 'Sem permissao para gerenciar este usuario.');
  END IF;

  IF _perfil_funcional_id IS NOT NULL THEN
    SELECT pf.setor_id, pf.nome
    INTO v_perfil_setor, v_nome_perfil
    FROM public.perfis_funcionais pf
    WHERE pf.id = _perfil_funcional_id AND pf.ativo;

    IF v_nome_perfil IS NULL THEN
      RETURN jsonb_build_object('error', 'Perfil funcional nao encontrado.');
    END IF;
    IF v_perfil_setor IS NOT NULL AND v_perfil_setor <> v_target_setor THEN
      RETURN jsonb_build_object('error', 'Perfil funcional pertence a outro setor.');
    END IF;
  END IF;

  UPDATE public.perfis_usuarios
  SET perfil_funcional_id = _perfil_funcional_id, updated_at = now()
  WHERE id = _perfil_usuario_id;

  INSERT INTO public.auditoria_logs (
    user_id, setor_id, entidade, entidade_id, acao, payload_resumido
  ) VALUES (
    v_requester_id, v_target_setor, 'perfis_usuarios', _perfil_usuario_id,
    CASE WHEN _perfil_funcional_id IS NULL THEN 'limpar_perfil_funcional'
         ELSE 'definir_perfil_funcional' END,
    jsonb_build_object('perfil_funcional_id', _perfil_funcional_id,
                       'perfil_funcional_nome', v_nome_perfil)
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- -----------------------------------------------------
-- 3. Upsert de excecao individual
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_usuario_permissao(
  _perfil_usuario_id uuid,
  _codigo text,
  _efeito text,
  _motivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_requester_id uuid;
  v_target_setor uuid;
  v_perm_id uuid;
BEGIN
  v_requester_id := auth.uid();
  IF v_requester_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;
  IF _efeito NOT IN ('PERMITIR', 'NEGAR') THEN
    RETURN jsonb_build_object('error', 'Efeito deve ser PERMITIR ou NEGAR.');
  END IF;

  SELECT setor_id INTO v_target_setor
  FROM public.perfis_usuarios
  WHERE id = _perfil_usuario_id;
  IF v_target_setor IS NULL THEN
    RETURN jsonb_build_object('error', 'Perfil de usuario nao encontrado.');
  END IF;
  IF NOT (public.is_super_admin() OR public.is_gestor_setor(v_target_setor)) THEN
    RETURN jsonb_build_object('error', 'Sem permissao para gerenciar este usuario.');
  END IF;

  SELECT ps.id INTO v_perm_id
  FROM public.permissoes_sistema ps
  WHERE ps.codigo = _codigo AND ps.ativo
  LIMIT 1;
  IF v_perm_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Permissao desconhecida no catalogo: ' || _codigo);
  END IF;

  INSERT INTO public.usuario_permissoes (
    perfil_usuario_id, permissao_id, efeito, motivo, created_by
  ) VALUES (
    _perfil_usuario_id, v_perm_id, _efeito, _motivo, v_requester_id
  )
  ON CONFLICT (perfil_usuario_id, permissao_id)
  DO UPDATE SET
    efeito = _efeito, motivo = _motivo, created_by = v_requester_id;

  INSERT INTO public.auditoria_logs (
    user_id, setor_id, entidade, entidade_id, acao, payload_resumido
  ) VALUES (
    v_requester_id, v_target_setor, 'usuario_permissoes', v_perm_id,
    'upsert_usuario_permissao',
    jsonb_build_object('codigo', _codigo, 'efeito', _efeito, 'motivo', _motivo)
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- -----------------------------------------------------
-- 4. Remover excecao individual
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_usuario_permissao(
  _perfil_usuario_id uuid,
  _codigo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_requester_id uuid;
  v_target_setor uuid;
  v_perm_id uuid;
BEGIN
  v_requester_id := auth.uid();
  IF v_requester_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;

  SELECT setor_id INTO v_target_setor
  FROM public.perfis_usuarios
  WHERE id = _perfil_usuario_id;
  IF v_target_setor IS NULL THEN
    RETURN jsonb_build_object('error', 'Perfil de usuario nao encontrado.');
  END IF;
  IF NOT (public.is_super_admin() OR public.is_gestor_setor(v_target_setor)) THEN
    RETURN jsonb_build_object('error', 'Sem permissao para gerenciar este usuario.');
  END IF;

  SELECT ps.id INTO v_perm_id
  FROM public.permissoes_sistema ps
  WHERE ps.codigo = _codigo
  LIMIT 1;
  IF v_perm_id IS NULL THEN
    RETURN jsonb_build_object('success', true);
  END IF;

  DELETE FROM public.usuario_permissoes
  WHERE perfil_usuario_id = _perfil_usuario_id AND permissao_id = v_perm_id;

  INSERT INTO public.auditoria_logs (
    user_id, setor_id, entidade, entidade_id, acao, payload_resumido
  ) VALUES (
    v_requester_id, v_target_setor, 'usuario_permissoes', v_perm_id,
    'remove_usuario_permissao',
    jsonb_build_object('codigo', _codigo)
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- -----------------------------------------------------
-- 5. Listar permissoes efetivas de um usuario
--    (catalogo + excecoes + perfil funcional, marcando sensiveis)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_usuario_permissoes(
  _perfil_usuario_id uuid
)
RETURNS TABLE (
  permissao_id uuid,
  codigo text,
  nome text,
  descricao text,
  sensivel boolean,
  modulo_slug text,
  efeito text,
  origem text,
  pode bool
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_target_setor uuid;
  v_pf uuid;
BEGIN
  SELECT pu.setor_id, pu.perfil_funcional_id
  INTO v_target_setor, v_pf
  FROM public.perfis_usuarios pu
  WHERE pu.id = _perfil_usuario_id;

  IF v_target_setor IS NULL THEN
    RAISE EXCEPTION 'Perfil de usuario nao encontrado.';
  END IF;
  IF NOT (public.is_super_admin() OR public.is_gestor_setor(v_target_setor)
          OR EXISTS (
            SELECT 1 FROM public.perfis_usuarios pu
            WHERE pu.id = _perfil_usuario_id AND pu.user_id = auth.uid()
          )) THEN
    RAISE EXCEPTION 'Sem permissao para consultar este usuario.';
  END IF;

  RETURN QUERY
  SELECT
    ps.id AS permissao_id,
    ps.codigo,
    ps.nome,
    ps.descricao,
    ps.sensivel,
    sm.slug AS modulo_slug,
    up.efeito::text AS efeito,
    CASE
      WHEN up.efeito IS NOT NULL THEN 'excecao'
      WHEN pfp.permissao_id IS NOT NULL THEN 'perfil_funcional'
      ELSE 'catalogo'
    END AS origem,
    public.tem_permissao(ps.codigo) AS pode
  FROM public.permissoes_sistema ps
  JOIN public.setor_modulos sm ON sm.id = ps.modulo_id
  LEFT JOIN public.usuario_permissoes up
    ON up.permissao_id = ps.id AND up.perfil_usuario_id = _perfil_usuario_id
  LEFT JOIN public.perfil_funcional_permissoes pfp
    ON pfp.permissao_id = ps.id AND pfp.perfil_funcional_id = v_pf
  WHERE ps.ativo
    AND sm.ativo
    AND (
      sm.setor_id = v_target_setor
      OR up.permissao_id IS NOT NULL
    )
  ORDER BY sm.slug, ps.acao;
END;
$$;

-- -----------------------------------------------------
-- 6. GRANTs
-- -----------------------------------------------------
GRANT EXECUTE ON FUNCTION public.set_usuario_perfil_funcional(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_usuario_permissao(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_usuario_permissao(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_usuario_permissoes(uuid) TO authenticated;
