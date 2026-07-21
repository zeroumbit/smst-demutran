import type { OnboardingStep } from './OnboardingWizard';
import { Shield, FileWarning, CalendarDays, ClipboardList, UserCircle2, LayoutDashboard, Users, Settings2, Search, IdCard, CarFront, FileText } from 'lucide-react';

export const guardaOnboardingSteps: OnboardingStep[] = [
  {
    icon: <Shield className="h-12 w-12" />,
    title: 'Bem-vindo à Guarda',
    description: 'Aqui você acompanha tudo relacionado à sua atuação na Guarda Municipal de forma simples e organizada.',
  },
  {
    icon: <FileWarning className="h-12 w-12" />,
    title: 'IROs e Ocorrências',
    description: 'Registre e acompanhe suas IROs (Informações Relevantes de Ocorrência) e veja o histórico completo.',
  },
  {
    icon: <CalendarDays className="h-12 w-12" />,
    title: 'Escalas e Equipes',
    description: 'Consulte suas escalas de serviço, veja a equipe escalada e organize sua rotina de plantões.',
  },
  {
    icon: <ClipboardList className="h-12 w-12" />,
    title: 'Fiscalização',
    description: 'Acesse o módulo de fiscalização para registrar e consultar infrações e autuações.',
  },
  {
    icon: <UserCircle2 className="h-12 w-12" />,
    title: 'Seu Perfil',
    description: 'Mantenha seus dados atualizados e configure suas preferências na seção Pessoal.',
  },
];

export const adminOnboardingSteps: OnboardingStep[] = [
  {
    icon: <LayoutDashboard className="h-12 w-12" />,
    title: 'Painel Administrativo',
    description: 'Visualize indicadores, métricas e tenha uma visão geral da gestão do seu setor.',
  },
  {
    icon: <Users className="h-12 w-12" />,
    title: 'Gestão de Usuários',
    description: 'Gerencie perfis, permissões e controle de acesso dos usuários do sistema.',
  },
  {
    icon: <Settings2 className="h-12 w-12" />,
    title: 'Configurações',
    description: 'Personalize as configurações do setor, módulos e preferências do sistema.',
  },
  {
    icon: <Search className="h-12 w-12" />,
    title: 'Pesquisa Global',
    description: 'Use a barra de pesquisa no topo para encontrar páginas e registros rapidamente.',
  },
];

export const concessionarioOnboardingSteps: OnboardingStep[] = [
  {
    icon: <IdCard className="h-12 w-12" />,
    title: 'Credenciais e Recursos',
    description: 'Acompanhe solicitações de credenciais, recursos e veículos de forma descomplicada.',
  },
  {
    icon: <CarFront className="h-12 w-12" />,
    title: 'Seus Veículos',
    description: 'Visualize os dados dos seus veículos cadastrados e mantenha as informações atualizadas.',
  },
  {
    icon: <UserCircle2 className="h-12 w-12" />,
    title: 'Seu Cadastro',
    description: 'Mantenha seus dados pessoais e de contato sempre atualizados no sistema.',
  },
];
