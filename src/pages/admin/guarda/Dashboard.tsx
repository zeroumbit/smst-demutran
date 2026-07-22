import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { toast } from '@/hooks/use-toast';
import { Calendar, Hourglass, Banknote, ChevronRight, Clock, FileWarning, TrendingUp, X, Sparkles, Info, Shield, Gavel, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { IROOperacao } from '@/types/admin';
import { cn } from '@/lib/utils';

const gerarIntervaloDatas = (inicio: string, fim: string): string[] => {
  const dates: string[] = [];
  const current = new Date(inicio + 'T00:00:00');
  const end = new Date(fim + 'T00:00:00');
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const LIMITE_IRO_MES = 72;
const BANNER_STORAGE_KEY = 'iro-banner-dismiss';

type IRODataDisponivel = {
  operacao_id: string;
  data: string;
  vagas_disponiveis: number;
};

const bannerPodeExibir = (): boolean => {
  try {
    const raw = localStorage.getItem(BANNER_STORAGE_KEY);
    if (!raw) return true;
    const { date, count } = JSON.parse(raw);
    const hoje = new Date().toISOString().slice(0, 10);
    if (date !== hoje) return true;
    return count < 2;
  } catch {
    return true;
  }
};

const bannerRegistrarDismiss = (): void => {
  try {
    const raw = localStorage.getItem(BANNER_STORAGE_KEY);
    const hoje = new Date().toISOString().slice(0, 10);
    if (!raw) {
      localStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify({ date: hoje, count: 1 }));
      return;
    }
    const { date, count } = JSON.parse(raw);
    localStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify({
      date: hoje,
      count: date === hoje ? count + 1 : 1,
    }));
  } catch {
    // silent
  }
};

interface ResumoGuarda {
  total_horas_mes: number;
  total_reais: number;
  horas_disponiveis: number;
  banco_horas: number;
  mes_anterior_horas: number;
  mes_anterior_reais: number;
}

const fmtDateBR = (d: string | null | undefined): string => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
};

const horasDaSolicitacao = (t: string): number => {
  if (t === 'imediato') return 0;
  return parseInt(t) || 0;
};

const GuardaDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, logout, markLeiIroAccepted } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<ResumoGuarda>({ total_horas_mes: 0, total_reais: 0, horas_disponiveis: 0, banco_horas: 0, mes_anterior_horas: 0, mes_anterior_reais: 0 });
  const [ultimasCandidaturas, setUltimasCandidaturas] = useState<any[]>([]);
  const [operacoes, setOperacoes] = useState<IROOperacao[]>([]);
  const [guardaNome, setGuardaNome] = useState('');
  const [bannerVisible, setBannerVisible] = useState(() => bannerPodeExibir());

  const [selectedOperacao, setSelectedOperacao] = useState<IROOperacao | null>(null);
  const [candidaturaEnviando, setCandidaturaEnviando] = useState(false);
  const [operacaoDatas, setOperacaoDatas] = useState<Record<string, string[]>>({});
  const [vagasPorData, setVagasPorData] = useState<Record<string, number>>({});
  const [minhasCandidaturasPorData, setMinhasCandidaturasPorData] = useState<Record<string, boolean>>({});
  const [datasSelecionadas, setDatasSelecionadas] = useState<string[]>([]);
  const [candidaturaResultado, setCandidaturaResultado] = useState<{ sucesso: boolean; mensagem: string; operacaoNome?: string; datasSucesso?: string[]; dataOperacao?: string; horas?: number; totalMes?: number } | null>(null);
  const [candidaturaResultadoAberto, setCandidaturaResultadoAberto] = useState(false);

  const [exibirModalLei, setExibirModalLei] = useState(false);
  const [termoAceito, setTermoAceito] = useState(false);
  const [enviandoAceite, setEnviandoAceite] = useState(false);

  useEffect(() => {
    if (profile && !profile.aceitou_lei_iro_at) {
      setExibirModalLei(true);
    } else {
      setExibirModalLei(false);
    }
  }, [profile]);

  const handleRecusar = async () => {
    await logout();
    navigate('/admin/login');
  };

  const handleAceitar = async () => {
    if (!termoAceito) return;
    setEnviandoAceite(true);
    try {
      const { data, error } = await supabase.rpc('aceitar_lei_iro', { p_usuario_id: user?.user_id });
      if (error) throw error;
      
      const res = data as any;
      if (res && res.sucesso) {
        markLeiIroAccepted();
        setExibirModalLei(false);
        toast({
          title: 'Termo de Aceite registrado!',
          description: 'Você aceitou as regras da Lei da IRO.',
        });
      } else {
        toast({
          title: 'Erro ao aceitar termo',
          description: res?.mensagem || 'Ocorreu um erro desconhecido.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erro ao aceitar termo',
        description: err.message || 'Houve uma falha de conexão.',
        variant: 'destructive',
      });
    } finally {
      setEnviandoAceite(false);
    }
  };

  const loadData = async () => {
    if (!user?.user_id) { setLoading(false); return; }
    setLoading(true);

    try {
      const { data: guardaData } = await supabase.rpc('buscar_guarda_por_usuario', { p_usuario_id: user.user_id });
      if (guardaData) {
        setGuardaNome((guardaData as any).nome || '');
      }

      let setorId = '';
      const { data: sData } = await supabase
        .from('setores')
        .select('id')
        .eq('slug', 'guarda-municipal')
        .maybeSingle();
      if (sData) setorId = sData.id;

      const [opRes, candRes, bancoRes] = await Promise.all([
        setorId
          ? supabase.from('iro_operacoes').select('*').eq('setor_id', setorId).eq('ativo', true).order('data_inicio', { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase
          .from('iro_candidaturas')
          .select('*, iro_operacoes(nome)')
          .eq('usuario_id', user.user_id)
          .in('status', ['confirmado', 'realizado'])
          .order('data_operacao', { ascending: false }),
        supabase
          .from('iro_banco_horas')
          .select('horas_excedentes')
          .eq('usuario_id', user.user_id)
          .maybeSingle(),
      ]);

      const hojeStr = new Date().toISOString().slice(0, 10);
      const validOps = (opRes.data || []).filter((op: any) => op.ativo && op.data_fim >= hojeStr) as IROOperacao[];
      setOperacoes(validOps);

      let datasMap: Record<string, string[]> = {};
      if (validOps.length > 0) {
        const { data: datasRes } = await supabase
          .from('iro_operacao_datas')
          .select('operacao_id, data')
          .in('operacao_id', validOps.map((op) => op.id))
          .gte('data', hojeStr)
          .order('data', { ascending: true });

        (datasRes || []).forEach((row: any) => {
          if (!datasMap[row.operacao_id]) datasMap[row.operacao_id] = [];
          datasMap[row.operacao_id].push(row.data);
        });
      }
      datasMap = validOps.reduce((acc, op) => {
        acc[op.id] = acc[op.id]?.length ? acc[op.id] : gerarIntervaloDatas(op.data_inicio, op.data_fim).filter((data) => data >= hojeStr);
        return acc;
      }, datasMap);
      setOperacaoDatas(datasMap);

      const lista = (candRes.data || []).map((c: any) => ({
        ...c,
        operacao_nome: c.operacao_nome || c.iro_operacoes?.nome || 'IRO extra',
      }));
      setUltimasCandidaturas(lista.slice(0, 5));

      const minhasCandidaturasPorDataMap: Record<string, boolean> = {};
      lista
        .filter((c: any) => c.operacao_id && ['pendente', 'confirmado', 'realizado'].includes(c.status))
        .forEach((c: any) => {
          minhasCandidaturasPorDataMap[`${c.operacao_id}:${c.data_operacao}`] = true;
        });
      setMinhasCandidaturasPorData(minhasCandidaturasPorDataMap);

      const { data: disponibilidadeData, error: disponibilidadeError } = await supabase.rpc('listar_iro_datas_disponiveis', {
        p_usuario_id: user.user_id,
      });
      if (disponibilidadeError) throw disponibilidadeError;

      const validOperacaoIds = new Set(validOps.map((op) => op.id));
      const datasDisponiveisMap: Record<string, string[]> = {};
      const vagasPorDataMap: Record<string, number> = {};
      ((disponibilidadeData || []) as IRODataDisponivel[])
        .filter((item) => validOperacaoIds.has(item.operacao_id))
        .forEach((item) => {
          if (!datasDisponiveisMap[item.operacao_id]) datasDisponiveisMap[item.operacao_id] = [];
          datasDisponiveisMap[item.operacao_id].push(item.data);
          vagasPorDataMap[`${item.operacao_id}:${item.data}`] = item.vagas_disponiveis;
        });
      setOperacaoDatas(datasDisponiveisMap);
      setVagasPorData(vagasPorDataMap);

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      const firstDayAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const lastDayAnterior = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

      const totalHoras = lista
        .filter((c: any) => c.data_operacao >= firstDay && c.data_operacao <= lastDay)
        .reduce((acc: number, c: any) => acc + Number(c.horas_trabalhadas || 0), 0);

      const horasMesAnterior = lista
        .filter((c: any) => c.data_operacao >= firstDayAnterior && c.data_operacao <= lastDayAnterior)
        .reduce((acc: number, c: any) => acc + Number(c.horas_trabalhadas || 0), 0);

      let valorHora = 0;
      const gData = guardaData as { graduacao_id?: string } | null;
      if (gData?.graduacao_id) {
        const { data: vData } = await supabase
          .from('iro_valores_graduacao')
          .select('valor_hora')
          .eq('graduacao_id', gData.graduacao_id)
          .eq('ativo', true)
          .maybeSingle();
        if (vData) valorHora = Number((vData as any).valor_hora) || 0;
      }

      setResumo({
        total_horas_mes: totalHoras,
        total_reais: totalHoras * valorHora,
        horas_disponiveis: 0,
        banco_horas: bancoRes.data ? Number((bancoRes.data as any).horas_excedentes) : 0,
        mes_anterior_horas: horasMesAnterior,
        mes_anterior_reais: horasMesAnterior * valorHora,
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleCandidatar = async () => {
    if (!selectedOperacao || datasSelecionadas.length === 0 || !user?.user_id) return;
    if (selectedOperacao.data_fim < new Date().toISOString().slice(0, 10)) {
      toast({ title: 'Prazo encerrado', description: 'O período desta operação já se encerrou.', variant: 'destructive' });
      return;
    }
    setCandidaturaEnviando(true);
    const resultados: Array<{ data: string; sucesso: boolean; mensagem: string }> = [];
    for (const dataSelecionada of datasSelecionadas) {
      const { data, error } = await supabase.rpc('candidatar_se_iro', {
        p_operacao_id: selectedOperacao.id,
        p_usuario_id: user.user_id,
        p_data: dataSelecionada,
      });
      if (error) {
        resultados.push({ data: dataSelecionada, sucesso: false, mensagem: error.message });
        continue;
      }
      const r = data as { sucesso: boolean; mensagem: string };
      resultados.push({ data: dataSelecionada, sucesso: r.sucesso, mensagem: r.mensagem });
    }
    setCandidaturaEnviando(false);

    const sucessos = resultados.filter((item) => item.sucesso);
    const falhas = resultados.filter((item) => !item.sucesso);
    const datasSucesso = sucessos.map((item) => item.data);
    const ultimoSucesso = sucessos.at(-1);

    if (sucessos.length > 0) {
      toast({
        variant: 'success',
        title: 'Inscrição realizada com sucesso!',
        description: sucessos.length === 1
          ? `Candidatura confirmada para ${fmtDateBR(sucessos[0].data)}.`
          : `${sucessos.length} candidaturas confirmadas.`,
      });
    } else {
      toast({ title: 'Erro', description: falhas[0]?.mensagem || 'Nenhuma candidatura foi realizada.', variant: 'destructive' });
    }

    setCandidaturaResultado({
      sucesso: sucessos.length > 0,
      mensagem: sucessos.length > 0
        ? `${sucessos.length} candidatura(s) realizada(s) com sucesso${falhas.length ? `; ${falhas.length} não realizada(s).` : '.'}`
        : (falhas[0]?.mensagem || 'Nenhuma candidatura foi realizada.'),
      operacaoNome: selectedOperacao.nome,
      datasSucesso: datasSucesso.length > 0 ? datasSucesso : undefined,
      dataOperacao: sucessos.length === 1 ? sucessos[0].data : undefined,
      horas: selectedOperacao.horas_por_dia,
      totalMes: (ultimoSucesso as any)?.total_mes,
    });
    setCandidaturaResultadoAberto(true);
    setSelectedOperacao(null);
    setDatasSelecionadas([]);
    void loadData();
  };

  useEffect(() => { void loadData(); }, [user?.user_id, profile?.setor_id]);

  useEffect(() => {
    if (!user?.user_id) return;

    const channel = supabase
      .channel(`iro_dashboard_guarda_${user.user_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iro_operacoes' }, () => void loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iro_operacao_datas' }, () => void loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iro_candidaturas' }, () => void loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iro_banco_horas', filter: `usuario_id=eq.${user.user_id}` }, () => void loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iro_valores_graduacao' }, () => void loadData())
      .subscribe();

    const interval = setInterval(() => void loadData(), 600000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user?.user_id]);

  const stats = useMemo(() => [
    { label: 'Total no mês', value: `${resumo.total_horas_mes}h`, icon: Calendar },
    { label: 'Banco de horas', value: `${resumo.banco_horas}h`, icon: Hourglass },
    { label: 'Total', value: `R$ ${resumo.total_reais.toFixed(2).replace('.', ',')}`, icon: Banknote },
    { label: 'Mês anterior', value: `${resumo.mes_anterior_horas}h`, icon: TrendingUp, sub: resumo.mes_anterior_horas > 0 ? `atual: ${resumo.total_horas_mes}h` : undefined },
  ], [resumo]);

  const operacoesDisponiveis = useMemo(() => operacoes.filter((op) => {
    const datasDisponiveis = (operacaoDatas[op.id] || []).filter((data) => {
      const key = `${op.id}:${data}`;
      return (vagasPorData[key] ?? 0) > 0 && !minhasCandidaturasPorData[key];
    });
    return datasDisponiveis.length > 0;
  }), [minhasCandidaturasPorData, operacaoDatas, operacoes, vagasPorData]);

  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <>
      <GuardsLayout>
      <div className="space-y-4 sm:space-y-6">
        <section className="rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-4 py-4 text-white sm:rounded-[34px] sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-100/70 sm:text-[11px]">Guarda Municipal</p>
              <h1 className="mt-2 text-xl font-black leading-tight text-white sm:text-2xl md:mt-3 md:text-[26px] lg:text-[34px]">
                {guardaNome ? `Olá, ${guardaNome.split(' ')[0]}!` : 'Dashboard'}
              </h1>
              <p className="mt-1.5 hidden max-w-xl text-[13px] leading-5 text-white md:block md:mt-2 md:text-[14px] md:leading-6">Resumo do mês de {mesAtual}.</p>
            </div>
          </div>
          <div className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 native-scrollbar whitespace-nowrap sm:hidden">
            <Badge variant="outline" className="snap-start whitespace-nowrap rounded-full border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
              Painel pessoal
            </Badge>
            <Badge variant="outline" className="snap-start whitespace-nowrap rounded-full border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
              Limite mensal {LIMITE_IRO_MES}h
            </Badge>
            <Badge variant="outline" className="snap-start whitespace-nowrap rounded-full border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
              Atualização em tempo real
            </Badge>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-[22px] bg-white/10 p-3.5 backdrop-blur-sm sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/60 sm:text-[11px]">{s.label}</p>
                      <p className="mt-1 break-words text-[22px] font-black leading-none text-white sm:text-3xl">{s.value}</p>
                      {s.sub && <p className="mt-0.5 text-[13px] leading-5 text-white/70">{s.sub}</p>}
                    </div>
                    <div className="hidden shrink-0 rounded-2xl bg-white/15 p-3 text-white backdrop-blur-sm sm:block">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {!loading && bannerVisible && resumo.total_horas_mes < LIMITE_IRO_MES && (
          <div className={cn(
            'relative rounded-[20px] border p-4 pr-11 shadow-sm sm:p-5 sm:pr-12',
            resumo.total_horas_mes === 0
              ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
              : 'bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200',
          )}>
            <button
              onClick={() => { setBannerVisible(false); bannerRegistrarDismiss(); }}
              className="absolute right-4 top-4 rounded-full p-1 transition-colors hover:bg-black/5"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
            <div className="flex items-start gap-3">
              {resumo.total_horas_mes === 0 ? (
                <Sparkles className="mt-0.5 h-6 w-6 shrink-0 text-emerald-500" />
              ) : (
                <Info className="mt-0.5 h-6 w-6 shrink-0 text-blue-500" />
              )}
              <div className="space-y-1">
                <p className={cn(
                  'text-sm font-bold leading-5',
                  resumo.total_horas_mes === 0 ? 'text-emerald-800' : 'text-blue-800',
                )}>
                  {guardaNome?.split(' ')[0] || 'Guarda'}, {resumo.total_horas_mes === 0
                    ? `esse mês você não fez nenhuma hora IRO, ainda pode fazer ${LIMITE_IRO_MES}h.`
                    : `você já fez ${resumo.total_horas_mes}h IRO, você ainda pode fazer ${LIMITE_IRO_MES - resumo.total_horas_mes}h IRO.`
                  }
                </p>
                <p className={cn(
                  'text-xs',
                  resumo.total_horas_mes === 0 ? 'text-emerald-600' : 'text-blue-600',
                )}>
                  Limite mensal de {LIMITE_IRO_MES}h de IRO.
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-muted-foreground sm:p-8">Carregando...</div>
        ) : (
          <>
            <div className="rounded-[20px] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)] sm:px-5">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.08em] text-slate-600">Últimas IROs realizadas</h2>
              {ultimasCandidaturas.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma IRO realizada neste mês.</p>
              ) : (
                <div className="space-y-2 sm:space-y-2">
                  {ultimasCandidaturas.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 active:scale-[0.99]">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{c.operacao_nome}</p>
                        <p className="text-xs text-slate-500">{fmtDateBR(c.data_operacao)}</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-slate-700">{c.horas_trabalhadas}h</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[32px] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)] sm:px-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-600">Operações disponíveis</h2>
              </div>
              {operacoesDisponiveis.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <FileWarning className="h-10 w-10 text-slate-300" />
                  <p className="text-sm text-slate-400">Nenhuma operação disponível no momento.</p>
                </div>
              ) : operacoesDisponiveis.length === 1 ? (
                <div className="space-y-2">
                  {operacoesDisponiveis.map((op) => (
                    <div key={op.id} className="rounded-xl bg-slate-50 px-4 py-3 sm:flex sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate"><span className="text-slate-400 font-mono text-[12px] font-medium">{op.codigo}</span> {op.nome}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1 shrink-0"><Calendar className="h-3 w-3" />{fmtDateBR(op.data_inicio)}</span>
                          <span className="text-slate-300 shrink-0">·</span>
                          <span className="flex items-center gap-1 shrink-0"><Clock className="h-3 w-3" />{op.horario_previsto.slice(0, 5)}</span>
                          <span className="text-slate-300 shrink-0">·</span>
                          <Badge variant="outline" className="shrink-0 rounded-full text-[10px] font-bold px-2 py-0 bg-slate-100">{op.vagas_por_dia} vaga(s)</Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="mt-3 min-h-11 w-full rounded-xl text-[13px] font-semibold sm:ml-3 sm:mt-0 sm:min-h-10 sm:w-auto sm:shrink-0" onClick={() => { setSelectedOperacao(op); setDatasSelecionadas([]); }}>
                        VER DETALHES
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <p className="text-sm text-slate-500">{operacoesDisponiveis.length} operaç{operacoesDisponiveis.length === 1 ? 'ão' : 'ões'} disponíve{operacoesDisponiveis.length === 1 ? 'l' : 'is'}</p>
                  <Button size="default" className="min-h-12 w-full max-w-xs rounded-xl text-[14px] font-bold" onClick={() => navigate('/admin/perfil-guardas/guarda-municipal/iros')}>
                    VER OPERAÇÕES DISPONÍVEIS
                    <ChevronRight className="h-5 w-5 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </GuardsLayout>

    <ResponsiveDialog
      open={Boolean(selectedOperacao)}
      onOpenChange={(open) => { if (!open) { setSelectedOperacao(null); setDatasSelecionadas([]); } }}
      title={(selectedOperacao?.codigo ? selectedOperacao.codigo + ' - ' : '') + (selectedOperacao?.nome || 'Detalhes da operação')}
      description="Veja os detalhes da operação."
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1 rounded-xl text-[13px] font-semibold" onClick={() => { setSelectedOperacao(null); setDatasSelecionadas([]); }}>Cancelar</Button>
          <Button className="flex-1 rounded-xl text-[13px] font-semibold" disabled={datasSelecionadas.length === 0 || candidaturaEnviando} onClick={() => void handleCandidatar()}>
            {candidaturaEnviando ? 'Enviando...' : `Confirmar ${datasSelecionadas.length || ''} candidatura(s)`}
          </Button>
        </div>
      }
    >
      {selectedOperacao && (
        <div className="space-y-5 py-2">
          <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4 text-sm text-orange-800 shadow-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
            <p className="font-medium">Só aceite se realmente poder estar no dia da operação.</p>
          </div>
          {horasDaSolicitacao(selectedOperacao.tempo_solicitacao) >= 48 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-4 text-sm text-amber-800 shadow-sm">
              <Gavel className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p className="font-medium">Esta operação segue a <strong>Lei nº 2.739/2025</strong>. Desistência deve ser comunicada ao chefe imediato com 24h de antecedência.</p>
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Informações da operação</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Código</p>
                <p className="mt-1 text-base font-bold text-slate-800 font-mono">{selectedOperacao.codigo}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Horário</p>
                <p className="mt-1 text-base font-bold text-slate-800">{selectedOperacao.horario_previsto.slice(0, 5)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Horas/dia</p>
                <p className="mt-1 text-base font-bold text-slate-800">{selectedOperacao.horas_por_dia}h</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Vagas</p>
                <p className="mt-1 text-base font-bold text-slate-800">{selectedOperacao.vagas_por_dia}/dia</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Período</p>
                <p className="mt-1 text-base font-bold text-slate-800">{fmtDateBR(selectedOperacao.data_inicio)} - {fmtDateBR(selectedOperacao.data_fim)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Dias para candidatura</Label>
              <span className="text-sm font-medium text-slate-500">{datasSelecionadas.length} dia(s)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const datas = (operacaoDatas[selectedOperacao.id] || []).filter((data) => {
                    const key = `${selectedOperacao.id}:${data}`;
                    return (vagasPorData[key] || 0) > 0 && !minhasCandidaturasPorData[key];
                  });
                  setDatasSelecionadas(datas);
                }}
              >
                Marcar todos
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setDatasSelecionadas([])}>
                Desmarcar todos
              </Button>
            </div>
            <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {(() => {
                const datas = (operacaoDatas[selectedOperacao.id] || []).filter((data) => {
                  const key = `${selectedOperacao.id}:${data}`;
                  return (vagasPorData[key] ?? 0) > 0 && !minhasCandidaturasPorData[key];
                });
                if (datas.length === 0) {
                  return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">Nenhum dia disponível para esta operação.</div>;
                }

                const grupos = new Map<string, string[]>();
                for (const data of datas) {
                  const mes = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  if (!grupos.has(mes)) grupos.set(mes, []);
                  grupos.get(mes)!.push(data);
                }
                const selected = new Set(datasSelecionadas);

                return Array.from(grupos.entries()).map(([mes, grupoDatas]) => (
                  <div key={mes}>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{mes}</p>
                    <div className="grid grid-cols-4 gap-1.5 min-[400px]:grid-cols-5 sm:grid-cols-7">
                      {grupoDatas.map((data) => {
                        const dt = new Date(data + 'T00:00:00');
                        const isFds = dt.getDay() === 0 || dt.getDay() === 6;
                        const isSelected = selected.has(data);
                        const key = `${selectedOperacao.id}:${data}`;
                        const vagasDisponiveis = vagasPorData[key] ?? selectedOperacao.vagas_por_dia;
                        return (
                          <button
                            key={data}
                            type="button"
                            onClick={() =>
                              setDatasSelecionadas((prev) => {
                                const set = new Set(prev);
                                if (set.has(data)) set.delete(data);
                                else set.add(data);
                                return [...set].sort();
                              })
                            }
                            className={cn(
                              'flex flex-col items-center rounded-lg px-2.5 py-1.5 text-xs transition-colors',
                              isSelected ? 'bg-primary text-primary-foreground shadow-sm' : isFds ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-white text-slate-600 hover:bg-slate-100',
                            )}
                          >
                            <span className="text-sm font-bold leading-tight">{dt.getDate()}</span>
                            <span className="text-[9px] leading-tight opacity-60">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dt.getDay()]}</span>
                            <span className="mt-0.5 text-[9px] leading-tight opacity-70">{vagasDisponiveis} vaga(s)</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </ResponsiveDialog>

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
                {candidaturaResultado.datasSucesso && candidaturaResultado.datasSucesso.length > 1 ? (
                  <div>
                    <p className="font-semibold text-slate-700 mb-1">Datas:</p>
                    <div className="flex flex-wrap justify-center gap-1">
                      {candidaturaResultado.datasSucesso.map((d) => (
                        <Badge key={d} variant="outline" className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-medium">
                          {fmtDateBR(d)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p><span className="font-semibold text-slate-700">Data:</span> {fmtDateBR(candidaturaResultado.dataOperacao || '')}</p>
                )}
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

    {exibirModalLei && (
      <div className="fixed inset-0 z-[9999] flex min-h-0 flex-col items-center justify-end bg-slate-950/80 pl-[var(--safe-area-left)] pr-[var(--safe-area-right)] pt-[var(--safe-area-top)] backdrop-blur-sm sm:justify-center sm:p-4 overflow-hidden animate-fade-in">
        <div className="flex h-auto max-h-[calc(100dvh-var(--safe-area-top))] sm:max-h-[calc(100dvh-var(--safe-area-top)-var(--safe-area-bottom)-2rem)] w-full sm:max-w-4xl flex-col overflow-hidden rounded-t-[28px] sm:rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in slide-in-from-bottom sm:zoom-in duration-300">
          {/* Header */}
          <div className="flex items-start gap-3 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-4 text-white sm:items-center sm:gap-4 sm:p-6">
            <div className="rounded-xl bg-white/10 p-3 text-white backdrop-blur-sm shrink-0">
              <Shield className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-sky-200 sm:text-[11px]">Termo de Compromisso</span>
              <h2 className="mt-1 text-base font-black leading-snug sm:text-xl">LEI Nº 2.739 - INDENIZAÇÃO DE REFORÇO OPERACIONAL (IRO)</h2>
            </div>
          </div>

          {/* Scrollable Law Content */}
          <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed text-slate-700 scrollbar-thin select-none sm:p-6 md:p-8">
            <div className="space-y-6 text-sm text-slate-800">
              <div className="text-center border-b border-slate-100 pb-4">
                <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">PÁG. 13 - DIÁRIO OFICIAL DO MUNICÍPIO DE CANINDÉ</p>
                <p className="text-xs text-slate-400">Quarta-feira, 24 de setembro de 2025, edição 929</p>
                <h3 className="mt-2 text-base font-bold text-slate-900">FRANCISCO JARDEL SOUSA PINHO</h3>
                <p className="text-xs text-slate-500 font-medium">Prefeito Municipal de Canindé</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="font-bold text-slate-900">LEI Nº 2.739/2025, DE 24 DE SETEMBRO DE 2025.</p>
                <p className="mt-1 text-xs italic text-slate-600 leading-relaxed">
                  <strong>Ementa:</strong> Dispõe sobre a criação da Indenização de Reforço Operacional – (IRO) no âmbito da Guarda Civil Municipal de Canindé e dá outras providências.
                </p>
              </div>

              <p className="mt-4">
                O <strong>PREFEITO MUNICIPAL DE CANINDÉ</strong>, Estado do Ceará, no uso das atribuições que lhe são conferidas pela Lei Orgânica do Município,
                FAZ SABER que a Câmara Municipal de Canindé aprovou e eu sanciono a seguinte Lei:
              </p>

              <p>
                <strong>Art. 1º</strong> A indenização por reforço operacional é a retribuição paga integralmente ao servidor pelo desempenho voluntário de <em>atividades especiais</em>, e será paga proporcionalmente à classe à qual pertence o servidor, por tarefa especial, levando-se em conta coerente estimativa do número de dias e de horas necessárias para sua realização.
              </p>

              <div className="pl-4 border-l-2 border-slate-200 py-1 my-2">
                <p>
                  <strong>Parágrafo único.</strong> Para os fins desta Lei, consideram-se <em>atividades especiais ou operacionais</em> aquelas desempenhadas fora da escala regular de serviço, de caráter extraordinário, preventivo, emergencial ou estratégico, voltadas ao reforço da atuação da Guarda Civil Municipal em situações que demandem incremento temporário do efetivo, nos termos definidos em ato do Chefe do Poder Executivo, após provocação do Comandante da Guarda Civil Municipal, tais como:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>I – Eventos religiosos de grande porte;</li>
                  <li>II – Operações preventivas ou ostensivas em áreas de maior criticidade;</li>
                  <li>III – Atividades operacionais durante eventos com grande fluxo de pessoas;</li>
                  <li>IV – Ações voltadas à manutenção da ordem pública em situações excepcionais;</li>
                  <li>V – Outras hipóteses não alcançadas nos incisos anteriores, desde que relacionadas ao interesse público e à preservação da segurança pública.</li>
                </ul>
              </div>

              <p>
                <strong>Art. 2º</strong> Será devido à Indenização por Reforço Operacional ao Guarda Civil Municipal que, em caráter voluntário, participar de serviço para o qual seja designado eventualmente, nos termos desta Lei e do respectivo regulamento.
              </p>

              <p>
                <strong>§1º</strong> A Indenização por Reforço Operacional é de natureza voluntária e facultativa, desde que em período de folga, seja designado eventualmente para participar de operações da Secretaria Municipal de Segurança Pública e Trânsito, e a operação de reforço operacional deverá ser planejada pelo Comandante da Guarda Civil Municipal, utilizando-se do efetivo dos Guardas Municipais ativos, conforme a natureza do trabalho de segurança pública a ser desenvolvido.
              </p>

              <p>
                <strong>§2º</strong> Em casos excepcionalíssimos, que configurem calamidade pública, situação de emergência ou grande comoção social, poderá o Comandante da Guarda Civil Municipal convidar extraordinariamente Guardas Municipais para participarem da operação, devendo, para isso, comunicar ao Chefe do Poder Executivo no prazo máximo de 24 (vinte e quatro) horas contadas do início da jornada especial. Nestes casos, o Prefeito terá o prazo de até 48 (quarenta e oito) horas para manifestar-se sobre a existência da situação excepcionalíssima ou cancelar os convites e a operação especial, sem prejuízo do pagamento da indenização para quem eventualmente tenha prestado serviço nesse interstício.
              </p>

              <p>
                <strong>§3º</strong> Nas situações do parágrafo anterior, a ausência de manifestação do Chefe do Poder Executivo no prazo legal, não importará anuência nem convalidará os convites realizados pela Direção da Guarda Municipal, que poderão ser cancelados a qualquer momento.
              </p>

              <p>
                <strong>§4º</strong> A Indenização de que trata este artigo não será incorporado aos vencimentos para nenhum efeito, inclusive previdenciário, bem como não será considerado para cálculo de quaisquer vantagens pecuniárias.
              </p>

              <p>
                <strong>§5º</strong> Em qualquer hipótese, a execução do Reforço Operacional não poderá prejudicar a escala ou jornada normal à qual estiver submetido o servidor.
              </p>

              <p>
                <strong>§6º</strong> A Indenização por Reforço Operacional será limitado à execução de, no máximo, 72 (setenta e duas) horas de reforços operacionais por mês, além da jornada normal de trabalho do Guarda Civil Municipal, dispensado, em situações excepcionais e devidamente motivadas, o cumprimento de intervalo entre as jornadas regular e especial.
              </p>

              <p>
                <strong>§7º</strong> O Guarda Civil Municipal que, indicado dentre os inscritos para participar da escala especial, nos termos deste artigo, faltar ao serviço, da escala normal ou especial, sem motivo justificável, não poderá participar da escala especial por 60 dias.
              </p>

              <p>
                <strong>Art. 3º</strong> O valor por hora efetivamente trabalhada em cada operação de Indenização por Reforço Operacional observará o disposto no Anexo I desta Lei, podendo ser reajustado por Decreto do Chefe do Poder Executivo, observada a disponibilidade orçamentária e os parâmetros fixados nesta Lei.
              </p>

              <p>
                <strong>Art. 4º</strong> O valor da Indenização por Reforço Operacional (IRO) poderá ser reajustado anualmente, por ato do Chefe do Poder Executivo, com base na variação acumulada do Índice Nacional de Preços ao Consumidor Amplo (IPCA), apurado pelo Instituto Brasileiro de Geografia e Estatística (IBGE) no exercício anterior, visando à preservação do poder aquisitivo da indenização.
              </p>

              <p>
                <strong>§1º</strong> Na hipótese de extinção ou substituição do IPCA, poderá ser adotado outro índice oficial que reflita a variação inflacionária, mediante ato normativo do Poder Executivo.
              </p>

              <p>
                <strong>§2º</strong> O reajuste referido neste artigo será realizado mediante Decreto, dispensada a edição de nova lei específica para cada exercício.
              </p>

              <p>
                <strong>Art. 5º</strong> A indenização por Reforço Operacional deverá ser concedida, preferencialmente, ao Guarda Civil Municipal, em operações realizadas além da jornada de trabalho, durante seu período de folga, guardando um intervalo de descanso de, pelo menos, 12 (doze) horas ininterruptas após sua jornada regular.
              </p>

              <p>
                <strong>Art. 6º</strong> O planejamento, a administração e o acompanhamento da execução do Reforço Operacional, ficará a cargo da Secretaria Municipal de Segurança Pública e Trânsito.
              </p>

              <p>
                <strong>Art. 7 º</strong> Para participar de atividade de reforço operacional, o Guarda Civil Municipal da ativa, deverá:<br/>
                I – Estar em pleno gozo da saúde física e mental;<br/>
                II – Aderir ao regime especial de trabalho voluntariamente, mediante inscrição, perante ao comandante da Guarda Civil Municipal.
              </p>

              <p>
                <strong>§1º</strong> Após a publicação da escala de serviço com a indicação do Guarda Civil Municipal para reforço à atividade operacional, só será admitida desistência se comunicada ao chefe imediato, no prazo de 24 horas antes da operação para a qual foi designado.
              </p>

              <p>
                <strong>§2º</strong> Caso não ocorra a comunicação prevista no parágrafo anterior, aplicar-se-á o disposto no art. 2º, §7º.
              </p>

              <p>
                <strong>Art. 8º</strong> Compete ao comandante da Guarda Civil Municipal, por meio do respectivo Setor de Folha de Pagamento, a execução do procedimento para pagamento da Indenização por Reforço Operacional, utilizando rubrica criada especificamente para este fim.
              </p>

              <p>
                <strong>Art. 9º</strong> Fará jus ao pagamento da indenização por Reforço Operacional, o Guarda Civil Municipal, que não estiver afastado de suas atividades funcionais por motivo de licença, dispensa, férias, cumprimento de sanção disciplinar, afastamento preventivo, aposentadoria, ou qualquer outra situação que impeça o exercício profissional.
              </p>

              <p>
                <strong>§1º</strong> A convocação do Guarda Civil Municipal será realizada por ato do Comandante da Guarda Civil Municipal – GCM, durante o período de folga do servidor, com a finalidade de atender a necessidades eventuais decorrentes de situações excepcionais e temporárias, especificadas no planejamento strategic operacional.
              </p>

              <p>
                <strong>§2º</strong> Terão prioridade na adesão os Guarda Civil Municipal que tenham participado, em um menor número de vezes, das atividades de reforço do serviço operacional.
              </p>

              <p>
                <strong>Art. 10</strong> A Secretaria Municipal de Segurança Pública e Trânsito – SMST e o Comandante da Guarda Civil Municipal deverão elaborar Mapa de Registro atualizado do pessoal cadastrado que preencha os requisitos previstos neste normativo a fim de atender a operacionalidade procedimental.
              </p>

              <p>
                <strong>Art. 11</strong> A indenização por Reforço Operacional será lançada pelo setor de Folha de Pagamento, no mês subsequente ao da execução das operações realizadas, e constará em folha suplementar de pagamento do servidor.
              </p>

              <p>
                <strong>Art. 12</strong> As planilhas deverão ser lançadas pelo setor de pessoal até o fechamento da folha de pagamento do mês subsequente à operação.
              </p>

              <p>
                <strong>Art. 13</strong> O pagamento da Indenização por Reforço Operacional – IRO é incompatível com o pagamento de adicional por hora extra pela mesma jornada extraordinária.
              </p>
              
              <p className="pl-4 border-l-2 border-slate-200 italic my-2">
                <strong>Parágrafo único.</strong> O servidor que aderir à escala de reforço operacional voluntário nos termos desta Lei não fará jus, pelo mesmo período, ao adicional de horas extraordinárias.
              </p>

              <p>
                <strong>Art. 14</strong> As despesas decorrentes da aplicação desta Lei correrão à conta dos recursos orçamentários e financeiros do tesouro municipal, ficando autorizado regulamentação, no que couber pelo Poder Executivo, inclusive, abertura de crédito suplementar.
              </p>

              <p>
                <strong>Art. 15</strong> Esta Lei entra em vigor na data de sua publicação, revogadas as disposições em contrário.
              </p>

              <div className="text-right mt-6 italic">
                <p>Canindé-CE, 24 de setembro de 2025.</p>
                <p className="font-bold mt-2">FRANCISCO JARDEL SOUSA PINHO</p>
                <p className="text-xs text-slate-500">Prefeito Municipal de Canindé</p>
              </div>

              <div className="mt-8">
                <h4 className="font-bold text-slate-900 text-center uppercase tracking-wider mb-4">Anexo I</h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Cargo</th>
                        <th className="px-4 py-3">Classe</th>
                        <th className="px-4 py-3">Valor por Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                      <tr>
                        <td className="px-4 py-3 font-medium">GUARDA CIVIL MUNICIPAL</td>
                        <td className="px-4 py-3">INSPETOR ESPECIAL</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">R$ 25,00</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium">GUARDA CIVIL MUNICIPAL</td>
                        <td className="px-4 py-3">INSPETOR 1ª CLASSE</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">R$ 24,00</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">GUARDA CIVIL MUNICIPAL</td>
                        <td className="px-4 py-3">INSPETOR 2ª CLASSE</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">R$ 23,00</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium">GUARDA CIVIL MUNICIPAL</td>
                        <td className="px-4 py-3">SUB. INSPETOR</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">R$ 22,00</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">GUARDA CIVIL MUNICIPAL</td>
                        <td className="px-4 py-3">GUARDA 1ª CLASSE</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">R$ 21,00</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-medium">GUARDA CIVIL MUNICIPAL</td>
                        <td className="px-4 py-3">GUARDA 2ª CLASSE</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">R$ 20,00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="space-y-4 border-t border-slate-100 bg-slate-50 p-4 sm:p-6 pb-[calc(1rem+var(--safe-area-bottom))]">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50">
              <input
                type="checkbox"
                id="checkbox-aceite"
                checked={termoAceito}
                onChange={(e) => setTermoAceito(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm font-semibold text-slate-700 leading-tight">
                Declaro que li na íntegra, compreendo e aceito todos os termos e regulamentos descritos na Lei Nº 2.739/2025 sobre a Indenização de Reforço Operacional (IRO).
              </span>
            </label>

            <div className="flex flex-col items-center justify-end gap-3 pt-2 sm:flex-row">
              <Button
                variant="outline"
                className="w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-full font-bold h-11 px-6 transition-all shadow-none"
                onClick={handleRecusar}
                disabled={enviandoAceite}
              >
                NÃO ACEITO
              </Button>
              <Button
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full font-bold h-11 px-8 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                onClick={handleAceitar}
                disabled={!termoAceito || enviandoAceite}
              >
                {enviandoAceite ? 'PROCESSANDO...' : 'ACEITO E CONCORDO'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default GuardaDashboard;
