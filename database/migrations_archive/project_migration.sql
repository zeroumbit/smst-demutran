-- Tabelas do projeto SISTE SMST

-- Tabela de noticias
CREATE TABLE IF NOT EXISTS public.noticias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo text NOT NULL,
    resumo text NOT NULL,
    conteudo text NOT NULL,
    imagem text,
    ativo boolean DEFAULT true,
    data timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de eventos
CREATE TABLE IF NOT EXISTS public.eventos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo text NOT NULL,
    descricao text,
    local text,
    data date NOT NULL,
    horario time without time zone,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de projetos
CREATE TABLE IF NOT EXISTS public.projetos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    descricao text,
    objetivo text,
    imagem text,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de galeria_fotos
CREATE TABLE IF NOT EXISTS public.galeria_fotos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    url text NOT NULL,
    titulo text NOT NULL,
    descricao text,
    possui_link boolean DEFAULT false,
    link_destino text,
    categoria text,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de users
CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    name text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Função para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION public.atualizar_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers para atualizar o campo updated_at automaticamente
CREATE TRIGGER trigger_atualizar_noticias_updated_at
  BEFORE UPDATE ON public.noticias
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_updated_at();

CREATE TRIGGER trigger_atualizar_eventos_updated_at
  BEFORE UPDATE ON public.eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_updated_at();

CREATE TRIGGER trigger_atualizar_projetos_updated_at
  BEFORE UPDATE ON public.projetos
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_updated_at();

CREATE TRIGGER trigger_atualizar_galeria_fotos_updated_at
  BEFORE UPDATE ON public.galeria_fotos
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_updated_at();

CREATE TRIGGER trigger_atualizar_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_updated_at();

-- Policies para permitir leitura pública apenas para conteúdos ativos
CREATE POLICY "Public read active noticias" ON public.noticias
FOR SELECT
USING (ativo = true);

CREATE POLICY "Public read active eventos" ON public.eventos
FOR SELECT
USING (ativo = true);

CREATE POLICY "Public read active projetos" ON public.projetos
FOR SELECT
USING (ativo = true);

CREATE POLICY "Public read active galeria_fotos" ON public.galeria_fotos
FOR SELECT
USING (ativo = true);

-- Permissões para administradores autenticados
-- Para todas as tabelas, administradores podem fazer todas as operações
CREATE POLICY "Admin full access noticias" ON public.noticias
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access eventos" ON public.eventos
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access projetos" ON public.projetos
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access galeria_fotos" ON public.galeria_fotos
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access users" ON public.users
FOR ALL
USING (auth.role() = 'authenticated');

-- Habilitar RLS nas tabelas
ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galeria_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Adicionando constraints únicas e chaves primárias se não existirem
ALTER TABLE ONLY public.noticias
    ADD CONSTRAINT noticias_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.eventos
    ADD CONSTRAINT eventos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.projetos
    ADD CONSTRAINT projetos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.galeria_fotos
    ADD CONSTRAINT galeria_fotos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
    
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);