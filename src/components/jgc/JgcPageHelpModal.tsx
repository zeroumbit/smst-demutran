import React, { useState } from "react";
import {
  BookOpen,
  Users,
  UsersRound,
  GraduationCap,
  ClipboardCheck,
  CalendarCheck,
  HeartPulse,
  FileBarChart,
  NotebookPen,
  Search,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
  UserPlus,
  FileText,
  Lock,
  Download,
  Filter,
  Star,
  Printer,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type JgcSectionKey =
  | "dashboard"
  | "alunos"
  | "responsaveis"
  | "turmas"
  | "diario"
  | "atividades"
  | "acompanhamentos"
  | "relatorios"
  | "anotacoes";

interface SectionHelpData {
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ElementType;
  overview: string;
  functions: {
    name: string;
    icon: React.ElementType;
    description: string;
    targetAudience?: string;
  }[];
  tutorial: {
    step: number;
    title: string;
    description: string;
  }[];
  tips?: string[];
}

export const JGC_HELP_DATA: Record<JgcSectionKey, SectionHelpData> = {
  dashboard: {
    title: "Painel Principal (Visão Geral)",
    subtitle: "Central de inteligência e acompanhamento em tempo real",
    badge: "Visão Geral",
    icon: ShieldCheck,
    overview:
      "O Painel Principal do Jovem Guarda Cidadã consolida as principais estatísticas da operação socioeducativa. Ele oferece um panorama imediato do quantitativo de jovens ativos, turmas em andamento, atendimentos realizados, encaminhamentos pendentes e alertas prioritários de aniversários e faltas.",
    functions: [
      {
        name: "Indicadores em Tempo Real",
        icon: FileBarChart,
        description:
          "Exibe cartões com métricas-chave: Alunos Ativos, Turmas Ativas, Total de Atendimentos, Encaminhamentos Pendentes e Média de Alunos por Turma.",
      },
      {
        name: "Painel 'Exige Atenção'",
        icon: AlertCircle,
        description:
          "Destaca pendências críticas como encaminhamentos não respondidos, ações socioeducativas em aberto e jovens sem turma vinculada.",
      },
      {
        name: "Alertas de Aniversariantes",
        icon: Sparkles,
        description:
          "Notifica a equipe sobre alunos que estão fazendo aniversário no mês corrente para fortalecimento de vínculos socioemocionais.",
      },
      {
        name: "Feed de Atendimentos Recentes",
        icon: HeartPulse,
        description:
          "Lista cronológica dos últimos atendimentos registrados respeitando os níveis de privacidade e permissões do usuário logado.",
      },
    ],
    tutorial: [
      {
        step: 1,
        title: "Acompanhar métricas operacionais",
        description:
          "Ao acessar o sistema, observe os cartões superiores para obter o resumo de alunos ativos e atendimento geral.",
      },
      {
        step: 2,
        title: "Resolver pendências prioritárias",
        description:
          "Verifique o bloco 'Exige atenção' na lateral ou no topo para identificar imediatamente encaminhamentos pendentes.",
      },
      {
        step: 3,
        title: "Atalho para Atendimento",
        description:
          "Utilize o botão '+ Registrar atendimento' no canto superior direito para abrir a ficha de escuta rápida de qualquer aluno.",
      },
    ],
    tips: [
      "Os dados visíveis no Painel adaptam-se automaticamente ao seu perfil (Gestor, Multiprofissional, Administrativo ou Professor).",
    ],
  },

  alunos: {
    title: "Módulo de Alunos",
    subtitle: "Gestão completa da trajetória e cadastro dos jovens",
    badge: "Gestão de Participantes",
    icon: Users,
    overview:
      "O módulo de Alunos é o coração do programa Jovem Guarda Cidadã. Nele é realizada a manutenção de todos os dados cadastrais, escolares, de saúde e histórico socioeducativo de cada participante, com geração automática de matrícula.",
    functions: [
      {
        name: "Busca e Filtragem Rápida",
        icon: Search,
        description:
          "Localize qualquer jovem instantaneamente digitando seu nome completo, número de matrícula ou escola de origem.",
      },
      {
        name: "Cadastro de Novo Aluno",
        icon: UserPlus,
        description:
          "Formulário estruturado em 4 etapas: Dados Pessoais (com foto, CPF, NIS), Dados Escolares, Horários do Projeto e Ficha de Saúde.",
      },
      {
        name: "Ficha / Trajetória do Aluno",
        icon: FileText,
        description:
          "Visualização completa em abas (Visão Geral, Frequência, Acompanhamentos Multidisciplinares, Responsáveis Legais e Saúde).",
      },
      {
        name: "Controle de Situação Cadastral",
        icon: CheckCircle2,
        description:
          "Monitoramento do status de participação do jovem (Ativo, Afastado ou Inativo) com histórico de movimentações.",
      },
    ],
    tutorial: [
      {
        step: 1,
        title: "Como cadastrar um novo aluno",
        description:
          "Clique no botão '+ Novo aluno' no canto superior direito da página. Preencha as abas: Pessoal -> Escola -> Projeto -> Saúde. Ao salvar, a matrícula é gerada automaticamente.",
      },
      {
        step: 2,
        title: "Como consultar o histórico de um jovem",
        description:
          "Localize o aluno na lista usando a barra de busca e clique no card correspondente. Navegue entre as abas para ver presença, relatórios de escuta e contatos familiares.",
      },
      {
        step: 3,
        title: "Como filtrar e atualizar dados",
        description:
          "Utilize o campo de pesquisa para filtrar por escola ou matricula. Para editar, acesse a ficha e clique no botão de edição.",
      },
    ],
    tips: [
      "Mantenha o NIS e o CPF atualizados para garantir a integração precisa com relatórios da assistência social municipal.",
    ],
  },

  responsaveis: {
    title: "Módulo de Responsáveis",
    subtitle: "Vínculos familiares e contatos de emergência",
    badge: "Rede Familiar",
    icon: UsersRound,
    overview:
      "Permite cadastrar e vincular pais, mães, tutores e responsáveis legais aos jovens do programa. Os dados cadastrados aqui ficam disponíveis diretamente na ficha individual do aluno, evitando duplicidade de registros.",
    functions: [
      {
        name: "Busca de Contatos",
        icon: Search,
        description:
          "Pesquise contatos pelo nome do responsável, nome do aluno associado ou número de telefone.",
      },
      {
        name: "Vínculo Familiar",
        icon: UserPlus,
        description:
          "Associe responsáveis aos alunos indicando o grau de parentesco/vínculo (Mãe, Pai, Avó, Tutor Legal, etc.).",
      },
      {
        name: "Responsável Principal",
        icon: Star,
        description:
          "Defina qual é o contato familiar prioritário para ligações de emergência e recados administrativos.",
      },
      {
        name: "Autorização para Buscar",
        icon: ShieldCheck,
        description:
          "Sinalização clara com selo visual indicando se o responsável possui autorização legal para retirar o aluno ao término das atividades.",
      },
    ],
    tutorial: [
      {
        step: 1,
        title: "Vincular um novo responsável",
        description:
          "Clique em '+ Novo responsável' na extremidade superior da página. Selecione o aluno na lista suspensa.",
      },
      {
        step: 2,
        title: "Preencher dados de contato",
        description:
          "Informe o nome completo, parentesco (ex: Mãe), telefone celular e WhatsApp. Se aplicável, preencha também o e-mail e endereço.",
      },
      {
        step: 3,
        title: "Marcar permissões especiais",
        description:
          "Marque as opções 'Responsável principal' e/ou 'Autorizado a buscar' conforme as regras de tutela e clique em 'Vincular'.",
      },
    ],
    tips: [
      "Cada aluno pode ter múltiplos responsáveis cadastrados. Certifique-se de marcar apenas um como 'Principal'.",
    ],
  },

  turmas: {
    title: "Módulo de Turmas",
    subtitle: "Gestão de turmas, horários e equipe docente",
    badge: "Estrutura Pedagógica",
    icon: GraduationCap,
    overview:
      "Organiza os alunos em agrupamentos operacionais por turno, horário e atividades socioeducativas. Permite vincular professores e instrutores responsáveis por cada turma.",
    functions: [
      {
        name: "Criação de Turmas",
        icon: Plus,
        description:
          "Cadastre turmas definindo nome, descrição pedagógica, turno (Manhã/Tarde/Noite) e horários de início e término.",
      },
      {
        name: "Vínculo de Professores / Instrutores",
        icon: Users,
        description:
          "Atribua um ou mais professores/instrutores para gerenciar o diário e a chamada da turma.",
      },
      {
        name: "Monitoramento de Vagas e Alunos",
        icon: UsersRound,
        description:
          "Exibe a contagem em tempo real do número de alunos matriculados em cada turma.",
      },
      {
        name: "Filtros e Status da Turma",
        icon: Filter,
        description:
          "Classifique as turmas por status (Ativa, Concluída ou Inativa) e turno de funcionamento.",
      },
    ],
    tutorial: [
      {
        step: 1,
        title: "Cadastrar uma turma",
        description:
          "Clique no botão '+ Nova turma'. Informe o nome (ex: Turma Alpha - Tarde), descrição, turno e horário de aula.",
      },
      {
        step: 2,
        title: "Vincular equipe de professores",
        description:
          "No card da turma desejada, clique em 'Vincular professores'. Selecione os docentes autorizados na lista e confirme.",
      },
      {
        step: 3,
        title: "Enturmar alunos",
        description:
          "Para adicionar um jovem à turma, acesse a ficha do aluno no módulo 'Alunos' e selecione a turma desejada.",
      },
    ],
    tips: [
      "Professores vinculados à turma terão acesso direto ao diário e chamada dessa turma específica.",
    ],
  },

  diario: {
    title: "Módulo de Diário de Turma",
    subtitle: "Registro de chamadas, conteúdo ministrado e assiduidade",
    badge: "Frequência e Aulas",
    icon: ClipboardCheck,
    overview:
      "Espaço destinado aos professores e técnicos para lançamento diário da chamada dos alunos, registro do conteúdo trabalhado nas oficinas e acompanhamento da taxa de presença.",
    functions: [
      {
        name: "Lançamento de Chamada",
        icon: CheckCircle2,
        description:
          "Marque a situação de cada aluno para a data selecionada: Presente, Ausente, Falta Justificada ou Atraso.",
      },
      {
        name: "Conteúdo e Observações do Encontro",
        icon: FileText,
        description:
          "Registre o tema da aula/oficina e observações de comportamento ou ocorrências do dia.",
      },
      {
        name: "Histórico de Diários por Turma",
        icon: Clock,
        description:
          "Consulte encontros passados com quantitativo consolidado de presenças e ausências.",
      },
      {
        name: "Consulta Individual por Aluno",
        icon: Search,
        description:
          "Filtre o diário por aluno para analisar o histórico individual e calcular a porcentagem de assiduidade.",
      },
    ],
    tutorial: [
      {
        step: 1,
        title: "Realizar a chamada do dia",
        description:
          "Na barra superior, clique na aba 'Fazer chamada'. Selecione a turma e a data do encontro.",
      },
      {
        step: 2,
        title: "Registrar presença e conteúdo",
        description:
          "Defina o status de cada jovem (Presente/Ausente/Justificada/Atraso). Preencha o campo de conteúdo pedagógico e clique em 'Salvar chamada'.",
      },
      {
        step: 3,
        title: "Consultar registros anteriores",
        description:
          "Alterne para a aba 'Diários' para revisar aulas registradas anteriormente e exportar relatórios de frequência.",
      },
    ],
    tips: [
      "A falta justificada não impacta negativamente a taxa de assiduidade do aluno em relatórios consolidados.",
    ],
  },

  atividades: {
    title: "Módulo de Atividades Socioeducativas",
    subtitle: "Planejamento e execução de oficinas, eventos e palestras",
    badge: "Oficinas e Eventos",
    icon: CalendarCheck,
    overview:
      "Permite agendar, organizar e acompanhar as atividades pedagógicas, culturais, esportivas e de cidadania realizadas com os jovens do programa.",
    functions: [
      {
        name: "Agendamento de Atividades",
        icon: Plus,
        description:
          "Crie atividades indicando título, modalidade (Oficina, Palestra, Evento, Esporte), data, horário e local.",
      },
      {
        name: "Vínculo com Turmas",
        icon: GraduationCap,
        description:
          "Defina se a atividade é direcionada a uma turma específica ou se abrange todo o contingente do programa.",
      },
      {
        name: "Status de Execução",
        icon: CheckCircle2,
        description:
          "Acompanhe o ciclo de vida da atividade: Planejada, Em Andamento ou Concluída.",
      },
      {
        name: "Descrição e Objetivos",
        icon: FileText,
        description:
          "Detalhamento dos objetivos pedagógicos, materiais necessários e orientadores responsáveis.",
      },
    ],
    tutorial: [
      {
        step: 1,
        title: "Criar uma nova atividade",
        description:
          "Clique em '+ Nova atividade'. Selecione a turma (ou Deixe em branco para atividade geral).",
      },
      {
        step: 2,
        title: "Definir detalhes e local",
        description:
          "Insira o título, modalidade (ex: Oficina de Cidadania), data, horário de início/fim e o local de realização.",
      },
      {
        step: 3,
        title: "Concluir a atividade",
        description:
          "Após a execução do evento, altere o status para 'Concluída' para alimentar os relatórios de produtividade.",
      },
    ],
    tips: [
      "Atividades concluídas ficam registradas no histórico do programa para prestação de contas.",
    ],
  },

  acompanhamentos: {
    title: "Módulo de Acompanhamentos Multidisciplinares",
    subtitle: "Escuta socioemocional, prontuário técnico e rede de proteção",
    badge: "Atendimento Técnico",
    icon: HeartPulse,
    overview:
      "Reservado para a equipe multidisciplinar (Psicólogos, Assistentes Sociais, Orientadores), este módulo permite registrar atendimentos individuais ou familiares com rígido controle de privacidade e prazos de retorno.",
    functions: [
      {
        name: "Registro de Escuta Técnica",
        icon: HeartPulse,
        description:
          "Cadastre atendimentos definindo área profissional, tipo de demanda, motivo e relato detalhado.",
      },
      {
        name: "Controle Estrito de Privacidade",
        icon: Lock,
        description:
          "Classifique o atendimento em níveis de acesso: Restrito à equipe técnica, Confidencial ou Público.",
      },
      {
        name: "Gestão de Retornos e Agendamentos",
        icon: Clock,
        description:
          "Marque alertas de retorno indicando data limite e motivo do reatendimento socioemocional.",
      },
      {
        name: "Encaminhamentos para a Rede municipal",
        icon: ChevronRight,
        description:
          "Registre encaminhamentos externos (CRAS, CREAS, Posto de Saúde, Escolas) e acompanhe seu status.",
      },
    ],
    tutorial: [
      {
        step: 1,
        title: "Registrar um atendimento",
        description:
          "Clique em '+ Registrar atendimento'. Selecione o aluno beneficiário na lista.",
      },
      {
        step: 2,
        title: "Preencher parecer e privacidade",
        description:
          "Informe a área profissional, motivo, relato técnico e selecione a privacidade (ex: Restrito).",
      },
      {
        step: 3,
        title: "Configurar retorno (se necessário)",
        description:
          "Marque a opção 'Necessita retorno', defina a data prevista e o motivo. Salve para gerar o alerta.",
      },
    ],
    tips: [
      "Atendimentos marcados como 'Restrito' ou 'Confidencial' só serão visíveis para usuários habilitados com perfil Gestor ou Multiprofissional.",
    ],
  },

  relatorios: {
    title: "Módulo de Relatórios e Indicadores",
    subtitle: "Consolidação de dados, consultas e exportações formais",
    badge: "Gestão e Prestação de Contas",
    icon: FileBarChart,
    overview:
      "Ferramenta de geração de estatísticas formais do programa. Permite analisar o impacto das ações, índices de assiduidade e quantitativo de atendimentos realizados por período.",
    functions: [
      {
        name: "Indicadores Consolidados",
        icon: FileBarChart,
        description:
          "Métricas agrupadas de assiduidade por turma, faixa etária, gênero e dados escolares.",
      },
      {
        name: "Filtros por Período e Turma",
        icon: Filter,
        description:
          "Personalize a consulta aplicando recortes de datas específicas e turmas selecionadas.",
      },
      {
        name: "Exportação de Dados",
        icon: Download,
        description:
          "Geração de relatórios prontos para impressão ou exportação em formatos digitais.",
      },
      {
        name: "Frequência Acumulada",
        icon: ClipboardCheck,
        description:
          "Relatório detalhado contendo a taxa percentual de presença de cada aluno no mês.",
      },
    ],
    tutorial: [
      {
        step: 1,
        title: "Selecionar o tipo de relatório",
        description:
          "Escolha na lista o tipo de consulta desejada (ex: Frequência Geral ou Atendimentos por Área).",
      },
      {
        step: 2,
        title: "Aplicar filtros",
        description:
          "Defina o intervalo de datas (Data Inicial e Data Final) e selecione a turma desejada.",
      },
      {
        step: 3,
        title: "Visualizar e exportar",
        description:
          "Clique em 'Gerar relatório' para visualizar a tabela na tela e utilize o botão 'Exportar' para baixar.",
      },
    ],
    tips: [
      "Relatórios respeitam rigorosamente a privacidade dos dados conforme a Lei Geral de Proteção de Dados (LGPD).",
    ],
  },

  anotacoes: {
    title: "Módulo de Anotações Pessoais e Técnicas",
    subtitle: "Bloco de notas pessoal, rascunhos rápidos e tarefas da rotina",
    badge: "Produtividade",
    icon: NotebookPen,
    overview:
      "Espaço individual de produtividade para criação de notas rápidas, atas de reuniões, lembretes de atendimento e rascunhos de planejamento sem interferir nos registros oficiais.",
    functions: [
      {
        name: "Criar e Organizar Anotações",
        icon: Plus,
        description:
          "Crie notas com título, categoria temática (Reunião, Atendimento, Lembrete, Tarefa) e conteúdo livre.",
      },
      {
        name: "Fixar e Favoritar",
        icon: Star,
        description:
          "Destaque anotações importantes fixando-as no topo do seu painel ou marcando com estrela de favorito.",
      },
      {
        name: "Impressão e Exportação",
        icon: Printer,
        description:
          "Imprima notas formatadas em folha A4 com um único clique para levar em reuniões de campo.",
      },
      {
        name: "Salvamento Automático de Rascunho",
        icon: CheckCircle2,
        description:
          "Enquanto você digita, o sistema salva automaticamente suas alterações localmente para evitar perdas.",
      },
    ],
    tutorial: [
      {
        step: 1,
        title: "Criar uma nova anotação",
        description:
          "Clique no botão '+ Nova anotação'. Digite o título e selecione a categoria desejada.",
      },
      {
        step: 2,
        title: "Redigir e categorizar",
        description:
          "Escreva o texto no campo de descrição. Você pode marcar as opções 'Fixar no topo' ou 'Marcar como favorita'.",
      },
      {
        step: 3,
        title: "Imprimir ou visualizar",
        description:
          "Abra qualquer anotação salva e clique no botão com ícone de impressora para gerar o documento A4 formatado.",
      },
    ],
    tips: [
      "Suas anotações são pessoais e vinculadas ao seu usuário do sistema.",
    ],
  },
};

interface JgcSaibaMaisModalProps {
  sectionKey: JgcSectionKey;
  isOpen: boolean;
  onClose: () => void;
}

export function JgcSaibaMaisModal({
  sectionKey,
  isOpen,
  onClose,
}: JgcSaibaMaisModalProps) {
  const data = JGC_HELP_DATA[sectionKey] || JGC_HELP_DATA.dashboard;
  const HeaderIcon = data.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[85vh] overflow-y-auto p-0 rounded-3xl border-0 shadow-2xl bg-white">
        {/* Header Modal com Gradiente */}
        <div className="bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-6 text-white sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 backdrop-blur-md text-teal-200 border border-white/10">
              <HeaderIcon className="h-5 w-5" />
            </div>
            <div>
              <Badge className="border-white/15 bg-white/10 text-teal-200 hover:bg-white/15 px-2.5 py-0.5 text-xs font-semibold">
                {data.badge}
              </Badge>
            </div>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {data.title}
          </DialogTitle>
          <p className="mt-1 text-sm text-teal-100/80">{data.subtitle}</p>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Visão Geral */}
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 sm:p-5 text-sm text-slate-700 leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
              <Info className="h-4 w-4 text-teal-700" />
              <span>Visão Geral do Módulo</span>
            </div>
            <p>{data.overview}</p>
          </div>

          {/* Abas: Funções vs Tutorial */}
          <Tabs defaultValue="funcoes" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-xl">
              <TabsTrigger value="funcoes" className="rounded-lg text-xs sm:text-sm font-semibold">
                Funções da Página ({data.functions.length})
              </TabsTrigger>
              <TabsTrigger value="tutorial" className="rounded-lg text-xs sm:text-sm font-semibold">
                Tutorial Passo a Passo ({data.tutorial.length} etapas)
              </TabsTrigger>
            </TabsList>

            {/* Aba Funções */}
            <TabsContent value="funcoes" className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {data.functions.map((fn, idx) => {
                  const FnIcon = fn.icon;
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                            <FnIcon className="h-4 w-4" />
                          </div>
                          <strong className="text-sm text-slate-900 font-bold leading-tight">
                            {fn.name}
                          </strong>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {fn.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Aba Tutorial */}
            <TabsContent value="tutorial" className="mt-4 space-y-3">
              <div className="space-y-3">
                {data.tutorial.map((step) => (
                  <div
                    key={step.step}
                    className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-700 font-bold text-white text-sm shadow-sm">
                      {step.step}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">
                        {step.title}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Dicas / Observações */}
          {data.tips && data.tips.length > 0 && (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>Dica importante</span>
              </div>
              {data.tips.map((tip, i) => (
                <p key={i}>{tip}</p>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé com botão de fechar */}
        <div className="flex justify-end p-4 sm:px-8 border-t border-slate-100 bg-slate-50 rounded-b-3xl">
          <Button
            type="button"
            onClick={onClose}
            className="bg-teal-700 hover:bg-teal-800 text-white rounded-xl px-6"
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface JgcSaibaMaisButtonProps {
  sectionKey: JgcSectionKey;
  size?: "default" | "sm" | "xs";
  className?: string;
}

export function JgcSaibaMaisButton({
  sectionKey,
  size = "default",
  className = "",
}: JgcSaibaMaisButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Clique para ver o tutorial e detalhes das funções desta página"
        className={`inline-flex items-center gap-1.5 font-medium rounded-full transition-all border shadow-sm shrink-0 active:scale-95 ${
          size === "xs"
            ? "text-[11px] px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-200"
            : size === "sm"
            ? "text-xs px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-200"
            : "text-xs sm:text-sm px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100 text-teal-900 border-teal-200/90 hover:border-teal-300 font-semibold"
        } ${className}`}
      >
        <BookOpen className={size === "xs" ? "h-3 w-3 text-teal-600" : "h-3.5 w-3.5 sm:h-4 sm:w-4 text-teal-600"} />
        <span>Saiba mais</span>
      </button>

      {open && (
        <JgcSaibaMaisModal
          sectionKey={sectionKey}
          isOpen={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
