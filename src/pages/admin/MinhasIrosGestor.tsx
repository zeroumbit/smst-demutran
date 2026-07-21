import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Calendar, CheckCircle2, Clock, Hourglass, Search, AlertTriangle, Gavel, DollarSign, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { IROOperacao, IROCandidatura } from '@/types/admin';

const fmtDateBR = (d: string | null | undefined): string => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
};

const TEMPO_SOLICITACAO_LABEL: Record<string, string> = {
  imediato: 'Imediato', '1h': '1 hora', '6h': '6 horas', '8h': '8 horas',
  '12h': '12 horas', '24h': '24 horas', '48h': '48 horas',
};

const horasDaSolicitacao = (t: string): number => {
  if (t === 'imediato') return 0;
  return parseInt(t) || 0;
};

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

const todayStr = () => new Date().toISOString().slice(0, 10);
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const MinhasIrosGestor = () => {
  const { setorId, profile, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [operacoes, setOperacoes] = useState<IROOperacao[]>([]);
  const [minhasCandidaturas, setMinhasCandidaturas] = useState<IROCandidatura[]>([]);
  const [operacaoDatas, setOperacaoDatas] = useState<Record<string, string[]>>({});
  const [vagasPorData, setVagasPorData] = useState<Record<string, number>>({});
  const [vagasPreenchidas, setVagasPreenchidas] = useState<Record<string, boolean>>({});
  const [minhasCandidaturasPorData, setMinhasCandidaturasPorData] = useState<Record<string, boolean>>({});
  const [selectedOperacao, setSelectedOperacao] = useState<IROOperacao | null>(null);
  const [datasSelecionadas, setDatasSelecionadas] = useState<string[]>([]);
  const [selectedCandidatura, setSelectedCandidatura] = useState<IROCandidatura | null>(null);
  const [candidaturaDetalhesAberto, setCandidaturaDetalhesAberto] = useState(false);
  const [candidaturaResultado, setCandidaturaResultado] = useState<{
    sucesso: boolean; mensagem: string; operacaoNome: string;
    dataOperacao?: string; horas?: number; totalMes?: number;
  } | null>(null);
  const [candidaturaResultadoAberto, setCandidaturaResultadoAberto] = useState(false);
  const [candidaturaParaCancelar, setCandidaturaParaCancelar] = useState<IROCandidatura | null>(null);
  const [leiDialogAberta, setLeiDialogAberta] = useState(false);
  const [resumo, setResumo] = useState({ total_horas_mes: 0, total_reais: 0, banco_horas: 0, horas_disponiveis: 0, mes_anterior_horas: 0, mes_anterior_reais: 0 });
  const [search, setSearch] = useState('');
  const [valorHoraState, setValorHoraState] = useState(0);

  const iroSetorId = profile?.can_manage_guarda_iros && profile.guarda_setor_id
    ? profile.guarda_setor_id
    : setorId;

  const loadData = async () => {
    setLoading(true);
    try {
      const applyFilter = <T extends { eq: (c: string, v: string) => T }>(q: T) =>
        iroSetorId ? q.eq('setor_id', iroSetorId) : q;

      const hojeStr = todayStr();

      const [opRes, candRes] = await Promise.all([
        applyFilter(
          supabase.from('iro_operacoes').select('*').order('data_inicio', { ascending: false })
        ),
        supabase.from('iro_candidaturas')
          .select('*, iro_operacoes!inner(nome, setor_id)')
          .eq('usuario_id', user!.user_id)
          .order('data_operacao', { ascending: false }),
      ]);

      if (opRes.error) throw opRes.error;
      if (candRes.error) throw candRes.error;

      let ops = (opRes.data || []) as IROOperacao[];
      if (iroSetorId) ops = ops.filter((o) => o.setor_id === iroSetorId);
      const validOps = ops.filter((op: any) => op.ativo && op.data_fim >= hojeStr) as IROOperacao[];
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
        ...(c.iro_operacoes || {}),
        ...c,
        status: c.adicionado_manual && c.status !== 'cancelado' ? 'realizado' : c.status,
        operacao_nome: c.operacao_nome || (c.iro_operacoes?.codigo ? c.iro_operacoes.codigo + ' ' : '') + (c.iro_operacoes?.nome || 'IRO extra'),
        operacao_codigo: c.iro_operacoes?.codigo || null,
        iro_operacoes: c.iro_operacoes,
      }));
      setMinhasCandidaturas(lista);

      const minhasCandidaturasPorDataMap: Record<string, boolean> = {};
      lista
        .filter((c: any) => c.operacao_id && ['pendente', 'confirmado', 'realizado'].includes(c.status))
        .forEach((c: any) => {
          minhasCandidaturasPorDataMap[`${c.operacao_id}:${c.data_operacao}`] = true;
        });
      setMinhasCandidaturasPorData(minhasCandidaturasPorDataMap);

      const { data: vagasCountData } = await supabase
        .from('iro_candidaturas')
        .select('operacao_id, data_operacao')
        .in('status', ['pendente', 'confirmado', 'realizado']);

      const vagasCountMap = new Map<string, number>();
      (vagasCountData || []).forEach((v: any) => {
        const key = `${v.operacao_id}:${v.data_operacao}`;
        vagasCountMap.set(key, (vagasCountMap.get(key) || 0) + 1);
      });

      const vagasPorDataMap: Record<string, number> = {};
      const vagasPreenchidasMap: Record<string, boolean> = {};
      validOps.forEach((op: any) => {
        const datas = datasMap[op.id] || [];
        const datasComVaga = datas.filter((data) => {
          const ocupadas = vagasCountMap.get(`${op.id}:${data}`) || 0;
          const disponiveis = Math.max(op.vagas_por_dia - ocupadas, 0);
          vagasPorDataMap[`${op.id}:${data}`] = disponiveis;
          return disponiveis > 0;
        });
        vagasPreenchidasMap[op.id] = datas.length > 0 && datasComVaga.length === 0;
      });
      setVagasPorData(vagasPorDataMap);
      setVagasPreenchidas(vagasPreenchidasMap);

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      const firstDayAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const lastDayAnterior = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

      const horasMes = lista
        .filter((c: any) => ['confirmado', 'realizado'].includes(c.status) && c.data_operacao >= firstDay && c.data_operacao <= lastDay)
        .reduce((acc: number, c: any) => acc + Number(c.horas_trabalhadas || 0), 0);

      const horasMesAnterior = lista
        .filter((c: any) => ['confirmado', 'realizado'].includes(c.status) && c.data_operacao >= firstDayAnterior && c.data_operacao <= lastDayAnterior)
        .reduce((acc: number, c: any) => acc + Number(c.horas_trabalhadas || 0), 0);

      let bancoHoras = 0;
      let valorHora = 0;

      const { data: banco } = await supabase.from('iro_banco_horas').select('horas_excedentes').eq('usuario_id', user!.user_id).maybeSingle();
      bancoHoras = banco ? Number((banco as any).horas_excedentes) : 0;

      const { data: guardaRes } = await supabase.rpc('buscar_guarda_por_usuario', { p_usuario_id: user!.user_id });
      const graduacaoId = (guardaRes as any)?.graduacao_id || profile?.graduacao_id;
      if (graduacaoId) {
        const { data: valorData } = await supabase
          .from('iro_valores_graduacao')
          .select('valor_hora')
          .eq('graduacao_id', graduacaoId)
          .eq('ativo', true)
          .maybeSingle();
        if (valorData) valorHora = Number((valorData as any).valor_hora) || 0;
      }

      setValorHoraState(valorHora);
      setResumo({
        total_horas_mes: horasMes,
        total_reais: horasMes * valorHora,
        horas_disponiveis: 0,
        banco_horas: bancoHoras,
        mes_anterior_horas: horasMesAnterior,
        mes_anterior_reais: horasMesAnterior * valorHora,
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [user?.user_id]);

  const candidaturasAtivas = useMemo(
    () => minhasCandidaturas.filter((c) => c.status !== 'cancelado'),
    [minhasCandidaturas],
  );

  const filteredOperacoes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return operacoes.filter((o) => {
      if (term && !o.nome.toLowerCase().includes(term) && !(o.descricao || '').toLowerCase().includes(term)) return false;
      return true;
    });
  }, [operacoes, search]);

  const handleCandidatar = async () => {
    if (!selectedOperacao || datasSelecionadas.length === 0 || !user?.user_id) return;
    if (selectedOperacao.data_fim < todayStr()) {
      toast({ title: 'Prazo encerrado', description: 'O período desta operação já se encerrou.', variant: 'destructive' });
      return;
    }

    const resultados: Array<{ data: string; sucesso: boolean; mensagem: string; total_mes?: number }> = [];
    for (const data of datasSelecionadas) {
      const { data: result, error } = await supabase.rpc('candidatar_se_iro', {
        p_operacao_id: selectedOperacao.id,
        p_usuario_id: user.user_id,
        p_data: data,
      });
      if (error) {
        resultados.push({ data, sucesso: false, mensagem: error.message });
        continue;
      }
      const r = result as { sucesso: boolean; mensagem: string; total_mes?: number };
      resultados.push({ data, sucesso: r.sucesso, mensagem: r.mensagem, total_mes: r.total_mes });
    }

    const sucessos = resultados.filter((r) => r.sucesso);
    const falhas = resultados.filter((r) => !r.sucesso);
    const ultimoSucesso = sucessos.at(-1);
    setCandidaturaResultado({
      sucesso: sucessos.length > 0,
      mensagem: sucessos.length > 0
        ? `${sucessos.length} candidatura(s) realizada(s) com sucesso${falhas.length ? `; ${falhas.length} não realizada(s).` : '.'}`
        : (falhas[0]?.mensagem || 'Nenhuma candidatura foi realizada.'),
      operacaoNome: selectedOperacao.nome,
      dataOperacao: sucessos.length === 1 ? sucessos[0].data : undefined,
      horas: selectedOperacao.horas_por_dia,
      totalMes: ultimoSucesso?.total_mes,
    });
    setCandidaturaResultadoAberto(true);
    setSelectedOperacao(null);
    void loadData();
  };

  const handleCancelar = async (item: IROCandidatura) => {
    const hoje = new Date();
    const dataOp = new Date(item.data_operacao + 'T00:00:00');
    const diffHours = (dataOp.getTime() - hoje.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      toast({
        title: 'Cancelamento bloqueado',
        description: 'Desistências com menos de 24h da operação devem ser informadas diretamente ao supervisor/chefe de setor.',
        variant: 'destructive',
      });
      return;
    }

    const op = operacoes.find((o) => o.id === item.operacao_id);
    if (op && horasDaSolicitacao(op.tempo_solicitacao) >= 48) {
      setCandidaturaParaCancelar(item);
      setLeiDialogAberta(true);
      return;
    }

    const { error } = await supabase.from('iro_candidaturas').update({ status: 'cancelado' }).eq('id', item.id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Candidatura cancelada' });
    void loadData();
  };

  const confirmarCancelamento = async () => {
    if (!candidaturaParaCancelar) return;
    const hoje = new Date();
    const dataOp = new Date(candidaturaParaCancelar.data_operacao + 'T00:00:00');
    const diffHours = (dataOp.getTime() - hoje.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      toast({
        title: 'Cancelamento bloqueado',
        description: 'Desistências com menos de 24h da operação devem ser informadas diretamente ao supervisor/chefe de setor.',
        variant: 'destructive',
      });
      setLeiDialogAberta(false);
      setCandidaturaParaCancelar(null);
      return;
    }

    const { error } = await supabase.from('iro_candidaturas').update({ status: 'cancelado' }).eq('id', candidaturaParaCancelar.id);
    setLeiDialogAberta(false);
    setCandidaturaParaCancelar(null);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Candidatura cancelada' });
    void loadData();
  };

  if (loading) {
    return (
      <AdminLayout backPath="/admin/dashboard/guarda-municipal" backLabel="Dashboard">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 sm:p-8">Carregando...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout backPath="/admin/dashboard/guarda-municipal" backLabel="Dashboard">
      <div className="space-y-4 sm:space-y-6">
        <section className="rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-4 py-4 text-white sm:rounded-[28px] sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-100/70 sm:text-[11px]">Guarda Municipal</p>
              <h1 className="mt-2 text-xl font-black leading-tight text-white sm:text-2xl md:mt-3 md:text-[26px] lg:text-[34px]">Minhas IROs</h1>
            </div>
          </div>
          <p className="mt-1.5 hidden max-w-xl text-[13px] leading-5 text-white md:block md:mt-2 md:text-[14px] md:leading-6">Gerencie suas operações e horas IRO.</p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 native-scrollbar whitespace-nowrap sm:hidden">
            <Badge variant="outline" className="whitespace-nowrap rounded-full border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
              Mês {resumo.total_horas_mes}h
            </Badge>
            <Badge variant="outline" className="whitespace-nowrap rounded-full border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
              Banco {resumo.banco_horas}h
            </Badge>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-[28px] bg-white/10 p-3.5 backdrop-blur-sm sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/60 sm:text-[11px]">Total no mês</p>
                  <p className="mt-1 text-[22px] font-black leading-none text-white sm:text-3xl">{resumo.total_horas_mes}h</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-white/70">R$ {resumo.total_reais.toFixed(2).replace('.', ',')}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[28px] bg-white/10 p-3.5 backdrop-blur-sm sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/60 sm:text-[11px]">IROS mês anterior</p>
                  <p className="mt-1 text-[22px] font-black leading-none text-white sm:text-3xl">{resumo.mes_anterior_horas}h</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-white/70">
                    <span className="text-white/50">ant: </span>{resumo.mes_anterior_horas}h
                    <span className="mx-1.5 text-white/30">|</span>
                    <span className="text-white/50">atu: </span>{resumo.total_horas_mes}h
                    {resumo.mes_anterior_horas > 0 && (
                      <span className="ml-1.5">· R$ {resumo.mes_anterior_reais.toFixed(2).replace('.', ',')}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="col-span-2 rounded-[28px] bg-white/10 p-3.5 backdrop-blur-sm sm:col-span-1 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/60 sm:text-[11px]">Banco de horas</p>
                  <p className="mt-1 text-[22px] font-black leading-none text-amber-300 sm:text-3xl">{resumo.banco_horas}h</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Card className="rounded-2xl border-slate-200/80">
          <CardContent className="px-4 py-4 sm:px-5 sm:py-5">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Buscar operações</Label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome..." className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 text-[15px] font-medium" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-600">Operações disponíveis</h2>
          {filteredOperacoes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-[15px] text-slate-400 sm:p-8">
              Nenhuma operação disponível no momento.
            </div>
          ) : (
            <div className="native-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-3 lg:grid-cols-4">
              {filteredOperacoes.map((op) => (
                <article key={op.id} className="flex min-w-[84%] snap-start flex-col rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)] active:scale-[0.99] sm:min-w-0 sm:px-5">
                  {vagasPreenchidas[op.id] ? (
                    <Badge variant="outline" className="self-start rounded-full bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                      Vagas preenchidas
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="self-start rounded-full bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                      {op.vagas_por_dia} vaga(s)/dia
                    </Badge>
                  )}
                  <h3 className="mt-2 text-[15px] font-bold text-slate-900 line-clamp-2 leading-snug"><span className="text-slate-400 font-mono text-[13px] font-medium">{op.codigo}</span> {op.nome}</h3>
                  {op.descricao && <p className="text-[13px] leading-5 text-slate-500 mt-0.5 line-clamp-2">{op.descricao}</p>}
                  <div className="mt-auto pt-3 space-y-1.5 text-[13px] text-slate-500">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0" />{fmtDateBR(op.data_inicio)} - {fmtDateBR(op.data_fim)}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 shrink-0" />{op.horario_previsto.slice(0, 5)}</span>
                    <span className="flex items-center gap-1.5"><Hourglass className="h-3.5 w-3.5 shrink-0" />{op.horas_por_dia}h/dia</span>
                  </div>
                  {vagasPreenchidas[op.id] ? (
                    <Button size="sm" disabled className="mt-3 min-h-11 w-full rounded-xl text-[13px] font-semibold sm:min-h-10 opacity-50 cursor-not-allowed">
                      VAGAS PREENCHIDAS
                    </Button>
                  ) : (
                    <Button size="sm" className="mt-3 min-h-11 w-full rounded-xl text-[13px] font-semibold sm:min-h-10" onClick={() => { setSelectedOperacao(op); setDatasSelecionadas([]); }}>
                      VER DETALHES
                    </Button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-600">Minhas candidaturas ativas</h2>
          {candidaturasAtivas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-[15px] text-slate-400 sm:p-8">
              Nenhuma candidatura ativa.
            </div>
          ) : (
            <div className="space-y-3">
              {candidaturasAtivas.map((c) => (
                <div key={c.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)] active:scale-[0.99] sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-slate-900">{c.operacao_nome}</p>
                    <div className="mt-0.5 text-[13px] leading-5 text-slate-500">
                      <span>{fmtDateBR(c.data_operacao)} &middot; {c.horas_trabalhadas}h &middot;</span>
                      <Badge variant="outline" className={cn('ml-1.5 rounded-full text-[11px] font-bold px-3 py-1', c.data_operacao < new Date().toISOString().slice(0, 10) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : c.status === 'confirmado' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-sky-50 text-sky-700 border-sky-200')}>
                        {c.data_operacao < new Date().toISOString().slice(0, 10) ? 'FINALIZADA' : c.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="min-h-10 rounded-xl text-[13px] font-semibold" onClick={() => { setSelectedCandidatura(c); setCandidaturaDetalhesAberto(true); }}>
                      Detalhes
                    </Button>
                    {!c.adicionado_manual && c.status !== 'realizado' && c.data_operacao >= new Date().toISOString().slice(0, 10) && (
                      <Button size="sm" variant="outline" className="min-h-10 rounded-xl border-red-200 text-[13px] font-semibold text-red-600 hover:bg-red-50" onClick={() => void handleCancelar(c)}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ResponsiveDialog
        open={Boolean(selectedOperacao)}
        onOpenChange={(open) => { if (!open) { setSelectedOperacao(null); setDatasSelecionadas([]); } }}
        title={selectedOperacao?.nome || 'Detalhes da operação'}
        description="Veja os detalhes da operação."
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1 rounded-xl text-[13px] font-semibold" onClick={() => { setSelectedOperacao(null); setDatasSelecionadas([]); }}>Cancelar</Button>
            <Button className="flex-1 rounded-xl text-[13px] font-semibold" disabled={datasSelecionadas.length === 0} onClick={() => void handleCandidatar()}>
              Confirmar {datasSelecionadas.length || ''} candidatura(s)
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
                  const datas = operacaoDatas[selectedOperacao.id] || [];
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
                      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-7">
                        {grupoDatas.map((data) => {
                          const cKey = `${selectedOperacao.id}:${data}`;
                          const vagas = vagasPorData[cKey] ?? 0;
                          const jaInscrito = minhasCandidaturasPorData[cKey];
                          const isSelected = selected.has(data);

                          return (
                            <button
                              key={data}
                              type="button"
                              disabled={jaInscrito || vagas <= 0}
                              onClick={() => {
                                if (jaInscrito) return;
                                setDatasSelecionadas((prev) =>
                                  prev.includes(data) ? prev.filter((d) => d !== data) : [...prev, data],
                                );
                              }}
                              className={`relative flex flex-col items-center rounded-xl px-1 py-2.5 text-center text-[11px] font-medium transition-all ${
                                jaInscrito
                                  ? 'bg-sky-100 text-sky-800 ring-1 ring-sky-300 cursor-default'
                                  : isSelected
                                    ? 'bg-brand-100 text-brand-800 ring-2 ring-brand-500'
                                    : vagas <= 0
                                      ? 'cursor-not-allowed bg-slate-100 text-slate-300'
                                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-300 hover:shadow-sm'
                              }`}
                            >
                              <span className="text-[10px] font-bold">{data.slice(8, 10)}</span>
                              {jaInscrito && <span className="mt-0.5 text-[9px] font-bold uppercase leading-tight">Insc.</span>}
                              {!jaInscrito && vagas > 0 && (
                                <span className="mt-0.5 text-[9px] text-slate-400">{vagas}v</span>
                              )}
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
        onOpenChange={setCandidaturaResultadoAberto}
        title="Resultado da candidatura"
      >
        <div className="space-y-3 py-2">
          {candidaturaResultado?.sucesso ? (
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p className="text-sm font-semibold">{candidaturaResultado.mensagem}</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-semibold">{candidaturaResultado?.mensagem}</p>
            </div>
          )}
          {candidaturaResultado?.totalMes !== undefined && (
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">Total de horas no mês</p>
              <p className="text-lg font-bold text-slate-900">{candidaturaResultado.totalMes}h</p>
            </div>
          )}
          <Button className="w-full" onClick={() => setCandidaturaResultadoAberto(false)}>Fechar</Button>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={Boolean(selectedCandidatura)}
        onOpenChange={(open) => { if (!open) setSelectedCandidatura(null); }}
        title="Detalhes da candidatura"
      >
        {selectedCandidatura && (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Informações</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Operação</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{selectedCandidatura.operacao_nome}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Data</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{fmtDateBR(selectedCandidatura.data_operacao)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Horas</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{selectedCandidatura.horas_trabalhadas}h</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Status</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{selectedCandidatura.status}</p>
                </div>
              </div>
            </div>
            {valorHoraState > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Valor estimado</h4>
                <p className="text-sm text-slate-500">{selectedCandidatura.horas_trabalhadas}h × R$ {valorHoraState.toFixed(2).replace('.', ',')}/h</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(selectedCandidatura.horas_trabalhadas * valorHoraState)}</p>
              </div>
            )}
            <Button className="w-full" onClick={() => setSelectedCandidatura(null)}>Fechar</Button>
          </div>
        )}
      </ResponsiveDialog>

      <ResponsiveDialog
        open={leiDialogAberta}
        onOpenChange={(open) => { if (!open) { setLeiDialogAberta(false); setCandidaturaParaCancelar(null); } }}
        title="Lei Municipal 2.739/2025"
        description="Confirmação exigida por lei"
      >
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Gavel className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm text-amber-800">
              <p className="font-bold">Atenção</p>
              <p className="mt-1">
                A Lei Municipal 2.739/2025 exige que desistências de IRO com prazo de solicitação igual ou superior a 48h sejam formalmente registradas.
              </p>
              <p className="mt-2">
                Ao confirmar, sua desistência será registrada como cancelamento, e você poderá estar sujeito às penalidades previstas em caso de reincidência sem justificativa.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setLeiDialogAberta(false); setCandidaturaParaCancelar(null); }}>
              Voltar
            </Button>
            <Button variant="destructive" className="flex-1" onClick={confirmarCancelamento}>
              Confirmar cancelamento
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </AdminLayout>
  );
};

export default MinhasIrosGestor;
