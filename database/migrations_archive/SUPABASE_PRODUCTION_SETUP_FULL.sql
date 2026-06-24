-- SCRIPT COMPLETO DE CONFIGURAÇÃO DE PRODUÇÃO PARA SUPABASE
-- Execute este script inteiro no SQL Editor do painel do Supabase

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Função utilitária para updated_at
CREATE OR REPLACE FUNCTION public.atualizar_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. CRIAÇÃO DE TABELAS

-- Tabela PAGINAS
CREATE TABLE IF NOT EXISTS public.paginas (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    nome text NOT NULL UNIQUE,
    titulo text NOT NULL,
    descricao text,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabela NOTICIAS
CREATE TABLE IF NOT EXISTS public.noticias (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    titulo text NOT NULL,
    resumo text NOT NULL,
    conteudo text NOT NULL,
    imagem text,
    ativo boolean DEFAULT true,
    data timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabela GALERIA_FOTOS
CREATE TABLE IF NOT EXISTS public.galeria_fotos (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    url text NOT NULL,
    titulo text NOT NULL,
    descricao text,
    possui_link boolean DEFAULT false,
    link_destino text,
    categoria text,
    pagina_exibicao text,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabela BANNERS
CREATE TABLE IF NOT EXISTS public.banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    pagina_destino text NOT NULL,
    nome text NOT NULL,
    tipo text NOT NULL,
    url text NOT NULL,
    descricao text,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabela DOCUMENTOS
CREATE TABLE IF NOT EXISTS public.documentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    nome text NOT NULL,
    descricao text,
    arquivo_url text NOT NULL,
    local_exibicao text DEFAULT 'secretaria',
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabela EQUIPE
CREATE TABLE IF NOT EXISTS public.equipe (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    nome text NOT NULL,
    cargo text NOT NULL,
    setor text,
    email text,
    telefone text,
    foto text,
    pagina_destino text,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabela CONTATOS
CREATE TABLE IF NOT EXISTS public.contatos (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    titulo text NOT NULL,
    descricao text,
    telefone text,
    email text,
    endereco text,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabela EVENTOS
CREATE TABLE IF NOT EXISTS public.eventos (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    titulo text NOT NULL,
    descricao text,
    local text,
    data date NOT NULL,
    horario time without time zone,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabela PROJETOS
CREATE TABLE IF NOT EXISTS public.projetos (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    nome text NOT NULL,
    descricao text,
    objetivo text,
    imagem text,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabela USERS
CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    name text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. TRIGGERS (Updated At)

DO $$ 
BEGIN
    CREATE TRIGGER trigger_atualizar_paginas_updated_at BEFORE UPDATE ON public.paginas FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ 
BEGIN
    CREATE TRIGGER trigger_atualizar_noticias_updated_at BEFORE UPDATE ON public.noticias FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ 
BEGIN
    CREATE TRIGGER trigger_atualizar_galeria_fotos_updated_at BEFORE UPDATE ON public.galeria_fotos FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ 
BEGIN
    CREATE TRIGGER trigger_atualizar_banners_updated_at BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ 
BEGIN
    CREATE TRIGGER trigger_atualizar_documentos_updated_at BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ 
BEGIN
    CREATE TRIGGER trigger_atualizar_equipe_updated_at BEFORE UPDATE ON public.equipe FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ 
BEGIN
    CREATE TRIGGER trigger_atualizar_contatos_updated_at BEFORE UPDATE ON public.contatos FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ 
BEGIN
    CREATE TRIGGER trigger_atualizar_eventos_updated_at BEFORE UPDATE ON public.eventos FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ 
BEGIN
    CREATE TRIGGER trigger_atualizar_projetos_updated_at BEFORE UPDATE ON public.projetos FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 5. POLICIES (Row Level Security)

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.paginas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galeria_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Limpar policies antigas (opcional, mas recomendado para evitar duplicatas se rodar multiple vezes)
DROP POLICY IF EXISTS "Public read active paginas" ON public.paginas;
DROP POLICY IF EXISTS "Public read active noticias" ON public.noticias;
DROP POLICY IF EXISTS "Public read active galeria_fotos" ON public.galeria_fotos;
DROP POLICY IF EXISTS "Public read active banners" ON public.banners;
DROP POLICY IF EXISTS "Public read active documentos" ON public.documentos;
DROP POLICY IF EXISTS "Public read active equipe" ON public.equipe;
DROP POLICY IF EXISTS "Public read active contatos" ON public.contatos;
DROP POLICY IF EXISTS "Public read active eventos" ON public.eventos;
DROP POLICY IF EXISTS "Public read active projetos" ON public.projetos;

-- Criar policies de leitura pública
CREATE POLICY "Public read active paginas" ON public.paginas FOR SELECT USING (ativo = true);
CREATE POLICY "Public read active noticias" ON public.noticias FOR SELECT USING (ativo = true);
CREATE POLICY "Public read active galeria_fotos" ON public.galeria_fotos FOR SELECT USING (ativo = true);
CREATE POLICY "Public read active banners" ON public.banners FOR SELECT USING (ativo = true);
CREATE POLICY "Public read active documentos" ON public.documentos FOR SELECT USING (ativo = true);
CREATE POLICY "Public read active equipe" ON public.equipe FOR SELECT USING (ativo = true);
CREATE POLICY "Public read active contatos" ON public.contatos FOR SELECT USING (ativo = true);
CREATE POLICY "Public read active eventos" ON public.eventos FOR SELECT USING (ativo = true);
CREATE POLICY "Public read active projetos" ON public.projetos FOR SELECT USING (ativo = true);

-- Permissões de Admin (para simplicidade, permitindo authenticated user fazer tudo)
-- Em produção real, você pode querer restringir mais, mas para começar isso resolve.
CREATE POLICY "Admin full access" ON public.paginas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access noticias" ON public.noticias FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access galeria_fotos" ON public.galeria_fotos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access banners" ON public.banners FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access documentos" ON public.documentos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access equipe" ON public.equipe FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access contatos" ON public.contatos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access eventos" ON public.eventos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access projetos" ON public.projetos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access users" ON public.users FOR ALL USING (auth.role() = 'authenticated');

-- 6. STORAGE BUCKETS

-- Criar buckets se não existirem
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('imagens', 'imagens', true), 
  ('documentos', 'documentos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policies de Storage (Leitura Pública)
DROP POLICY IF EXISTS "Public read access imagens" ON storage.objects;
CREATE POLICY "Public read access imagens" ON storage.objects FOR SELECT USING (bucket_id = 'imagens');

DROP POLICY IF EXISTS "Public read access documentos" ON storage.objects;
CREATE POLICY "Public read access documentos" ON storage.objects FOR SELECT USING (bucket_id = 'documentos');

-- Policies de Storage (Escrita Autenticada)
CREATE POLICY "Auth upload imagens" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'imagens');
CREATE POLICY "Auth update imagens" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'imagens');
CREATE POLICY "Auth delete imagens" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'imagens');

CREATE POLICY "Auth upload documentos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "Auth update documentos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documentos');
CREATE POLICY "Auth delete documentos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documentos');

-- 7. DADOS INICIAIS (Opcional - Páginas)
INSERT INTO public.paginas (nome, titulo, descricao) VALUES
('secretaria', 'Secretaria', 'Página da Secretaria'),
('demutran', 'Demutran', 'Página da Demutran'),
('guarda-municipal', 'Guarda Municipal', 'Página da Guarda Municipal'),
('jovem-guarda', 'Jovem Guarda', 'Página da Jovem Guarda'),
('guarda-cidada', 'Guarda Cidadã', 'Página da Guarda Cidadã'),
('rope', 'ROPE', 'Página do ROPE'),
('gmam', 'GMAM', 'Página do GMAM'),
('gsu', 'GSU', 'Página do GSU'),
('defesa-civil', 'Defesa Civil', 'Página da Defesa Civil')
ON CONFLICT (nome) DO NOTHING;

-- FIM DO SCRIPT
