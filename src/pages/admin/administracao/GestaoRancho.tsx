import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, ShoppingCart, Trash2, UtensilsCrossed } from 'lucide-react';
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
import { cn } from '@/lib/utils';

type RanchoRefeicao = {
  id: string;
  data_refeicao: string;
  tipo_refeicao: 'cafe' | 'almoco' | 'jantar' | 'lanche';
  cardapio: string;
  quantidade_pessoas: number;
  observacao: string | null;
};

type RanchoCompra = {
  id: string;
  data_compra: string;
  fornecedor: string | null;
  descricao: string;
  valor: number;
};

const tipoRefeicaoLabels: Record<RanchoRefeicao['tipo_refeicao'], string> = {
  cafe: 'Café da manhã',
  almoco: 'Almoço',
  jantar: 'Jantar',
  lanche: 'Lanche',
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const initialRefeicao = {
  data_refeicao: '',
  tipo_refeicao: 'almoco' as RanchoRefeicao['tipo_refeicao'],
  cardapio: '',
  quantidade_pessoas: '',
  observacao: '',
};

const initialCompra = {
  data_compra: '',
  fornecedor: '',
  descricao: '',
  valor: '',
};

const GestaoRanchoPage = () => {
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [refeicoes, setRefeicoes] = useState<RanchoRefeicao[]>([]);
  const [compras, setCompras] = useState<RanchoCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('refeicoes');

  const [refeicaoDialogOpen, setRefeicaoDialogOpen] = useState(false);
  const [formRefeicao, setFormRefeicao] = useState(initialRefeicao);

  const [compraDialogOpen, setCompraDialogOpen] = useState(false);
  const [formCompra, setFormCompra] = useState(initialCompra);

  const loadData = useCallback(async () => {
    const [refeicoesResponse, comprasResponse] = await Promise.all([
      supabase.from('rancho_refeicoes').select('*').order('data_refeicao', { ascending: false }).limit(200),
      supabase.from('rancho_compras').select('*').order('data_compra', { ascending: false }).limit(200),
    ]);
    if (refeicoesResponse.error) console.warn('Erro ao carregar refeicoes:', refeicoesResponse.error.message);
    else setRefeicoes((refeicoesResponse.data || []) as RanchoRefeicao[]);
    if (comprasResponse.error) console.warn('Erro ao carregar compras:', comprasResponse.error.message);
    else setCompras((comprasResponse.data || []) as RanchoCompra[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const refeicoesHoje = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    return refeicoes.filter((r) => r.data_refeicao === hoje);
  }, [refeicoes]);

  const totalPessoasHoje = refeicoesHoje.reduce((acc, r) => acc + r.quantidade_pessoas, 0);

  const gastoMes = useMemo(() => {
    const agora = new Date();
    const mesKey = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    return compras
      .filter((c) => c.data_compra.startsWith(mesKey))
      .reduce((acc, c) => acc + c.valor, 0);
  }, [compras]);

  const handleRefeicaoSave = async () => {
    if (!formRefeicao.data_refeicao || !formRefeicao.cardapio.trim()) {
      toast({ title: 'Campos obrigatorios', description: 'Informe a data e o cardapio.', variant: 'destructive' });
      return;
    }
    const quantidade = Number(formRefeicao.quantidade_pessoas) || 0;
    if (quantidade < 0) {
      toast({ title: 'Quantidade invalida', description: 'A quantidade de pessoas nao pode ser negativa.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('rancho_refeicoes').insert({
      data_refeicao: formRefeicao.data_refeicao,
      tipo_refeicao: formRefeicao.tipo_refeicao,
      cardapio: formRefeicao.cardapio.trim(),
      quantidade_pessoas: quantidade,
      observacao: formRefeicao.observacao.trim() || null,
    });
    if (error) {
      toast({ title: 'Erro ao registrar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Refeicao registrada', description: 'O cardapio foi salvo.' });
    setRefeicaoDialogOpen(false);
    setFormRefeicao(initialRefeicao);
    void loadData();
  };

  const handleDeleteRefeicao = async (refeicao: RanchoRefeicao) => {
    const confirmed = await confirm({
      title: 'Excluir refeicao',
      description: `Remover a refeicao de ${new Date(refeicao.data_refeicao).toLocaleDateString('pt-BR')}?`,
    });
    if (!confirmed) return;
    const { error } = await supabase.from('rancho_refeicoes').delete().eq('id', refeicao.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Refeicao excluida', description: 'O registro foi removido.' });
    void loadData();
  };

  const handleCompraSave = async () => {
    if (!formCompra.descricao.trim()) {
      toast({ title: 'Campo obrigatorio', description: 'Informe a descricao da compra.', variant: 'destructive' });
      return;
    }
    const valor = Number(formCompra.valor.replace(',', '.'));
    if (Number.isNaN(valor) || valor < 0) {
      toast({ title: 'Valor invalido', description: 'Informe um valor numerico.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('rancho_compras').insert({
      data_compra: formCompra.data_compra || new Date().toISOString().slice(0, 10),
      fornecedor: formCompra.fornecedor.trim() || null,
      descricao: formCompra.descricao.trim(),
      valor: Number(valor.toFixed(2)),
    });
    if (error) {
      toast({ title: 'Erro ao registrar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Compra registrada', description: 'O gasto foi salvo.' });
    setCompraDialogOpen(false);
    setFormCompra(initialCompra);
    void loadData();
  };

  const handleDeleteCompra = async (compra: RanchoCompra) => {
    const confirmed = await confirm({
      title: 'Excluir compra',
      description: `Remover "${compra.descricao}" (${currencyFormatter.format(compra.valor)})?`,
    });
    if (!confirmed) return;
    const { error } = await supabase.from('rancho_compras').delete().eq('id', compra.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Compra excluida', description: 'O registro foi removido.' });
    void loadData();
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
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">Gestao de Rancho</h1>
        </div>

        <section className="hidden rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#e11d48_100%)] md:rounded-[34px] lg:block">
          <div className="space-y-4 px-4 pb-4 pt-5 md:space-y-6 md:px-6 md:pb-5 md:pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-100/70 md:text-[11px]">Administracao Central</p>
                <h1 className="mt-2 text-xl font-black tracking-[-0.05em] text-white sm:text-2xl md:mt-3 md:text-[32px] md:tracking-[-0.07em] lg:text-[38px]">Gestao de Rancho</h1>
                <p className="mt-1.5 hidden max-w-xl text-[13px] leading-5 text-white md:block md:mt-2 md:text-[14px] md:leading-6">
                  Refeicoes, cardapios, consumo diario e controle de compras.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Refeicoes</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{refeicoes.length}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/70">Registros totais</p>
              </div>
              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Hoje</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{refeicoesHoje.length}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/70">Refeicoes do dia</p>
              </div>
              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Pessoas hoje</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{totalPessoasHoje}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/70">Consumo previsto</p>
              </div>
              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Gasto do mes</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{currencyFormatter.format(gastoMes)}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/70">Compras do periodo</p>
              </div>
            </div>
          </div>
        </section>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="refeicoes">Refeicoes</TabsTrigger>
            <TabsTrigger value="compras">Compras</TabsTrigger>
          </TabsList>

          <TabsContent value="refeicoes" className="space-y-4">
            <div className="flex items-center justify-end">
              <Button onClick={() => setRefeicaoDialogOpen(true)} className="gap-2 rounded-2xl">
                <Plus className="h-4 w-4" />
                Registrar refeicao
              </Button>
            </div>
            {loading ? (
              <div className="rounded-[22px] border border-border bg-card p-8 text-center text-muted-foreground">Carregando refeicoes...</div>
            ) : refeicoes.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
                Nenhuma refeicao registrada
              </div>
            ) : (
              <div className="space-y-2">
                {refeicoes.map((refeicao) => (
                  <div key={refeicao.id} className="flex flex-col gap-2 rounded-[18px] border border-slate-200/80 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-600 text-white">
                        <UtensilsCrossed className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            {tipoRefeicaoLabels[refeicao.tipo_refeicao]}
                          </Badge>
                          <p className="text-sm font-semibold text-slate-900">{refeicao.cardapio}</p>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {new Date(refeicao.data_refeicao).toLocaleDateString('pt-BR')} · {refeicao.quantidade_pessoas} pessoa(s)
                          {refeicao.observacao ? ` · ${refeicao.observacao}` : ''}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 self-start rounded-lg p-0 text-red-600 sm:self-auto" onClick={() => void handleDeleteRefeicao(refeicao)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="compras" className="space-y-4">
            <div className="flex items-center justify-end">
              <Button onClick={() => setCompraDialogOpen(true)} className="gap-2 rounded-2xl">
                <ShoppingCart className="h-4 w-4" />
                Registrar compra
              </Button>
            </div>
            {compras.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
                Nenhuma compra registrada
              </div>
            ) : (
              <div className="space-y-2">
                {compras.map((compra) => (
                  <div key={compra.id} className="flex flex-col gap-2 rounded-[18px] border border-slate-200/80 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                        <ShoppingCart className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{compra.descricao}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {new Date(compra.data_compra).toLocaleDateString('pt-BR')}
                          {compra.fornecedor ? ` · ${compra.fornecedor}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-bold text-slate-800">{currencyFormatter.format(compra.valor)}</p>
                      <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0 text-red-600" onClick={() => void handleDeleteCompra(compra)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ResponsiveDialog
        open={refeicaoDialogOpen}
        onOpenChange={(open) => { if (!open) setRefeicaoDialogOpen(false); }}
        title="Registrar refeicao"
        description="Cardapio e consumo do dia."
        confirmLabel="Registrar"
        onCancel={() => setRefeicaoDialogOpen(false)}
        onConfirm={() => void handleRefeicaoSave()}
      >
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={formRefeicao.data_refeicao} onChange={(e) => setFormRefeicao({ ...formRefeicao, data_refeicao: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de refeicao</Label>
              <Select value={formRefeicao.tipo_refeicao} onValueChange={(v) => setFormRefeicao({ ...formRefeicao, tipo_refeicao: v as RanchoRefeicao['tipo_refeicao'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cafe">Café da manhã</SelectItem>
                  <SelectItem value="almoco">Almoço</SelectItem>
                  <SelectItem value="jantar">Jantar</SelectItem>
                  <SelectItem value="lanche">Lanche</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cardapio *</Label>
            <Input value={formRefeicao.cardapio} onChange={(e) => setFormRefeicao({ ...formRefeicao, cardapio: e.target.value })} placeholder="Ex.: Arroz, feijao, frango..." />
          </div>
          <div className="space-y-2">
            <Label>Quantidade de pessoas</Label>
            <Input inputMode="numeric" value={formRefeicao.quantidade_pessoas} onChange={(e) => setFormRefeicao({ ...formRefeicao, quantidade_pessoas: e.target.value })} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Observacao</Label>
            <Input value={formRefeicao.observacao} onChange={(e) => setFormRefeicao({ ...formRefeicao, observacao: e.target.value })} placeholder="Opcional" />
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={compraDialogOpen}
        onOpenChange={(open) => { if (!open) setCompraDialogOpen(false); }}
        title="Registrar compra"
        description="Gasto do rancho para controle mensal."
        confirmLabel="Registrar"
        onCancel={() => setCompraDialogOpen(false)}
        onConfirm={() => void handleCompraSave()}
      >
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={formCompra.data_compra} onChange={(e) => setFormCompra({ ...formCompra, data_compra: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input value={formCompra.fornecedor} onChange={(e) => setFormCompra({ ...formCompra, fornecedor: e.target.value })} placeholder="Opcional" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descricao *</Label>
            <Input value={formCompra.descricao} onChange={(e) => setFormCompra({ ...formCompra, descricao: e.target.value })} placeholder="Ex.: Carnes, verduras, gas..." />
          </div>
          <div className="space-y-2">
            <Label>Valor (R$) *</Label>
            <Input inputMode="decimal" value={formCompra.valor} onChange={(e) => setFormCompra({ ...formCompra, valor: e.target.value })} placeholder="0,00" />
          </div>
        </div>
      </ResponsiveDialog>
      {confirmDialog}
    </AdminLayout>
  );
};

export default GestaoRanchoPage;
