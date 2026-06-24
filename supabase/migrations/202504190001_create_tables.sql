-- Tabela de noticias
CREATE TABLE public.noticias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  resumo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  imagem TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  data TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de eventos
CREATE TABLE public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  local TEXT,
  data DATE NOT NULL,
  horario TIME,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de projetos
CREATE TABLE public.projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  objetivo TEXT,
  imagem TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de galeria_fotos
CREATE TABLE public.galeria_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  possui_link BOOLEAN DEFAULT FALSE,
  link_destino TEXT,
  categoria TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de users
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de equipe
CREATE TABLE public.equipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  setor TEXT,
  email TEXT,
  telefone TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de contatos
CREATE TABLE public.contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Função para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar o campo updated_at automaticamente
CREATE TRIGGER trigger_atualizar_noticias_updated_at
  BEFORE UPDATE ON public.noticias
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_atualizar_eventos_updated_at
  BEFORE UPDATE ON public.eventos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_atualizar_projetos_updated_at
  BEFORE UPDATE ON public.projetos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_atualizar_galeria_fotos_updated_at
  BEFORE UPDATE ON public.galeria_fotos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_atualizar_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_atualizar_equipe_updated_at
  BEFORE UPDATE ON public.equipe
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_atualizar_contatos_updated_at
  BEFORE UPDATE ON public.contatos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at();

-- Policies para permitir leitura pública apenas para conteúdos ativos
CREATE POLICY "Public read active noticias" ON public.noticias
FOR SELECT
USING (ativo = TRUE);

CREATE POLICY "Public read active eventos" ON public.eventos
FOR SELECT
USING (ativo = TRUE);

CREATE POLICY "Public read active projetos" ON public.projetos
FOR SELECT
USING (ativo = TRUE);

CREATE POLICY "Public read active galeria_fotos" ON public.galeria_fotos
FOR SELECT
USING (ativo = TRUE);

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

CREATE POLICY "Admin full access equipe" ON public.equipe
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access contatos" ON public.contatos
FOR ALL
USING (auth.role() = 'authenticated');

-- Habilitar RLS nas tabelas
ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galeria_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;