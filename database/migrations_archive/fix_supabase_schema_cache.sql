-- Script para resolver definitivamente o problema de cache do schema do PostgREST
-- Execute este script no editor SQL do painel do Supabase

-- Verificar as colunas atuais da tabela equipe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'equipe'
ORDER BY ordinal_position;

-- Certificar-se de que as colunas necessárias existem
ALTER TABLE public.equipe 
ADD COLUMN IF NOT EXISTS pagina_destino TEXT,
ADD COLUMN IF NOT EXISTS foto TEXT;

-- Remover colunas obsoletas se ainda existirem
ALTER TABLE public.equipe 
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS telefone;

-- Forçar atualização do cache do PostgREST
NOTIFY pgrst, 'reload schema';

-- Verificar novamente as colunas após as alterações
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'equipe'
ORDER BY ordinal_position;

-- Verificar se há algum problema com permissões
SELECT schemaname, tablename, hasindexes, hasrules, hastriggers 
FROM pg_tables 
WHERE tablename = 'equipe';