-- =====================================================
-- MÓDULO MBFT / FISCALIZAÇÃO DE TRÂNSITO
-- Consulta de infrações para Guarda Municipal
-- =====================================================

CREATE TABLE IF NOT EXISTS public.fiscalizacao_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(50) NOT NULL UNIQUE,
  descricao text,
  icone varchar(50),
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fiscalizacao_infracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar(10) NOT NULL UNIQUE,
  tipificacao_resumida varchar(200) NOT NULL,
  amparo_legal varchar(50) NOT NULL,
  tipificacao_completa text NOT NULL,
  gravidade varchar(15) NOT NULL CHECK (gravidade IN ('leve', 'media', 'grave', 'gravissima')),
  penalidade text NOT NULL,
  medida_administrativa text,
  infrator varchar(50) NOT NULL,
  competencia varchar(200),
  pontuacao integer NOT NULL DEFAULT 0,
  quando_autuar text,
  quando_nao_autuar text,
  definicoes_procedimentos text,
  exemplos_observacoes text,
  informacoes_complementares text,
  pode_configurar_crime boolean NOT NULL DEFAULT false,
  constatacao varchar(50),
  categoria varchar(50),
  capitulo varchar(50),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fiscalizacao_infracoes_codigo
  ON public.fiscalizacao_infracoes (codigo);

CREATE INDEX IF NOT EXISTS idx_fiscalizacao_infracoes_gravidade
  ON public.fiscalizacao_infracoes (gravidade);

CREATE INDEX IF NOT EXISTS idx_fiscalizacao_infracoes_categoria
  ON public.fiscalizacao_infracoes (categoria);

CREATE INDEX IF NOT EXISTS idx_fiscalizacao_infracoes_pontuacao
  ON public.fiscalizacao_infracoes (pontuacao);

CREATE INDEX IF NOT EXISTS idx_fiscalizacao_infracoes_tipificacao
  ON public.fiscalizacao_infracoes (tipificacao_resumida);

CREATE INDEX IF NOT EXISTS idx_fiscalizacao_infracoes_ativo_codigo
  ON public.fiscalizacao_infracoes (ativo, codigo);

DROP TRIGGER IF EXISTS trigger_atualizar_fiscalizacao_categorias_updated_at ON public.fiscalizacao_categorias;
CREATE TRIGGER trigger_atualizar_fiscalizacao_categorias_updated_at
BEFORE UPDATE ON public.fiscalizacao_categorias
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_atualizar_fiscalizacao_infracoes_updated_at ON public.fiscalizacao_infracoes;
CREATE TRIGGER trigger_atualizar_fiscalizacao_infracoes_updated_at
BEFORE UPDATE ON public.fiscalizacao_infracoes
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

INSERT INTO public.fiscalizacao_categorias (nome, descricao, ordem, icone)
VALUES
  ('Habilitação', 'Infrações relacionadas à Carteira Nacional de Habilitação e documentos do condutor', 1, 'badge-alert'),
  ('Circulação', 'Infrações de circulação, trânsito e conduta na via', 2, 'route'),
  ('Estacionamento', 'Infrações de estacionamento e parada', 3, 'parking-circle'),
  ('Velocidade', 'Infrações relacionadas a excesso de velocidade', 4, 'gauge'),
  ('Ultrapassagem', 'Infrações de ultrapassagem e passagem', 5, 'arrow-right-left'),
  ('Equipamentos', 'Infrações de equipamentos obrigatórios e segurança', 6, 'shield-check'),
  ('Documentos', 'Infrações de documentos de porte obrigatório', 7, 'file-badge'),
  ('Carga e Transporte', 'Infrações relacionadas a carga e transporte', 8, 'truck'),
  ('Álcool e Substâncias', 'Infrações de álcool e substâncias psicoativas', 9, 'wine-off'),
  ('Motocicletas', 'Infrações específicas para motocicletas, motonetas e ciclomotores', 10, 'bike'),
  ('Obras e Eventos', 'Infrações relacionadas a obras e eventos na via', 11, 'cone'),
  ('Sinalização', 'Infrações de desobediência à sinalização', 12, 'signpost'),
  ('Iluminação', 'Infrações do sistema de iluminação e sinalização', 13, 'lamp')
ON CONFLICT (nome) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  ordem = EXCLUDED.ordem,
  icone = EXCLUDED.icone,
  ativo = true,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.can_access_fiscalizacao()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_super_admin()
    OR public.is_guarda()
    OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
    OR EXISTS (
      SELECT 1
      FROM public.perfis_usuarios pu
      WHERE pu.user_id = auth.uid()
        AND pu.ativo = true
        AND pu.papel = 'tecnico'::public.papel_usuario
        AND pu.setor_id = public.get_guarda_municipal_setor_id()
        AND (
          coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'guardas'
          OR coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'iros'
        )
    );
$$;

ALTER TABLE public.fiscalizacao_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscalizacao_infracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Fiscalizacao categorias select" ON public.fiscalizacao_categorias;
CREATE POLICY "Fiscalizacao categorias select"
ON public.fiscalizacao_categorias
FOR SELECT
TO authenticated
USING (ativo = true AND public.can_access_fiscalizacao());

DROP POLICY IF EXISTS "Fiscalizacao categorias manage super admin" ON public.fiscalizacao_categorias;
CREATE POLICY "Fiscalizacao categorias manage super admin"
ON public.fiscalizacao_categorias
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Fiscalizacao infracoes select" ON public.fiscalizacao_infracoes;
CREATE POLICY "Fiscalizacao infracoes select"
ON public.fiscalizacao_infracoes
FOR SELECT
TO authenticated
USING (ativo = true AND public.can_access_fiscalizacao());

DROP POLICY IF EXISTS "Fiscalizacao infracoes manage super admin" ON public.fiscalizacao_infracoes;
CREATE POLICY "Fiscalizacao infracoes manage super admin"
ON public.fiscalizacao_infracoes
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

GRANT SELECT ON public.fiscalizacao_categorias TO authenticated;
GRANT SELECT ON public.fiscalizacao_infracoes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fiscalizacao_categorias TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fiscalizacao_infracoes TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_fiscalizacao() TO authenticated;
