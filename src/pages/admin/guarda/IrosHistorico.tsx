import { useEffect, useState, useMemo } from 'react';
import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { IROCandidatura } from '@/types/admin';

const STATUS_VARIANT: Record<string, string> = {
  pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmado: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelado: 'bg-red-50 text-red-700 border-red-200',
  realizado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const fmtDateBR = (d: string | null | undefined): string => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
};

const GuardaIrosHistorico = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [candidaturas, setCandidaturas] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [mesFilter, setMesFilter] = useState('todos');
  const [anoFilter, setAnoFilter] = useState('todos');

  const loadData = async () => {
    if (!user?.user_id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('iro_candidaturas')
      .select('*, iro_operacoes!inner(nome)')
      .eq('usuario_id', user.user_id)
      .order('data_operacao', { ascending: false });
    setCandidaturas((data || []).map((c: any) => ({ ...c, operacao_nome: c.iro_operacoes?.nome || '' })));
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, [user?.user_id]);

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
        <section className="rounded-[34px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-5 pb-5 pt-6 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-100/70">Guarda Municipal</p>
              <h1 className="mt-3 text-[32px] font-black tracking-[-0.07em] text-white sm:text-[38px]">Histórico de IROs</h1>
              <p className="mt-2 max-w-xl text-[14px] leading-6 text-white">Todas as suas candidaturas realizadas.</p>
            </div>
            <button onClick={() => void loadData()} className="flex h-9 w-9 items-center justify-center rounded-[18px] bg-white/20 text-white shadow-none hover:bg-white/30">
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        </section>

        <Card className="rounded-[28px] border-slate-200/80">
          <CardContent className="space-y-4 px-5 py-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar operação..." className="h-12 rounded-[18px] border-slate-200 bg-slate-50 pl-11 text-[15px] font-medium" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Mês</Label>
                <Select value={mesFilter} onValueChange={setMesFilter}>
                  <SelectTrigger className="h-12 rounded-[18px] border-slate-200 bg-slate-50 text-[15px] font-medium"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {meses.map((m) => (
                      <SelectItem key={m} value={m}>{new Date(2024, Number(m) - 1).toLocaleDateString('pt-BR', { month: 'long' })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Ano</Label>
                <Select value={anoFilter} onValueChange={setAnoFilter}>
                  <SelectTrigger className="h-12 rounded-[18px] border-slate-200 bg-slate-50 text-[15px] font-medium"><SelectValue /></SelectTrigger>
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
          <div className="rounded-[22px] border border-slate-200 bg-white p-8 text-center text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[26px] border border-dashed border-slate-300 bg-white p-8 text-center text-[15px] text-slate-400">Nenhum registro encontrado.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-[26px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]">
                <div>
                  <p className="text-[15px] font-bold text-slate-900">{c.operacao_nome}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-slate-500">
                    {fmtDateBR(c.data_operacao)} &middot; {c.horas_trabalhadas}h
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
