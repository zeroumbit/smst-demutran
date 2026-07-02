import { useEffect, useMemo, useState } from 'react';
import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Clock, Calendar, Hourglass, Banknote, RefreshCcw } from 'lucide-react';

interface ResumoGuarda {
  total_horas_mes: number;
  horas_disponiveis: number;
  banco_horas: number;
}

const GuardaDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<ResumoGuarda>({ total_horas_mes: 0, horas_disponiveis: 72, banco_horas: 0 });
  const [ultimasCandidaturas, setUltimasCandidaturas] = useState<any[]>([]);
  const [guardaNome, setGuardaNome] = useState('');

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data: guardaData } = await supabase.rpc('buscar_guarda_por_usuario', { p_usuario_id: user.id });
      if (guardaData) {
        setGuardaNome((guardaData as any).nome || '');
      }

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

      const { data: candidaturas } = await supabase
        .from('iro_candidaturas')
        .select('*, iro_operacoes!inner(nome)')
        .eq('usuario_id', user.id)
        .in('status', ['confirmado', 'realizado'])
        .gte('data_operacao', firstDay)
        .lte('data_operacao', lastDay)
        .order('data_operacao', { ascending: false });

      const lista = (candidaturas || []).map((c: any) => ({
        ...c,
        operacao_nome: c.iro_operacoes?.nome || '',
      }));
      setUltimasCandidaturas(lista.slice(0, 5));

      const totalHoras = lista.reduce((acc: number, c: any) => acc + Number(c.horas_trabalhadas || 0), 0);

      const { data: banco } = await supabase
        .from('iro_banco_horas')
        .select('horas_excedentes')
        .eq('usuario_id', user.id)
        .maybeSingle();

      setResumo({
        total_horas_mes: totalHoras,
        horas_disponiveis: Math.max(0, 72 - totalHoras),
        banco_horas: banco ? Number((banco as any).horas_excedentes) : 0,
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [user?.id]);

  const stats = useMemo(() => [
    { label: 'Total no mês', value: `${resumo.total_horas_mes}h`, icon: Calendar, color: 'text-blue-600 bg-blue-50' },
    { label: 'Horas disponíveis', value: `${resumo.horas_disponiveis}h`, icon: Clock, color: 'text-emerald-600 bg-emerald-50' },
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
                        <p className="text-xs text-slate-500">{new Date(c.data_operacao).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className="text-sm font-bold text-slate-700">{c.horas_trabalhadas}h</span>
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
