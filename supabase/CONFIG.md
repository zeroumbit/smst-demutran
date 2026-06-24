# Configurações do Supabase para o Projeto S.M.S.T.

Este arquivo resume as configurações importantes para o desenvolvimento e deploy do sistema.

## Projeto Supabase
- ID: dtuojkipijsmrmsynqjw
- URL: https://dtuojkipijsmrmsynqjw.supabase.co

## Dados Importantes
- Anon Public Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1weHpwcnFxaGNkaXV0bWlubXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MDk4OTMsImV4cCI6MjA3NjI4NTg5M30.JLTwZjIpw_o6aqeTlb-0q7DqwbVehGIEl6myYpf1Mdw
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