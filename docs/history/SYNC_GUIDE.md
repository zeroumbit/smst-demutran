# 🔄 Sincronização Automática com Supabase Cloud

Este documento descreve como usar o sistema de sincronização automática entre a aplicação local e o Supabase Cloud.

## 📋 Informações do Projeto

- **GitHub**: https://github.com/zeroumbit/site-smst
- **Supabase URL**: https://dtuojkipijsmrmsynqjw.supabase.co
- **Project ID**: dtuojkipijsmrmsynqjw
- **Dashboard**: https://supabase.com/dashboard/project/dtuojkipijsmrmsynqjw

## 🚀 Métodos de Sincronização

### Método 1: Script Node.js (Recomendado)

Execute o script de sincronização com Supabase:

```bash
npm run cloud-sync
```

Este script:
- ✅ Atualiza o arquivo `.env` com as credenciais corretas
- ✅ Atualiza o `supabase/config.toml` com o Project ID
- ✅ Sincroniza o schema com o Supabase Cloud
- ✅ Verifica a conexão com todas as tabelas

### Método 2: Sincronização Completa (PowerShell)

Para sincronizar com Supabase E fazer commit/push para GitHub:

```powershell
.\sync_all.ps1
```

Este script executa:
1. Sincronização com Supabase Cloud
2. Git add de todas as alterações
3. Git commit com timestamp
4. Git push para GitHub (main ou master)

### Método 3: Sincronização Completa (Batch)

Alternativa em Batch para Windows:

```cmd
sync_all.bat
```

Executa as mesmas operações do script PowerShell.

## 📁 Estrutura de Arquivos

```
site-smst/
├── auto_cloud_sync.js      # Script principal de sincronização
├── sync_all.ps1            # Script PowerShell completo
├── sync_all.bat            # Script Batch completo
├── .env                    # Variáveis de ambiente (auto-gerado)
└── supabase/
    ├── config.toml         # Configuração do Supabase
    ├── schema.sql          # Schema completo do banco
    └── migrations/         # Migrações SQL
```

## 🔑 Variáveis de Ambiente

O arquivo `.env` é automaticamente atualizado com:

```env
VITE_SUPABASE_URL=https://dtuojkipijsmrmsynqjw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_PROJECT_ID=dtuojkipijsmrmsynqjw
# SUPABASE_SERVICE_ROLE_KEY=sbp_xxx (substitua pelo seu token)
```

⚠️ **IMPORTANTE**: Nunca commite o arquivo `.env` para o GitHub! Ele já está no `.gitignore`.

## 📊 Tabelas Sincronizadas

O sistema sincroniza as seguintes tabelas:

- ✅ `paginas` - Páginas do sistema
- ✅ `galeria_fotos` - Galeria de fotos
- ✅ `noticias` - Notícias
- ✅ `eventos` - Eventos
- ✅ `projetos` - Projetos
- ✅ `equipe` - Membros da equipe
- ✅ `contatos` - Informações de contato
- ✅ `documentos` - Documentos
- ✅ `user_roles` - Roles de usuários

## 🔧 Aplicando Migrações Manualmente

### Via Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/dtuojkipijsmrmsynqjw
2. Vá para **SQL Editor**
3. Cole o conteúdo de `supabase/schema.sql`
4. Execute o SQL

### Via Supabase CLI (Avançado)

Se você tiver o Supabase CLI instalado:

```bash
# Login no Supabase
supabase login

# Link com o projeto
supabase link --project-ref dtuojkipijsmrmsynqjw

# Aplicar migrações
supabase db push

# Ou aplicar uma migração específica
supabase db push --include-all
```

## 🐛 Solução de Problemas

### Erro: "Tabela não encontrada"

Execute a sincronização completa:

```bash
npm run cloud-sync
```

Depois, aplique o schema manualmente via Dashboard.

### Erro: "Authentication failed"

Verifique se as credenciais no script `auto_cloud_sync.js` estão corretas:

- ANON_KEY
- SERVICE_ROLE_KEY
- PROJECT_ID

### Erro no Git Push

Verifique se você está autenticado no GitHub:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
```

## 📝 Workflow Recomendado

1. **Desenvolvimento Local**
   ```bash
   npm run dev
   ```

2. **Fazer Alterações no Schema**
   - Edite `supabase/schema.sql` ou crie uma nova migração em `supabase/migrations/`

3. **Sincronizar com Supabase**
   ```bash
   npm run cloud-sync
   ```

4. **Aplicar Migrações via Dashboard**
   - Acesse o SQL Editor
   - Execute o SQL da migração

5. **Commit e Push**
   ```powershell
   .\sync_all.ps1
   ```

## 🔐 Segurança

- ✅ O arquivo `.env` está no `.gitignore`
- ✅ As chaves de API não são commitadas
- ✅ Use `ANON_KEY` no frontend
- ✅ Use `SERVICE_ROLE_KEY` apenas em scripts backend/admin
- ⚠️ Nunca exponha o `SERVICE_ROLE_KEY` no código do frontend

## 📚 Recursos Adicionais

- [Documentação do Supabase](https://supabase.com/docs)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
- [Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)

## 🆘 Suporte

Em caso de problemas:

1. Verifique os logs do script de sincronização
2. Acesse o Supabase Dashboard para verificar o status do banco
3. Consulte a documentação oficial do Supabase
4. Verifique se todas as dependências estão instaladas: `npm install`

---

**Última atualização**: 2025-11-26
