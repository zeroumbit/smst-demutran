-- Create iro_valores_graduacao table for configuring IRO hourly rates per graduation

CREATE TABLE IF NOT EXISTS public.iro_valores_graduacao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  graduacao_id UUID NOT NULL REFERENCES public.guarda_municipal_graduacoes(id) ON DELETE CASCADE,
  valor_hora DECIMAL(10,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_graduacao_iro_valor UNIQUE (graduacao_id)
);

CREATE INDEX IF NOT EXISTS idx_iro_valores_graduacao_graduacao ON public.iro_valores_graduacao (graduacao_id);
CREATE INDEX IF NOT EXISTS idx_iro_valores_graduacao_ativo ON public.iro_valores_graduacao (ativo);

DROP TRIGGER IF EXISTS trigger_atualizar_iro_valores_graduacao_updated_at ON public.iro_valores_graduacao;
CREATE TRIGGER trigger_atualizar_iro_valores_graduacao_updated_at
BEFORE UPDATE ON public.iro_valores_graduacao
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_updated_at();

ALTER TABLE public.iro_valores_graduacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin can manage iro_valores_graduacao" ON public.iro_valores_graduacao;
CREATE POLICY "Super admin can manage iro_valores_graduacao"
ON public.iro_valores_graduacao
FOR ALL
TO authenticated
USING (public.is_super_admin() OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id()))
WITH CHECK (public.is_super_admin() OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.iro_valores_graduacao TO authenticated;
