-- Cria tabela para armazenar as datas selecionadas de cada operacao IRO.
-- Permite que o gestor marque apenas os dias uteis que deseja, em vez de
-- todo o intervalo entre data_inicio e data_fim.

CREATE TABLE IF NOT EXISTS public.iro_operacao_datas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL REFERENCES public.iro_operacoes(id) ON DELETE CASCADE,
  data date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operacao_id, data)
);

CREATE INDEX IF NOT EXISTS idx_iro_operacao_datas_operacao ON public.iro_operacao_datas (operacao_id);
CREATE INDEX IF NOT EXISTS idx_iro_operacao_datas_data ON public.iro_operacao_datas (data);

ALTER TABLE public.iro_operacao_datas ENABLE ROW LEVEL SECURITY;

-- Gestores/admins do setor podem gerenciar as datas
DROP POLICY IF EXISTS "Gestors can manage iro_operacao_datas" ON public.iro_operacao_datas;
CREATE POLICY "Gestors can manage iro_operacao_datas"
ON public.iro_operacao_datas
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.iro_operacoes o
    WHERE o.id = operacao_id
      AND public.is_admin_of_setor(o.setor_id)
  )
)
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.iro_operacoes o
    WHERE o.id = operacao_id
      AND public.is_admin_of_setor(o.setor_id)
  )
);

-- Todos os usuarios autenticados podem visualizar as datas
DROP POLICY IF EXISTS "Users can view iro_operacao_datas" ON public.iro_operacao_datas;
CREATE POLICY "Users can view iro_operacao_datas"
ON public.iro_operacao_datas
FOR SELECT
TO authenticated
USING (true);

GRANT ALL ON public.iro_operacao_datas TO authenticated;

-- Preenche datas para operacoes existentes (compatibilidade retroativa)
INSERT INTO public.iro_operacao_datas (operacao_id, data)
SELECT o.id, generate_series(o.data_inicio, o.data_fim, '1 day'::interval)::date
FROM public.iro_operacoes o
WHERE NOT EXISTS (
  SELECT 1 FROM public.iro_operacao_datas d
  WHERE d.operacao_id = o.id
);
