-- =====================================================
-- Fix: permite que usuarios com papel admin_setor (alem
-- de gestor) possam gerenciar conteudo do setor.
-- A migration 20260624160000 removeu admin_setor de
-- is_admin_of_setor, mas o frontend ainda utiliza esse
-- papel nas rotas e permissoes. Com isso, usuarios
-- admin_setor conseguiam acessar as paginas mas tinham
-- suas operacoes de escrita bloqueadas pelo RLS.
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin_of_setor(_setor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.perfis_usuarios
      WHERE user_id = auth.uid()
        AND setor_id = _setor_id
        AND papel IN ('gestor'::public.papel_usuario, 'admin_setor'::public.papel_usuario)
        AND ativo = true
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_of_setor(uuid) TO authenticated;
