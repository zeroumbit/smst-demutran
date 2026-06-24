# Configuração do Banco de Dados Supabase

Este diretório contém os arquivos de configuração e migrações para o banco de dados Supabase do projeto S.M.S.T.

## Projeto Supabase

- **ID do Projeto**: dtuojkipijsmrmsynqjw
- **URL do Projeto**: https://dtuojkipijsmrmsynqjw.supabase.co

## Estrutura de Diretórios

```
supabase/
├── config.toml          # Configuração do projeto Supabase
├── migrations/          # Scripts de migração do banco de dados
│   └── 202504190001_create_tables.sql
├── seed.sql             # Dados iniciais para o banco de dados
├── .env                 # Variáveis de ambiente (não commitado)
├── .env.example         # Exemplo de variáveis de ambiente
└── CONFIG.md            # Documentação de configurações importantes
```

## Tabelas Criadas

O sistema utiliza as seguintes tabelas:

1. **noticias** - Armazena as notícias e comunicados
2. **eventos** - Gerencia eventos e atividades
3. **projetos** - Gerencia projetos e campanhas
4. **galeria_fotos** - Armazena fotos e imagens
5. **users** - Autenticação de usuários do sistema administrativo

## Migrações

As migrações são executadas em ordem sequencial com base no nome do arquivo. Cada arquivo de migração contém comandos SQL para criar ou alterar estruturas no banco de dados.

## Sincronização com GitHub

Este projeto está configurado para sincronizar automaticamente com o Supabase quando há alterações na branch principal.

### Configuração Necessária:

1. No repositório do GitHub, adicione as seguintes secrets no Settings:
   - `SUPABASE_ACCESS_TOKEN`: Token de acesso para o CLI do Supabase
   - `SUPABASE_PROJECT_ID`: dtuojkipijsmrmsynqjw (ID do projeto no Supabase)
   - `SUPABASE_DB_PASSWORD`: Senha do banco de dados do projeto

### Para executar migrações localmente:

```bash
# Instale o CLI do Supabase
npm install -g @supabase/cli

# Inicie o banco de dados local
supabase start

# Execute as migrações
supabase db push

# Ou para criar uma nova migração
supabase db diff -f nome_da_migracao
```

### Política de Segurança

O sistema implementa Row Level Security (RLS) com as seguintes políticas:
- Leitura pública permitida apenas para registros com `ativo = TRUE`
- Acesso administrativo completo para usuários autenticados