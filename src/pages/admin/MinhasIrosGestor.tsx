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
  const [selectedOperacao, setSelectedOperacao] = useState<IROOperacao | null>(null);
  const [datasSelecionadas, setDatasSelecionadas] = useState<string[]>([]);
  const [candidaturaResultado, setCandidaturaResultado] = useState<{
    sucesso: boolean; mensagem: string; operacaoNome: string;
    dataOperacao?: string; horas?: number; totalMes?: number;
  } | null>(null);
  const [candidaturaResultadoAberto, setCandidaturaResultadoAberto] = useState(false);
  const [candidaturaParaCancelar, setCandidaturaParaCancelar] = useState<IROCandidatura | null>(null);
  const [leiDialogAberta, setLeiDialogAberta] = useState(false);
  const [search, setSearch] = useState('');

  const iroSetorId = profile?.can_manage_guarda_iros && profile.guarda_setor_id
    ? profile.guarda_setor_id
    : setorId;

  const loadData = async () => {
    setLoading(true);
    try {
      const applyFilter = <T extends { eq: (c: string, v: string) => T }>(q: T) =>
        iroSetorId ? q.eq('setor_id', iroSetorId) : q;

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

      setOperacoes(ops);
      setMinhasCandidaturas((candRes.data || []) as IROCandidatura[]);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const candidaturasAtivas = useMemo(
    () => minhasCandidaturas.filter((c) => c.status !== 'cancelado'),
    [minhasCandidaturas],
  );

  const candidaturasPorData = useMemo(() => {
    const map = new Map<string, IROCandidatura>();
    for (const c of candidaturasAtivas) {
      const key = `${c.operacao_id}_${c.data_operacao}`;
      map.set(key, c);
    }
    return map;
  }, [candidaturasAtivas]);

  const candidaturaKey = (opId: string, data: string) => `${opId}_${data}`;

  const filteredOperacoes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return operacoes.filter((o) => {
      if (term && !o.nome.toLowerCase().includes(term) && !(o.descricao || '').toLowerCase().includes(term)) return false;
      return true;
    });
  }, [operacoes, search]);

  const resumo = useMemo(() => {
    const mesAtual = new Date().toISOString().slice(0, 7);
    const horas = minhasCandidaturas
      .filter((c) => c.status !== 'cancelado' && c.data_operacao.slice(0, 7) === mesAtual)
      .reduce((acc, c) => acc + Number(c.horas_trabalhadas || 0), 0);
    return {
      candidaturasMes: candidaturasAtivas.filter((c) => c.data_operacao.slice(0, 7) === mesAtual).length,
      horasMes: horas,
    };
  }, [candidaturasAtivas, minhasCandidaturas]);

  const handleSelectOperacao = (op: IROOperacao) => {
    setSelectedOperacao(op);
    setDatasSelecionadas([]);
  };

  const handleToggleData = (data: string) => {
    setDatasSelecionadas((prev) =>
      prev.includes(data) ? prev.filter((d) => d !== data) : [...prev, data],
    );
  };

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
      resultados.push({ data: data, sucesso: r.sucesso, mensagem: r.mensagem, total_mes: r.total_mes });
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

  const renderDateGrid = (op: IROOperacao) => {
    const datas = gerarIntervaloDatas(op.data_inicio, op.data_fim);
    return (
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
        {datas.map((data) => {
          const key = candidaturaKey(op.id, data);
          const candidatura = candidaturasPorData.get(key);
          const selecionada = datasSelecionadas.includes(data);
          const isPast = data < todayStr();
          const isEnrolled = !!candidatura;

          return (
            <button
              key={data}
              type="button"
              disabled={(isPast && !isEnrolled) || data < op.data_inicio || data > op.data_fim}
              onClick={() => {
                if (isEnrolled) return;
                handleToggleData(data);
              }}
              className={`relative flex flex-col items-center rounded-xl px-1.5 py-2.5 text-center text-[11px] font-medium transition-all ${
                isEnrolled
                  ? candidatura?.status === 'confirmado' || candidatura?.status === 'realizado'
                    ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                    : 'bg-sky-100 text-sky-800 ring-1 ring-sky-300'
                  : selecionada
                    ? 'bg-brand-100 text-brand-800 ring-2 ring-brand-500'
                    : isPast
                      ? 'cursor-not-allowed bg-slate-100 text-slate-300'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-300 hover:shadow-sm'
              }`}
            >
              <span className="text-[10px] font-bold">{data.slice(8, 10)}/{data.slice(5, 7)}</span>
              {isEnrolled && (
                <span className="mt-0.5 text-[9px] font-bold uppercase leading-tight">
                  {candidatura?.status === 'confirmado' ? 'Conf.' : candidatura?.status === 'realizado' ? 'Real.' : 'Insc.'}
                </span>
              )}
              {!isEnrolled && !isPast && (
                <span className="mt-0.5 text-[9px] text-slate-400">{op.vagas_por_dia}v</span>
              )}
            </button>
          );
        })}
      </div>
    );
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
          <p className="mt-1.5 hidden max-w-xl text-[13px] leading-5 text-white md:block md:mt-2 md:text-[14px] md:leading-6">
            Visualize e gerencie suas inscrições em operações IRO.
          </p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:hidden">
            <Badge variant="outline" className="whitespace-nowrap rounded-full border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
              {resumo.candidaturasMes} neste mês
            </Badge>
            <Badge variant="outline" className="whitespace-nowrap rounded-full border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
              {resumo.horasMes}h no mês
            </Badge>
          </div>
          <div className="mt-4 hidden gap-4 sm:flex">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-100/70">Inscrições neste mês</p>
              <p className="mt-1 text-2xl font-black text-white">{resumo.candidaturasMes}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-100/70">Horas no mês</p>
              <p className="mt-1 text-2xl font-black text-white">{resumo.horasMes}h</p>
            </div>
          </div>
        </section>

        <div className="space-y-2">
          <Label className="text-slate-500">Buscar operação</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou descrição..."
              className="h-11 rounded-2xl border-slate-200 bg-white pl-10 text-sm shadow-none"
            />
          </div>
        </div>

        {selectedOperacao && (
          <Card className="rounded-[24px] border-slate-200">
            <CardContent className="space-y-4 px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedOperacao.nome}</h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {fmtDateBR(selectedOperacao.data_inicio)} → {fmtDateBR(selectedOperacao.data_fim)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-full p-0 text-slate-400"
                  onClick={() => { setSelectedOperacao(null); setDatasSelecionadas([]); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">{selectedOperacao.horario_previsto.slice(0, 5)}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                  <Hourglass className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">{selectedOperacao.horas_por_dia}h/dia</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">{TEMPO_SOLICITACAO_LABEL[selectedOperacao.tempo_solicitacao] || selectedOperacao.tempo_solicitacao}</span>
                </div>
              </div>

              {selectedOperacao.descricao && (
                <p className="text-sm text-slate-500">{selectedOperacao.descricao}</p>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Datas</span>
                  <span className="text-xs text-slate-400">
                    Vagas: {selectedOperacao.vagas_por_dia}/dia
                  </span>
                </div>
                {renderDateGrid(selectedOperacao)}
              </div>

              {datasSelecionadas.length > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-brand-800">{datasSelecionadas.length} dia(s) selecionado(s)</p>
                    <p className="text-xs text-brand-600">
                      Total: ~{datasSelecionadas.length * selectedOperacao.horas_por_dia}h
                    </p>
                  </div>
                  <Button size="sm" onClick={handleCandidatar}>
                    Candidatar-se
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {filteredOperacoes.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-400">Nenhuma operação encontrada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOperacoes.map((op) => {
              const datas = gerarIntervaloDatas(op.data_inicio, op.data_fim);
              const enrolledCount = datas.filter((d) => candidaturasPorData.has(candidaturaKey(op.id, d))).length;
              const isSelected = selectedOperacao?.id === op.id;
              return (
                <Card
                  key={op.id}
                  className={`cursor-pointer rounded-[20px] border-slate-200 transition-all hover:shadow-sm ${
                    isSelected ? 'ring-2 ring-brand-500' : ''
                  } ${!op.ativo ? 'opacity-60' : ''}`}
                  onClick={() => handleSelectOperacao(op)}
                >
                  <CardContent className="flex items-center gap-4 px-5 py-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-slate-900">{op.nome}</span>
                        {!op.ativo && <Badge variant="secondary" className="rounded-full text-[10px]">Inativa</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>{fmtDateBR(op.data_inicio)} → {fmtDateBR(op.data_fim)}</span>
                        <span>{op.horario_previsto.slice(0, 5)}</span>
                        <span>{op.horas_por_dia}h/dia</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {enrolledCount > 0 && (
                        <Badge className="rounded-full bg-sky-100 text-sky-700 border-0 text-[10px] font-bold">
                          {enrolledCount} insc.
                        </Badge>
                      )}
                      <span className="text-[11px] text-slate-400">{datas.length} dias</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {candidaturasAtivas.length > 0 && (
          <Card className="rounded-[24px] border-slate-200">
            <CardContent className="space-y-3 px-5 py-5">
              <h3 className="text-base font-bold text-slate-900">Minhas inscrições ativas</h3>
              <div className="divide-y divide-slate-100">
                {candidaturasAtivas.slice(0, 20).map((item) => {
                  const op = operacoes.find((o) => o.id === item.operacao_id);
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{item.operacao_nome || op?.nome}</p>
                        <p className="text-xs text-slate-500">
                          {fmtDateBR(item.data_operacao)} — {item.horas_trabalhadas}h
                          {item.status === 'confirmado' && (
                            <span className="ml-2 text-emerald-600">• Confirmado</span>
                          )}
                          {item.status === 'realizado' && (
                            <span className="ml-2 text-emerald-600">• Realizado</span>
                          )}
                        </p>
                      </div>
                      {item.status === 'inscrito' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 shrink-0 rounded-xl border-red-200 text-xs text-red-600 hover:bg-red-50"
                          onClick={(e) => { e.stopPropagation(); void handleCancelar(item); }}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
