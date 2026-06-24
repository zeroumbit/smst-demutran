-- Remover campos email e telefone da tabela equipe (se ainda existirem)
-- Este script deve ser executado no editor SQL do painel do Supabase

-- Primeiro, verificar se os campos existem
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'equipe' AND column_name IN ('email', 'telefone')
ORDER BY ordinal_position;

-- Remover os campos se eles existirem
ALTER TABLE public.equipe 
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS telefone;

-- Verificar novamente as colunas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'equipe'
ORDER BY ordinal_position;

-- Forçar atualização do cache do PostgREST
NOTIFY pgrst, 'reload schema';