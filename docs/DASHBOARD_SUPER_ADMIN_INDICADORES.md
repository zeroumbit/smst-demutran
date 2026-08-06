# Dashboard do Super Admin — Relatório de Indicadores por Setor

> Contexto: `/admin/dashboard` (visão super admin, **sem** `setorSlug` na URL).
> Objetivo deste relatório: mapear o que **já existe**, o que **regrediu**, e o que **podemos implementar** por setor, usando tabelas que já existem no banco.

---

## 1. O que o super admin vê HOJE

| Seção | Origem | Dados exibidos |
|---|---|---|
| Banner "Guarda Municipal" | `state.serviceStatus` (slice 4) | Veículos apreendidos, Frota em manutenção, Operações IRO ativas, Demandas Ouvidoria |
| 4 metric cards | `state.metrics` | Setores ativos, Gestores ativos, Guardas ativos, Veículos apreendidos |
| Gráfico "Fluxo mensal - Demutran" | `state.vehicleMovement` | Apreendidos vs liberados por mês (com valores) |
| Alertas (texto) | `state.alerts` | Setores sem gestor/equipe, apreendidos, manutenção, IRO, ouvidoria |

**Problema principal:** a visão do super admin ficou **reduzida** — dados são agregados de forma global mas as seções ricas (PieChart de saúde dos setores, notícias/eventos por setor, detalhamento por módulo) **só renderizam** quando há `setorSlug` (escopos `isGuardaScope`/`isDemutranScope`).

---

## 2. Dados órfãos (calculados, mas NUNCA renderizados)

Localizados em `src/pages/admin/Dashboard.tsx`:

| Campo | Onde é calculado | Onde é renderizado | Situação |
|---|---|---|---|
| `sectorHealth` (críticos/regulares) | linha ~713 | **nenhum lugar** | Órfão — o PieChart foi removido pelo commit `98ec93b` (substituído pelo card O.S. no escopo Guarda) |
| `sectorsNeedingAttention` | linha 637 | só vira texto no `alerts` (linha 653) | Sem card/detalhamento visual |
| `criticalCount` / `healthyCount` | linhas 710-711 | derivam `sectorHealth` (não renderizado) | Órfão |
| `noticiasSetor` / `eventosSetor` | linhas 762-763 | só dentro de `isGuardaScope` (linhas 1131/1136) | Não aparecem na visão super |

---

## 3. Tabelas disponíveis por setor (fonte: migrations + código)

### DEMUTRAN (`setor_slug = 'demutran'`)

| Tabela | Indicadores possíveis |
|---|---|
| `veiculos_recolhidos` | total apreendidos, liberados, valor estimado de taxas por mês/ano, tempo médio no pátio |
| `demutran_credenciais_solicitacoes` | pendentes, em análise, aprovadas, negadas |
| `demutran_recursos` | pendentes, deferidos, indeferidos, em análise |
| `demutran_concessionarios` | ativos por categoria, em débito, total de cadastros |
| `demutran_veiculos_municipais` | frota municipal ativa, por status |
| `demutran_taxas` | tabela de taxas (base de valor) |
| `fala_demandas` | demandas de ouvidoria do setor por status |
| `guarda_ordens_servico` | O.S. do setor por status (via `listar_ordens_servico(p_setor_id)`) |
| `noticias`, `eventos`, `galeria_fotos`, `documentos` | conteúdos ativos do setor |

### GUARDA MUNICIPAL (`setor_slug = 'guarda-municipal'`)

| Tabela | Indicadores possíveis |
|---|---|
| `guardas_municipais` | efetivo ativo, distribuição por graduação (`guarda_municipal_graduacoes`) |
| `guarda_frota_veiculos` | frota por status: DISPONIVEL / EM_SERVICO / EM_MANUTENCAO |
| `guarda_equipes` / `guarda_equipe_membros` | equipes ativas, membros por equipe |
| `guarda_escalas` + `guarda_escala_agentes/ciencias/trocas` | escalas por status, ciências, trocas |
| `iro_operacoes` / `iro_candidaturas` / `iro_banco_horas` | operações ativas, candidaturas confirmadas, banco de horas total |
| `guarda_ordens_servico` | O.S. por status (PUBLICADA/RASCUNHO/CANCELADA/SUBSTITUIDA) |
| `fiscalizacao_infracoes` + `fiscalizacao_categorias` | autuações por categoria, ativas |
| `fala_demandas` (secretaria GM) | demandas de ouvidoria da Guarda |
| `noticias`, `eventos` | conteúdos do setor |

### JOVEM GUARDA (`setor_slug = 'jovem-guarda'`)

| Tabela | Indicadores possíveis |
|---|---|
| `jgc_alunos` | total de alunos ativos, por turma |
| `jgc_turmas` | turmas ativas, professores (`jgc_turma_professores`) |
| `jgc_frequencias` / `jgc_chamadas_gerais` | frequência, chamadas |
| `jgc_atividades` / `jgc_atividade_participantes` | atividades cadastradas, participação |
| `jgc_diarios` | diários preenchidos |
| `jgc_responsaveis` | responsáveis vinculados |
| `jgc_atendimentos` / `jgc_encaminhamentos` | atendimentos e encaminhamentos do setor |
| `jgc_aluno_saude` / `jgc_aluno_documentos` | alunos com documentação/saúde pendente |
| `jgc_configuracoes` | configurações do programa |

### TRANVERSAL (todos os setores)

| Tabela | Indicadores possíveis |
|---|---|
| `setores` | setores ativos/inativos |
| `perfis_usuarios` + `get_admin_profiles()` | gestores ativos, equipe administrativa, perfis sem gestor |
| `noticias`, `eventos`, `galeria_fotos`, `documentos`, `equipe` | conteúdos institucionais por setor (`setor_id`) |
| `auditoria_logs` | volume de atividades recentes por setor |
| `fala_demandas` | demandas de ouvidoria gerais |
| `guardas_usuarios` | vinculação guarda ↔ usuário |

---

## 3.5 Suas propostas — validação de viabilidade

| # | Proposta | Viável? | Fonte de dados | Observação |
|---|---|---|---|---|
| 1 | Veículos apreendidos (carros vs motos) vs liberados | ✅ Sim | `veiculos_recolhidos.local_custodia` (enum `automoveis`, `motos`, `motos_delegacia`, `veiculos_forum`) + `status` (`recolhido`/`liberado`) | Somar `automoveis` como carros; `motos` + `motos_delegacia` como motos |
| 2 | Fluxo mensal de veículos | ✅ Já existe | `veiculos_recolhidos.created_at`/`data_liberacao` | Hoje renderizado como "Fluxo mensal - Demutran" |
| 3 | Concessionários em atraso (quantidade e valor) + valor pago | ⚠️ Parcial | Quantidade: `demutran_concessionarios` via `getConcessionarioFinancialStatus` (deriva de `exercicio`/`ultimo_alvara`). **Valores: não existe tabela de pagamentos** | Quantidade em atraso é real. "Valor pago" real não está no banco — só pode ser **estimado** (nº de devedores × taxa anual da categoria em `demutran_taxas`) ou exigir novo módulo de controle de pagamentos |
| 4 | Quantidade de Ordens de Serviço | ✅ Sim | `guarda_ordens_servico` (via `listar_ordens_servico(p_setor_id)`) | Total + por status (PUBLICADA/RASCUNHO/CANCELADA/SUBSTITUIDA) |
| 5 | Operações ativas e inativas | ✅ Sim | `iro_operacoes.ativo` (boolean) | Contar `ativo = true` vs `ativo = false` |
| 6 | Alunos matriculados na JGC | ✅ Sim | `jgc_alunos` (`situacao = 'ativo'` e `deleted_at IS NULL`) | Filtrar por setor Jovem Guarda |
| 7 | Solicitações de credenciais idosos e PCD | ✅ Sim | `demutran_credenciais_solicitacoes.tipo` (enum `idoso`/`pcd`) | Contar por tipo (+ opcional por status) |
| — | Mídias: notícias e documentos | ❌ Não precisa | — | Removidas da proposta |

**Única pendência de schema:** a métrica de **valores** de concessionários (item 3) não tem base real no banco. Se quiser valor real de pago/em atraso, seria preciso criar tabela de pagamentos (ex.: `demutran_concessionario_pagamentos`). Até lá, é possível exibir apenas **quantidade** em atraso e uma **estimativa** de valor.

---

## 4. Proposta de layout para o super admin

### 4.1 Restaurar o que regrediu (prioridade alta)
- **PieChart de Saúde dos Setores** (`sectorHealth`): críticos (vermelho) vs regulares (verde) — dados já calculados, basta renderizar.
- **Card "Setores que exigem atenção"** (`sectorsNeedingAttention`): lista com motivo (inativo, sem gestor, sem equipe).
- **Conteúdo por setor**: notícias/eventos/galeria/documentos ativos por setor (dados já consultados).

### 4.2 Cards escolhidos pelo usuário (prioridade alta)
- **Veículos**: carros apreendidos vs motos apreendidas vs liberados (via `local_custodia`).
- **Fluxo mensal de veículos**: já renderizado, manter.
- **Concessionários em atraso**: quantidade (real) + valor estimado (nº devedores × taxa da categoria) — ou criar tabela de pagamentos para valor real.
- **Ordens de Serviço**: total + por status.
- **Operações IRO**: ativas vs inativas.
- **JGC**: alunos matriculados ativos.
- **Credenciais**: solicitações de idosos vs PCD.
- **Removido**: notícias e documentos (por decisão do usuário).

### 4.3 Novos cards por setor (prioridade média)
- **Demutran**: credenciais pendentes + recursos pendentes (já existem no escopo Demutran), veículos por categoria, valor arrecadado por período.
- **Guarda**: efetivo por graduação (PieChart já existia no escopo Guarda), frota disponível/em serviço/manutenção, O.S. por status.
- **JGC**: alunos ativos por turma, frequência média, atividades da semana.

### 4.4 Central de navegação (prioridade média)
- Cards clicáveis com `Link` para cada módulo por setor (padrão já usado no card "Concessionários em débito").

---

## 5. Fontes no código

- `src/pages/admin/Dashboard.tsx` — dashboard atual (1247 linhas), cálculo dos dados nas linhas 415-770.
- `src/types/admin.ts` — `ModuloSistema`, `MODULOS_DEMUTRAN/GUARDA/JOVEM_GUARDA`, `MODULOS_POR_SETOR` (linhas 65-67).
- `supabase/migrations/` — schemas: `20260615113000` (conteúdo por setor), `20260615133000` (veículos recolhidos), `20260616040000` (credenciais), `20260730160000` + `20260731140000` (ordens de serviço), JGC (migrations `jgc_*`).
