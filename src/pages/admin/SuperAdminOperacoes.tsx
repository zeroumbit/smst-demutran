import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  RefreshCcw,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { IROOperacao, IROCandidatura } from '@/types/admin';

type CandidatoInfo = {
  usuario_id: string;
  usuario_nome: string | null;
  status: string;
  horas_trabalhadas: number;
};

type DiaInfo = {
  data: string;
  vagas_total: number;
  vagas_ocupadas: number;
  vagas_disponiveis: number;
  candidatos: CandidatoInfo[];
};

type OperacaoComVagas = IROOperacao & {
  datas: DiaInfo[];
  total_datas: number;
  datas_com_vaga: number;
  datas_lotadas: number;
  total_candidatos: number;
};

type FiltroVaga = 'todas' | 'andamento' | 'lotadas' | 'disponiveis';

const GRAVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-fuchsia-500', 'bg-teal-500',
];

const formatRelativo = (dateStr: string) => {
  const hoje = new Date();
  const alvo = new Date(dateStr + 'T12:00:00');
  hoje.setHours(0, 0, 0, 0);
  alvo.setHours(0, 0, 0, 0);
  const diff = Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === 2) return 'Depois de amanhã';
  if (diff === -1) return 'Ontem';
  if (diff > 0) return `Em ${diff} dias`;
  return `Há ${Math.abs(diff)} dias`;
};

const formatData = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
};

const getGravatarColor = (id: string) =>
  GRAVATAR_COLORS[Math.abs([...id].reduce((acc, c) => acc + c.charCodeAt(0), 0)) % GRAVATAR_COLORS.length];

const springCss = 'transition-all duration-500';
const smoothCss = 'transition-all duration-300';
const springStyle = { transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)' };
const smoothStyle = { transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)' };

const SuperAdminOperacoes = () => {
  const { isSuperAdmin } = useAuth();
  const [operacoes, setOperacoes] = useState<OperacaoComVagas[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOp, setExpandedOp] = useState<string | null>(null);
  const [sheetCandidatos, setSheetCandidatos] = useState<{ data: string; candidatos: CandidatoInfo[]; horario: string } | null>(null);
  const [filtro, setFiltro] = useState<FiltroVaga>('todas');
  const contentRef = useRef<HTMLDivElement>(null);

  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const carregar = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [opRes, datasRes, candRes, perfisRes, guardasRes] = await Promise.all([
      supabase.from('iro_operacoes').select('*').eq('ativo', true).order('data_inicio', { ascending: false }),
      supabase.from('iro_operacao_datas').select('operacao_id, data').order('data', { ascending: true }),
      supabase.from('iro_candidaturas').select('*, iro_operacoes(nome)').order('created_at', { ascending: false }),
      supabase.from('perfis_usuarios').select('user_id, nome, sobrenome').eq('ativo', true),
      supabase.from('guardas_usuarios').select('usuario_id, guardas_municipais!inner(id, nome)'),
    ]);

    if (opRes.error || datasRes.error || candRes.error) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const nomeMap = new Map<string, string>();
    for (const row of (perfisRes.data || []) as Array<{ user_id: string; nome: string | null; sobrenome: string | null }>) {
      const nome = [row.nome, row.sobrenome].filter(Boolean).join(' ');
      if (nome) nomeMap.set(row.user_id, nome);
    }
    for (const row of (guardasRes.data || []) as Array<{ usuario_id: string; guardas_municipais: { id: string; nome: string } | { id: string; nome: string }[] }>) {
      const guarda = Array.isArray(row.guardas_municipais) ? row.guardas_municipais[0] : row.guardas_municipais;
      if (guarda?.nome && row.usuario_id && !nomeMap.has(row.usuario_id)) {
        nomeMap.set(row.usuario_id, guarda.nome);
      }
    }

    const operacoesData = (opRes.data || []) as IROOperacao[];
    const datasOperacoes = (datasRes.data || []) as Array<{ operacao_id: string; data: string }>;
    const candidaturasData = (candRes.data || []) as (IROCandidatura & { iro_operacoes?: { nome?: string | null } | null })[];

    const datasPorOp = new Map<string, DiaInfo[]>();
    const opMap = new Map(operacoesData.map((o) => [o.id, o]));

    for (const d of datasOperacoes) {
      const op = opMap.get(d.operacao_id);
      if (!op || d.data < hoje) continue;

      const candidatosDaData = candidaturasData.filter(
        (c) => c.operacao_id === d.operacao_id && c.data_operacao === d.data && ['confirmado', 'realizado'].includes(c.status)
      );

      const vagasTotal = Number(op.vagas_por_dia) || 0;
      const vagasOcupadas = candidatosDaData.length;

      if (!datasPorOp.has(d.operacao_id)) datasPorOp.set(d.operacao_id, []);
      datasPorOp.get(d.operacao_id)!.push({
        data: d.data,
        vagas_total: vagasTotal,
        vagas_ocupadas: vagasOcupadas,
        vagas_disponiveis: Math.max(0, vagasTotal - vagasOcupadas),
        candidatos: candidatosDaData.map((c) => ({
          usuario_id: c.usuario_id,
          usuario_nome: nomeMap.get(c.usuario_id) || c.usuario_nome || null,
          status: c.status,
          horas_trabalhadas: c.horas_trabalhadas,
        })),
      });
    }

    const result = operacoesData
      .filter((op) => op.ativo && op.data_fim >= hoje)
      .map((op) => {
        const datas = datasPorOp.get(op.id) || [];
        const totalDatas = datas.length;
        const datasComVaga = datas.filter((d) => d.vagas_disponiveis > 0).length;
        const datasLotadas = datas.filter((d) => d.vagas_disponiveis === 0).length;
        return {
          ...op,
          datas,
          total_datas: totalDatas,
          datas_com_vaga: datasComVaga,
          datas_lotadas: datasLotadas,
          total_candidatos: datas.reduce((acc, d) => acc + d.candidatos.length, 0),
        };
      });

    setOperacoes(result);
    setLoading(false);
    setRefreshing(false);
  }, [hoje]);

  useEffect(() => {
    if (isSuperAdmin) carregar();
  }, [isSuperAdmin, carregar]);

  const operacoesFiltradas = useMemo(() => {
    switch (filtro) {
      case 'andamento':
        return operacoes.filter((op) => op.data_inicio <= hoje && op.data_fim >= hoje);
      case 'lotadas':
        return operacoes.filter((op) => op.datas.length > 0 && op.datas.every((d) => d.vagas_disponiveis === 0));
      case 'disponiveis':
        return operacoes.filter((op) => op.datas.some((d) => d.vagas_disponiveis > 0));
      default:
        return operacoes;
    }
  }, [operacoes, filtro, hoje]);

  const summary = useMemo(() => {
    const total = operacoes.length;
    const emAndamento = operacoes.filter((op) => op.data_inicio <= hoje && op.data_fim >= hoje).length;
    const vagasCheias = operacoes.filter((op) => op.datas.length > 0 && op.datas.every((d) => d.vagas_disponiveis === 0)).length;
    const totalCandidatos = operacoes.reduce((acc, op) => acc + op.total_candidatos, 0);
    const totalVagas = operacoes.reduce((acc, op) => acc + op.datas.reduce((a, d) => a + d.vagas_total, 0), 0);
    const totalOcupadas = operacoes.reduce((acc, op) => acc + op.datas.reduce((a, d) => a + d.vagas_ocupadas, 0), 0);
    return { total, emAndamento, vagasCheias, totalCandidatos, totalVagas, totalOcupadas };
  }, [operacoes, hoje]);

  const toggleOperacao = (id: string) => {
    setExpandedOp((prev) => (prev === id ? null : id));
  };

  const abrirSheet = (data: string, candidatos: CandidatoInfo[], horario: string) => {
    setSheetCandidatos({ data, candidatos, horario });
  };

  if (!isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-12">
          <p className="text-slate-500">Acesso restrito a super administradores.</p>
        </div>
      </AdminLayout>
    );
  }

  const filtros: { key: FiltroVaga; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'andamento', label: 'Em andamento' },
    { key: 'lotadas', label: 'Lotadas' },
    { key: 'disponiveis', label: 'Disponíveis' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-4 py-5 text-white md:rounded-[34px] md:px-6 md:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-sky-100/70 md:text-[11px]">Administração</p>
              <h1 className="mt-2 text-xl font-black tracking-[-0.05em] sm:text-2xl md:mt-3 md:text-[34px] md:tracking-[-0.08em]">IROS</h1>
              <p className="mt-1.5 hidden max-w-2xl text-[13px] leading-5 text-slate-100 md:block md:mt-2 md:text-sm md:leading-6">
                {summary.total} operações · {summary.totalCandidatos} guardas
              </p>
            </div>
            <Button
              variant="outline"
              className="h-10 border-white/20 bg-white/10 text-xs text-white hover:bg-white/20 md:h-11 md:text-sm"
              onClick={() => void carregar(true)}
              disabled={refreshing}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3 md:mt-6">
            <StatCard label="Total Operações" value={String(summary.total)} icon={Calendar} />
            <StatCard label="Guardas Confirmados" value={String(summary.totalCandidatos)} icon={Users} />
            <StatCard label="Vagas Ocupadas" value={`${summary.totalOcupadas} de ${summary.totalVagas}`} icon={CheckCircle2} />
          </div>
        </section>

        {refreshing && (
          <div className="flex items-center justify-center py-3">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-full origin-left animate-[indeterminate_1.5s_ease-in-out_infinite] rounded-full bg-brand-500" />
            </div>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {filtros.map((f) => (
            <Button
              key={f.key}
              variant={filtro === f.key ? 'default' : 'outline'}
              onClick={() => setFiltro(f.key)}
              className="rounded-full px-5 h-9 text-xs font-semibold"
            >
              {f.label}
              {f.key !== 'todas' && (
                <span className="ml-1.5 text-[10px] opacity-70">
                  {f.key === 'andamento' ? summary.emAndamento : f.key === 'lotadas' ? summary.vagasCheias : ''}
                </span>
              )}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="space-y-4 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-3xl bg-white p-5 shadow-[0_2px_12px_-6px_rgba(15,23,42,0.08)] border border-slate-200/50">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/5 rounded-full bg-slate-200" />
                      <div className="h-3 w-4/5 rounded-full bg-slate-100" />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <div className="h-3 w-16 rounded-full bg-slate-100" />
                    <div className="h-3 w-20 rounded-full bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : operacoesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 mb-4">
                <Calendar className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-[17px] font-semibold text-slate-600">Nenhuma operação encontrada</p>
              <p className="text-[15px] text-slate-400 mt-1">Nenhuma operação ativa no momento.</p>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {operacoesFiltradas.map((op) => {
                const isOpen = expandedOp === op.id;
                const emAndamento = op.data_inicio <= hoje && op.data_fim >= hoje;
                const totalDisp = op.datas.reduce((acc, d) => acc + d.vagas_disponiveis, 0);
                const vagasPct = op.datas.length > 0
                  ? Math.round((op.total_candidatos / (op.datas.reduce((a, d) => a + d.vagas_total, 0))) * 100)
                  : 0;

                return (
                  <div
                    key={op.id}
                    className={`rounded-3xl bg-white border border-slate-200/60 shadow-[0_2px_12px_-6px_rgba(15,23,42,0.08)] overflow-hidden ${smoothCss}`}
                    style={smoothStyle}
                  >
                    <button
                      onClick={() => toggleOperacao(op.id)}
                      className="w-full text-left px-5 py-4 active:bg-slate-50/80 active:scale-[0.995]"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                            emAndamento ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                          }`}>
                            <Calendar className="h-6 w-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-[17px] font-bold text-slate-900 leading-tight">{op.nome}</h2>
                              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{op.codigo}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              {emAndamento && (
                                <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-600">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Em andamento
                                </span>
                              )}
                              <span className="text-[12px] text-slate-400">
                                {op.datas.length} dias · {op.horario_previsto.slice(0, 5)}h
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-slate-400 shrink-0 mt-1.5 ${springCss} ${isOpen ? 'rotate-180' : ''}`} style={springStyle} />
                      </div>

                      <div className="flex items-center gap-6 mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-[13px] font-semibold text-slate-700">{op.total_candidatos}</span>
                          <span className="text-[11px] text-slate-400">guardas</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className={`h-3.5 w-3.5 ${totalDisp === 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
                          <span className="text-[13px] font-semibold text-slate-700">{totalDisp}</span>
                          <span className="text-[11px] text-slate-400">vagas</span>
                        </div>
                        <div className="flex-1">
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${smoothCss} ${
                                vagasPct >= 100 ? 'bg-amber-500' : vagasPct >= 80 ? 'bg-orange-400' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(vagasPct, 100)}%`, ...smoothStyle }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>

                    <div
                      className={`overflow-hidden ${smoothCss}`}
                      style={{
                        maxHeight: isOpen ? `${op.datas.length * 120 + 40}px` : '0px',
                        opacity: isOpen ? 1 : 0,
                        ...smoothStyle,
                      }}
                    >
                      <div className="border-t border-slate-100">
                        <div className="px-3 py-2 space-y-1">
                          {op.datas.map((di) => {
                            const lotada = di.vagas_disponiveis === 0;
                            return (
                              <button
                                key={`${op.id}:${di.data}`}
                                onClick={() => abrirSheet(di.data, di.candidatos, op.horario_previsto.slice(0, 5))}
                                className={`w-full rounded-2xl px-4 py-3 flex items-center justify-between gap-3 active:scale-[0.98] ${smoothCss} ${
                                  lotada
                                    ? 'bg-amber-50/70 border border-amber-200/50'
                                    : 'bg-slate-50 border border-slate-200/50'
                                }`}
                                style={{ WebkitTapHighlightColor: 'transparent', ...smoothStyle }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                                    lotada ? 'bg-amber-100 text-amber-600' : 'bg-white text-slate-500 shadow-[0_1px_3px_-2px_rgba(15,23,42,0.1)]'
                                  }`}>
                                    <Clock className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 text-left">
                                    <p className="text-[14px] font-semibold text-slate-800 leading-tight">{formatData(di.data)}</p>
                                    <p className="text-[12px] text-slate-400">{formatRelativo(di.data)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <div className="text-right">
                                    <p className={`text-[14px] font-bold ${lotada ? 'text-amber-600' : 'text-emerald-600'}`}>
                                      {di.vagas_disponiveis}
                                    </p>
                                    <p className="text-[11px] text-slate-400">de {di.vagas_total}</p>
                                  </div>
                                  <div className="flex -space-x-2">
                                    {di.candidatos.slice(0, 3).map((c) => (
                                      <div
                                        key={c.usuario_id}
                                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white ${getGravatarColor(c.usuario_id)}`}
                                      >
                                        {c.usuario_nome?.charAt(0)?.toUpperCase() || '?'}
                                      </div>
                                    ))}
                                    {di.candidatos.length > 3 && (
                                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 ring-2 ring-white">
                                        +{di.candidatos.length - 3}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ResponsiveDialog
        open={!!sheetCandidatos}
        onOpenChange={(open) => { if (!open) setSheetCandidatos(null); }}
        title={sheetCandidatos ? formatData(sheetCandidatos.data) : ''}
        description={sheetCandidatos ? `${formatRelativo(sheetCandidatos.data)} · ${sheetCandidatos.horario}h · ${sheetCandidatos.candidatos.length} guarda(s)` : ''}
      >
        {sheetCandidatos && (
          <div className="py-2">
            {sheetCandidatos.candidatos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Users className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-[15px] text-slate-500">Nenhum guarda confirmado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sheetCandidatos.candidatos.map((cand) => (
                  <div
                    key={cand.usuario_id}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 active:scale-[0.98] transition-transform duration-150"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getGravatarColor(cand.usuario_id)}`}>
                        {cand.usuario_nome?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-slate-900 leading-tight truncate">
                          {cand.usuario_nome || 'Nome não informado'}
                        </p>
                        <p className="text-[12px] text-slate-400">
                          {cand.status === 'realizado' ? 'Realizado' : 'Confirmado'} · {cand.horas_trabalhadas}h
                        </p>
                      </div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-[11px] font-bold leading-none ${
                      cand.status === 'realizado'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {cand.horas_trabalhadas}h
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </ResponsiveDialog>

      <style>{`
        @keyframes indeterminate {
          0% { transform: scaleX(0); transform-origin: left; }
          50% { transform: scaleX(1); transform-origin: left; }
          51% { transform: scaleX(1); transform-origin: right; }
          100% { transform: scaleX(0); transform-origin: right; }
        }
        .native-scrollbar::-webkit-scrollbar { display: none; }
        .native-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </AdminLayout>
  );
};

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Calendar;
}) {
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

export default SuperAdminOperacoes;
