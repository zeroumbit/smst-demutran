# Guia de Configuração Manual do Supabase e Vercel

Seu problema de "404 Not Found" e "Erro ao carregar fotos/notícias" ocorre porque, embora o código esteja na Vercel, o **Banco de Dados Supabase de Produção** provavelmente está vazio ou desconfigurado.

O GitHub sincroniza apenas o **código**, não o banco de dados. Você precisa rodar os scripts SQL no seu projeto Supabase que está ligado à Vercel.

Siga estes passos exatos para resolver:

## 1. Configurar o Banco de Dados (Tabelas e Permissões)

1.  Acesse o painel do Supabase ([supabase.com/dashboard](https://supabase.com/dashboard)) e selecione o projeto que você está usando na produção.
2.  No menu lateral esquerdo, clique em **SQL Editor**.
3.  Clique em **+ New Query**.
4.  Copie **TODO** o conteúdo do arquivo `SUPABASE_PRODUCTION_SETUP_FULL.sql` que criei na raiz do seu projeto.
5.  Cole no editor do Supabase.
6.  Clique em **Run** (botão verde).
    *   *Se der algum erro de "relation already exists", não se preocupe, o script tenta lidar com isso, mas verifique se todas as tabelas foram criadas.*

## 2. Configurar Variáveis de Ambiente na Vercel

Para que o site na Vercel consiga "falar" com esse banco de dados:

1.  Acesse o painel da Vercel, selecione seu projeto.
2.  Vá em **Settings** > **Environment Variables**.
3.  Certifique-se de que as seguintes variáveis estão definidas (copie os valores do seu projeto Supabase > Settings > API):
    *   `VITE_SUPABASE_URL`: (Sua URL do projeto, ex: `https://xyz.supabase.co`)
    *   `VITE_SUPABASE_ANON_KEY`: (Sua chave pública `anon`)
4.  Se você alterou alguma variável, vá na aba **Deployments** e clique em **Redeploy** no último deploy para aplicar as mudanças.

## 3. Upload de Conteúdo (Imagens e Notícias)

Agora que o banco existe, ele ainda está vazio de conteúdo (exceto as páginas básicas).
Você precisará:
1.  Fazer login no painel administrativo do seu site (`/login` ou `/admin`).
2.  Cadastrar as notícias e fazer upload das fotos novamente através do painel admin.
    *   *Como é um banco novo na nuvem, as fotos que você tinha localmente não vão "subir" sozinhas.*

## Resumo do Problema 404
O erro 404 que você viu no log (`gru1::shvz7...`) provavelmente era uma tentativa de acessar um recurso que não existia (como uma imagem) ou uma rota de API mal configurada. Com o banco criado e o Storage configurado publicamente (como fiz no script), esses erros devem desaparecer.
