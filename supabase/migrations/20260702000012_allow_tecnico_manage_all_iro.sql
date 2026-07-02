-- =====================================================
-- MIGRATION: Relax RLS policies for IRO module to allow técnicos with iros module
-- Updates iro_candidaturas, iro_horas_manuais, and iro_banco_horas policies
-- =====================================================

-- 1. iro_candidaturas
DROP POLICY IF EXISTS "Gestor can manage iro_candidaturas" ON public.iro_candidaturas;

CREATE POLICY "Gestor can manage iro_candidaturas"
ON public.iro_candidaturas
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

-- 2. iro_horas_manuais
DROP POLICY IF EXISTS "Gestor can manage iro_horas_manuais" ON public.iro_horas_manuais;

CREATE POLICY "Gestor can manage iro_horas_manuais"
ON public.iro_horas_manuais
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin_of_setor(setor_id)
  OR (
    EXISTS (
      SELECT 1 FROM public.perfis_usuarios pu
      WHERE pu.user_id = auth.uid()
        AND pu.ativo = true
        AND pu.papel = 'tecnico'::public.papel_usuario
        AND pu.setor_id = iro_horas_manuais.setor_id
    )
    AND coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'iros'
  )
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_admin_of_setor(setor_id)
  OR (
    EXISTS (
      SELECT 1 FROM public.perfis_usuarios pu
      WHERE pu.user_id = auth.uid()
        AND pu.ativo = true
        AND pu.papel = 'tecnico'::public.papel_usuario
        AND pu.setor_id = iro_horas_manuais.setor_id
    )
    AND coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'iros'
  )
);

-- 3. iro_banco_horas
DROP POLICY IF EXISTS "Gestor can view all iro_banco_horas" ON public.iro_banco_horas;

CREATE POLICY "Gestor can view all iro_banco_horas"
ON public.iro_banco_horas
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
      AND (
        pu.papel IN ('gestor', 'admin_setor')
        OR (
          pu.papel = 'tecnico'::public.papel_usuario
          AND coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'iros'
        )
      )
  )
);
