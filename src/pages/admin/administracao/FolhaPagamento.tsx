import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BadgeDollarSign, Download, Lock, Plus, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { exportarCsv } from '@/lib/exportarCsv';
import { cn } from '@/lib/utils';

type FolhaFolha = {
  id: string;
  competencia: string;
  status: 'rascunho' | 'fechada';
  valor_total: number;
};

type FolhaLancamento = {
  id: string;
  folha_id: string;
  servidor_id: string | null;
  servidor_nome?: string | null;
  tipo: 'vencimento' | 'desconto';
  descricao: string;
  valor: number;
};

type RhServidor = {
  id: string;
  nome_completo: string;
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const initialFolha = { competencia: '' };
const initialLancamento = {
  servidor_id: '',
  tipo: 'vencimento' as FolhaLancamento['tipo'],
  descricao: '',
  valor: '',
};

const FolhaPagamentoPage = () => {
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [folhas, setFolhas] = useState<FolhaFolha[]>([]);
  const [lancamentos, setLancamentos] = useState<FolhaLancamento[]>([]);
  const [servidores, setServidores] = useState<RhServidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('competencias');

  const [folhaDialogOpen, setFolhaDialogOpen] = useState(false);
  const [formFolha, setFormFolha] = useState(initialFolha);

  const [folhaSelecionada, setFolhaSelecionada] = useState<FolhaFolha | null>(null);
  const [lancamentoDialogOpen, setLancamentoDialogOpen] = useState(false);
  const [formLancamento, setFormLancamento] = useState(initialLancamento);

  const loadData = useCallback(async () => {
    const [folhasResponse, servidoresResponse] = await Promise.all([
      supabase.from('folha_folhas').select('*').order('competencia', { ascending: false }),
      supabase.from('rh_servidores').select('id, nome_completo').order('nome_completo'),
    ]);
    if (folhasResponse.error) console.warn('Erro ao carregar folhas:', folhasResponse.error.message);
    else setFolhas((folhasResponse.data || []) as FolhaFolha[]);
    if (servidoresResponse.error) console.warn('Erro ao carregar servidores:', servidoresResponse.error.message);
    else setServidores((servidoresResponse.data || []) as RhServidor[]);
    setLoading(false);
  }, []);

  const loadLancamentos = useCallback(async (folhaId: string) => {
    const { data, error } = await supabase
      .from('folha_lancamentos')
      .select('*, servidor:rh_servidores(nome_completo)')
      .eq('folha_id', folhaId)
      .order('created_at');
    if (error) {
      console.warn('Erro ao carregar lancamentos:', error.message);
      return;
    }
    setLancamentos(((data || []) as any[]).map((l) => ({
      id: l.id,
      folha_id: l.folha_id,
      servidor_id: l.servidor_id,
      servidor_nome: l.servidor?.nome_completo || null,
      tipo: l.tipo,
      descricao: l.descricao,
      valor: Number(l.valor),
    })) as FolhaLancamento[]);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateFolha = async () => {
    if (!formFolha.competencia) {
      toast({ title: 'Campo obrigatorio', description: 'Informe a competencia (mes/ano).', variant: 'destructive' });
      return;
    }
    const { data, error } = await supabase
      .from('folha_folhas')
      .insert({ competencia: `${formFolha.competencia}-01` })
      .select('*')
      .single();
    if (error) {
      toast({ title: 'Erro ao criar folha', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Folha criada', description: 'Nova competencia aberta como rascunho.' });
    setFolhaDialogOpen(false);
    setFormFolha(initialFolha);
    void loadData();
    if (data) setFolhaSelecionada((data as unknown) as FolhaFolha);
  };

  const openFolha = (folha: FolhaFolha) => {
    setFolhaSelecionada(folha);
    setTab('lancamentos');
    void loadLancamentos(folha.id);
  };

  const handleCreateLancamento = async () => {
    if (!folhaSelecionada) return;
    if (!formLancamento.descricao.trim() || !formLancamento.valor) {
      toast({ title: 'Campos obrigatorios', description: 'Informe descricao e valor.', variant: 'destructive' });
      return;
    }
    const valor = Number(formLancamento.valor.replace(',', '.'));
    if (Number.isNaN(valor) || valor <= 0) {
      toast({ title: 'Valor invalido', description: 'Informe um valor numerico maior que zero.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('folha_lancamentos').insert({
      folha_id: folhaSelecionada.id,
      servidor_id: formLancamento.servidor_id || null,
      tipo: formLancamento.tipo,
      descricao: formLancamento.descricao.trim(),
      valor: Number(valor.toFixed(2)),
    });
    if (error) {
      toast({ title: 'Erro ao adicionar lancamento', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Lancamento adicionado', description: 'O valor foi incluido na folha.' });
    setLancamentoDialogOpen(false);
    setFormLancamento(initialLancamento);
    await loadLancamentos(folhaSelecionada.id);
    await refreshFolhaValor(folhaSelecionada.id);
  };

  const refreshFolhaValor = async (folhaId: string) => {
    const { data } = await supabase.from('folha_lancamentos').select('tipo, valor').eq('folha_id', folhaId);
    const rows = (data || []) as Array<{ tipo: string; valor: number }>;
    const total = rows.reduce((acc, l) => acc + (l.tipo === 'vencimento' ? Number(l.valor) : -Number(l.valor)), 0);
    const { error } = await supabase.from('folha_folhas').update({ valor_total: Number(total.toFixed(2)) }).eq('id', folhaId);
    if (error) console.warn('Erro ao atualizar valor total:', error.message);
    const { data: folhaAtualizada } = await supabase.from('folha_folhas').select('*').eq('id', folhaId).single();
    if (folhaAtualizada) {
      setFolhas((prev) => prev.map((f) => (f.id === folhaId ? (folhaAtualizada as unknown as FolhaFolha) : f)));
      setFolhaSelecionada((prev) => (prev?.id === folhaId ? (folhaAtualizada as unknown as FolhaFolha) : prev));
    }
  };

  const handleFecharFolha = async () => {
    if (!folhaSelecionada) return;
    const { error } = await supabase
      .from('folha_folhas')
      .update({ status: 'fechada', fechada_em: new Date().toISOString() })
      .eq('id', folhaSelecionada.id);
    if (error) {
      toast({ title: 'Erro ao fechar folha', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Folha fechada', description: 'A competencia foi encerrada e nao pode mais ser alterada.' });
    const { data: folhaAtualizada } = await supabase.from('folha_folhas').select('*').eq('id', folhaSelecionada.id).single();
    if (folhaAtualizada) {
      setFolhas((prev) => prev.map((f) => (f.id === folhaSelecionada.id ? (folhaAtualizada as unknown as FolhaFolha) : f)));
      setFolhaSelecionada((folhaAtualizada as unknown as FolhaFolha));
    }
  };

  const handleDeleteLancamento = async (lancamento: FolhaLancamento) => {
    if (!folhaSelecionada) return;
    const confirmed = await confirm({
      title: 'Excluir lancamento',
      description: `Remover "${lancamento.descricao}" da folha?`,
    });
    if (!confirmed) return;
    const { error } = await supabase.from('folha_lancamentos').delete().eq('id', lancamento.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Lancamento excluido', description: 'O registro foi removido.' });
    await loadLancamentos(folhaSelecionada.id);
    await refreshFolhaValor(folhaSelecionada.id);
  };

  const totalVencimentos = useMemo(
    () => lancamentos.filter((l) => l.tipo === 'vencimento').reduce((acc, l) => acc + l.valor, 0),
    [lancamentos],
  );
  const totalDescontos = useMemo(
    () => lancamentos.filter((l) => l.tipo === 'desconto').reduce((acc, l) => acc + l.valor, 0),
    [lancamentos],
  );

  const competenciaLabel = (competencia: string) => {
    const date = new Date(`${competencia}T00:00:00`);
    if (Number.isNaN(date.getTime())) return competencia;
    return `${date.toLocaleDateString('pt-BR', { month: 'long' })} de ${date.getFullYear()}`;
  };

  const handleExportarCompetencia = () => {
    if (!folhaSelecionada) return;
    exportarCsv(`folha-${folhaSelecionada.competencia.slice(0, 7)}`, ['Servidor', 'Tipo', 'Descricao', 'Valor (R$)'], lancamentos.map((l) => [
      l.servidor_nome || 'Sem servidor',
      l.tipo === 'vencimento' ? 'Vencimento' : 'Desconto',
      l.descricao,
      l.tipo === 'vencimento' ? String(l.valor) : `-${l.valor}`,
    ]));
    toast({ title: 'Exportacao iniciada', description: 'O CSV da competencia foi gerado.' });
  };

  const handleExportarTodas = () => {
    exportarCsv('folhas-competencias', ['Competencia', 'Status', 'Valor total (R$)'], folhas.map((f) => [
      competenciaLabel(f.competencia),
      f.status === 'fechada' ? 'Fechada' : 'Rascunho',
      String(f.valor_total),
    ]));
    toast({ title: 'Exportacao iniciada', description: 'O CSV de competencias foi gerado.' });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-1 px-1 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Voltar"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">Folha de Pagamento</h1>
        </div>

        <section className="hidden rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#7c3aed_100%)] md:rounded-[34px] lg:block">
          <div className="space-y-4 px-4 pb-4 pt-5 md:space-y-6 md:px-6 md:pb-5 md:pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-violet-100/70 md:text-[11px]">Administracao Central</p>
                <h1 className="mt-2 text-xl font-black tracking-[-0.05em] text-white sm:text-2xl md:mt-3 md:text-[32px] md:tracking-[-0.07em] lg:text-[38px]">Folha de Pagamento</h1>
                <p className="mt-1.5 hidden max-w-xl text-[13px] leading-5 text-white md:block md:mt-2 md:text-[14px] md:leading-6">
                  Competencias mensais, lancamentos de vencimentos e descontos por servidor.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="competencias">Competencias</TabsTrigger>
            <TabsTrigger value="lancamentos" disabled={!folhaSelecionada}>Lancamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="competencias" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl text-[13px] font-semibold" onClick={handleExportarTodas} disabled={folhas.length === 0}>
                  <Download className="h-4 w-4" />
                  Exportar competencias
                </Button>
              </div>
              <Button onClick={() => setFolhaDialogOpen(true)} className="gap-2 rounded-2xl">
                <Plus className="h-4 w-4" />
                Nova competencia
              </Button>
            </div>
            {loading ? (
              <div className="rounded-[22px] border border-border bg-card p-8 text-center text-muted-foreground">Carregando folhas...</div>
            ) : folhas.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
                Nenhuma competencia aberta. Crie a primeira folha mensal.
              </div>
            ) : (
              <div className="space-y-3">
                {folhas.map((folha) => (
                  <div key={folha.id} className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-700 text-white">
                          <BadgeDollarSign className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[15px] font-bold capitalize text-slate-900">{competenciaLabel(folha.competencia)}</p>
                            <Badge variant="outline" className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', folha.status === 'fechada' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>
                              {folha.status === 'fechada' ? 'Fechada' : 'Rascunho'}
                            </Badge>
                          </div>
                          <p className="mt-1 text-[13px] text-slate-500">
                            Valor total: <span className="font-bold text-slate-800">{currencyFormatter.format(folha.valor_total)}</span>
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="h-9 self-start rounded-xl text-[13px] font-semibold sm:self-auto" onClick={() => openFolha(folha)}>
                        {folha.status === 'fechada' ? 'Ver detalhes' : 'Gerenciar lancamentos'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="lancamentos" className="space-y-4">
            {folhaSelecionada && (
              <>
                <div className="flex flex-col gap-3 rounded-[22px] border border-slate-200/80 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold capitalize text-slate-900">{competenciaLabel(folhaSelecionada.competencia)}</p>
                    <p className="mt-0.5 text-[13px] text-slate-500">
                      Vencimentos {currencyFormatter.format(totalVencimentos)} · Descontos {currencyFormatter.format(totalDescontos)} ·{' '}
                      <span className="font-bold text-slate-800">Liquido {currencyFormatter.format(totalVencimentos - totalDescontos)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {folhaSelecionada.status === 'rascunho' ? (
                      <>
                        <Button variant="outline" size="sm" className="h-9 rounded-xl text-[13px] font-semibold" onClick={handleExportarCompetencia} disabled={lancamentos.length === 0}>
                          <Download className="h-4 w-4" />
                          Exportar CSV
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 rounded-xl text-[13px] font-semibold" onClick={() => setLancamentoDialogOpen(true)}>
                          <Plus className="h-4 w-4" />
                          Lancamento
                        </Button>
                        <Button variant="ghost" size="sm" className="h-9 rounded-xl text-[13px] font-semibold text-violet-700" onClick={() => void handleFecharFolha()}>
                          <Lock className="h-4 w-4" />
                          Fechar folha
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" className="h-9 rounded-xl text-[13px] font-semibold" onClick={handleExportarCompetencia} disabled={lancamentos.length === 0}>
                          <Download className="h-4 w-4" />
                          Exportar CSV
                        </Button>
                        <Badge variant="outline" className="rounded-full border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700">
                          Folha fechada
                        </Badge>
                      </>
                    )}
                  </div>
                </div>

                {lancamentos.length === 0 ? (
                  <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
                    Nenhum lancamento nesta competencia.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lancamentos.map((lancamento) => (
                      <div key={lancamento.id} className="flex flex-col gap-2 rounded-[18px] border border-slate-200/80 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', lancamento.tipo === 'vencimento' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700')}>
                              {lancamento.tipo === 'vencimento' ? 'Vencimento' : 'Desconto'}
                            </Badge>
                            <p className="text-sm font-semibold text-slate-900">{lancamento.descricao}</p>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {lancamento.servidor_nome || 'Sem servidor vinculado'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className={cn('text-sm font-bold', lancamento.tipo === 'vencimento' ? 'text-emerald-700' : 'text-rose-700')}>
                            {lancamento.tipo === 'vencimento' ? '+' : '-'} {currencyFormatter.format(lancamento.valor)}
                          </p>
                          {folhaSelecionada.status === 'rascunho' && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0 text-red-600" onClick={() => void handleDeleteLancamento(lancamento)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ResponsiveDialog
        open={folhaDialogOpen}
        onOpenChange={(open) => { if (!open) setFolhaDialogOpen(false); }}
        title="Nova competencia"
        description="Abrir uma nova folha mensal como rascunho."
        confirmLabel="Criar folha"
        onCancel={() => setFolhaDialogOpen(false)}
        onConfirm={() => void handleCreateFolha()}
      >
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Competencia (mes/ano)</Label>
            <Input type="month" value={formFolha.competencia} onChange={(e) => setFormFolha({ ...formFolha, competencia: e.target.value })} />
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={lancamentoDialogOpen}
        onOpenChange={(open) => { if (!open) setLancamentoDialogOpen(false); }}
        title="Novo lancamento"
        description={folhaSelecionada ? `Folha de ${competenciaLabel(folhaSelecionada.competencia)}` : ''}
        confirmLabel="Adicionar"
        onCancel={() => setLancamentoDialogOpen(false)}
        onConfirm={() => void handleCreateLancamento()}
      >
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Servidor</Label>
              <Select value={formLancamento.servidor_id} onValueChange={(v) => setFormLancamento({ ...formLancamento, servidor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>
                  {servidores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formLancamento.tipo} onValueChange={(v) => setFormLancamento({ ...formLancamento, tipo: v as FolhaLancamento['tipo'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vencimento">Vencimento</SelectItem>
                  <SelectItem value="desconto">Desconto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descricao *</Label>
            <Input value={formLancamento.descricao} onChange={(e) => setFormLancamento({ ...formLancamento, descricao: e.target.value })} placeholder="Ex.: Salario base, INSS, alimentacao..." />
          </div>
          <div className="space-y-2">
            <Label>Valor (R$) *</Label>
            <Input value={formLancamento.valor} onChange={(e) => setFormLancamento({ ...formLancamento, valor: e.target.value })} placeholder="0,00" inputMode="decimal" />
          </div>
        </div>
      </ResponsiveDialog>
      {confirmDialog}
    </AdminLayout>
  );
};

export default FolhaPagamentoPage;
