import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Copy, GraduationCap, Pencil, Plus, RefreshCcw, Search, Shield, Trash2, UserCheck } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { maskCpf } from '@/lib/masks';
import type { GuardaMunicipal, GuardaMunicipalGraduacao } from '@/types/admin';

type Section = 'guardas' | 'graduacoes';

const guardaInitialForm = { matricula: '', nome: '', graduacao_id: '', cpf: '' };
const graduacaoInitialForm = { nome: '', ordem: '0' };

const sectionLabels: Record<Section, string> = { guardas: 'Guardas', graduacoes: 'Graduações' };

const GuardasMunicipaisPage = () => {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>('guardas');

  const [guardas, setGuardas] = useState<GuardaMunicipal[]>([]);
  const [graduacoes, setGraduacoes] = useState<GuardaMunicipalGraduacao[]>([]);

  const [search, setSearch] = useState('');

  const [guardaDialogOpen, setGuardaDialogOpen] = useState(false);
  const [graduacaoDialogOpen, setGraduacaoDialogOpen] = useState(false);
  const [guardaForm, setGuardaForm] = useState(guardaInitialForm);
  const [graduacaoForm, setGraduacaoForm] = useState(graduacaoInitialForm);
  const [editingGuarda, setEditingGuarda] = useState<GuardaMunicipal | null>(null);
  const [editingGraduacao, setEditingGraduacao] = useState<GuardaMunicipalGraduacao | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [{ data: graduacoesData, error: graduacoesError }, { data: guardasData, error: guardasError }, { data: vinculosData }] =
      await Promise.all([
        supabase.from('guarda_municipal_graduacoes').select('id, nome, ordem, ativo, created_at, updated_at').order('ordem', { ascending: true }).order('nome', { ascending: true }),
        supabase.from('guardas_municipais').select('id, matricula, nome, cpf, email, telefone, graduacao_id, ativo, created_at, updated_at').order('nome', { ascending: true }),
        supabase.from('guardas_usuarios').select('guarda_id'),
      ]);

    if (graduacoesError || guardasError) {
      toast({ title: 'Erro ao carregar guardas', description: graduacoesError?.message || guardasError?.message || 'Não foi possível carregar os dados.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const guardasComConta = new Set((vinculosData || []).map((v: { guarda_id: string }) => v.guarda_id));
    const graduacoesList = (graduacoesData || []) as GuardaMunicipalGraduacao[];
    const graduacaoMap = new Map(graduacoesList.map((item) => [item.id, item.nome]));
    setGraduacoes(graduacoesList);
    const guardasDedup = Object.values(
      ((guardasData || []) as GuardaMunicipal[]).reduce((acc, item) => {
        acc[item.id] = { ...item, graduacao_nome: graduacaoMap.get(item.graduacao_id) ?? null, possui_conta: guardasComConta.has(item.id) };
        return acc;
      }, {} as Record<string, GuardaMunicipal>)
    );
    setGuardas(guardasDedup as GuardaMunicipal[]);
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, []);

  const filteredGuardas = useMemo(() => {
    const term = search.trim().toLowerCase();
    return guardas.filter((item) => !term || `${item.matricula} ${item.nome} ${item.cpf || ''} ${item.graduacao_nome || ''}`.toLowerCase().includes(term));
  }, [guardas, search]);

  const filteredGraduacoes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return graduacoes.filter((item) => !term || `${item.nome} ${item.ordem}`.toLowerCase().includes(term));
  }, [graduacoes, search]);

  const resetGuardaDialog = () => { setEditingGuarda(null); setGuardaForm(guardaInitialForm); setGuardaDialogOpen(false); };
  const resetGraduacaoDialog = () => { setEditingGraduacao(null); setGraduacaoForm(graduacaoInitialForm); setGraduacaoDialogOpen(false); };

  const openCreateGuarda = () => { setEditingGuarda(null); setGuardaForm(guardaInitialForm); setGuardaDialogOpen(true); };
  const openEditGuarda = (item: GuardaMunicipal) => { setEditingGuarda(item); setGuardaForm({ matricula: item.matricula, nome: item.nome, graduacao_id: item.graduacao_id, cpf: item.cpf ? maskCpf(item.cpf) : '' }); setGuardaDialogOpen(true); };
  const openCreateGraduacao = () => { setEditingGraduacao(null); setGraduacaoForm(graduacaoInitialForm); setGraduacaoDialogOpen(true); };
  const openEditGraduacao = (item: GuardaMunicipalGraduacao) => { setEditingGraduacao(item); setGraduacaoForm({ nome: item.nome, ordem: String(item.ordem) }); setGraduacaoDialogOpen(true); };

  const handleSaveGuarda = async () => {
    if (!guardaForm.matricula.trim() || !guardaForm.nome.trim() || !guardaForm.graduacao_id) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha matrícula, nome e graduação.', variant: 'destructive' });
      return;
    }
    const cpfLimpo = guardaForm.cpf.replace(/\D/g, '') || null;
    const matriculaLimpa = guardaForm.matricula.trim().replace(/^0+/, '');
    const payload: Record<string, any> = { matricula: matriculaLimpa, nome: guardaForm.nome.trim(), graduacao_id: guardaForm.graduacao_id, cpf: cpfLimpo };

    if (editingGuarda) {
      const { error } = await supabase.from('guardas_municipais').update(payload).eq('id', editingGuarda.id);
      if (error) { toast({ title: 'Erro ao atualizar guarda', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Guarda atualizado' });
    } else {
      const { error } = await supabase.from('guardas_municipais').insert(payload);
      if (error) { toast({ title: 'Erro ao cadastrar guarda', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Guarda cadastrado' });
    }

    resetGuardaDialog(); void loadData();
  };

  const handleSaveGraduacao = async () => {
    if (!graduacaoForm.nome.trim()) { toast({ title: 'Nome obrigatório', description: 'Informe o nome da graduação.', variant: 'destructive' }); return; }
    const payload = { nome: graduacaoForm.nome.trim(), ordem: Number.parseInt(graduacaoForm.ordem || '0', 10) || 0 };
    const { error } = editingGraduacao
      ? await supabase.from('guarda_municipal_graduacoes').update(payload).eq('id', editingGraduacao.id)
      : await supabase.from('guarda_municipal_graduacoes').insert(payload);
    if (error) { toast({ title: editingGraduacao ? 'Erro ao atualizar graduação' : 'Erro ao cadastrar graduação', description: error.message, variant: 'destructive' }); return; }
    toast({ title: editingGraduacao ? 'Graduação atualizada' : 'Graduação cadastrada' });
    resetGraduacaoDialog(); void loadData();
  };

  const handleDeleteGuarda = async (item: GuardaMunicipal) => {
    const confirmed = await confirm({ title: 'Excluir guarda', description: `Deseja excluir o guarda ${item.nome}?` });
    if (!confirmed) return;
    const { error } = await supabase.from('guardas_municipais').delete().eq('id', item.id);
    if (error) { toast({ title: 'Erro ao excluir guarda', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Guarda excluído' }); void loadData();
  };

  const handleDeleteGraduacao = async (item: GuardaMunicipalGraduacao) => {
    const confirmed = await confirm({ title: 'Excluir graduação', description: `Deseja excluir a graduação ${item.nome}?` });
    if (!confirmed) return;
    const { error } = await supabase.from('guarda_municipal_graduacoes').delete().eq('id', item.id);
    if (error) { toast({ title: 'Erro ao excluir graduação', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Graduação excluída' }); void loadData();
  };

  const handleCopiarLink = () => {
    const link = `${window.location.origin}/guardas/cadastro`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copiado!', description: 'Envie este link para os guardas realizarem o cadastro de acesso.' });
  };

  const cadastroLink = `${window.location.origin}/guardas/cadastro`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-[34px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-5 py-6 text-white sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-100/70">Guarda Municipal</p>
              <h1 className="mt-3 text-[34px] font-black tracking-[-0.08em]">Guardas Municipais</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-100">
                Gerencie os guardas cadastrados e mantenha as graduações sempre atualizadas.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => void loadData()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <StatCard label="Total de Guardas" value={String(guardas.length)} icon={ClipboardList} />
            <StatCard label="Graduações" value={String(graduacoes.length)} icon={GraduationCap} />
          </div>
        </section>

        <Card className="rounded-[24px] border-slate-200">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between px-5 py-5">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900">Acesso dos Guardas</h2>
              <p className="mt-1 text-sm text-slate-500">
                Copie o link abaixo e envie para os guardas criarem suas contas.
              </p>
              <Input value={cadastroLink} readOnly className="mt-3 font-mono text-sm" />
            </div>
            <Button onClick={handleCopiarLink} className="shrink-0">
              <Copy className="mr-2 h-4 w-4" />
              Copiar link
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-slate-200">
          <CardContent className="space-y-4 px-5 py-5">
            <div className="flex flex-wrap items-center gap-3">
              {(['guardas', 'graduacoes'] as Section[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setSection(s); setSearch(''); }}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-sm font-bold transition-colors',
                    section === s
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800',
                  )}
                >
                  {sectionLabels[s]}
                </button>
              ))}
              <div className="ml-auto">
                <Button size="sm" onClick={section === 'guardas' ? openCreateGuarda : openCreateGraduacao}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  {section === 'guardas' ? 'Novo guarda' : 'Nova graduação'}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Buscar {section === 'guardas' ? 'por matrícula, nome ou graduação' : 'graduação'}</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={section === 'guardas' ? 'Ex.: 3180, Antônio, Inspetor...' : 'Ex.: Subinspetor...'} />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="rounded-[22px] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Carregando {section === 'guardas' ? 'guardas' : 'graduações'}...
          </div>
        ) : section === 'guardas' ? (
          <div className="space-y-4">
            {filteredGuardas.map((item) => (
              <article key={item.id} className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-600">
                          {item.matricula}
                        </span>
                        {item.possui_conta ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                            <UserCheck className="h-3 w-3" />
                            Com conta
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                            Sem conta
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-500">
                          {item.graduacao_nome || '-'}
                        </span>
                      </div>
                    <h2 className="text-lg font-bold text-slate-900">{item.nome}</h2>
                    {item.cpf && (
                      <p className="text-xs font-medium text-slate-500">CPF: {maskCpf(item.cpf)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditGuarda(item)}>
                      <Pencil className="mr-1.5 h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => void handleDeleteGuarda(item)}>
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </article>
            ))}
            {filteredGuardas.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                Nenhum guarda encontrado com os filtros atuais.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGraduacoes.map((item) => (
              <article key={item.id} className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-600">
                        Ordem {item.ordem}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">{item.nome}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditGraduacao(item)}>
                      <Pencil className="mr-1.5 h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => void handleDeleteGraduacao(item)}>
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </article>
            ))}
            {filteredGraduacoes.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                Nenhuma graduação encontrada com os filtros atuais.
              </div>
            ) : null}
          </div>
        )}

        <ResponsiveDialog
          open={guardaDialogOpen}
          onOpenChange={(open) => { if (!open) resetGuardaDialog(); else setGuardaDialogOpen(true); }}
          title={editingGuarda ? 'Editar guarda' : 'Novo guarda'}
          description="Informe matrícula, nome e graduação do guarda municipal."
        >
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Matrícula</Label>
                <Input value={guardaForm.matricula} onChange={(e) => setGuardaForm((p) => ({ ...p, matricula: e.target.value }))} placeholder="Ex.: 3180" />
              </div>
              <div className="space-y-2">
                <Label>Graduação</Label>
                <Select value={guardaForm.graduacao_id} onValueChange={(v) => setGuardaForm((p) => ({ ...p, graduacao_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a graduação" /></SelectTrigger>
                  <SelectContent>
                    {graduacoes.map((g) => (<SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={guardaForm.nome} onChange={(e) => setGuardaForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label>CPF (Opcional)</Label>
              <Input value={guardaForm.cpf} onChange={(e) => setGuardaForm((p) => ({ ...p, cpf: maskCpf(e.target.value) }))} placeholder="000.000.000-00" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetGuardaDialog}>Cancelar</Button>
              <Button onClick={() => void handleSaveGuarda()}>
                <Shield className="mr-2 h-4 w-4" />
                {editingGuarda ? 'Salvar alterações' : 'Cadastrar guarda'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={graduacaoDialogOpen}
          onOpenChange={(open) => { if (!open) resetGraduacaoDialog(); else setGraduacaoDialogOpen(true); }}
          title={editingGraduacao ? 'Editar graduação' : 'Nova graduação'}
          description="As graduações podem ser alteradas sempre que necessário."
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={graduacaoForm.nome} onChange={(e) => setGraduacaoForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Ex.: Inspetor de 1ª classe" />
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input type="number" value={graduacaoForm.ordem} onChange={(e) => setGraduacaoForm((p) => ({ ...p, ordem: e.target.value }))} placeholder="0" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetGraduacaoDialog}>Cancelar</Button>
              <Button onClick={() => void handleSaveGraduacao()}>
                {editingGraduacao ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {editingGraduacao ? 'Salvar graduação' : 'Cadastrar graduação'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>

        {confirmDialog}
      </div>
    </AdminLayout>
  );
};

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof ClipboardList }) {
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

export default GuardasMunicipaisPage;
