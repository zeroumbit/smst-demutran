# SMST - Secretaria Municipal de Segurança Pública e Trânsito de Canindé

## Sistema de Gestão Integrada

---

## 1. VISÃO GERAL

O **SMST** é um sistema web completo (PWA - Progressive Web App) desenvolvido para a Secretaria Municipal de Segurança Pública e Trânsito de Canindé (SMST). Ele gerencia todas as áreas da secretaria, incluindo a Guarda Municipal, o Departamento Municipal de Trânsito (DEMUTRAN), programas sociais, serviços ao cidadão e administração interna.

---

## 2. TECNOLOGIAS UTILIZADAS

### Frontend (Interface)

| Tecnologia | Versão | Função |
|---|---|---|
| **React** | 18.3.1 | Framework de interface |
| **TypeScript** | 5.8.3 | Linguagem (tipagem estática) |
| **Vite** | 7.3.1 | Build tool (compilação rápida) |
| **SWC** | - | Transpilador React (mais rápido que Babel) |
| **React Router DOM** | 6.30.1 | Roteamento de páginas |
| **Tailwind CSS** | 3.4.17 | Framework de estilos utilitário |
| **shadcn/ui** | - | Biblioteca de componentes (Radix UI + Radix Primitives) |
| **TanStack React Query** | 5.83.0 | Gerenciamento de estado do servidor (cache, fetching) |
| **React Hook Form** | 7.61.1 | Gerenciamento de formulários |
| **Zod** | 3.25.76 | Validação de esquemas de dados |
| **Recharts** | 2.15.4 | Gráficos e visualizações |
| **jsPDF** | 4.2.1 | Geração de PDFs |
| **xlsx** | 0.18.5 | Geração de planilhas Excel |
| **sonner** | 1.7.4 | Notificações toast |
| **next-themes** | 0.3.0 | Modo escuro/claro |
| **lucide-react** | 0.462.0 | Ícones |
| **date-fns** | 3.6.0 | Manipulação de datas |
| **ESLint** | 9 | Linting de código |

### Backend & Banco de Dados

| Tecnologia | Função |
|---|---|
| **Supabase** | Plataforma completa: PostgreSQL + Autenticação + Armazenamento + Edge Functions |
| **PostgreSQL** | Banco de dados relacional |
| **Supabase Auth** | Autenticação por email/senha com persistência de sessão |
| **Supabase Storage** | Armazenamento de arquivos (imagens, documentos, anexos) |
| **Supabase RPC** | Funções do banco de dados (stored procedures) |
| **Supabase Edge Functions** | 4 funções serverless TypeScript |

### Infraestrutura

| Tecnologia | Função |
|---|---|
| **Vercel** | Hospedagem e deploy |
| **Vite PWA Plugin** | Service worker, manifest, cache offline |
| **Workbox** | Estratégias de cache offline |

---

## 3. ESTRUTURA DO PROJETO

```
site-smst/
├── public/                # Arquivos estáticos (ícones PWA, robots.txt)
├── src/
│   ├── components/
│   │   ├── admin/         # Componentes administrativos
│   │   ├── demutran/      # Layout portal DEMUTRAN
│   │   ├── fala-cidadao/  # Layout Fala Cidadão
│   │   ├── layout/        # Layout público (Navbar, Footer)
│   │   ├── shared/        # Componentes públicos reutilizáveis
│   │   └── ui/            # 53 componentes shadcn/ui
│   ├── contexts/
│   │   └── AuthContext.tsx # Contexto de autenticação
│   ├── hooks/             # Hooks personalizados
│   ├── lib/               # Camada de serviços (Supabase, utilitários)
│   ├── modules/
│   │   └── fiscalizacao/  # Módulo auto-contido (rotas, páginas, hooks, serviços)
│   ├── pages/
│   │   ├── admin/         # 33 páginas administrativas
│   │   └── ...            # 27 páginas públicas
│   └── types/             # Definições TypeScript
├── supabase/
│   ├── migrations/        # 108 migrações SQL
│   ├── functions/         # 4 Edge Functions
│   └── schema.sql         # Schema completo do banco
├── docs/                  # Documentação
└── [arquivos de config]   # vite, tailwind, eslint, vercel, etc.
```

---

## 4. MÓDULOS EXISTENTES

### 4.1 MÓDULO PÚBLICO (Cidadão)

| Rota | Página | Descrição |
|---|---|---|
| `/` | Home | Página inicial com hero, cards, destaques de notícias |
| `/demutran` | Portal DEMUTRAN | Portal principal do departamento de trânsito |
| `/demutran/apreensoes` | Consulta de Veículos | Busca pública de veículos apreendidos |
| `/demutran/credenciais` | Credencial DEMUTRAN | Solicitação de credencial (idoso/PCD) |
| `/demutran/concessionario` | Portal Concessionário | Área do permissionário de transporte |
| `/demutran/concessionario/cadastro` | Cadastro | Auto-cadastro de permissionário |
| `/demutran/recursos` | Recurso de Multas | Interposição de recurso de multa |
| `/demutran/documentos` | Documentos Públicos | Listagem de documentos públicos |
| `/demutran/midias` | Mídias Educativas | Conteúdos educativos de trânsito |
| `/guarda-municipal` | Guarda Municipal | Página institucional |
| `/jovem-guarda` | Jovem Guarda | Programa jovens aprendizes |
| `/guarda-cidada` | Guarda Cidadã | Programa de polícia comunitária |
| `/rope` | ROPE | Registro de Ocorrência da Polícia Escolar |
| `/gmam` | GMAM | Guarda Municipal Ambiental |
| `/gsu` | GSU | Guarda Municipal de Serviços Urbanos |
| `/defesa-civil` | Defesa Civil | Página da Defesa Civil |
| `/noticias` | Notícias | Listagem de notícias |
| `/noticias/:id` | Notícia Detalhe | Notícia completa |
| `/eventos` | Eventos | Listagem de eventos |
| `/contato` | Contato | Página de contato |
| `/fala-cidadao/nova-solicitacao` | Fala Cidadão | Nova solicitação do cidadão |
| `/fala-cidadao/acompanhar` | Acompanhar | Acompanhar solicitação por protocolo |
| `/fala-cidadao/minhas-solicitacoes` | Minhas Solicitações | Solicitações por CPF |
| `/termos-de-uso` | Termos de Uso | Termos legais |
| `/politica-de-privacidade` | Privacidade | Política de privacidade |

### 4.2 MÓDULO ADMINISTRATIVO

#### Dashboard e Perfil
- **Dashboard** (`/admin/dashboard`) - Painel principal com indicadores
- **Dashboard por Setor** (`/admin/dashboard/:setorSlug`) - Painel específico do setor
- **Perfil** (`/admin/perfil`) - Dados do usuário logado

#### Gestão de Conteúdo
- **Notícias** (`/admin/noticias`) - CRUD completo de notícias
- **Eventos** (`/admin/eventos`) - CRUD de eventos
- **Projetos** (`/admin/projetos`) - Gerenciamento de projetos
- **Galeria** (`/admin/galeria`) - Galeria de fotos
- **Equipe** (`/admin/equipe`) - Membros da equipe
- **Banners** (`/admin/banners`) - Banners da home
- **Documentos** (`/admin/documentos`) - Documentos públicos
- **Mídias** (`/admin/midias`) - Mídias educativas

#### Administração do Sistema
- **Setores** (`/admin/setores`) - CRUD de setores (super_admin)
- **Gestores** (`/admin/gestores`) - Atribuição de gestores (super_admin)
- **Usuários** (`/admin/usuarios`) - Gerenciamento de usuários
- **Relatórios** (`/admin/relatorios`) - Relatórios gerenciais (super_admin)

#### Módulo Fala Cidadão
- **Demandas** (`/admin/fala-cidadao`) - Gestão de solicitações cidadãs
- Triagem, encaminhamento e resposta

#### Módulo DEMUTRAN (Admin)
- **Veículos Apreendidos** (`/admin/demutran/veiculos`) - Liberação de veículos
- **Concessionários** (`/admin/demutran/concessionarios`) - Gestão de permissionários
- **Frota Municipal** (`/admin/demutran/frota`) - Gestão de frota
- **Credenciais** (`/admin/demutran/credenciais`) - Gestão de credenciais
- **Recursos de Multas** (`/admin/demutran/recursos`) - Análise de recursos
- **Mídias DEMUTRAN** (`/admin/demutran/midias`) - Banners e conteúdos
- **Configurações** (`/admin/configuracoes-demutran`) - PIX, taxas e valores

#### Módulo Guarda Municipal (Admin)
- **Guarda Municipal** (`/admin/guardas/guarda-municipal`) - Cadastro de guardas
- **IROs** (`/admin/iros/guarda-municipal`) - Operações de IRO
- **Fiscalização** (`/admin/fiscalizacao/infracoes`) - Tipos de infração
- **Fiscalização Categorias** (`/admin/fiscalizacao/categorias`) - Categorias
- **Configurações** (`/admin/configuracoes-guarda-municipal`) - Config. gerais

### 4.3 MÓDULO PERFIL GUARDAS

| Rota | Descrição |
|---|---|
| `/guardas/cadastro` | Auto-cadastro do guarda |
| `/admin/perfil-guardas/guarda-municipal/dashboard` | Painel pessoal |
| `/admin/perfil-guardas/guarda-municipal/iros` | Candidatura e operações IRO |
| `/admin/perfil-guardas/guarda-municipal/iros/historico` | Histórico IRO |
| `/admin/perfil-guardas/guarda-municipal/fiscalizacao` | Consulta infrações |
| `/admin/perfil-guardas/guarda-municipal/perfil` | Editar perfil |
| `/admin/perfil-guardas/guarda-municipal/anotacoes` | Anotações pessoais |

### 4.4 MÓDULO DE FISCALIZAÇÃO

Módulo autossuficiente dentro de `src/modules/fiscalizacao/`:

- **Categorias de Infração** - Cadastro e consulta de categorias
- **Infrações** - Tabela com todas as infrações cadastradas
- **Ficha de Infração** - Detalhamento completo por código
- **Busca de Infrações** - Pesquisa por código, descrição, artigo

Estrutura do módulo:
```
fiscalizacao/
├── routes.tsx                        # Rotas do módulo
├── components/
│   ├── BuscaInfracoes/              # Componentes de busca
│   ├── Categorias/                   # Componentes de categorias
│   ├── FichaInfracao/               # Ficha detalhada
│   └── Shared/                       # Componentes compartilhados
├── pages/
│   ├── CategoriasPage.tsx
│   ├── InfracaoDetalhePage.tsx
│   └── InfracoesPage.tsx
├── hooks/
│   ├── useCategorias.ts             # Hook React Query
│   └── useInfracoes.ts
├── services/
│   └── fiscalizacao.service.ts      # Chamadas Supabase
├── types/
│   └── fiscalizacao.types.ts        # Tipos TypeScript
└── utils/
    └── fiscalizacao.formatters.ts   # Utilitários de formatação
```

### 4.5 MÓDULO DE ANOTAÇÕES

Workspace completo de notas pessoais com:
- CRUD completo de notas
- Categorias de notas
- Favoritos
- Busca por texto
- Suporte a rich text

### 4.6 PWA (Progressive Web App)

- **Instalação** na tela inicial do celular/desktop
- **Notificações push** via service worker
- **Funcionamento offline** com cache de recursos
- **Atualização automática** do service worker
- **Cache inteligente**: API Supabase em StaleWhileRevalidate, Storage em CacheFirst

---

## 5. COMO FUNCIONA

### 5.1 Arquitetura Geral

```
                     ┌──────────────────────┐
                     │     Navegador          │
                     │  (React SPA + PWA)    │
                     └──────┬───────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
       ┌────────────┐ ┌──────────┐ ┌──────────┐
       │ React      │ │ TanStack │ │ next-    │
       │ Router DOM │ │ React    │ │ themes   │
       │ (Rotas)    │ │ Query    │ │ (Tema)   │
       └────────────┘ └──────────┘ └──────────┘
              │             │
              ▼             ▼
       ┌──────────────────────────────┐
       │      Supabase Client         │
       │  (@supabase/supabase-js)    │
       └──────┬───────────────────────┘
              │
              ▼
       ┌──────────────────────────────────────┐
       │           Supabase (Cloud)           │
       ├──────────────────┬───────────────────┤
       │ PostgreSQL (DB)  │   Auth            │
       │ - 108 migrações  │   (email/senha)   │
       │ - RLS policies   │                   │
       ├──────────────────┼───────────────────┤
       │ Storage          │ Edge Functions   │
       │ (imagens, docs)  │ (4 funções TS)   │
       └──────────────────┴───────────────────┘
```

### 5.2 Fluxo de Autenticação

1. Usuário faz login com email + senha
2. Supabase Auth valida e retorna sessão (access_token + refresh_token)
3. Sessão é persistida no localStorage
4. `AuthContext` carrega profile do usuário com papel (role), setor e permissões
5. O componente `ProtectedRoute` verifica:
   - Se usuário está autenticado
   - Se tem o papel necessário (`super_admin`, `gestor`, `admin_setor`, `tecnico`)
   - Se tem acesso ao setor correto (via URL)
   - Se precisa ser guarda municipal
6. Rotas não autorizadas redirecionam para `/admin/login`

### 5.3 Fluxo de Dados

1. **Páginas públicas**: Buscam dados do Supabase via `useEffect` ou via React Query
2. **Páginas administrativas**: Usam **TanStack React Query** para:
   - Cache automático de dados
   - Refetch em background
   - Estados de loading/error
3. **Mutações** (criar/atualizar/deletar): Chamam funções nos services (`src/lib/`) que usam a API do Supabase
4. **Upload de arquivos**: Enviados diretamente ao Supabase Storage, com URL salva no banco

### 5.4 Sistema de Permissões

O sistema possui 4 papéis (roles):

| Papel | Acesso |
|---|---|
| **super_admin** | Acesso total ao sistema |
| **gestor** | Gerencia um setor específico |
| **admin_setor** | Administra conteúdo do setor |
| **tecnico** | Operador técnico com permissões modulares |

Além disso:
- **Isolamento por setor**: Cada usuário vê apenas dados do seu setor
- **Guarda Municipal**: Tem perfil próprio com acesso restrito à área do guarda
- **Módulos específicos**: Técnicos podem ter acesso a módulos específicos (veículos, concessionários, IROs, etc.)

### 5.5 Roteamento

O roteamento é feito pelo **React Router DOM v6** no `App.tsx`:

```typescript
// Exemplo simplificado
<BrowserRouter>
  <Routes>
    {/* Rotas públicas - sem autenticação */}
    <Route path="/" element={<Index />} />
    <Route path="/noticias" element={<Noticias />} />
    
    {/* Rotas administrativas - com proteção */}
    <Route path="/admin" element={<ProtectedRoute allowedPapeis={[...]}>}>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="noticias" element={<NoticiasAdmin />} />
    </Route>
  </Routes>
</BrowserRouter>
```

Todas as páginas são **lazy-loaded** com `React.lazy()` + `Suspense` para code splitting.

### 5.6 Banco de Dados

O banco PostgreSQL possui 108 migrações com tabelas para:

- **Administração**: `admin_profiles`, `setores`, `modulos`, `permissoes_modulo`
- **Guarda Municipal**: `guardas_municipais`, `graduacoes`, `iro_operacoes`, `iro_candidaturas`, `iro_banco_horas`
- **DEMUTRAN**: `demutran_veiculos_recolhidos`, `demutran_frota`, `demutran_concessionarios`, `demutran_credenciais`, `demutran_recursos`
- **Conteúdo**: `noticias`, `eventos`, `projetos`, `galeria`, `banners`, `documentos`, `equipe`
- **Fala Cidadão**: `fala_cidadao_demandas`, `secretarias`, `assuntos`, `historico`
- **Fiscalização**: `fiscalizacao_infracoes`, `fiscalizacao_categorias`
- **Configurações**: `configuracoes` (PIX, taxas)
- **Notificações**: `admin_notifications`

**Segurança**: Row Level Security (RLS) aplica isolamento de dados por setor.

### 5.7 Deploy

- **Plataforma**: Vercel
- **Configuração**: `vercel.json` com headers CSP, rewrites SPA, caching
- **CI/CD**: GitHub Actions sincronizam com Supabase
- **Redirecionamentos**: Todas as rotas SPAs redirecionam para `index.html`
- **Headers de segurança**: Content-Security-Policy configurada

---

## 6. PADRÕES DE ARQUITETURA

### 6.1 Domain-Driven Design (DDD)

O módulo `fiscalizacao` exemplifica o padrão de design com estrutura autossuficiente:
- `types/` - Definições de domínio
- `services/` - Lógica de acesso a dados
- `hooks/` - Integração com React Query
- `components/` - Componentes de UI
- `pages/` - Páginas completas
- `utils/` - Utilitários
- `routes.tsx` - Registro de rotas

### 6.2 Repository Pattern

Arquivos em `src/lib/` centralizam todas as consultas ao Supabase:
- `falaCidadao.ts`, `demutranUploads.ts`, `adminProvision.ts`, `reports.ts`, `relatorio-iro.ts`

### 6.3 Code Splitting

Todas as páginas usam `React.lazy()` com `Suspense` para carregamento sob demanda.

### 6.4 PWA com Service Worker

- Cache de navegação: `navigateFallback: "/index.html"`
- Cache de API: StaleWhileRevalidate para Supabase REST
- Cache de Storage: CacheFirst para arquivos estáticos
- Notificações: Service worker escuta cliques em notificações

---

## 7. SCRIPTS DISPONÍVEIS

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia servidor de desenvolvimento (127.0.0.1:8080) |
| `npm run build` | Compila para produção |
| `npm run preview` | Visualiza build de produção |
| `npm run lint` | Executa ESLint |
| `npm run supabase:sync` | Sincroniza schema com Supabase remoto |

---

## 8. PRINCIPAIS DEPENDÊNCIAS (73 no total)

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.30.1",
  "@supabase/supabase-js": "^2.x",
  "@tanstack/react-query": "^5.83.0",
  "react-hook-form": "^7.61.1",
  "zod": "^3.25.76",
  "recharts": "^2.15.4",
  "jspdf": "^4.2.1",
  "xlsx": "^0.18.5",
  "sonner": "^1.7.4",
  "next-themes": "^0.3.0",
  "lucide-react": "^0.462.0",
  "date-fns": "^3.6.0"
}
```
