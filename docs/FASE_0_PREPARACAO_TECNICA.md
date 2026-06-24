# Fase 0 - Preparacao Tecnica para a Reformulacao SMST

## Objetivo

Este documento consolida a `Fase 0` do plano de reformulacao em um artefato tecnico executavel. A meta desta etapa e registrar:

- o estado atual real do projeto;
- as decisoes arquiteturais recomendadas para liberar a implementacao;
- os pontos que dependem de validacao funcional;
- o escopo minimo que deve estar fechado antes da `Fase 1`.

Este material foi produzido com base no codigo e schema existentes no repositorio na data de `2026-06-15`.

---

## 1. Diagnostico do Estado Atual

### 1.1 Front-end

Situacao observada no codigo:

- o contexto de autenticacao em [src/contexts/AuthContext.tsx](/e:/0%20SASS/2%20municipais/site%20smst/src/contexts/AuthContext.tsx) trabalha apenas com:
  - sessao autenticada;
  - usuario simples;
  - booleano `isAdmin`.
- a protecao de rotas em [src/components/admin/ProtectedRoute.tsx](/e:/0%20SASS/2%20municipais/site%20smst/src/components/admin/ProtectedRoute.tsx) apenas verifica se existe autenticacao.
- o layout administrativo em [src/components/admin/AdminLayout.tsx](/e:/0%20SASS/2%20municipais/site%20smst/src/components/admin/AdminLayout.tsx) usa menu fixo e global, sem filtro por papel, setor ou contexto operacional.
- as rotas administrativas em [src/App.tsx](/e:/0%20SASS/2%20municipais/site%20smst/src/App.tsx) ainda seguem um unico namespace administrativo plano:
  - `/admin/dashboard`
  - `/admin/noticias`
  - `/admin/eventos`
  - `/admin/galeria`
  - `/admin/documentos`
  - `/admin/equipe`
  - `/admin/contatos`

### 1.2 Banco e autorizacao

Situacao observada no schema:

- o banco usa enum `app_role` com apenas dois valores:
  - `admin`
  - `user`
- a funcao `public.is_admin()` concentra a verificacao de acesso administrativo.
- a tabela `public.user_roles` e a base do modelo atual de permissao.
- as policies `RLS` dependem de `is_admin()` para operacoes administrativas.
- nao existe isolamento por setor em:
  - tabelas de conteudo;
  - usuarios administrativos;
  - rotas;
  - policies.

### 1.3 Implicacao pratica

O projeto atual nao possui um meio seguro e estruturado para:

- diferenciar `super_admin` de `gestor`;
- restringir usuarios ao proprio setor;
- permitir evolucao modular por area;
- suportar modulos operacionais com rastreabilidade adequada.

Conclusao: a `Fase 1` precisa comecar por um novo modelo de autorizacao, nao por telas.

---

## 2. Decisoes Arquiteturais Recomendadas

As decisoes abaixo sao a recomendacao tecnica para destravar a proxima fase.

### 2.1 Unidade principal de segregacao

Decisao recomendada:

- `setor` deve ser a unidade central de segregacao funcional e de acesso.

Consequencia:

- conteudos e modulos que forem setoriais deverao ter `setor_id`;
- perfis administrativos deverao sempre estar associados a um setor, exceto `super_admin`.

### 2.2 Modelo inicial de permissao

Decisao recomendada:

- substituir o modelo centrado em `user_roles` por um modelo baseado em:
  - `setores`
  - `perfis_usuarios`
  - enum `papel_usuario`

Estrutura inicial recomendada:

- `super_admin`
- `gestor`
- `admin_setor`
- `tecnico`

### 2.3 Granularidade inicial

Decisao recomendada:

- a `Fase 1` deve usar papeis fixos do sistema;
- papeis customizados por gestor devem ficar fora do escopo inicial.

Motivo:

- reduz complexidade de `RLS`;
- simplifica interface;
- acelera entrega da fundacao;
- evita acoplamento prematuro com um sistema de permissoes finas.

### 2.4 Conteudo institucional x conteudo setorial

Decisao recomendada:

- adotar modelo `hibrido`.

Proposta:

- permanecem globais inicialmente:
  - paginas institucionais centrais;
  - banners globais;
  - politicas e documentos institucionais gerais.
- tornam-se setoriais, com revisao caso a caso:
  - noticias;
  - eventos;
  - galeria;
  - equipe;
  - documentos operacionais ou locais.

Motivo:

- evita fragmentar tudo logo no inicio;
- preserva administracao central onde faz sentido;
- permite migracao gradual sem quebrar a experiencia publica atual.

### 2.5 Escopo do super admin

Decisao recomendada:

- o `super_admin` deve governar estrutura e acessos;
- nao deve ser desenhado como operador rotineiro de todos os modulos.

Escopo inicial sugerido:

- gerenciar setores;
- nomear gestores;
- consultar estrutura global;
- acessar conteudo global;
- apoiar contingencias administrativas.

### 2.6 Exposicao publica de dados

Decisao recomendada:

- nenhuma consulta publica deve usar `CPF` ou `CNPJ` como mecanismo principal de busca aberto.

Alternativas preferiveis:

- placa;
- numero de protocolo;
- identificador publico controlado;
- combinacao de dados nao sensiveis.

Motivo:

- reduz risco de exposicao indevida;
- melhora aderencia a principios de minimizacao de dados;
- evita que a fase operacional nasca com passivo juridico.

### 2.7 Primeiro submodulo do DEMUTRAN

Decisao recomendada:

- iniciar por `liberacao de veiculos`.

Motivo:

- fluxo relativamente delimitado;
- valor operacional imediato;
- menor acoplamento inicial do que concessionarios e credenciais;
- bom caso piloto para:
  - cadastro;
  - status;
  - consulta publica controlada;
  - trilha de auditoria.

---

## 3. Pendencias de Validacao com Negocio

Os itens abaixo dependem de confirmacao funcional antes da `Fase 1`.

### 3.1 Gestao de usuarios no setor

Ponto a validar:

- `admin_setor` podera gerenciar usuarios ou essa acao ficara exclusiva de `gestor`?

Recomendacao tecnica:

- manter gerenciamento de usuarios apenas com `gestor` na primeira versao.

### 3.2 Conteudos por setor

Ponto a validar:

- noticias, eventos, equipe, galeria e documentos serao:
  - globais;
  - setoriais;
  - ou hibridos.

Recomendacao tecnica:

- modelo hibrido com migracao progressiva.

### 3.3 Notificacoes externas

Ponto a validar:

- o sistema precisara disparar email na primeira versao operacional?

Recomendacao tecnica:

- nao tornar isso requisito bloqueante da `Fase 1`;
- deixar notificacao externa para fase posterior, salvo exigencia legal.

### 3.4 Mobile futuro

Ponto a validar:

- ha expectativa real de app mobile nativo no medio prazo?

Recomendacao tecnica:

- assumir web responsivo por enquanto;
- preservar API e modelo de permissao aptos a evoluir depois.

---

## 4. Backlog Tecnico para Liberar a Fase 1

Ao final da `Fase 0`, a implementacao pode seguir se os itens abaixo forem aceitos.

### 4.1 Banco

- criar enum `papel_usuario`;
- criar tabela `setores`;
- criar tabela `perfis_usuarios`;
- criar RPCs de perfil e autorizacao;
- manter compatibilidade temporaria com `user_roles` legado durante transicao;
- preparar trilha minima de auditoria.

### 4.2 Front-end

- refatorar `AuthContext` para carregar perfil completo;
- substituir `isAdmin` por contexto de autorizacao;
- adaptar `ProtectedRoute` para aceitar regra por papel e setor;
- criar estrutura de navegacao por escopo;
- criar telas base de:
  - setores;
  - gestores;
  - usuarios do setor.

### 4.3 Tipagem e integracao

- atualizar `src/types/supabase.ts` depois das migrations;
- revisar chamadas RPC no front;
- centralizar o modelo de sessao administrativa.

---

## 5. Criterio de Encerramento da Fase 0

Esta fase pode ser considerada concluida quando:

- o estado atual estiver documentado;
- a arquitetura inicial de permissao estiver definida;
- as recomendacoes tecnicas para dados publicos estiverem registradas;
- o primeiro submodulo piloto do DEMUTRAN estiver sugerido;
- o backlog habilitador da `Fase 1` estiver claro.

Status desta entrega:

- `concluida` do ponto de vista tecnico-documental;
- `pendente de validacao funcional` apenas nos itens de negocio listados na secao 3.

---

## 6. Recomendacao Final

Com base no estado atual do repositorio, a proxima fase recomendada e:

`Fase 1 - Fundacao: RBAC e Multi-setor`

Essa fase deve comecar pelo banco e pela camada de sessao/autorizacao, antes de qualquer modulo operacional novo.
