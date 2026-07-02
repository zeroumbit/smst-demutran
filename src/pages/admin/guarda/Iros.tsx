import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Calendar, Clock, Hourglass, Search, ChevronRight, History, RefreshCcw, AlertTriangle, Gavel } from 'lucide-react';
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
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [operacoes, setOperacoes] = useState<IROOperacao[]>([]);
  const [minhasCandidaturas, setMinhasCandidaturas] = useState<IROCandidatura[]>([]);
  const [resumo, setResumo] = useState({ total_horas_mes: 0, horas_disponiveis: 0, banco_horas: 0 });

  const [selectedOperacao, setSelectedOperacao] = useState<IROOperacao | null>(null);
  const [candidaturaData, setCandidaturaData] = useState({ data_operacao: new Date().toISOString().slice(0, 10) });

  const [leiDialogAberta, setLeiDialogAberta] = useState(false);
  const [candidaturaParaCancelar, setCandidaturaParaCancelar] = useState<IROCandidatura | null>(null);

  const loadData = async () => {
    if (!user?.user_id || !profile?.setor_id) { setLoading(false); return; }
    setLoading(true);

    try {
      const [opRes, candRes] = await Promise.all([
        supabase.from('iro_operacoes').select('*').eq('setor_id', profile.setor_id).eq('ativo', true).order('data_inicio', { ascending: false }),
        supabase.from('iro_candidaturas').select('*, iro_operacoes!inner(nome)').eq('usuario_id', user.user_id).order('created_at', { ascending: false }),
      ]);

      setOperacoes((opRes.data || []) as IROOperacao[]);
      const lista = (candRes.data || []).map((c: any) => ({ ...c, operacao_nome: c.iro_operacoes?.nome || '' }));
      setMinhasCandidaturas(lista);

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

      const horasMes = lista
        .filter((c: any) => ['confirmado', 'realizado'].includes(c.status) && c.data_operacao >= firstDay && c.data_operacao <= lastDay)
        .reduce((acc: number, c: any) => acc + Number(c.horas_trabalhadas || 0), 0);

      const { data: banco } = await supabase.from('iro_banco_horas').select('horas_excedentes').eq('usuario_id', user.user_id).maybeSingle();

      setResumo({
        total_horas_mes: horasMes,
        horas_disponiveis: 0,
        banco_horas: banco ? Number((banco as any).horas_excedentes) : 0,
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [user?.user_id, profile?.setor_id]);

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
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    const r = data as { sucesso: boolean; mensagem: string; total_mes?: number };
    if (r.sucesso && horasDaSolicitacao(selectedOperacao.tempo_solicitacao) >= 48) {
      toast({
        title: 'Candidatura realizada!',
        description: 'Atenção: esta operação segue a Lei nº 2.739/2025 — desistência deve ser comunicada ao chefe imediato com 24h de antecedência.',
        variant: 'default',
      });
    } else {
      toast({
        title: r.sucesso ? 'Candidatura realizada!' : 'Atenção',
        description: r.sucesso ? (r.total_mes ? `Total no mês: ${r.total_mes}h` : undefined) : r.mensagem,
        variant: r.sucesso ? 'default' : 'destructive',
      });
    }
    setSelectedOperacao(null);
    void loadData();
  };

  const handleCancelar = async (item: IROCandidatura) => {
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
    const { error } = await supabase.from('iro_candidaturas').update({ status: 'cancelado' }).eq('id', candidaturaParaCancelar.id);
    setLeiDialogAberta(false);
    setCandidaturaParaCancelar(null);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Candidatura cancelada' });
    void loadData();
  };

  if (loading) {
    return (
      <GuardsLayout>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Carregando...</div>
      </GuardsLayout>
    );
  }

  return (
    <GuardsLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">IROs</h1>
            <p className="text-sm text-slate-500">Integração de Recursos Operacionais</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/perfil-guardas/guarda-municipal/iros/historico')}>
              <History className="mr-1.5 h-4 w-4" />
              Histórico
            </Button>
            <button onClick={() => void loadData()} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-700">
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Total no mês</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{resumo.total_horas_mes}h</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Banco de horas</p>
            <p className="mt-1 text-2xl font-black text-amber-600">{resumo.banco_horas}h</p>
          </div>
        </div>

        <Card className="rounded-2xl border-slate-200">
          <CardContent className="px-5 py-4">
            <div className="space-y-2">
              <Label>Buscar operações</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome..." />
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-slate-600">Operações disponíveis</h2>
          {filteredOperacoes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Nenhuma operação disponível no momento.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOperacoes.map((op) => (
                <article key={op.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                          {op.vagas_por_dia} vaga(s)/dia
                        </Badge>
                      </div>
                      <h3 className="mt-2 text-base font-bold text-slate-900">{op.nome}</h3>
                      {op.descricao && <p className="text-sm text-slate-500 mt-0.5">{op.descricao}</p>}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDateBR(op.data_inicio)} - {fmtDateBR(op.data_fim)}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{op.horario_previsto.slice(0, 5)}</span>
                        <span className="flex items-center gap-1"><Hourglass className="h-3.5 w-3.5" />{op.horas_por_dia}h/dia</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => { setSelectedOperacao(op); setCandidaturaData({ data_operacao: new Date().toISOString().slice(0, 10) }); }}>
                      Candidatar-se <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-slate-600">Minhas candidaturas ativas</h2>
          {candidaturasAtivas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Nenhuma candidatura ativa.
            </div>
          ) : (
            <div className="space-y-3">
              {candidaturasAtivas.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.operacao_nome}</p>
                    <p className="text-xs text-slate-500">
                      {fmtDateBR(c.data_operacao)} &middot; {c.horas_trabalhadas}h &middot;
                      <Badge variant="outline" className={cn('ml-1.5 rounded-full text-[10px] font-bold px-2 py-0', c.status === 'confirmado' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')}>
                        {c.status}
                      </Badge>
                    </p>
                  </div>
                  {c.status !== 'realizado' && (
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => void handleCancelar(c)}>
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
          title={selectedOperacao?.nome || 'Candidatar-se'}
          description="Escolha uma data para esta operação."
        >
          {selectedOperacao && (
            <div className="space-y-4 py-2">
              {horasDaSolicitacao(selectedOperacao.tempo_solicitacao) >= 48 && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <Gavel className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Esta operação segue a <strong>Lei nº 2.739/2025</strong>. Desistência deve ser comunicada ao chefe imediato com 24h de antecedência.</p>
                </div>
              )}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p><strong>Horário:</strong> {selectedOperacao.horario_previsto.slice(0, 5)}</p>
                <p><strong>Horas por dia:</strong> {selectedOperacao.horas_por_dia}h</p>
                <p><strong>Vagas:</strong> {selectedOperacao.vagas_por_dia}/dia</p>
                <p><strong>Período:</strong> {fmtDateBR(selectedOperacao.data_inicio)} - {fmtDateBR(selectedOperacao.data_fim)}</p>
              </div>
              <div className="space-y-2">
                <Label>Data para candidatura</Label>
                <Input type="date" value={candidaturaData.data_operacao} onChange={(e) => setCandidaturaData({ data_operacao: e.target.value })} min={selectedOperacao.data_inicio} max={selectedOperacao.data_fim} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedOperacao(null)}>Cancelar</Button>
                <Button onClick={() => void handleCandidatar()}>Confirmar candidatura</Button>
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
      </div>
    </GuardsLayout>
  );
};

export default GuardaIros;
