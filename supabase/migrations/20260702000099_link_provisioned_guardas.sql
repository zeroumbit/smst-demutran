-- =====================================================
-- MIGRATION: Link provisioned auth.users to guardas_municipais
-- Solves the issue where guardas_usuarios link table was empty
-- due to exceptions during initial provisioning run.
-- =====================================================

DO $$
DECLARE
  v_user RECORD;
  v_matricula TEXT;
  v_guarda_id UUID;
  v_count INTEGER := 0;
BEGIN
  FOR v_user IN 
    SELECT id, email 
    FROM auth.users 
    WHERE raw_user_meta_data->>'tipo' = 'guarda_municipal'
  LOOP
    -- Extract matricula from email, e.g. "gcm.3193@guardamunicipal.sistema" -> "3193"
    v_matricula := split_part(split_part(v_user.email, '@', 1), '.', 2);
    
    -- Find the guarda_municipal with this matricula (normalized)
    SELECT id INTO v_guarda_id
    FROM public.guardas_municipais
    WHERE regexp_replace(matricula, '^0+', '') = regexp_replace(v_matricula, '^0+', '')
    LIMIT 1;

    IF v_guarda_id IS NOT NULL THEN
      -- Link them in guardas_usuarios if not already linked
      INSERT INTO public.guardas_usuarios (guarda_id, usuario_id)
      VALUES (v_guarda_id, v_user.id)
      ON CONFLICT (guarda_id, usuario_id) DO NOTHING;
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Linked % guardas to their authenticated users.', v_count;
END $$;
