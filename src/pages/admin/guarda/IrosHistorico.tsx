import { useEffect, useState, useMemo } from 'react';
import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RefreshCcw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { IROCandidatura } from '@/types/admin';

const STATUS_VARIANT: Record<string, string> = {
  pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmado: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelado: 'bg-red-50 text-red-700 border-red-200',
  realizado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const GuardaIrosHistorico = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [candidaturas, setCandidaturas] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [mesFilter, setMesFilter] = useState('todos');
  const [anoFilter, setAnoFilter] = useState('todos');

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('iro_candidaturas')
      .select('*, iro_operacoes!inner(nome)')
      .eq('usuario_id', user.id)
      .order('data_operacao', { ascending: false });
    setCandidaturas((data || []).map((c: any) => ({ ...c, operacao_nome: c.iro_operacoes?.nome || '' })));
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, [user?.id]);

  const meses = useMemo(() => {
    const set = new Set<string>();
    candidaturas.forEach((c) => {
      const d = new Date(c.data_operacao);
      set.add(`${d.getMonth() + 1}`);
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [candidaturas]);

  const anos = useMemo(() => {
    const set = new Set<string>();
    candidaturas.forEach((c) => {
      set.add(new Date(c.data_operacao).getFullYear().toString());
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [candidaturas]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return candidaturas.filter((c) => {
      const d = new Date(c.data_operacao);
      const mes = (d.getMonth() + 1).toString();
      const ano = d.getFullYear().toString();
      if (mesFilter !== 'todos' && mes !== mesFilter) return false;
      if (anoFilter !== 'todos' && ano !== anoFilter) return false;
      if (term && !c.operacao_nome.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [candidaturas, search, mesFilter, anoFilter]);

  return (
    <GuardsLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Histórico de IROs</h1>
            <p className="text-sm text-slate-500">Todas as suas candidaturas realizadas</p>
          </div>
          <button onClick={() => void loadData()} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-700">
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>

        <Card className="rounded-2xl border-slate-200">
          <CardContent className="space-y-4 px-5 py-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar operação..." />
              </div>
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select value={mesFilter} onValueChange={setMesFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {meses.map((m) => (
                      <SelectItem key={m} value={m}>{new Date(2024, Number(m) - 1).toLocaleDateString('pt-BR', { month: 'long' })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select value={anoFilter} onValueChange={setAnoFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {anos.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Nenhum registro encontrado.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{c.operacao_nome}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(c.data_operacao).toLocaleDateString('pt-BR')} &middot; {c.horas_trabalhadas}h
                  </p>
                </div>
                <Badge variant="outline" className={cn('rounded-full text-[11px] font-bold px-3 py-1', STATUS_VARIANT[c.status])}>
                  {c.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </GuardsLayout>
  );
};

export default GuardaIrosHistorico;
