-- =====================================================
-- Migration: Preenche modulos em usuarios existentes
-- Define TODOS os modulos disponiveis para usuarios
-- admin que nao tenham modulos definidos em app_metadata
-- =====================================================

DO $$
DECLARE
  v_modulos jsonb;
  v_count int := 0;
BEGIN
  v_modulos := '["veiculos","concessionarios","credenciais","recursos","frota","documentos","midias"]'::jsonb;

  UPDATE auth.users
  SET raw_app_meta_data = 
      CASE 
        WHEN raw_app_meta_data IS NULL OR NOT (raw_app_meta_data ? 'modulos')
        THEN COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('modulos', v_modulos)
        ELSE raw_app_meta_data
      END,
      updated_at = now()
  WHERE id IN (
    SELECT pu.user_id
    FROM public.perfis_usuarios pu
    WHERE pu.papel IN ('admin_setor', 'tecnico')
      AND pu.ativo = true
      AND (
        raw_app_meta_data IS NULL
        OR NOT (raw_app_meta_data ? 'modulos')
      )
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Atualizados % usuarios sem modulos.', v_count;
END;
$$;
