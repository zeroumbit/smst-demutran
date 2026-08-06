-- =====================================================
-- Fase 2 - Modulos administrativos (Administracao Central)
-- Recursos Humanos, Folha de Pagamento, Almoxarifado e Rancho
-- =====================================================

-- 0. Funcao auxiliar: setor da Administracao Central
CREATE OR REPLACE FUNCTION public.get_administracao_setor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id
  FROM public.setores
  WHERE slug = 'administracao'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_administracao_setor_id() TO authenticated;

-- 1. Modulos no catalogo (setor_modulos)
INSERT INTO public.setor_modulos (setor_id, slug, prefixo, nome, ativo)
SELECT s.id, m.slug, m.prefixo, m.nome, true
FROM public.setores s
JOIN (
  VALUES
    ('administracao', 'recursos_humanos', 'administracao.recursos_humanos', 'Recursos Humanos'),
    ('administracao', 'folha_pagamento', 'administracao.folha_pagamento', 'Folha de Pagamento'),
    ('administracao', 'almoxarifado', 'administracao.almoxarifado', 'Almoxarifado'),
    ('administracao', 'gestao_rancho', 'administracao.gestao_rancho', 'Gestao de Rancho')
) AS m(setor_slug, slug, prefixo, nome) ON m.setor_slug = s.slug
ON CONFLICT (setor_id, slug) DO NOTHING;

-- 2. Permissoes granulares
INSERT INTO public.permissoes_sistema (modulo_id, codigo, nome, descricao, acao, sensivel, ativo)
SELECT sm.id, m.codigo, m.codigo, m.descricao, m.acao, m.sensivel, true
FROM public.setor_modulos sm
JOIN public.setores s ON s.id = sm.setor_id
JOIN (
  VALUES
    -- Recursos Humanos
    ('administracao', 'recursos_humanos', 'administracao.recursos_humanos.visualizar', 'Visualizar recursos humanos', 'visualizar', false),
    ('administracao', 'recursos_humanos', 'administracao.recursos_humanos.criar', 'Cadastrar servidores', 'criar', false),
    ('administracao', 'recursos_humanos', 'administracao.recursos_humanos.editar', 'Editar servidores', 'editar', false),
    ('administracao', 'recursos_humanos', 'administracao.recursos_humanos.excluir', 'Excluir servidores', 'excluir', true),
    ('administracao', 'recursos_humanos', 'administracao.recursos_humanos.gerenciar_afastamentos', 'Gerenciar afastamentos', 'gerenciar_afastamentos', true),
    -- Folha de Pagamento
    ('administracao', 'folha_pagamento', 'administracao.folha_pagamento.visualizar', 'Visualizar folha de pagamento', 'visualizar', true),
    ('administracao', 'folha_pagamento', 'administracao.folha_pagamento.criar', 'Criar lancamentos de folha', 'criar', true),
    ('administracao', 'folha_pagamento', 'administracao.folha_pagamento.editar', 'Editar lancamentos de folha', 'editar', true),
    ('administracao', 'folha_pagamento', 'administracao.folha_pagamento.fechar', 'Fechar folha mensal', 'fechar', true),
    -- Almoxarifado
    ('administracao', 'almoxarifado', 'administracao.almoxarifado.visualizar', 'Visualizar almoxarifado', 'visualizar', false),
    ('administracao', 'almoxarifado', 'administracao.almoxarifado.criar', 'Cadastrar insumos', 'criar', false),
    ('administracao', 'almoxarifado', 'administracao.almoxarifado.editar', 'Editar insumos', 'editar', false),
    ('administracao', 'almoxarifado', 'administracao.almoxarifado.movimentar', 'Registrar entradas e saidas', 'movimentar', false),
    -- Gestao de Rancho
    ('administracao', 'gestao_rancho', 'administracao.gestao_rancho.visualizar', 'Visualizar gestao de rancho', 'visualizar', false),
    ('administracao', 'gestao_rancho', 'administracao.gestao_rancho.criar', 'Registrar refeicoes e compras', 'criar', false),
    ('administracao', 'gestao_rancho', 'administracao.gestao_rancho.editar', 'Editar refeicoes e compras', 'editar', false)
) AS m(setor_slug, modulo_slug, codigo, descricao, acao, sensivel)
  ON m.setor_slug = s.slug AND m.modulo_slug = sm.slug
ON CONFLICT (codigo) DO NOTHING;

-- 3. Vincula permissoes aos perfis funcionais administrativos
-- Gestor de RH -> recursos_humanos completo
-- Analista de Folha -> folha_pagamento completo
-- Almoxarife -> almoxarifado completo
-- Gestor de Rancho -> gestao_rancho completo
-- Auxiliar Administrativo -> visualizar de todos
WITH perfil_modulos AS (
  SELECT s.id AS setor_id, pm.nome AS perfil_nome, pm.modulo_slug
  FROM public.setores s
  JOIN (
    VALUES
      ('administracao', 'Gestor de RH', 'recursos_humanos'),
      ('administracao', 'Analista de Folha', 'folha_pagamento'),
      ('administracao', 'Almoxarife', 'almoxarifado'),
      ('administracao', 'Gestor de Rancho', 'gestao_rancho'),
      ('administracao', 'Auxiliar Administrativo', 'recursos_humanos'),
      ('administracao', 'Auxiliar Administrativo', 'folha_pagamento'),
      ('administracao', 'Auxiliar Administrativo', 'almoxarifado'),
      ('administracao', 'Auxiliar Administrativo', 'gestao_rancho')
  ) AS pm(setor_slug, nome, modulo_slug) ON pm.setor_slug = s.slug
)
INSERT INTO public.perfil_funcional_permissoes (perfil_funcional_id, permissao_id)
SELECT pf.id, ps.id
FROM perfil_modulos pm
JOIN public.perfis_funcionais pf
  ON pf.setor_id = pm.setor_id AND pf.nome = pm.perfil_nome
JOIN public.setor_modulos sm
  ON sm.setor_id = pm.setor_id AND sm.slug = pm.modulo_slug AND sm.ativo
JOIN public.permissoes_sistema ps
  ON ps.modulo_id = sm.id AND ps.ativo
WHERE (
  -- Perfis especializados recebem o modulo inteiro
  (pm.perfil_nome <> 'Auxiliar Administrativo')
  OR
  -- Auxiliar Administrativo recebe somente visualizar
  (pm.perfil_nome = 'Auxiliar Administrativo' AND ps.acao = 'visualizar')
)
ON CONFLICT DO NOTHING;

-- 4. Funcao de permissao de administracao (RLS)
CREATE OR REPLACE FUNCTION public.can_manage_administracao()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_super_admin()
    OR public.is_admin_of_setor(public.get_administracao_setor_id())
    OR EXISTS (
      SELECT 1
      FROM public.perfis_usuarios pu
      WHERE pu.user_id = auth.uid()
        AND pu.ativo = true
        AND pu.setor_id = public.get_administracao_setor_id()
        AND pu.papel = 'tecnico'::public.papel_usuario
        AND EXISTS (
          SELECT 1
          FROM public.usuario_perfil_funcionais upf
          JOIN public.perfis_funcionais pf ON pf.id = upf.perfil_funcional_id
          WHERE upf.perfil_usuario_id = pu.id
            AND pf.setor_id = public.get_administracao_setor_id()
            AND pf.ativo = true
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_administracao() TO authenticated;

-- =====================================================
-- 5. Tabelas de dados
-- =====================================================

-- 5.1 Recursos Humanos
CREATE TABLE IF NOT EXISTS public.rh_servidores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL DEFAULT public.get_administracao_setor_id() REFERENCES public.setores(id) ON DELETE RESTRICT,
  matricula text NOT NULL,
  nome_completo text NOT NULL,
  cpf text,
  cargo text,
  lotacao text,
  data_admissao date,
  data_nascimento date,
  email text,
  telefone text,
  endereco text,
  situacao text NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'afastado', 'inativo')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rh_servidores_matricula_unq UNIQUE (setor_id, matricula)
);

CREATE TABLE IF NOT EXISTS public.rh_afastamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL DEFAULT public.get_administracao_setor_id() REFERENCES public.setores(id) ON DELETE RESTRICT,
  servidor_id uuid NOT NULL REFERENCES public.rh_servidores(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('ferias', 'atestado', 'licenca', 'licenca_premio', 'outro')),
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  observacao text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (data_fim >= data_inicio)
);

CREATE TABLE IF NOT EXISTS public.rh_folhas_ponto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL DEFAULT public.get_administracao_setor_id() REFERENCES public.setores(id) ON DELETE RESTRICT,
  servidor_id uuid NOT NULL REFERENCES public.rh_servidores(id) ON DELETE CASCADE,
  data_ponto date NOT NULL,
  entrada time,
  saida time,
  horas_extras numeric(5,2) NOT NULL DEFAULT 0,
  observacao text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rh_folhas_ponto_unq UNIQUE (servidor_id, data_ponto)
);

-- 5.2 Folha de Pagamento
CREATE TABLE IF NOT EXISTS public.folha_folhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL DEFAULT public.get_administracao_setor_id() REFERENCES public.setores(id) ON DELETE RESTRICT,
  competencia date NOT NULL,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'fechada')),
  valor_total numeric(12,2) NOT NULL DEFAULT 0,
  fechada_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fechada_em timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT folha_folhas_competencia_unq UNIQUE (setor_id, competencia)
);

CREATE TABLE IF NOT EXISTS public.folha_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folha_id uuid NOT NULL REFERENCES public.folha_folhas(id) ON DELETE CASCADE,
  setor_id uuid NOT NULL DEFAULT public.get_administracao_setor_id() REFERENCES public.setores(id) ON DELETE RESTRICT,
  servidor_id uuid REFERENCES public.rh_servidores(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN ('vencimento', 'desconto')),
  descricao text NOT NULL,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5.3 Almoxarifado
CREATE TABLE IF NOT EXISTS public.almox_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL DEFAULT public.get_administracao_setor_id() REFERENCES public.setores(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  categoria text,
  unidade text NOT NULL DEFAULT 'un',
  estoque_atual numeric(12,3) NOT NULL DEFAULT 0,
  estoque_minimo numeric(12,3) NOT NULL DEFAULT 0,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT almox_insumos_nome_unq UNIQUE (setor_id, nome)
);

CREATE TABLE IF NOT EXISTS public.almox_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL DEFAULT public.get_administracao_setor_id() REFERENCES public.setores(id) ON DELETE RESTRICT,
  insumo_id uuid NOT NULL REFERENCES public.almox_insumos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade numeric(12,3) NOT NULL,
  data_movimentacao date NOT NULL DEFAULT current_date,
  responsavel text,
  observacao text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (quantidade > 0)
);

-- 5.4 Gestao de Rancho
CREATE TABLE IF NOT EXISTS public.rancho_refeicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL DEFAULT public.get_administracao_setor_id() REFERENCES public.setores(id) ON DELETE RESTRICT,
  data_refeicao date NOT NULL,
  tipo_refeicao text NOT NULL CHECK (tipo_refeicao IN ('cafe', 'almoco', 'jantar', 'lanche')),
  cardapio text NOT NULL,
  quantidade_pessoas integer NOT NULL DEFAULT 0,
  observacao text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rancho_compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL DEFAULT public.get_administracao_setor_id() REFERENCES public.setores(id) ON DELETE RESTRICT,
  data_compra date NOT NULL DEFAULT current_date,
  fornecedor text,
  descricao text NOT NULL,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 6. RLS
-- =====================================================
ALTER TABLE public.rh_servidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_afastamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_folhas_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folha_folhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folha_lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almox_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almox_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rancho_refeicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rancho_compras ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tabela text;
BEGIN
  FOREACH tabela IN ARRAY ARRAY[
    'rh_servidores', 'rh_afastamentos', 'rh_folhas_ponto',
    'folha_folhas', 'folha_lancamentos',
    'almox_insumos', 'almox_movimentacoes',
    'rancho_refeicoes', 'rancho_compras'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admins can manage %s" ON public.%I', tabela, tabela);
    EXECUTE format('CREATE POLICY "Admins can manage %s" ON public.%I FOR ALL TO authenticated USING (public.can_manage_administracao()) WITH CHECK (public.can_manage_administracao() AND setor_id = public.get_administracao_setor_id())', tabela, tabela);
  END LOOP;
END $$;

-- Grants de leitura publica dentro do setor (via RLS, sem grants especiais adicionais)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rh_servidores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rh_afastamentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rh_folhas_ponto TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folha_folhas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folha_lancamentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.almox_insumos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.almox_movimentacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rancho_refeicoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rancho_compras TO authenticated;

-- Indices
CREATE INDEX IF NOT EXISTS rh_servidores_setor_idx ON public.rh_servidores (setor_id);
CREATE INDEX IF NOT EXISTS rh_afastamentos_servidor_idx ON public.rh_afastamentos (servidor_id);
CREATE INDEX IF NOT EXISTS rh_afastamentos_datas_idx ON public.rh_afastamentos (data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS rh_folhas_ponto_servidor_idx ON public.rh_folhas_ponto (servidor_id, data_ponto);
CREATE INDEX IF NOT EXISTS folha_lancamentos_folha_idx ON public.folha_lancamentos (folha_id);
CREATE INDEX IF NOT EXISTS almox_insumos_setor_idx ON public.almox_insumos (setor_id);
CREATE INDEX IF NOT EXISTS almox_movimentacoes_insumo_idx ON public.almox_movimentacoes (insumo_id);
CREATE INDEX IF NOT EXISTS almox_movimentacoes_data_idx ON public.almox_movimentacoes (data_movimentacao);
CREATE INDEX IF NOT EXISTS rancho_refeicoes_data_idx ON public.rancho_refeicoes (data_refeicao);
CREATE INDEX IF NOT EXISTS rancho_compras_data_idx ON public.rancho_compras (data_compra);
