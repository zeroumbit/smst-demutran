import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Calendar, Hourglass, Banknote, ChevronRight, Clock, FileWarning, TrendingUp } from 'lucide-react';
import type { IROOperacao } from '@/types/admin';
import { cn } from '@/lib/utils';

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

const GuardaDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<ResumoGuarda>({ total_horas_mes: 0, total_reais: 0, horas_disponiveis: 0, banco_horas: 0, mes_anterior_horas: 0, mes_anterior_reais: 0 });
  const [ultimasCandidaturas, setUltimasCandidaturas] = useState<any[]>([]);
  const [operacoes, setOperacoes] = useState<IROOperacao[]>([]);
  const [guardaNome, setGuardaNome] = useState('');

  const loadData = async () => {
    if (!user?.user_id) { setLoading(false); return; }
    setLoading(true);

    try {
      const { data: guardaData } = await supabase.rpc('buscar_guarda_por_usuario', { p_usuario_id: user.user_id });
      if (guardaData) {
        setGuardaNome((guardaData as any).nome || '');
      }

      let setorId = profile?.setor_id;
      if (!setorId) {
        const { data: sData } = await supabase
          .from('setores')
          .select('id')
          .eq('slug', 'guarda-municipal')
          .maybeSingle();
        if (sData) setorId = sData.id;
      }

      const [opRes, candRes, bancoRes] = await Promise.all([
        setorId
          ? supabase.from('iro_operacoes').select('*').eq('setor_id', setorId).eq('ativo', true).order('data_inicio', { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase
          .from('iro_candidaturas')
          .select('*, iro_operacoes!inner(nome)')
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

      const lista = (candRes.data || []).map((c: any) => ({
        ...c,
        operacao_nome: c.iro_operacoes?.nome || '',
      }));
      setUltimasCandidaturas(lista.slice(0, 5));

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

  const stats = useMemo(() => [
    { label: 'Total no mês', value: `${resumo.total_horas_mes}h`, icon: Calendar },
    { label: 'Banco de horas', value: `${resumo.banco_horas}h`, icon: Hourglass },
    { label: 'Total', value: `R$ ${resumo.total_reais.toFixed(2).replace('.', ',')}`, icon: Banknote },
    { label: 'Mês anterior', value: `${resumo.mes_anterior_horas}h`, icon: TrendingUp, sub: resumo.mes_anterior_horas > 0 ? `atual: ${resumo.total_horas_mes}h` : undefined },
  ], [resumo]);

  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <GuardsLayout>
      <div className="space-y-6">
        <section className="rounded-[34px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-5 pb-5 pt-6 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-100/70">Guarda Municipal</p>
              <h1 className="mt-3 text-[32px] font-black tracking-[-0.07em] text-white sm:text-[38px]">
                {guardaNome ? `Olá, ${guardaNome.split(' ')[0]}!` : 'Dashboard'}
              </h1>
              <p className="mt-2 max-w-xl text-[14px] leading-6 text-white">Resumo do mês de {mesAtual}.</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-[26px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">{s.label}</p>
                      <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{s.value}</p>
                      {s.sub && <p className="mt-0.5 text-[13px] leading-5 text-white/70">{s.sub}</p>}
                    </div>
                    <div className="shrink-0 rounded-[18px] bg-white/15 p-3 text-white backdrop-blur-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {loading ? (
          <div className="rounded-[22px] border border-slate-200 bg-white p-8 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <>
            <div className="rounded-[26px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.1em] text-slate-600">Últimas IROs realizadas</h2>
              {ultimasCandidaturas.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma IRO realizada neste mês.</p>
              ) : (
                <div className="space-y-2">
                  {ultimasCandidaturas.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{c.operacao_nome}</p>
                        <p className="text-xs text-slate-500">{fmtDateBR(c.data_operacao)}</p>
                      </div>
                      <span className="text-sm font-bold text-slate-700">{c.horas_trabalhadas}h</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[26px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-600">Operações disponíveis</h2>
                <button onClick={() => navigate('/admin/perfil-guardas/guarda-municipal/iros')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700">
                  <span className="hidden sm:inline">Ver todas</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              {operacoes.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <FileWarning className="h-10 w-10 text-slate-300" />
                  <p className="text-sm text-slate-400">Nenhuma operação disponível no momento.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {operacoes.slice(0, 5).map((op) => (
                    <div key={op.id} className="sm:flex sm:items-center sm:justify-between rounded-xl bg-slate-50 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{op.nome}</p>
                        <div className="mt-1 flex flex-nowrap items-center gap-2 overflow-x-auto text-xs text-slate-500 whitespace-nowrap sm:flex-wrap sm:whitespace-normal">
                          <span className="flex items-center gap-1 shrink-0"><Calendar className="h-3 w-3" />{fmtDateBR(op.data_inicio)}</span>
                          <span className="text-slate-300 shrink-0">·</span>
                          <span className="flex items-center gap-1 shrink-0"><Clock className="h-3 w-3" />{op.horario_previsto.slice(0, 5)}</span>
                          <span className="text-slate-300 shrink-0">·</span>
                          <Badge variant="outline" className="shrink-0 rounded-full text-[10px] font-bold px-2 py-0 bg-slate-100">{op.vagas_por_dia} vaga(s)</Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="mt-2 w-full rounded-[18px] text-[13px] font-semibold sm:mt-0 sm:w-auto sm:shrink-0 sm:ml-3" onClick={() => navigate('/admin/perfil-guardas/guarda-municipal/iros')}>
                        VER DETALHES
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </GuardsLayout>
  );
};

export default GuardaDashboard;
