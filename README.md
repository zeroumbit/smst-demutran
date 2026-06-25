# Sistema SMST - Secretaria de Segurança de Canindé

Sistema de gerenciamento para a Secretaria de Segurança de Canindé, Ceará.

## Projeto Supabase

Este projeto está integrado com o banco de dados Supabase:

- **URL do Projeto**: https://dtuojkipijsmrmsynqjw.supabase.co
- **ID do Projeto**: dtuojkipijsmrmsynqjw
- **Acesso ao Studio**: https://supabase.com/dashboard/project/dtuojkipijsmrmsynqjw

## Recursos Implementados

### 1. Módulo de Documentos
- Sistema completo de gerenciamento de documentos no painel administrativo
- Upload de arquivos PDF e Word para o Supabase Storage
- Controle de status (ativo/inativo) para documentos
- Definição de local de exibição (Secretaria, Demutran, Guarda Municipal, etc.)
- Interface completa com funcionalidades CRUD (Criar, Ler, Atualizar, Deletar)

### 2. Integração com Supabase
- Backend completo com autenticação, banco de dados e armazenamento
- Configuração para upload e download de arquivos
- Políticas de segurança configuradas
- Tipagem completa para TypeScript

### 3. Melhorias na Interface
- Atualização da tela de login do admin com a logo do sistema
- Remoção do background colorido, mantendo apenas a logo
- Ajuste do tamanho da logo para melhor visibilidade (72px)

### 4. Funcionalidades Administrativas
- Dashboard com estatísticas para todas as seções
- Sistema de notícias, eventos, galeria, banners, equipe e contatos
- Menu administrativo organizado com todas as funcionalidades
- Galeria de fotos com seleção de página de exibição baseada em páginas existentes no sistema
- Fotos da galeria são exibidas de acordo com a página selecionada (ex: fotos específicas aparecem apenas na página de defesa civil)
- Validação para garantir que fotos só sejam associadas a páginas que realmente existem no sistema

### 5. Outras Implementações
- Implementação das regras para seção de últimas notícias na home
- Adição de informações sobre atuação da defesa civil no combate à seca
- Remoção da funcionalidade de projetos do painel admin (mantendo nas páginas públicas)

## Configuração Inicial

### 1. Instalação de Dependências
```bash
npm install
```

### 2. Sincronização Automática com Supabase Cloud

✨ **NOVO**: Sistema de sincronização totalmente automatizado!

Execute o comando de sincronização total:

```bash
npm run sync-total
```

Este comando:
- ✅ Atualiza automaticamente as variáveis de ambiente (`.env`)
- ✅ Configura o projeto Supabase
- ✅ Verifica todas as tabelas no banco de dados
- ✅ Sincroniza com GitHub automaticamente

**Alternativas:**

Apenas Supabase (sem Git):
```bash
npm run cloud-sync
```

PowerShell (Supabase + GitHub):
```powershell
.\sync_all.ps1
```

Batch (Supabase + GitHub):
```cmd
sync_all.bat
```

### 3. Informações do Projeto

- **Supabase URL**: https://dtuojkipijsmrmsynqjw.supabase.co
- **Project ID**: dtuojkipijsmrmsynqjw
- **Dashboard**: https://supabase.com/dashboard/project/dtuojkipijsmrmsynqjw
- **GitHub**: https://github.com/zeroumbit/site-smst

## Scripts Disponíveis

### Sincronização
- `npm run sync-total`: **[RECOMENDADO]** Sincronização completa (Supabase + GitHub)
- `npm run cloud-sync`: Sincroniza apenas com Supabase Cloud
- `.\sync_all.ps1`: Script PowerShell para sincronização completa
- `sync_all.bat`: Script Batch para sincronização completa

### Desenvolvimento
- `npm run dev`: Inicia servidor de desenvolvimento
- `npm run build`: Build de produção
- `npm run preview`: Preview do build
- `npm run lint`: Verifica código com ESLint

### Legado (scripts antigos)
- `npm run setup`: Setup inicial de integração com Supabase
- `npm run integrate`: Integração automática com Supabase
- `npm run sync-supabase`: Verifica sincronização com banco de dados
- `npm run final-sync`: Instruções finais para completar integração


## Acesso ao Painel Administrativo

Após configurar o banco de dados:

1. Inicie o servidor de desenvolvimento
2. Acesse `http://localhost:3000/admin/login`
3. Faça login com suas credenciais de administrador
4. Utilize o módulo de Documentos no menu lateral

## Configuração da Tabela de Documentos

Caso a tabela `documentos` não exista no seu banco de dados Supabase:

1. Acesse o Supabase Studio
2. Vá para a seção SQL Editor
3. Execute o conteúdo do arquivo `CREATE_DOCUMENTOS_TABLE.sql` (localizado na raiz do projeto)
4. Isso criará a tabela `documentos` com todas as permissões e configurações necessárias

## Sincronização com GitHub

Para sincronizar o projeto com o repositório GitHub:

1. Execute o script `github_sync.bat` (Windows) ou `github_sync.sh` (Unix)
2. Ou siga as instruções em `GITHUB_SYNC.md`

## Acesso ao Projeto

- Repositório: https://github.com/zeroumbit/site-smst
- Projeto Supabase: https://supabase.com/dashboard/project/dtuojkipijsmrmsynqjw

## Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
├── pages/admin/         # Páginas do painel administrativo
│   ├── Documentos.tsx   # Novo módulo de documentos
│   ├── Noticias.tsx     # Gerenciamento de notícias
│   ├── Eventos.tsx      # Gerenciamento de eventos
│   └── ...              # Outras páginas admin
├── contexts/            # Contextos da aplicação
├── hooks/               # Hooks personalizados
├── lib/                 # Bibliotecas e configurações
└── types/               # Tipagens TypeScript
```

## Notas Importantes

1. O módulo de documentos está totalmente funcional após a criação da tabela no Supabase
2. O sistema está configurado para trabalhar com o Supabase como backend principal
3. As credenciais e configurações estão armazenadas de forma segura
4. O upload de documentos suporta PDF e arquivos Word (.doc, .docx)
5. Apenas administradores autenticados podem gerenciar documentos

## Solução de Problemas

Se encontrar o erro "Could not find the table 'public.documentos'", siga as instruções do script `npm run final-sync` para criar a tabela manualmente no Supabase Studio.

### Erro: "supabaseUrl is required" no ambiente de produção

Se você encontrar o erro `Uncaught Error: supabaseUrl is required.` no ambiente de produção (Vercel), isso indica que as variáveis de ambiente do Supabase não foram configuradas corretamente no ambiente de produção.

Para resolver este problema:
1. Acesse o painel do Vercel
2. Vá até as configurações do projeto
3. Adicione as seguintes variáveis de ambiente:
   - `VITE_SUPABASE_URL`: `https://dtuojkipijsmrmsynqjw.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `<cole-a-chave-anon-do-seu-projeto-Supabase>`

Consulte a documentação adicional para mais detalhes: [FIX_VERCEL_ENV.md](FIX_VERCEL_ENV.md)

### Erro 404: Falha no carregamento de recursos

Se você encontrar o erro `Failed to load resource: the server responded with a status of 404 ()`, isso indica que os recursos estáticos (CSS, JS, imagens) não estão sendo carregados corretamente no ambiente de produção.

Este problema foi corrigido atualizando o arquivo `vercel.json` para evitar que as regras de reescrita afetem os arquivos de assets. As rotas que não são assets são redirecionadas corretamente para o `index.html`.

### Erros de chamada à API do Supabase

Se você encontrar mensagens de erro como:
- `BannerCarousel-DQd2GyYL.js:6 Erro ao buscar banners: TypeError: Failed to execute 'set' on 'Headers': String contains non ISO-8859-1 code point.`
- `DocumentosExibicao-DnihEjiw.js:6 Erro ao buscar documentos`
- `Index-CzJ4iuZv.js:1 Erro ao buscar notícias`

Esses erros indicam problemas com chamadas à API do Supabase, que foram corrigidos com:
1. Atualização da configuração do cliente Supabase para lidar melhor com caracteres especiais
2. Implementação de tratamento de erro mais robusto nos componentes que fazem chamadas à API
3. Adição de fallback para casos de erro de codificação

### Erro: "Project 'site-smst-kg2m' already exists" no Vercel

Se você encontrar o erro `Project "site-smst-kg2m" already exists, please use a new name.` ao fazer deploy no Vercel, isso indica que já existe um projeto com este nome no Vercel.

Para resolver este problema, siga estas etapas:

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

Se o projeto existente não for mais necessário, você pode excluí-lo no dashboard do Vercel e depois fazer um novo deploy. Alternativamente, pode optar por usar um novo nome durante o processo de deploy.

Mais detalhes sobre a resolução deste problema estão disponíveis em: [VERCEL_PROJECT_RESOLUTION.md](VERCEL_PROJECT_RESOLUTION.md)

## 📚 Documentação Adicional

Para informações detalhadas sobre sincronização e configuração:

- **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** - Status completo da configuração
- **[SYNC_GUIDE.md](SYNC_GUIDE.md)** - Guia completo de sincronização
- **[QUICK_START.md](QUICK_START.md)** - Guia rápido de referência
- **[CORRECOES_REALIZADAS.md](CORRECOES_REALIZADAS.md)** - Detalhes das correções implementadas

## Autores

Sistema desenvolvido para a Secretaria de Segurança de Canindé, Ceará.
