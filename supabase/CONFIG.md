# Configurações do Supabase para o Projeto S.M.S.T.

Este arquivo resume as configurações importantes para o desenvolvimento e deploy do sistema.

## Projeto Supabase
- ID: dtuojkipijsmrmsynqjw
- URL: https://dtuojkipijsmrmsynqjw.supabase.co

## Dados Importantes
- Anon Public Key: (definir via variável de ambiente VITE_SUPABASE_ANON_KEY)
- Service Role Key: (definir via variável de ambiente SUPABASE_SERVICE_ROLE_KEY)

## Tabelas do Banco de Dados
- noticias: Notícias e comunicados
- eventos: Eventos e atividades
- projetos: Projetos e campanhas
- galeria_fotos: Fotos e imagens
- users: Autenticação de administradores

## Migrações
- Localização: supabase/migrations/
- Primeira migração: 202504190001_create_tables.sql