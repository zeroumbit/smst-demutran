-- =====================================================
-- MIGRATION: Grant permissions for IRO Module tables and functions
-- =====================================================

-- Grant table permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.iro_operacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.iro_candidaturas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.iro_horas_manuais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.iro_banco_horas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.iro_notificacoes TO authenticated;

-- Grant function execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.verificar_disponibilidade_iro(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.candidatar_se_iro(uuid, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_banco_horas_iro(uuid, date) TO authenticated;
