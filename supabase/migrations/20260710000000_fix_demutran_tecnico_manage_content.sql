-- =====================================================
-- Fix: permite que administrativos (papel tecnico)
-- do setor DEMUTRAN executem os RPCs de gestao do modulo
-- que dependem de can_manage_demutran_content().
-- Sem isso, a liberacao de veiculos recolhidos falha com
-- "Sem permissao para liberar este veiculo." para tecnicos.
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_manage_demutran_content(_setor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _setor_id IS NOT NULL
    AND _setor_id = public.get_demutran_setor_id()
    AND (
      public.is_admin_of_setor(_setor_id)
      OR EXISTS (
        SELECT 1
        FROM public.perfis_usuarios pu
        WHERE pu.user_id = auth.uid()
          AND pu.setor_id = _setor_id
          AND pu.papel = 'tecnico'::public.papel_usuario
          AND pu.ativo = true
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_demutran_content(uuid) TO authenticated;
