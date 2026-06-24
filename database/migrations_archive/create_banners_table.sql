-- Script para criar a tabela banners no Supabase
-- Execute este script no SQL Editor do painel do Supabase

-- Criar a tabela banners
CREATE TABLE IF NOT EXISTS public.banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pagina_destino text NOT NULL,
    nome text NOT NULL,
    tipo text NOT NULL,
    url text NOT NULL,
    descricao text,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Criar o trigger para atualizar o campo updated_at para a tabela banners
-- Este trigger já deve existir se a função atualizar_updated_at já estiver definida
-- Caso contrário, você precisará definir a função primeiro:

-- CREATE OR REPLACE FUNCTION public.atualizar_updated_at() RETURNS trigger
--     LANGUAGE plpgsql
--     AS $$
-- BEGIN
--   NEW.updated_at = now();
--   RETURN NEW;
-- END;
-- $$;

CREATE TRIGGER trigger_atualizar_banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_updated_at();

-- Criar policies para a tabela banners
CREATE POLICY "Public read active banners" ON public.banners
FOR SELECT
USING (ativo = true);

CREATE POLICY "Admin full access banners" ON public.banners
FOR ALL
USING (auth.role() = 'authenticated');

-- Habilitar RLS na tabela banners
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Adicionar chave primária para a tabela banners
ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);

-- Tabela criada com sucesso!
-- Agora o sistema de banners estará funcional