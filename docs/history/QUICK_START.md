# 🚀 Guia Rápido de Sincronização

## ⚡ Sincronização Rápida

### Apenas Supabase
```bash
npm run cloud-sync
```

### Supabase + GitHub (PowerShell)
```powershell
.\sync_all.ps1
```

### Supabase + GitHub (Batch)
```cmd
sync_all.bat
```

## 📊 Status do Projeto

✅ **Configurado e Pronto para Uso**

- **GitHub**: https://github.com/zeroumbit/site-smst
- **Supabase**: https://dtuojkipijsmrmsynqjw.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/dtuojkipijsmrmsynqjw

## 🔧 Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run cloud-sync` | Sincroniza com Supabase |
| `.\sync_all.ps1` | Sincronização completa (Supabase + Git) |
| `sync_all.bat` | Sincronização completa (alternativa) |

## 📁 Arquivos Importantes

- `.env` - Variáveis de ambiente (auto-gerado, não commitar)
- `supabase/schema.sql` - Schema completo do banco
- `supabase/config.toml` - Configuração do Supabase
- `auto_cloud_sync.js` - Script de sincronização
- `SYNC_GUIDE.md` - Documentação completa

## 🎯 Workflow Diário

1. **Iniciar desenvolvimento**
   ```bash
   npm run dev
   ```

2. **Fazer alterações no código**
   - Edite arquivos em `src/`
   - Teste localmente

3. **Sincronizar tudo**
   ```powershell
   .\sync_all.ps1
   ```

Pronto! Suas alterações estão no Supabase e no GitHub.

## 🆘 Problemas Comuns

### Tabelas não aparecem no Supabase
1. Execute `npm run cloud-sync`
2. Acesse o Dashboard SQL Editor
3. Cole e execute `supabase/schema.sql`

### Erro no Git Push
```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
```

### Erro de autenticação Supabase
Verifique as chaves em `auto_cloud_sync.js`

## 📚 Documentação Completa

Veja `SYNC_GUIDE.md` para documentação detalhada.

---

**Última atualização**: 2025-11-26
