import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Calendar, Hourglass, Banknote, ChevronRight, RefreshCcw, Clock, FileWarning } from 'lucide-react';
import type { IROOperacao } from '@/types/admin';
import { cn } from '@/lib/utils';

interface ResumoGuarda {
  total_horas_mes: number;
  horas_disponiveis: number;
  banco_horas: number;
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
  const [resumo, setResumo] = useState<ResumoGuarda>({ total_horas_mes: 0, horas_disponiveis: 0, banco_horas: 0 });
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

      const totalHoras = lista.reduce((acc: number, c: any) => acc + Number(c.horas_trabalhadas || 0), 0);

      setResumo({
        total_horas_mes: totalHoras,
        horas_disponiveis: 0,
        banco_horas: bancoRes.data ? Number((bancoRes.data as any).horas_excedentes) : 0,
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [user?.user_id, profile?.setor_id]);

  const stats = useMemo(() => [
    { label: 'Total no mês', value: `${resumo.total_horas_mes}h`, icon: Calendar, color: 'text-blue-600 bg-blue-50' },
    { label: 'Banco de horas', value: `${resumo.banco_horas}h`, icon: Hourglass, color: 'text-amber-600 bg-amber-50' },
    { label: 'Valor acumulado', value: 'R$ 0,00', icon: Banknote, color: 'text-purple-600 bg-purple-50' },
  ], [resumo]);

  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <GuardsLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {guardaNome ? `Olá, ${guardaNome.split(' ')[0]}!` : 'Dashboard'}
            </h1>
            <p className="text-sm text-slate-500">Resumo do mês de {mesAtual}</p>
          </div>
          <button
            onClick={() => void loadData()}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-700"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Carregando...
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{s.label}</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{s.value}</p>
                      </div>
                      <div className={`rounded-xl p-2.5 ${s.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.1em] text-slate-600">Últimas IROs realizadas</h2>
              {ultimasCandidaturas.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma IRO realizada neste mês.</p>
              ) : (
                <div className="space-y-3">
                  {ultimasCandidaturas.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
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

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-600">Operações disponíveis</h2>
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/admin/perfil-guardas/guarda-municipal/iros')}>
                  Ver todas <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              {operacoes.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <FileWarning className="h-10 w-10 text-slate-300" />
                  <p className="text-sm text-slate-400">Nenhuma operação disponível no momento.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {operacoes.slice(0, 5).map((op) => (
                    <div key={op.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{op.nome}</p>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDateBR(op.data_inicio)}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{op.horario_previsto.slice(0, 5)}</span>
                          <Badge variant="outline" className="rounded-full text-[10px] font-bold px-2 py-0 bg-slate-100">{op.vagas_por_dia} vaga(s)</Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0 ml-3" onClick={() => navigate('/admin/perfil-guardas/guarda-municipal/iros')}>
                        Candidatar
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
