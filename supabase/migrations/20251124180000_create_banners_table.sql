-- Criação da tabela banners para gerenciamento de banners no sistema

CREATE TABLE IF NOT EXISTS banners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pagina_destino TEXT NOT NULL,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL,
    url TEXT NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criação do trigger para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_atualizar_banners_updated_at ON banners;
CREATE TRIGGER trigger_atualizar_banners_updated_at 
    BEFORE UPDATE ON banners 
    FOR EACH ROW 
    EXECUTE FUNCTION atualizar_updated_at();

-- Políticas de segurança
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin full access banners' AND tablename = 'banners') THEN
    CREATE POLICY "Admin full access banners" ON banners 
    FOR ALL 
    USING (auth.role() = 'authenticated') 
    WITH CHECK (auth.role() = 'authenticated');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read active banners' AND tablename = 'banners') THEN
    CREATE POLICY "Public read active banners" ON banners 
    FOR SELECT 
    USING (ativo = true);
  END IF;
END;
$$;