# 🔧 CONFIGURAÇÃO DO SUPABASE STORAGE

## Problema Identificado

A logo e os arquivos PDF não estão aparecendo porque os **buckets de storage** não foram configurados no novo projeto Supabase (`dtuojkipijsmrmsynqjw`).

---

## ✅ SOLUÇÃO - PASSO A PASSO

### **PASSO 1: Aplicar Script dos Buckets**

1. Acesse o SQL Editor do Supabase:
   👉 https://supabase.com/dashboard/project/dtuojkipijsmrmsynqjw/sql

2. Clique em **"New Query"**

3. Copie e cole o conteúdo do arquivo `002_create_buckets.sql`

4. Execute (botão **"Run"** ou `Ctrl+Enter`)

---

### **PASSO 2: Fazer Upload da Logo**

Após criar os buckets, você precisa fazer upload da logo:

#### Opção A: Pelo Dashboard do Supabase

1. Acesse: https://supabase.com/dashboard/project/dtuojkipijsmrmsynqjw/storage

2. Clique no bucket **"imagens"**

3. Clique em **"Upload"** e selecione o arquivo `logo.png`

4. Após upload, clique com o botão direito no arquivo → **"Copy URL"**

5. A URL deve ser: `https://dtuojkipijsmrmsynqjw.supabase.co/storage/v1/object/public/imagens/images/logo.png`

#### Opção B: Usando o Script de Upload

Crie um arquivo `upload_logo.js` na raiz do projeto:

```javascript
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://dtuojkipijsmrmsynqjw.supabase.co';
const supabaseKey = 'process.env.VITE_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadLogo() {
  const logoPath = path.join(__dirname, 'public', 'logo.png');
  
  if (!fs.existsSync(logoPath)) {
    console.error('❌ Arquivo logo.png não encontrado em public/logo.png');
    return;
  }

  const fileContent = fs.readFileSync(logoPath);
  const fileName = 'images/logo.png';

  const { data, error } = await supabase.storage
    .from('imagens')
    .upload(fileName, fileContent, { upsert: true });

  if (error) {
    console.error('❌ Erro ao fazer upload:', error.message);
    return;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('imagens')
    .getPublicUrl(fileName);

  console.log('✅ Logo uploadada com sucesso!');
  console.log('URL:', publicUrl);
}

uploadLogo();
```

Depois execute:
```bash
node upload_logo.js
```

---

### **PASSO 3: Verificar Permissões**

Após aplicar o script, verifique se as políticas foram criadas:

1. Acesse: https://supabase.com/dashboard/project/dtuojkipijsmrmsynqjw/storage

2. Clique no bucket **"imagens"** → aba **"Policies"**

3. Devem existir 4 políticas:
   - ✅ Permitir leitura pública de imagens
   - ✅ Permitir upload de imagens
   - ✅ Permitir update de imagens
   - ✅ Permitir delete de imagens

4. Faça o mesmo para o bucket **"documentos"**

---

### **PASSO 4: Testar no Site**

1. Recarregue o site (`npm run dev` se estiver em desenvolvimento)

2. Verifique se a logo aparece no:
   - ✅ Navbar (topo)
   - ✅ Footer (rodapé)
   - ✅ Login (/admin/login)

3. Teste upload de documentos em: `/admin/documentos`

---

## 📋 URLs DAS IMAGENS

Após o upload, as URLs devem ser:

| Arquivo | URL |
|---------|-----|
| Logo Principal | `https://dtuojkipijsmrmsynqjw.supabase.co/storage/v1/object/public/imagens/images/logo.png` |
| Logo Login | `https://dtuojkipijsmrmsynqjw.supabase.co/storage/v1/object/public/imagens/images/logo-login.png` |

---

## 🐛 PROBLEMAS COMUNS

### "Bucket not found"
- **Causa:** Bucket não foi criado
- **Solução:** Aplique o script `002_create_buckets.sql`

### "Permission denied"
- **Causa:** Políticas de acesso não configuradas
- **Solução:** Verifique se as 4 políticas foram criadas para cada bucket

### Imagem não carrega (404)
- **Causa:** Arquivo não foi uploadado ou caminho incorreto
- **Solução:** Faça upload do arquivo para `images/logo.png` dentro do bucket `imagens`

### CORS Error
- **Causa:** Configuração de CORS faltando
- **Solução:** Acesse https://supabase.com/dashboard/project/dtuojkipijsmrmsynqjw/storage/config e adicione `*` em CORS origins (ou a URL do seu site)

---

## 📦 ARQUIVOS CRIADOS

| Arquivo | Descrição |
|---------|-----------|
| `002_create_buckets.sql` | Script SQL para criar buckets e políticas |
| `STORAGE_SETUP.md` | Este guia de configuração |

---

## ✅ CHECKLIST FINAL

- [ ] Aplicar script `002_create_buckets.sql` no SQL Editor
- [ ] Criar bucket `imagens` (se não foi automático)
- [ ] Criar bucket `documentos` (se não foi automático)
- [ ] Fazer upload da `logo.png` em `imagens/images/logo.png`
- [ ] Fazer upload da `logo-login.png` em `imagens/images/logo-login.png`
- [ ] Verificar políticas de acesso criadas
- [ ] Testar carregamento da logo no site
- [ ] Testar upload de documentos PDF

---

**Projeto:** dtuojkipijsmrmsynqjw  
**URL:** https://dtuojkipijsmrmsynqjw.supabase.co  
**Dashboard:** https://supabase.com/dashboard/project/dtuojkipijsmrmsynqjw
