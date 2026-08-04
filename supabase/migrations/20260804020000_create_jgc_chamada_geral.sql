-- Criar tabelas para a Chamada Geral Administrativa do Jovem Guarda Cidadã
-- Esta chamada é independente dos diários dos professores.

CREATE TABLE IF NOT EXISTS public.jgc_chamadas_gerais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL UNIQUE,
  observacoes text,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jgc_chamada_geral_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamada_geral_id uuid NOT NULL REFERENCES public.jgc_chamadas_gerais(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.jgc_alunos(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'presente' CHECK (status IN ('presente', 'ausente', 'justificada', 'atraso')),
  observacao text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (chamada_geral_id, aluno_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS jgc_chamadas_gerais_data_idx ON public.jgc_chamadas_gerais(data DESC);
CREATE INDEX IF NOT EXISTS jgc_chamada_geral_alunos_chamada_idx ON public.jgc_chamada_geral_alunos(chamada_geral_id);
CREATE INDEX IF NOT EXISTS jgc_chamada_geral_alunos_aluno_idx ON public.jgc_chamada_geral_alunos(aluno_id);

-- Habilitar RLS
ALTER TABLE public.jgc_chamadas_gerais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jgc_chamada_geral_alunos ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para jgc_chamadas_gerais
DROP POLICY IF EXISTS "jgc_chamadas_gerais_select" ON public.jgc_chamadas_gerais;
CREATE POLICY "jgc_chamadas_gerais_select" ON public.jgc_chamadas_gerais
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "jgc_chamadas_gerais_insert" ON public.jgc_chamadas_gerais;
CREATE POLICY "jgc_chamadas_gerais_insert" ON public.jgc_chamadas_gerais
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR public.jgc_perfil_atual() IN ('gestor', 'administrativo', 'multiprofissional')
    OR public.jgc_tem_permissao('jovem_guarda.frequencia.visualizar')
  );

DROP POLICY IF EXISTS "jgc_chamadas_gerais_update" ON public.jgc_chamadas_gerais;
CREATE POLICY "jgc_chamadas_gerais_update" ON public.jgc_chamadas_gerais
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR public.jgc_perfil_atual() IN ('gestor', 'administrativo', 'multiprofissional')
    OR public.jgc_tem_permissao('jovem_guarda.frequencia.visualizar')
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.jgc_perfil_atual() IN ('gestor', 'administrativo', 'multiprofissional')
    OR public.jgc_tem_permissao('jovem_guarda.frequencia.visualizar')
  );

DROP POLICY IF EXISTS "jgc_chamadas_gerais_delete" ON public.jgc_chamadas_gerais;
CREATE POLICY "jgc_chamadas_gerais_delete" ON public.jgc_chamadas_gerais
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR public.jgc_perfil_atual() IN ('gestor', 'administrativo')
  );

-- Políticas de acesso para jgc_chamada_geral_alunos
DROP POLICY IF EXISTS "jgc_chamada_geral_alunos_select" ON public.jgc_chamada_geral_alunos;
CREATE POLICY "jgc_chamada_geral_alunos_select" ON public.jgc_chamada_geral_alunos
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "jgc_chamada_geral_alunos_insert" ON public.jgc_chamada_geral_alunos;
CREATE POLICY "jgc_chamada_geral_alunos_insert" ON public.jgc_chamada_geral_alunos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR public.jgc_perfil_atual() IN ('gestor', 'administrativo', 'multiprofissional')
    OR public.jgc_tem_permissao('jovem_guarda.frequencia.visualizar')
  );

DROP POLICY IF EXISTS "jgc_chamada_geral_alunos_update" ON public.jgc_chamada_geral_alunos;
CREATE POLICY "jgc_chamada_geral_alunos_update" ON public.jgc_chamada_geral_alunos
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR public.jgc_perfil_atual() IN ('gestor', 'administrativo', 'multiprofissional')
    OR public.jgc_tem_permissao('jovem_guarda.frequencia.visualizar')
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.jgc_perfil_atual() IN ('gestor', 'administrativo', 'multiprofissional')
    OR public.jgc_tem_permissao('jovem_guarda.frequencia.visualizar')
  );

DROP POLICY IF EXISTS "jgc_chamada_geral_alunos_delete" ON public.jgc_chamada_geral_alunos;
CREATE POLICY "jgc_chamada_geral_alunos_delete" ON public.jgc_chamada_geral_alunos
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR public.jgc_perfil_atual() IN ('gestor', 'administrativo')
  );

-- Grants
GRANT ALL ON public.jgc_chamadas_gerais TO authenticated;
GRANT ALL ON public.jgc_chamada_geral_alunos TO authenticated;
