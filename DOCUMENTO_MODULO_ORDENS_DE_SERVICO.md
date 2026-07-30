Podemos construir um módulo simples, mas bem organizado, de **Ordens de
Serviço da Guarda Municipal**, aproveitando o modelo real que você
enviou.

O documento atual já trabalha com os principais elementos de uma O.S.:
número, origem, assunto, período de execução, horário, descrição, local,
solicitante e contato.

# Estrutura geral do módulo

Criar um novo menu:

**Ordens de Serviço**

Sugestão de rota:

`/admin/dashboard/guarda-municipal/ordens-servico`

O módulo terá dois tipos de acesso:

## Gestor e Administrativo da Guarda

Podem:

-   criar O.S.;
-   editar enquanto estiver em rascunho;
-   publicar;
-   distribuir para uma ou mais equipes;
-   visualizar;
-   baixar PDF;
-   imprimir;
-   cancelar;
-   arquivar;
-   consultar histórico de distribuição e visualização.

## Responsável pela equipe

Pode apenas:

-   visualizar as O.S. destinadas à sua equipe;
-   baixar PDF;
-   imprimir.

Não pode:

-   criar;
-   editar;
-   excluir;
-   cancelar;
-   publicar;
-   redistribuir;
-   alterar status;
-   incluir observações no documento.

Isso deve ser protegido no backend, não apenas escondido na interface.

------------------------------------------------------------------------

# Fluxo recomendado

## 1. Criar a Ordem de Serviço

O Gestor ou Administrativo clica em:

**Nova Ordem de Serviço**

O sistema abre um formulário dividido em blocos.

### Identificação

-   Número da O.S.;
-   Ano;
-   Data de emissão;
-   Origem da O.S.;
-   Assunto;
-   Status.

O número deve ser gerado automaticamente.

Exemplo:

`O.S. Nº 001/2026`

Depois:

`O.S. Nº 002/2026`

A numeração deve reiniciar a cada ano.

A geração precisa ocorrer no backend para evitar números duplicados.

------------------------------------------------------------------------

## 2. Dados da execução

Campos:

-   Data inicial;
-   Data final, quando houver;
-   Horário de início;
-   Horário de término;
-   opção **"Até o término do serviço"**;
-   descrição da missão;
-   local de execução;
-   ponto de apresentação, caso seja necessário;
-   observações operacionais.

No documento enviado, a O.S. utiliza período, horário, descrição e local
de execução como informações centrais.

O campo de data final pode ser opcional para eventos realizados em um
único dia.

------------------------------------------------------------------------

## 3. Solicitante

Criar uma seção responsável por identificar quem solicitou a Ordem de
Serviço e qual documento originou essa demanda.

### Origem da solicitação

**Origem da O.S.** *(Select)*

Opções:

-   Ofício
-   Memorando
-   Processo Administrativo
-   Comunicação Interna (CI)
-   E-mail
-   WhatsApp
-   Solicitação Verbal
-   Determinação Superior
-   Outro

Caso selecione **Outro**, exibir o campo **Qual a origem?**.

### Número do documento de origem

Logo abaixo da origem, adicionar o campo **Número do documento de
origem**.

Este campo será utilizado para registrar o número ou identificação do
documento que originou a Ordem de Serviço.

Exemplos:

-   Ofício nº 154/2026
-   Memorando nº 012/2026
-   Processo nº 2026.000145
-   CI nº 008/2026
-   Portaria nº 021/2026
-   Requerimento nº 045/2026

O preenchimento é opcional e o campo deve aceitar texto livre, sem
máscara obrigatória.

### Dados do solicitante

-   Nome do solicitante;
-   Órgão, empresa ou instituição;
-   Função ou cargo;
-   Telefone;
-   WhatsApp;
-   E-mail (opcional).

### Exibição no PDF

Quando informado, o campo **Número do documento de origem** deve
aparecer logo abaixo da informação **Origem da O.S.**. Caso esteja
vazio, não deve ser exibido.

------------------------------------------------------------------------

## 4. Distribuição para equipes

Criar uma seção:

**Equipes responsáveis**

O criador poderá selecionar uma ou várias equipes.

Para cada equipe selecionada, mostrar:

-   nome da equipe;
-   responsável da equipe;
-   integrantes, somente para conferência;
-   turno, quando disponível;
-   situação da distribuição.

A O.S. será direcionada ao responsável cadastrado naquela equipe.

Não é necessário escolher cada guarda individualmente nesta primeira
versão.

O fluxo fica:

**O.S. → Equipe → Responsável da equipe**

Se a equipe mudar de responsável depois da publicação, a O.S. continua
vinculada à equipe e passa a aparecer para o novo responsável.

Essa é a melhor abordagem porque a Ordem de Serviço pertence
operacionalmente à equipe, não à pessoa.

------------------------------------------------------------------------

# Status da Ordem de Serviço

Utilizar inicialmente:

## Rascunho

-   somente Gestor e Administrativo visualizam;
-   pode ser editada;
-   ainda não está disponível para as equipes.

## Publicada

-   disponível para os responsáveis das equipes selecionadas;
-   não deve ser editada livremente;
-   pode ser baixada e impressa.

## Substituída

-   utilizada quando uma nova versão substituir a anterior;
-   a versão antiga permanece no histórico;
-   não aparece como documento atual.

## Cancelada

-   permanece disponível para consulta;
-   deve mostrar claramente que foi cancelada;
-   não pode ser apagada silenciosamente.

## Arquivada

-   O.S. finalizada e mantida apenas para histórico.

------------------------------------------------------------------------

# Publicação

Quando o usuário clicar em **Publicar O.S.**, o sistema deve:

1.  validar os campos obrigatórios;
2.  gerar o número oficial;
3.  gerar o PDF;
4.  registrar data e hora da publicação;
5.  registrar quem publicou;
6.  vincular as equipes;
7.  disponibilizar a O.S. aos responsáveis;
8.  enviar notificação interna obrigatória.

Exemplo de notificação:

> Nova Ordem de Serviço disponível O.S. nº 015/2026 --- Operação Feira
> Municipal Execução em 05/08/2026.

As notificações não precisam ser configuráveis pelo guarda.

------------------------------------------------------------------------

# Tela do Gestor e Administrativo

A listagem deve apresentar:

-   número;
-   assunto;
-   data da execução;
-   equipes destinadas;
-   responsável pela criação;
-   status;
-   data de publicação;
-   ações.

Filtros:

-   número;
-   assunto;
-   período;
-   status;
-   equipe;
-   responsável pela criação;
-   ano.

Ações disponíveis conforme o status:

### Rascunho

-   editar;
-   visualizar;
-   publicar;
-   excluir rascunho.

### Publicada

-   visualizar;
-   baixar;
-   imprimir;
-   consultar distribuição;
-   substituir;
-   cancelar;
-   arquivar.

### Cancelada ou arquivada

-   visualizar;
-   baixar;
-   imprimir;
-   consultar histórico.

------------------------------------------------------------------------

# Tela do responsável pela equipe

Criar uma área simples:

**Ordens de Serviço da Minha Equipe**

Mostrar apenas as ordens destinadas às equipes pelas quais ele é
responsável.

Cards ou tabela com:

-   número da O.S.;
-   assunto;
-   data;
-   horário;
-   local;
-   equipe;
-   status;
-   indicador de nova O.S.

Ações permitidas:

-   **Visualizar**
-   **Baixar PDF**
-   **Imprimir**

Nada além disso.

Ele não deve visualizar O.S. de outras equipes.

------------------------------------------------------------------------

# Visualização da O.S.

A tela de visualização deve mostrar o documento em formato semelhante ao
modelo oficial enviado:

-   cabeçalho institucional;
-   nome do órgão;
-   número da O.S.;
-   origem;
-   assunto;
-   período;
-   horário;
-   descrição;
-   local;
-   solicitante;
-   contato;
-   data de emissão;
-   identificação de quem autorizou ou publicou.

O exemplo anexado também utiliza cabeçalho institucional, tabela central
e rodapé com endereço e contato da SMST.

O layout do PDF deve ser padronizado pelo sistema, sem permitir que o
usuário altere livremente o visual.

------------------------------------------------------------------------

# PDF

O PDF deve ser gerado automaticamente a partir dos dados da O.S.

Deve incluir:

-   logo oficial;
-   cabeçalho;
-   número;
-   conteúdo;
-   equipes destinatárias, se essa informação fizer parte do documento;
-   data de emissão;
-   nome e cargo do responsável pela emissão;
-   QR Code de validação, opcional, mas recomendado.

O QR Code pode abrir uma página de validação com:

-   número;
-   assunto;
-   data;
-   status;
-   data de emissão;
-   indicação se está válida, cancelada ou substituída.

Não expor informações internas desnecessárias na página pública.

------------------------------------------------------------------------

# Edição depois da publicação

Eu não permitiria editar uma O.S. publicada como se ainda fosse
rascunho.

O correto é usar:

**Substituir O.S.**

Ao substituir:

1.  copiar os dados da O.S. atual;
2.  permitir ajustes;
3.  gerar uma nova versão;
4.  preservar a anterior;
5.  marcar a anterior como substituída;
6.  notificar novamente os responsáveis das equipes.

Exemplo:

-   O.S. nº 010/2026 --- versão 1;
-   O.S. nº 010/2026 --- versão 2.

Ou, caso prefiram simplicidade visual:

-   manter o mesmo número;
-   armazenar internamente o número da versão;
-   mostrar apenas a versão mais recente para a equipe.

------------------------------------------------------------------------

# Confirmação de visualização

Embora o responsável não possa alterar a O.S., eu recomendo registrar
automaticamente:

-   primeira visualização;
-   último acesso;
-   download realizado;
-   impressão solicitada.

O responsável não precisa clicar em "Aceitar".

A finalidade é apenas rastreabilidade.

Para o Gestor, mostrar:

  Equipe         Responsável     Visualizou Primeiro acesso
  -------------- ------------- ------------ -----------------
  Equipe Alfa    João Silva             Sim 30/07 às 16:10
  Equipe Bravo   Carlos Lima            Não ---

Como você definiu que ele "não pode fazer nada", eu não colocaria
confirmação de ciência nesta primeira versão. A simples visualização já
pode ser registrada automaticamente.

------------------------------------------------------------------------

# Cancelamento

O Gestor ou Administrativo poderá cancelar uma O.S. publicada.

Campos obrigatórios:

-   motivo do cancelamento;
-   responsável;
-   data e hora.

Após o cancelamento:

-   o documento permanece no histórico;
-   o PDF recebe marca visual **CANCELADA**;
-   os responsáveis das equipes são notificados;
-   a O.S. não pode ser excluída.

------------------------------------------------------------------------

# Auditoria

Registrar:

-   criação;
-   edição de rascunho;
-   publicação;
-   distribuição;
-   visualização;
-   download;
-   impressão;
-   substituição;
-   cancelamento;
-   arquivamento.

Para cada evento:

-   usuário;
-   data;
-   hora;
-   ação;
-   versão da O.S.;
-   equipe relacionada, quando aplicável.

------------------------------------------------------------------------

# Estrutura de banco sugerida

## `ordens_servico`

-   `id`
-   `numero`
-   `ano`
-   `versao`
-   `origem`
-   `numero_documento_origem`
-   `assunto`
-   `data_emissao`
-   `data_execucao_inicio`
-   `data_execucao_fim`
-   `hora_inicio`
-   `hora_fim`
-   `ate_termino`
-   `descricao`
-   `local_execucao`
-   `ponto_apresentacao`
-   `observacoes`
-   `solicitante_nome`
-   `solicitante_orgao`
-   `solicitante_funcao`
-   `solicitante_telefone`
-   `solicitante_whatsapp`
-   `solicitante_email`
-   `status`
-   `criado_por`
-   `publicado_por`
-   `publicado_em`
-   `cancelado_por`
-   `cancelado_em`
-   `motivo_cancelamento`
-   `ordem_substituida_id`
-   `created_at`
-   `updated_at`

Criar constraint única para:

`numero + ano + versao`

------------------------------------------------------------------------

## `ordens_servico_equipes`

-   `id`
-   `ordem_servico_id`
-   `equipe_id`
-   `responsavel_equipe_id_no_momento`
-   `distribuida_em`
-   `primeira_visualizacao_em`
-   `ultima_visualizacao_em`
-   `baixada_em`
-   `impressa_em`
-   `created_at`

O campo `responsavel_equipe_id_no_momento` mantém o registro histórico
de quem era o responsável quando a O.S. foi distribuída.

A autorização de acesso, porém, deve considerar também o responsável
atual da equipe, conforme a regra escolhida.

------------------------------------------------------------------------

## `ordens_servico_historico`

-   `id`
-   `ordem_servico_id`
-   `usuario_id`
-   `acao`
-   `descricao`
-   `dados_anteriores`
-   `dados_novos`
-   `created_at`

Os campos anteriores e novos podem ser armazenados em `jsonb`.

------------------------------------------------------------------------

# Regras de permissão

## Gestor da Guarda

-   acesso completo;
-   criar;
-   editar rascunho;
-   publicar;
-   distribuir;
-   substituir;
-   cancelar;
-   arquivar;
-   visualizar todas.

## Administrativo da Guarda

Pode ter as mesmas permissões operacionais, conforme você definiu:

-   criar;
-   editar rascunho;
-   publicar;
-   distribuir;
-   substituir;
-   cancelar;
-   arquivar;
-   visualizar todas.

Caso desejem mais controle futuramente, publicação e cancelamento podem
virar permissões separadas.

## Responsável de equipe

Somente pode acessar quando:

-   a O.S. estiver publicada, cancelada, substituída ou arquivada;
-   sua equipe estiver vinculada à O.S.;
-   ele for o responsável autorizado da equipe.

Permitir apenas:

-   leitura;
-   download;
-   impressão.

------------------------------------------------------------------------

# Escopo inicial recomendado

Para a primeira versão:

1.  criação da O.S.;
2.  numeração automática;
3.  formulário baseado no documento atual;
4.  seleção de equipes;
5.  publicação;
6.  geração de PDF;
7.  visualização pelos responsáveis;
8.  download e impressão;
9.  notificações internas;
10. registro de visualização;
11. cancelamento;
12. filtros e histórico.

Deixaria para uma segunda evolução:

-   assinatura eletrônica;
-   QR Code público;
-   múltiplas versões mais avançadas;
-   integração automática com Escalas;
-   inclusão individual de guardas;
-   anexos extras;
-   confirmação formal de ciência.

## Minha recomendação principal

A O.S. deve ser distribuída para a **equipe**, e não diretamente para o
responsável como pessoa.

O responsável terá acesso porque ocupa essa função na equipe. Assim, se
houver substituição do responsável, a O.S. continua corretamente
vinculada à unidade operacional.

O fluxo central será:

**Gestor/Administrativo cria** → seleciona equipes → publica → sistema
gera PDF → responsáveis recebem notificação → visualizam, baixam ou
imprimem → sistema registra os acessos.
