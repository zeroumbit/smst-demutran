-- =====================================================
-- Migration: Criar/garantir super admin (smstcaninde@gmail.com)
-- Fase: Apos Fase 3
-- Descricao: Cria ou atualiza o perfil super_admin para o
--           email smstcaninde@gmail.com.
--           Idempotente: pode ser executada multiplas vezes.
-- =====================================================

DO $$
DECLARE
  v_user_id uuid;
  v_perfil_id uuid;
BEGIN
  -- Busca o usuario pelo email (case-insensitive)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower('smstcaninde@gmail.com');

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario smstcaninde@gmail.com nao encontrado no Auth. Crie-o manualmente no Supabase Auth antes de aplicar esta migration.';
  END IF;

  -- Remove registros inativos duplicados do mesmo usuario (limpeza)
  DELETE FROM public.perfis_usuarios
  WHERE user_id = v_user_id
    AND papel = 'super_admin'::public.papel_usuario
    AND ativo = false;

  -- Tenta inserir; se ja existir super_admin ativo, atualiza
  INSERT INTO public.perfis_usuarios (user_id, setor_id, papel, ativo)
  VALUES (v_user_id, NULL, 'super_admin'::public.papel_usuario, true)
  ON CONFLICT (user_id) WHERE papel = 'super_admin' AND ativo = true
  DO UPDATE SET updated_at = now();

  -- Pega o ID do perfil ativo (agora deve ser unico)
  SELECT id INTO v_perfil_id
  FROM public.perfis_usuarios
  WHERE user_id = v_user_id
    AND papel = 'super_admin'::public.papel_usuario
    AND ativo = true
  LIMIT 1;

  -- Registra na auditoria
  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (
    v_user_id,
    NULL,
    'perfis_usuarios',
    v_perfil_id,
    'migration_create_super_admin',
    jsonb_build_object('email', 'smstcaninde@gmail.com', 'papel', 'super_admin')
  );

  RAISE NOTICE 'Super admin garantido para smstcaninde@gmail.com (perfil: %)', v_perfil_id;
END $$;
