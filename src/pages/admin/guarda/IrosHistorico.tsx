import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useAuth, getDashboardUrl } from '@/contexts/AuthContext';
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
  const { setorSlug } = useParams<{ setorSlug?: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [candidaturas, setCandidaturas] = useState<IROCandidatura[]>([]);
  const [search, setSearch] = useState('');
  const [mesFilter, setMesFilter] = useState('todos');
  const [anoFilter, setAnoFilter] = useState('todos');

  const loadData = useCallback(async () => {
    if (!user?.user_id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('iro_candidaturas')
      .select('*, iro_operacoes!inner(nome)')
      .eq('usuario_id', user.user_id)
      .order('data_operacao', { ascending: false });
    setCandidaturas(((data || []) as Array<IROCandidatura & { iro_operacoes?: { nome?: string | null } | null }>).map((c) => ({ ...c, operacao_nome: c.iro_operacoes?.nome || '' })));
    setLoading(false);
  }, [user?.user_id]);

  useEffect(() => { void loadData(); }, [loadData]);

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

  const isGuardaFlow = !setorSlug || setorSlug === 'guarda-municipal';
  const Layout = isGuardaFlow
    ? GuardsLayout
    : ({ children }: { children: React.ReactNode }) => (
        <AdminLayout backPath={`/admin/dashboard/${setorSlug}/iro`} backLabel="Voltar para IROs">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </AdminLayout>
      );

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <section className="rounded-2xl bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-100/70">Guarda Municipal</p>
              <h1 className="mt-2 text-[26px] font-black leading-tight text-white sm:mt-3 sm:text-[34px]">Histórico de IROs</h1>
              <p className="mt-2 max-w-xl text-[14px] leading-6 text-white">Todas as suas candidaturas realizadas.</p>
            </div>
            <button onClick={() => void loadData()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white shadow-none hover:bg-white/30" aria-label="Atualizar histórico">
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        </section>

        <Card className="rounded-2xl border-slate-200/80">
          <CardContent className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar operação..." className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 text-[15px] font-medium" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Mês</Label>
                <Select value={mesFilter} onValueChange={setMesFilter}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 text-[15px] font-medium"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {meses.map((m) => (
                      <SelectItem key={m} value={m}>{new Date(2024, Number(m) - 1).toLocaleDateString('pt-BR', { month: 'long' })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Ano</Label>
                <Select value={anoFilter} onValueChange={setAnoFilter}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 text-[15px] font-medium"><SelectValue /></SelectTrigger>
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-muted-foreground sm:p-8">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-[15px] text-slate-400 sm:p-8">Nenhum registro encontrado.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => (
              <div key={c.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)] active:scale-[0.99] sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-bold text-slate-900">{c.operacao_nome}</p>
                    {c.adicionado_manual && (
                      <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                        Manual
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[13px] leading-5 text-slate-500">
                    {fmtDateBR(c.data_operacao)} &middot; {c.horas_trabalhadas}h
                  </p>
                  {c.adicionado_manual && c.motivo_manual && (
                    <p className="mt-1 text-xs leading-5 text-slate-500">Motivo: {c.motivo_manual}</p>
                  )}
                </div>
                <Badge variant="outline" className={cn('w-fit rounded-full px-3 py-1 text-[11px] font-bold', STATUS_VARIANT[c.status])}>
                  {c.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GuardaIrosHistorico;
