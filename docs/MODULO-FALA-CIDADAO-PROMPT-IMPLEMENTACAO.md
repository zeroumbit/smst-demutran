# Prompt de Implementacao - Modulo Fala Cidadao

## 1. Contexto do Projeto

Voce esta trabalhando no projeto SMST (Sistema de Gestao da Secretaria de Seguranca Publica e Transito de Caninde), que ja possui:

- React + TypeScript no frontend
- Supabase como backend
- Autenticacao com Supabase Auth
- Componentes UI baseados em shadcn/ui
- Sistema de notificacoes
- Upload de arquivos
- Sistema de permissoes e auditoria

Seu trabalho deve respeitar a arquitetura existente, reaproveitar os padroes do projeto e evitar criar estruturas paralelas sem necessidade.

## 2. Objetivo Desta Entrega

Implementar o modulo **Fala Cidadao** como um canal oficial para registro, acompanhamento e gestao de demandas urbanas entre o cidadao e as secretarias municipais.

O modulo deve permitir:

- abertura de solicitacoes por cidadaos autenticados e anonimos
- consulta de protocolo
- acompanhamento do andamento da demanda
- triagem e atendimento pelas secretarias responsaveis
- transferencia entre secretarias quando necessario
- rastreabilidade completa por historico e auditoria

## 3. Escopo Obrigatorio Desta Etapa

Implemente apenas o necessario para a primeira versao funcional do modulo, incluindo:

- estrutura de banco de dados do Fala Cidadao
- politicas RLS
- funcoes RPC essenciais
- telas principais do modulo
- integracao com autenticacao existente
- controle de permissao por perfil
- historico de status
- auditoria basica

## 4. Entregaveis Esperados

Entregue:

- migrations SQL completas do modulo
- seeds minimos para secretarias e assuntos
- regras RLS consistentes com os perfis definidos
- funcoes RPC para atualizar status e transferir demanda
- interface React/TypeScript integrada ao projeto
- paginas para:
  - nova solicitacao
  - acompanhar protocolo
  - minhas solicitacoes
  - painel da secretaria
  - detalhe da demanda
- hooks, services e tipos necessarios
- validacoes de formulario
- testes essenciais de permissao e fluxo critico

## 5. Perfis e Regras de Acesso

Considere os seguintes perfis:

### Cidadao Anonimo

- pode abrir solicitacao
- pode consultar apenas a propria demanda por protocolo + CPF
- nao pode visualizar dados de terceiros
- nao pode acessar painel interno

### Cidadao Logado

- pode abrir solicitacao
- pode visualizar apenas as proprias demandas
- pode acompanhar andamento e avaliar demanda concluida

### Responsavel da Secretaria

- pode visualizar apenas demandas da sua secretaria
- pode acessar os dados completos do cidadao apenas nas demandas sob sua responsabilidade institucional
- pode responder, alterar status, atribuir atendimento e transferir demanda

### Super Admin

- pode visualizar e gerenciar todas as demandas
- pode acessar todos os dados completos
- pode configurar secretarias, assuntos, responsaveis e relatorios

## 6. Regras de Negocio Obrigatorias

- toda demanda deve possuir protocolo unico
- toda demanda deve estar vinculada a uma secretaria
- o cidadao nunca pode visualizar dados internos de gestao
- CPF nunca deve ser exposto em listagens publicas ou views publicas
- toda mudanca de status deve gerar historico
- toda alteracao relevante deve ser auditada
- transferencia entre secretarias deve registrar origem, destino, justificativa e usuario responsavel
- a aplicacao nao deve confiar apenas no frontend para seguranca; a protecao principal deve estar no backend e no RLS

## 7. Estrutura Funcional Minima

Implemente pelo menos as seguintes entidades:

- `fala_secretarias`
- `fala_assuntos`
- `fala_demandas`
- `fala_historico_status`
- `fala_transferencias`
- `usuario_secretarias`
- `fala_auditoria`

Se necessario, crie tabelas auxiliares adicionais, mas apenas quando houver justificativa tecnica clara.

## 8. Status Minimos da Demanda

Use um fluxo de status simples, coerente e implementavel:

- `recebido`
- `analise`
- `execucao`
- `concluido`
- `arquivado`
- `transferido`

Se optar por manter `rascunho`, justifique e implemente o comportamento de forma consistente no frontend, backend e RLS.

## 9. Requisitos de Interface

No menu lateral, adicionar o item:

- `Fala Cidadao`

Subitens:

- `Nova Solicitacao`
- `Acompanhar Protocolo`
- `Minhas Solicitacoes`

Requisitos da interface:

- reutilizar componentes existentes do projeto
- manter padrao visual ja usado no sistema
- garantir responsividade
- garantir acessibilidade basica
- exibir feedbacks claros de sucesso, erro e status

## 10. Requisitos Tecnicos

- usar TypeScript
- seguir os padroes existentes do repositorio
- reutilizar autenticacao do Supabase
- reutilizar sistema de permissoes existente
- reutilizar sistema de notificacoes existente
- reutilizar Supabase Storage para anexos, se necessario
- criar tipos de dominio claros
- evitar duplicacao de regras entre frontend e backend

## 11. Seeds e Dados Iniciais

Nesta entrega, inclua apenas:

- secretarias minimas necessarias
- assuntos iniciais por secretaria

Nao inclua listas gigantes de ruas ou seeds excessivos no corpo principal da implementacao, a menos que isso ja seja um requisito explicito do projeto. Se julgar importante, deixe seeds extensos em arquivo separado.

## 12. Criterios de Aceite

Considere a entrega concluida quando:

- um cidadao anonimo conseguir abrir uma solicitacao e consultar sua propria demanda com seguranca
- um cidadao autenticado conseguir ver apenas suas demandas
- um responsavel de secretaria conseguir ver apenas demandas da propria secretaria
- um super admin conseguir gerenciar tudo
- mudancas de status gerarem historico
- transferencias ficarem registradas
- dados sensiveis nao vazarem em consultas publicas
- o modulo estiver integrado ao menu e fluxo do sistema existente

## 13. O Que Nao Fazer

- nao criar uma arquitetura paralela fora dos padroes do projeto
- nao expor CPF, email, telefone ou observacoes internas em telas ou consultas publicas
- nao implementar seguranca apenas no frontend
- nao inflar esta entrega com relatorios avancados, automacoes extras ou seeds massivos se isso atrasar a primeira versao funcional

## 14. Forma de Entrega

Execute a implementacao em etapas pequenas e consistentes. Ao final, informe:

- quais arquivos foram criados ou alterados
- quais migrations foram adicionadas
- quais regras RLS foram aplicadas
- quais fluxos foram validados
- quais pontos ficaram como pendencia ou proxima fase

## 15. Observacao Importante

Se houver conflito entre este prompt e a estrutura real do projeto, priorize a estrutura existente do repositorio e adapte a solucao sem quebrar padroes ja consolidados.

