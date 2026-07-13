-- =====================================================
-- MBFT / Fiscalização: suportar gravidade "não aplicável"
--
-- O conjunto validado do MBFT possui 4 fichas cujo PDF informa
-- explicitamente que a gravidade é "Não aplicável". Esse valor
-- precisa existir no domínio para preservar fidelidade ao manual.
-- =====================================================

ALTER TABLE public.fiscalizacao_infracoes
  DROP CONSTRAINT IF EXISTS fiscalizacao_infracoes_gravidade_check;

ALTER TABLE public.fiscalizacao_infracoes
  ADD CONSTRAINT fiscalizacao_infracoes_gravidade_check
  CHECK (gravidade IN ('leve', 'media', 'grave', 'gravissima', 'nao_aplicavel'));
