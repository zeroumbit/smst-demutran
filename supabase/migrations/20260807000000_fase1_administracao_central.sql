-- =====================================================
-- Fase 1 - Administracao Central
-- Novo setor para areas administrativas internas
-- (RH, folha de pagamento, almoxarifado e rancho)
-- Perfis funcionais administrativos (multi-funcoes)
-- =====================================================

-- 1. Novo setor: Administracao Central
INSERT INTO public.setores (nome, slug, descricao, ativo)
VALUES (
  'Administracao Central',
  'administracao',
  'Areas administrativas internas: RH, folha de pagamento, almoxarifado e rancho.',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Perfis funcionais administrativos (vinculados ao novo setor)
WITH s AS (
  SELECT id FROM public.setores WHERE slug = 'administracao'
)
INSERT INTO public.perfis_funcionais (setor_id, nome, descricao)
SELECT s.id, p.nome, p.descricao
FROM s
CROSS JOIN (
  VALUES
    ('Gestor de RH', 'Cadastro e gestao de servidores, folha de ponto, ferias, atestados e licencas'),
    ('Analista de Folha', 'Folha de pagamento: vencimentos, descontos e geracao de folha mensal'),
    ('Almoxarife', 'Almoxarifado: controle de estoque, insumos, entradas e saidas'),
    ('Gestor de Rancho', 'Gestao de rancho: refeicoes, compras e consumo diario'),
    ('Auxiliar Administrativo', 'Apoio administrativo geral com acesso de consulta')
) AS p(nome, descricao)
ON CONFLICT (setor_id, nome) DO NOTHING;

-- Nota: os modulos (recursos_humanos, folha_pagamento, almoxarifado,
-- gestao_rancho) e suas permissoes serao criados na Fase 2.
