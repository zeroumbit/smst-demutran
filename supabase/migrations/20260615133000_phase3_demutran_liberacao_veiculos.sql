CREATE TABLE IF NOT EXISTS public.veiculos_recolhidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL REFERENCES public.setores(id) ON DELETE RESTRICT,
  placa text NOT NULL,
  chassi text,
  proprietario_nome text NOT NULL,
  proprietario_cpf_cnpj text,
  data_recolhimento timestamptz NOT NULL,
  data_liberacao timestamptz,
  motivo text NOT NULL,
  status text NOT NULL DEFAULT 'recolhido' CHECK (status IN ('recolhido', 'liberado')),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS veiculos_recolhidos_setor_idx ON public.veiculos_recolhidos (setor_id);
CREATE INDEX IF NOT EXISTS veiculos_recolhidos_placa_idx ON public.veiculos_recolhidos (placa);
CREATE INDEX IF NOT EXISTS veiculos_recolhidos_chassi_idx ON public.veiculos_recolhidos (chassi);
CREATE INDEX IF NOT EXISTS veiculos_recolhidos_status_idx ON public.veiculos_recolhidos (status);

DROP TRIGGER IF EXISTS trigger_atualizar_veiculos_recolhidos_updated_at ON public.veiculos_recolhidos;
CREATE TRIGGER trigger_atualizar_veiculos_recolhidos_updated_at
BEFORE UPDATE ON public.veiculos_recolhidos
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DO $$
DECLARE
  demutran_setor_id uuid;
BEGIN
  SELECT id
  INTO demutran_setor_id
  FROM public.setores
  WHERE slug = 'demutran'
  LIMIT 1;

  IF demutran_setor_id IS NULL THEN
    RAISE EXCEPTION 'Setor DEMUTRAN nao encontrado.';
  END IF;
END $$;

ALTER TABLE public.veiculos_recolhidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage veiculos recolhidos" ON public.veiculos_recolhidos;
CREATE POLICY "Admins can manage veiculos recolhidos"
ON public.veiculos_recolhidos
FOR ALL
TO authenticated
USING (public.can_manage_setor_content(setor_id))
WITH CHECK (public.can_manage_setor_content(setor_id));

DROP POLICY IF EXISTS "Admins can view veiculos recolhidos" ON public.veiculos_recolhidos;
CREATE POLICY "Admins can view veiculos recolhidos"
ON public.veiculos_recolhidos
FOR SELECT
TO authenticated
USING (public.can_view_setor_content(setor_id));

CREATE OR REPLACE FUNCTION public.consultar_veiculo_recolhido(_termo text)
RETURNS TABLE (
  placa text,
  chassi text,
  proprietario_nome text,
  data_recolhimento timestamptz,
  data_liberacao timestamptz,
  motivo text,
  status text,
  setor_nome text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    vr.placa,
    vr.chassi,
    vr.proprietario_nome,
    vr.data_recolhimento,
    vr.data_liberacao,
    vr.motivo,
    vr.status,
    s.nome AS setor_nome
  FROM public.veiculos_recolhidos vr
  JOIN public.setores s ON s.id = vr.setor_id
  WHERE vr.setor_id = (
      SELECT id
      FROM public.setores
      WHERE slug = 'demutran'
      LIMIT 1
    )
    AND (
      upper(regexp_replace(vr.placa, '[^A-Z0-9]', '', 'g')) = upper(regexp_replace(_termo, '[^A-Z0-9]', '', 'g'))
      OR upper(coalesce(vr.chassi, '')) = upper(_termo)
    )
  ORDER BY vr.created_at DESC
  LIMIT 1;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculos_recolhidos TO authenticated;
GRANT EXECUTE ON FUNCTION public.consultar_veiculo_recolhido(text) TO anon;
GRANT EXECUTE ON FUNCTION public.consultar_veiculo_recolhido(text) TO authenticated;
