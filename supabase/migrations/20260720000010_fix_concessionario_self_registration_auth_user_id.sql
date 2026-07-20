-- Corrige autocadastro de concessionario.
-- A RPC anterior inseria em auth.users sem informar id, causando:
-- null value in column "id" of relation "users" violates not-null constraint.

CREATE OR REPLACE FUNCTION public.criar_acesso_concessionario(
  p_concessionario_id uuid,
  p_email text,
  p_senha text,
  p_nome text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_concessionario public.demutran_concessionarios%ROWTYPE;
  v_cpf_limpo text;
  v_user_id uuid;
  v_email_normalizado text;
  v_nome_exibir text;
  v_email_em_uso_por_outro boolean;
BEGIN
  v_email_normalizado := lower(trim(coalesce(p_email, '')));

  IF v_email_normalizado = '' THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Informe um e-mail valido.');
  END IF;

  IF length(coalesce(p_senha, '')) < 6 THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'A senha precisa ter pelo menos 6 caracteres.');
  END IF;

  SELECT *
  INTO v_concessionario
  FROM public.demutran_concessionarios
  WHERE id = p_concessionario_id
    AND ativo = true;

  IF v_concessionario.id IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Concessionario nao encontrado ou inativo.');
  END IF;

  v_cpf_limpo := regexp_replace(coalesce(v_concessionario.cpf, ''), '\D', '', 'g');
  IF char_length(v_cpf_limpo) <> 11 THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'CPF invalido no cadastro. Procure o DEMUTRAN.');
  END IF;

  SELECT usuario_id
  INTO v_user_id
  FROM public.demutran_concessionario_usuarios
  WHERE concessionario_id = p_concessionario_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_concessionario.data_autocadastro IS NOT NULL AND v_user_id IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Este concessionario ja possui cadastro de acesso.');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(email) = v_email_normalizado
      AND id <> COALESCE(v_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) INTO v_email_em_uso_por_outro;

  IF v_email_em_uso_por_outro THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Este e-mail ja esta em uso por outro usuario.');
  END IF;

  v_nome_exibir := COALESCE(NULLIF(trim(p_nome), ''), NULLIF(trim(v_concessionario.titular_nome), ''), 'Concessionario');

  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET email = v_email_normalizado,
        encrypted_password = extensions.crypt(p_senha, extensions.gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        confirmation_sent_at = COALESCE(confirmation_sent_at, now()),
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('name', v_nome_exibir, 'full_name', v_nome_exibir, 'tipo', 'concessionario'),
        updated_at = now(),
        aud = 'authenticated',
        role = 'authenticated'
    WHERE id = v_user_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Usuario de autenticacao vinculado nao foi encontrado.');
    END IF;

    UPDATE auth.identities
    SET identity_data = COALESCE(identity_data, '{}'::jsonb) || jsonb_build_object('sub', v_user_id::text, 'email', v_email_normalizado),
        provider_id = v_email_normalizado,
        last_sign_in_at = now(),
        updated_at = now()
    WHERE user_id = v_user_id
      AND provider = 'email';

    IF NOT EXISTS (
      SELECT 1
      FROM auth.identities
      WHERE user_id = v_user_id
        AND provider = 'email'
    ) THEN
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      )
      VALUES (
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_email_normalizado),
        'email',
        v_email_normalizado,
        now(),
        now(),
        now()
      );
    END IF;
  ELSE
    v_user_id := extensions.gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token,
      aud,
      role
    )
    VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_email_normalizado,
      extensions.crypt(p_senha, extensions.gen_salt('bf')),
      now(),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('name', v_nome_exibir, 'full_name', v_nome_exibir, 'tipo', 'concessionario'),
      now(),
      now(),
      '',
      '',
      '',
      '',
      'authenticated',
      'authenticated'
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email_normalizado),
      'email',
      v_email_normalizado,
      now(),
      now(),
      now()
    );

    INSERT INTO public.demutran_concessionario_usuarios (concessionario_id, usuario_id)
    VALUES (p_concessionario_id, v_user_id);
  END IF;

  INSERT INTO public.demutran_concessionario_acessos (
    concessionario_id,
    cpf_normalizado,
    senha_hash
  )
  VALUES (
    p_concessionario_id,
    v_cpf_limpo,
    extensions.crypt(p_senha, extensions.gen_salt('bf'))
  )
  ON CONFLICT (concessionario_id)
  DO UPDATE SET
    cpf_normalizado = EXCLUDED.cpf_normalizado,
    senha_hash = EXCLUDED.senha_hash,
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = now();

  UPDATE public.demutran_concessionarios
  SET
    email = v_email_normalizado,
    data_autocadastro = COALESCE(data_autocadastro, now()),
    updated_at = now()
  WHERE id = p_concessionario_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'user_id', v_user_id,
    'concessionario_id', p_concessionario_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_acesso_concessionario(uuid, text, text, text) TO anon, authenticated;
