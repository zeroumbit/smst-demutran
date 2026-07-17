import { useEffect, useMemo, useState } from 'react';
import { Building2, Eye, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { Setor } from '@/types/admin';

const initialForm = {
  nome: '',
  slug: '',
  descricao: '',
  ativo: true,
};

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const statusBadgeClasses = {
  ativo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  inativo: 'border-slate-200 bg-slate-100 text-slate-600',
};

const SetoresPage = () => {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Setor | null>(null);
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(true);

  const loadSetores = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('setores')
      .select('*')
      .order('nome');

    if (error) {
      toast({ title: 'Erro ao carregar setores', description: error.message, variant: 'destructive' });
    } else {
      setSetores(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSetores();
  }, []);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(initialForm);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: Setor) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      slug: item.slug,
      descricao: item.descricao || '',
      ativo: item.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setEditingItem(null);
    setFormData(initialForm);
    setIsDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim() || !formData.slug.trim()) {
      toast({ title: 'Campos obrigatorios', description: 'Informe nome e slug do setor.', variant: 'destructive' });
      return;
    }

    const payload = {
      nome: formData.nome.trim(),
      slug: slugify(formData.slug),
      descricao: formData.descricao.trim() || null,
      ativo: formData.ativo,
      updated_at: new Date().toISOString(),
    };

    const query = editingItem
      ? supabase.from('setores').update(payload).eq('id', editingItem.id)
      : supabase.from('setores').insert(payload);

    const { error } = await query;

    if (error) {
      toast({ title: 'Erro ao salvar setor', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: editingItem ? 'Setor atualizado' : 'Setor criado', description: 'As informacoes do setor foram salvas com sucesso.' });
    handleClose();
    loadSetores();
  };

  const handleToggleAtivo = async (item: Setor) => {
    const payload = {
      ativo: !item.ativo,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('setores').update(payload).eq('id', item.id);

    if (error) {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: item.ativo ? 'Setor desativado' : 'Setor ativado' });
    setSetores((current) =>
      current.map((currentItem) => (currentItem.id === item.id ? { ...currentItem, ...payload } : currentItem)),
    );
  };

  const filteredSetores = useMemo(() => {
    return setores.filter((setor) => {
      if (selectedStatus === 'ativos' && !setor.ativo) return false;
      if (selectedStatus === 'inativos' && setor.ativo) return false;
      return `${setor.nome} ${setor.slug} ${setor.descricao || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    });
  }, [setores, searchTerm, selectedStatus]);

  const activeFiltersCount = useMemo(() => {
    return selectedStatus !== 'todos' ? 1 : 0;
  }, [selectedStatus]);

  const columns = [
    {
      header: 'Nome',
      accessor: 'nome' as const,
      className: 'min-w-[200px]',
    },
    {
      header: 'Slug',
      accessor: 'slug' as const,
    },
    {
      header: 'Descricao',
      accessor: (item: Setor) => item.descricao || 'Sem descricao',
      className: 'max-w-md truncate',
    },
    {
      header: 'Status',
      accessor: (item: Setor) => (
        <Badge
          variant="outline"
          className={cn(
            'rounded-full px-3 py-1 text-xs font-bold',
            item.ativo ? statusBadgeClasses.ativo : statusBadgeClasses.inativo,
          )}
        >
          {item.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
  ];

  function renderMobileSetorCard(item: Setor) {
    return (
      <div
        key={item.id}
        className="rounded-[34px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-slate-900">{item.nome}</p>
            <p className="mt-0.5 text-[13px] leading-5 text-slate-500">
              {item.slug} &middot; {item.descricao || 'Sem descricao'}
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em]',
              item.ativo
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-500',
            )}
          >
            {item.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 flex-1 rounded-xl text-[13px] font-semibold text-slate-600"
            onClick={() => handleEdit(item)}
          >
            Editar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-9 flex-1 rounded-xl text-[13px] font-semibold',
              item.ativo ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50',
            )}
            onClick={() => handleToggleAtivo(item)}
          >
            {item.ativo ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-2xl bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#2563eb_100%)] md:rounded-[34px]">
          <div className="space-y-4 px-4 pb-4 pt-5 md:space-y-6 md:px-6 md:pb-5 md:pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-sky-100/70 md:text-[11px]">Administracao</p>
                <h1 className="mt-2 text-xl font-black tracking-[-0.05em] text-white sm:text-2xl md:mt-3 md:text-[32px] md:tracking-[-0.07em] lg:text-[38px]">Setores</h1>
                <p className="mt-1.5 hidden max-w-xl text-[13px] leading-5 text-white md:block md:mt-2 md:text-[14px] md:leading-6">
                  Cadastre, organize e ative os setores da plataforma.
                </p>
              </div>

              <div className="mt-3 hidden shrink-0 flex-row gap-2 sm:flex">
                <Button onClick={handleOpenCreate} className="gap-2 rounded-[18px] bg-white text-slate-900 hover:bg-slate-100">
                  <Plus className="h-4 w-4" />
                  Novo
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard title="Total" value={setores.length} subtitle="Setores cadastrados" icon={Building2} />
              <SummaryCard title="Ativos" value={setores.filter((s) => s.ativo).length} subtitle="Setores em operacao" icon={Eye} />
              <SummaryCard title="Inativos" value={setores.filter((s) => !s.ativo).length} subtitle="Setores desativados" icon={X} />
              <SummaryCard title="Slugs" value={new Set(setores.map((s) => s.slug)).size} subtitle="Slugs unicos" icon={Building2} />
            </div>

            <div className="flex gap-2 sm:hidden">
              <Button onClick={handleOpenCreate} className="h-12 flex-1 gap-2 rounded-[18px] bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                Novo
              </Button>
            </div>
          </div>
        </section>

        <div className={`lg:block ${filtrosAbertos ? 'block' : 'hidden'}`}>
          <div className="bg-white pb-2 lg:rounded-[30px] lg:border lg:border-slate-200/80 lg:px-5 lg:pt-4">
            <div className="rounded-[28px] bg-white lg:px-0">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-[18px] bg-slate-900 p-2.5 text-white">
                    <SlidersHorizontal className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Painel de filtros</p>
                    <p className="mt-1 text-[17px] font-bold tracking-[-0.03em] text-slate-950">Refine a operacao</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    {activeFiltersCount} ativo(s)
                  </div>
                  <button
                    onClick={() => setFiltrosAbertos(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/70 text-slate-500 transition-colors hover:bg-slate-300/80 lg:hidden"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Status</Label>
                  <select
                    className="flex h-12 w-full appearance-none rounded-[18px] border border-slate-200 bg-slate-50 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:20px] bg-[center_right_12px] px-4 pr-11 text-[15px] font-medium text-slate-900"
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value as 'todos' | 'ativos' | 'inativos')}
                  >
                    <option value="todos">Todos os status</option>
                    <option value="ativos">Somente ativos</option>
                    <option value="inativos">Somente inativos</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Busca</Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="h-12 w-full rounded-[18px] border-slate-200 bg-slate-50 pl-11 text-[15px] font-medium"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Nome, slug, descricao..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setFiltrosAbertos(true)}
          className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_8px_32px_-8px_rgba(15,23,42,0.45)] transition-all hover:bg-slate-800 active:scale-95 lg:hidden ${filtrosAbertos ? 'hidden' : ''}`}
        >
          <SlidersHorizontal className="h-6 w-6" />
        </button>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando setores...</div>
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {filteredSetores.map((item) => renderMobileSetorCard(item))}
              {filteredSetores.length === 0 && (
                <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
                  Nenhum setor cadastrado
                </div>
              )}
            </div>
            <div className="hidden overflow-hidden rounded-[22px] border border-border bg-card lg:block">
              <DataTable
                data={filteredSetores}
                columns={columns}
                onEdit={handleEdit}
                onToggleAtivo={handleToggleAtivo}
                emptyMessage="Nenhum setor cadastrado"
              />
            </div>
          </>
        )}

        <ResponsiveDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) handleClose();
          }}
          title={editingItem ? 'Editar setor' : 'Novo setor'}
          description="Defina a identificacao principal do setor."
          confirmLabel={editingItem ? 'Salvar' : 'Criar'}
          onCancel={handleClose}
          onConfirm={handleSubmit}
        >
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    nome: event.target.value,
                    slug: editingItem ? current.slug : slugify(event.target.value),
                  }))
                }
                placeholder="Ex.: DEMUTRAN"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    slug: slugify(event.target.value),
                  }))
                }
                placeholder="Ex.: demutran"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descricao</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    descricao: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Resumo sobre o setor"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) =>
                  setFormData((current) => ({ ...current, ativo: checked }))
                }
              />
              <Label htmlFor="ativo">Setor ativo</Label>
            </div>
          </div>
        </ResponsiveDialog>
      </div>
    </AdminLayout>
  );
};

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: typeof Building2;
}) {
  return (
    <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">{title}</p>
          <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{value}</p>
          <p className="mt-0.5 text-[13px] leading-5 text-white/70">{subtitle}</p>
        </div>
        <div className="shrink-0 rounded-[18px] bg-white/15 p-3 text-white backdrop-blur-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default SetoresPage;
