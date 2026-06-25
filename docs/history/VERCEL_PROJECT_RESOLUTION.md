# Resolução do Problema: "Project 'site-smst-kg2m' already exists"

## Descrição do Problema
Ao tentar fazer deploy no Vercel, ocorreu o erro: "Project 'site-smst-kg2m' already exists, please use a new name."

## Causa Raiz
O Vercel já possui um projeto registrado com o nome "site-smst-kg2m", o que impede que um novo projeto seja criado com o mesmo nome.

## Soluções Possíveis

### Opção 1: Conectar ao Projeto Existente (Recomendado)
Se o projeto existente no Vercel ainda for válido e você quiser continuar usando-o:

1. Instale o CLI do Vercel:
   ```bash
   npm install -g vercel
   ```

2. Faça login na sua conta do Vercel:
   ```bash
   vercel login
   ```

3. Conecte-se ao projeto existente:
   ```bash
   vercel link
   ```
   Este comando irá pedir para você selecionar o projeto existente chamado "site-smst-kg2m"

4. Após conectar, você pode fazer deploy com:
   ```bash
   vercel --prod
   ```

### Opção 2: Excluir Projeto Existente
Se o projeto existente não for mais necessário:

1. Acesse o dashboard do Vercel: https://vercel.com/dashboard
2. Navegue até o projeto "site-smst-kg2m"
3. Vá para Settings > Danger Zone
4. Selecione "Delete Project"
5. Após a exclusão, faça um novo deploy

### Opção 3: Renomear o Projeto Local
Se desejar usar um novo nome para o projeto:

1. Durante o processo de deploy, o Vercel perguntará se deseja renomear
2. Escolha um novo nome (por exemplo, "site-smst-novo")
3. O deploy continuará com o novo nome

## Variáveis de Ambiente Necessárias
Certifique-se de que as seguintes variáveis de ambiente estão configuradas no Vercel:

```
VITE_SUPABASE_URL=https://dtuojkipijsmrmsynqjw.supabase.co
VITE_SUPABASE_ANON_KEY=<cole-a-chave-anon-do-seu-projeto-Supabase>
```

## Dica Importante
O problema pode surgir quando você tenta fazer deploy de um repositório que já foi conectado a um projeto Vercel anteriormente. O CLI do Vercel tenta criar um novo projeto com base no nome do repositório, mas um projeto com esse nome já existe.

## Arquivo de Configuração Local
Opcionalmente, você pode adicionar um arquivo `.vercel/project.json` com a configuração do projeto para manter o controle da associação:

```json
{
  "projectId": "projeto_id_aqui",
  "orgId": "organizacao_id_aqui",
  "settings": {
    "framework": "vite",
    "serverless": true
  }
}
```

## Arquivo vercel.json Corrigido
O arquivo `vercel.json` já foi corrigido e deve conter:

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "(.*)\\.(js|css|json)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/assets/(.*)",
      "destination": "/assets/$1"
    },
    {
      "source": "/images/(.*)",
      "destination": "/images/$1"
    },
    {
      "source": "/(.*)\\.(ico|png|jpg|jpeg|svg|txt|xml|json)",
      "destination": "/$1.$2"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```