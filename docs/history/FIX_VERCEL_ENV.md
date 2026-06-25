# Instruções para Configurar Variáveis de Ambiente no Vercel

## Problema

A aplicação está apresentando o erro:
```
Uncaught Error: supabaseUrl is required.
```

## Causa

As variáveis de ambiente do Supabase não estão configuradas corretamente no ambiente de produção do Vercel.

## Solução

Siga os passos abaixo para configurar as variáveis de ambiente no painel do Vercel:

### Passo 1: Acesse o Painel do Vercel

1. Acesse https://vercel.com
2. Faça login com sua conta
3. Selecione o projeto que está apresentando o erro

### Passo 2: Configure as Variáveis de Ambiente

1. No painel do projeto, vá até **Settings**
2. Clique em **Environment Variables**
3. Adicione as seguintes variáveis:

#### Variáveis Necessárias:

```
VITE_SUPABASE_URL=https://dtuojkipijsmrmsynqjw.supabase.co
```
```
VITE_SUPABASE_ANON_KEY=<cole-a-chave-anon-do-seu-projeto-Supabase>
```

### Passo 3: Reimplantar a Aplicação

1. Após adicionar as variáveis de ambiente, vá para a seção **Deployments**
2. Selecione a implantação mais recente
3. Clique em **Redeploy**

## Importante

- As variáveis de ambiente só estarão disponíveis durante o build e runtime no Vercel
- Certifique-se de que está usando o prefixo `VITE_` para que o Vite inclua as variáveis no bundle final
- A chave anônima (`VITE_SUPABASE_ANON_KEY`) é pública e pode ser usada no frontend, mas tenha cuidado com as permissões no Supabase

## Verificação

Após a reimplantação, acesse sua aplicação e verifique se o erro não ocorre mais.