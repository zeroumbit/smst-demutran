-- =====================================================
-- MIGRATION: Deduplicate Guardas Municipais and standardize matricula formats
-- Removes leading zeros to prevent duplicate records (e.g. '3180' vs '03180')
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_kept_id uuid;
  v_dup_id uuid;
BEGIN
  -- 1. Loop through all normalized matriculas that have duplicates
  FOR r IN 
    SELECT ltrim(matricula, '0') as norm_matricula, count(*)
    FROM public.guardas_municipais
    GROUP BY ltrim(matricula, '0')
    HAVING count(*) > 1
  LOOP
    -- 2. Identify the kept ID (the one with CPF, or the one with a senha, or just the first one)
    SELECT id INTO v_kept_id
    FROM public.guardas_municipais
    WHERE ltrim(matricula, '0') = r.norm_matricula
    ORDER BY (cpf IS NOT NULL) DESC, (senha IS NOT NULL) DESC, created_at DESC
    LIMIT 1;

    -- 3. Loop through and delete the other duplicates
    FOR v_dup_id IN
      SELECT id
      FROM public.guardas_municipais
      WHERE ltrim(matricula, '0') = r.norm_matricula AND id <> v_kept_id
    LOOP
      -- Redirect references in guardas_usuarios
      -- If the kept ID already has a link to the same user in guardas_usuarios, delete the duplicate link instead of updating to avoid unique constraint violations
      UPDATE public.guardas_usuarios
      SET guarda_id = v_kept_id
      WHERE guarda_id = v_dup_id
        AND usuario_id NOT IN (
          SELECT usuario_id FROM public.guardas_usuarios WHERE guarda_id = v_kept_id
        );
      
      -- Delete any remaining duplicate links
      DELETE FROM public.guardas_usuarios WHERE guarda_id = v_dup_id;

      -- Finally, delete the duplicate guarda
      DELETE FROM public.guardas_municipais WHERE id = v_dup_id;
    END LOOP;
  END LOOP;

  -- 4. Normalize all remaining matriculas to remove leading zeros
  -- This will update them to have no leading zeros, e.g. '03180' -> '3180'
  UPDATE public.guardas_municipais
  SET matricula = ltrim(matricula, '0');
END $$;
