# Sistema SMST — Secretaria Municipal de Segurança Pública e Trânsito de Canindé

## Apresentação Técnica e Funcional do Sistema

---

## 1. O QUE É O SISTEMA

O **SMST** é um sistema web completo (PWA — Progressive Web App) de gestão integrada criado para a Secretaria Municipal de Segurança Pública e Trânsito de Canindé. Ele reúne em uma única plataforma o **portal público destinado ao cidadão** e um **painel administrativo interno** que organiza todas as áreas da secretaria: a **Guarda Municipal**, o **Departamento Municipal de Trânsito (DEMUTRAN)**, os **programas sociais** (Jovem Guarda, Guarda Cidadã, ROPE, GMAM, GSU, Defesa Civil), os **serviços ao cidadão** e a **gestão administrativa interna**.

O sistema foi pensado para digitalizar, organizar e dar transparência às operações da Secretaria, eliminando o trabalho manual e o uso de planilhas e papel.

---

## 2. VISÃO GERAL DA PLATAFORMA

- **Uma única plataforma** com dois ambientes integrados:
  - **Portal Público (Cidadão):** onde o munícipe consulta informações, notícias, serviços e abre solicitações.
  - **Painel Administrativo (Gestão)** — onde servidores e gestores de cada setor gerenciam os processos por meio de login seguro e permissões controladas.
- **Acesso de qualquer lugar** — em computadores e celulares, com funcionamento even offline.
- **Tecnologia moderna e segura**, hospedada em nuvem (Vercel + Supabase), com banco de dados PostgreSQL, autenticação e armazenamento de arquivos.

---

## 3. TECNOLOGIA UTILIZADA

- **Frontend:** React + TypeScript + Tailwind CSS (interface moderna, rápida e responsiva).
- **Backend e Banco de Dados:** Supabase (PostgreSQL), com autenticação segura por e-mail/senha e storage para arquivos e imagens.
- **Hospedagem:** Vercel (deploy automático e escalável).
- **Recursos prontos:** gráficos, geração de PDF, planilhas Excel, notificações, modo escuro/claro, instalação como aplicativo no celular.

---

## 4. PORTAL PÚBLICO (CIDADÃO)

O cidadão acessa pela internet, sem instalar nada, as seguintes áreas:

### 4.1 Institucional e Comunicação
- **Página inicial (Home)** com notícias em destaque, serviços rápidos e acesso a todos os setores.
- **Portal de Notícias** — listagem e leitura de notícias completas.
- **Eventos** — agenda de eventos da Secretaria.
- **Galeria de fotos** — organizada por páginas/eventos.
- **Contato** — formulário e informações para falar com a secretaria.
- **Defesa Civil** — página institucional e atuação da defesa civil no combate à seca.

### 4.2 DEMUTRAN (Departamento Municipal de Trânsito)
Serviços online para o condutor e transporte municipal:
- **Consulta de veículos apreendidos** — o cidadão consulta se há veículo recolhido e como proceder.
- **Solicitação de Credencial de Estacionamento** — para idosos e pessoas com deficiência (PCD).
- **Portal do Concessionário** — área de autocadastro e consulta para permissionários de transporte.
- **Recursos de Multa** — o condutor interpõe recurso administrativo de multa online.
- **Documentos públicos** do DEMUTRAN.
- **Mídias educativas** de trânsito — conteúdo educativo.

### 4.3 Guarda Municipal e Programas
- **Guarda Municipal** — página institucional.
- **Jovem Guarda** — programa de jovens aprendizes.
- **Guarda Cidadã** — programa de polícia comunitária.
- **ROPE** — Registro de Ocorrência da Polícia Escolar.
- **GMAM** — Guarda Municipal Ambiental.
- **GSU** — Guarda Municipal de Serviços Urbanos.

### 4.4 Fala Cidadão (Canal de Atendimento)
Canal oficial de demandas urbanas do cidadão com as secretarias municipais:
- **Nova solicitação** — abertura de pedido (por exemplo: iluminação, buraco na rua, limpeza, segurança, trânsito).
- **Acompanhar por protocolo** — o cidadão acompanha o andamento com número de protocolo.
- **Minhas solicitações** — histórico das próprias solicitações por CPF.

### 4.5 Área Legal e Institucional
- Páginas de **Termos de Uso** e **Política de Privacidade**.

---

## 5. PAINEL ADMINISTRATIVO (GESTÃO INTERNA)

Área protegida por login, com **perfis e permissões** controlados. Cada usuário só enxerga dados do seu setor.

### 5.1 Controle de Acesso e Perfis
- **Super Administrador** — acesso total ao sistema.
- **Gestor de Setor** — gerencia um setor específico.
- **Administrador de Setor** — administra o conteúdo do setor.
- **Técnico** — operador com acesso aos módulos específicos que lhe foram concedidos.
- **Guarda Municipal** — perfil próprio com acesso restrito à área do guarda.

### 5.2 Gestão de Conteúdo (todas as seções do site)
- **Notícias** — criar, editar, publicar e excluir notícias.
- **Eventos** — gestão completa da agenda.
- **Galeria de fotos** — uploadeditoria de imagens por página, com validação de páginas existentes.
- **Banners** — imagens da home.
- **Mídias educativas** — conteúdos de trânsito.
- **Documentos públicos** — envio de arquivos (PDF/Word), com controle ativo/inativo e local de exibição por setor.
- **Equipe** — cadastro dos membros e suas funções.
- **Projetos** — organização de projetos.

### 5.3 Administração do Sistema
- **Dashboard** — painel principal com indicadores, estatísticas e gráficos.
- **Dashboard por setor** — indicador específico para cada setor.
- **Setores** — cadastro dos setores da secretaria.
- **Gestores** — atribuição de gestores e responsáveis.
- **Usuários** — gerenciamento de contas e permissões.
- **Relatórios gerenciais** — emissão de relatórios para tomada de decisão.
- **Perfil** — dados do usuário logado.

### 5.4 Módulo Fala Cidadão (Gestão das Demandas)
- **Triagem, encaminhamento e resposta** das solicitações cidadãs.
- **Transferência entre secretarias** quando necessário, com registro de origem, destino, justificativa e responsável.
- **Histórico completo** e auditoria de cada demanda.
- **Rastreabilidade** por protocolo em todas as etapas.

### 5.5 Módulo DEMUTRAN (Administrativo)
- **Liberação de veículos** apreendidos.
- **Gestão de concessionários** — cadastro e controle dos permissionários.
- **Frota municipal** — controle de veículos e viaturas.
- **Credenciais** — emissão e gestão de credenciais de estacionamento.
- **Recursos de multas** — análise e resposta aos recursos interpostos.
- **Mídias DEMUTRAN** — banners e conteúdos do portal.
- **Configurações** — PIX, taxas e valores dos serviços.

### 5.6 Módulo Guarda Municipal (Administrativo)
- **Cadastro de guardas** — perfil, graduações e equipe.
- **IROs (Operações de Reforço)** — criação, candidatura e banco de horas.
- **Escalas da Guarda** — montagem de equipes, viaturas, publicação, ciência, trocas e versionamento.
- **Fiscalização** — cadastro de categorias e tipos de infração.
- **Configurações da Guarda** — regras e parâmetros.

---

## 6. ÁREA DO GUARDA (PERFIL PRÓPRIO)

Cada guarda municipal tem um ambiente pessoal e seguro:
- **Dashboard pessoal** com seus dados e indicadores.
- **IROs** — inscrição em operações, candidatura e acompanhamento do banco de horas.
- **Escalas** — visualizar escalas, confirmar ciência, acompanhar alterações e solicitar trocas.
- **Minhas Solicitações** — central onde o guarda acompanha correções, esclarecimentos e atualizações cadastrais.
- **Fiscalização** — consulta de infrações e ficha por código.
- **Anotações pessoais** — notas privadas do guarda.
- **Ordens de Serviço da equipe** — veiculares documentos direcionados à sua equipe.

---

## 7. MÓDULO DE ORDENS DE SERVIÇO (O.S.)

Criação, gestão e controle de **Ordens de Serviço da Guarda Municipal** e do DEMUTRAN:
- **Numeração automática** anual (O.S. nº 001/2026, 002/2026...) gerada no servidor.
- **Formulário padronizado** com identificação, dados de execução, solicitante e local.
- **Distribuição por equipes** — a O.S. segue para o responsável da equipe.
- **Geração de PDF oficial** com cabeçalho institucional.
- **Fluxo de status:** rascunho → publicada → substituta / cancelada / arquivada.
- **Versionamento** — ao alterar uma O.S. publicada, o sistema gera nova versão e preserva a anterior.
- **Auditoria e histórico** — registra todas as visualizações, downloads e impressões de cada equipe.
- **Notificações automáticas** aos responsáveis das equipes.

---

## 8. MÓDULO DE ESCALAS (GUARDA MUNICIPAL)

- **Estrutura e montagem de escala** — agentes, funções, viaturas e carga horária.
- **Detecção de conflitos de horário** antes de salvar a escala.
- **Publicação da escala** — disponibilidade imediata para os guardas.
- **Confirmação de ciência** — o guarda registra que tomou conhecimento (data/hora).
- **Geração de recorrências** — escala repetida automaticamente.
- **Trocas de serviço** — solicitação e aprovação/recusa entre guardas.
- **Notificações obrigatórias** ao guarda (publicação, alteração, trocas).
- **Relatórios em PDF** das operações.

---

## 9. MÓDULO FISCALIZAÇÃO

- **Cadastro de categorias de infração e tipos de infração**.
- **Ficha de infração** completa por código.
- **Busca avançada** por código, descrição, artigo.

---

## 10. NOTIFICAÇÕES

- Sistema interno de **notificações para os usuários** (gestor, guarda, secretaria).
- Notificações **automáticas obrigatoriais** para eventos operacionais relevantes:
  - nova escala publicada;
  - alteração/remoção de escala;
  - nova ordem de serviço;
  - resultados de trocas, respostas a esclarecimentos e atualização de solicitações.

---

## 11. FUNÇÕES TRANSVERSAIS

- **Relatórios gerenciais** com exportação em **Excel** e **PDF**.
- **Notificações toast** de sucesso/erro em tempo real.
- **Modo escuro/claro**.
- **Instalação como aplicativo** no celular/desktop (PWA) com **funcionamento offline** e **notificações push**.
- **Auditoria de ações** registrando quem, quando e o que alterou.
- **Segurança por camadas** (RLS — Row Level Security) garantindo que cada usuário veja apenas os dados que podem ver.

---

## 12. PRINCIPAIS BENEFÍCIOS PARA A GESTÃO

1. **Redução de papel e trabalho manual** — todo o fluxo de documentos, ordens e escalas digital e organizado.
2. **Centralização da informação** — todos os setores em uma única plataforma.
3. **Transparência e cidadão** — o munícipe acompanha seus pedidos e recebe informação clara sem se deslocar.
4. **Controle de acesso e segurança** — só quem pode ver cada tipo de dado tem permissão.
5. **Rastreabilidade e auditoria** — histórico completo de O.S., escalas, demandas e solicitações.
6. **Tomada de decisão com dados** — dashboards, indicadores e relatórios gerenciais.
7. **Produtividade da equipe** — guardas, gestores e administrativos com ferramentas próprias.
8. **Compatibilidade** — funciona em qualquer aparelho com navegador, com opção offline.

---

## 13. ESTRUTURA DA PLATAFORMA EM NÚMEROS

- **+60 páginas** entre ambiente público e administrativo.
- **4 perfis de acesso** + tipo de guarda.
- **108 estruturas de banco de dados** (migrações) cobrindo todos os setores.
- **4 funções de servidor** (Edge Functions) para automações internas.
- **Galeria, documentos, mídias, banners** com upload ativo direto.
- **Geração de PDF e Excel** integrada (O.S., escalas, relatórios).

---

## 14. DISPONIBILIDADE

- Web, acessível 24h por dia.
- Hospedagem segura em nuvem (Vercel).
- Banco de dados gerenciado na nuvem (Supabase/PostgreSQL).

---

*Documento elaborado em agosto de 2026. Sistema SMST — Secretaria Municipal de Segurança Pública e Trânsito de Canindé.*