-- Sistema de alertas da Jovem Guarda (aniversários, etc.)
CREATE TABLE IF NOT EXISTS public.jgc_alertas_encerrados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.jgc_alunos(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'aniversario' CHECK (tipo IN ('aniversario')),
  encerrado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encerrado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jgc_alertas_encerrados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jgc_alertas_encerrados_select" ON public.jgc_alertas_encerrados;
DROP POLICY IF EXISTS "jgc_alertas_encerrados_insert" ON public.jgc_alertas_encerrados;

CREATE POLICY "jgc_alertas_encerrados_select" ON public.jgc_alertas_encerrados
  FOR SELECT TO authenticated
  USING (encerrado_por = auth.uid());

CREATE POLICY "jgc_alertas_encerrados_insert" ON public.jgc_alertas_encerrados
  FOR INSERT TO authenticated
  WITH CHECK (encerrado_por = auth.uid());

GRANT SELECT, INSERT ON public.jgc_alertas_encerrados TO authenticated;

CREATE INDEX IF NOT EXISTS jgc_alertas_encerrados_aluno_tipo_idx
  ON public.jgc_alertas_encerrados(aluno_id, tipo);
CREATE INDEX IF NOT EXISTS jgc_alertas_encerrados_user_idx
  ON public.jgc_alertas_encerrados(encerrado_por);
