import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Accessibility,
  Activity,
  AlertTriangle,
  BellRing,
  Bike,
  Building2,

  CarFront,
  CheckCircle2,
  FileText,
  GraduationCap,
  HandCoins,
  ImageIcon,
  MessageSquare,
  Newspaper,
  Pause,
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
import { getConcessionarioFinancialStatus } from '@/lib/demutranConcessionarioFinanceiro';
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
  vehicleMovement: Array<{ month: string; apreendidos: number; liberados: number; valor_apreendidos: number; valor_liberados: number }>;
  sectorHealth: Array<{ name: string; value: number; fill: string }>;
  concessionarios: ConcessionarioBreakdown[];
  pendingRecursos: number;
  totalRecursos: number;
  recursosDeferidos: number;
  pendingCredenciais: number;
  frotaAtiva: number;
  concessionariosEmDebito: number;
  guardasAtivos: number;
  operacoesAtivasIro: number;
  candidaturasIro: number;
  totalBancoHoras: number;
  demandasFalaCidadaoCount: number;
  distribuicaoGraduacoes: Array<{ label: string; total: number }>;
  ordensServicoTotal: number;
  ordensServicoPublicadas: number;
  ordensServicoRascunhos: number;
  ordensServicoCanceladas: number;
  ordensServicoSubstituidas: number;
  frotaDisponivel: number;
  frotaEmServico: number;
  frotaEmManutencao: number;
  equipesAtivas: number;
  noticiasSetor: number;
  eventosSetor: number;
  noticiasAtivas: number;
  eventosAtivos: number;
  galeriaAtiva: number;
  documentosAtivos: number;
  frotaMunicipalAtiva: number;
  veiculosApreendidosTotal: number;
  veiculosCarrosApreendidos: number;
  veiculosMotosApreendidas: number;
  veiculosLiberadosGlobal: number;
  concessionariosEmDebitoValor: number;
  concessionariosPagos: number;
  concessionariosValorPago: number;
  iroOperacoesInativas: number;
  jgcAlunosMatriculados: number;
  credenciaisIdosos: number;
  credenciaisPcd: number;
  adminServidoresAtivos: number;
  adminServidoresAfastados: number;
  adminAfastamentosVigentes: number;
  adminFolhaAberta: boolean;
  adminFolhaValor: number;
  adminInsumosAbaixoMinimo: number;
  adminRanchoGastoMes: number;
  adminRanchoRefeicoesHoje: number;
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
  concessionariosEmDebito: 0,
  frotaAtiva: 0,
  guardasAtivos: 0,
  operacoesAtivasIro: 0,
  candidaturasIro: 0,
  totalBancoHoras: 0,
  demandasFalaCidadaoCount: 0,
  distribuicaoGraduacoes: [],
  ordensServicoTotal: 0,
  ordensServicoPublicadas: 0,
  ordensServicoRascunhos: 0,
  ordensServicoCanceladas: 0,
  ordensServicoSubstituidas: 0,
  frotaDisponivel: 0,
  frotaEmServico: 0,
  frotaEmManutencao: 0,
  equipesAtivas: 0,
  noticiasSetor: 0,
  eventosSetor: 0,
  noticiasAtivas: 0,
  eventosAtivos: 0,
  galeriaAtiva: 0,
  documentosAtivos: 0,
  frotaMunicipalAtiva: 0,
  veiculosApreendidosTotal: 0,
  veiculosCarrosApreendidos: 0,
  veiculosMotosApreendidas: 0,
  veiculosLiberadosGlobal: 0,
  concessionariosEmDebitoValor: 0,
  concessionariosPagos: 0,
  concessionariosValorPago: 0,
  iroOperacoesInativas: 0,
  jgcAlunosMatriculados: 0,
  credenciaisIdosos: 0,
  credenciaisPcd: 0,
  adminServidoresAtivos: 0,
  adminServidoresAfastados: 0,
  adminAfastamentosVigentes: 0,
  adminFolhaAberta: false,
  adminFolhaValor: 0,
  adminInsumosAbaixoMinimo: 0,
  adminRanchoGastoMes: 0,
  adminRanchoRefeicoesHoje: 0,
};

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const calcValor = (taxaDiaria: number, dataInicio: string, dataFim: string | null): number => {
  const inicio = new Date(dataInicio);
  const fim = dataFim ? new Date(dataFim) : new Date();
  const dias = Math.floor((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, dias) * taxaDiaria;
};

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
      valor_apreendidos: 0,
      valor_liberados: 0,
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
  valor_apreendidos: {
    label: 'Valor apreendidos',
    color: '#f97316',
  },
  valor_liberados: {
    label: 'Valor liberados',
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
  const [liberadoFilter, setLiberadoFilter] = useState<'mes' | 'ano'>('ano');

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYearStr = String(now.getFullYear());

  const currentSetorSlug = urlSetorSlug || profile?.setor_slug;
  const isDemutranScope = currentSetorSlug === 'demutran';
  const isGuardaScope = currentSetorSlug === 'guarda-municipal';
  const isAdministracaoScope = currentSetorSlug === 'administracao';

  const panelTitle = useMemo(() => {
    if (isSuperAdmin && !urlSetorSlug) return 'Centro de Comando SMST';
    if (isGuardaScope) return 'Painel de Gestão · Guarda Municipal';
    if (isDemutranScope) return 'Painel de Gestão · DEMUTRAN';
    if (papel === 'gestor') return `Painel de gestao · ${profile?.setor_nome || 'Setor'}`;
    return `Painel operacional · ${profile?.setor_nome || 'Setor'}`;
  }, [isSuperAdmin, urlSetorSlug, isGuardaScope, isDemutranScope, papel, profile?.setor_nome]);

  const panelDescription = useMemo(() => {
    if (isGuardaScope) {
      return 'Gestão administrativa da Guarda Municipal.';
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

  const ordensServicoPorStatus = useMemo(() => {
    const items = [
      { name: 'Publicadas', value: state.ordensServicoPublicadas, fill: '#10b981' },
      { name: 'Rascunhos', value: state.ordensServicoRascunhos, fill: '#2563eb' },
      { name: 'Canceladas', value: state.ordensServicoCanceladas, fill: '#ef4444' },
      { name: 'Substituídas', value: state.ordensServicoSubstituidas, fill: '#f59e0b' },
    ];
    return items.filter((item) => item.value > 0);
  }, [state.ordensServicoPublicadas, state.ordensServicoRascunhos, state.ordensServicoCanceladas, state.ordensServicoSubstituidas]);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setState(initialState);

      const scopedFilter = (query: any) => {
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
      let concessionariosEmDebito = 0;
      let concessionarios: ConcessionarioBreakdown[] = [];

      let guardasAtivos = 0;
      let operacoesAtivasIro = 0;
      let candidaturasIro = 0;
      let totalBancoHoras = 0;
      let demandasFalaCidadaoCount = 0;
      let distribuicaoGraduacoes: Array<{ label: string; total: number }> = [];
      let ordensServicoTotal = 0;
      let ordensServicoPublicadas = 0;
      let ordensServicoRascunhos = 0;
      let ordensServicoCanceladas = 0;
      let ordensServicoSubstituidas = 0;
      let movementMap = buildLastSixMonths();
      let equipesAtivas = 0;
      let frotaDisponivel = 0;
      let frotaEmServico = 0;
      let frotaEmManutencao = 0;
      let frotaMunicipalAtiva = 0;
      let noticiasSetor = 0;
      let eventosSetor = 0;
      let veiculosApreendidosSistema = 0;
      let veiculosLiberadosSistema = 0;
      let frotaManutencaoSistema = 0;
      let iroOperacoesSistema = 0;
      let falaDemandasSistema = 0;
      let veiculosCarrosApreendidos = 0;
      let veiculosMotosApreendidas = 0;
      let concessionariosEmDebitoValor = 0;
      let concessionariosPagos = 0;
      let concessionariosValorPago = 0;
      let iroOperacoesInativas = 0;
      let jgcAlunosMatriculados = 0;
      let credenciaisIdosos = 0;
      let credenciaisPcd = 0;

      // Administracao Central
      let adminServidoresAtivos = 0;
      let adminServidoresAfastados = 0;
      let adminAfastamentosVigentes = 0;
      let adminFolhaAberta = false;
      let adminFolhaValor = 0;
      let adminInsumosAbaixoMinimo = 0;
      let adminRanchoGastoMes = 0;
      let adminRanchoRefeicoesHoje = 0;

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
          scopedFilter((supabase as any).from('demutran_concessionarios').select('categoria, ativo, exercicio, ultimo_alvara')),
          scopedFilter(supabase.from('veiculos_recolhidos').select('created_at, data_liberacao, taxa_diaria, data_recolhimento, status')),
        ]);

        pendingCredenciais = credenciaisCountResponse.count || 0;
        pendingRecursos = recursosCountResponse.count || 0;
        totalRecursos = recursosTotalResponse.count || 0;
        recursosDeferidos = Math.max(totalRecursos - pendingRecursos, 0);
        apreendidos = veiculosAbertosResponse.count || 0;
        liberados = veiculosLiberadosResponse.count || 0;
        frotaAtiva = frotaResponse.count || 0;
        concessionariosRows = ((concessionariosResponse.data || []) as any[]).filter(Boolean);
        concessionariosEmDebito = concessionariosRows.filter((c: any) => getConcessionarioFinancialStatus(c) === 'em_debito').length;
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

        const msPerDay = 1000 * 60 * 60 * 24;
        const movementLookup = new Map(movementMap.map((item) => [item.key, item]));
        (veiculosSeriesResponse.data || []).forEach((row: any) => {
          if (row.created_at) {
            const createdAt = new Date(row.created_at);
            const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
            const target = movementLookup.get(key);
            if (target) {
              target.apreendidos += 1;
              if (row.status !== 'liberado') {
                const dias = Math.floor((Date.now() - new Date(row.data_recolhimento || row.created_at).getTime()) / msPerDay);
                target.valor_apreendidos += Math.max(0, dias) * (row.taxa_diaria || 0);
              }
            }
          }
          if (row.data_liberacao) {
            const releasedAt = new Date(row.data_liberacao);
            const key = `${releasedAt.getFullYear()}-${String(releasedAt.getMonth() + 1).padStart(2, '0')}`;
            const target = movementLookup.get(key);
            if (target) {
              target.liberados += 1;
              const dias = Math.floor((releasedAt.getTime() - new Date(row.data_recolhimento || row.created_at).getTime()) / msPerDay);
              target.valor_liberados += Math.max(0, dias) * (row.taxa_diaria || 0);
            }
          }
        });
      } else if (isGuardaScope) {
        const { data: secData } = await supabase
          .from('fala_secretarias')
          .select('id')
          .eq('sigla', 'GM')
          .maybeSingle();
        const secretariaGmId = secData?.id || null;

        const isTecnico = papel === 'tecnico';
        const usuarioFilter = isTecnico ? (q: any) => q.eq('usuario_id', profile?.user_id) : (q: any) => q;

        const [
          guardasCountResponse,
          iroOperacoesCountResponse,
          iroCandidaturasCountResponse,
          iroBancoHorasResponse,
          falaDemandasCountResponse,
          guardasGraduacoesResponse,
          candidaturasSeriesResponse,
          frotaVeiculosResponse,
          frotaStatusResponse,
          equipesResponse,
          noticiasGuardaResponse,
          eventosGuardaResponse,
          ordensServicoResponse,
        ] = await Promise.all([
          supabase.from('guardas_municipais').select('*', { count: 'exact', head: true }).eq('ativo', true),
          supabase.from('iro_operacoes').select('*', { count: 'exact', head: true }).eq('ativo', true),
          usuarioFilter(supabase.from('iro_candidaturas').select('*', { count: 'exact', head: true }).eq('status', 'confirmado')),
          usuarioFilter(supabase.from('iro_banco_horas').select('horas_excedentes')),
          secretariaGmId 
            ? supabase.from('fala_demandas').select('*', { count: 'exact', head: true }).eq('secretaria_atual_id', secretariaGmId).in('status', ['recebido', 'analise'])
            : Promise.resolve({ count: 0, error: null }),
          supabase.from('guardas_municipais').select('id, guarda_municipal_graduacoes(nome)').eq('ativo', true),
          usuarioFilter(supabase.from('iro_candidaturas').select('created_at, data_operacao, status')),
          supabase.from('guarda_frota_veiculos').select('*', { count: 'exact', head: true }).eq('ativo', true),
          supabase.from('guarda_frota_veiculos').select('status').eq('ativo', true),
          supabase.from('guarda_equipes').select('*', { count: 'exact', head: true }).eq('ativo', true),
          targetSetorId 
            ? supabase.from('noticias').select('*', { count: 'exact', head: true }).eq('setor_id', targetSetorId).eq('ativo', true)
            : Promise.resolve({ count: 0, error: null }),
          targetSetorId
            ? supabase.from('eventos').select('*', { count: 'exact', head: true }).eq('setor_id', targetSetorId).eq('ativo', true)
            : Promise.resolve({ count: 0, error: null }),
          supabase.from('guarda_ordens_servico').select('status'),
        ]);

        guardasAtivos = guardasCountResponse.count || 0;
        operacoesAtivasIro = iroOperacoesCountResponse.count || 0;
        candidaturasIro = iroCandidaturasCountResponse.count || 0;
        demandasFalaCidadaoCount = falaDemandasCountResponse.count || 0;
        frotaAtiva = frotaVeiculosResponse.count || 0;
        equipesAtivas = equipesResponse.count || 0;
        noticiasSetor = noticiasGuardaResponse.count || 0;
        eventosSetor = eventosGuardaResponse.count || 0;

        const frotaStatusRows = (frotaStatusResponse.data || []) as Array<{ status: string }>;
        frotaDisponivel = frotaStatusRows.filter(r => r.status === 'DISPONIVEL').length;
        frotaEmServico = frotaStatusRows.filter(r => r.status === 'EM_SERVICO').length;
        frotaEmManutencao = frotaStatusRows.filter(r => r.status === 'EM_MANUTENCAO').length;

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

        // Resumo de Ordens de Serviço por status
        const osStatusRows = (ordensServicoResponse.data || []) as Array<{ status: string }>;
        ordensServicoTotal = osStatusRows.length;
        ordensServicoPublicadas = osStatusRows.filter((row) => row.status === 'PUBLICADA').length;
        ordensServicoRascunhos = osStatusRows.filter((row) => row.status === 'RASCUNHO').length;
        ordensServicoCanceladas = osStatusRows.filter((row) => row.status === 'CANCELADA').length;
        ordensServicoSubstituidas = osStatusRows.filter((row) => row.status === 'SUBSTITUIDA').length;

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

      // Administracao Central: indicadores dos 4 modulos administrativos
      if (isAdministracaoScope) {
        const agora = new Date();
        const mesKey = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
        const hojeKey = agora.toISOString().slice(0, 10);

        const [
          servidoresResponse,
          afastamentosResponse,
          folhasResponse,
          lancamentosResponse,
          insumosResponse,
          comprasResponse,
          refeicoesResponse,
        ] = await Promise.all([
          supabase.from('rh_servidores').select('situacao'),
          supabase.from('rh_afastamentos').select('data_fim').gte('data_fim', hojeKey),
          supabase.from('folha_folhas').select('competencia, status, valor_total').order('competencia', { ascending: false }),
          supabase.from('folha_lancamentos').select('tipo, valor'),
          supabase.from('almox_insumos').select('estoque_atual, estoque_minimo').eq('ativo', true),
          supabase.from('rancho_compras').select('data_compra, valor').gte('data_compra', `${mesKey}-01`),
          supabase.from('rancho_refeicoes').select('data_refeicao').eq('data_refeicao', hojeKey),
        ]);

        const servidoresRows = (servidoresResponse.data || []) as Array<{ situacao: string }>;
        adminServidoresAtivos = servidoresRows.filter((r) => r.situacao === 'ativo').length;
        adminServidoresAfastados = servidoresRows.filter((r) => r.situacao === 'afastado').length;
        adminAfastamentosVigentes = (afastamentosResponse.data || []).length;

        const folhasRows = (folhasResponse.data || []) as Array<{ status: string; valor_total: number }>;
        adminFolhaAberta = folhasRows.some((f) => f.status === 'rascunho');
        adminFolhaValor = folhasRows.reduce((acc, f) => acc + Number(f.valor_total || 0), 0);

        const insumosRows = (insumosResponse.data || []) as Array<{ estoque_atual: number; estoque_minimo: number }>;
        adminInsumosAbaixoMinimo = insumosRows.filter((i) => Number(i.estoque_atual) < Number(i.estoque_minimo)).length;

        const comprasRows = (comprasResponse.data || []) as Array<{ valor: number }>;
        adminRanchoGastoMes = comprasRows.reduce((acc, c) => acc + Number(c.valor || 0), 0);
        adminRanchoRefeicoesHoje = (refeicoesResponse.data || []).length;
      }

      // Super admin: dados gerais do sistema (visão sem setor específico)
      if (isSuperAdmin && !isGuardaScope && !isDemutranScope) {
        let iroBancoHorasSistema = 0;
        let credenciaisPendentesSistema = 0;
        let recursosPendentesSistema = 0;
        let concessionariosSistema: any[] = [];

        const [
          guardasSistemaCount,
          frotaSistemaCount,
          frotaStatusSistema,
          equipesSistemaCount,
          iroOperacoesCount,
          iroBancoHorasData,
          falaDemandasCount,
          veiculosRecolhidosApreendidos,
          veiculosRecolhidosLiberados,
          credenciaisCount,
          recursosCount,
          concessionariosData,
          frotaMunicipalCount,
          veiculosSeriesSistema,
          veiculosTipoResponse,
          taxasResponse,
          ordensServicoGlobalResponse,
          iroStatusResponse,
          jgcAlunosResponse,
          credenciaisTipoResponse,
        ] = await Promise.all([
          supabase.from('guardas_municipais').select('*', { count: 'exact', head: true }).eq('ativo', true),
          supabase.from('guarda_frota_veiculos').select('*', { count: 'exact', head: true }).eq('ativo', true),
          supabase.from('guarda_frota_veiculos').select('status').eq('ativo', true),
          supabase.from('guarda_equipes').select('*', { count: 'exact', head: true }).eq('ativo', true),
          supabase.from('iro_operacoes').select('*', { count: 'exact', head: true }).eq('ativo', true),
          supabase.from('iro_banco_horas').select('horas_excedentes'),
          supabase.from('fala_demandas').select('*', { count: 'exact', head: true }).in('status', ['recebido', 'analise']),
          supabase.from('veiculos_recolhidos').select('*', { count: 'exact', head: true }).neq('status', 'liberado'),
          supabase.from('veiculos_recolhidos').select('*', { count: 'exact', head: true }).eq('status', 'liberado'),
          supabase.from('demutran_credenciais_solicitacoes').select('*', { count: 'exact', head: true }).in('status', ['pendente', 'em_analise']),
          supabase.from('demutran_recursos').select('*', { count: 'exact', head: true }).in('status', ['pendente', 'em_analise']),
          supabase.from('demutran_concessionarios').select('categoria, ativo, exercicio, ultimo_alvara'),
          supabase.from('demutran_veiculos_municipais').select('*', { count: 'exact', head: true }).eq('ativo', true),
          supabase.from('veiculos_recolhidos').select('created_at, data_liberacao, taxa_diaria, data_recolhimento, status'),
          supabase.from('veiculos_recolhidos').select('local_custodia, status'),
          supabase.from('demutran_taxas').select('tipo, valor'),
          supabase.from('guarda_ordens_servico').select('status'),
          supabase.from('iro_operacoes').select('ativo'),
          supabase.from('jgc_alunos').select('*', { count: 'exact', head: true }).eq('situacao', 'ativo').is('deleted_at', null),
          supabase.from('demutran_credenciais_solicitacoes').select('tipo'),
        ]);
        guardasAtivos = guardasSistemaCount.count || 0;
        frotaAtiva = frotaSistemaCount.count || 0;
        equipesAtivas = equipesSistemaCount.count || 0;
        iroOperacoesSistema = iroOperacoesCount.count || 0;
        iroBancoHorasSistema = (iroBancoHorasData.data || []).reduce((acc: number, curr: any) => acc + Number(curr.horas_excedentes || 0), 0);
        falaDemandasSistema = falaDemandasCount.count || 0;
        veiculosApreendidosSistema = veiculosRecolhidosApreendidos.count || 0;
        veiculosLiberadosSistema = veiculosRecolhidosLiberados.count || 0;
        credenciaisPendentesSistema = credenciaisCount.count || 0;
        recursosPendentesSistema = recursosCount.count || 0;
        concessionariosSistema = (concessionariosData.data || []) as any[];
        frotaMunicipalAtiva = frotaMunicipalCount.count || 0;

        const frotaStatusRows = (frotaStatusSistema.data || []) as Array<{ status: string }>;
        frotaDisponivel = frotaStatusRows.filter(r => r.status === 'DISPONIVEL').length;
        frotaEmServico = frotaStatusRows.filter(r => r.status === 'EM_SERVICO').length;
        frotaManutencaoSistema = frotaStatusRows.filter(r => r.status === 'EM_MANUTENCAO').length;

        pendingCredenciais = credenciaisPendentesSistema;
        pendingRecursos = recursosPendentesSistema;
        demandasFalaCidadaoCount = falaDemandasSistema;
        operacoesAtivasIro = iroOperacoesSistema;
        totalBancoHoras = iroBancoHorasSistema;

        // Veículos por tipo (carros vs motos) e liberados — visão global
        const veiculosTipoRows = (veiculosTipoResponse.data || []) as Array<{ local_custodia: string; status: string }>;
        veiculosCarrosApreendidos = veiculosTipoRows.filter(
          (r) => (r.local_custodia === 'automoveis' || r.local_custodia === 'veiculos_forum') && r.status !== 'liberado',
        ).length;
        veiculosMotosApreendidas = veiculosTipoRows.filter(
          (r) => (r.local_custodia === 'motos' || r.local_custodia === 'motos_delegacia') && r.status !== 'liberado',
        ).length;

        // Concessionários: quantidade em débito/pago + valor estimado por categoria
        const taxasPorTipo = new Map<string, number>();
        (taxasResponse.data || []).forEach((t: any) => {
          taxasPorTipo.set(t.tipo, (taxasPorTipo.get(t.tipo) || 0) + (Number(t.valor) || 0));
        });
        const taxaTipoPorCategoria: Record<string, string> = {
          mototaxi: 'mototaxi',
          taxi: 'carro_horario',
          carro_horario: 'carro_horario',
          fretista: 'carro_horario',
        };
        const valorEstimadoConcessionario = (categoria: string) =>
          taxasPorTipo.get(taxaTipoPorCategoria[categoria] || 'carro_horario') || 0;
        const concessionariosDebitoSistema = concessionariosSistema.filter(
          (c: any) => getConcessionarioFinancialStatus(c) === 'em_debito',
        );
        const concessionariosPagosSistema = concessionariosSistema.filter(
          (c: any) => getConcessionarioFinancialStatus(c) === 'pago',
        );
        concessionariosEmDebito = concessionariosDebitoSistema.length;
        concessionariosEmDebitoValor = concessionariosDebitoSistema.reduce(
          (acc, c: any) => acc + valorEstimadoConcessionario(c.categoria),
          0,
        );
        concessionariosPagos = concessionariosPagosSistema.length;
        concessionariosValorPago = concessionariosPagosSistema.reduce(
          (acc, c: any) => acc + valorEstimadoConcessionario(c.categoria),
          0,
        );

        // Ordens de Serviço globais
        const osGlobalRows = (ordensServicoGlobalResponse.data || []) as Array<{ status: string }>;
        ordensServicoTotal = osGlobalRows.length;
        ordensServicoPublicadas = osGlobalRows.filter((row) => row.status === 'PUBLICADA').length;
        ordensServicoRascunhos = osGlobalRows.filter((row) => row.status === 'RASCUNHO').length;
        ordensServicoCanceladas = osGlobalRows.filter((row) => row.status === 'CANCELADA').length;
        ordensServicoSubstituidas = osGlobalRows.filter((row) => row.status === 'SUBSTITUIDA').length;

        // IRO ativas vs inativas
        const iroStatusRows = (iroStatusResponse.data || []) as Array<{ ativo: boolean }>;
        iroOperacoesInativas = iroStatusRows.filter((r) => !r.ativo).length;

        // JGC: alunos matriculados ativos
        jgcAlunosMatriculados = jgcAlunosResponse.count || 0;

        // Credenciais por tipo (idoso vs PCD)
        (credenciaisTipoResponse.data || []).forEach((row: any) => {
          if (row.tipo === 'idoso') credenciaisIdosos += 1;
          else if (row.tipo === 'pcd') credenciaisPcd += 1;
        });

        // Movimentação mensal com valores
        const msPerDay = 1000 * 60 * 60 * 24;
        const movementLookup = new Map(movementMap.map((item) => [item.key, item]));
        (veiculosSeriesSistema.data || []).forEach((row: any) => {
          if (row.created_at) {
            const createdAt = new Date(row.created_at);
            const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
            const target = movementLookup.get(key);
            if (target) {
              target.apreendidos += 1;
              if (row.status !== 'liberado') {
                const dias = Math.floor((Date.now() - new Date(row.data_recolhimento || row.created_at).getTime()) / msPerDay);
                target.valor_apreendidos += Math.max(0, dias) * (row.taxa_diaria || 0);
              }
            }
          }
          if (row.data_liberacao) {
            const releasedAt = new Date(row.data_liberacao);
            const key = `${releasedAt.getFullYear()}-${String(releasedAt.getMonth() + 1).padStart(2, '0')}`;
            const target = movementLookup.get(key);
            if (target) {
              target.liberados += 1;
              const dias = Math.floor((releasedAt.getTime() - new Date(row.data_recolhimento || row.created_at).getTime()) / msPerDay);
              target.valor_liberados += Math.max(0, dias) * (row.taxa_diaria || 0);
            }
          }
        });
        movementMap = Array.from(movementLookup.values());
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
      if (isSuperAdmin && !isGuardaScope && !isDemutranScope) {
        if (sectorsNeedingAttention.length > 0) alerts.push(`${sectorsNeedingAttention.length} setor(es) exigem atencao imediata.`);
        if (veiculosApreendidosSistema > 0) alerts.push(`${veiculosApreendidosSistema} veiculo(s) apreendido(s) no patio.`);
        if (frotaManutencaoSistema > 0) alerts.push(`${frotaManutencaoSistema} veiculo(s) da frota da Guarda em manutencao.`);
        if (iroOperacoesSistema > 0) alerts.push(`${iroOperacoesSistema} operacao(oes) de IRO ativa(s).`);
        if (falaDemandasSistema > 0) alerts.push(`${falaDemandasSistema} demanda(s) de ouvidoria pendente(s).`);
      } else if (isGuardaScope) {
        if (operacoesAtivasIro > 0) alerts.push(`${operacoesAtivasIro} operação(ões) de IRO ativa(s) no momento.`);
        if (candidaturasIro > 0) alerts.push(`${candidaturasIro} escala(s) de reforço confirmada(s).`);
        if (demandasFalaCidadaoCount > 0) alerts.push(`${demandasFalaCidadaoCount} solicitação(ões) de ouvidoria pendente(s).`);
      } else if (isAdministracaoScope) {
        if (adminAfastamentosVigentes > 0) alerts.push(`${adminAfastamentosVigentes} afastamento(s) vigente(s) no quadro de RH.`);
        if (adminFolhaAberta) alerts.push('Existe folha de pagamento em rascunho aguardando fechamento.');
        if (adminInsumosAbaixoMinimo > 0) alerts.push(`${adminInsumosAbaixoMinimo} insumo(s) abaixo do estoque minimo no almoxarifado.`);
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
            { label: 'Guardas ativos', value: String(guardasAtivos), helper: `${equipesAtivas} equipes em operacao`, icon: Users, tone: 'blue' },
            { label: 'Veiculos apreendidos', value: String(veiculosApreendidosSistema), helper: `${veiculosLiberadosSistema} ja liberados no total`, icon: CarFront, tone: 'rose' },
          ]
        : isAdministracaoScope
          ? [
              { label: 'Servidores', value: String(adminServidoresAtivos + adminServidoresAfastados), helper: `${adminServidoresAtivos} ativos · ${adminServidoresAfastados} afastados`, icon: Users, tone: 'blue' },
              { label: 'Folha do periodo', value: currencyFormatter.format(adminFolhaValor).replace(/\s/g, '\u00a0'), helper: adminFolhaAberta ? 'Competencia em rascunho' : 'Todas as competencias fechadas', icon: FileText, tone: 'green' },
              { label: 'Insumos criticos', value: String(adminInsumosAbaixoMinimo), helper: 'Abaixo do estoque minimo', icon: ShieldCheck, tone: 'amber' },
              { label: 'Gasto do rancho', value: currencyFormatter.format(adminRanchoGastoMes).replace(/\s/g, '\u00a0'), helper: `${adminRanchoRefeicoesHoje} refeicao(oes) hoje`, icon: CarFront, tone: 'rose' },
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
            { label: 'Frota da Guarda', value: frotaAtiva, tone: frotaAtiva > 0 ? 'neutral' : 'warning' },
            { label: 'Equipes Ativas', value: equipesAtivas, tone: equipesAtivas > 0 ? 'neutral' : 'warning' },
            { label: 'Operações IRO', value: operacoesAtivasIro, tone: operacoesAtivasIro > 0 ? 'warning' : 'neutral' },
          ]
        : isAdministracaoScope
          ? [
              { label: 'Servidores ativos', value: adminServidoresAtivos, tone: adminServidoresAtivos > 0 ? 'success' : 'warning' },
              { label: 'Afastados', value: adminServidoresAfastados, tone: adminServidoresAfastados > 0 ? 'warning' : 'neutral' },
              { label: 'Afast. vigentes', value: adminAfastamentosVigentes, tone: adminAfastamentosVigentes > 0 ? 'warning' : 'neutral' },
              { label: 'Folha em aberto', value: adminFolhaAberta ? 1 : 0, tone: adminFolhaAberta ? 'warning' : 'success' },
              { label: 'Insumos criticos', value: adminInsumosAbaixoMinimo, tone: adminInsumosAbaixoMinimo > 0 ? 'warning' : 'success' },
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
                { label: 'Veiculos apreendidos', value: veiculosApreendidosSistema, tone: veiculosApreendidosSistema > 0 ? 'warning' : 'success' },
                { label: 'Frota em manutencao', value: frotaManutencaoSistema, tone: frotaManutencaoSistema > 0 ? 'warning' : 'neutral' },
                { label: 'Operacoes IRO ativas', value: iroOperacoesSistema, tone: iroOperacoesSistema > 0 ? 'warning' : 'neutral' },
                { label: 'Demandas Ouvidoria', value: falaDemandasSistema, tone: falaDemandasSistema > 0 ? 'warning' : 'success' },
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
        concessionariosEmDebito,
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
        ordensServicoTotal,
        ordensServicoPublicadas,
        ordensServicoRascunhos,
        ordensServicoCanceladas,
        ordensServicoSubstituidas,
        frotaDisponivel,
        frotaEmServico,
        frotaEmManutencao,
        equipesAtivas,
        noticiasSetor,
        eventosSetor,
        noticiasAtivas,
        eventosAtivos,
        galeriaAtiva,
        documentosAtivos,
        frotaMunicipalAtiva,
        veiculosApreendidosTotal: veiculosApreendidosSistema,
        veiculosCarrosApreendidos,
        veiculosMotosApreendidas,
        veiculosLiberadosGlobal: veiculosLiberadosSistema,
        concessionariosEmDebitoValor,
        concessionariosPagos,
        concessionariosValorPago,
        iroOperacoesInativas,
        jgcAlunosMatriculados,
        credenciaisIdosos,
        credenciaisPcd,
        adminServidoresAtivos,
        adminServidoresAfastados,
        adminAfastamentosVigentes,
        adminFolhaAberta,
        adminFolhaValor,
        adminInsumosAbaixoMinimo,
        adminRanchoGastoMes,
        adminRanchoRefeicoesHoje,
      });
    };

    void loadDashboard();
    return () => {
      mounted = false;
    };
  }, [isDemutranScope, isGuardaScope, isSuperAdmin, setorId, currentSetorSlug]);




  return (
    <AdminLayout>
      <div className="space-y-4 p-1 lg:space-y-8">
        {isGuardaScope && (
          <div className="pl-[var(--safe-area-left)] pr-[var(--safe-area-right)] pt-[var(--safe-area-top)] lg:hidden">
            <div className="px-4 pb-0 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Guarda Municipal</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-500">
                {profile?.name ? `Olá, ${profile.name.split(' ')[0]}!` : ''}
              </p>
            </div>
          </div>
        )}
        {isGuardaScope && (
          <div className="-mx-4 overflow-x-auto px-4 pb-1 lg:hidden">
            <p className="px-4 pb-0 text-xl font-black leading-tight text-slate-900">Home</p>
          </div>
        )}
        {/* Banner Gradiente Escuro com Cards Internos - Versão Web */}
        <section className="hidden rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-4 py-4 text-white sm:rounded-[34px] sm:px-6 sm:py-5 lg:block">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-100/70 sm:text-[11px]">
                {isGuardaScope ? 'Guarda Municipal' : isAdministracaoScope ? 'Administracao Central' : 'SMST'}
              </p>
              <h1 className="mt-2 text-xl font-black leading-tight text-white sm:text-2xl md:mt-3 md:text-[26px] lg:text-[34px]">
                {profile?.name ? `Olá, ${profile.name.split(' ')[0]}!` : 'Centro de comando'}
              </h1>
              <p className="mt-1.5 hidden max-w-xl text-[13px] leading-5 text-white md:block md:mt-2 md:text-[14px] md:leading-6">
                {isAdministracaoScope
                  ? 'Painel administrativo: RH, folha de pagamento, almoxarifado e rancho.'
                  : 'Painel operacional e resumo dos indicadores da Guarda Municipal.'}
              </p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {state.serviceStatus.slice(0, 4).map((item) => (
              <div key={item.label} className="rounded-[22px] bg-white/10 p-3.5 backdrop-blur-sm sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/60 sm:text-[11px]">{item.label}</p>
                  <span className={`inline-flex rounded-2xl border px-2 py-0.5 text-[10px] font-bold ${item.tone === 'warning' ? 'bg-amber-500/20 text-amber-200 border-amber-500/30' : item.tone === 'success' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' : 'bg-blue-500/20 text-blue-200 border-blue-500/30'}`}>
                    {item.tone === 'warning' ? 'Analise' : item.tone === 'success' ? 'Regular' : 'Ativo'}
                  </span>
                </div>
                <div className="my-2 flex items-end justify-between gap-2">
                  <p className="break-words text-[22px] font-black leading-none text-white sm:text-3xl">{item.value}</p>
                  <span className={`h-2.5 w-2.5 rounded-full ${serviceToneDot[item.tone]}`} />
                </div>
                <p className="text-[12px] leading-5 text-white/70">
                  {isGuardaScope
                    ? item.label.toLowerCase().includes('efetivo')
                      ? 'Guardas municipais ativos'
                      : item.label.toLowerCase().includes('frota')
                        ? 'Veículos operacionais'
                        : item.label.toLowerCase().includes('equipes')
                          ? 'Equipes ativas'
                          : item.label.toLowerCase().includes('operações')
                            ? 'Operações ativas (IRO)'
                            : 'Total acumulado'
                    : item.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Versão Mobile (Inalterada) */}
        <section className="lg:hidden space-y-3">
          <div className="flex gap-4 overflow-x-auto native-scrollbar snap-x-mandatory">
            {state.serviceStatus.slice(0, 4).map((item) => (
              <div key={item.label} className="shrink-0 snap-start w-[270px] h-[160px] flex flex-col justify-between rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.32)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="max-w-[12rem] text-[11px] font-bold uppercase leading-4 tracking-[0.05em] text-[#8ea0bd]">{item.label}</p>
                  <span className={`inline-flex rounded-2xl border px-2 py-0.5 text-[10px] font-bold ${serviceToneBadge[item.tone]}`}>
                    {item.tone === 'warning' ? 'Analise' : item.tone === 'success' ? 'Regular' : 'Ativo'}
                  </span>
                </div>
                <div className="my-1 flex items-end justify-between gap-3">
                  <p className="text-[2.5rem] font-extrabold leading-none tracking-[-0.06em] text-slate-900">{item.value}</p>
                  <span className={`h-2.5 w-2.5 rounded-full ${serviceToneDot[item.tone]}`} />
                </div>
                <p className="line-clamp-2 text-[11px] leading-4 text-[#93a4be]">
                  {isGuardaScope
                    ? item.label.toLowerCase().includes('efetivo')
                      ? 'Guardas municipais ativos e cadastrados'
                      : item.label.toLowerCase().includes('frota')
                        ? 'Veículos operacionais da Guarda'
                        : item.label.toLowerCase().includes('equipes')
                          ? 'Equipes de trabalho ativas'
                          : item.label.toLowerCase().includes('operações')
                            ? 'Operações ativas de reforço (IRO)'
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

        <section className="hidden grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {state.metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label} className="overflow-hidden rounded-[34px] border border-slate-200/80 bg-white shadow-[0_10px_28px_-20px_rgba(15,23,42,0.25)]">
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

        {!isAdministracaoScope && (
        <section className="w-full">
          <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="font-heading text-base font-bold tracking-[-0.02em] text-slate-800">
                  {isGuardaScope ? 'Escalas Mensais - IRO' : isAdministracaoScope ? 'Movimentacao administrativa' : 'Fluxo mensal - Demutran'}
                </CardTitle>
                <CardDescription className="mt-1 hidden text-sm leading-6 text-[#89a0bf] lg:block">
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
            <CardContent className="bg-[linear-gradient(180deg,_rgba(248,250,252,0.55)_0%,_rgba(255,255,255,1)_100%)] space-y-6">
              {!isGuardaScope && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Valor estimado liberados</p>
                      <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
                        <button
                          onClick={() => setLiberadoFilter('mes')}
                          className={`rounded-md px-2 py-1 transition ${liberadoFilter === 'mes' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Mês
                        </button>
                        <button
                          onClick={() => setLiberadoFilter('ano')}
                          className={`rounded-md px-2 py-1 transition ${liberadoFilter === 'ano' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Ano
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-lg font-extrabold tracking-[-0.03em] text-emerald-600">
                      {currencyFormatter.format(
                        liberadoFilter === 'mes'
                          ? (state.vehicleMovement.find(m => m.key === currentMonthKey)?.valor_liberados ?? 0)
                          : state.vehicleMovement.filter(m => m.key.startsWith(currentYearStr)).reduce((acc, m) => acc + m.valor_liberados, 0)
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {liberadoFilter === 'mes' ? 'Taxas do mês atual' : 'Taxas acumuladas no ano'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Valor estimado apreendidos</p>
                    <p className="mt-2 text-lg font-extrabold tracking-[-0.03em] text-rose-600">
                      {currencyFormatter.format(state.vehicleMovement.reduce((acc, m) => acc + m.valor_apreendidos, 0))}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Taxas acumuladas de veículos no pátio</p>
                  </div>
                </div>
              )}
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
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value: number, name: string) => {
                          if (name === 'valor_apreendidos' || name === 'valor_liberados') {
                            return currencyFormatter.format(value);
                          }
                          return value;
                        }}
                      />
                    }
                  />
                  <Area type="monotone" dataKey="apreendidos" stroke={isGuardaScope ? '#2563eb' : 'var(--color-apreendidos)'} fill="url(#fillApreendidos)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="liberados" stroke="var(--color-liberados)" fill="url(#fillLiberados)" strokeWidth={2.5} />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>
        )}

        {isAdministracaoScope && (
          <section className="grid gap-6 xl:grid-cols-2">
            <Link
              to="/admin/administracao/recursos-humanos"
              className="block rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.32)] transition-all hover:border-brand-200/60 hover:shadow-[0_20px_44px_-30px_rgba(13,148,136,0.35)]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Recursos Humanos</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {state.adminServidoresAtivos + state.adminServidoresAfastados} servidores · {state.adminAfastamentosVigentes} afastamento(s) vigente(s)
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-teal-50 p-2.5 text-teal-700">
                  <span className="text-2xl font-extrabold">{state.adminServidoresAtivos + state.adminServidoresAfastados}</span>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/administracao/folha-pagamento"
              className="block rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.32)] transition-all hover:border-brand-200/60 hover:shadow-[0_20px_44px_-30px_rgba(124,58,237,0.35)]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-violet-50 p-3 text-violet-700">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Folha de Pagamento</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {state.adminFolhaAberta ? 'Competencia em rascunho' : 'Sem folha em aberto'} · {currencyFormatter.format(state.adminFolhaValor)}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-violet-50 p-2.5 text-violet-700">
                  <span className="text-2xl font-extrabold">{currencyFormatter.format(state.adminFolhaValor)}</span>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/administracao/almoxarifado"
              className="block rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.32)] transition-all hover:border-brand-200/60 hover:shadow-[0_20px_44px_-30px_rgba(180,83,9,0.35)]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Almoxarifado</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {state.adminInsumosAbaixoMinimo > 0 ? `${state.adminInsumosAbaixoMinimo} insumo(s) abaixo do minimo` : 'Estoque dentro do esperado'}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                  <span className="text-2xl font-extrabold">{state.adminInsumosAbaixoMinimo}</span>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/administracao/gestao-rancho"
              className="block rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.32)] transition-all hover:border-brand-200/60 hover:shadow-[0_20px_44px_-30px_rgba(225,29,72,0.35)]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-rose-50 p-3 text-rose-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Gestao de Rancho</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {state.adminRanchoRefeicoesHoje} refeicao(oes) hoje · {currencyFormatter.format(state.adminRanchoGastoMes)} no mes
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-rose-50 p-2.5 text-rose-700">
                  <span className="text-2xl font-extrabold">{state.adminRanchoRefeicoesHoje}</span>
                </div>
              </div>
            </Link>
          </section>
        )}

        {isSuperAdmin && !urlSetorSlug && (
          <>
            {/* Veículos no pátio: carros vs motos vs liberados */}
            <section className="grid gap-6 xl:grid-cols-2">
              <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
                <CardHeader>
                  <CardTitle className="font-heading text-base font-bold tracking-[-0.02em] text-slate-800">Pátio do DEMUTRAN</CardTitle>
                  <CardDescription className="mt-1 hidden text-sm leading-6 text-[#89a0bf] lg:block">
                    Visão global de veículos recolhidos por tipo e liberados.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <CarFront className="h-4 w-4 text-blue-600" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Carros apreendidos</p>
                    </div>
                    <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-blue-600">{state.veiculosCarrosApreendidos}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Automóveis retidos no depósito</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Bike className="h-4 w-4 text-amber-600" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Motos apreendidas</p>
                    </div>
                    <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-amber-600">{state.veiculosMotosApreendidas}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Motocicletas retidas no depósito</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Liberados</p>
                    </div>
                    <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-emerald-600">{state.veiculosLiberadosGlobal}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Veículos já regularizados no total</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
                <CardHeader>
                  <CardTitle className="font-heading text-base font-bold tracking-[-0.02em] text-slate-800">Concessionários</CardTitle>
                  <CardDescription className="mt-1 hidden text-sm leading-6 text-[#89a0bf] lg:block">
                    Situação financeira dos permissionários — valores estimados por categoria.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Em débito</p>
                    <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-rose-600">{state.concessionariosEmDebito}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {state.concessionariosEmDebitoValor > 0
                        ? `Estimativa de taxas: ${currencyFormatter.format(state.concessionariosEmDebitoValor)}`
                        : 'Nenhum cadastro em débito'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Taxas pagas</p>
                    <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-emerald-600">{state.concessionariosPagos}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {state.concessionariosValorPago > 0
                        ? `Estimativa de taxas: ${currencyFormatter.format(state.concessionariosValorPago)}`
                        : 'Nenhum cadastro regularizado'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Operações IRO, JGC e credenciais */}
            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
                <CardHeader>
                  <CardTitle className="font-heading text-base font-bold tracking-[-0.02em] text-slate-800">Ordens de Serviço</CardTitle>
                  <CardDescription className="mt-1 hidden text-sm leading-6 text-[#89a0bf] lg:block">
                    Distribuição global das Ordens de Serviço por situação.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 bg-[linear-gradient(180deg,_rgba(248,250,252,0.55)_0%,_rgba(255,255,255,1)_100%)]">
                  <ChartContainer className="mx-auto h-[240px] max-w-[280px]" config={resolvedChartConfig}>
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Pie data={ordensServicoPorStatus} dataKey="value" nameKey="name" innerRadius={70} outerRadius={96} paddingAngle={4}>
                        {ordensServicoPorStatus.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                    </PieChart>
                  </ChartContainer>

                  <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-5">
                    <div className="text-center">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8ea0bd]">Total de O.S.</p>
                      <p className="mt-2 text-[22px] font-extrabold tracking-[-0.04em] text-[#2563eb] md:text-[2rem]">{state.ordensServicoTotal || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8ea0bd]">Publicadas</p>
                      <p className="mt-2 text-[22px] font-extrabold tracking-[-0.04em] text-[#10b981] md:text-[2rem]">{state.ordensServicoPublicadas || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8ea0bd]">Rascunhos</p>
                      <p className="mt-2 text-[22px] font-extrabold tracking-[-0.04em] text-[#f59e0b] md:text-[2rem]">{state.ordensServicoRascunhos || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
                <CardHeader>
                  <CardTitle className="font-heading text-base font-bold tracking-[-0.02em] text-slate-800">Operações IRO</CardTitle>
                  <CardDescription className="mt-1 hidden text-sm leading-6 text-[#89a0bf] lg:block">
                    Reforço operacional ativo e inativo da Guarda.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Ativas</p>
                    </div>
                    <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-blue-600">{state.operacoesAtivasIro}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Operações em andamento</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Pause className="h-4 w-4 text-slate-500" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Inativas</p>
                    </div>
                    <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-slate-500">{state.iroOperacoesInativas}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Operações encerradas</p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* JGC e credenciais */}
            <section className="grid gap-6 xl:grid-cols-2">
              <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
                <CardHeader>
                  <CardTitle className="font-heading text-base font-bold tracking-[-0.02em] text-slate-800">Jovem Guarda Cidadã</CardTitle>
                  <CardDescription className="mt-1 hidden text-sm leading-6 text-[#89a0bf] lg:block">
                    Alunos matriculados e ativos no programa.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-1">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-purple-600" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Alunos matriculados</p>
                    </div>
                    <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-purple-600">{state.jgcAlunosMatriculados}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Matrículas ativas no JGC</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
                <CardHeader>
                  <CardTitle className="font-heading text-base font-bold tracking-[-0.02em] text-slate-800">Credenciais de vagas especiais</CardTitle>
                  <CardDescription className="mt-1 hidden text-sm leading-6 text-[#89a0bf] lg:block">
                    Solicitações por perfil beneficiário.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Accessibility className="h-4 w-4 text-blue-600" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Idosos</p>
                    </div>
                    <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-blue-600">{state.credenciaisIdosos}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Solicitações de idosos</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <HandCoins className="h-4 w-4 text-violet-600" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">PCD</p>
                    </div>
                    <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-violet-600">{state.credenciaisPcd}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Solicitações de pessoas com deficiência</p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </>
        )}

        {isDemutranScope && state.concessionarios.length > 0 && (
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
              <CardHeader>
                <CardTitle className="font-heading text-base font-bold tracking-[-0.02em] text-slate-800">Concessionarios por categoria</CardTitle>
                <CardDescription className="mt-1 hidden text-sm leading-6 text-[#89a0bf] lg:block">
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
                <CardTitle className="font-heading text-base font-bold tracking-[-0.02em] text-slate-800">Recursos e credenciais</CardTitle>
                <CardDescription className="mt-1 hidden text-sm leading-6 text-[#89a0bf] lg:block">
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

            <Link
              to="/admin/demutran/concessionarios"
              className="block rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.32)] transition-all hover:shadow-[0_20px_44px_-30px_rgba(37,99,235,0.35)] hover:border-brand-200/60"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Concessionários em débito</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {state.concessionariosEmDebito} concessionário{state.concessionariosEmDebito !== 1 ? 's' : ''} com taxas pendentes — clique para gerenciar
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600">
                  <span className="text-2xl font-extrabold">{state.concessionariosEmDebito}</span>
                </div>
              </div>
            </Link>
          </section>
        )}

        {isGuardaScope && (
          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
              <CardHeader>
                <CardTitle className="font-heading text-base font-bold tracking-[-0.02em] text-slate-800">Frota da Guarda</CardTitle>
                <CardDescription className="mt-1 hidden text-sm leading-6 text-[#89a0bf] lg:block">
                  Situação dos veículos operacionais da Guarda Municipal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto md:grid md:grid-cols-3 md:overflow-x-visible">
                  <div className="w-[70vw] shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-5 md:w-auto">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Disponíveis</p>
                    <p className="mt-2 text-[28px] font-extrabold tracking-[-0.04em] text-emerald-600">{state.frotaDisponivel}</p>
                    <p className="mt-1 text-[13px] leading-5 text-slate-500">Viaturas prontas para uso</p>
                  </div>
                  <div className="w-[70vw] shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-5 md:w-auto">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Em Serviço</p>
                    <p className="mt-2 text-[28px] font-extrabold tracking-[-0.04em] text-blue-600">{state.frotaEmServico}</p>
                    <p className="mt-1 text-[13px] leading-5 text-slate-500">Viaturas em operação</p>
                  </div>
                  <div className="w-[70vw] shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-5 md:w-auto">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Em Manutenção</p>
                    <p className="mt-2 text-[28px] font-extrabold tracking-[-0.04em] text-amber-600">{state.frotaEmManutencao}</p>
                    <p className="mt-1 text-[13px] leading-5 text-slate-500">Viaturas em oficina</p>
                  </div>
                  <div className="hidden shrink-0 w-4 md:hidden" />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
              <CardHeader>
                <CardTitle className="font-heading text-base font-bold tracking-[-0.02em] text-slate-800">Conteúdo e Operação</CardTitle>
                <CardDescription className="mt-1 hidden text-sm leading-6 text-[#89a0bf] lg:block">
                  Publicações e atividades do setor da Guarda Municipal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto md:grid md:grid-cols-2 md:overflow-x-visible">
                  <div className="w-[70vw] shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-5 md:w-auto">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Notícias</p>
                    <p className="mt-2 text-[28px] font-extrabold tracking-[-0.04em] text-blue-600">{state.noticiasSetor}</p>
                    <p className="mt-1 text-[13px] leading-5 text-slate-500">Notícias publicadas do setor</p>
                  </div>
                  <div className="w-[70vw] shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-5 md:w-auto">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Eventos</p>
                    <p className="mt-2 text-[28px] font-extrabold tracking-[-0.04em] text-emerald-600">{state.eventosSetor}</p>
                    <p className="mt-1 text-[13px] leading-5 text-slate-500">Eventos cadastrados no setor</p>
                  </div>
                  <div className="w-[70vw] shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-5 md:w-auto">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Equipes</p>
                    <p className="mt-2 text-[28px] font-extrabold tracking-[-0.04em] text-purple-600">{state.equipesAtivas}</p>
                    <p className="mt-1 text-[13px] leading-5 text-slate-500">Equipes de trabalho ativas</p>
                  </div>
                  <div className="w-[70vw] shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-5 md:w-auto">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Escalas IRO</p>
                    <p className="mt-2 text-[28px] font-extrabold tracking-[-0.04em] text-emerald-600">{state.candidaturasIro}</p>
                    <p className="mt-1 text-[13px] leading-5 text-slate-500">Candidaturas de reforço confirmadas</p>
                  </div>
                  <div className="hidden shrink-0 w-4 md:hidden" />
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {isGuardaScope && (
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="font-heading text-base font-bold tracking-[-0.02em] text-slate-800">
                    Ordens de Serviço
                  </CardTitle>
                  <CardDescription className="mt-1 hidden text-sm leading-6 text-[#89a0bf] lg:block">
                    Distribuição das Ordens de Serviço da Guarda por situação
                  </CardDescription>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4 bg-[linear-gradient(180deg,_rgba(248,250,252,0.55)_0%,_rgba(255,255,255,1)_100%)]">
                <ChartContainer className="mx-auto h-[240px] max-w-[280px]" config={resolvedChartConfig}>
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie data={ordensServicoPorStatus} dataKey="value" nameKey="name" innerRadius={70} outerRadius={96} paddingAngle={4}>
                      {ordensServicoPorStatus.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  </PieChart>
                </ChartContainer>

                <div className="grid gap-3">
                  <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-5">
                    <div className="text-center">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8ea0bd]">Total de O.S.</p>
                      <p className="mt-2 text-[22px] font-extrabold tracking-[-0.04em] text-[#2563eb] md:text-[2rem]">{state.ordensServicoTotal || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8ea0bd]">Publicadas</p>
                      <p className="mt-2 text-[22px] font-extrabold tracking-[-0.04em] text-[#10b981] md:text-[2rem]">{state.ordensServicoPublicadas || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8ea0bd]">Rascunhos</p>
                      <p className="mt-2 text-[22px] font-extrabold tracking-[-0.04em] text-[#f59e0b] md:text-[2rem]">
                        {state.ordensServicoRascunhos || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_-22px_rgba(15,23,42,0.2)]">
              <CardHeader>
                <CardTitle className="font-heading text-base font-bold tracking-[-0.02em] text-slate-800">IRO e Banco de Horas</CardTitle>
                <CardDescription className="mt-1 hidden text-sm leading-6 text-[#89a0bf] lg:block">
                  Métricas consolidadas do módulo de Indenização de Reforço Operacional.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto md:grid md:grid-cols-2 md:overflow-x-visible">
                  <div className="w-[70vw] shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-5 md:w-auto">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Operações IRO</p>
                    <p className="mt-2 text-[28px] font-extrabold tracking-[-0.04em] text-blue-600">{state.operacoesAtivasIro}</p>
                    <p className="mt-1 text-[13px] leading-5 text-slate-500">Operações ativas de reforço cadastradas</p>
                  </div>
                  <div className="w-[70vw] shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-5 md:w-auto">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Escalas Confirmadas</p>
                    <p className="mt-2 text-[28px] font-extrabold tracking-[-0.04em] text-emerald-600">{state.candidaturasIro}</p>
                    <p className="mt-1 text-[13px] leading-5 text-slate-500">Total de candidaturas de reforço confirmadas</p>
                  </div>
                  <div className="w-[70vw] shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-5 md:w-auto">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Banco de Horas</p>
                    <p className="mt-2 text-[28px] font-extrabold tracking-[-0.04em] text-amber-600">{state.totalBancoHoras}h</p>
                    <p className="mt-1 text-[13px] leading-5 text-slate-500">Total de horas extras registradas no banco</p>
                  </div>
                  <div className="w-[70vw] shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-5 md:w-auto">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Demandas Ouvidoria</p>
                    <p className="mt-2 text-[28px] font-extrabold tracking-[-0.04em] text-rose-600">{state.demandasFalaCidadaoCount}</p>
                    <p className="mt-1 text-[13px] leading-5 text-slate-500">Solicitações Ouvidoria (Fala Cidadão) pendentes</p>
                  </div>
                  <div className="hidden shrink-0 w-4 md:hidden" />
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
