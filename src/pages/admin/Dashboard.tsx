import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  BellRing,
  Building2,

  CarFront,
  CheckCircle2,
  FileText,
  ImageIcon,
  Newspaper,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { AdminProfileRow, Setor } from '@/types/admin';

type MetricCard = {
  label: string;
  value: string;
  helper: string;
  icon: typeof Building2;
  tone: 'blue' | 'green' | 'amber' | 'rose';
};

type SectorAttention = {
  id: string;
  nome: string;
  issue: string;
};

type ServiceStatus = {
  label: string;
  value: number;
  tone: 'neutral' | 'warning' | 'success';
};

type ConcessionarioBreakdown = {
  label: string;
  total: number;
  ativos: number;
};

type DashboardState = {
  loading: boolean;
  metrics: MetricCard[];
  serviceStatus: ServiceStatus[];
  alerts: string[];
  sectorsNeedingAttention: SectorAttention[];
  vehicleMovement: Array<{ month: string; apreendidos: number; liberados: number }>;
  sectorHealth: Array<{ name: string; value: number; fill: string }>;
  concessionarios: ConcessionarioBreakdown[];
  pendingRecursos: number;
  totalRecursos: number;
  recursosDeferidos: number;
  pendingCredenciais: number;
  frotaAtiva: number;
  guardasAtivos: number;
  operacoesAtivasIro: number;
  candidaturasIro: number;
  totalBancoHoras: number;
  demandasFalaCidadaoCount: number;
  distribuicaoGraduacoes: Array<{ label: string; total: number }>;
};

const initialState: DashboardState = {
  loading: true,
  metrics: [],
  serviceStatus: [],
  alerts: [],
  sectorsNeedingAttention: [],
  vehicleMovement: [],
  sectorHealth: [],
  concessionarios: [],
  pendingRecursos: 0,
  totalRecursos: 0,
  recursosDeferidos: 0,
  pendingCredenciais: 0,
  frotaAtiva: 0,
  guardasAtivos: 0,
  operacoesAtivasIro: 0,
  candidaturasIro: 0,
  totalBancoHoras: 0,
  demandasFalaCidadaoCount: 0,
  distribuicaoGraduacoes: [],
};

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

const buildLastSixMonths = () => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return {
      key,
      month: monthFormatter.format(date).replace('.', ''),
      apreendidos: 0,
      liberados: 0,
    };
  });
};

const metricToneClasses: Record<MetricCard['tone'], string> = {
  blue: 'bg-brand-50 text-brand-600 border-brand-100',
  green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  rose: 'bg-rose-50 text-rose-600 border-rose-100',
};

const serviceToneDot: Record<ServiceStatus['tone'], string> = {
  neutral: 'bg-brand-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
};

const serviceToneBadge: Record<ServiceStatus['tone'], string> = {
  neutral: 'bg-brand-50 text-brand-700 border-brand-100',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
};

const chartConfig = {
  apreendidos: {
    label: 'Apreendidos',
    color: '#f97316',
  },
  liberados: {
    label: 'Liberados',
    color: '#10b981',
  },
  criticos: {
    label: 'Setores criticos',
    color: '#ef4444',
  },
  regulares: {
    label: 'Setores regulares',
    color: '#10b981',
  },
} as const;

const Dashboard = () => {
  const { profile, isSuperAdmin, setorId, papel } = useAuth();
  const { setorSlug: urlSetorSlug } = useParams<{ setorSlug?: string }>();
  const [state, setState] = useState<DashboardState>(initialState);

  const currentSetorSlug = urlSetorSlug || profile?.setor_slug;
  const isDemutranScope = currentSetorSlug === 'demutran';
  const isGuardaScope = currentSetorSlug === 'guarda-municipal';

  const panelTitle = useMemo(() => {
    if (isSuperAdmin && !urlSetorSlug) return 'Centro de Comando SMST';
    if (isGuardaScope) return 'Painel de Gestão · Guarda Municipal';
    if (isDemutranScope) return 'Painel de Gestão · DEMUTRAN';
    if (papel === 'gestor') return `Painel de gestao · ${profile?.setor_nome || 'Setor'}`;
    return `Painel operacional · ${profile?.setor_nome || 'Setor'}`;
  }, [isSuperAdmin, urlSetorSlug, isGuardaScope, isDemutranScope, papel, profile?.setor_nome]);

  const panelDescription = useMemo(() => {
    if (isGuardaScope) {
      return 'Leitura executiva para acompanhamento do efetivo ativo, graduações de carreira, escalas de Indenização de Reforço Operacional (IRO), banco de horas extras e demandas de ouvidoria da Guarda Municipal.';
    }
    if (isDemutranScope) {
      return 'Leitura executiva para controle de veículos apreendidos, regularização fiscal, solicitações de credenciais de vagas especiais, recursos de multas de trânsito e permissionários concessionários.';
    }
    return 'Leitura executiva para controle de veiculos apreendidos, publicacao de decretos oficiais, controle de fardamentos e monitoramento de transito em Caninde.';
  }, [isGuardaScope, isDemutranScope]);

  const resolvedChartConfig = useMemo(() => {
    if (isGuardaScope) {
      return {
        apreendidos: {
          label: 'Escalas Confirmadas',
          color: '#2563eb',
        },
        liberados: {
          label: 'Escalas Realizadas',
          color: '#10b981',
        },
      };
    }
    return chartConfig;
  }, [isGuardaScope]);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setState(initialState);

      const scopedFilter = <T,>(query: T & { eq: (column: string, value: string) => T }) => {
        if (!isSuperAdmin && setorId) {
          return query.eq('setor_id', setorId);
        }
        return query;
      };

      // Carrega informações comuns de secretaria
      const [
        setoresResponse,
        perfisResponse,
        noticiasCountResponse,
        eventosCountResponse,
        galeriaCountResponse,
        documentosCountResponse,
      ] = await Promise.all([
        supabase.from('setores').select('id, nome, ativo').order('nome'),
        isSuperAdmin
          ? supabase.rpc('get_admin_profiles')
          : setorId
            ? supabase.rpc('get_admin_profiles', { _setor_id: setorId })
            : Promise.resolve({ data: [], error: null }),
        scopedFilter(supabase.from('noticias').select('*', { count: 'exact', head: true }).eq('ativo', true)),
        scopedFilter(supabase.from('eventos').select('*', { count: 'exact', head: true }).eq('ativo', true)),
        scopedFilter(supabase.from('galeria_fotos').select('*', { count: 'exact', head: true }).eq('ativo', true)),
        scopedFilter(supabase.from('documentos').select('*', { count: 'exact', head: true }).eq('ativo', true)),
      ]);

      let targetSetorId = setorId;
      if (!targetSetorId) {
        const { data: setorData } = await supabase
          .from('setores')
          .select('id')
          .eq('slug', 'guarda-municipal')
          .maybeSingle();
        if (setorData) targetSetorId = setorData.id;
      }

      // Inicialização de variáveis locais
      let pendingCredenciais = 0;
      let pendingRecursos = 0;
      let totalRecursos = 0;
      let recursosDeferidos = 0;
      let apreendidos = 0;
      let liberados = 0;
      let frotaAtiva = 0;
      let concessionariosRows: any[] = [];
      let concessionarios: ConcessionarioBreakdown[] = [];

      let guardasAtivos = 0;
      let operacoesAtivasIro = 0;
      let candidaturasIro = 0;
      let totalBancoHoras = 0;
      let demandasFalaCidadaoCount = 0;
      let distribuicaoGraduacoes: Array<{ label: string; total: number }> = [];
      let movementMap = buildLastSixMonths();

      if (isDemutranScope) {
        const [
          credenciaisCountResponse,
          recursosCountResponse,
          recursosTotalResponse,
          veiculosAbertosResponse,
          veiculosLiberadosResponse,
          frotaResponse,
          concessionariosResponse,
          veiculosSeriesResponse,
        ] = await Promise.all([
          scopedFilter(supabase.from('demutran_credenciais_solicitacoes').select('status', { count: 'exact', head: true }).in('status', ['pendente', 'em_analise'])),
          scopedFilter(supabase.from('demutran_recursos').select('status', { count: 'exact', head: true }).in('status', ['pendente', 'em_analise'])),
          scopedFilter(supabase.from('demutran_recursos').select('id', { count: 'exact', head: true })),
          scopedFilter(supabase.from('veiculos_recolhidos').select('status', { count: 'exact', head: true }).neq('status', 'liberado')),
          scopedFilter(supabase.from('veiculos_recolhidos').select('status', { count: 'exact', head: true }).eq('status', 'liberado')),
          scopedFilter(supabase.from('demutran_veiculos_municipais').select('id', { count: 'exact', head: true }).eq('ativo', true)),
          scopedFilter((supabase as any).from('demutran_concessionarios').select('categoria, ativo')),
          scopedFilter(supabase.from('veiculos_recolhidos').select('created_at, data_liberacao')),
        ]);

        pendingCredenciais = credenciaisCountResponse.count || 0;
        pendingRecursos = recursosCountResponse.count || 0;
        totalRecursos = recursosTotalResponse.count || 0;
        recursosDeferidos = Math.max(totalRecursos - pendingRecursos, 0);
        apreendidos = veiculosAbertosResponse.count || 0;
        liberados = veiculosLiberadosResponse.count || 0;
        frotaAtiva = frotaResponse.count || 0;
        concessionariosRows = ((concessionariosResponse.data || []) as any[]).filter(Boolean);
        const concessionariosTotal = concessionariosRows.length;

        const concessionariosMap = new Map<string, ConcessionarioBreakdown>([
          ['mototaxi', { label: 'Moto-taxi', total: 0, ativos: 0 }],
          ['taxi', { label: 'Taxi', total: 0, ativos: 0 }],
          ['carro_horario', { label: 'Carro de horario', total: 0, ativos: 0 }],
          ['fretista', { label: 'Fretista', total: 0, ativos: 0 }],
        ]);
        concessionariosRows.forEach((item) => {
          const current = concessionariosMap.get(item.categoria);
          if (!current) return;
          current.total += 1;
          if (item.ativo) current.ativos += 1;
        });
        concessionarios = Array.from(concessionariosMap.values()).filter((item) => item.total > 0);

        const movementLookup = new Map(movementMap.map((item) => [item.key, item]));
        (veiculosSeriesResponse.data || []).forEach((row: any) => {
          if (row.created_at) {
            const createdAt = new Date(row.created_at);
            const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
            const target = movementLookup.get(key);
            if (target) target.apreendidos += 1;
          }
          if (row.data_liberacao) {
            const releasedAt = new Date(row.data_liberacao);
            const key = `${releasedAt.getFullYear()}-${String(releasedAt.getMonth() + 1).padStart(2, '0')}`;
            const target = movementLookup.get(key);
            if (target) target.liberados += 1;
          }
        });
      } else if (isGuardaScope) {
        const { data: secData } = await supabase
          .from('fala_secretarias')
          .select('id')
          .eq('sigla', 'GM')
          .maybeSingle();
        const secretariaGmId = secData?.id || null;

        const [
          guardasCountResponse,
          iroOperacoesCountResponse,
          iroCandidaturasCountResponse,
          iroBancoHorasResponse,
          falaDemandasCountResponse,
          guardasGraduacoesResponse,
          candidaturasSeriesResponse
        ] = await Promise.all([
          supabase.from('guardas_municipais').select('*', { count: 'exact', head: true }).eq('ativo', true),
          supabase.from('iro_operacoes').select('*', { count: 'exact', head: true }).eq('ativo', true),
          supabase.from('iro_candidaturas').select('*', { count: 'exact', head: true }).eq('status', 'confirmado'),
          supabase.from('iro_banco_horas').select('horas_excedentes'),
          secretariaGmId 
            ? supabase.from('fala_demandas').select('*', { count: 'exact', head: true }).eq('secretaria_atual_id', secretariaGmId).in('status', ['recebido', 'analise'])
            : Promise.resolve({ count: 0, error: null }),
          supabase.from('guardas_municipais').select('id, guarda_municipal_graduacoes(nome)').eq('ativo', true),
          supabase.from('iro_candidaturas').select('created_at, data_operacao, status')
        ]);

        guardasAtivos = guardasCountResponse.count || 0;
        operacoesAtivasIro = iroOperacoesCountResponse.count || 0;
        candidaturasIro = iroCandidaturasCountResponse.count || 0;
        demandasFalaCidadaoCount = falaDemandasCountResponse.count || 0;

        const horasExcedentesData = iroBancoHorasResponse.data || [];
        totalBancoHoras = horasExcedentesData.reduce((acc: number, curr: any) => acc + Number(curr.horas_excedentes || 0), 0);

        // Agrupamento por graduação
        const gradMap = new Map<string, number>();
        (guardasGraduacoesResponse.data || []).forEach((row: any) => {
          const gradNome = row.guarda_municipal_graduacoes?.nome || 'Não definida';
          gradMap.set(gradNome, (gradMap.get(gradNome) || 0) + 1);
        });
        distribuicaoGraduacoes = Array.from(gradMap.entries()).map(([label, total]) => ({
          label,
          total
        }));

        // Dados da série de escalas mensais
        const movementLookup = new Map(movementMap.map((item) => [item.key, item]));
        (candidaturasSeriesResponse.data || []).forEach((row: any) => {
          if (row.data_operacao) {
            const dataOp = new Date(row.data_operacao);
            const key = `${dataOp.getFullYear()}-${String(dataOp.getMonth() + 1).padStart(2, '0')}`;
            const target = movementLookup.get(key);
            if (target) {
              target.apreendidos += 1; // Representa escalas confirmadas
              if (row.status === 'realizado') {
                target.liberados += 1; // Representa escalas concluídas
              }
            }
          }
        });
      }

      const setorRows = (setoresResponse.data || []) as Array<Pick<Setor, 'id' | 'nome' | 'ativo'>>;
      const perfis = (perfisResponse.data || []) as AdminProfileRow[];
      const activeProfiles = perfis.filter((item) => item.ativo);
      const activeSetores = setorRows.filter((item) => item.ativo).length;
      const activeGestores = activeProfiles.filter((item) => item.papel === 'gestor').length;
      const totalOperators = activeProfiles.filter((item) => item.papel !== 'super_admin').length;

      const noticiasAtivas = noticiasCountResponse.count || 0;
      const eventosAtivos = eventosCountResponse.count || 0;
      const galeriaAtiva = galeriaCountResponse.count || 0;
      const documentosAtivos = documentosCountResponse.count || 0;

      const sectorsNeedingAttention = isSuperAdmin
        ? setorRows
            .map((setor) => {
              const setorProfiles = perfis.filter((item) => item.setor_id === setor.id && item.ativo);
              const hasGestor = setorProfiles.some((item) => item.papel === 'gestor');
              if (!setor.ativo) return { id: setor.id, nome: setor.nome, issue: 'Setor inativo' };
              if (!hasGestor) return { id: setor.id, nome: setor.nome, issue: 'Sem gestor ativo' };
              if (setorProfiles.length === 0) return { id: setor.id, nome: setor.nome, issue: 'Sem equipe administrativa ativa' };
              return null;
            })
            .filter(Boolean)
            .slice(0, 5) as SectorAttention[]
        : [];

      const alerts: string[] = [];
      if (isSuperAdmin && !isGuardaScope && !isDemutranScope && sectorsNeedingAttention.length > 0) {
        alerts.push(`${sectorsNeedingAttention.length} setor(es) exigem atencao imediata.`);
      }

      if (isGuardaScope) {
        if (operacoesAtivasIro > 0) alerts.push(`${operacoesAtivasIro} operação(ões) de IRO ativa(s) no momento.`);
        if (candidaturasIro > 0) alerts.push(`${candidaturasIro} escala(s) de reforço confirmada(s).`);
        if (demandasFalaCidadaoCount > 0) alerts.push(`${demandasFalaCidadaoCount} solicitação(ões) de ouvidoria pendente(s).`);
      } else {
        if (pendingCredenciais > 0) alerts.push(`${pendingCredenciais} solicitacao(oes) de credencial aguardando tratamento.`);
        if (pendingRecursos > 0) alerts.push(`${pendingRecursos} recurso(s) em fila de analise.`);
        if (apreendidos > 0) alerts.push(`${apreendidos} veiculo(s) ainda constam como apreendidos.`);
        if (concessionariosRows.length > 0) {
          const concessionariosAtivos = concessionariosRows.filter((item) => item.ativo).length;
          alerts.push(`${concessionariosAtivos} concessionario(s) ativos em acompanhamento no DEMUTRAN.`);
        }
      }
      if (!isSuperAdmin && activeProfiles.length <= 1) alerts.push('Seu setor opera com equipe administrativa reduzida.');

      const metrics: MetricCard[] = isSuperAdmin
        ? [
            { label: 'Setores ativos', value: String(activeSetores), helper: `${setorRows.length} setores cadastrados`, icon: Building2, tone: 'blue' },
            { label: 'Gestores ativos', value: String(activeGestores), helper: `${totalOperators} operadores administrativos`, icon: ShieldCheck, tone: 'green' },
            { label: 'Documentos publicados', value: String(documentosAtivos), helper: `${noticiasAtivas} noticias e ${eventosAtivos} eventos ativos`, icon: FileText, tone: 'amber' },
            { label: 'Operacao DEMUTRAN', value: String(apreendidos + liberados + pendingCredenciais + pendingRecursos + concessionariosRows.length), helper: 'Apreensoes, liberacoes, credenciais, recursos e concessionarios', icon: CarFront, tone: 'rose' },
          ]
        : [
            { label: 'Equipe ativa', value: String(activeProfiles.length), helper: 'Perfis administrativos em operacao', icon: Users, tone: 'blue' },
            { label: 'Conteudos ativos', value: String(noticiasAtivas + eventosAtivos + galeriaAtiva), helper: `${noticiasAtivas} noticias, ${eventosAtivos} eventos, ${galeriaAtiva} galerias`, icon: Newspaper, tone: 'green' },
            { label: isDemutranScope ? 'Concessionarios ativos' : 'Documentos ativos', value: String(isDemutranScope ? concessionarios.filter(c => c.ativos > 0).reduce((acc, curr) => acc + curr.ativos, 0) : documentosAtivos), helper: isDemutranScope ? `${concessionariosRows.length} cadastros totais no modulo` : 'Materiais publicados no setor', icon: FileText, tone: 'amber' },
            { label: isDemutranScope ? 'Fila operacional' : 'Ritmo do setor', value: String(isDemutranScope ? apreendidos + liberados + pendingCredenciais + pendingRecursos + concessionariosRows.length : documentosAtivos + noticiasAtivas + eventosAtivos), helper: isDemutranScope ? 'Acompanhe atendimento, veiculos e concessionarios' : 'Leitura consolidada da operacao atual', icon: CarFront, tone: 'rose' },
          ];

      const serviceStatus: ServiceStatus[] = isGuardaScope
        ? [
            { label: 'Efetivo Ativo', value: guardasAtivos, tone: 'success' },
            { label: 'Operações IRO', value: operacoesAtivasIro, tone: 'neutral' },
            { label: 'Escalas IRO', value: candidaturasIro, tone: 'neutral' },
            { label: 'Horas no Banco', value: totalBancoHoras, tone: totalBancoHoras > 100 ? 'warning' : 'neutral' },
          ]
        : isDemutranScope
          ? [
              { label: 'Veiculos apreendidos', value: apreendidos, tone: apreendidos > 0 ? 'warning' : 'success' },
              { label: 'Veiculos liberados', value: liberados, tone: 'neutral' },
              { label: 'Credenciais', value: pendingCredenciais, tone: pendingCredenciais > 0 ? 'warning' : 'success' },
              { label: 'Recursos', value: pendingRecursos, tone: pendingRecursos > 0 ? 'warning' : 'success' },
              { label: 'Frota municipal ativa', value: frotaAtiva, tone: 'neutral' },
              { label: 'Concessionarios ativos', value: concessionariosRows.filter(c => c.ativo).length, tone: concessionariosRows.filter(c => c.ativo).length > 0 ? 'neutral' : 'warning' },
            ]
          : [
              { label: 'Noticias ativas', value: noticiasAtivas, tone: 'neutral' },
              { label: 'Eventos ativos', value: eventosAtivos, tone: 'neutral' },
              { label: 'Galeria ativa', value: galeriaAtiva, tone: 'neutral' },
              { label: 'Documentos ativos', value: documentosAtivos, tone: 'neutral' },
            ];

      const criticalCount = sectorsNeedingAttention.length;
      const healthyCount = Math.max(activeSetores - criticalCount, 0);

      const sectorHealth = isSuperAdmin && !urlSetorSlug
        ? [
            { name: 'criticos', value: criticalCount, fill: '#ef4444' },
            { name: 'regulares', value: healthyCount, fill: '#10b981' },
          ]
        : isGuardaScope
          ? distribuicaoGraduacoes.map((item, idx) => {
              const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
              return {
                name: item.label,
                value: item.total,
                fill: colors[idx % colors.length]
              };
            })
          : [
              { name: 'regulares', value: activeProfiles.length || 1, fill: '#10b981' },
            ];

      if (!mounted) return;
      setState({
        loading: false,
        metrics,
        serviceStatus,
        alerts,
        sectorsNeedingAttention,
        vehicleMovement: movementMap,
        sectorHealth,
        concessionarios,
        pendingRecursos,
        totalRecursos,
        recursosDeferidos,
        pendingCredenciais,
        frotaAtiva,
        guardasAtivos,
        operacoesAtivasIro,
        candidaturasIro,
        totalBancoHoras,
        demandasFalaCidadaoCount,
        distribuicaoGraduacoes,
      });
    };

    void loadDashboard();
    return () => {
      mounted = false;
    };
  }, [isDemutranScope, isGuardaScope, isSuperAdmin, setorId, currentSetorSlug]);




  return (
    <AdminLayout>
      <div className="space-y-8 p-1">
        <section className="space-y-6">
          <div className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-[linear-gradient(118deg,_#17233c_0%,_#6c778c_48%,_#dfe7f5_100%)] shadow-[0_28px_60px_-34px_rgba(15,23,42,0.55)]">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-5 px-6 py-8 text-white lg:px-8 lg:py-9">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-white/15 bg-brand-700/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white" variant="outline">
                    {isSuperAdmin ? 'Centro operacional' : 'Setor em foco'}
                  </Badge>
                  {profile?.setor_nome && !isSuperAdmin && (
                    <Badge className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90" variant="outline">
                      {profile.setor_nome}
                    </Badge>
                  )}
                  <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200" variant="outline">
                    Dados integrados
                  </Badge>
                </div>

                <div>
                  <h1 className="font-heading text-[2rem] font-extrabold tracking-[-0.06em] text-white lg:text-[3.15rem]">
                    {panelTitle}
                  </h1>
                  <p className="mt-3 max-w-3xl text-[14px] leading-7 text-slate-200/82">
                    {panelDescription}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {state.alerts.length > 0 ? state.alerts.slice(0, 2).map((alert) => (
                    <div key={alert} className="rounded-full border border-white/12 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 backdrop-blur">
                      {alert}
                    </div>
                  )) : (
                    <div className="rounded-full border border-white/12 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 backdrop-blur">
                      Nenhum alerta critico identificado neste momento.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {state.serviceStatus.slice(0, 4).map((item) => (
              <div key={item.label} className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.32)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="max-w-[12rem] text-[11px] font-bold uppercase leading-4 tracking-[0.05em] text-[#8ea0bd]">{item.label}</p>
                  <span className={`inline-flex rounded-2xl border px-2 py-1 text-[10px] font-bold ${serviceToneBadge[item.tone]}`}>
                    {item.tone === 'warning' ? 'Analise' : item.tone === 'success' ? 'Regular' : 'Ativo'}
                  </span>
                </div>
                <div className="mt-6 flex items-end justify-between gap-3">
                  <p className="text-[3rem] font-extrabold leading-none tracking-[-0.06em] text-slate-900">{item.value}</p>
                  <span className={`h-2.5 w-2.5 rounded-full ${serviceToneDot[item.tone]}`} />
                </div>
                <p className="mt-3 text-[12px] leading-5 text-[#93a4be]">
                  {isGuardaScope
                    ? item.label.toLowerCase().includes('efetivo')
                      ? 'Guardas municipais ativos e cadastrados'
                      : item.label.toLowerCase().includes('operações')
                        ? 'Operações ativas de reforço (IRO)'
                        : item.label.toLowerCase().includes('escalas')
                          ? 'Candidaturas confirmadas para reforço'
                          : 'Total acumulado de horas excedentes'
                    : item.label.toLowerCase().includes('apreendidos')
                      ? 'Veiculos retidos no deposito municipal'
                      : item.label.toLowerCase().includes('liberados')
                        ? 'Liberados apos regularizacao fiscal'
                        : item.label.toLowerCase().includes('credenciais')
                          ? 'Vagas especiais idoso/deficiente'
                          : 'Contestacoes de autuacoes'}
                </p>
              </div>
            ))}
          </div>
        </section>

        {papel === 'gestor' && (
          <Link
            to="/admin/usuarios"
            className="block rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.32)] transition-all hover:shadow-[0_20px_44px_-30px_rgba(37,99,235,0.35)] hover:border-brand-200/60"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-brand-50 p-3 text-brand-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Gerenciar equipe do setor</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {state.metrics.find((m) => m.label === 'Equipe ativa')?.value || '0'} perfis ativos — adicione ou gerencie usuarios do seu setor
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-brand-50 p-2.5 text-brand-600">
                <UserPlus className="h-5 w-5" />
              </div>
            </div>
          </Link>
        )}

        <section className="hidden grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {state.metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label} className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_28px_-20px_rgba(15,23,42,0.25)]">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{metric.label}</p>
                      <p className="mt-3 text-[2.4rem] font-extrabold tracking-[-0.05em] text-slate-900">{metric.value}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{metric.helper}</p>
                    </div>
                    <div className={`rounded-[20px] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] ${metricToneClasses[metric.tone]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="w-full">
          <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="font-heading text-[1.35rem] font-bold uppercase tracking-[-0.02em] text-slate-800">
                  {isGuardaScope ? 'Escalas Mensais - IRO' : 'Fluxo mensal - Demutran'}
                </CardTitle>
                <CardDescription className="mt-1 text-sm leading-6 text-[#89a0bf]">
                  {isGuardaScope 
                    ? 'Evolução de candidaturas confirmadas e escalas concluídas da Guarda nos últimos meses'
                    : 'Veiculos recolhidos vs regularizados nos ultimos meses'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-[#6d819f]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
                  {isGuardaScope ? 'Confirmadas' : 'Apreendidos'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                  {isGuardaScope ? 'Realizadas' : 'Liberados'}
                </div>
              </div>
            </CardHeader>
            <CardContent className="bg-[linear-gradient(180deg,_rgba(248,250,252,0.55)_0%,_rgba(255,255,255,1)_100%)]">
              <ChartContainer
                className="h-[280px] w-full"
                config={resolvedChartConfig}
              >
                <AreaChart data={state.vehicleMovement}>
                  <defs>
                    <linearGradient id="fillApreendidos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isGuardaScope ? '#2563eb' : 'var(--color-apreendidos)'} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={isGuardaScope ? '#2563eb' : 'var(--color-apreendidos)'} stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="fillLiberados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-liberados)" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="var(--color-liberados)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="apreendidos" stroke={isGuardaScope ? '#2563eb' : 'var(--color-apreendidos)'} fill="url(#fillApreendidos)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="liberados" stroke="var(--color-liberados)" fill="url(#fillLiberados)" strokeWidth={2.5} />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        {isDemutranScope && state.concessionarios.length > 0 && (
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
              <CardHeader>
                <CardTitle className="font-heading text-[1.35rem] font-bold uppercase tracking-[-0.02em] text-slate-800">Concessionarios por categoria</CardTitle>
                <CardDescription className="mt-1 text-sm leading-6 text-[#89a0bf]">
                  Total de cadastros e base ativa do novo modulo de permissionarios.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {state.concessionarios.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-slate-900">{item.label}</p>
                      <Badge variant="outline" className="rounded-full bg-white text-slate-700">{item.total} total</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Ativos</span>
                      <span className="font-semibold text-emerald-600">{item.ativos}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
              <CardHeader>
                <CardTitle className="font-heading text-[1.35rem] font-bold uppercase tracking-[-0.02em] text-slate-800">Recursos e credenciais</CardTitle>
                <CardDescription className="mt-1 text-sm leading-6 text-[#89a0bf]">
                  Acompanhe o volume de recursos e credenciais em aberto no DEMUTRAN.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Recursos pendentes</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-amber-600">{state.pendingRecursos}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{state.totalRecursos} recursos registrados no total</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Credenciais pendentes</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-amber-600">{state.pendingCredenciais}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Solicitacoes aguardando analise</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Recursos deferidos</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-emerald-600">{state.recursosDeferidos}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Recursos ja analisados e concluidos</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Frota ativa</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-blue-600">{state.frotaAtiva}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Veiculos municipais em operacao</p>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {isGuardaScope && (
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
              <CardHeader>
                <CardTitle className="font-heading text-[1.35rem] font-bold uppercase tracking-[-0.02em] text-slate-800">Efetivo por Graduação</CardTitle>
                <CardDescription className="mt-1 text-sm leading-6 text-[#89a0bf]">
                  Distribuição dos guardas ativos de acordo com suas graduações de carreira.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {state.distribuicaoGraduacoes.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-slate-900">{item.label}</p>
                      <Badge variant="outline" className="rounded-full bg-white text-slate-700">{item.total} ativos</Badge>
                    </div>
                  </div>
                ))}
                {state.distribuicaoGraduacoes.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">Nenhum guarda municipal ativo cadastrado.</p>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
              <CardHeader>
                <CardTitle className="font-heading text-[1.35rem] font-bold uppercase tracking-[-0.02em] text-slate-800">IRO e Banco de Horas</CardTitle>
                <CardDescription className="mt-1 text-sm leading-6 text-[#89a0bf]">
                  Métricas consolidadas do módulo de Indenização de Reforço Operacional.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Operações IRO</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-blue-600">{state.operacoesAtivasIro}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Operações ativas de reforço cadastradas</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Escalas Confirmadas</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-emerald-600">{state.candidaturasIro}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Total de candidaturas de reforço confirmadas</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Banco de Horas</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-amber-600">{state.totalBancoHoras}h</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Total de horas extras registradas no banco</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Demandas Ouvidoria</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-rose-600">{state.demandasFalaCidadaoCount}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Solicitações Ouvidoria (Fala Cidadão) pendentes</p>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {(isSuperAdmin || papel === 'gestor') && (
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="font-heading text-[1.35rem] font-bold uppercase tracking-[-0.02em] text-slate-800">
                    {isGuardaScope ? 'Efetivo por Graduação' : 'Distribuicao operacional'}
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm leading-6 text-[#89a0bf]">
                    {isGuardaScope 
                      ? 'Distribuição proporcional do efetivo ativo entre as graduações da Guarda'
                      : isSuperAdmin 
                        ? 'Niveis de preenchimento de gestao por setor' 
                        : 'Leitura consolidada do contexto atual do seu setor'}
                  </CardDescription>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4 bg-[linear-gradient(180deg,_rgba(248,250,252,0.55)_0%,_rgba(255,255,255,1)_100%)]">
                <ChartContainer className="mx-auto h-[240px] max-w-[280px]" config={resolvedChartConfig}>
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie data={state.sectorHealth} dataKey="value" nameKey="name" innerRadius={70} outerRadius={96} paddingAngle={4}>
                      {state.sectorHealth.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  </PieChart>
                </ChartContainer>

                <div className="grid gap-3">
                  <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-5">
                    {isGuardaScope ? (
                      <>
                        <div className="text-center">
                          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8ea0bd]">Total de Guardas</p>
                          <p className="mt-2 text-[2rem] font-extrabold tracking-[-0.05em] text-[#2563eb]">{state.guardasAtivos || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8ea0bd]">Graduações</p>
                          <p className="mt-2 text-[2rem] font-extrabold tracking-[-0.05em] text-[#10b981]">{state.distribuicaoGraduacoes?.length || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8ea0bd]">Média p/ Grad.</p>
                          <p className="mt-2 text-[2rem] font-extrabold tracking-[-0.05em] text-[#8b5cf6]">
                            {state.distribuicaoGraduacoes?.length 
                              ? Math.round((state.guardasAtivos || 0) / state.distribuicaoGraduacoes.length) 
                              : 0}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-center">
                          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8ea0bd]">Setores criticos</p>
                          <p className="mt-2 text-[2rem] font-extrabold tracking-[-0.05em] text-[#ef4444]">{state.sectorsNeedingAttention.length}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8ea0bd]">Gestores ativos</p>
                          <p className="mt-2 text-[2rem] font-extrabold tracking-[-0.05em] text-[#10b981]">
                            {isSuperAdmin ? Math.max(state.sectorHealth.find((item) => item.name === 'regulares')?.value || 0, 0) : 1}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8ea0bd]">Indice conformidade</p>
                          <p className="mt-2 text-[2rem] font-extrabold tracking-[-0.05em] text-[#2563eb]">
                            {isSuperAdmin
                              ? `${Math.round((((state.sectorHealth.find((item) => item.name === 'regulares')?.value || 0) / Math.max((state.sectorHealth.find((item) => item.name === 'regulares')?.value || 0) + state.sectorsNeedingAttention.length, 1)) * 100))}%`
                              : '100%'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

      </div>
    </AdminLayout>
  );
};

export default Dashboard;
