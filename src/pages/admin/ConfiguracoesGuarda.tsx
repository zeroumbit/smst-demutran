import { useEffect, useState } from 'react';
import { DollarSign, Pencil, Plus, RefreshCcw, Settings2, ShieldCheck, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { GuardaMunicipalGraduacao, IROValorGraduacao } from '@/types/admin';

const formInitial = { graduacao_id: '', valor_hora: '' };

const ConfiguracoesGuarda = () => {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<IROValorGraduacao[]>([]);
  const [graduacoes, setGraduacoes] = useState<GuardaMunicipalGraduacao[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(formInitial);
  const [editing, setEditing] = useState<IROValorGraduacao | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [valoresRes, graduacoesRes] = await Promise.all([
      supabase.from('iro_valores_graduacao').select('id, graduacao_id, valor_hora, ativo, created_at, updated_at').order('created_at', { ascending: false }),
      supabase.from('guarda_municipal_graduacoes').select('id, nome, ordem').order('ordem', { ascending: true }).order('nome', { ascending: true }),
    ]);

    if (valoresRes.error) { toast({ title: 'Erro ao carregar valores', description: valoresRes.error.message, variant: 'destructive' }); setLoading(false); return; }
    if (graduacoesRes.error) { toast({ title: 'Erro ao carregar graduações', description: graduacoesRes.error.message, variant: 'destructive' }); setLoading(false); return; }

    const graduacoesList = (graduacoesRes.data || []) as GuardaMunicipalGraduacao[];
    const graduacaoMap = new Map(graduacoesList.map((g) => [g.id, g.nome]));
    setGraduacoes(graduacoesList);
    setItems(
      ((valoresRes.data || []) as IROValorGraduacao[]).map((item) => ({
        ...item,
        graduacao_nome: graduacaoMap.get(item.graduacao_id) ?? null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, []);

  const resetDialog = () => { setEditing(null); setForm(formInitial); setDialogOpen(false); };

  const openCreate = () => { setEditing(null); setForm(formInitial); setDialogOpen(true); };

  const openEdit = (item: IROValorGraduacao) => {
    setEditing(item);
    setForm({ graduacao_id: item.graduacao_id, valor_hora: String(item.valor_hora) });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.graduacao_id || !form.valor_hora.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione a graduação e informe o valor da hora.', variant: 'destructive' });
      return;
    }
    const payload = { graduacao_id: form.graduacao_id, valor_hora: Number.parseFloat(form.valor_hora.replace(',', '.')) || 0 };
    const { error } = editing
      ? await supabase.from('iro_valores_graduacao').update(payload).eq('id', editing.id)
      : await supabase.from('iro_valores_graduacao').insert(payload);
    if (error) { toast({ title: editing ? 'Erro ao atualizar' : 'Erro ao cadastrar', description: error.message, variant: 'destructive' }); return; }
    toast({ title: editing ? 'Valor atualizado' : 'Valor cadastrado' });
    resetDialog(); void loadData();
  };

  const handleToggleAtivo = async (item: IROValorGraduacao) => {
    const { error } = await supabase.from('iro_valores_graduacao').update({ ativo: !item.ativo }).eq('id', item.id);
    if (error) { toast({ title: 'Erro ao alterar status', description: error.message, variant: 'destructive' }); return; }
    toast({ title: item.ativo ? 'Valor desativado' : 'Valor ativado' });
    void loadData();
  };

  const handleDelete = async (item: IROValorGraduacao) => {
    const confirmed = await confirm({ title: 'Excluir valor', description: `Deseja excluir o valor da graduação ${item.graduacao_nome || item.graduacao_id}?` });
    if (!confirmed) return;
    const { error } = await supabase.from('iro_valores_graduacao').delete().eq('id', item.id);
    if (error) { toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Valor excluído' }); void loadData();
  };

  const usedGraduacaoIds = new Set(items.map((i) => i.graduacao_id));
  const availableGraduacoes = editing
    ? graduacoes
    : graduacoes.filter((g) => !usedGraduacaoIds.has(g.id));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-2xl bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-4 py-5 text-white md:rounded-[34px] md:px-6 md:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
             <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-sky-100/70 md:text-[11px]">Guarda Municipal</p>
              <h1 className="mt-2 text-xl font-black tracking-[-0.05em] sm:text-2xl md:mt-3 md:text-[34px] md:tracking-[-0.08em]">Configurações</h1>
              <p className="mt-1.5 hidden max-w-2xl text-[13px] leading-5 text-slate-100 md:block md:mt-2 md:text-sm md:leading-6">
                Configure os valores de hora IRO por graduação dos guardas municipais.
              </p>
            </div>
            <Button variant="outline" className="h-10 border-white/20 bg-white/10 text-xs text-white hover:bg-white/20 md:h-11 md:text-sm" onClick={() => void loadData()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:mt-6">
            <StatCard label="Graduações configuradas" value={String(items.filter((i) => i.ativo).length)} icon={ShieldCheck} />
            <StatCard label="Total de graduações" value={String(graduacoes.length)} icon={Settings2} />
          </div>
        </section>

        <div className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-white px-5 py-4">
          <p className="text-sm font-bold text-slate-700">Valores de hora IRO por graduação</p>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Novo valor
          </Button>
        </div>

        {loading ? (
          <div className="rounded-[22px] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Carregando configurações...</div>
        ) : items.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Nenhum valor configurado. Clique em "Novo valor" para começar.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <article key={item.id} className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${item.ativo ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-100 text-slate-500'}`}>
                        {item.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">{item.graduacao_nome || 'Graduação'}</h2>
                    <p className="flex items-center gap-1 text-sm text-slate-600">
                      <DollarSign className="h-4 w-4" />
                      <strong className="text-slate-900">R$ {item.valor_hora.toFixed(2).replace('.', ',')}</strong> / hora IRO
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                      <Pencil className="mr-1.5 h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void handleToggleAtivo(item)}>
                      {item.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => void handleDelete(item)}>
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <ResponsiveDialog
          open={dialogOpen}
          onOpenChange={(open) => { if (!open) resetDialog(); else setDialogOpen(true); }}
          title={editing ? 'Editar valor' : 'Novo valor'}
          description="Configure o valor da hora IRO para a graduação selecionada."
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Graduação</Label>
              <Select
                value={form.graduacao_id}
                onValueChange={(v) => setForm((p) => ({ ...p, graduacao_id: v }))}
                disabled={Boolean(editing)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione a graduação" /></SelectTrigger>
                <SelectContent>
                  {availableGraduacoes.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor da hora IRO (R$)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={form.valor_hora}
                onChange={(e) => setForm((p) => ({ ...p, valor_hora: e.target.value }))}
                placeholder="Ex.: 25,50"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetDialog}>Cancelar</Button>
              <Button onClick={() => void handleSave()}>
                <DollarSign className="mr-2 h-4 w-4" />
                {editing ? 'Salvar alterações' : 'Cadastrar valor'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>

        {confirmDialog}
      </div>
    </AdminLayout>
  );
};

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof ShieldCheck }) {
  return (
    <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">{value}</p>
        </div>
        <div className="rounded-[18px] bg-white/15 p-3 text-white">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default ConfiguracoesGuarda;
