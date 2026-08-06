import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Boxes, Download, Pencil, Plus, Search, Trash2 } from 'lucide-react';
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

type AlmoxInsumo = {
  id: string;
  nome: string;
  categoria: string | null;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
  observacao: string | null;
  ativo: boolean;
};

type AlmoxMovimentacao = {
  id: string;
  insumo_id: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  data_movimentacao: string;
  responsavel: string | null;
  observacao: string | null;
};

const initialInsumo = {
  nome: '',
  categoria: '',
  unidade: 'un',
  estoque_atual: '',
  estoque_minimo: '',
  observacao: '',
};

const initialMovimentacao = {
  tipo: 'entrada' as AlmoxMovimentacao['tipo'],
  quantidade: '',
  responsavel: '',
  observacao: '',
};

const formatQtd = (value: number) => {
  const formatted = Number(value.toFixed(3));
  return formatted % 1 === 0 ? String(Number(formatted)) : String(formatted);
};

const AlmoxarifadoPage = () => {
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [insumos, setInsumos] = useState<AlmoxInsumo[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<AlmoxMovimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [tab, setTab] = useState('insumos');

  const [insumoDialogOpen, setInsumoDialogOpen] = useState(false);
  const [insumoDialogMode, setInsumoDialogMode] = useState<'create' | 'edit'>('create');
  const [insumoAlvo, setInsumoAlvo] = useState<AlmoxInsumo | null>(null);
  const [formInsumo, setFormInsumo] = useState(initialInsumo);

  const [movimentacaoDialogOpen, setMovimentacaoDialogOpen] = useState(false);
  const [movimentacaoInsumo, setMovimentacaoInsumo] = useState<AlmoxInsumo | null>(null);
  const [formMovimentacao, setFormMovimentacao] = useState(initialMovimentacao);

  const loadData = useCallback(async () => {
    const [insumosResponse, movimentacoesResponse] = await Promise.all([
      supabase.from('almox_insumos').select('*').order('nome'),
      supabase.from('almox_movimentacoes').select('*').order('data_movimentacao', { ascending: false }).limit(200),
    ]);
    if (insumosResponse.error) console.warn('Erro ao carregar insumos:', insumosResponse.error.message);
    else setInsumos((insumosResponse.data || []) as AlmoxInsumo[]);
    if (movimentacoesResponse.error) console.warn('Erro ao carregar movimentacoes:', movimentacoesResponse.error.message);
    else setMovimentacoes((movimentacoesResponse.data || []) as AlmoxMovimentacao[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredInsumos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return insumos;
    return insumos.filter(
      (i) => i.nome.toLowerCase().includes(termo) || (i.categoria || '').toLowerCase().includes(termo),
    );
  }, [insumos, busca]);

  const insumosAbaixoMinimo = insumos.filter((i) => i.estoque_atual < i.estoque_minimo).length;
  const categorias = useMemo(
    () => Array.from(new Set(insumos.map((i) => i.categoria).filter(Boolean))).sort() as string[],
    [insumos],
  );

  const openCreateInsumo = () => {
    setInsumoDialogMode('create');
    setInsumoAlvo(null);
    setFormInsumo(initialInsumo);
    setInsumoDialogOpen(true);
  };

  const openEditInsumo = (insumo: AlmoxInsumo) => {
    setInsumoDialogMode('edit');
    setInsumoAlvo(insumo);
    setFormInsumo({
      nome: insumo.nome,
      categoria: insumo.categoria || '',
      unidade: insumo.unidade,
      estoque_atual: formatQtd(insumo.estoque_atual),
      estoque_minimo: formatQtd(insumo.estoque_minimo),
      observacao: insumo.observacao || '',
    });
    setInsumoDialogOpen(true);
  };

  const handleInsumoSave = async () => {
    if (!formInsumo.nome.trim()) {
      toast({ title: 'Campo obrigatorio', description: 'Informe o nome do insumo.', variant: 'destructive' });
      return;
    }
    const estoqueAtual = Number(String(formInsumo.estoque_atual).replace(',', '.'));
    const estoqueMinimo = Number(String(formInsumo.estoque_minimo).replace(',', '.'));
    if (Number.isNaN(estoqueAtual) || estoqueAtual < 0 || Number.isNaN(estoqueMinimo) || estoqueMinimo < 0) {
      toast({ title: 'Valores invalidos', description: 'Estoque atual e minimo devem ser numericos nao negativos.', variant: 'destructive' });
      return;
    }
    const payload = {
      nome: formInsumo.nome.trim(),
      categoria: formInsumo.categoria.trim() || null,
      unidade: formInsumo.unidade.trim() || 'un',
      estoque_atual: estoqueAtual,
      estoque_minimo: estoqueMinimo,
      observacao: formInsumo.observacao.trim() || null,
    };
    const { error } = insumoDialogMode === 'edit' && insumoAlvo
      ? await supabase.from('almox_insumos').update(payload).eq('id', insumoAlvo.id)
      : await supabase.from('almox_insumos').insert(payload);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: insumoDialogMode === 'edit' ? 'Insumo atualizado' : 'Insumo cadastrado',
      description: 'Os dados foram salvos.',
    });
    setInsumoDialogOpen(false);
    setInsumoAlvo(null);
    void loadData();
  };

  const handleDeleteInsumo = async (insumo: AlmoxInsumo) => {
    const confirmed = await confirm({
      title: 'Excluir insumo',
      description: `Remover permanentemente "${insumo.nome}"? As movimentacoes vinculadas serao removidas.`,
    });
    if (!confirmed) return;
    const { error } = await supabase.from('almox_insumos').delete().eq('id', insumo.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Insumo excluido', description: `${insumo.nome} foi removido.` });
    void loadData();
  };

  const openMovimentacao = (insumo: AlmoxInsumo) => {
    setMovimentacaoInsumo(insumo);
    setFormMovimentacao(initialMovimentacao);
    setMovimentacaoDialogOpen(true);
  };

  const handleMovimentacaoSave = async () => {
    if (!movimentacaoInsumo) return;
    const quantidade = Number(String(formMovimentacao.quantidade).replace(',', '.'));
    if (Number.isNaN(quantidade) || quantidade <= 0) {
      toast({ title: 'Quantidade invalida', description: 'Informe uma quantidade maior que zero.', variant: 'destructive' });
      return;
    }
    const novoEstoque =
      formMovimentacao.tipo === 'entrada'
        ? movimentacaoInsumo.estoque_atual + quantidade
        : movimentacaoInsumo.estoque_atual - quantidade;
    if (novoEstoque < 0) {
      toast({ title: 'Saldo insuficiente', description: 'A saida nao pode superar o estoque atual.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('almox_movimentacoes').insert({
      insumo_id: movimentacaoInsumo.id,
      tipo: formMovimentacao.tipo,
      quantidade: Number(quantidade.toFixed(3)),
      responsavel: formMovimentacao.responsavel.trim() || null,
      observacao: formMovimentacao.observacao.trim() || null,
    });
    if (error) {
      toast({ title: 'Erro ao registrar', description: error.message, variant: 'destructive' });
      return;
    }
    const { error: updateError } = await supabase
      .from('almox_insumos')
      .update({ estoque_atual: Number(novoEstoque.toFixed(3)) })
      .eq('id', movimentacaoInsumo.id);
    if (updateError) console.warn('Erro ao atualizar estoque:', updateError.message);
    toast({ title: 'Movimentacao registrada', description: `Estoque atualizado para ${formatQtd(novoEstoque)} ${movimentacaoInsumo.unidade}.` });
    setMovimentacaoDialogOpen(false);
    setMovimentacaoInsumo(null);
    void loadData();
  };

  const movimentacoesDoInsumo = (insumoId: string) => movimentacoes.filter((m) => m.insumo_id === insumoId);

  const handleExportarInventario = () => {
    exportarCsv('inventario-almoxarifado', ['Nome', 'Categoria', 'Unidade', 'Estoque atual', 'Estoque minimo', 'Situacao'], insumos.map((i) => [
      i.nome,
      i.categoria || '',
      i.unidade,
      formatQtd(i.estoque_atual),
      formatQtd(i.estoque_minimo),
      i.estoque_atual < i.estoque_minimo ? 'Abaixo do minimo' : 'OK',
    ]));
    toast({ title: 'Exportacao iniciada', description: 'O CSV do inventario foi gerado.' });
  };

  const handleExportarMovimentacoes = () => {
    exportarCsv('movimentacoes-almoxarifado', ['Data', 'Insumo', 'Tipo', 'Quantidade', 'Responsavel', 'Observacao'], movimentacoes.map((m) => [
      m.data_movimentacao,
      insumos.find((i) => i.id === m.insumo_id)?.nome || 'Insumo removido',
      m.tipo === 'entrada' ? 'Entrada' : 'Saida',
      formatQtd(m.quantidade),
      m.responsavel || '',
      m.observacao || '',
    ]));
    toast({ title: 'Exportacao iniciada', description: 'O CSV de movimentacoes foi gerado.' });
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
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">Almoxarifado</h1>
        </div>

        <section className="hidden rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#b45309_100%)] md:rounded-[34px] lg:block">
          <div className="space-y-4 px-4 pb-4 pt-5 md:space-y-6 md:px-6 md:pb-5 md:pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-100/70 md:text-[11px]">Administracao Central</p>
                <h1 className="mt-2 text-xl font-black tracking-[-0.05em] text-white sm:text-2xl md:mt-3 md:text-[32px] md:tracking-[-0.07em] lg:text-[38px]">Almoxarifado</h1>
                <p className="mt-1.5 hidden max-w-xl text-[13px] leading-5 text-white md:block md:mt-2 md:text-[14px] md:leading-6">
                  Controle de insumos e estoque com registro de entradas e saidas.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Insumos</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{insumos.length}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/70">Itens cadastrados</p>
              </div>
              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Movimentacoes</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{movimentacoes.length}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/70">Entradas e saidas</p>
              </div>
              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Entradas</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{movimentacoes.filter((m) => m.tipo === 'entrada').length}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/70">Registradas</p>
              </div>
              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Abaixo do minimo</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{insumosAbaixoMinimo}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/70">Necessitam reposicao</p>
              </div>
            </div>
          </div>
        </section>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="insumos">Insumos</TabsTrigger>
            <TabsTrigger value="movimentacoes">Movimentacoes</TabsTrigger>
          </TabsList>

          <TabsContent value="insumos" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10 text-sm font-medium"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome ou categoria..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl text-[13px] font-semibold" onClick={handleExportarInventario} disabled={insumos.length === 0}>
                  <Download className="h-4 w-4" />
                  Inventario
                </Button>
                <Button onClick={openCreateInsumo} className="gap-2 rounded-2xl">
                  <Plus className="h-4 w-4" />
                  Cadastrar insumo
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="rounded-[22px] border border-border bg-card p-8 text-center text-muted-foreground">Carregando insumos...</div>
            ) : filteredInsumos.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
                Nenhum insumo encontrado
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInsumos.map((insumo) => {
                  const abaixoMinimo = insumo.estoque_atual < insumo.estoque_minimo;
                  const entradas = movimentacoesDoInsumo(insumo.id).filter((m) => m.tipo === 'entrada').length;
                  const saidas = movimentacoesDoInsumo(insumo.id).filter((m) => m.tipo === 'saida').length;
                  return (
                    <div key={insumo.id} className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-600 text-white">
                            <Boxes className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[15px] font-bold text-slate-900">{insumo.nome}</p>
                              {insumo.categoria && (
                                <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                                  {insumo.categoria}
                                </Badge>
                              )}
                              {abaixoMinimo && (
                                <Badge variant="outline" className="rounded-full border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
                                  Abaixo do minimo
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-[13px] text-slate-500">
                              Estoque: <span className={cn('font-bold', abaixoMinimo ? 'text-red-600' : 'text-slate-800')}>{formatQtd(insumo.estoque_atual)} {insumo.unidade}</span>
                              {' · '}Minimo: {formatQtd(insumo.estoque_minimo)} {insumo.unidade}
                            </p>
                            <p className="mt-0.5 text-[13px] text-slate-500">
                              {entradas} entrada(s) · {saidas} saida(s)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-9 rounded-xl text-[13px] font-semibold" onClick={() => openMovimentacao(insumo)}>
                            <ArrowDownToLine className="h-4 w-4" />
                            Movimentar
                          </Button>
                          <Button variant="ghost" size="sm" className="h-9 rounded-xl text-[13px] font-semibold text-slate-600" onClick={() => openEditInsumo(insumo)}>
                            <Pencil className="h-4 w-4" />
                            Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="h-9 rounded-xl text-[13px] font-semibold text-red-600" onClick={() => void handleDeleteInsumo(insumo)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="movimentacoes" className="space-y-4">
            <div className="flex items-center justify-end">
              <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl text-[13px] font-semibold" onClick={handleExportarMovimentacoes} disabled={movimentacoes.length === 0}>
                <Download className="h-4 w-4" />
                Exportar movimentacoes
              </Button>
            </div>
            {movimentacoes.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
                Nenhuma movimentacao registrada
              </div>
            ) : (
              <div className="space-y-2">
                {movimentacoes.map((movimentacao) => {
                  const insumo = insumos.find((i) => i.id === movimentacao.insumo_id);
                  return (
                    <div key={movimentacao.id} className="flex flex-col gap-2 rounded-[18px] border border-slate-200/80 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', movimentacao.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                          {movimentacao.tipo === 'entrada' ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', movimentacao.tipo === 'entrada' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700')}>
                              {movimentacao.tipo === 'entrada' ? 'Entrada' : 'Saida'}
                            </Badge>
                            <p className="text-sm font-semibold text-slate-900">{insumo?.nome || 'Insumo removido'}</p>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {new Date(movimentacao.data_movimentacao).toLocaleDateString('pt-BR')}
                            {movimentacao.responsavel ? ` · ${movimentacao.responsavel}` : ''}
                            {movimentacao.observacao ? ` · ${movimentacao.observacao}` : ''}
                          </p>
                        </div>
                      </div>
                      <p className={cn('text-sm font-bold', movimentacao.tipo === 'entrada' ? 'text-emerald-700' : 'text-rose-700')}>
                        {movimentacao.tipo === 'entrada' ? '+' : '-'} {formatQtd(movimentacao.quantidade)} {insumo?.unidade || ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ResponsiveDialog
        open={insumoDialogOpen}
        onOpenChange={(open) => { if (!open) { setInsumoDialogOpen(false); setInsumoAlvo(null); } }}
        title={insumoDialogMode === 'edit' ? 'Editar insumo' : 'Cadastrar insumo'}
        description={insumoDialogMode === 'edit' ? insumoAlvo?.nome || '' : 'Novo item no almoxarifado.'}
        confirmLabel={insumoDialogMode === 'edit' ? 'Salvar' : 'Cadastrar'}
        onCancel={() => { setInsumoDialogOpen(false); setInsumoAlvo(null); }}
        onConfirm={() => void handleInsumoSave()}
      >
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={formInsumo.nome} onChange={(e) => setFormInsumo({ ...formInsumo, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={formInsumo.categoria} onValueChange={(v) => setFormInsumo({ ...formInsumo, categoria: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione ou deixe vazio" /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={formInsumo.unidade} onValueChange={(v) => setFormInsumo({ ...formInsumo, unidade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="un">un</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="l">l</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="pct">pct</SelectItem>
                  <SelectItem value="cx">cx</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estoque atual</Label>
              <Input inputMode="decimal" value={formInsumo.estoque_atual} onChange={(e) => setFormInsumo({ ...formInsumo, estoque_atual: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Estoque minimo</Label>
              <Input inputMode="decimal" value={formInsumo.estoque_minimo} onChange={(e) => setFormInsumo({ ...formInsumo, estoque_minimo: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observacao</Label>
            <Input value={formInsumo.observacao} onChange={(e) => setFormInsumo({ ...formInsumo, observacao: e.target.value })} placeholder="Opcional" />
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={movimentacaoDialogOpen}
        onOpenChange={(open) => { if (!open) { setMovimentacaoDialogOpen(false); setMovimentacaoInsumo(null); } }}
        title="Registrar movimentacao"
        description={movimentacaoInsumo ? `${movimentacaoInsumo.nome} · Estoque atual: ${formatQtd(movimentacaoInsumo.estoque_atual)} ${movimentacaoInsumo.unidade}` : ''}
        confirmLabel="Registrar"
        onCancel={() => { setMovimentacaoDialogOpen(false); setMovimentacaoInsumo(null); }}
        onConfirm={() => void handleMovimentacaoSave()}
      >
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formMovimentacao.tipo} onValueChange={(v) => setFormMovimentacao({ ...formMovimentacao, tipo: v as AlmoxMovimentacao['tipo'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade *</Label>
              <Input inputMode="decimal" value={formMovimentacao.quantidade} onChange={(e) => setFormMovimentacao({ ...formMovimentacao, quantidade: e.target.value })} placeholder="0" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Responsavel</Label>
            <Input value={formMovimentacao.responsavel} onChange={(e) => setFormMovimentacao({ ...formMovimentacao, responsavel: e.target.value })} placeholder="Quem registrou/recebeu" />
          </div>
          <div className="space-y-2">
            <Label>Observacao</Label>
            <Input value={formMovimentacao.observacao} onChange={(e) => setFormMovimentacao({ ...formMovimentacao, observacao: e.target.value })} placeholder="Opcional" />
          </div>
        </div>
      </ResponsiveDialog>
      {confirmDialog}
    </AdminLayout>
  );
};

export default AlmoxarifadoPage;
