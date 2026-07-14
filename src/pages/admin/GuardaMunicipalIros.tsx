import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Calendar, Check, CheckCircle2, ChevronsUpDown, Clock, Eye, EyeOff, Hourglass, Pencil, Plus, Printer, RefreshCcw, Trash2, Users, X } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { gerarRelatorioMensal, gerarRelatorioOperacao } from '@/lib/relatorio-iro';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { maskCpf } from '@/lib/masks';
import type { IROBancoHoras, IROCandidatura, IRONotificacao, IROOperacao } from '@/types/admin';

type Section = 'operacoes' | 'candidaturas' | 'banco-horas' | 'notificacoes' | 'relatorios';
type IROViewMode = 'minhas' | 'gerenciar';

type GuardaOption = {
  usuario_id: string;
  guarda_id: string;
  nome: string;
  matricula: string;
  cpf: string | null;
  graduacao_id: string | null;
  graduacao_nome: string | null;
  valor_hora: number;
};

type ManualFormState = {
  usuario_id: string;
  operacao_id: string;
  quantidade_horas: string;
  motivo: string;
};

type OperacaoFormState = {
  nome: string;
  descricao: string;
  horario_previsto: string;
  data_inicio: string;
  data_fim: string;
  vagas_por_dia: number;
  horas_por_dia: number;
  tempo_solicitacao: IROOperacao['tempo_solicitacao'];
};

type MonthSummary = {
  monthKey: string;
  monthLabel: string;
  existingHours: number;
  newHours: number;
  totalHours: number;
  availableHours: number;
  exceedsLimit: boolean;
  nearLimit: boolean;
  maxAllowedToLaunch: number;
};

type ManualPreview = {
  valid: boolean;
  errors: string[];
  guarda: GuardaOption | null;
  operacao: IROOperacao | null;
  hoursToAdd: number;
  estimatedValue: number;
  monthSummaries: MonthSummary[];
};

type PerfilUsuarioRow = {
  user_id: string;
  nome: string | null;
  sobrenome: string | null;
  graduacao_id: string | null;
};

type ValorGraduacaoRow = {
  graduacao_id: string;
  valor_hora: number | string | null;
};

type IROCandidaturaRow = IROCandidatura & {
  iro_operacoes?: { nome?: string | null } | null;
};

type GuardaJoinRow = {
  usuario_id: string | null;
  guarda_id: string;
  guardas_municipais:
    | {
        id: string;
        nome: string;
        matricula: string;
        cpf: string | null;
        graduacao_id: string | null;
        ativo: boolean;
        guarda_municipal_graduacoes?: { nome?: string | null } | { nome?: string | null }[] | null;
      }
    | {
        id: string;
        nome: string;
        matricula: string;
        cpf: string | null;
        graduacao_id: string | null;
        ativo: boolean;
        guarda_municipal_graduacoes?: { nome?: string | null } | { nome?: string | null }[] | null;
      }[]
    | null;
};

const TEMPO_SOLICITACAO_LABEL: Record<string, string> = {
  imediato: 'Imediato',
  '1h': '1 hora',
  '6h': '6 horas',
  '8h': '8 horas',
  '12h': '12 horas',
  '24h': '24 horas',
  '48h': '48 horas',
};

const STATUS_CANDIDATURA_VARIANT: Record<string, string> = {
  pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmado: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelado: 'bg-red-50 text-red-700 border-red-200',
  realizado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const NOTIFICACAO_TIPO_LABEL: Record<string, string> = {
  info: 'Info',
  sucesso: 'Sucesso',
  alerta: 'Alerta',
  erro: 'Erro',
  manual: 'Manual',
};

const NOTIFICACAO_TIPO_VARIANT: Record<string, string> = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  sucesso: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  alerta: 'bg-amber-50 text-amber-700 border-amber-200',
  erro: 'bg-red-50 text-red-700 border-red-200',
  manual: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const sectionLabels: Record<Section, string> = {
  operacoes: 'Operações',
  candidaturas: 'Candidaturas',
  'banco-horas': 'Banco de Horas',
  notificacoes: 'Notificações',
  relatorios: 'Relatórios',
};

const operacaoFormInitial = (): OperacaoFormState => ({
  nome: '',
  descricao: '',
  horario_previsto: '08:00',
  data_inicio: new Date().toISOString().slice(0, 10),
  data_fim: new Date().toISOString().slice(0, 10),
  vagas_por_dia: 1,
  horas_por_dia: 8,
  tempo_solicitacao: 'imediato',
});

const normalizeOperacaoForm = (operacao?: Partial<IROOperacao> | null): OperacaoFormState => ({
  nome: operacao?.nome ?? '',
  descricao: operacao?.descricao ?? '',
  horario_previsto: operacao?.horario_previsto?.slice(0, 5) || '08:00',
  data_inicio: operacao?.data_inicio ?? todayStr(),
  data_fim: operacao?.data_fim ?? todayStr(),
  vagas_por_dia: Number.isFinite(operacao?.vagas_por_dia) ? Number(operacao?.vagas_por_dia) : 1,
  horas_por_dia: Number.isFinite(operacao?.horas_por_dia) ? Number(operacao?.horas_por_dia) : 8,
  tempo_solicitacao: operacao?.tempo_solicitacao ?? 'imediato',
});

const manualFormInitial = (): ManualFormState => ({
  usuario_id: '',
  operacao_id: '',
  quantidade_horas: '',
  motivo: '',
});

const BASE_IROS = '/admin/iros/guarda-municipal';
const LIMITE_IRO_MES = 72;

const fmtDateBR = (d: string | null | undefined): string => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

const monthLabel = (key: string) => {
  const [year, month] = key.split('-');
  const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const GuardaMunicipalIros = () => {
  const { confirm, confirmDialog } = useConfirmDialog();
  const { setorId, profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>('operacoes');
  const [viewMode, setViewMode] = useState<IROViewMode>('gerenciar');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todas');

  const [operacoes, setOperacoes] = useState<IROOperacao[]>([]);
  const [candidaturas, setCandidaturas] = useState<IROCandidatura[]>([]);
  const [bancoHoras, setBancoHoras] = useState<IROBancoHoras[]>([]);
  const [notificacoes, setNotificacoes] = useState<IRONotificacao[]>([]);
  const [usuarios, setUsuarios] = useState<{ user_id: string; nome: string; graduacao_id?: string | null }[]>([]);
  const [guardasAtivos, setGuardasAtivos] = useState<GuardaOption[]>([]);
  const [valoresGraduacao, setValoresGraduacao] = useState<{ graduacao_id: string; valor_hora: number }[]>([]);

  const [selectedOperacao, setSelectedOperacao] = useState<IROOperacao | null>(null);
  const [operacaoCandidaturas, setOperacaoCandidaturas] = useState<IROCandidatura[]>([]);

  const [operacaoDialogOpen, setOperacaoDialogOpen] = useState(false);
  const [operacaoForm, setOperacaoForm] = useState<OperacaoFormState>(() => operacaoFormInitial());
  const [editingOperacao, setEditingOperacao] = useState<IROOperacao | null>(null);

  const [candidaturaResultado, setCandidaturaResultado] = useState<{ sucesso: boolean; mensagem: string; operacaoNome?: string; dataOperacao?: string; horas?: number; totalMes?: number } | null>(null);
  const [candidaturaResultadoAberto, setCandidaturaResultadoAberto] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [operacaoToDelete, setOperacaoToDelete] = useState<IROOperacao | null>(null);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);

  const [candidaturaData, setCandidaturaData] = useState({ operacao_id: '', data_operacao: todayStr() });

  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualForm, setManualForm] = useState<ManualFormState>(manualFormInitial);
  const [guardaComboboxOpen, setGuardaComboboxOpen] = useState(false);
  const [operacaoComboboxOpen, setOperacaoComboboxOpen] = useState(false);

  const [relatorioTipo, setRelatorioTipo] = useState<'operacao' | 'mensal'>('operacao');
  const [relatorioOperacaoId, setRelatorioOperacaoId] = useState('');
  const [relatorioMes, setRelatorioMes] = useState(new Date().toISOString().slice(0, 7));
  const [relatorioFormato, setRelatorioFormato] = useState<'pdf' | 'xlsx'>('pdf');

  const podeVerTudo =
    profile?.papel === 'gestor' ||
    profile?.papel === 'super_admin' ||
    profile?.papel === 'admin_setor' ||
    (profile?.papel === 'tecnico' && profile?.modulos?.includes('iros'));
  const canManageOperacoes = podeVerTudo;
  const canLaunchManual = podeVerTudo;

  const subPath = location.pathname.replace(BASE_IROS, '').replace(/\/+$/, '');
  const isNovaOperacao = subPath === '/nova-operacao';
  const isEditandoOperacao = subPath.endsWith('/editar');
  const editOperacaoId = isEditandoOperacao ? subPath.split('/').filter(Boolean).at(-2) : null;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const applySetorFilter = <T extends { eq: (column: string, value: string) => T }>(query: T): T =>
        setorId ? query.eq('setor_id', setorId) : query;

      const [opRes, candRes, bhRes, notifRes, userRes, valoresRes, guardasRes] = await Promise.all([
        applySetorFilter(supabase.from('iro_operacoes').select('*').order('data_inicio', { ascending: false })),
        podeVerTudo
          ? supabase.from('iro_candidaturas').select('*, iro_operacoes!inner(nome)').order('created_at', { ascending: false })
          : supabase.from('iro_candidaturas').select('*, iro_operacoes!inner(nome)').eq('usuario_id', user!.user_id).order('created_at', { ascending: false }),
        podeVerTudo
          ? supabase.from('iro_banco_horas').select('*').order('created_at', { ascending: false })
          : supabase.from('iro_banco_horas').select('*').eq('usuario_id', user!.user_id).order('created_at', { ascending: false }),
        podeVerTudo
          ? supabase.from('iro_notificacoes').select('*').order('created_at', { ascending: false })
          : supabase.from('iro_notificacoes').select('*').eq('usuario_id', user!.user_id).order('created_at', { ascending: false }),
        supabase.from('perfis_usuarios').select('user_id, nome, sobrenome, graduacao_id').eq('ativo', true),
        supabase.from('iro_valores_graduacao').select('graduacao_id, valor_hora').eq('ativo', true),
        supabase
          .from('guardas_usuarios')
          .select('usuario_id, guarda_id, guardas_municipais!inner(id, nome, matricula, cpf, graduacao_id, ativo, guarda_municipal_graduacoes(nome))'),
      ]);

      const valores = ((valoresRes.data || []) as ValorGraduacaoRow[]).map((item) => ({
        graduacao_id: item.graduacao_id,
        valor_hora: Number(item.valor_hora) || 0,
      }));
      const valorByGraduacao = new Map(valores.map((item) => [item.graduacao_id, item.valor_hora]));

      const operacoesData = (opRes.data || []) as IROOperacao[];
      const hoje = todayStr();
      const expired = operacoesData.filter((item) => item.ativo && item.data_fim < hoje);
      for (const item of operacoesData) {
        if (item.ativo && item.data_fim < hoje) item.ativo = false;
      }
      if (expired.length > 0) {
        void supabase.from('iro_operacoes').update({ ativo: false }).in('id', expired.map((item) => item.id));
      }

      const guardas = ((guardasRes.data || []) as GuardaJoinRow[])
        .map((row) => {
          const guarda = Array.isArray(row.guardas_municipais) ? row.guardas_municipais[0] : row.guardas_municipais;
          if (!guarda?.ativo || !row.usuario_id) return null;
          const graduacaoNome =
            Array.isArray(guarda.guarda_municipal_graduacoes)
              ? guarda.guarda_municipal_graduacoes[0]?.nome || null
              : guarda.guarda_municipal_graduacoes?.nome || null;

          return {
            usuario_id: row.usuario_id,
            guarda_id: row.guarda_id,
            nome: guarda.nome,
            matricula: guarda.matricula,
            cpf: guarda.cpf || null,
            graduacao_id: guarda.graduacao_id || null,
            graduacao_nome: graduacaoNome,
            valor_hora: valorByGraduacao.get(guarda.graduacao_id) || 0,
          } satisfies GuardaOption;
        })
        .filter(Boolean) as GuardaOption[];

      setOperacoes(operacoesData);
      setCandidaturas(((candRes.data || []) as IROCandidaturaRow[]).map((item) => ({ ...item, operacao_nome: item.iro_operacoes?.nome || '' })));
      setBancoHoras((bhRes.data || []) as IROBancoHoras[]);
      setNotificacoes((notifRes.data || []) as IRONotificacao[]);
      setUsuarios(
        ((userRes.data || []) as PerfilUsuarioRow[]).map((item) => ({
          user_id: item.user_id,
          nome: [item.nome, item.sobrenome].filter(Boolean).join(' ') || 'Sem nome',
          graduacao_id: item.graduacao_id,
        })),
      );
      setGuardasAtivos(guardas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      setValoresGraduacao(valores);

      if (selectedOperacao) {
        const updated = operacoesData.find((item) => item.id === selectedOperacao.id);
        if (updated) setSelectedOperacao(updated);
      }
    } finally {
      setLoading(false);
    }
  }, [podeVerTudo, selectedOperacao, setorId, user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!canManageOperacoes) return;

    if (isNovaOperacao) {
      setEditingOperacao(null);
      setOperacaoForm(normalizeOperacaoForm());
      setOperacaoDialogOpen(true);
      return;
    }

    if (isEditandoOperacao && editOperacaoId && operacoes.length > 0) {
      const item = operacoes.find((entry) => entry.id === editOperacaoId);
      if (!item) {
        toast({ title: 'Operação não encontrada', variant: 'destructive' });
        navigate(BASE_IROS);
        return;
      }

      setEditingOperacao(item);
      setOperacaoForm(normalizeOperacaoForm(item));
      setOperacaoDialogOpen(true);
    }
  }, [canManageOperacoes, editOperacaoId, isEditandoOperacao, isNovaOperacao, navigate, operacoes]);

  const valorHoraPorUsuario = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of guardasAtivos) {
      map.set(item.usuario_id, item.valor_hora);
    }
    for (const item of usuarios) {
      if (!map.has(item.user_id) && item.graduacao_id) {
        const valor = valoresGraduacao.find((entry) => entry.graduacao_id === item.graduacao_id)?.valor_hora || 0;
        map.set(item.user_id, valor);
      }
    }
    return map;
  }, [guardasAtivos, usuarios, valoresGraduacao]);

  const usuarioMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of usuarios) map.set(item.user_id, item.nome);
    for (const item of guardasAtivos) map.set(item.usuario_id, item.nome);
    return map;
  }, [guardasAtivos, usuarios]);

  const guardaMatriculaMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of guardasAtivos) map.set(item.usuario_id, item.matricula);
    return map;
  }, [guardasAtivos]);

  const guardaGraduacaoMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of guardasAtivos) map.set(item.usuario_id, item.graduacao_nome || '');
    return map;
  }, [guardasAtivos]);

  const minhasCandidaturas = useMemo(
    () => candidaturas.filter((item) => item.usuario_id === user?.user_id),
    [candidaturas, user?.user_id],
  );

  const isMinhaIrosView = podeVerTudo && viewMode === 'minhas';
  const activeSection = isMinhaIrosView ? 'candidaturas' : section;

  const meuBancoHoras = useMemo(
    () => bancoHoras.find((item) => item.usuario_id === user?.user_id) || null,
    [bancoHoras, user?.user_id],
  );

  const minhasNotificacoes = useMemo(
    () => notificacoes.filter((item) => item.usuario_id === user?.user_id),
    [notificacoes, user?.user_id],
  );

  const notifNaoLidas = useMemo(
    () => minhasNotificacoes.filter((item) => !item.lida).length,
    [minhasNotificacoes],
  );

  const horasMes = useMemo(() => {
    const alvo = isMinhaIrosView ? minhasCandidaturas : podeVerTudo ? candidaturas : minhasCandidaturas;
    const mesAtual = new Date().toISOString().slice(0, 7);
    return alvo
      .filter((item) => item.status !== 'cancelado' && item.data_operacao.slice(0, 7) === mesAtual)
      .reduce((acc, item) => acc + Number(item.horas_trabalhadas || 0), 0);
  }, [candidaturas, isMinhaIrosView, minhasCandidaturas, podeVerTudo]);

  const stats = useMemo(() => {
    const baseCandidaturas = isMinhaIrosView ? minhasCandidaturas : podeVerTudo ? candidaturas : minhasCandidaturas;
    const mesAtual = new Date().toISOString().slice(0, 7);
    return {
      operacoesAtivas: operacoes.filter((item) => item.ativo && item.data_fim >= todayStr()).length,
      candidaturasMes: baseCandidaturas.filter((item) => item.data_operacao.slice(0, 7) === mesAtual && item.status !== 'cancelado').length,
      horasMes,
      totalBancoHoras: isMinhaIrosView
        ? Number(meuBancoHoras?.horas_excedentes || 0)
        : podeVerTudo
        ? bancoHoras.reduce((acc, item) => acc + Number(item.horas_excedentes || 0), 0)
        : Number(meuBancoHoras?.horas_excedentes || 0),
    };
  }, [bancoHoras, candidaturas, horasMes, isMinhaIrosView, minhasCandidaturas, meuBancoHoras, operacoes, podeVerTudo]);

  const operacoesComConfirmados = useMemo(() => {
    const set = new Set<string>();
    for (const item of candidaturas) {
      if (['confirmado', 'realizado'].includes(item.status)) set.add(item.operacao_id);
    }
    return set;
  }, [candidaturas]);

  const filteredOperacoes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return operacoes.filter((item) => {
      if (term && !`${item.nome} ${item.descricao || ''}`.toLowerCase().includes(term)) return false;
      if (statusFilter === 'ativas' && !item.ativo) return false;
      if (statusFilter === 'inativas' && item.ativo) return false;
      return true;
    });
  }, [operacoes, search, statusFilter]);

  const filteredCandidaturas = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = isMinhaIrosView ? minhasCandidaturas : podeVerTudo ? candidaturas : minhasCandidaturas;
    return base.filter((item) => {
      if (term && !`${item.operacao_nome} ${usuarioMap.get(item.usuario_id) || ''}`.toLowerCase().includes(term)) return false;
      if (statusFilter === 'manuais' && !item.adicionado_manual) return false;
      if (statusFilter === 'automaticas' && item.adicionado_manual) return false;
      if (!['todas', 'manuais', 'automaticas'].includes(statusFilter) && item.status !== statusFilter) return false;
      return true;
    });
  }, [candidaturas, isMinhaIrosView, minhasCandidaturas, podeVerTudo, search, statusFilter, usuarioMap]);

  const candidaturasAgrupadas = useMemo(() => {
    if (!podeVerTudo || viewMode !== 'gerenciar') return [];
    const map = new Map<string, { operacao: IROOperacao; candidaturas: IROCandidatura[]; stats: { total: number; confirmados: number; capacidadeTotal: number; restante: number } }>();
    for (const op of operacoes) {
      const opCandidaturas = filteredCandidaturas.filter((c) => c.operacao_id === op.id);
      if (opCandidaturas.length === 0) continue;
      const confirmadosRealizados = opCandidaturas.filter((c) => c.status === 'confirmado' || c.status === 'realizado');
      const dias = Math.max(1, Math.ceil((new Date(op.data_fim).getTime() - new Date(op.data_inicio).getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const capacidadeTotal = dias * op.vagas_por_dia;
      const usadas = confirmadosRealizados.length;
      map.set(op.id, {
        operacao: op,
        candidaturas: opCandidaturas,
        stats: { total: opCandidaturas.length, confirmados: confirmadosRealizados.length, capacidadeTotal, restante: Math.max(0, capacidadeTotal - usadas) },
      });
    }
    return Array.from(map.values()).sort((a, b) => b.candidaturas.length - a.candidaturas.length);
  }, [filteredCandidaturas, operacoes, podeVerTudo, viewMode]);

  const handlePrintCandidaturas = useCallback((operacao: IROOperacao, opCandidaturas: IROCandidatura[], formato: 'pdf' | 'xlsx' = 'pdf') => {
    const candidatos = opCandidaturas.map((c) => ({
      nome: usuarioMap.get(c.usuario_id) || '—',
      matricula: guardaMatriculaMap.get(c.usuario_id) || '—',
      graduacao: guardaGraduacaoMap.get(c.usuario_id) || '—',
      data: c.data_operacao,
      horario: operacao.horario_previsto.slice(0, 5),
      horas: c.horas_trabalhadas,
      valor: c.horas_trabalhadas * (valorHoraPorUsuario.get(c.usuario_id) || 0),
      status: c.status,
    }));
    gerarRelatorioDetalhadoOperacao(
      {
        nome: operacao.nome,
        descricao: operacao.descricao,
        data_inicio: operacao.data_inicio,
        data_fim: operacao.data_fim,
        horario_previsto: operacao.horario_previsto,
        vagas_por_dia: operacao.vagas_por_dia,
        horas_por_dia: operacao.horas_por_dia,
      },
      candidatos,
      formato,
    );
    toast({ title: 'Lista de candidaturas gerada!' });
  }, [usuarioMap, guardaMatriculaMap, guardaGraduacaoMap, valorHoraPorUsuario]);

  const filteredBancoHoras = useMemo(() => {
    const base = isMinhaIrosView ? (meuBancoHoras ? [meuBancoHoras] : []) : podeVerTudo ? bancoHoras : (meuBancoHoras ? [meuBancoHoras] : []);
    const term = search.trim().toLowerCase();
    return base.filter((item) => {
      if (term && !(usuarioMap.get(item.usuario_id) || '').toLowerCase().includes(term)) return false;
      return true;
    });
  }, [bancoHoras, isMinhaIrosView, meuBancoHoras, podeVerTudo, search, usuarioMap]);

  const filteredNotificacoes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return minhasNotificacoes.filter((item) => {
      if (term && !item.titulo.toLowerCase().includes(term) && !item.mensagem.toLowerCase().includes(term)) return false;
      if (statusFilter === 'lidas' && !item.lida) return false;
      if (statusFilter === 'nao-lidas' && item.lida) return false;
      return true;
    });
  }, [minhasNotificacoes, search, statusFilter]);

  const manualFormDirty = useMemo(() => {
    const initial = manualFormInitial();
    return (
      manualForm.usuario_id !== initial.usuario_id ||
      manualForm.operacao_id !== initial.operacao_id ||
      manualForm.quantidade_horas !== initial.quantidade_horas ||
      manualForm.motivo.trim() !== initial.motivo
    );
  }, [manualForm]);

  const selectedManualGuarda = useMemo(
    () => guardasAtivos.find((item) => item.usuario_id === manualForm.usuario_id) || null,
    [guardasAtivos, manualForm.usuario_id],
  );

  const selectedManualOperacao = useMemo(
    () => operacoes.find((item) => item.id === manualForm.operacao_id) || null,
    [manualForm.operacao_id, operacoes],
  );

  const manualPreview = useMemo<ManualPreview>(() => {
    const errors: string[] = [];
    const guarda = selectedManualGuarda;
    const operacao = selectedManualOperacao;

    if (!guarda) errors.push('Selecione um guarda ativo.');
    if (!operacao) errors.push('Selecione uma operação.');

    const horas = Number(manualForm.quantidade_horas);
    if (!manualForm.quantidade_horas || isNaN(horas) || horas <= 0) {
      errors.push('Informe uma quantidade de horas válida.');
    }
    if (horas > LIMITE_IRO_MES) {
      errors.push(`A quantidade de horas não pode ultrapassar o limite de ${LIMITE_IRO_MES}h mensais.`);
    }

    if (manualForm.motivo.trim().length > 0 && manualForm.motivo.trim().length < 10) {
      errors.push('O motivo precisa ter no mínimo 10 caracteres.');
    }

    const monthKey = operacao?.data_inicio?.slice(0, 7) || '';
    const existingHours = monthKey
      ? candidaturas
          .filter(
            (item) =>
              item.usuario_id === manualForm.usuario_id &&
              item.data_operacao?.slice(0, 7) === monthKey &&
              ['confirmado', 'realizado'].includes(item.status),
          )
          .reduce((acc, item) => acc + Number(item.horas_trabalhadas || 0), 0)
      : 0;

    const totalHours = existingHours + horas;
    const exceedsLimit = totalHours > LIMITE_IRO_MES;
    const nearLimit = totalHours >= LIMITE_IRO_MES * 0.8;
    const availableHours = Math.max(LIMITE_IRO_MES - existingHours, 0);

    if (operacao && candidaturas.some(
      (item) =>
        item.usuario_id === manualForm.usuario_id &&
        item.data_operacao === operacao.data_inicio &&
        ['confirmado', 'realizado'].includes(item.status),
    )) {
      errors.push(`Já existe IRO confirmada/realizada na data de início da operação (${fmtDateBR(operacao.data_inicio)}).`);
    }

    if (exceedsLimit) {
      errors.push(`A quantidade ultrapassa o limite de ${LIMITE_IRO_MES}h no mês. Disponível: ${(LIMITE_IRO_MES - existingHours).toFixed(2).replace('.', ',')}h.`);
    }

    const estimatedValue = horas * Number(guarda?.valor_hora || 0);

    return {
      valid: errors.length === 0 && !!guarda && !!operacao && horas > 0,
      errors,
      guarda,
      operacao,
      hoursToAdd: horas,
      estimatedValue,
      monthSummaries: [{
        monthKey,
        monthLabel: monthKey ? monthLabel(monthKey) : '',
        existingHours,
        newHours: horas,
        totalHours,
        availableHours,
        exceedsLimit,
        nearLimit,
        maxAllowedToLaunch: availableHours,
      }],
    };
  }, [candidaturas, manualForm, selectedManualGuarda, selectedManualOperacao]);

  const resetOperacaoDialog = () => {
    setEditingOperacao(null);
    setOperacaoForm(operacaoFormInitial());
    setOperacaoDialogOpen(false);
    navigate(BASE_IROS);
  };

  const resetManualDialog = () => {
    setManualForm(manualFormInitial());
    setManualDialogOpen(false);
    setGuardaComboboxOpen(false);
    setOperacaoComboboxOpen(false);
  };

  const handleManualDialogChange = async (open: boolean) => {
    if (!open && manualFormDirty) {
      const shouldClose = await confirm({
        title: 'Descartar lançamento',
        description: 'Existem dados preenchidos. Deseja descartar o lançamento manual?',
      });
      if (!shouldClose) return;
    }

    if (!open) {
      resetManualDialog();
      return;
    }

    setManualDialogOpen(true);
  };

  const openOperacaoDetails = async (item: IROOperacao) => {
    setSelectedOperacao(item);
    setCandidaturaData((current) => ({
      operacao_id: item.id,
      data_operacao: current.data_operacao || todayStr(),
    }));
    const { data } = await supabase
      .from('iro_candidaturas')
      .select('*, iro_operacoes!inner(nome)')
      .eq('operacao_id', item.id)
      .order('created_at', { ascending: false });
    setOperacaoCandidaturas(((data || []) as IROCandidaturaRow[]).map((entry) => ({ ...entry, operacao_nome: entry.iro_operacoes?.nome || '' })));
  };

  const openCreateOperacao = () => {
    navigate(`${BASE_IROS}/nova-operacao`);
  };

  const openEditOperacao = (item: IROOperacao) => {
    if (operacoesComConfirmados.has(item.id)) {
      toast({
        title: 'Operação bloqueada',
        description: 'Já existem candidaturas confirmadas. Não é possível editar.',
        variant: 'destructive',
      });
      return;
    }

    setEditingOperacao(item);
    setOperacaoForm(normalizeOperacaoForm(item));
    setOperacaoDialogOpen(true);
  };

  const handleSaveOperacao = async () => {
    if (!operacaoForm.nome || !operacaoForm.horario_previsto) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha nome e horário previsto.', variant: 'destructive' });
      return;
    }

    const hoje = todayStr();
    if (operacaoForm.data_inicio < hoje) {
      toast({ title: 'Data inválida', description: 'A data de início não pode ser no passado.', variant: 'destructive' });
      return;
    }
    if (operacaoForm.data_fim < hoje) {
      toast({ title: 'Data inválida', description: 'A data de fim não pode ser no passado.', variant: 'destructive' });
      return;
    }
    if (operacaoForm.data_fim < operacaoForm.data_inicio) {
      toast({
        title: 'Data inválida',
        description: 'A data de fim deve ser posterior ou igual à data de início.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      setor_id: setorId,
      nome: operacaoForm.nome,
      descricao: operacaoForm.descricao || null,
      horario_previsto: operacaoForm.horario_previsto,
      data_inicio: operacaoForm.data_inicio,
      data_fim: operacaoForm.data_fim,
      vagas_por_dia: operacaoForm.vagas_por_dia,
      horas_por_dia: operacaoForm.horas_por_dia,
      tempo_solicitacao: operacaoForm.tempo_solicitacao,
    };

    if (editingOperacao) {
      const { data: updated, error } = await supabase.from('iro_operacoes').update(payload).eq('id', editingOperacao.id).select();
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        return;
      }
      if (!updated || updated.length === 0) {
        toast({
          title: 'Erro',
          description: 'Nenhuma linha foi alterada. Verifique suas permissões.',
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Operação atualizada' });
    } else {
      const { error } = await supabase.from('iro_operacoes').insert({ ...payload, created_by: profile?.perfil_id || null });
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Operação criada' });
    }

    resetOperacaoDialog();
    await loadData();
  };

  const handleToggleAtiva = async (item: IROOperacao) => {
    const confirmed = await confirm({
      title: item.ativo ? 'Desativar operação' : 'Ativar operação',
      description: item.ativo
        ? `Confirma a desativação da operação "${item.nome}"?`
        : `Confirma a ativação da operação "${item.nome}"?`,
    });
    if (!confirmed) return;

    const { error } = await supabase.from('iro_operacoes').update({ ativo: !item.ativo }).eq('id', item.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: item.ativo ? 'Operação desativada' : 'Operação ativada' });
    void loadData();
  };

  const openDeleteConfirm = (item: IROOperacao) => {
    setOperacaoToDelete(item);
    setDeleteConfirmChecked(false);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteOperacao = async () => {
    if (!operacaoToDelete) return;
    const confirmed = await confirm({
      title: 'Excluir operação definitivamente',
      description: `Confirma a exclusão permanente da operação "${operacaoToDelete.nome}"?`,
    });
    if (!confirmed) return;

    const { error } = await supabase.from('iro_operacoes').delete().eq('id', operacaoToDelete.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Operação excluída permanentemente' });
    setDeleteConfirmOpen(false);
    setOperacaoToDelete(null);
    setDeleteConfirmChecked(false);
    void loadData();
  };

  const handleCandidatar = async (operacaoId?: string) => {
    const targetOperacaoId = operacaoId || candidaturaData.operacao_id;

    if (!targetOperacaoId || !candidaturaData.data_operacao) {
      toast({ title: 'Selecione operação e data', variant: 'destructive' });
      return;
    }

    if (!user?.user_id) {
      toast({ title: 'Sessão inválida', description: 'Faça login novamente para concluir a candidatura.', variant: 'destructive' });
      return;
    }

    const operacao = operacoes.find((item) => item.id === targetOperacaoId);
    if (operacao && operacao.data_fim < todayStr()) {
      toast({ title: 'Prazo encerrado', description: 'O período desta operação já se encerrou.', variant: 'destructive' });
      return;
    }

    const { data, error } = await supabase.rpc('candidatar_se_iro', {
      p_operacao_id: targetOperacaoId,
      p_usuario_id: user.user_id,
      p_data: candidaturaData.data_operacao,
    });
    if (error) {
      setCandidaturaResultado({ sucesso: false, mensagem: error.message });
      setCandidaturaResultadoAberto(true);
      return;
    }

    const result = data as { sucesso: boolean; mensagem: string; total_mes?: number };
    setCandidaturaResultado({
      sucesso: result.sucesso,
      mensagem: result.mensagem,
      operacaoNome: operacao?.nome,
      dataOperacao: candidaturaData.data_operacao,
      horas: operacao?.horas_por_dia,
      totalMes: result.total_mes,
    });
    setCandidaturaResultadoAberto(true);

    if (result.sucesso) {
      setSelectedOperacao(null);
      setOperacaoCandidaturas([]);
    }

    setCandidaturaData({ operacao_id: '', data_operacao: todayStr() });
    void loadData();
  };

  const handleCancelarCandidatura = async (item: IROCandidatura) => {
    if (item.adicionado_manual) {
      toast({
        title: 'IRO manual protegida',
        description: 'Registros manuais não podem ser cancelados por este fluxo.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase.from('iro_candidaturas').update({ status: 'cancelado' }).eq('id', item.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Candidatura cancelada' });
    if (selectedOperacao) await openOperacaoDetails(selectedOperacao);
    void loadData();
  };

  const handleMarcarLida = async (item: IRONotificacao) => {
    const { error } = await supabase.from('iro_notificacoes').update({ lida: !item.lida }).eq('id', item.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    void loadData();
  };

  const handleMarcarTodasLidas = async () => {
    const ids = minhasNotificacoes.filter((item) => !item.lida).map((item) => item.id);
    if (!ids.length) return;
    const { error } = await supabase.from('iro_notificacoes').update({ lida: true }).in('id', ids);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `${ids.length} notificação(is) marcada(s) como lida(s)` });
    void loadData();
  };

  const handleSalvarIroManual = async () => {
    if (!manualPreview.valid) {
      toast({
        title: 'Revise o lançamento manual',
        description: manualPreview.errors[0] || 'Há inconsistências no formulário.',
        variant: 'destructive',
      });
      return;
    }

    if (manualForm.motivo.trim().length < 10) {
      toast({ title: 'Motivo obrigatório', description: 'Informe uma justificativa com no mínimo 10 caracteres.', variant: 'destructive' });
      return;
    }

    setManualSaving(true);
    try {
      const { data, error } = await supabase.rpc('lancar_iro_extra', {
        p_operacao_id: manualForm.operacao_id,
        p_usuario_id: manualForm.usuario_id,
        p_quantidade_horas: Number(manualForm.quantidade_horas),
        p_motivo: manualForm.motivo.trim(),
      });

      if (error) {
        toast({ title: 'Erro ao lançar IRO extra', description: error.message, variant: 'destructive' });
        return;
      }

      const result = data as {
        mensagem?: string;
        horas_adicionadas?: number;
        valor_total?: number;
      };

      toast({
        title: 'IRO extra lançada',
        description:
          result.mensagem ||
          `${result.horas_adicionadas || manualPreview.hoursToAdd}h adicionadas.`,
      });

      resetManualDialog();
      await loadData();
    } finally {
      setManualSaving(false);
    }
  };

  const sectionStatusOptions = useMemo(() => {
    if (activeSection === 'operacoes') {
      return [
        { value: 'todas', label: 'Todas' },
        { value: 'ativas', label: 'Ativas' },
        { value: 'inativas', label: 'Inativas' },
      ];
    }

    if (activeSection === 'candidaturas') {
      return [
        { value: 'todas', label: 'Todos' },
        { value: 'confirmado', label: 'Confirmado' },
        { value: 'realizado', label: 'Realizado' },
        { value: 'cancelado', label: 'Cancelado' },
        { value: 'manuais', label: 'Apenas manuais' },
        { value: 'automaticas', label: 'Apenas automáticas' },
      ];
    }

    if (activeSection === 'notificacoes') {
      return [
        { value: 'todas', label: 'Todas' },
        { value: 'lidas', label: 'Lidas' },
        { value: 'nao-lidas', label: 'Não lidas' },
      ];
    }

    if (activeSection === 'relatorios') return [];

    return [{ value: 'todas', label: 'Todos' }];
  }, [activeSection]);

  const renderOperacaoCard = (item: IROOperacao) => (
    <article key={item.id} className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs font-bold', item.ativo ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500')}>
              {item.ativo ? 'Ativa' : 'Inativa'}
            </Badge>
            <Badge variant="outline" className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold">
              {item.vagas_por_dia} vaga(s)/dia
            </Badge>
            {item.data_fim < todayStr() && (
              <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                Encerrada
              </Badge>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{item.nome}</h2>
            {item.descricao && <p className="mt-1 text-sm text-slate-600">{item.descricao}</p>}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {fmtDateBR(item.data_inicio)} - {fmtDateBR(item.data_fim)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {item.horario_previsto.slice(0, 5)}
            </span>
            <span className="flex items-center gap-1">
              <Hourglass className="h-3.5 w-3.5" />
              {item.horas_por_dia}h/dia
            </span>
          </div>
        </div>

        <div className="shrink-0">
          <div className="mb-3 text-right text-xs text-slate-500">{TEMPO_SOLICITACAO_LABEL[item.tempo_solicitacao] || item.tempo_solicitacao}</div>
          <div className="flex gap-2">
            {canManageOperacoes && <Switch checked={item.ativo} onCheckedChange={() => void handleToggleAtiva(item)} disabled={item.data_fim < todayStr()} />}
            <Button size="sm" variant="outline" onClick={() => void openOperacaoDetails(item)}>
              <Eye className="h-4 w-4" />
            </Button>
            {canManageOperacoes && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditOperacao(item)}
                  disabled={operacoesComConfirmados.has(item.id)}
                  title={operacoesComConfirmados.has(item.id) ? 'Já existem candidaturas confirmadas para esta operação' : 'Editar'}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => openDeleteConfirm(item)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );

  const renderCandidaturaCard = (item: IROCandidatura) => (
    <article key={item.id} className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs font-bold', STATUS_CANDIDATURA_VARIANT[item.status])}>
            {item.status}
          </Badge>
          {item.adicionado_manual && (
            <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              Manual
            </Badge>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{item.operacao_nome}</p>
          <p className="mt-0.5 text-sm text-slate-500">
            <span className="font-medium text-slate-700">{usuarioMap.get(item.usuario_id) || '—'}</span>
            {' '}(Mat. {guardaMatriculaMap.get(item.usuario_id) || '—'}) &middot; {guardaGraduacaoMap.get(item.usuario_id) || '—'} &middot; {fmtDateBR(item.data_operacao)} &middot; {item.horas_trabalhadas}h
            {valorHoraPorUsuario.has(item.usuario_id) && (
              <span className="ml-1.5 font-semibold text-emerald-600">
                {formatCurrency(item.horas_trabalhadas * (valorHoraPorUsuario.get(item.usuario_id) || 0))}
              </span>
            )}
          </p>
          {item.adicionado_manual && item.motivo_manual && (
            <p className="mt-1 text-xs leading-5 text-slate-500">Motivo: {item.motivo_manual}</p>
          )}
        </div>

        {item.usuario_id === user?.user_id && item.status !== 'cancelado' && !item.adicionado_manual && (
          <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => void handleCancelarCandidatura(item)}>
            Cancelar
          </Button>
        )}
      </div>
    </article>
  );

  const renderBancoHorasCard = (item: IROBancoHoras) => (
    <article key={item.id} className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-900">{usuarioMap.get(item.usuario_id) || '—'}</p>
          <p className="mt-0.5 text-sm text-slate-500">{item.descricao || item.origem || '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-amber-600">{item.horas_excedentes}h</p>
          <p className="text-xs text-slate-500">excedentes</p>
        </div>
      </div>
    </article>
  );

  const renderNotificacaoCard = (item: IRONotificacao) => (
    <article key={item.id} className={cn('rounded-[34px] border bg-white p-5 shadow-sm', !item.lida && 'border-brand-200 bg-brand-50/40')}>
      <div className="flex items-start gap-4">
        <button onClick={() => void handleMarcarLida(item)} className={cn('shrink-0 rounded-lg border p-2 transition-colors', item.lida ? 'border-slate-200 text-slate-400' : 'border-brand-200 text-brand-600')}>
          {item.lida ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn('text-sm font-semibold', !item.lida && 'text-brand-800')}>{item.titulo}</p>
            <Badge variant="outline" className={cn('rounded-full px-2 py-0 text-[10px] font-bold', NOTIFICACAO_TIPO_VARIANT[item.tipo])}>
              {NOTIFICACAO_TIPO_LABEL[item.tipo]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{item.mensagem}</p>
          <p className="mt-2 text-xs text-slate-400">{new Date(item.created_at).toLocaleString('pt-BR')}</p>
        </div>
      </div>
    </article>
  );

  const renderSectionItems = () => {
    if (loading) {
      return <div className="rounded-[22px] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Carregando...</div>;
    }

    if (activeSection === 'operacoes') {
      return filteredOperacoes.length ? filteredOperacoes.map(renderOperacaoCard) : <EmptyBox text="Nenhuma operação encontrada." />;
    }
    if (activeSection === 'candidaturas') {
      if (podeVerTudo && viewMode === 'gerenciar' && candidaturasAgrupadas.length > 0) {
        return candidaturasAgrupadas.map(({ operacao, candidaturas: opCandidaturas, stats }) => (
          <article key={operacao.id} className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{operacao.nome}</h3>
                  <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs font-bold', operacao.ativo ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500')}>
                    {operacao.ativo ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDateBR(operacao.data_inicio)} - {fmtDateBR(operacao.data_fim)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{operacao.horario_previsto.slice(0, 5)}</span>
                  <span className="flex items-center gap-1"><Hourglass className="h-3.5 w-3.5" />{operacao.horas_por_dia}h/dia</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{operacao.vagas_por_dia} vaga(s)/dia</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">{stats.total} candidatura(s)</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">{stats.confirmados} confirmado(s)/realizado(s)</span>
                  <span className={cn('rounded-full px-3 py-1 font-semibold', stats.restante > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                    {stats.restante} vaga(s) restante(s) de {stats.capacidadeTotal}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => handlePrintCandidaturas(operacao, opCandidaturas)}>
                  <Printer className="mr-1.5 h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    <th className="py-2.5 pr-3">Nome</th>
                    <th className="py-2.5 pr-3">Matrícula</th>
                    <th className="py-2.5 pr-3">Graduação</th>
                    <th className="py-2.5 pr-3">Data</th>
                    <th className="py-2.5 pr-3">Horas</th>
                    <th className="py-2.5 pr-3">Valor</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {opCandidaturas.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-slate-900">{usuarioMap.get(c.usuario_id) || '—'}</td>
                      <td className="py-2.5 pr-3 text-slate-500">{guardaMatriculaMap.get(c.usuario_id) || '—'}</td>
                      <td className="py-2.5 pr-3 text-slate-500">{guardaGraduacaoMap.get(c.usuario_id) || '—'}</td>
                      <td className="py-2.5 pr-3 text-slate-600">{fmtDateBR(c.data_operacao)}</td>
                      <td className="py-2.5 pr-3 font-medium">{c.horas_trabalhadas}h</td>
                      <td className="py-2.5 pr-3 font-medium text-emerald-600">{formatCurrency(c.horas_trabalhadas * (valorHoraPorUsuario.get(c.usuario_id) || 0))}</td>
                      <td className="py-2.5">
                        <Badge variant="outline" className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-bold', STATUS_CANDIDATURA_VARIANT[c.status])}>
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ));
      }
      return filteredCandidaturas.length ? filteredCandidaturas.map(renderCandidaturaCard) : <EmptyBox text="Nenhuma candidatura encontrada." />;
    }
    if (activeSection === 'banco-horas') {
      return filteredBancoHoras.length ? filteredBancoHoras.map(renderBancoHorasCard) : <EmptyBox text="Nenhum registro no banco de horas." />;
    }
    if (activeSection === 'notificacoes') {
      return filteredNotificacoes.length ? filteredNotificacoes.map(renderNotificacaoCard) : <EmptyBox text="Nenhuma notificação." />;
    }

    const linhasPorOperacao = (operacaoId: string) => {
      const itens = candidaturas.filter((item) => item.operacao_id === operacaoId && ['confirmado', 'realizado'].includes(item.status));
      return itens.map((item) => ({
        guarda: usuarioMap.get(item.usuario_id) || '—',
        horas: item.horas_trabalhadas,
        valor: item.horas_trabalhadas * (valorHoraPorUsuario.get(item.usuario_id) || 0),
      }));
    };

    const linhasPorMes = (mes: string) => {
      const itens = candidaturas.filter((item) => item.status !== 'cancelado' && item.data_operacao.slice(0, 7) === mes);
      const acc = new Map<string, { guarda: string; horas: number; valor: number }>();

      for (const item of itens) {
        const guarda = usuarioMap.get(item.usuario_id) || '—';
        const current = acc.get(item.usuario_id) || { guarda, horas: 0, valor: 0 };
        current.horas += item.horas_trabalhadas;
        current.valor += item.horas_trabalhadas * (valorHoraPorUsuario.get(item.usuario_id) || 0);
        acc.set(item.usuario_id, current);
      }

      return Array.from(acc.values());
    };

    return (
      <Card className="rounded-[24px] border-slate-200">
        <CardContent className="space-y-5 px-5 py-6">
          <div className="flex gap-3">
            <Button variant={relatorioTipo === 'operacao' ? 'default' : 'outline'} size="sm" onClick={() => setRelatorioTipo('operacao')}>
              Por Operação
            </Button>
            <Button variant={relatorioTipo === 'mensal' ? 'default' : 'outline'} size="sm" onClick={() => setRelatorioTipo('mensal')}>
              Por Mês
            </Button>
          </div>

          {relatorioTipo === 'operacao' ? (
            <div className="space-y-2">
              <Label>Selecione a operação</Label>
              <Select value={relatorioOperacaoId} onValueChange={setRelatorioOperacaoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolher operação..." />
                </SelectTrigger>
                <SelectContent>
                  {operacoes.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Mês / Ano</Label>
              <Input type="month" value={relatorioMes} onChange={(event) => setRelatorioMes(event.target.value)} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Formato</Label>
            <Select value={relatorioFormato} onValueChange={(value) => setRelatorioFormato(value as 'pdf' | 'xlsx')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="xlsx">Planilha (XLSX)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            disabled={(relatorioTipo === 'operacao' && !relatorioOperacaoId) || (relatorioTipo === 'mensal' && !relatorioMes)}
            onClick={() => {
              if (relatorioTipo === 'operacao') {
                const operacao = operacoes.find((item) => item.id === relatorioOperacaoId);
                if (!operacao) return;
                const linhas = linhasPorOperacao(operacao.id);
                if (linhas.length === 0) {
                  toast({ title: 'Nenhum registro', description: 'Essa operação não possui candidaturas confirmadas/realizadas.', variant: 'destructive' });
                  return;
                }
                gerarRelatorioOperacao(operacao.nome, linhas, relatorioFormato);
                toast({ title: 'Relatório gerado!' });
                return;
              }

              const [ano, mes] = relatorioMes.split('-');
              const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
              const titulo = `${meses[Number(mes) - 1]} ${ano}`;
              const linhas = linhasPorMes(relatorioMes);
              if (linhas.length === 0) {
                toast({ title: 'Nenhum registro', description: 'Nenhuma candidatura encontrada para este mês.', variant: 'destructive' });
                return;
              }
              gerarRelatorioMensal(titulo, linhas, relatorioFormato);
              toast({ title: 'Relatório gerado!' });
            }}
          >
            Gerar Relatório
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-[34px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-5 py-6 text-white sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-100/70">Guarda Municipal</p>
              <h1 className="mt-3 text-[34px] font-black tracking-[-0.08em]">IRO</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-100">Gerencie operações, candidaturas e lançamentos manuais de IRO.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => void loadData()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <StatCard label="Operações ativas" value={String(stats.operacoesAtivas)} icon={Calendar} />
            <StatCard label="Candidaturas no mês" value={String(stats.candidaturasMes)} icon={Users} />
            <StatCard label="Horas no mês" value={`${stats.horasMes}h`} icon={Clock} />
            <StatCard label="Banco de horas" value={`${stats.totalBancoHoras}h`} icon={Hourglass} />
          </div>
        </section>

        {podeVerTudo && (
          <Card className="rounded-[24px] border-slate-200">
            <CardContent className="px-5 py-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={viewMode === 'minhas' ? 'default' : 'outline'}
                  onClick={() => {
                    setViewMode('minhas');
                    setSearch('');
                    setStatusFilter('todas');
                  }}
                >
                  Minhas IROs
                </Button>
                <Button
                  variant={viewMode === 'gerenciar' ? 'default' : 'outline'}
                  onClick={() => {
                    setViewMode('gerenciar');
                    setSearch('');
                    setStatusFilter('todas');
                  }}
                >
                  Gerenciar IROs
                </Button>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {viewMode === 'minhas'
                  ? 'Veja apenas as IROs em que você mesmo se candidatou.'
                  : 'Acompanhe operações, candidaturas, banco de horas, notificações e relatórios do setor.'}
              </p>
            </CardContent>
          </Card>
        )}

        {activeSection !== 'relatorios' && (
          <Card className="rounded-[24px] border-slate-200">
            <CardContent className="space-y-4 px-5 py-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={
                      activeSection === 'operacoes'
                        ? 'Buscar operações...'
                        : activeSection === 'candidaturas'
                          ? 'Buscar candidaturas...'
                          : activeSection === 'banco-horas'
                            ? 'Buscar guardas...'
                            : 'Buscar notificações...'
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Filtrar</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sectionStatusOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between gap-3">
          {isMinhaIrosView ? (
            <div className="rounded-[26px] bg-slate-100/80 p-1.5">
              <div className="rounded-[20px] bg-white px-4 py-2.5 text-sm font-bold tracking-[-0.02em] text-slate-950 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)]">
                Minhas Candidaturas
              </div>
            </div>
          ) : (
            <div className="flex gap-1 overflow-x-auto rounded-[26px] bg-slate-100/80 p-1.5 scrollbar-none">
              {(Object.entries(sectionLabels) as [Section, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSection(key);
                    setSearch('');
                    setStatusFilter('todas');
                  }}
                  className={cn(
                    'whitespace-nowrap rounded-[20px] px-4 py-2.5 text-sm font-bold tracking-[-0.02em] transition-all',
                    section === key ? 'bg-white text-slate-950 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)]' : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  {label}
                  {key === 'notificacoes' && notifNaoLidas > 0 && <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] text-white">{notifNaoLidas}</span>}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {!isMinhaIrosView && section === 'operacoes' && canLaunchManual && (
              <Button onClick={() => setManualDialogOpen(true)} className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" />
                IROs Extras
              </Button>
            )}
            {!isMinhaIrosView && section === 'operacoes' && canManageOperacoes && (
              <Button onClick={openCreateOperacao} className="max-sm:hidden">
                <Plus className="mr-2 h-4 w-4" />
                Nova Operação
              </Button>
            )}
            {activeSection === 'notificacoes' && notifNaoLidas > 0 && (
              <Button variant="outline" size="sm" onClick={() => void handleMarcarTodasLidas()}>
                <Check className="mr-2 h-4 w-4" />
                Marcar todas lidas
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">{renderSectionItems()}</div>

        <ResponsiveDialog
          open={Boolean(selectedOperacao)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedOperacao(null);
              setOperacaoCandidaturas([]);
            }
          }}
          title={selectedOperacao?.nome || 'Detalhes da operação'}
          description={selectedOperacao ? `${fmtDateBR(selectedOperacao.data_inicio)} - ${fmtDateBR(selectedOperacao.data_fim)} • ${selectedOperacao.vagas_por_dia} vaga(s)/dia` : ''}
        >
          {selectedOperacao && (
            <div className="space-y-6 py-2">
              <section className="grid gap-4 md:grid-cols-2">
                <Info label="Horário" value={selectedOperacao.horario_previsto.slice(0, 5)} />
                <Info label="Horas por dia" value={`${selectedOperacao.horas_por_dia}h`} />
                <Info label="Tempo solicitação" value={TEMPO_SOLICITACAO_LABEL[selectedOperacao.tempo_solicitacao] || selectedOperacao.tempo_solicitacao} />
                <Info label="Status" value={selectedOperacao.ativo ? 'Ativa' : 'Inativa'} />
              </section>

              {selectedOperacao.descricao && (
                <section className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Descrição</p>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{selectedOperacao.descricao}</div>
                </section>
              )}

              {selectedOperacao.data_fim >= todayStr() ? (
                <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">Candidatar-se</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Data</Label>
                      <Input type="date" value={candidaturaData.data_operacao ?? todayStr()} onChange={(event) => setCandidaturaData((current) => ({ ...current, data_operacao: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>&nbsp;</Label>
                      <Button
                        className="w-full"
                        onClick={() => void handleCandidatar(selectedOperacao.id)}
                      >
                        Confirmar Candidatura
                      </Button>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium">Período encerrado — esta operação não aceita mais candidaturas.</span>
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">Candidaturas ({operacaoCandidaturas.length})</h3>
                {operacaoCandidaturas.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Nenhuma candidatura para esta operação.</div>
                ) : (
                  operacaoCandidaturas.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong>{usuarioMap.get(item.usuario_id) || '—'}</strong>
                          <Badge variant="outline" className={cn('rounded-full px-2 py-0 text-[10px] font-bold', STATUS_CANDIDATURA_VARIANT[item.status])}>
                            {item.status}
                          </Badge>
                          {item.adicionado_manual && (
                            <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-2 py-0 text-[10px] font-bold text-emerald-700">
                              Manual
                            </Badge>
                          )}
                          <span className="text-slate-500">
                            {fmtDateBR(item.data_operacao)} • {item.horas_trabalhadas}h
                            {valorHoraPorUsuario.has(item.usuario_id) && <span className="ml-1 font-semibold text-emerald-600">{formatCurrency(item.horas_trabalhadas * (valorHoraPorUsuario.get(item.usuario_id) || 0))}</span>}
                          </span>
                        </div>
                        {item.usuario_id === user?.user_id && item.status !== 'cancelado' && !item.adicionado_manual && (
                          <Button size="sm" variant="outline" className="h-7 border-red-200 text-xs text-red-600" onClick={() => void handleCancelarCandidatura(item)}>
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </section>
            </div>
          )}
        </ResponsiveDialog>

        <ResponsiveDialog
          open={manualDialogOpen}
          onOpenChange={handleManualDialogChange}
          title="IROs Extras"
          description="Formulário usado exclusivamente para registrar IROs que não foram possíveis de serem adicionadas pelos guardas."
        >
          <div className="space-y-6 py-2">
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Use este fluxo apenas para contingência operacional. O lançamento cria registros manuais auditáveis, envia notificação automática ao guarda e respeita o limite legal de 72h por mês.
            </section>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Selecione um Guarda</Label>
                <SearchableSelect
                  open={guardaComboboxOpen}
                  onOpenChange={setGuardaComboboxOpen}
                  value={manualForm.usuario_id}
                  onValueChange={(value) => setManualForm((current) => ({ ...current, usuario_id: value }))}
                  placeholder="Buscar por nome, matrícula ou CPF..."
                  emptyText="Nenhum guarda ativo encontrado."
                  triggerLabel={
                    selectedManualGuarda
                      ? `${selectedManualGuarda.nome} • ${selectedManualGuarda.graduacao_nome || 'Graduação'} • Mat. ${selectedManualGuarda.matricula}`
                      : 'Escolher guarda...'
                  }
                  items={guardasAtivos.map((item) => ({
                    value: item.usuario_id,
                    label: `${item.nome} ${item.matricula} ${item.cpf || ''}`,
                    render: (
                      <div className="flex min-w-0 flex-col">
                        <span className="font-medium text-slate-900">{item.nome}</span>
                        <span className="text-xs text-slate-500">
                          {item.graduacao_nome || 'Graduação'} • Mat. {item.matricula}
                          {item.cpf ? ` • CPF ${maskCpf(item.cpf)}` : ''}
                        </span>
                      </div>
                    ),
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Em qual operação</Label>
                <SearchableSelect
                  open={operacaoComboboxOpen}
                  onOpenChange={setOperacaoComboboxOpen}
                  value={manualForm.operacao_id}
                  onValueChange={(value) => setManualForm((current) => ({ ...current, operacao_id: value }))}
                  placeholder="Buscar operação por nome..."
                  emptyText="Nenhuma operação encontrada."
                  triggerLabel={
                    selectedManualOperacao
                      ? `${selectedManualOperacao.nome} • ${fmtDateBR(selectedManualOperacao.data_inicio)} - ${fmtDateBR(selectedManualOperacao.data_fim)}`
                      : 'Escolher operação...'
                  }
                  items={operacoes.map((item) => ({
                    value: item.id,
                    label: `${item.nome} ${item.data_inicio} ${item.data_fim}`,
                    render: (
                      <div className="flex min-w-0 flex-col">
                        <span className="font-medium text-slate-900">{item.nome}</span>
                        <span className="text-xs text-slate-500">
                          {fmtDateBR(item.data_inicio)} - {fmtDateBR(item.data_fim)}
                          {item.data_fim < todayStr() ? ' • Encerrada' : item.ativo ? ' • Ativa' : ' • Inativa'}
                        </span>
                      </div>
                    ),
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Quantidade de Horas</Label>
                <Input
                  type="number"
                  min="0.5"
                  max={LIMITE_IRO_MES}
                  step="0.5"
                  value={manualForm.quantidade_horas}
                  onChange={(event) => setManualForm((current) => ({ ...current, quantidade_horas: event.target.value }))}
                  placeholder="Ex.: 8"
                />
                <p className="text-xs text-slate-500">Informe a quantidade total de horas para esta IRO extra (limite de {LIMITE_IRO_MES}h por mês).</p>
              </div>

              <div className="space-y-2">
                <Label>Motivo da IRO Extra</Label>
                <Textarea
                  rows={4}
                  value={manualForm.motivo}
                  onChange={(event) => setManualForm((current) => ({ ...current, motivo: event.target.value }))}
                  placeholder="Descreva a contingência, o impedimento do registro normal e a justificativa operacional."
                />
                <p className="text-xs text-slate-500">Mínimo de 10 caracteres.</p>
              </div>
            </div>

            <section className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">Resumo Dinâmico</h3>
                  <p className="mt-1 text-xs text-slate-500">Pré-visualização técnica do lançamento antes da gravação definitiva.</p>
                </div>
                {manualPreview.valid ? (
                  <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    Pronto para salvar
                  </Badge>
                ) : (
                  <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    Revisão necessária
                  </Badge>
                )}
              </div>

              <div className="space-y-4">
                <SummaryCard
                  title="Guarda"
                  value={manualPreview.guarda?.nome || 'Não selecionado'}
                  subtitle={
                    manualPreview.guarda
                      ? `${manualPreview.guarda.graduacao_nome || 'Graduação'} • ${formatCurrency(manualPreview.guarda.valor_hora)}/h`
                      : 'Selecione um guarda ativo'
                  }
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <SummaryCard
                    title="Horas"
                    value={`${manualPreview.hoursToAdd.toFixed(2).replace('.', ',')}h`}
                    subtitle={manualPreview.hoursToAdd > 0 ? 'Lançamento manual único' : 'Informe a quantidade de horas'}
                  />
                  <SummaryCard
                    title="Valor Estimado"
                    value={formatCurrency(manualPreview.estimatedValue)}
                    subtitle={manualPreview.operacao ? `Baseado na operação "${manualPreview.operacao.nome}"` : 'Selecione uma operação'}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {manualPreview.monthSummaries.map((item) => (
                  <div key={item.monthKey} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{item.monthLabel}</p>
                        <p className="text-xs text-slate-500">
                          Já realizadas: {item.existingHours.toFixed(2).replace('.', ',')}h • Novas: {item.newHours.toFixed(2).replace('.', ',')}h • Total: {item.totalHours.toFixed(2).replace('.', ',')}h
                        </p>
                      </div>
                      <div className="min-w-[180px] space-y-2">
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={cn('h-full rounded-full transition-all', item.totalHours >= LIMITE_IRO_MES ? 'bg-red-500' : item.totalHours >= LIMITE_IRO_MES * 0.8 ? 'bg-amber-500' : 'bg-emerald-500')}
                            style={{ width: `${Math.min((item.totalHours / LIMITE_IRO_MES) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-right text-xs text-slate-500">
                          Disponível antes do lançamento: {item.availableHours.toFixed(2).replace('.', ',')}h
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {manualPreview.monthSummaries.length === 0 && <EmptyBox text="Preencha guarda, operação e horas para visualizar o resumo." compact />}
              </div>

              <div className="space-y-2">
                {selectedManualOperacao && selectedManualOperacao.data_fim < todayStr() && (
                  <WarningLine tone="amber" text="A operação selecionada já está finalizada. O lançamento será registrado como IRO retroativa." />
                )}
                {manualPreview.monthSummaries.some((item) => item.nearLimit) && (
                  <WarningLine tone="amber" text="O guarda está próximo do limite de 72h em pelo menos um dos meses afetados." />
                )}
                {manualPreview.monthSummaries.some((item) => item.exceedsLimit) && (
                  <WarningLine tone="red" text="A quantidade informada ultrapassa o limite mensal de 72h e será bloqueada no salvamento." />
                )}
                {manualPreview.errors.map((error) => (
                  <WarningLine key={error} tone="red" text={error} />
                ))}
              </div>
            </section>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleManualDialogChange(false)} disabled={manualSaving}>
                Cancelar
              </Button>
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => void handleSalvarIroManual()} disabled={!manualPreview.valid || manualSaving || manualForm.motivo.trim().length < 10}>
                {manualSaving ? 'Salvando...' : 'Salvar IRO Extra'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={operacaoDialogOpen}
          onOpenChange={(open) => {
            if (!open) resetOperacaoDialog();
            else setOperacaoDialogOpen(true);
          }}
          title={editingOperacao ? 'Editar Operação' : 'Nova Operação'}
          description="Defina os detalhes da operação IRO."
        >
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da operação</Label>
                <Input value={operacaoForm.nome ?? ''} onChange={(event) => setOperacaoForm((current) => ({ ...current, nome: event.target.value }))} placeholder="Ex: Operação Verão" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
                <Textarea rows={3} value={operacaoForm.descricao ?? ''} onChange={(event) => setOperacaoForm((current) => ({ ...current, descricao: event.target.value }))} placeholder="Descrição opcional" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Horário previsto</Label>
                <Input type="time" value={operacaoForm.horario_previsto ?? '08:00'} onChange={(event) => setOperacaoForm((current) => ({ ...current, horario_previsto: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tempo para solicitação</Label>
                <Select value={operacaoForm.tempo_solicitacao} onValueChange={(value) => setOperacaoForm((current) => ({ ...current, tempo_solicitacao: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPO_SOLICITACAO_LABEL).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Data início</Label>
                <Input type="date" min={todayStr()} value={operacaoForm.data_inicio ?? todayStr()} onChange={(event) => setOperacaoForm((current) => ({ ...current, data_inicio: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Data fim</Label>
                <Input type="date" min={todayStr()} value={operacaoForm.data_fim ?? todayStr()} onChange={(event) => setOperacaoForm((current) => ({ ...current, data_fim: event.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Vagas por dia</Label>
                <Input type="number" min={1} value={Number.isFinite(operacaoForm.vagas_por_dia) ? operacaoForm.vagas_por_dia : ''} onChange={(event) => setOperacaoForm((current) => ({ ...current, vagas_por_dia: Number(event.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Horas por dia</Label>
                <Input type="number" min={0.5} step={0.5} value={Number.isFinite(operacaoForm.horas_por_dia) ? operacaoForm.horas_por_dia : ''} onChange={(event) => setOperacaoForm((current) => ({ ...current, horas_por_dia: Number(event.target.value) }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetOperacaoDialog}>
                Cancelar
              </Button>
              <Button onClick={() => void handleSaveOperacao()}>{editingOperacao ? 'Salvar' : 'Criar Operação'}</Button>
            </div>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog open={deleteConfirmOpen} onOpenChange={(open) => !open && setDeleteConfirmOpen(false)} title="Excluir operação" description="Esta ação é irreversível.">
          <div className="space-y-6 py-2">
            <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="shrink-0 rounded-xl bg-red-100 p-2.5 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-bold text-red-800">Você está prestes a excluir permanentemente a operação:</p>
                <p className="font-semibold text-red-700">"{operacaoToDelete?.nome}"</p>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">Avisos importantes</p>
              <ul className="space-y-2 text-sm text-amber-900">
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  Todas as candidaturas vinculadas a esta operação serão excluídas permanentemente.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  Os registros de banco de horas relacionados serão desvinculados.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  Esta operação não poderá ser recuperada após a exclusão.
                </li>
              </ul>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 select-none">
              <input type="checkbox" checked={deleteConfirmChecked} onChange={(event) => setDeleteConfirmChecked(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-red-600" />
              <span className="text-sm leading-5 text-slate-700">Eu entendi as consequências e desejo excluir permanentemente esta operação.</span>
            </label>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setOperacaoToDelete(null);
                  setDeleteConfirmChecked(false);
                }}
              >
                Cancelar
              </Button>
              <Button disabled={!deleteConfirmChecked} className={deleteConfirmChecked ? 'bg-red-600 text-white hover:bg-red-700' : ''} onClick={() => void handleDeleteOperacao()}>
                <Trash2 className="mr-2 h-4 w-4" />
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        </ResponsiveDialog>
      </div>

      {section === 'operacoes' && canManageOperacoes && (
        <button onClick={openCreateOperacao} className="fixed bottom-24 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_28px_-6px_rgba(37,99,235,0.55)] transition-all active:scale-90 sm:hidden">
          <Plus className="h-7 w-7" />
        </button>
      )}

      <ResponsiveDialog
        open={candidaturaResultadoAberto}
        onOpenChange={(open) => { if (!open) { setCandidaturaResultadoAberto(false); setCandidaturaResultado(null); } }}
        title={candidaturaResultado?.sucesso ? 'Inscrição realizada' : 'Inscrição não realizada'}
        description={candidaturaResultado?.sucesso ? 'Sua candidatura foi registrada com sucesso.' : 'Não foi possível completar sua inscrição.'}
      >
        <div className="space-y-5 py-2">
          <div className={cn('flex flex-col items-center gap-3 rounded-2xl p-6 text-center', candidaturaResultado?.sucesso ? 'bg-emerald-50' : 'bg-red-50')}>
            {candidaturaResultado?.sucesso ? (
              <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            ) : (
              <X className="h-14 w-14 text-red-500" />
            )}
            <div>
              <p className={cn('text-lg font-bold', candidaturaResultado?.sucesso ? 'text-emerald-800' : 'text-red-800')}>
                {candidaturaResultado?.mensagem || (candidaturaResultado?.sucesso ? 'Candidatura realizada!' : 'Erro ao candidatar')}
              </p>
              {candidaturaResultado?.sucesso && candidaturaResultado?.operacaoNome && (
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-700">Operação:</span> {candidaturaResultado.operacaoNome}</p>
                  <p><span className="font-semibold text-slate-700">Data:</span> {fmtDateBR(candidaturaResultado.dataOperacao || '')}</p>
                  <p><span className="font-semibold text-slate-700">Horas:</span> {candidaturaResultado.horas}h/dia</p>
                  {candidaturaResultado.totalMes !== undefined && (
                    <p className="pt-1 text-emerald-700"><span className="font-semibold">Total no mês:</span> {candidaturaResultado.totalMes}h</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <Button className="w-full" onClick={() => { setCandidaturaResultadoAberto(false); setCandidaturaResultado(null); }}>
            {candidaturaResultado?.sucesso ? 'OK, entendi' : 'Fechar'}
          </Button>
        </div>
      </ResponsiveDialog>

      {confirmDialog}
    </AdminLayout>
  );
};

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Calendar }) {
  return (
    <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">{value}</p>
        </div>
        <div className="rounded-[18px] bg-white/15 p-3 text-white">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{title}</p>
      <p className="mt-2 text-lg font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
    </div>
  );
}

function WarningLine({ tone, text }: { tone: 'amber' | 'red'; text: string }) {
  return (
    <div className={cn('flex items-start gap-2 rounded-2xl px-3 py-2 text-sm', tone === 'red' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800')}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function SearchableSelect({
  open,
  onOpenChange,
  value,
  onValueChange,
  triggerLabel,
  placeholder,
  emptyText,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  triggerLabel: string;
  placeholder: string;
  emptyText: string;
  items: Array<{ value: string; label: string; render: ReactNode }>;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="h-auto w-full justify-between py-3 text-left font-normal">
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  onSelect={() => {
                    onValueChange(item.value);
                    onOpenChange(false);
                  }}
                  className="gap-2"
                >
                  <CheckCircle2 className={cn('h-4 w-4 shrink-0', value === item.value ? 'opacity-100 text-emerald-600' : 'opacity-0')} />
                  {item.render}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function EmptyBox({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={cn('rounded-2xl border border-dashed border-slate-300 bg-white text-center text-sm text-slate-500', compact ? 'px-4 py-5' : 'px-4 py-8')}>
      {text}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default GuardaMunicipalIros;
