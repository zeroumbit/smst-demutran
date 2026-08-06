-- =====================================================
-- Migration: Ficha Completa do Servidor RH (63 campos do SEC SEGURANCA.xlsx)
-- Date: 2026-08-08 01:00:00
-- =====================================================

ALTER TABLE public.rh_servidores
  -- Identificacao & Pessoais
  ADD COLUMN IF NOT EXISTS cod_servidor text,
  ADD COLUMN IF NOT EXISTS naturalidade text,
  ADD COLUMN IF NOT EXISTS mes_aniversario text,
  ADD COLUMN IF NOT EXISTS nome_pai text,
  ADD COLUMN IF NOT EXISTS nome_mae text,
  ADD COLUMN IF NOT EXISTS nome_conjuge text,

  -- Documentacao
  ADD COLUMN IF NOT EXISTS rg_numero text,
  ADD COLUMN IF NOT EXISTS rg_orgao text,
  ADD COLUMN IF NOT EXISTS rg_emissao date,
  ADD COLUMN IF NOT EXISTS pis_pasep text,
  ADD COLUMN IF NOT EXISTS data_pis_pasep date,
  ADD COLUMN IF NOT EXISTS ctps_numero text,
  ADD COLUMN IF NOT EXISTS ctps_serie text,
  ADD COLUMN IF NOT EXISTS ctps_uf text,
  ADD COLUMN IF NOT EXISTS titulo_eleitor text,
  ADD COLUMN IF NOT EXISTS titulo_zona text,
  ADD COLUMN IF NOT EXISTS titulo_secao text,
  ADD COLUMN IF NOT EXISTS reservista text,
  ADD COLUMN IF NOT EXISTS cnh_numero text,
  ADD COLUMN IF NOT EXISTS cnh_categoria text,

  -- Contato & Endereco
  ADD COLUMN IF NOT EXISTS celular text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS cep text,

  -- Vinculo & Cargo (Funcional)
  ADD COLUMN IF NOT EXISTS data_base date,
  ADD COLUMN IF NOT EXISTS carga_horaria integer,
  ADD COLUMN IF NOT EXISTS inicio_contrato date,
  ADD COLUMN IF NOT EXISTS final_contrato date,
  ADD COLUMN IF NOT EXISTS secretaria text,
  ADD COLUMN IF NOT EXISTS cod_setor text,
  ADD COLUMN IF NOT EXISTS setor_nome text,
  ADD COLUMN IF NOT EXISTS funcao text,
  ADD COLUMN IF NOT EXISTS vinculo text,
  ADD COLUMN IF NOT EXISTS tipo_admissao text,
  ADD COLUMN IF NOT EXISTS tipo_previdencia text,
  ADD COLUMN IF NOT EXISTS natureza_vinculo text,

  -- Atos Administrativos
  ADD COLUMN IF NOT EXISTS num_expediente text,
  ADD COLUMN IF NOT EXISTS data_expediente date,
  ADD COLUMN IF NOT EXISTS num_amparo text,
  ADD COLUMN IF NOT EXISTS data_amparo date,
  ADD COLUMN IF NOT EXISTS senha_contracheque text,

  -- Dados Bancarios & Salarios
  ADD COLUMN IF NOT EXISTS banco_codigo text,
  ADD COLUMN IF NOT EXISTS agencia_dv text,
  ADD COLUMN IF NOT EXISTS conta_dv text,
  ADD COLUMN IF NOT EXISTS banco_operacao text,
  ADD COLUMN IF NOT EXISTS salario_base numeric(10,2),
  ADD COLUMN IF NOT EXISTS salario_familia numeric(10,2);
