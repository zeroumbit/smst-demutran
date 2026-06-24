# Integração com Supabase

Este documento descreve como o projeto está configurado para sincronizar com o Supabase.

## Projeto Supabase

- **ID do Projeto**: dtuojkipijsmrmsynqjw
- **URL do Projeto**: https://[project-ref].supabase.co
- **Anon Public Key**: [anon-public-key]
- **Service Role Key**: [service-role-key]

## URL de Acesso

A URL pública do seu projeto está disponível em: [https://[project-ref].supabase.co](https://[project-ref].supabase.co)

Esta URL é usada para:
- Acesso à API REST do Supabase
- Conexão do cliente do seu aplicativo
- Acesso ao Studio do Supabase

## Credenciais de Segurança

**Importante**: As credenciais sensíveis do Supabase devem ser mantidas em segredo e não documentadas publicamente.

**Atenção**: Credenciais como Anon Keys, Service Role Keys e Secret Keys concedem diferentes níveis de acesso ao banco de dados e não devem ser expostas em código-fonte público ou compartilhadas indevidamente.

## Configuração do Banco de Dados

O banco de dados está configurado com as seguintes tabelas:

- `noticias` - Notícias e comunicados
- `eventos` - Eventos e atividades
- `projetos` - Projetos e campanhas
- `galeria_fotos` - Fotos e imagens
- `users` - Autenticação de administradores

Todas as migrações do banco de dados estão localizadas em `supabase/migrations/`.

## CI/CD com GitHub Actions

O workflow de sincronização está configurado em `.github/workflows/supabase-sync.yml` e é executado automaticamente quando há mudanças na branch principal.

## Configurações Necessárias

Para que a sincronização funcione, as seguintes variáveis de ambiente devem ser configuradas nos segredos do repositório no GitHub:

- `SUPABASE_ACCESS_TOKEN` - Token de acesso ao Supabase CLI (formato: sbp_... obtido no painel do Supabase)
- `SUPABASE_PROJECT_ID` - dtuojkipijsmrmsynqjw (ID do projeto Supabase)
- `SUPABASE_DB_PASSWORD` - Senha do banco de dados

## Como Obter o Token de Acesso ao CLI do Supabase

Para obter o token de acesso ao CLI do Supabase:

1. Acesse o painel do Supabase em [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Faça login com sua conta
3. Vá para "Account Settings"
4. Na seção "Access Tokens", clique em "Create personal access token"
5. Dê um nome ao token (ex: "CLI Access Token")
6. Copie o token gerado e use como `SUPABASE_ACCESS_TOKEN`

**Importante**: O token de acesso ao CLI tem formato específico (começa com `sbp_`) e é diferente do JWT token.

## Desenvolvimento Local

Para desenvolvimento local com o Supabase:

1. Instale o CLI do Supabase: `npm install -g @supabase/cli`
2. Faça login: `supabase login`
3. Execute o banco localmente: `supabase start`
4. Para aplicar as migrações locais: `supabase db push`

Para mais informações, consulte a documentação em `supabase/README.md` e `supabase/CONFIG.md`.