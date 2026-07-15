import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useAuth, getDashboardUrl } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Calendar, CheckCircle2, Clock, Hourglass, Search, ChevronRight, History, AlertTriangle, Gavel, DollarSign, TrendingUp, X } from 'lucide-react';
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

const GuardaIros = () => {
  const navigate = useNavigate();
  const { setorSlug } = useParams<{ setorSlug?: string }>();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [operacoes, setOperacoes] = useState<IROOperacao[]>([]);
  const [minhasCandidaturas, setMinhasCandidaturas] = useState<IROCandidatura[]>([]);
  const [resumo, setResumo] = useState({ total_horas_mes: 0, total_reais: 0, horas_disponiveis: 0, banco_horas: 0, mes_anterior_horas: 0, mes_anterior_reais: 0 });

  const [vagasPreenchidas, setVagasPreenchidas] = useState<Record<string, boolean>>({});
  const [selectedOperacao, setSelectedOperacao] = useState<IROOperacao | null>(null);
  const [candidaturaData, setCandidaturaData] = useState({ data_operacao: new Date().toISOString().slice(0, 10) });

  const [leiDialogAberta, setLeiDialogAberta] = useState(false);
  const [candidaturaParaCancelar, setCandidaturaParaCancelar] = useState<IROCandidatura | null>(null);
  const [candidaturaResultado, setCandidaturaResultado] = useState<{ sucesso: boolean; mensagem: string; operacaoNome?: string; dataOperacao?: string; horas?: number; totalMes?: number } | null>(null);
  const [candidaturaResultadoAberto, setCandidaturaResultadoAberto] = useState(false);

  const loadData = async () => {
    if (!user?.user_id) { setLoading(false); return; }
    setLoading(true);

    try {
      let setorId = '';
      const { data: sData } = await supabase
        .from('setores')
        .select('id')
        .eq('slug', 'guarda-municipal')
        .maybeSingle();
      if (sData) setorId = sData.id;

      const [opRes, candRes, guardaRes, vagasCountRes] = await Promise.all([
        supabase.from('iro_operacoes').select('*').eq('setor_id', setorId || '').eq('ativo', true).order('data_inicio', { ascending: false }),
        supabase.from('iro_candidaturas').select('*, iro_operacoes!inner(nome)').eq('usuario_id', user.user_id).order('created_at', { ascending: false }),
        supabase.rpc('buscar_guarda_por_usuario', { p_usuario_id: user.user_id }),
        supabase.from('iro_candidaturas').select('operacao_id').in('status', ['pendente', 'confirmado', 'realizado']),
      ]);

      const hojeStr = new Date().toISOString().slice(0, 10);
      const validOps = (opRes.data || []).filter((op: any) => op.ativo && op.data_fim >= hojeStr) as IROOperacao[];
      setOperacoes(validOps);
      const lista = (candRes.data || []).map((c: any) => ({ ...c, operacao_nome: c.iro_operacoes?.nome || '' }));
      setMinhasCandidaturas(lista);

      const vagasCountMap = new Map<string, number>();
      (vagasCountRes.data || []).forEach((v: any) => {
        vagasCountMap.set(v.operacao_id, (vagasCountMap.get(v.operacao_id) || 0) + 1);
      });
      const vagasPreenchidasMap: Record<string, boolean> = {};
      validOps.forEach((op: any) => {
        const dias = Math.ceil((new Date(op.data_fim).getTime() - new Date(op.data_inicio).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const totalVagas = op.vagas_por_dia * dias;
        vagasPreenchidasMap[op.id] = (vagasCountMap.get(op.id) || 0) >= totalVagas;
      });
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

      const { data: banco } = await supabase.from('iro_banco_horas').select('horas_excedentes').eq('usuario_id', user.user_id).maybeSingle();

      let valorHora = 0;
      const graduacaoId = (guardaRes.data as { graduacao_id?: string } | null)?.graduacao_id || profile?.graduacao_id;
      if (graduacaoId) {
        const { data: valorData } = await supabase
          .from('iro_valores_graduacao')
          .select('valor_hora')
          .eq('graduacao_id', graduacaoId)
          .eq('ativo', true)
          .maybeSingle();
        if (valorData) valorHora = Number((valorData as any).valor_hora) || 0;
      }

      setResumo({
        total_horas_mes: horasMes,
        total_reais: horasMes * valorHora,
        horas_disponiveis: 0,
        banco_horas: banco ? Number((banco as any).horas_excedentes) : 0,
        mes_anterior_horas: horasMesAnterior,
        mes_anterior_reais: horasMesAnterior * valorHora,
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [user?.user_id, profile?.setor_id]);

  useEffect(() => {
    if (!user?.user_id) return;

    const channel = supabase
      .channel('iro_operacoes_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iro_operacoes' }, () => void loadData())
      .subscribe();

    const interval = setInterval(() => void loadData(), 600000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user?.user_id]);

  const filteredOperacoes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return operacoes.filter((o) => {
      if (term && !o.nome.toLowerCase().includes(term) && !(o.descricao || '').toLowerCase().includes(term)) return false;
      return true;
    });
  }, [operacoes, search]);

  const candidaturasAtivas = useMemo(
    () => minhasCandidaturas.filter((c) => c.status !== 'cancelado'),
    [minhasCandidaturas],
  );

  const handleCandidatar = async () => {
    if (!selectedOperacao || !candidaturaData.data_operacao || !user?.user_id) return;
    if (selectedOperacao.data_fim < new Date().toISOString().slice(0, 10)) {
      toast({ title: 'Prazo encerrado', description: 'O período desta operação já se encerrou.', variant: 'destructive' });
      return;
    }
    const { data, error } = await supabase.rpc('candidatar_se_iro', {
      p_operacao_id: selectedOperacao.id,
      p_usuario_id: user.user_id,
      p_data: candidaturaData.data_operacao,
    });
    if (error) {
      setCandidaturaResultado({ sucesso: false, mensagem: error.message, operacaoNome: selectedOperacao.nome });
      setCandidaturaResultadoAberto(true);
      return;
    }
    const r = data as { sucesso: boolean; mensagem: string; total_mes?: number };
    setCandidaturaResultado({
      sucesso: r.sucesso,
      mensagem: r.sucesso ? 'Inscrição realizada com sucesso!' : r.mensagem,
      operacaoNome: selectedOperacao.nome,
      dataOperacao: candidaturaData.data_operacao,
      horas: selectedOperacao.horas_por_dia,
      totalMes: r.total_mes,
    });
    setCandidaturaResultadoAberto(true);
    setSelectedOperacao(null);
    void loadData();
  };

  const handleCancelar = async (item: IROCandidatura) => {
    const hoje = new Date();
    const dataOp = new Date(item.data_operacao + 'T00:00:00');
    const diffTime = dataOp.getTime() - hoje.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);

    if (diffHours < 24) {
      toast({
        title: 'Cancelamento bloqueado',
        description: 'Desistências com menos de 24h da operação devem ser informadas diretamente ao supervisor/chefe de setor e não podem ser feitas pelo sistema.',
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
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Candidatura cancelada' });
    void loadData();
  };

  const confirmarCancelamento = async () => {
    if (!candidaturaParaCancelar) return;
    const hoje = new Date();
    const dataOp = new Date(candidaturaParaCancelar.data_operacao + 'T00:00:00');
    const diffTime = dataOp.getTime() - hoje.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);

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

  const isGuardaFlow = !setorSlug || setorSlug === 'guarda-municipal';
  const Layout = isGuardaFlow
    ? GuardsLayout
    : ({ children }: { children: React.ReactNode }) => (
        <AdminLayout backPath={`/admin/dashboard/${setorSlug}`} backLabel="Dashboard">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </AdminLayout>
      );

  if (loading) {
    return (
      <Layout>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 sm:p-8">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <section className="rounded-[28px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-100/70">Guarda Municipal</p>
              <h1 className="mt-2 text-[26px] font-black leading-tight text-white sm:mt-3 sm:text-[34px]">IROs</h1>
            </div>
            <div className="flex gap-2 mt-2 shrink-0">
              <Button variant="outline" size="sm" className="min-h-10 gap-2 rounded-xl border-0 bg-white/20 text-white shadow-none hover:bg-white/30" onClick={() => navigate(isGuardaFlow ? '/admin/perfil-guardas/guarda-municipal/iros/historico' : `/admin/dashboard/${setorSlug}/iro/historico`)}>
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Histórico</span>
              </Button>
            </div>
          </div>
          <p className="mt-2 max-w-xl text-[14px] leading-6 text-white">Gerencie suas operações e horas IRO.</p>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:hidden">
            <Badge variant="outline" className="whitespace-nowrap rounded-full border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
              Candidatura rápida
            </Badge>
            <Badge variant="outline" className="whitespace-nowrap rounded-full border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
              Banco {resumo.banco_horas}h
            </Badge>
            <Badge variant="outline" className="whitespace-nowrap rounded-full border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
              Mês {resumo.total_horas_mes}h
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
                  <p className="mt-1 text-[22px] font-black leading-none text-white sm:text-3xl">
                    {resumo.mes_anterior_horas}h
                  </p>
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
                  <h3 className="mt-2 text-[15px] font-bold text-slate-900 line-clamp-2 leading-snug">{op.nome}</h3>
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
                    <Button size="sm" className="mt-3 min-h-11 w-full rounded-xl text-[13px] font-semibold sm:min-h-10" onClick={() => { setSelectedOperacao(op); setCandidaturaData({ data_operacao: new Date().toISOString().slice(0, 10) }); }}>
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
                    <p className="mt-0.5 text-[13px] leading-5 text-slate-500">
                      {fmtDateBR(c.data_operacao)} &middot; {c.horas_trabalhadas}h &middot;
                      <Badge variant="outline" className={cn('ml-1.5 rounded-full text-[11px] font-bold px-3 py-1', c.status === 'confirmado' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')}>
                        {c.status}
                      </Badge>
                    </p>
                  </div>
                  {c.status !== 'realizado' && (
                    <Button size="sm" variant="outline" className="min-h-10 w-full rounded-xl border-red-200 text-[13px] font-semibold text-red-600 hover:bg-red-50 sm:w-auto" onClick={() => void handleCancelar(c)}>
                      Cancelar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <ResponsiveDialog
          open={Boolean(selectedOperacao)}
          onOpenChange={(open) => { if (!open) setSelectedOperacao(null); }}
          title={selectedOperacao?.nome || 'Detalhes da operação'}
          description="Veja os detalhes da operação."
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
                <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Data para candidatura</Label>
                <Input type="date" value={candidaturaData.data_operacao} onChange={(e) => setCandidaturaData({ data_operacao: e.target.value })} min={selectedOperacao.data_inicio} max={selectedOperacao.data_fim} className="h-12 rounded-[18px] border-slate-200 text-[15px] font-medium" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="rounded-xl text-[13px] font-semibold" onClick={() => setSelectedOperacao(null)}>Cancelar</Button>
                <Button className="rounded-xl text-[13px] font-semibold" onClick={() => void handleCandidatar()}>Confirmar candidatura</Button>
              </div>
            </div>
          )}
        </ResponsiveDialog>

        <ResponsiveDialog
          open={leiDialogAberta}
          onOpenChange={(open) => { if (!open) { setLeiDialogAberta(false); setCandidaturaParaCancelar(null); } }}
          title="Atenção — Lei nº 2.739/2025"
          description="Regras para desistência de operações IRO"
        >
          <div className="space-y-4 py-2 text-sm text-slate-700">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <Gavel className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="space-y-2">
                <p className="font-semibold text-amber-800">Art. 7º, §1º — Prazo para desistência</p>
                <p>
                  Após a publicação da escala, a desistência só será aceita se comunicada ao chefe imediato
                  com <strong>24 horas de antecedência</strong> da operação.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div className="space-y-1">
                <p className="font-semibold text-red-800">Consequência</p>
                <p>
                  Se não comunicar com 24h de antecedência, o guarda ficará <strong>60 dias sem poder
                  participar da escala especial IRO</strong> (Art. 2º, §7º).
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold mb-1">Fluxo correto:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>Comunique ao <strong>chefe imediato</strong> sua desistência</li>
                <li>Confirme o cancelamento no sistema</li>
              </ol>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setLeiDialogAberta(false); setCandidaturaParaCancelar(null); }}>
                Revisar
              </Button>
              <Button variant="destructive" onClick={() => void confirmarCancelamento()}>
                Confirmar cancelamento
              </Button>
            </div>
          </div>
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
      </div>
    </Layout>
  );
};

export default GuardaIros;
