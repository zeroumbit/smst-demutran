CREATE TABLE IF NOT EXISTS public.guarda_municipal_graduacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'guarda_municipal_graduacoes_nome_key'
  ) THEN
    ALTER TABLE public.guarda_municipal_graduacoes
      ADD CONSTRAINT guarda_municipal_graduacoes_nome_key UNIQUE (nome);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trigger_atualizar_guarda_municipal_graduacoes_updated_at ON public.guarda_municipal_graduacoes;
CREATE TRIGGER trigger_atualizar_guarda_municipal_graduacoes_updated_at
BEFORE UPDATE ON public.guarda_municipal_graduacoes
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

ALTER TABLE public.guarda_municipal_graduacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage guarda municipal graduacoes" ON public.guarda_municipal_graduacoes;
CREATE POLICY "Super admins can manage guarda municipal graduacoes"
ON public.guarda_municipal_graduacoes
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE TABLE IF NOT EXISTS public.guardas_municipais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula text NOT NULL,
  nome text NOT NULL,
  graduacao_id uuid NOT NULL REFERENCES public.guarda_municipal_graduacoes(id) ON DELETE RESTRICT,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS guardas_municipais_matricula_unq
  ON public.guardas_municipais (matricula);

CREATE INDEX IF NOT EXISTS guardas_municipais_nome_idx
  ON public.guardas_municipais (lower(nome));

DROP TRIGGER IF EXISTS trigger_atualizar_guardas_municipais_updated_at ON public.guardas_municipais;
CREATE TRIGGER trigger_atualizar_guardas_municipais_updated_at
BEFORE UPDATE ON public.guardas_municipais
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

ALTER TABLE public.guardas_municipais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage guardas municipais" ON public.guardas_municipais;
CREATE POLICY "Super admins can manage guardas municipais"
ON public.guardas_municipais
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

INSERT INTO public.guarda_municipal_graduacoes (nome, ordem)
VALUES
  ('Gcm de 2ª classe (inicial)', 1),
  ('Gcm de 1ª classe', 2),
  ('Subinspetor', 3),
  ('Inspetor de 2ª classe', 4),
  ('Inspetor de 1ª classe', 5),
  ('Inspetor Especial', 6)
ON CONFLICT (nome)
DO UPDATE SET
  ordem = EXCLUDED.ordem,
  ativo = true,
  updated_at = now();

INSERT INTO public.guardas_municipais (matricula, nome, graduacao_id)
VALUES
  ('3180', 'Antônio Fábio Nascimento Gonçalves', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3044', 'Francisco Gean Gomes da Silva', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3198', 'Francisco Marcos Vieira Sousa', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3202', 'José Teixeira Rodrigues Júnior', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('1826', 'Francisco das Chagas Silva Ramos', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3193', 'Tony Roosevelt Gonzaga de Sousa', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3199', 'Gleyssiano Freitas Domingos', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3197', 'Francisco Malbério Estevão Gomes', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('2992', 'Antônio Aremilson Martins Freitas', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3203', 'José Wellington Nunes de Lima', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('1299', 'Sarmento Neto de Oliveira', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3189', 'Eduardo Pereira Chaves', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3190', 'Erionaldo Daniel Costa', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3192', 'Francisca Erivânia Freitas Martins', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3185', 'Clara Maria Anastácio Freire', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3206', 'Maria do Socorro Gomes Gonçalves', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3179', 'Antônia Cristhiany Lessa Magalhães', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3195', 'Francisco de Paula Barbosa Júnior', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3181', 'Antônio Oclécio de Paula Rocha', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3205', 'Marcelo Paulino', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3208', 'Raimundo Nonato de Abreu', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3183', 'Aristóteles Freitas Rocha', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3182', 'Antônio Raimundo Ferreira Anastácio', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('2694', 'Marcos Antônio Daniel Viana', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3191', 'Eryvan de Almeida Lira', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3187', 'Francisco Glauber Silva Ferreira', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3186', 'Cláudio Rodrigues da Silva', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3204', 'Luís Alberto Rodrigues Lima', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('0265', 'Francisco Gervásio Lopes da Silva', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3207', 'Maria Lucilene Teixeira Uchôa', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('2899', 'José Sérgio Cavalcante Braga', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3184', 'Charles Cruz Uchôa', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('3194', 'Ricardo Braga de Sousa', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe')),
  ('11221', 'Francisco Leandro Silva Paulino', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Subinspetor')),
  ('11067', 'Carliane Cavalcante Rodrigues', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Subinspetor')),
  ('11219', 'Maria Aurineide Inácio Costa', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Subinspetor')),
  ('11069', 'José Erilson Sousa Feitosa', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Subinspetor')),
  ('5034', 'Jonas Neri de Castro', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Subinspetor')),
  ('11217', 'Maria do Socorro Costa Aderaldo', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Subinspetor')),
  ('11222', 'Sandro Rielmeson Fernandes Lira', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Subinspetor')),
  ('11215', 'Antonia Márcia Uchôa Lessa', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Subinspetor')),
  ('11218', 'José Gilson Coelho Dias', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Subinspetor')),
  ('11068', 'Diego Freire Abreu', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Subinspetor')),
  ('11227', 'José Haroldo Lopes de Abreu', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Subinspetor')),
  ('11220', 'Francisco Romário Lima Braga', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Subinspetor')),
  ('11233', 'Francisco Gilvane de Sousa Cruz', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Subinspetor')),
  ('11216', 'Fábio Cardoso Almeida', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Subinspetor'))
ON CONFLICT (matricula)
DO UPDATE SET
  nome = EXCLUDED.nome,
  graduacao_id = EXCLUDED.graduacao_id,
  ativo = true,
  updated_at = now();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarda_municipal_graduacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guardas_municipais TO authenticated;
