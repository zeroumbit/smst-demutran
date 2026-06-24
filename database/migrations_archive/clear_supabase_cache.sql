-- Script SQL para resolver o problema de cache do schema do Supabase
-- Execute esta query no editor SQL do painel do Supabase (https://supabase.com/dashboard/project/dtuojkipijsmrmsynqjw/sql)

-- Passo 1: Verificar se as colunas existem na tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'equipe' 
AND column_name IN ('foto', 'pagina_destino', 'email', 'telefone')
ORDER BY ordinal_position;

-- Passo 2: Se as colunas foto e pagina_destino NÃO existirem, adicione-as
-- (executar cada linha separadamente se necessário)
ALTER TABLE public.equipe ADD COLUMN IF NOT EXISTS foto TEXT;
ALTER TABLE public.equipe ADD COLUMN IF NOT EXISTS pagina_destino TEXT;

-- Passo 3: Remover colunas obsoletas se ainda existirem
ALTER TABLE public.equipe DROP COLUMN IF EXISTS email CASCADE;
ALTER TABLE public.equipe DROP COLUMN IF EXISTS telefone CASCADE;

-- Passo 4: Forçar atualização do cache do PostgREST (ESSA É A CHAVE!)
NOTIFY pgrst, 'reload schema';

-- Passo 5: Verificar novamente as colunas após atualização
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'equipe'
ORDER BY ordinal_position;

-- Passo 6: Verificar as permissões da tabela
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'equipe';

-- Depois de executar este script, o cache do schema estará atualizado
-- e as operações de CRUD na tabela equipe funcionarão corretamente