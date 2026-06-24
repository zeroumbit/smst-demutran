# Plano de Reformulação do Sistema SMST

## 1. Visão Geral

### 1.1 Contexto

O sistema atual da Secretaria Municipal de Segurança Pública e Trânsito (SMST) de Canindé foi concebido como um site institucional com recursos administrativos básicos para publicação e manutenção de conteúdo.

Atualmente, a solução utiliza:

- `Vite`
- `React`
- `TypeScript`
- `Tailwind CSS`
- `shadcn/ui`
- `Supabase` (`Auth`, banco de dados e `Storage`)

### 1.2 Objetivo Estratégico

O objetivo desta reformulação é evoluir o sistema de um portal institucional para uma **plataforma digital multi-setorial**, com:

- hierarquia formal de usuários e responsabilidades;
- gestão de conteúdo segmentada por setor;
- módulos operacionais específicos por área;
- base técnica preparada para expansão progressiva;
- maior segurança, rastreabilidade e governança de acesso.

O primeiro módulo operacional prioritário será o **DEMUTRAN**, sem comprometer a escalabilidade para os demais setores da SMST.

### 1.3 Resultado Esperado

Ao final da primeira etapa estrutural, a SMST deverá possuir uma plataforma capaz de:

- administrar setores de forma isolada;
- delegar gestão operacional por setor;
- controlar acesso por perfil, papel e contexto;
- publicar conteúdos e operar módulos específicos com segurança;
- sustentar futuras expansões sem necessidade de reestruturação profunda.

---

## 2. Diagnóstico do Cenário Atual

### 2.1 Situação Atual

| Aspecto | Situação Atual |
|---|---|
| Autenticação | Supabase Auth com papéis simplificados (`admin` e `user`) |
| Controle de acesso | RLS baseada em `is_admin()`, sem segmentação por setor |
| Banco de dados | Estrutura voltada a conteúdo institucional e administração básica |
| Admin | CRUDs independentes em páginas separadas, com layout único |
| Páginas públicas | Estrutura institucional por setor e páginas de conteúdo |
| Layout administrativo | `AdminLayout.tsx` com sidebar e header fixos |
| Escalabilidade funcional | Limitada para operação multi-setorial e módulos de negócio |

### 2.2 Ativos Reaproveitáveis

Os seguintes elementos já existentes devem ser preservados e evoluídos:

- biblioteca de componentes com `shadcn/ui`;
- estrutura base do painel administrativo;
- autenticação com `Supabase Auth`;
- fluxo de upload e armazenamento de arquivos;
- CRUDs genéricos já implementados;
- páginas públicas setoriais, com adaptações pontuais.

### 2.3 Limitações Identificadas

As principais limitações do modelo atual são:

- ausência de arquitetura de permissões orientada por setor;
- falta de separação entre escopo institucional e escopo operacional;
- modelo de usuários insuficiente para múltiplos níveis de responsabilidade;
- inexistência de trilha de auditoria para operações críticas;
- estrutura pública e administrativa ainda não preparada para dados sensíveis e fluxos processuais.

---

## 3. Diretrizes da Reformulação

### 3.1 Princípios Arquiteturais

Toda evolução do sistema deverá respeitar os seguintes princípios:

- **segregação por setor** como unidade central de acesso e operação;
- **menor privilégio possível** para usuários e perfis;
- **segurança no banco e no front-end**, com RLS como camada obrigatória;
- **modularidade funcional**, permitindo crescimento por etapas;
- **rastreabilidade**, especialmente em módulos operacionais;
- **reaproveitamento estruturado**, evitando reescrita desnecessária.

### 3.2 Escopo da Plataforma

O sistema passará a contemplar dois grandes domínios:

1. **Domínio institucional**
   Conteúdo público, páginas institucionais, notícias, eventos, documentos e apresentação dos setores.

2. **Domínio operacional**
   Funcionalidades internas e fluxos específicos de cada setor, como cadastro, análise, emissão, controle e acompanhamento de processos.

---

## 4. Modelo de Governança e Permissões

### 4.1 Hierarquia de Acesso

```text
SUPER ADMIN
  ├── GESTOR (Guarda Municipal)
  ├── GESTOR (DEMUTRAN)
  ├── GESTOR (Jovem Guarda)
  ├── GESTOR (ROPE)
  ├── GESTOR (Defesa Civil)
  ├── GESTOR (GMAM)
  └── GESTOR (GSU)
        └── USUÁRIOS DO SETOR
            ├── admin_setor
            ├── tecnico
            ├── administrativo
            └── outros perfis futuros
```

### 4.2 Diretriz de Responsabilidade

- `super_admin`: governa a plataforma, setores e perfis estratégicos.
- `gestor`: administra seu próprio setor e responde pela operação local.
- `admin_setor`: executa rotinas administrativas do setor.
- `tecnico`: opera funcionalidades específicas conforme permissão concedida.

### 4.3 Observação Importante

O plano parte inicialmente de um conjunto de papéis base. No entanto, a modelagem deve ser feita de forma a permitir futura evolução para permissões mais granulares sem refatoração estrutural significativa.

Em termos práticos:

- **papel** define o nível macro de responsabilidade;
- **perfil do usuário** define seu vínculo com o setor;
- **permissões específicas** poderão ser adicionadas posteriormente por módulo ou por ação.

### 4.4 Matriz Inicial de Acesso

| Ação | Super Admin | Gestor | Admin Setor | Técnico |
|---|---|---|---|---|
| Criar/editar setores | Sim | Não | Não | Não |
| Ativar/desativar setores | Sim | Não | Não | Não |
| Nomear gestores | Sim | Não | Não | Não |
| Gerenciar usuários do próprio setor | Não | Sim | Opcional | Não |
| Gerenciar conteúdo institucional global | Sim | Não | Não | Não |
| Gerenciar conteúdo do próprio setor | Sim | Sim | Sim | Opcional |
| Operar módulos do próprio setor | Não | Sim | Sim | Sim, conforme permissão |
| Acessar dados de outro setor | Sim | Não | Não | Não |

### 4.5 Recomendação

Na primeira implementação, recomenda-se **não liberar papéis customizados por gestor**. O ideal é iniciar com papéis controlados pelo sistema, reduzindo complexidade em RLS, interface e suporte. A customização pode ser prevista como evolução posterior.

---

## 5. Modelo de Dados Proposto

### 5.1 Novas Estruturas Principais

```sql
setores
- id
- nome
- slug
- descricao
- ativo
- created_at
- updated_at

perfis_usuarios
- id
- user_id
- setor_id
- papel
- ativo
- created_at
- updated_at

auditoria_logs
- id
- user_id
- setor_id
- entidade
- entidade_id
- acao
- payload_resumido
- created_at
```

### 5.2 Enum Inicial de Papéis

```sql
papel_usuario:
- super_admin
- gestor
- admin_setor
- tecnico
```

### 5.3 Evoluções Recomendadas

Além das tabelas centrais, recomenda-se prever desde o início:

- colunas `created_by` e `updated_by` em entidades operacionais;
- `updated_at` com trigger automática;
- `ativo` como mecanismo de desativação lógica quando fizer sentido;
- índices nas colunas mais usadas em filtros por setor, status e datas;
- chaves UUID em todas as tabelas novas.

### 5.4 Observações de Modelagem

Algumas entidades da fase operacional tendem a crescer em complexidade. Por isso:

- `concessionarios`, `taxas`, `credenciais` e `veiculos` devem ser modelados com foco em relacionamento futuro;
- status processuais devem ser normalizados sempre que houver fluxo administrativo real;
- documentos e anexos devem ser pensados como ativos vinculados a entidades, e não apenas como URLs soltas;
- o modelo precisa prever histórico mínimo para mudanças críticas de status.

---

## 6. Segurança, Privacidade e Auditoria

### 6.1 Segurança de Acesso

- Toda operação de escrita deve ser validada por `RLS` e também pela camada de aplicação.
- A separação por setor deve ocorrer no banco, e não apenas na interface.
- O front-end não deve assumir permissões; deve refletir permissões já definidas pela sessão autenticada.

### 6.2 Arquivos e Storage

- arquivos devem ser organizados por setor e por módulo;
- documentos sensíveis devem ter acesso privado e controlado;
- arquivos públicos devem ser explicitamente separados dos privados;
- nomenclatura e paths no storage devem seguir padrão previsível e auditável.

### 6.3 Privacidade e Exposição Pública

Este ponto merece atenção especial.

Para páginas públicas de consulta:

- evitar exposição direta de `CPF`, `CNPJ` e documentos pessoais como chave principal de busca;
- limitar retorno de dados ao mínimo necessário;
- revisar juridicamente a exposição de dados operacionais e cadastrais;
- diferenciar claramente consulta pública informativa de acesso autenticado interno.

### 6.4 Auditoria

Todos os módulos operacionais devem prever mecanismos mínimos de rastreabilidade:

- identificação de quem criou;
- identificação de quem alterou;
- data e hora das alterações;
- histórico de mudança de status em processos relevantes;
- logs administrativos para ações críticas.

---

## 7. Plano de Implementação por Fases

## Fase 0 — Definições Estruturantes

### Objetivo

Eliminar ambiguidades antes da implementação, reduzindo retrabalho técnico e inconsistências de regra de negócio.

### Entregas

| Tarefa | Descrição |
|---|---|
| 0.1 | Definir matriz final de permissões por papel e por tipo de ação |
| 0.2 | Decidir quais conteúdos serão globais e quais serão por setor |
| 0.3 | Validar regras de exposição pública de dados e documentos |
| 0.4 | Definir estratégia de migração do admin atual para o novo modelo |
| 0.5 | Escolher o primeiro submódulo do DEMUTRAN a entrar em produção |

### Critério de conclusão

Todas as decisões abertas do plano devem estar formalmente resolvidas antes do início das migrations estruturais.

---

## Fase 1 — Fundação: RBAC e Multi-setor

### Objetivo

Criar a base de autenticação, autorização e segmentação por setor que sustentará toda a plataforma.

### Back-end e banco

| Tarefa | Descrição |
|---|---|
| 1.1 | Criar tabela `setores` |
| 1.2 | Criar enum `papel_usuario` |
| 1.3 | Criar tabela `perfis_usuarios` vinculada a `auth.users` e `setores` |
| 1.4 | Criar funções/RPCs como `get_user_profile()`, `is_super_admin()` e `is_gestor_setor(setor_id)` |
| 1.5 | Reestruturar policies `RLS` com consciência de setor |
| 1.6 | Criar seeds iniciais dos setores da SMST |
| 1.7 | Migrar usuários administrativos existentes para o novo modelo |
| 1.8 | Criar tabela de auditoria mínima para eventos administrativos críticos |

### Front-end

| Tarefa | Descrição |
|---|---|
| 1.9 | Refatorar `AuthContext` para carregar perfil completo do usuário |
| 1.10 | Criar tela de gestão de setores para `super_admin` |
| 1.11 | Criar tela de atribuição de gestores por setor |
| 1.12 | Criar tela de gestão de usuários do setor |
| 1.13 | Adaptar `AdminLayout` para filtrar navegação por papel e setor |
| 1.14 | Exibir contexto visual do setor e do papel ativo |

### Critério de conclusão

O `super_admin` deve conseguir criar setores e designar gestores. O `gestor` deve conseguir administrar usuários do próprio setor. O sistema deve impedir, via banco e interface, qualquer acesso cruzado indevido entre setores.

---

## Fase 2 — Modularização do Admin por Setor

### Objetivo

Separar operacionalmente a administração por setor, preservando o domínio institucional quando necessário.

### Entregas

| Tarefa | Descrição |
|---|---|
| 2.1 | Definir e aplicar `setor_id` nas entidades que passarão a ser setoriais |
| 2.2 | Ajustar CRUDs administrativos para operar apenas dentro do escopo permitido |
| 2.3 | Adaptar páginas públicas para consumo de conteúdo global e/ou setorial |
| 2.4 | Criar dashboard básico por setor |
| 2.5 | Revisar navegação administrativa para refletir a segmentação funcional |

### Observação

Antes de adicionar `setor_id` a todas as tabelas de conteúdo, é necessário decidir quais conteúdos permanecerão centralizados na SMST e quais serão descentralizados por setor.

### Critério de conclusão

Cada gestor deve visualizar exclusivamente os dados e ações do seu setor, com interface, listagens e rotas aderentes ao seu escopo real.

---

## Fase 3 — Módulo DEMUTRAN

### Objetivo

Implantar o primeiro conjunto de funcionalidades operacionais do sistema, validando o modelo multi-setorial na prática.

### Estratégia Recomendada

O DEMUTRAN não deve ser implementado integralmente de uma só vez. A recomendação é entregar o módulo por blocos, priorizando o que tem maior valor administrativo e menor risco regulatório.

### Ordem sugerida

1. liberação de veículos;
2. recursos administrativos;
3. concessionários;
4. credenciais;
5. veículos municipais.

### Justificativa

Essa ordem tende a equilibrar impacto operacional, complexidade de dados e exposição pública.

### Submódulos previstos

#### 3.1 Concessionários

| Tarefa | Descrição |
|---|---|
| 3.1.1 | Criar tabela `concessionarios` |
| 3.1.2 | Criar CRUD administrativo com escopo DEMUTRAN |
| 3.1.3 | Criar tabela `taxas_concessionarios` |
| 3.1.4 | Definir regra de consulta pública com proteção de dados |
| 3.1.5 | Estruturar anexos e boletos no `Storage` |

#### 3.2 Veículos do Município

| Tarefa | Descrição |
|---|---|
| 3.2.1 | Criar tabela `veiculos_municipais` |
| 3.2.2 | Criar CRUD administrativo |

#### 3.3 Credenciais

| Tarefa | Descrição |
|---|---|
| 3.3.1 | Criar tabela `credenciais` |
| 3.3.2 | Criar CRUD administrativo |
| 3.3.3 | Garantir vínculo com concessionário ativo e regra de validade |

#### 3.4 Recursos Administrativos

| Tarefa | Descrição |
|---|---|
| 3.4.1 | Criar tabela `recursos` |
| 3.4.2 | Criar formulário público para protocolo de recurso |
| 3.4.3 | Criar painel administrativo para análise e mudança de status |
| 3.4.4 | Registrar histórico de tramitação e parecer |
| 3.4.5 | Definir mecanismo de notificação e acompanhamento |

#### 3.5 Liberação de Veículos

| Tarefa | Descrição |
|---|---|
| 3.5.1 | Criar tabela `veiculos_recolhidos` |
| 3.5.2 | Criar CRUD administrativo |
| 3.5.3 | Criar consulta pública controlada por placa ou identificador adequado |

### Critério de conclusão

Ao menos um submódulo do DEMUTRAN deve entrar em produção com fluxo completo, incluindo cadastro, operação, restrição de acesso, auditoria mínima e interface pública ou interna conforme o caso.

---

## Fase 4 — Expansão para Demais Setores

### Objetivo

Replicar o modelo validado no DEMUTRAN para os demais setores da SMST, respeitando as particularidades operacionais de cada área.

### Possíveis módulos por setor

- **Guarda Municipal**: ocorrências, escalas, armamentos, viaturas;
- **Jovem Guarda**: cadastro de participantes, frequência, atividades;
- **ROPE**: registros operacionais;
- **Defesa Civil**: ocorrências, monitoramento e alertas;
- **GMAM**: fiscalização ambiental;
- **GSU**: serviços urbanos.

### Recomendação

Cada novo módulo deve passar por mini-planejamento próprio, com definição de:

- regras de negócio;
- sensibilidade dos dados;
- fluxos administrativos;
- exposição pública permitida;
- critérios de aceite.

---

## Fase 5 — Notificações, Relatórios e Inteligência Operacional

| Tarefa | Descrição |
|---|---|
| 5.1 | Implementar notificações internas por evento relevante |
| 5.2 | Avaliar notificações por email para fluxos externos e institucionais |
| 5.3 | Criar relatórios exportáveis por módulo e por setor |
| 5.4 | Implementar dashboards com indicadores e gráficos |
| 5.5 | Consolidar visão gerencial para tomada de decisão |

### Critério de conclusão

Gestores e administração central devem conseguir acompanhar eventos, prazos, produtividade e volumes operacionais com base em indicadores reais do sistema.

---

## 8. Padrões Técnicos Recomendados

### 8.1 Estrutura de Código

```text
src/
  types/
  lib/
  contexts/
  hooks/
  components/
    ui/
    layout/
    shared/
    admin/
  pages/
    admin/
      setores/
      gestores/
      usuarios/
      demutran/
        concessionarios/
        veiculos/
        credenciais/
        recursos/
        liberacao/
      guarda/
      defesa-civil/
      ...
```

### 8.2 Convenção de Rotas Administrativas

```text
/admin/setores
/admin/gestores
/admin/setor/:slug/usuarios
/admin/setor/:slug/dashboard
/admin/setor/demutran/concessionarios
/admin/setor/demutran/veiculos
/admin/setor/demutran/credenciais
/admin/setor/demutran/recursos
/admin/setor/demutran/liberacao
```

### 8.3 Convenções de Banco

- usar `snake_case` para tabelas e colunas;
- manter `created_at` e `updated_at`;
- utilizar `UUID` como chave primária;
- aplicar índices nos filtros frequentes;
- padronizar `ativo` para desativação lógica quando aplicável.

### 8.4 Convenções de Qualidade

- migrations versionadas e revisadas;
- tipos do Supabase regenerados sempre que houver alteração estrutural;
- componentes administrativos reutilizáveis;
- validação de formulários padronizada;
- separação clara entre regra de negócio, acesso a dados e interface.

---

## 9. Estratégia de Migração

### 9.1 Diretriz

A transição do modelo atual para o novo modelo deve ocorrer de forma segura, incremental e reversível sempre que possível.

### 9.2 Recomendações

- manter compatibilidade temporária com o papel administrativo legado durante a transição;
- migrar usuários administrativos em lote controlado;
- aplicar novas policies antes de desativar as antigas;
- validar ambientes de teste antes da virada operacional;
- documentar rollback mínimo para mudanças críticas de acesso.

### 9.3 Critério de Segurança de Migração

Nenhuma mudança de permissão deve entrar em produção sem teste prévio de:

- login;
- leitura por perfil;
- escrita por perfil;
- acesso indevido entre setores;
- fluxo de recuperação administrativa.

---

## 10. Estratégia de Testes e Validação

### 10.1 Escopo Mínimo de Testes

O plano de execução deve prever, no mínimo:

- testes de permissão por papel;
- testes de isolamento por setor;
- testes de fluxo crítico dos módulos operacionais;
- testes de interface das rotas administrativas;
- validação de consultas públicas;
- validação de upload e acesso a arquivos.

### 10.2 Prioridade de Teste

As regras de `RLS` e autorização devem ser tratadas como itens críticos, pois representam a principal base de segurança do sistema reformulado.

---

## 11. Cronograma Estimado

| Fase | Esforço Estimado | Dependências |
|---|---|---|
| Fase 0 — Definições estruturantes | 1-2 dias | Nenhuma |
| Fase 1 — RBAC e multi-setor | 5-7 dias | Fase 0 |
| Fase 2 — Modularização do admin | 2-4 dias | Fase 1 |
| Fase 3 — Primeiro submódulo DEMUTRAN | 4-6 dias | Fases 1 e 2 |
| Fase 3 — DEMUTRAN expandido | 6-10 dias adicionais | Submódulo inicial validado |
| Fase 4 — Demais setores | Variável | Fase 1 validada |
| Fase 5 — Notificações e relatórios | 3-5 dias | Módulos operacionais ativos |

### Observação

O cronograma acima deve ser interpretado como estimativa inicial. O esforço real pode variar conforme:

- profundidade das regras de negócio;
- necessidade de revisão jurídica sobre exposição pública;
- complexidade das `RLS`;
- qualidade e consistência dos dados existentes;
- necessidade de homologação com usuários finais.

---

## 12. Decisões Pendentes

- [ ] Definir se notícias, eventos, galeria e documentos serão globais, setoriais ou híbridos.
- [ ] Definir qual submódulo do DEMUTRAN será implementado primeiro.
- [ ] Confirmar se `admin_setor` poderá gerenciar usuários ou apenas conteúdo e operação.
- [ ] Confirmar se haverá necessidade de notificações por email.
- [ ] Definir política de exposição pública de dados de concessionários, recursos e veículos.
- [ ] Confirmar se a solução deverá futuramente suportar aplicativo mobile ou apenas interface web responsiva.

---

## 13. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Migração de permissões quebrar acesso administrativo | Alto | Transição assistida, compatibilidade temporária e testes por perfil |
| Complexidade das `RLS` afetar manutenção ou performance | Alto | Simplificar regras, centralizar lógica auxiliar em funções e indexar filtros |
| Exposição inadequada de dados pessoais em consultas públicas | Alto | Minimização de dados, revisão jurídica e desenho específico por caso |
| Crescimento desordenado do modelo de dados operacional | Médio/Alto | Modelagem incremental com revisão técnica antes de cada módulo |
| Confusão de usuários sobre responsabilidades e escopo | Médio | Interface contextual, nomenclaturas claras e onboarding |
| Aumento de custo no Supabase | Médio | Monitoramento de uso, otimização de queries e storage organizado |
| Retrabalho por decisões de negócio em aberto | Médio | Fechamento formal da Fase 0 antes da implementação estrutural |

---

## 14. Conclusão e Próximos Passos

Este plano estabelece uma base sólida para a evolução do sistema SMST rumo a uma plataforma institucional e operacional mais robusta, segura e escalável.

A principal recomendação é iniciar pela **Fase 0**, formalizando as decisões de arquitetura e negócio que impactam diretamente permissões, modelagem de dados, exposição pública e estratégia de migração.

Após a validação dessa etapa, a execução deve começar pela **Fase 1**, com foco em:

- estrutura multi-setorial;
- RBAC;
- isolamento por setor;
- governança de usuários;
- base de auditoria.

Com essa fundação consolidada, a implantação do primeiro módulo do DEMUTRAN terá muito mais previsibilidade, segurança e capacidade de expansão futura.
