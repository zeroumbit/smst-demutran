-- =====================================================
-- Migration: Criar tabela de configuracoes do sistema
-- Fase: Apos Fase 3
-- Descricao: Cria a tabela para armazenar configuracoes
--           do sistema, iniciando com meios de pagamento.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.configuracoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo VARCHAR(100) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_config_grupo_tipo UNIQUE (grupo, tipo)
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.handle_configuracoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_configuracoes_updated_at ON public.configuracoes;
CREATE TRIGGER trg_configuracoes_updated_at
    BEFORE UPDATE ON public.configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_configuracoes_updated_at();

-- RLS
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Super admins podem tudo
DROP POLICY IF EXISTS "Super admin full access configuracoes" ON public.configuracoes;
CREATE POLICY "Super admin full access configuracoes" ON public.configuracoes
    FOR ALL
    TO authenticated
    USING (
        (SELECT papel FROM public.perfis_usuarios WHERE user_id = auth.uid() AND ativo = true ORDER BY created_at DESC LIMIT 1) = 'super_admin'
    )
    WITH CHECK (
        (SELECT papel FROM public.perfis_usuarios WHERE user_id = auth.uid() AND ativo = true ORDER BY created_at DESC LIMIT 1) = 'super_admin'
    );

-- Leitura publica para configuracoes ativas (ex: consultar chave pix no frontend publico)
DROP POLICY IF EXISTS "Public read active configuracoes" ON public.configuracoes;
CREATE POLICY "Public read active configuracoes" ON public.configuracoes
    FOR SELECT
    TO anon, authenticated
    USING (ativo = true);

-- Inserir configuracao padrao de PIX Manual
INSERT INTO public.configuracoes (grupo, tipo, config, ativo, ordem)
VALUES (
    'meio_pagamento',
    'pix_manual',
    '{
        "chave_tipo": "email",
        "chave_valor": "",
        "qrcode_ativo": false,
        "qrcode_url": null,
        "favorecido": "",
        "telefone": ""
    }'::jsonb,
    false,
    1
)
ON CONFLICT (grupo, tipo) DO NOTHING;

COMMENT ON TABLE public.configuracoes IS 'Configuracoes do sistema. Grupo: meio_pagamento, etc.';
COMMENT ON COLUMN public.configuracoes.grupo IS 'Grupo da configuracao (ex: meio_pagamento)';
COMMENT ON COLUMN public.configuracoes.tipo IS 'Tipo especifico dentro do grupo (ex: pix_manual)';
COMMENT ON COLUMN public.configuracoes.config IS 'JSON com os dados da configuracao';
