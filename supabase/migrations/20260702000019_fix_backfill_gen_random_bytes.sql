-- =====================================================
-- MIGRATION: Fix provision_all_guardas_auth gen_random_bytes prefixing
-- Re-defines provision_all_guardas_auth using extensions.gen_random_bytes
-- =====================================================

CREATE OR REPLACE FUNCTION public.provision_all_guardas_auth()
RETURNS TABLE(guarda_id uuid, matricula text, status text, mensagem text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_guarda RECORD;
  v_user_id uuid;
  v_email text;
BEGIN
  FOR v_guarda IN
    SELECT gm.id, gm.matricula, gm.nome, COALESCE(gm.senha, 'temp123') as senha
    FROM public.guardas_municipais gm
    WHERE gm.ativo = true
      AND NOT EXISTS (
        SELECT 1 FROM public.guardas_usuarios gu WHERE gu.guarda_id = gm.id
      )
  LOOP
    v_email := 'gcm.' || v_guarda.matricula || '@guardamunicipal.sistema';

    BEGIN
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        v_email,
        extensions.crypt(v_guarda.senha, extensions.gen_salt('bf')),
        now(),
        jsonb_build_object(
          'provider', 'email',
          'providers', ARRAY['email'],
          'created_via', 'backfill_guardas_auth'
        ),
        jsonb_build_object('name', v_guarda.nome, 'tipo', 'guarda_municipal'),
        now(),
        now(),
        encode(extensions.gen_random_bytes(32), 'hex'),
        '',
        '',
        ''
      )
      RETURNING id INTO v_user_id;

      INSERT INTO public.guardas_usuarios (guarda_id, usuario_id)
      VALUES (v_guarda.id, v_user_id);

      RETURN QUERY
      SELECT v_guarda.id, v_guarda.matricula, 'criado'::text, ('Usuário auth criado: ' || v_email)::text;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY
      SELECT v_guarda.id, v_guarda.matricula, 'erro'::text, SQLERRM::text;
    END;
  END LOOP;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT NULL::uuid, NULL::text, 'sem_pendentes'::text, 'Todos os guardas já possuem vinculação auth.'::text;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_all_guardas_auth() TO authenticated;
