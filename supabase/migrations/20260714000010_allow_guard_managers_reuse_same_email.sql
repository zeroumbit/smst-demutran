-- =====================================================
-- MIGRATION: Allow Guarda managers to self-register as guard using the same email
-- Reuses the existing auth.users identity when:
-- 1. the email already belongs to a Guarda-sector gestor/admin_setor
-- 2. the administrative profile is functionally compatible with the guarda record
-- =====================================================

CREATE OR REPLACE FUNCTION public.criar_acesso_guarda(
  p_guarda_id uuid,
  p_email text,
  p_senha text,
  p_nome text DEFAULT NULL,
  p_apelido text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nome_exibir text;
  v_usuario_existente_id uuid;
  v_usuario_tecnico_id uuid;
  v_usuario_email_existente_id uuid;
  v_email_normalizado text;
  v_email_em_uso_por_outro boolean;
  v_matricula text;
  v_email_tecnico text;
  v_guarda_nome text;
  v_guarda_graduacao_id uuid;
  v_manager_compativel boolean := false;
BEGIN
  v_nome_exibir := COALESCE(NULLIF(trim(p_apelido), ''), NULLIF(trim(p_nome), ''), 'Guarda Municipal');
  v_email_normalizado := lower(trim(p_email));

  IF v_email_normalizado = '' THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Informe um e-mail válido.');
  END IF;

  SELECT gm.matricula, gm.nome, gm.graduacao_id
  INTO v_matricula, v_guarda_nome, v_guarda_graduacao_id
  FROM public.guardas_municipais gm
  WHERE gm.id = p_guarda_id
    AND gm.ativo = true
  LIMIT 1;

  IF v_matricula IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Guarda Municipal não encontrado.');
  END IF;

  v_email_tecnico := 'gcm.' || v_matricula || '@guardamunicipal.sistema';

  SELECT id
  INTO v_usuario_tecnico_id
  FROM auth.users
  WHERE lower(email) = lower(v_email_tecnico)
  LIMIT 1;

  SELECT usuario_id
  INTO v_usuario_existente_id
  FROM public.guardas_usuarios
  WHERE guarda_id = p_guarda_id
  ORDER BY created_at ASC
  LIMIT 1;

  SELECT id
  INTO v_usuario_email_existente_id
  FROM auth.users
  WHERE lower(email) = v_email_normalizado
  LIMIT 1;

  IF v_usuario_email_existente_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.guardas_usuarios gu
      WHERE gu.guarda_id = p_guarda_id
        AND gu.usuario_id = v_usuario_email_existente_id
    )
    INTO v_manager_compativel;

    IF NOT v_manager_compativel THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.perfis_usuarios pu
        WHERE pu.user_id = v_usuario_email_existente_id
          AND pu.setor_id = public.get_guarda_municipal_setor_id()
          AND pu.papel IN ('gestor'::public.papel_usuario, 'admin_setor'::public.papel_usuario)
          AND pu.ativo = true
          AND pu.graduacao_id = v_guarda_graduacao_id
          AND lower(trim(concat_ws(' ', pu.nome, pu.sobrenome))) = lower(trim(v_guarda_nome))
      )
      INTO v_manager_compativel;
    END IF;
  END IF;

  -- If the chosen email already belongs to the same functional manager/guarda,
  -- reuse that single auth identity instead of forcing a second account.
  IF v_manager_compativel AND v_usuario_email_existente_id IS NOT NULL THEN
    v_usuario_existente_id := v_usuario_email_existente_id;

    INSERT INTO public.guardas_usuarios (guarda_id, usuario_id)
    VALUES (p_guarda_id, v_usuario_existente_id)
    ON CONFLICT (guarda_id, usuario_id) DO NOTHING;
  ELSIF v_usuario_tecnico_id IS NOT NULL THEN
    v_usuario_existente_id := v_usuario_tecnico_id;

    INSERT INTO public.guardas_usuarios (guarda_id, usuario_id)
    VALUES (p_guarda_id, v_usuario_existente_id)
    ON CONFLICT (guarda_id, usuario_id) DO NOTHING;
  ELSIF v_usuario_existente_id IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Nenhum usuário auth pré-cadastrado foi localizado para este guarda.');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(email) = v_email_normalizado
      AND id <> COALESCE(v_usuario_existente_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  INTO v_email_em_uso_por_outro;

  IF v_email_em_uso_por_outro THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Este e-mail já está em uso por outro usuário.');
  END IF;

  UPDATE auth.users
  SET email = v_email_normalizado,
      encrypted_password = extensions.crypt(p_senha, extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmation_sent_at = COALESCE(confirmation_sent_at, now()),
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('name', v_nome_exibir, 'full_name', p_nome, 'tipo', 'guarda_municipal'),
      updated_at = now(),
      aud = 'authenticated',
      role = 'authenticated'
  WHERE id = v_usuario_existente_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Usuário auth não foi encontrado para atualização.');
  END IF;

  UPDATE auth.identities
  SET identity_data = COALESCE(identity_data, '{}'::jsonb) || jsonb_build_object('sub', v_usuario_existente_id::text, 'email', v_email_normalizado),
      provider_id = v_email_normalizado,
      last_sign_in_at = now(),
      updated_at = now()
  WHERE user_id = v_usuario_existente_id
    AND provider = 'email';

  IF NOT EXISTS (
    SELECT 1
    FROM auth.identities
    WHERE user_id = v_usuario_existente_id
      AND provider = 'email'
  ) THEN
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_usuario_existente_id,
      v_usuario_existente_id,
      jsonb_build_object('sub', v_usuario_existente_id::text, 'email', v_email_normalizado),
      'email',
      v_email_normalizado,
      now(), now(), now()
    );
  END IF;

  INSERT INTO public.guardas_usuarios (guarda_id, usuario_id)
  VALUES (p_guarda_id, v_usuario_existente_id)
  ON CONFLICT (guarda_id, usuario_id) DO NOTHING;

  UPDATE public.guardas_municipais
  SET email = v_email_normalizado,
      updated_at = now()
  WHERE id = p_guarda_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'user_id', v_usuario_existente_id,
    'acao', 'atualizado'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_acesso_guarda(uuid, text, text, text, text) TO anon;
