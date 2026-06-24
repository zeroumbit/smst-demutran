-- Script para atualizar o cache do schema da tabela equipe
-- Este script deve ser executado no editor SQL do painel do Supabase

-- Primeiro, verificar se as colunas existem
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'equipe'
ORDER BY ordinal_position;

-- Se as colunas não aparecerem, adicioná-las
ALTER TABLE public.equipe 
ADD COLUMN IF NOT EXISTS pagina_destino TEXT,
ADD COLUMN IF NOT EXISTS foto TEXT;

-- Forçar atualização do cache do PostgREST
NOTIFY pgrst, 'reload schema';

-- Verificar novamente as colunas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'equipe'
ORDER BY ordinal_position;