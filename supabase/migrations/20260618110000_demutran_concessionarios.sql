DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'demutran_concessionario_categoria'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.demutran_concessionario_categoria AS ENUM (
      'mototaxi',
      'taxi',
      'carro_horario',
      'fretista'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.demutran_concessionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL DEFAULT public.get_demutran_setor_id() REFERENCES public.setores(id) ON DELETE RESTRICT,
  categoria public.demutran_concessionario_categoria NOT NULL,
  origem_planilha text,
  ponto_referencia text,
  numero_vaga text,
  titular_nome text,
  endereco text,
  veiculo text,
  placa text,
  fabricacao text,
  ultimo_alvara date,
  exercicio text,
  cpf text,
  inicio_atividade date,
  cnh_numero text,
  validade_cnh date,
  atividade_remunerada text,
  curso text,
  motorista_auxiliar text,
  cnh_auxiliar text,
  validade_cnh_auxiliar date,
  categoria_cnh text,
  rota text,
  observacoes text,
  importado_planilha boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demutran_concessionarios_setor_idx
  ON public.demutran_concessionarios (setor_id, categoria, ativo);
CREATE INDEX IF NOT EXISTS demutran_concessionarios_nome_idx
  ON public.demutran_concessionarios (titular_nome);
CREATE INDEX IF NOT EXISTS demutran_concessionarios_placa_idx
  ON public.demutran_concessionarios (placa);
CREATE INDEX IF NOT EXISTS demutran_concessionarios_cpf_idx
  ON public.demutran_concessionarios (cpf);

DROP TRIGGER IF EXISTS trigger_atualizar_demutran_concessionarios_updated_at ON public.demutran_concessionarios;
CREATE TRIGGER trigger_atualizar_demutran_concessionarios_updated_at
BEFORE UPDATE ON public.demutran_concessionarios
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

ALTER TABLE public.demutran_concessionarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage demutran concessionarios" ON public.demutran_concessionarios;
CREATE POLICY "Admins can manage demutran concessionarios"
ON public.demutran_concessionarios
FOR ALL
TO authenticated
USING (public.can_manage_setor_content(setor_id))
WITH CHECK (public.can_manage_setor_content(setor_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demutran_concessionarios TO authenticated;
