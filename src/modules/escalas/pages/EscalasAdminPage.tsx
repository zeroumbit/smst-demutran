import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { addDays, endOfDay, format, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CalendarDays, CheckCircle2, FileDown, FileText, History, MapPin, Plus, Printer, Search, Settings2, Shield, Shuffle, Trash2, Users, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { escalasService } from '../services/escalas.service';
import { useEscalas, useEscalasApoio, useEscalasHistorico, useEscalasMutations, useEscalasTrocas } from '../hooks/useEscalas';
import type { GuardaEscala, GuardaEscalaAgente, GuardaEscalaAgenteDraft, GuardaEscalaPayload, GuardaEscalaPosto, GuardaEscalaTipoServico, GuardaEscalaTroca, RecorrenciaTipo } from '../types/escalas.types';
import { formatDate, formatDateTime, formatTime, fromDatetimeLocal, getEscalaStatusCalculado, statusClassName, statusLabels, toDatetimeLocal, trocaStatusLabels } from '../utils/escalas.formatters';

type DialogMode = 'escala' | 'agente' | 'viatura' | 'cancelar' | 'tipo' | 'posto' | 'troca-decisao' | null;

const defaultEscalaForm = (): GuardaEscalaPayload => {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 6 * 60 * 60 * 1000);
  return {
    titulo: '',
    tipo_servico_id: null,
    descricao: '',
    observacoes: '',
    data_inicio: start.toISOString(),
    data_fim: end.toISOString(),
    posto_id: null,
    local_texto: '',
    ponto_apresentacao: '',
    area_atuacao: '',
    equipe_id: null,
    grupamento: '',
    recorrencia_tipo: 'NAO_REPETIR',
    recorrencia_config: {},
  };
};

const funcoes = ['Comandante', 'Subcomandante', 'Motorista', 'Patrulheiro', 'Operador', 'Supervisor', 'Fiscal', 'Apoio', 'Outro'];
const diasSemana = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sab' },
  { value: 7, label: 'Dom' },
];

const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const escalaMonthKey = (escala: GuardaEscala) => format(new Date(escala.data_inicio), 'yyyy-MM');
const escalaMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR });
};

type EscalasEquipeGroup = {
  key: string;
  label: string;
  items: GuardaEscala[];
};

type EscalasMonthGroup = {
  key: string;
  label: string;
  total: number;
  equipes: EscalasEquipeGroup[];
};

export default function EscalasAdminPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeEscalaId = useMemo(() => {
    const match = location.pathname.match(/\/escalas\/([0-9a-f-]{36})(?:\/editar)?$/i);
    return match?.[1] ?? null;
  }, [location.pathname]);
  const { data: escalas = [], isLoading } = useEscalas();
  const { data: trocas = [] } = useEscalasTrocas();
  const apoio = useEscalasApoio();
  const mutations = useEscalasMutations();

  const [query, setQuery] = useState('');
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedId, setSelectedId] = useState<string | null>(routeEscalaId);
  const [editingEscala, setEditingEscala] = useState<GuardaEscala | null>(null);
  const [escalaForm, setEscalaForm] = useState<GuardaEscalaPayload>(defaultEscalaForm);
  const [agenteForm, setAgenteForm] = useState({ guarda_id: '', funcao: 'Patrulheiro', observacao: '', conflito_autorizado: false, motivo_conflito: '' });
  const [viaturaForm, setViaturaForm] = useState({ veiculo_id: '', agente_id: 'none', observacao: '' });
  const [draftAgents, setDraftAgents] = useState<GuardaEscalaAgenteDraft[]>([]);
  const [draftViaturaId, setDraftViaturaId] = useState<string | null>(null);
  const [draftAgentToAdd, setDraftAgentToAdd] = useState('');
  const [draftConflicts, setDraftConflicts] = useState<Record<string, any[]>>({});
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [submitAction, setSubmitAction] = useState<'draft' | 'publish'>('draft');
  const [configForm, setConfigForm] = useState<Partial<GuardaEscalaTipoServico & GuardaEscalaPosto>>({ nome: '', descricao: '', ativo: true });
  const [cancelReason, setCancelReason] = useState('');
  const [decisionTroca, setDecisionTroca] = useState<{ troca: GuardaEscalaTroca; aprovar: boolean } | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [conflict, setConflict] = useState<any[] | null>(null);
  const [novaRouteHandled, setNovaRouteHandled] = useState(false);

  const selectedEscala = useMemo(() => {
    if (!escalas.length) return null;
    return escalas.find((escala) => escala.id === (selectedId ?? routeEscalaId)) ?? escalas[0] ?? null;
  }, [escalas, selectedId, routeEscalaId]);

  const { data: historico = [] } = useEscalasHistorico(selectedEscala?.id);

  const path = location.pathname;
  const view =
    path.includes('/calendario') ? 'calendario' :
    path.includes('/nova') ? 'nova' :
    path.includes('/trocas') ? 'trocas' :
    path.includes('/postos') ? 'postos' :
    path.includes('/tipos-servico') ? 'tipos' :
    path.includes('/historico') ? 'historico' :
    routeEscalaId ? 'detalhe' :
    'dashboard';

  const filteredEscalas = useMemo(() => {
    const term = normalize(query.trim());
    return escalas.filter((escala) => {
      const text = normalize(`${escala.titulo} ${escala.local_texto ?? ''} ${escala.tipo_servico?.nome ?? ''} ${escala.posto?.nome ?? ''} ${escala.equipe?.nome ?? ''} ${escala.grupamento ?? ''}`);
      return !term || text.includes(term);
    });
  }, [escalas, query]);

  const escalasGroupedByMonthAndTeam = useMemo<EscalasMonthGroup[]>(() => {
    const months = new Map<string, Map<string, EscalasEquipeGroup>>();

    for (const escala of filteredEscalas) {
      const monthKey = escalaMonthKey(escala);
      const teamKey = escala.equipe_id ?? `sem-equipe-${escala.grupamento || 'geral'}`;
      const teamLabel = escala.equipe?.nome ?? escala.grupamento ?? 'Sem equipe definida';
      const teams = months.get(monthKey) ?? new Map<string, EscalasEquipeGroup>();
      const team = teams.get(teamKey) ?? { key: teamKey, label: teamLabel, items: [] };
      team.items.push(escala);
      teams.set(teamKey, team);
      months.set(monthKey, teams);
    }

    return Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, teams]) => {
        const equipes = Array.from(teams.values())
          .map((team) => ({
            ...team,
            items: team.items.sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime()),
          }))
          .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

        return {
          key,
          label: escalaMonthLabel(key),
          total: equipes.reduce((sum, team) => sum + team.items.length, 0),
          equipes,
        };
      });
  }, [filteredEscalas]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const emServico = escalas.reduce((sum, escala) => sum + (getEscalaStatusCalculado(escala) === 'EM_ANDAMENTO' ? (escala.agentes?.length ?? 0) : 0), 0);
    const escaladosHoje = escalas
      .filter((escala) => escala.status === 'PUBLICADA' && new Date(escala.data_inicio) <= todayEnd && new Date(escala.data_fim) >= todayStart)
      .reduce((sum, escala) => sum + (escala.agentes?.length ?? 0), 0);
    const futuras = escalas.filter((escala) => escala.status === 'PUBLICADA' && new Date(escala.data_inicio) > now).length;
    const rascunho = escalas.filter((escala) => escala.status === 'RASCUNHO').length;
    const trocasPendentes = trocas.filter((troca) => troca.status === 'AGUARDANDO_APROVACAO').length;
    const cienciasPendentes = escalas
      .filter((escala) => escala.status === 'PUBLICADA' && new Date(escala.data_inicio) > now)
      .reduce((sum, escala) => sum + Math.max(0, (escala.agentes?.length ?? 0) - (escala.ciencias?.filter((ciencia) => ciencia.confirmado_em).length ?? 0)), 0);
    return { emServico, escaladosHoje, futuras, rascunho, trocasPendentes, cienciasPendentes };
  }, [escalas, trocas]);

  const openEscalaForm = (escala?: GuardaEscala | null) => {
    setEditingEscala(escala ?? null);
    setDraftAgents((escala?.agentes ?? []).map((agente) => ({ guarda_id: agente.guarda_id, funcao: agente.funcao, observacao: agente.observacao })));
    setDraftViaturaId(escala?.viaturas?.[0]?.veiculo_id ?? null);
    setDraftAgentToAdd('');
    setDraftConflicts({});
    setShowAdditionalInfo(Boolean(escala?.titulo || escala?.local_texto || escala?.descricao || escala?.observacoes));
    setEscalaForm(escala ? {
      titulo: escala.titulo,
      tipo_servico_id: escala.tipo_servico_id,
      descricao: escala.descricao ?? '',
      observacoes: escala.observacoes ?? '',
      data_inicio: escala.data_inicio,
      data_fim: escala.data_fim,
      posto_id: escala.posto_id,
      local_texto: escala.local_texto ?? '',
      ponto_apresentacao: escala.ponto_apresentacao ?? '',
      area_atuacao: escala.area_atuacao ?? '',
      equipe_id: escala.equipe_id,
      grupamento: escala.grupamento ?? '',
      recorrencia_tipo: escala.recorrencia_tipo,
      recorrencia_config: escala.recorrencia_config ?? {},
    } : defaultEscalaForm());
    setDialogMode('escala');
  };

  const updateRecorrenciaConfig = (key: string, value: unknown) => {
    setEscalaForm((current) => ({
      ...current,
      recorrencia_config: {
        ...(current.recorrencia_config ?? {}),
        [key]: value,
      },
    }));
  };

  const toggleDiaSemana = (dia: number) => {
    const current = Array.isArray(escalaForm.recorrencia_config?.dias_semana)
      ? (escalaForm.recorrencia_config?.dias_semana as number[])
      : [];
    const next = current.includes(dia) ? current.filter((item) => item !== dia) : [...current, dia].sort((a, b) => a - b);
    updateRecorrenciaConfig('dias_semana', next);
  };

  const getGeneratedTitle = () => {
    const tipo = apoio.tipos.data?.find((item) => item.id === escalaForm.tipo_servico_id)?.nome ?? 'Servico';
    const equipe = apoio.equipes.data?.find((item) => item.id === escalaForm.equipe_id)?.nome ?? 'Equipe';
    return `${tipo} - ${equipe} - ${formatDate(escalaForm.data_inicio)}`;
  };

  const getEscalaPayloadForSubmit = (): GuardaEscalaPayload => ({
    ...escalaForm,
    titulo: escalaForm.titulo.trim() || getGeneratedTitle(),
    ponto_apresentacao: null,
    area_atuacao: null,
    grupamento: null,
    recorrencia_tipo: escalaForm.recorrencia_tipo === 'PERSONALIZADO' ? 'DIAS_SEMANA' : escalaForm.recorrencia_tipo,
  });

  const validateEscalaForm = (publish: boolean) => {
    if (!escalaForm.tipo_servico_id) {
      toast.error('Selecione o tipo de servico.');
      return false;
    }
    if (new Date(escalaForm.data_fim) <= new Date(escalaForm.data_inicio)) {
      toast.error('A data de termino precisa ser posterior ao inicio.');
      return false;
    }
    if (publish && draftAgents.length === 0) {
      toast.error('Adicione ao menos um agente para publicar a escala.');
      return false;
    }
    if (Object.values(draftConflicts).some((items) => items.length > 0)) {
      toast.error('Resolva os conflitos de horario antes de salvar a escala.');
      return false;
    }
    return true;
  };

  const addDraftAgent = (guardaId: string, funcao = 'Patrulheiro') => {
    if (!guardaId || draftAgents.some((agente) => agente.guarda_id === guardaId)) return;
    setDraftAgents((current) => [...current, { guarda_id: guardaId, funcao, observacao: null }]);
  };

  const handleEquipeChange = async (value: string) => {
    const equipeId = value === 'none' ? null : value;
    setEscalaForm((current) => ({ ...current, equipe_id: equipeId }));
    if (!equipeId) return;

    try {
      const membros = await escalasService.listEquipeMembros(equipeId);
      setDraftAgents((current) => {
        const existing = new Set(current.map((agente) => agente.guarda_id));
        const next = membros
          .filter((guardaId) => !existing.has(guardaId))
          .map((guardaId) => ({ guarda_id: guardaId, funcao: 'Patrulheiro', observacao: null }));
        return [...current, ...next];
      });
      toast.success('Agentes da equipe adicionados a esta escala.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel carregar os agentes da equipe.');
    }
  };

  useEffect(() => {
    if (dialogMode !== 'escala' || draftAgents.length === 0) {
      setDraftConflicts({});
      return;
    }
    if (!escalaForm.data_inicio || !escalaForm.data_fim || new Date(escalaForm.data_fim) <= new Date(escalaForm.data_inicio)) return;

    let cancelled = false;
    const loadConflicts = async () => {
      const entries = await Promise.all(draftAgents.map(async (agente) => {
        const conflitos = await escalasService.detectarConflitos(agente.guarda_id, escalaForm.data_inicio, escalaForm.data_fim, editingEscala?.id ?? null);
        return [agente.guarda_id, conflitos] as const;
      }));
      if (!cancelled) setDraftConflicts(Object.fromEntries(entries));
    };

    loadConflicts().catch(() => {
      if (!cancelled) setDraftConflicts({});
    });

    return () => {
      cancelled = true;
    };
  }, [dialogMode, draftAgents, escalaForm.data_inicio, escalaForm.data_fim, editingEscala?.id]);

  useEffect(() => {
    if (view === 'nova' && !novaRouteHandled) {
      setNovaRouteHandled(true);
      openEscalaForm(null);
    }

    if (view !== 'nova' && novaRouteHandled) {
      setNovaRouteHandled(false);
    }
  }, [view, novaRouteHandled]);

  const saveEscala = async (event: FormEvent) => {
    event.preventDefault();
    const publish = submitAction === 'publish';
    if (!validateEscalaForm(publish)) return;

    try {
      const payload = getEscalaPayloadForSubmit();
      if (editingEscala) {
        const escala = await mutations.updateEscala.mutateAsync({ id: editingEscala.id, payload });
        setSelectedId(escala.id);
        setDialogMode(null);
        toast.success('Escala atualizada.');
        navigate(`/admin/guardas/guarda-municipal/escalas/${escala.id}`);
        return;
      }

      const result = await mutations.createEscalaCompleta.mutateAsync({
        escala: payload,
        agentes: draftAgents,
        viatura_id: draftViaturaId,
        publicar: publish,
      });

      setSelectedId(result.escala.id);
      setDialogMode(null);
      if (publish) {
        if (result.geradas > 0) {
          toast.success(`Escala publicada com sucesso. Foram criadas ${result.geradas} escalas recorrentes.`);
        } else {
          toast.success('Escala criada e publicada com sucesso.');
        }
      } else {
        toast.success(result.geradas > 0 ? `Rascunho salvo com ${result.geradas} recorrencia(s).` : 'Escala salva como rascunho.');
      }
      navigate(`/admin/guardas/guarda-municipal/escalas/${result.escala.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel salvar a escala.');
    }
  };

  const addEquipe = async () => {
    if (!selectedEscala?.equipe_id) {
      toast.error('Selecione uma equipe na escala.');
      return;
    }
    const membros = await escalasService.listEquipeMembros(selectedEscala.equipe_id);
    for (const guardaId of membros) {
      const already = selectedEscala.agentes?.some((agente) => agente.guarda_id === guardaId);
      if (!already) {
        await mutations.addAgente.mutateAsync({ escala_id: selectedEscala.id, guarda_id: guardaId, funcao: 'Patrulheiro', conflito_autorizado: true, motivo_conflito: 'Adicionado em lote pela equipe' });
      }
    }
    toast.success('Integrantes da equipe adicionados.');
  };

  const addAgente = async (authorize = false) => {
    if (!selectedEscala || !agenteForm.guarda_id) return;
    const result = await mutations.addAgente.mutateAsync({
      escala_id: selectedEscala.id,
      guarda_id: agenteForm.guarda_id,
      funcao: agenteForm.funcao,
      observacao: agenteForm.observacao || null,
      conflito_autorizado: authorize || agenteForm.conflito_autorizado,
      motivo_conflito: agenteForm.motivo_conflito || null,
    });
    if (!result.sucesso && result.codigo === 'CONFLITO') {
      setConflict((result.conflitos as any[]) ?? []);
      return;
    }
    setDialogMode(null);
    setConflict(null);
    setAgenteForm({ guarda_id: '', funcao: 'Patrulheiro', observacao: '', conflito_autorizado: false, motivo_conflito: '' });
    toast.success(result.mensagem || 'Agente adicionado.');
  };

  const publicar = async () => {
    if (!selectedEscala) return;
    const result = await mutations.publicar.mutateAsync(selectedEscala.id);
    if (result.sucesso) toast.success(result.mensagem);
    else toast.error(result.mensagem);
  };

  const gerarRecorrencias = async () => {
    if (!selectedEscala) return;
    const result = await mutations.gerarRecorrencias.mutateAsync(selectedEscala.id);
    if (result.sucesso) toast.success(`${result.mensagem} Geradas: ${result.geradas ?? 0}.`);
    else toast.error(result.mensagem);
  };

  const cancelar = async () => {
    if (!selectedEscala) return;
    const result = await mutations.cancelar.mutateAsync({ id: selectedEscala.id, motivo: cancelReason });
    if (result.sucesso) toast.success(result.mensagem);
    else toast.error(result.mensagem);
    setDialogMode(null);
    setCancelReason('');
  };

  const exportPdf = () => {
    if (!selectedEscala) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('GUARDA MUNICIPAL DE CANINDE', 14, 18);
    doc.setFontSize(12);
    doc.text('ESCALA DE SERVICO', 14, 26);
    doc.setFontSize(10);
    doc.text(selectedEscala.titulo, 14, 36);
    doc.text(`Periodo: ${formatDateTime(selectedEscala.data_inicio)} ate ${formatDateTime(selectedEscala.data_fim)}`, 14, 44);
    doc.text(`Tipo: ${selectedEscala.tipo_servico?.nome ?? '-'}`, 14, 52);
    doc.text(`Local: ${selectedEscala.posto?.nome ?? selectedEscala.local_texto ?? '-'}`, 14, 60);
    autoTable(doc, {
      startY: 70,
      head: [['Matricula', 'Guarda', 'Funcao', 'Observacao']],
      body: (selectedEscala.agentes ?? []).map((agente) => [agente.guarda?.matricula ?? '-', agente.guarda?.nome ?? '-', agente.funcao, agente.observacao ?? '-']),
    });
    doc.save(`escala-${selectedEscala.titulo}.pdf`);
  };

  const exportExcel = () => {
    const rows = filteredEscalas.flatMap((escala) => (escala.agentes?.length ? escala.agentes : [null]).map((agente) => ({
      escala: escala.titulo,
      status: statusLabels[getEscalaStatusCalculado(escala)],
      inicio: formatDateTime(escala.data_inicio),
      fim: formatDateTime(escala.data_fim),
      tipo: escala.tipo_servico?.nome ?? '',
      local: escala.posto?.nome ?? escala.local_texto ?? '',
      guarda: agente?.guarda?.nome ?? '',
      matricula: agente?.guarda?.matricula ?? '',
      funcao: agente?.funcao ?? '',
    })));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Escalas');
    XLSX.writeFile(workbook, 'escalas-guarda.xlsx');
  };

  const saveConfig = async () => {
    if (!configForm.nome?.trim()) return;
    if (dialogMode === 'tipo') {
      await mutations.saveTipo.mutateAsync(configForm as GuardaEscalaTipoServico);
      toast.success('Tipo de servico salvo.');
    }
    if (dialogMode === 'posto') {
      await mutations.savePosto.mutateAsync(configForm as GuardaEscalaPosto);
      toast.success('Posto salvo.');
    }
    setDialogMode(null);
    setConfigForm({ nome: '', descricao: '', ativo: true });
  };

  const decideTroca = async () => {
    if (!decisionTroca) return;
    const result = await mutations.aprovarTroca.mutateAsync({ id: decisionTroca.troca.id, aprovar: decisionTroca.aprovar, motivo: decisionReason });
    if (result.sucesso) toast.success(result.mensagem);
    else toast.error(result.mensagem);
    setDecisionTroca(null);
    setDecisionReason('');
    setDialogMode(null);
  };

  const navItems = [
    ['dashboard', 'Visao Geral', '/admin/guardas/guarda-municipal/escalas'],
    ['calendario', 'Calendario', '/admin/guardas/guarda-municipal/escalas/calendario'],
    ['nova', 'Criar Escala', '/admin/guardas/guarda-municipal/escalas/nova'],
    ['trocas', 'Trocas', '/admin/guardas/guarda-municipal/escalas/trocas'],
    ['postos', 'Postos', '/admin/guardas/guarda-municipal/escalas/postos'],
    ['tipos', 'Tipos', '/admin/guardas/guarda-municipal/escalas/tipos-servico'],
    ['historico', 'Historico', '/admin/guardas/guarda-municipal/escalas/historico'],
  ] as const;

  const today = new Date();
  const todayEscalas = escalas.filter((escala) => isSameDay(new Date(escala.data_inicio), today));
  const tomorrowEscalas = escalas.filter((escala) => isSameDay(new Date(escala.data_inicio), addDays(today, 1)));
  const weekEscalas = escalas.filter((escala) => new Date(escala.data_inicio) >= today && new Date(escala.data_inicio) <= addDays(today, 7));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-4 py-5 text-white md:rounded-[34px] md:px-6 md:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-sky-100/70 md:text-[11px]">Guarda Municipal</p>
              <h1 className="mt-2 text-xl font-black tracking-[-0.05em] sm:text-2xl md:mt-3 md:text-[34px] md:tracking-[-0.08em]">Escalas de Servico</h1>
              <p className="mt-1.5 hidden max-w-3xl text-[13px] leading-5 text-slate-100 md:block md:mt-2 md:text-sm md:leading-6">Gestao oficial de escalas, publicacao, ciencia, viaturas, equipes e trocas de servico.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportExcel} className="h-9 border-white/20 bg-white/10 text-xs text-white hover:bg-white/20 md:h-10 md:text-sm"><FileDown className="mr-1.5 h-4 w-4" />Excel</Button>
              <Button size="sm" onClick={() => openEscalaForm(null)} className="h-9 gap-1.5 text-xs md:h-10 md:text-sm md:gap-2"><Plus className="h-4 w-4" />Nova escala</Button>
            </div>
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto native-scrollbar snap-x-mandatory md:grid md:grid-cols-2 xl:grid-cols-6 md:mt-6 md:overflow-x-visible">
            <StatCardEscalas label="Em servico agora" value={String(stats.emServico)} icon={Shield} />
            <StatCardEscalas label="Escalados hoje" value={String(stats.escaladosHoje)} icon={Users} />
            <StatCardEscalas label="Proximos servicos" value={String(stats.futuras)} icon={CalendarDays} />
            <StatCardEscalas label="Rascunhos" value={String(stats.rascunho)} icon={FileText} />
            <StatCardEscalas label="Trocas aprovacao" value={String(stats.trocasPendentes)} icon={Shuffle} />
            <StatCardEscalas label="Ciencias pendentes" value={String(stats.cienciasPendentes)} icon={CheckCircle2} />
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex overflow-x-auto rounded-[26px] bg-slate-100/80 p-1.5 scrollbar-none">
            {navItems.filter(([key]) => key !== 'nova').map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  const target = navItems.find((item) => item[0] === key)?.[2] ?? navItems[0][2];
                  navigate(target);
                }}
                className={`whitespace-nowrap rounded-[20px] px-4 py-2.5 text-sm font-bold tracking-[-0.02em] transition-all ${
                  (view === 'detalhe' ? 'dashboard' : view) === key
                    ? 'bg-white text-slate-950 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)]'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => openEscalaForm(null)} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            Nova
          </Button>
        </div>

        {view === 'dashboard' && (
          <>
            <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
              <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Escalas</h3>
                  <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 transition focus-within:border-brand-500/50 focus-within:ring-2 focus-within:ring-brand-500/20">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar escala" className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" />
                  </div>
                </div>
                <EscalasAgrupadasList
                  groups={escalasGroupedByMonthAndTeam}
                  isLoading={isLoading}
                  selectedId={selectedEscala?.id ?? null}
                  onSelect={(escala) => {
                    setSelectedId(escala.id);
                    navigate(`/admin/guardas/guarda-municipal/escalas/${escala.id}`);
                  }}
                />
              </div>

              {selectedEscala ? (
                <EscalaDetalhe
                  escala={selectedEscala}
                  onEdit={() => openEscalaForm(selectedEscala)}
                  onPublish={publicar}
                  onCancel={() => setDialogMode('cancelar')}
                  onDelete={() => mutations.deleteDraft.mutateAsync(selectedEscala.id).then(() => toast.success('Rascunho excluido.'))}
                  onAddAgente={() => setDialogMode('agente')}
                  onAddEquipe={addEquipe}
                  onRemoveAgente={(agente) => mutations.removeAgente.mutateAsync(agente.id)}
                  onAddViatura={() => setDialogMode('viatura')}
                  onRemoveViatura={(viaturaId) => mutations.removeViatura.mutateAsync(viaturaId)}
                  onPdf={exportPdf}
                  onGerarRecorrencias={gerarRecorrencias}
                  historico={historico}
                />
              ) : (
                <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm"><div className="py-16 text-center text-sm text-slate-500">Nenhuma escala selecionada.</div></div>
              )}
            </div>

            <ResumoListas hoje={todayEscalas} amanha={tomorrowEscalas} semana={weekEscalas} />
          </>
        )}

        {view === 'calendario' && <CalendarioView escalas={filteredEscalas} query={query} setQuery={setQuery} />}
        {view === 'trocas' && <TrocasView trocas={trocas} onDecision={(troca, aprovar) => { setDecisionTroca({ troca, aprovar }); setDialogMode('troca-decisao'); }} />}
        {view === 'postos' && <ConfigView title="Postos e Locais" items={apoio.postos.data ?? []} icon={MapPin} onCreate={() => { setConfigForm({ nome: '', descricao: '', ativo: true }); setDialogMode('posto'); }} onEdit={(item) => { setConfigForm(item); setDialogMode('posto'); }} />}
        {view === 'tipos' && <ConfigView title="Tipos de Servico" items={apoio.tipos.data ?? []} icon={Settings2} onCreate={() => { setConfigForm({ nome: '', descricao: '', ativo: true, cor: '#2563eb', ordem: 0 }); setDialogMode('tipo'); }} onEdit={(item) => { setConfigForm(item); setDialogMode('tipo'); }} />}
        {view === 'historico' && (
          <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Historico geral</h3>
            <div className="mt-4 space-y-2">
              {historico.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Nenhum registro de historico.</div> : historico.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-bold text-slate-900">{item.acao.replaceAll('_', ' ')}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
                  </div>
                  {item.descricao && <p className="mt-1 text-sm text-slate-500">{item.descricao}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

      <Dialog open={dialogMode === 'escala'} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="max-h-[calc(100dvh-var(--safe-area-top)-var(--safe-area-bottom)-2rem)] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEscala ? 'Editar escala' : 'Criar escala'}</DialogTitle>
            <DialogDescription>A escala nasce como rascunho e so aparece para os guardas apos publicacao.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveEscala} className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Servico</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Field label="Tipo de servico">
                <Select value={escalaForm.tipo_servico_id ?? 'none'} onValueChange={(value) => setEscalaForm((current) => ({ ...current, tipo_servico_id: value === 'none' ? null : value }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>{(apoio.tipos.data ?? []).filter((tipo) => tipo.ativo).map((tipo) => <SelectItem key={tipo.id} value={tipo.id}>{tipo.nome}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Posto principal">
                <Select value={escalaForm.posto_id ?? 'none'} onValueChange={(value) => setEscalaForm((current) => ({ ...current, posto_id: value === 'none' ? null : value }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o posto" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Sem posto</SelectItem>{(apoio.postos.data ?? []).filter((posto) => posto.ativo).map((posto) => <SelectItem key={posto.id} value={posto.id}>{posto.nome}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Equipe escalada</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <Field label="Equipe">
                  <Select value={escalaForm.equipe_id ?? 'none'} onValueChange={handleEquipeChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione a equipe" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Sem equipe</SelectItem>{(apoio.equipes.data ?? []).map((equipe) => <SelectItem key={equipe.id} value={equipe.id}>{equipe.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Adicionar agente">
                  <Select value={draftAgentToAdd} onValueChange={setDraftAgentToAdd}>
                    <SelectTrigger><SelectValue placeholder="Selecione um agente" /></SelectTrigger>
                    <SelectContent>{(apoio.guardas.data ?? []).filter((guarda) => !draftAgents.some((agente) => agente.guarda_id === guarda.id)).map((guarda) => <SelectItem key={guarda.id} value={guarda.id}>{guarda.nome} - {guarda.matricula}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Button type="button" variant="outline" onClick={() => { addDraftAgent(draftAgentToAdd); setDraftAgentToAdd(''); }}>Adicionar</Button>
              </div>

              <div className="mt-3 space-y-2">
                {draftAgents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">Nenhum agente selecionado.</div>
                ) : draftAgents.map((agente) => {
                  const guarda = apoio.guardas.data?.find((item) => item.id === agente.guarda_id);
                  const conflitos = draftConflicts[agente.guarda_id] ?? [];
                  return (
                    <div key={agente.guarda_id} className={cn('rounded-xl border px-3 py-3', conflitos.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50')}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{guarda?.nome ?? 'Guarda selecionado'}</p>
                          <p className="text-xs text-slate-500">Mat. {guarda?.matricula ?? '-'} - {agente.funcao}</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => setDraftAgents((current) => current.filter((item) => item.guarda_id !== agente.guarda_id))}>
                          <Trash2 className="mr-1.5 h-4 w-4" />Remover
                        </Button>
                      </div>
                      {conflitos.length > 0 && (
                        <div className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-xs text-amber-800">
                          <p className="font-bold">Atencao: este guarda ja possui outra escala neste horario.</p>
                          {conflitos.slice(0, 2).map((item) => <p key={item.escala_id}>{item.titulo} - {formatDateTime(item.data_inicio)}</p>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
              <div className="md:col-span-3"><h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Viatura e horario</h3></div>
              <Field label="Viatura">
                <Select value={draftViaturaId ?? 'none'} onValueChange={(value) => setDraftViaturaId(value === 'none' ? null : value)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a viatura" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Sem viatura</SelectItem>{(apoio.viaturas.data ?? []).map((veiculo) => <SelectItem key={veiculo.id} value={veiculo.id}>{veiculo.prefixo} - {veiculo.placa}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Inicio"><Input type="datetime-local" value={toDatetimeLocal(escalaForm.data_inicio)} onChange={(event) => setEscalaForm((current) => ({ ...current, data_inicio: fromDatetimeLocal(event.target.value) }))} /></Field>
              <Field label="Termino"><Input type="datetime-local" value={toDatetimeLocal(escalaForm.data_fim)} onChange={(event) => setEscalaForm((current) => ({ ...current, data_fim: fromDatetimeLocal(event.target.value) }))} /></Field>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Recorrencia</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
            <Field label="Repeticao">
              <Select value={escalaForm.recorrencia_tipo ?? 'NAO_REPETIR'} onValueChange={(value: RecorrenciaTipo) => setEscalaForm((current) => ({ ...current, recorrencia_tipo: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NAO_REPETIR">Nao repetir</SelectItem>
                  <SelectItem value="DIARIA">Diariamente</SelectItem>
                  <SelectItem value="SEMANAL">Semanalmente</SelectItem>
                  <SelectItem value="CICLO_HORAS">Escala por ciclo</SelectItem>
                  <SelectItem value="PERSONALIZADO">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {(escalaForm.recorrencia_tipo ?? 'NAO_REPETIR') !== 'NAO_REPETIR' && (
              <>
                <Field label="Repetir ate">
                  <Input
                    type="date"
                    value={String(escalaForm.recorrencia_config?.ate ?? '')}
                    onChange={(event) => updateRecorrenciaConfig('ate', event.target.value)}
                    placeholder="Data limite"
                  />
                </Field>
                <Field label="Quantidade">
                  <Input
                    type="number"
                    min={1}
                    max={180}
                    value={String(escalaForm.recorrencia_config?.quantidade ?? 30)}
                    onChange={(event) => updateRecorrenciaConfig('quantidade', Number(event.target.value))}
                    placeholder="Maximo de repeticoes"
                  />
                </Field>
                {escalaForm.recorrencia_tipo === 'CICLO_HORAS' ? (
                  <Field label="Ciclo">
                    <Select value={String(escalaForm.recorrencia_config?.horas ?? 72)} onValueChange={(value) => updateRecorrenciaConfig('horas', Number(value))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="48">12x36</SelectItem>
                        <SelectItem value="72">24x48</SelectItem>
                        <SelectItem value="96">24x72</SelectItem>
                        <SelectItem value="24">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                ) : (
                <Field label="Intervalo">
                  <Input
                    type="number"
                    min={1}
                    value={String(escalaForm.recorrencia_config?.intervalo ?? 1)}
                    onChange={(event) => updateRecorrenciaConfig('intervalo', Number(event.target.value))}
                    placeholder="Numero"
                  />
                </Field>
                )}
                {escalaForm.recorrencia_tipo === 'PERSONALIZADO' && (
                  <div className="md:col-span-3 grid gap-2">
                    <Label>Dias da semana</Label>
                    <div className="flex flex-wrap gap-2">
                      {diasSemana.map((dia) => {
                        const selected = Array.isArray(escalaForm.recorrencia_config?.dias_semana) && (escalaForm.recorrencia_config?.dias_semana as number[]).includes(dia.value);
                        return (
                          <Button
                            key={dia.value}
                            type="button"
                            variant={selected ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleDiaSemana(dia.value)}
                          >
                            {dia.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
        )}
              </>
            )}
              </div>
            </section>

            <details open={showAdditionalInfo} onToggle={(event) => setShowAdditionalInfo(event.currentTarget.open)} className="rounded-2xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer list-none text-sm font-black uppercase tracking-[0.14em] text-slate-500">Informacoes adicionais</summary>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Titulo personalizado"><Input value={escalaForm.titulo} onChange={(event) => setEscalaForm((current) => ({ ...current, titulo: event.target.value }))} placeholder={getGeneratedTitle()} /></Field>
                <Field label="Local do servico"><Input value={escalaForm.local_texto ?? ''} onChange={(event) => setEscalaForm((current) => ({ ...current, local_texto: event.target.value }))} placeholder="Ex.: Terminal Central" /></Field>
                <div className="md:col-span-2 grid gap-2"><Label>Descricao</Label><Textarea value={escalaForm.descricao ?? ''} onChange={(event) => setEscalaForm((current) => ({ ...current, descricao: event.target.value }))} placeholder="Descreva os detalhes da escala e objetivos" /></div>
                <div className="md:col-span-2 grid gap-2"><Label>Observacoes</Label><Textarea value={escalaForm.observacoes ?? ''} onChange={(event) => setEscalaForm((current) => ({ ...current, observacoes: event.target.value }))} placeholder="Informacoes adicionais para os guardas" /></div>
              </div>
            </details>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogMode(null)}>Cancelar</Button>
              <Button type="submit" variant="outline" disabled={mutations.createEscalaCompleta.isPending || mutations.updateEscala.isPending} onClick={() => setSubmitAction('draft')}>Salvar rascunho</Button>
              {!editingEscala && <Button type="submit" disabled={mutations.createEscalaCompleta.isPending} onClick={() => setSubmitAction('publish')}>Criar e publicar</Button>}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === 'agente'} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar agente</DialogTitle><DialogDescription>Conflitos de horario serao alertados antes da inclusao.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <Field label="Guarda">
              <Select value={agenteForm.guarda_id} onValueChange={(value) => setAgenteForm((current) => ({ ...current, guarda_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{(apoio.guardas.data ?? []).map((guarda) => <SelectItem key={guarda.id} value={guarda.id}>{guarda.nome} - {guarda.matricula}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Funcao">
              <Select value={agenteForm.funcao} onValueChange={(value) => setAgenteForm((current) => ({ ...current, funcao: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{funcoes.map((funcao) => <SelectItem key={funcao} value={funcao}>{funcao}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Observacao individual"><Textarea value={agenteForm.observacao} onChange={(event) => setAgenteForm((current) => ({ ...current, observacao: event.target.value }))} /></Field>
            {conflict && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-bold">Conflito de horario identificado.</p>
                {conflict.map((item) => <p key={item.escala_id}>{item.titulo} - {formatDateTime(item.data_inicio)} ate {formatTime(item.data_fim)}</p>)}
                <Input className="mt-3 bg-white" placeholder="Motivo da excecao" value={agenteForm.motivo_conflito} onChange={(event) => setAgenteForm((current) => ({ ...current, motivo_conflito: event.target.value }))} />
              </div>
            )}
            <DialogFooter><Button variant="outline" onClick={() => setDialogMode(null)}>Cancelar</Button><Button onClick={() => addAgente(Boolean(conflict))}>{conflict ? 'Autorizar excecao' : 'Adicionar'}</Button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === 'viatura'} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vincular viatura</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Field label="Viatura">
              <Select value={viaturaForm.veiculo_id} onValueChange={(value) => setViaturaForm((current) => ({ ...current, veiculo_id: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(apoio.viaturas.data ?? []).map((veiculo) => <SelectItem key={veiculo.id} value={veiculo.id}>{veiculo.prefixo} - {veiculo.placa}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Agente vinculado">
              <Select value={viaturaForm.agente_id} onValueChange={(value) => setViaturaForm((current) => ({ ...current, agente_id: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Viatura da equipe</SelectItem>{selectedEscala?.agentes?.map((agente) => <SelectItem key={agente.id} value={agente.id}>{agente.guarda?.nome ?? agente.funcao}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Observacao"><Input value={viaturaForm.observacao} onChange={(event) => setViaturaForm((current) => ({ ...current, observacao: event.target.value }))} /></Field>
            <DialogFooter><Button variant="outline" onClick={() => setDialogMode(null)}>Cancelar</Button><Button onClick={async () => { if (!selectedEscala) return; await mutations.addViatura.mutateAsync({ escala_id: selectedEscala.id, veiculo_id: viaturaForm.veiculo_id, agente_id: viaturaForm.agente_id === 'none' ? null : viaturaForm.agente_id, observacao: viaturaForm.observacao || null }); setDialogMode(null); }}>Salvar</Button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === 'cancelar'} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent><DialogHeader><DialogTitle>Cancelar escala publicada</DialogTitle><DialogDescription>Escalas publicadas nao sao excluidas. O cancelamento fica no historico.</DialogDescription></DialogHeader><Textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Motivo do cancelamento" /><DialogFooter><Button variant="outline" onClick={() => setDialogMode(null)}>Voltar</Button><Button variant="destructive" onClick={cancelar}>Cancelar escala</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={dialogMode === 'tipo' || dialogMode === 'posto'} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialogMode === 'tipo' ? 'Tipo de servico' : 'Posto ou local'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Field label="Nome"><Input value={configForm.nome ?? ''} onChange={(event) => setConfigForm((current) => ({ ...current, nome: event.target.value }))} /></Field>
            <Field label="Descricao"><Textarea value={configForm.descricao ?? ''} onChange={(event) => setConfigForm((current) => ({ ...current, descricao: event.target.value }))} /></Field>
            {dialogMode === 'tipo' && <Field label="Cor"><Input type="color" value={(configForm as any).cor ?? '#2563eb'} onChange={(event) => setConfigForm((current) => ({ ...current, cor: event.target.value }))} /></Field>}
            {dialogMode === 'posto' && (
              <>
                <Field label="Endereco"><Input value={(configForm as any).endereco ?? ''} onChange={(event) => setConfigForm((current) => ({ ...current, endereco: event.target.value }))} /></Field>
                <Field label="Bairro"><Input value={(configForm as any).bairro ?? ''} onChange={(event) => setConfigForm((current) => ({ ...current, bairro: event.target.value }))} /></Field>
                <Field label="Ponto de referencia"><Input value={(configForm as any).ponto_referencia ?? ''} onChange={(event) => setConfigForm((current) => ({ ...current, ponto_referencia: event.target.value }))} /></Field>
              </>
            )}
            <div className="flex items-center justify-between rounded-lg border p-3"><Label>Ativo</Label><Switch checked={configForm.ativo ?? true} onCheckedChange={(checked) => setConfigForm((current) => ({ ...current, ativo: checked }))} /></div>
            <DialogFooter><Button variant="outline" onClick={() => setDialogMode(null)}>Cancelar</Button><Button onClick={saveConfig}>Salvar</Button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === 'troca-decisao'} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent><DialogHeader><DialogTitle>{decisionTroca?.aprovar ? 'Aprovar troca' : 'Rejeitar troca'}</DialogTitle></DialogHeader><Textarea value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} placeholder="Motivo ou observacao" /><DialogFooter><Button variant="outline" onClick={() => setDialogMode(null)}>Voltar</Button><Button onClick={decideTroca}>{decisionTroca?.aprovar ? 'Aprovar' : 'Rejeitar'}</Button></DialogFooter></DialogContent>
      </Dialog>
      </div>
    </AdminLayout>
  );
}

function EscalasAgrupadasList({ groups, isLoading, selectedId, onSelect }: {
  groups: EscalasMonthGroup[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (escala: GuardaEscala) => void;
}) {
  if (isLoading) {
    return <p className="py-8 text-center text-sm text-slate-500">Carregando...</p>;
  }

  if (groups.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
        Nenhuma escala encontrada para o filtro informado.
      </div>
    );
  }

  return (
    <div className="mt-4 max-h-[min(72dvh,calc(100dvh-var(--safe-area-top)-var(--safe-area-bottom)-4rem))] space-y-3 overflow-y-auto pr-1">
      {groups.map((month, monthIndex) => {
        const monthHasSelected = month.equipes.some((team) => team.items.some((escala) => escala.id === selectedId));

        return (
          <details key={month.key} open={monthHasSelected || monthIndex === 0} className="group rounded-2xl border border-slate-200 bg-slate-50/80">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black capitalize tracking-tight text-slate-950">{month.label}</p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {month.equipes.length} equipe(s) - {month.total} escala(s)
                </p>
              </div>
              <Badge variant="outline" className="rounded-full bg-white text-slate-600">{month.total}</Badge>
            </summary>

            <div className="space-y-3 border-t border-slate-200 px-3 pb-3 pt-2">
              {month.equipes.map((team) => {
                const teamHasSelected = team.items.some((escala) => escala.id === selectedId);
                const agentes = team.items.reduce((sum, escala) => sum + (escala.agentes?.length ?? 0), 0);

                return (
                  <details key={team.key} open={teamHasSelected || month.equipes.length === 1} className="rounded-xl border border-slate-200 bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">{team.label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{team.items.length} escala(s) - {agentes} agente(s)</p>
                      </div>
                      <Users className="h-4 w-4 shrink-0 text-slate-400" />
                    </summary>

                    <div className="space-y-2 border-t border-slate-100 p-2">
                      {team.items.map((escala) => {
                        const status = getEscalaStatusCalculado(escala);
                        const isSelected = selectedId === escala.id;

                        return (
                          <button
                            key={escala.id}
                            onClick={() => onSelect(escala)}
                            className={cn(
                              'w-full rounded-xl border p-3 text-left transition-all',
                              isSelected
                                ? 'border-brand-200 bg-brand-50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900">{escala.titulo}</p>
                                <p className="mt-1 text-xs text-slate-500">{formatDateTime(escala.data_inicio)}</p>
                              </div>
                              <Badge variant="outline" className={cn('shrink-0', statusClassName(status))}>{statusLabels[status]}</Badge>
                            </div>
                            <p className="mt-2 truncate text-xs text-slate-500">
                              {escala.posto?.nome ?? escala.local_texto ?? 'Sem local definido'} - {escala.agentes?.length ?? 0} agente(s)
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>;
}

function EscalaDetalhe({ escala, onEdit, onPublish, onCancel, onDelete, onAddAgente, onAddEquipe, onRemoveAgente, onAddViatura, onRemoveViatura, onPdf, onGerarRecorrencias, historico }: {
  escala: GuardaEscala;
  onEdit: () => void;
  onPublish: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onAddAgente: () => void;
  onAddEquipe: () => void;
  onRemoveAgente: (agente: GuardaEscalaAgente) => void;
  onAddViatura: () => void;
  onRemoveViatura: (id: string) => void;
  onPdf: () => void;
  onGerarRecorrencias: () => void;
  historico: any[];
}) {
  const status = getEscalaStatusCalculado(escala);
  const confirmed = escala.ciencias?.filter((ciencia) => ciencia.confirmado_em).length ?? 0;
  return (
    <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[28px] font-black tracking-tight text-slate-950">{escala.titulo}</h2>
            <Badge variant="outline" className={statusClassName(status)}>{statusLabels[status]}</Badge>
          </div>
          <p className="mt-2 text-sm text-slate-500">{formatDateTime(escala.data_inicio)} ate {formatDateTime(escala.data_fim)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {escala.status === 'RASCUNHO' && <Button size="sm" onClick={onPublish} className="gap-2"><CheckCircle2 className="h-4 w-4" />Publicar</Button>}
          <Button size="sm" variant="outline" onClick={onPdf} className="gap-2"><Printer className="h-4 w-4" />PDF</Button>
          {escala.recorrencia_tipo !== 'NAO_REPETIR' && <Button size="sm" variant="outline" onClick={onGerarRecorrencias}>Gerar recorrencias</Button>}
          <Button size="sm" variant="outline" onClick={onEdit} className="gap-2"><Settings2 className="h-4 w-4" />Editar</Button>
          {escala.status === 'RASCUNHO' && <Button size="sm" variant="outline" onClick={onDelete} className="gap-2"><XCircle className="h-4 w-4" />Excluir</Button>}
          {escala.status === 'PUBLICADA' && <Button size="sm" variant="destructive" onClick={onCancel} className="gap-2"><XCircle className="h-4 w-4" />Cancelar</Button>}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          <InfoEscala label="Tipo" value={escala.tipo_servico?.nome ?? '-'} />
          <InfoEscala label="Local" value={escala.posto?.nome ?? escala.local_texto ?? '-'} />
          <InfoEscala label="Equipe" value={escala.equipe?.nome ?? '-'} />
          <InfoEscala label="Ciencias" value={`${confirmed}/${escala.agentes?.length ?? 0}`} />
        </div>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Agentes</h3>
            <div className="flex gap-2"><Button variant="outline" size="sm" onClick={onAddEquipe}>Adicionar equipe</Button><Button variant="outline" size="sm" onClick={onAddAgente}>Adicionar agente</Button></div>
          </div>
          <div className="space-y-2">
            {(escala.agentes ?? []).length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Nenhum agente vinculado.</div> : escala.agentes?.map((agente) => (
              <div key={agente.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-bold text-slate-900">{agente.guarda?.nome ?? 'Guarda'}</p><p className="text-xs text-slate-500">Mat. {agente.guarda?.matricula ?? '-'} - {agente.funcao}</p></div>
                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => onRemoveAgente(agente)}>Remover</Button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Viaturas</h3>
            <Button variant="outline" size="sm" onClick={onAddViatura}>Vincular viatura</Button>
          </div>
          <div className="space-y-2">
            {(escala.viaturas ?? []).length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Sem viatura vinculada.</div> : escala.viaturas?.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-bold text-slate-900">{item.veiculo?.prefixo ?? '-'} - {item.veiculo?.placa ?? '-'}</span>
                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => onRemoveViatura(item.id)}>Remover</Button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Historico recente</h3>
          <div className="space-y-2">
            {historico.slice(0, 6).length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Nenhum registro de historico.</div> : historico.slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-bold text-slate-900">{item.acao.replaceAll('_', ' ')}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
                </div>
                {item.descricao && <p className="mt-1 text-sm text-slate-500">{item.descricao}</p>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoEscala({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-slate-900">{value}</p></div>;
}

function ResumoListas({ hoje, amanha, semana }: { hoje: GuardaEscala[]; amanha: GuardaEscala[]; semana: GuardaEscala[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {[
        ['Hoje', hoje],
        ['Amanha', amanha],
        ['Proximos 7 dias', semana],
      ].map(([title, items]) => (
        <div key={title as string} className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">{title as string}</h3>
          <div className="mt-4 space-y-2">{(items as GuardaEscala[]).slice(0, 5).map((escala) => <div key={escala.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"><p className="font-bold text-slate-900">{escala.titulo}</p><p className="text-xs text-slate-500">{formatTime(escala.data_inicio)} - {escala.agentes?.length ?? 0} agentes</p></div>)}</div>
        </div>
      ))}
    </div>
  );
}

function CalendarioView({ escalas, query, setQuery }: { escalas: GuardaEscala[]; query: string; setQuery: (value: string) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, GuardaEscala[]>();
    for (const escala of escalas) {
      const key = format(new Date(escala.data_inicio), 'yyyy-MM-dd');
      map.set(key, [...(map.get(key) ?? []), escala]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [escalas]);
  return <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Calendario</h3><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar" className="md:max-w-xs" /></div><div className="mt-4 space-y-4">{groups.map(([day, items]) => <div key={day}><h3 className="mb-2 font-bold text-slate-900">{format(new Date(`${day}T12:00:00`), "dd 'de' MMMM", { locale: ptBR })}</h3><div className="grid gap-2 md:grid-cols-2">{items.map((escala) => <div key={escala.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="font-bold text-slate-900">{escala.titulo}</p><p className="text-xs text-slate-500">{formatTime(escala.data_inicio)} ate {formatTime(escala.data_fim)} - {escala.posto?.nome ?? escala.local_texto ?? '-'}</p></div>)}</div></div>)}</div></div>;
}

function TrocasView({ trocas, onDecision }: { trocas: GuardaEscalaTroca[]; onDecision: (troca: GuardaEscalaTroca, aprovar: boolean) => void }) {
  const [status, setStatus] = useState('TODAS');
  const items = status === 'TODAS' ? trocas : trocas.filter((troca) => troca.status === status);
  return <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Trocas de Servico</h3><Select value={status} onValueChange={setStatus}><SelectTrigger className="sm:w-64"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TODAS">Todas</SelectItem>{Object.entries(trocaStatusLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div><div className="mt-4 space-y-3">{items.map((troca) => <div key={troca.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-bold text-slate-900">{troca.solicitante?.nome ?? '-'} para {troca.destinatario?.nome ?? '-'}</p><p className="text-sm text-slate-500">{troca.tipo} - {troca.escala_origem?.titulo ?? '-'} {troca.escala_destino ? ` x ${troca.escala_destino.titulo}` : ''}</p><p className="text-xs text-slate-400">{formatDateTime(troca.solicitado_em)}</p></div><div className="flex flex-wrap gap-2"><Badge variant="outline" className="rounded-full">{trocaStatusLabels[troca.status]}</Badge>{troca.status === 'AGUARDANDO_APROVACAO' && <><Button size="sm" onClick={() => onDecision(troca, true)}>Aprovar</Button><Button size="sm" variant="outline" onClick={() => onDecision(troca, false)}>Rejeitar</Button></>}</div></div></div>)}</div></div>;
}

function ConfigView({ title, items, icon: Icon, onCreate, onEdit }: { title: string; items: any[]; icon: any; onCreate: () => void; onEdit: (item: any) => void }) {
  return <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">{title}</h3><Button size="sm" onClick={onCreate} className="gap-2"><Plus className="h-4 w-4" />Novo</Button></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <button key={item.id} onClick={() => onEdit(item)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-brand-200"><Icon className="h-5 w-5 text-slate-400" /><h4 className="mt-3 font-bold text-slate-900">{item.nome}</h4><p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.descricao ?? item.endereco ?? '-'}</p><Badge className={cn('mt-3 rounded-full', item.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>{item.ativo ? 'Ativo' : 'Inativo'}</Badge></button>)}</div></div>;
}

function StatCardEscalas({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Shield }) {
  return (
    <div className="flex min-w-[75vw] snap-start items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:min-w-0">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">{label}</p>
        <p className="mt-0.5 text-2xl font-black tracking-tight text-white">{value}</p>
      </div>
    </div>
  );
}
