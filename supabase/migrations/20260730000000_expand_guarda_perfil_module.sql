-- =====================================================
-- MIGRATION: Expand Guarda Municipal Profile Module
-- Adds address, emergency contacts, and health info
-- =====================================================

-- 1. Ampliar colunas na tabela guardas_municipais
ALTER TABLE public.guardas_municipais
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS logradouro text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS cep text;

-- 2. Tabela de Contatos de Emergência do Guarda
CREATE TABLE IF NOT EXISTS public.guarda_contatos_emergencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guarda_id uuid NOT NULL REFERENCES public.guardas_municipais(id) ON DELETE CASCADE,
  nome text NOT NULL,
  parentesco text NOT NULL,
  parentesco_outro text,
  telefone text NOT NULL,
  whatsapp text,
  principal boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guarda_contatos_emergencia_guarda ON public.guarda_contatos_emergencia (guarda_id);

-- 3. Tabela de Informações de Saúde do Guarda (Relacionamento 1:1)
CREATE TABLE IF NOT EXISTS public.guarda_informacoes_saude (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guarda_id uuid NOT NULL UNIQUE REFERENCES public.guardas_municipais(id) ON DELETE CASCADE,
  tipo_sanguineo text,
  possui_alergias text,
  alergias text,
  possui_patologias text,
  patologias text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guarda_informacoes_saude_guarda ON public.guarda_informacoes_saude (guarda_id);

-- 4. Função auxiliar para updated_at (caso ainda não exista)
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guarda_contatos_emergencia_updated_at ON public.guarda_contatos_emergencia;
CREATE TRIGGER trigger_guarda_contatos_emergencia_updated_at
  BEFORE UPDATE ON public.guarda_contatos_emergencia
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trigger_guarda_informacoes_saude_updated_at ON public.guarda_informacoes_saude;
CREATE TRIGGER trigger_guarda_informacoes_saude_updated_at
  BEFORE UPDATE ON public.guarda_informacoes_saude
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- 5. Atualizar RPC buscar_guarda_por_usuario
CREATE OR REPLACE FUNCTION public.buscar_guarda_por_usuario(
  p_usuario_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda record;
BEGIN
  SELECT gm.id, gm.matricula, gm.nome, gm.cpf, gm.graduacao_id,
         gm.email, gm.telefone, gm.whatsapp,
         gm.estado, gm.cidade, gm.logradouro, gm.numero, gm.bairro, gm.complemento, gm.cep,
         ggn.nome as graduacao_nome
  INTO v_guarda
  FROM public.guardas_municipais gm
  JOIN public.guardas_usuarios gu ON gu.guarda_id = gm.id
  LEFT JOIN public.guarda_municipal_graduacoes ggn ON ggn.id = gm.graduacao_id
  WHERE gu.usuario_id = p_usuario_id;

  IF v_guarda.id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_guarda.id,
    'matricula', v_guarda.matricula,
    'nome', v_guarda.nome,
    'cpf', v_guarda.cpf,
    'graduacao_id', v_guarda.graduacao_id,
    'graduacao_nome', v_guarda.graduacao_nome,
    'email', v_guarda.email,
    'telefone', v_guarda.telefone,
    'whatsapp', v_guarda.whatsapp,
    'estado', v_guarda.estado,
    'cidade', v_guarda.cidade,
    'logradouro', v_guarda.logradouro,
    'numero', v_guarda.numero,
    'bairro', v_guarda.bairro,
    'complemento', v_guarda.complemento,
    'cep', v_guarda.cep
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.buscar_guarda_por_usuario(uuid) TO authenticated;

-- 6. Habilitar RLS e criar Políticas de Segurança
ALTER TABLE public.guarda_contatos_emergencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_informacoes_saude ENABLE ROW LEVEL SECURITY;

-- Policies para guarda_contatos_emergencia
DROP POLICY IF EXISTS "Users can manage own emergency contacts or managers" ON public.guarda_contatos_emergencia;
CREATE POLICY "Users can manage own emergency contacts or managers"
ON public.guarda_contatos_emergencia
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
  OR EXISTS (
    SELECT 1 FROM public.guardas_usuarios gu
    WHERE gu.guarda_id = guarda_contatos_emergencia.guarda_id
      AND gu.usuario_id = auth.uid()
  )
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
  OR EXISTS (
    SELECT 1 FROM public.guardas_usuarios gu
    WHERE gu.guarda_id = guarda_contatos_emergencia.guarda_id
      AND gu.usuario_id = auth.uid()
  )
);

-- Policies para guarda_informacoes_saude
DROP POLICY IF EXISTS "Users can manage own health info or managers" ON public.guarda_informacoes_saude;
CREATE POLICY "Users can manage own health info or managers"
ON public.guarda_informacoes_saude
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
  OR EXISTS (
    SELECT 1 FROM public.guardas_usuarios gu
    WHERE gu.guarda_id = guarda_informacoes_saude.guarda_id
      AND gu.usuario_id = auth.uid()
  )
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
  OR EXISTS (
    SELECT 1 FROM public.guardas_usuarios gu
    WHERE gu.guarda_id = guarda_informacoes_saude.guarda_id
      AND gu.usuario_id = auth.uid()
  )
);
