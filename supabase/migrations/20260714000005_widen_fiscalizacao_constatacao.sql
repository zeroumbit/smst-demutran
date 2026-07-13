-- =====================================================
-- MBFT / Fiscalização: ampliar campo de constatação
--
-- O dataset validado do MBFT contém descrições de constatação
-- acima de 50 caracteres. O tipo anterior bloqueava a seed.
-- =====================================================

ALTER TABLE public.fiscalizacao_infracoes
  ALTER COLUMN constatacao TYPE text;
