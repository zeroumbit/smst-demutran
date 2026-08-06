-- =====================================================
-- RH: protecoes contra duplicidade na importacao em massa
-- Date: 2026-08-08 02:00:00
-- =====================================================

-- A constraint original ja bloqueia (setor_id, matricula) exatamente igual.
-- Estes indices fecham brechas comuns de planilha: espacos, caixa diferente,
-- CPF com/sem mascara e codigo de servidor preenchido em formatos distintos.

CREATE UNIQUE INDEX IF NOT EXISTS rh_servidores_matricula_norm_unq
  ON public.rh_servidores (setor_id, lower(btrim(matricula)))
  WHERE btrim(matricula) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS rh_servidores_cpf_digits_unq
  ON public.rh_servidores (setor_id, regexp_replace(cpf, '[^0-9]', '', 'g'))
  WHERE cpf IS NOT NULL
    AND regexp_replace(cpf, '[^0-9]', '', 'g') <> '';

CREATE UNIQUE INDEX IF NOT EXISTS rh_servidores_cod_servidor_norm_unq
  ON public.rh_servidores (setor_id, lower(btrim(cod_servidor)))
  WHERE cod_servidor IS NOT NULL
    AND btrim(cod_servidor) <> '';

CREATE INDEX IF NOT EXISTS rh_servidores_nome_norm_idx
  ON public.rh_servidores (setor_id, lower(btrim(nome_completo)));