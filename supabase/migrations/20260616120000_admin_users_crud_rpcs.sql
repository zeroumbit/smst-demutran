-- =====================================================
-- Migration: RPCs para super admin gerenciar usuarios
-- Ativar, desativar, editar e excluir perfis
-- =====================================================

-- Ativar perfil (reativar)
CREATE OR REPLACE FUNCTION public.activate_profile(_perfil_id uuid)
RETURNS public.perfis_usuarios
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_row public.perfis_usuarios;
BEGIN
  SELECT * INTO profile_row FROM public.perfis_usuarios WHERE id = _perfil_id;

  IF profile_row.id IS NULL THEN
    RAISE EXCEPTION 'Perfil nao encontrado.';
  END IF;

  IF NOT public.is_super_admin() AND NOT public.is_admin_of_setor(profile_row.setor_id) THEN
    RAISE EXCEPTION 'Sem permissao para reativar este perfil.';
  END IF;

  UPDATE public.perfis_usuarios
  SET ativo = true, updated_at = now()
  WHERE id = _perfil_id
  RETURNING * INTO profile_row;

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (auth.uid(), profile_row.setor_id, 'perfis_usuarios', profile_row.id, 'activate_profile', jsonb_build_object('papel', profile_row.papel));

  RETURN profile_row;
END;
$$;

-- Editar perfil (nome, sobrenome, papel, setor)
CREATE OR REPLACE FUNCTION public.update_profile(
  _perfil_id uuid,
  _nome text DEFAULT NULL,
  _sobrenome text DEFAULT NULL,
  _papel public.papel_usuario DEFAULT NULL,
  _setor_id uuid DEFAULT NULL
)
RETURNS public.perfis_usuarios
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_row public.perfis_usuarios;
BEGIN
  SELECT * INTO profile_row FROM public.perfis_usuarios WHERE id = _perfil_id;

  IF profile_row.id IS NULL THEN
    RAISE EXCEPTION 'Perfil nao encontrado.';
  END IF;

  IF NOT public.is_super_admin() AND NOT public.is_admin_of_setor(profile_row.setor_id) THEN
    RAISE EXCEPTION 'Sem permissao para editar este perfil.';
  END IF;

  UPDATE public.perfis_usuarios
  SET
    nome = COALESCE(_nome, nome),
    sobrenome = COALESCE(_sobrenome, sobrenome),
    papel = COALESCE(_papel, papel),
    setor_id = CASE WHEN _papel = 'super_admin'::public.papel_usuario THEN NULL ELSE COALESCE(_setor_id, setor_id) END,
    updated_at = now()
  WHERE id = _perfil_id
  RETURNING * INTO profile_row;

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (auth.uid(), profile_row.setor_id, 'perfis_usuarios', profile_row.id, 'update_profile', jsonb_build_object('papel', profile_row.papel));

  RETURN profile_row;
END;
$$;

-- Excluir perfil (hard delete do perfil, nao do auth user)
CREATE OR REPLACE FUNCTION public.delete_profile(_perfil_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_row public.perfis_usuarios;
BEGIN
  SELECT * INTO profile_row FROM public.perfis_usuarios WHERE id = _perfil_id;

  IF profile_row.id IS NULL THEN
    RAISE EXCEPTION 'Perfil nao encontrado.';
  END IF;

  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Somente super admin pode excluir perfis.';
  END IF;

  DELETE FROM public.auditoria_logs WHERE entidade = 'perfis_usuarios' AND entidade_id = _perfil_id;
  DELETE FROM public.perfis_usuarios WHERE id = _perfil_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile(uuid, text, text, public.papel_usuario, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_profile(uuid) TO authenticated;
