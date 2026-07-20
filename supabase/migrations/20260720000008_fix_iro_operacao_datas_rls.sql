-- =====================================================
-- Fix RLS policy for iro_operacao_datas to allow tecnico
-- with iros module to manage operation dates.
-- Previous policy only checked is_admin_of_setor (gestor
-- and admin_setor), missing the tecnico role.
-- =====================================================

DROP POLICY IF EXISTS "Gestors can manage iro_operacao_datas" ON public.iro_operacao_datas;

CREATE POLICY "Gestors can manage iro_operacao_datas"
ON public.iro_operacao_datas
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.iro_operacoes o
    WHERE o.id = operacao_id
      AND (
        public.is_admin_of_setor(o.setor_id)
        OR (
          EXISTS (
            SELECT 1 FROM public.perfis_usuarios pu
            WHERE pu.user_id = auth.uid()
              AND pu.ativo = true
              AND pu.papel = 'tecnico'::public.papel_usuario
              AND pu.setor_id = o.setor_id
          )
          AND coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'iros'
        )
      )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.iro_operacoes o
    WHERE o.id = operacao_id
      AND (
        public.is_admin_of_setor(o.setor_id)
        OR (
          EXISTS (
            SELECT 1 FROM public.perfis_usuarios pu
            WHERE pu.user_id = auth.uid()
              AND pu.ativo = true
              AND pu.papel = 'tecnico'::public.papel_usuario
              AND pu.setor_id = o.setor_id
          )
          AND coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'iros'
        )
      )
  )
);
