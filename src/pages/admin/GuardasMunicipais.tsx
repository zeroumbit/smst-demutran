import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Shield } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { GuardaMunicipal, GuardaMunicipalGraduacao } from '@/types/admin';

const guardaInitialForm = {
  matricula: '',
  nome: '',
  graduacao_id: '',
};

const graduacaoInitialForm = {
  nome: '',
  ordem: '0',
};

const GuardasMunicipaisPage = () => {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [guardas, setGuardas] = useState<GuardaMunicipal[]>([]);
  const [graduacoes, setGraduacoes] = useState<GuardaMunicipalGraduacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchGuardas, setSearchGuardas] = useState('');
  const [searchGraduacoes, setSearchGraduacoes] = useState('');
  const [guardaDialogOpen, setGuardaDialogOpen] = useState(false);
  const [graduacaoDialogOpen, setGraduacaoDialogOpen] = useState(false);
  const [guardaForm, setGuardaForm] = useState(guardaInitialForm);
  const [graduacaoForm, setGraduacaoForm] = useState(graduacaoInitialForm);
  const [editingGuarda, setEditingGuarda] = useState<GuardaMunicipal | null>(null);
  const [editingGraduacao, setEditingGraduacao] = useState<GuardaMunicipalGraduacao | null>(null);

  const loadData = async () => {
    setLoading(true);

    const [{ data: graduacoesData, error: graduacoesError }, { data: guardasData, error: guardasError }] =
      await Promise.all([
        supabase
          .from('guarda_municipal_graduacoes')
          .select('id, nome, ordem, ativo, created_at, updated_at')
          .order('ordem', { ascending: true })
          .order('nome', { ascending: true }),
        supabase
          .from('guardas_municipais')
          .select('id, matricula, nome, graduacao_id, ativo, created_at, updated_at')
          .order('nome', { ascending: true }),
      ]);

    if (graduacoesError || guardasError) {
      toast({
        title: 'Erro ao carregar guardas',
        description: graduacoesError?.message || guardasError?.message || 'Nao foi possivel carregar os dados.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const graduacoesList = (graduacoesData || []) as GuardaMunicipalGraduacao[];
    const graduacaoMap = new Map(graduacoesList.map((item) => [item.id, item.nome]));

    setGraduacoes(graduacoesList);
    setGuardas(
      ((guardasData || []) as GuardaMunicipal[]).map((item) => ({
        ...item,
        graduacao_nome: graduacaoMap.get(item.graduacao_id) ?? null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const guardasFiltrados = useMemo(() => {
    const termo = searchGuardas.trim().toLowerCase();
    return guardas.filter((item) => {
      if (!termo) return true;
      return `${item.matricula} ${item.nome} ${item.graduacao_nome || ''}`.toLowerCase().includes(termo);
    });
  }, [guardas, searchGuardas]);

  const graduacoesFiltradas = useMemo(() => {
    const termo = searchGraduacoes.trim().toLowerCase();
    return graduacoes.filter((item) => {
      if (!termo) return true;
      return `${item.nome} ${item.ordem}`.toLowerCase().includes(termo);
    });
  }, [graduacoes, searchGraduacoes]);

  const resetGuardaDialog = () => {
    setEditingGuarda(null);
    setGuardaForm(guardaInitialForm);
    setGuardaDialogOpen(false);
  };

  const resetGraduacaoDialog = () => {
    setEditingGraduacao(null);
    setGraduacaoForm(graduacaoInitialForm);
    setGraduacaoDialogOpen(false);
  };

  const openCreateGuardaDialog = () => {
    setEditingGuarda(null);
    setGuardaForm(guardaInitialForm);
    setGuardaDialogOpen(true);
  };

  const openEditGuardaDialog = (item: GuardaMunicipal) => {
    setEditingGuarda(item);
    setGuardaForm({
      matricula: item.matricula,
      nome: item.nome,
      graduacao_id: item.graduacao_id,
    });
    setGuardaDialogOpen(true);
  };

  const openCreateGraduacaoDialog = () => {
    setEditingGraduacao(null);
    setGraduacaoForm(graduacaoInitialForm);
    setGraduacaoDialogOpen(true);
  };

  const openEditGraduacaoDialog = (item: GuardaMunicipalGraduacao) => {
    setEditingGraduacao(item);
    setGraduacaoForm({
      nome: item.nome,
      ordem: String(item.ordem),
    });
    setGraduacaoDialogOpen(true);
  };

  const handleSaveGuarda = async () => {
    if (!guardaForm.matricula.trim() || !guardaForm.nome.trim() || !guardaForm.graduacao_id) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Preencha matricula, nome e graduacao.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      matricula: guardaForm.matricula.trim(),
      nome: guardaForm.nome.trim(),
      graduacao_id: guardaForm.graduacao_id,
    };

    const query = editingGuarda
      ? supabase.from('guardas_municipais').update(payload).eq('id', editingGuarda.id)
      : supabase.from('guardas_municipais').insert(payload);

    const { error } = await query;

    if (error) {
      toast({
        title: editingGuarda ? 'Erro ao atualizar guarda' : 'Erro ao cadastrar guarda',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: editingGuarda ? 'Guarda atualizado' : 'Guarda cadastrado',
      description: editingGuarda ? 'As informacoes foram atualizadas.' : 'O guarda foi cadastrado com sucesso.',
    });

    resetGuardaDialog();
    loadData();
  };

  const handleSaveGraduacao = async () => {
    if (!graduacaoForm.nome.trim()) {
      toast({
        title: 'Nome obrigatorio',
        description: 'Informe o nome da graduacao.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      nome: graduacaoForm.nome.trim(),
      ordem: Number.parseInt(graduacaoForm.ordem || '0', 10) || 0,
    };

    const query = editingGraduacao
      ? supabase.from('guarda_municipal_graduacoes').update(payload).eq('id', editingGraduacao.id)
      : supabase.from('guarda_municipal_graduacoes').insert(payload);

    const { error } = await query;

    if (error) {
      toast({
        title: editingGraduacao ? 'Erro ao atualizar graduacao' : 'Erro ao cadastrar graduacao',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: editingGraduacao ? 'Graduacao atualizada' : 'Graduacao cadastrada',
      description: editingGraduacao ? 'A graduacao foi atualizada.' : 'A graduacao foi adicionada com sucesso.',
    });

    resetGraduacaoDialog();
    loadData();
  };

  const handleDeleteGuarda = async (item: GuardaMunicipal) => {
    const confirmed = await confirm({
      title: 'Excluir guarda',
      description: `Deseja excluir o guarda ${item.nome}?`,
    });
    if (!confirmed) return;

    const { error } = await supabase.from('guardas_municipais').delete().eq('id', item.id);

    if (error) {
      toast({
        title: 'Erro ao excluir guarda',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Guarda excluido',
      description: 'O registro foi removido com sucesso.',
    });
    loadData();
  };

  const handleDeleteGraduacao = async (item: GuardaMunicipalGraduacao) => {
    const confirmed = await confirm({
      title: 'Excluir graduacao',
      description: `Deseja excluir a graduacao ${item.nome}?`,
    });
    if (!confirmed) return;

    const { error } = await supabase.from('guarda_municipal_graduacoes').delete().eq('id', item.id);

    if (error) {
      toast({
        title: 'Erro ao excluir graduacao',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Graduacao excluida',
      description: 'A graduacao foi removida com sucesso.',
    });
    loadData();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guardas Municipais</h1>
          <p className="text-muted-foreground">
            Gerencie os guardas cadastrados e mantenha as graduacoes atualizaveis pelo super admin.
          </p>
        </div>

        <Tabs defaultValue="guardas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="guardas">Guardas</TabsTrigger>
            <TabsTrigger value="graduacoes">Graduacoes</TabsTrigger>
          </TabsList>

          <TabsContent value="guardas" className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchGuardas}
                  onChange={(event) => setSearchGuardas(event.target.value)}
                  placeholder="Buscar por matricula, nome ou graduacao"
                  className="pl-9"
                />
              </div>
              <Button onClick={openCreateGuardaDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Novo guarda
              </Button>
            </div>

            <DataTable
              data={guardasFiltrados}
              columns={[
                { header: 'Matricula', accessor: 'matricula' },
                { header: 'Nome', accessor: 'nome' },
                { header: 'Graduacao', accessor: (item) => item.graduacao_nome || '-' },
              ]}
              onEdit={openEditGuardaDialog}
              onDelete={handleDeleteGuarda}
              emptyMessage={loading ? 'Carregando guardas...' : 'Nenhum guarda encontrado.'}
            />
          </TabsContent>

          <TabsContent value="graduacoes" className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchGraduacoes}
                  onChange={(event) => setSearchGraduacoes(event.target.value)}
                  placeholder="Buscar graduacao"
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={openCreateGraduacaoDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Nova graduacao
              </Button>
            </div>

            <DataTable
              data={graduacoesFiltradas}
              columns={[
                { header: 'Ordem', accessor: (item) => item.ordem },
                { header: 'Graduacao', accessor: 'nome' },
              ]}
              onEdit={openEditGraduacaoDialog}
              onDelete={handleDeleteGraduacao}
              emptyMessage={loading ? 'Carregando graduacoes...' : 'Nenhuma graduacao encontrada.'}
            />
          </TabsContent>
        </Tabs>

        <ResponsiveDialog
          open={guardaDialogOpen}
          onOpenChange={(open) => {
            if (!open) resetGuardaDialog();
            else setGuardaDialogOpen(true);
          }}
          title={editingGuarda ? 'Editar guarda' : 'Novo guarda'}
          description="Informe matricula, nome e graduacao do guarda municipal."
        >
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guarda-matricula">Matricula</Label>
                <Input
                  id="guarda-matricula"
                  value={guardaForm.matricula}
                  onChange={(event) => setGuardaForm((current) => ({ ...current, matricula: event.target.value }))}
                  placeholder="Ex.: 3180"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guarda-graduacao">Graduacao</Label>
                <Select
                  value={guardaForm.graduacao_id}
                  onValueChange={(value) => setGuardaForm((current) => ({ ...current, graduacao_id: value }))}
                >
                  <SelectTrigger id="guarda-graduacao">
                    <SelectValue placeholder="Selecione a graduacao" />
                  </SelectTrigger>
                  <SelectContent>
                    {graduacoes.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guarda-nome">Nome</Label>
              <Input
                id="guarda-nome"
                value={guardaForm.nome}
                onChange={(event) => setGuardaForm((current) => ({ ...current, nome: event.target.value }))}
                placeholder="Nome completo"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetGuardaDialog}>
                Cancelar
              </Button>
              <Button onClick={handleSaveGuarda}>
                <Shield className="mr-2 h-4 w-4" />
                {editingGuarda ? 'Salvar alteracoes' : 'Cadastrar guarda'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={graduacaoDialogOpen}
          onOpenChange={(open) => {
            if (!open) resetGraduacaoDialog();
            else setGraduacaoDialogOpen(true);
          }}
          title={editingGraduacao ? 'Editar graduacao' : 'Nova graduacao'}
          description="As graduacoes podem ser alteradas sempre que necessario."
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="graduacao-nome">Nome</Label>
              <Input
                id="graduacao-nome"
                value={graduacaoForm.nome}
                onChange={(event) => setGraduacaoForm((current) => ({ ...current, nome: event.target.value }))}
                placeholder="Ex.: Inspetor de 1a classe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="graduacao-ordem">Ordem</Label>
              <Input
                id="graduacao-ordem"
                type="number"
                value={graduacaoForm.ordem}
                onChange={(event) => setGraduacaoForm((current) => ({ ...current, ordem: event.target.value }))}
                placeholder="0"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetGraduacaoDialog}>
                Cancelar
              </Button>
              <Button onClick={handleSaveGraduacao}>
                {editingGraduacao ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {editingGraduacao ? 'Salvar graduacao' : 'Cadastrar graduacao'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>

        {confirmDialog}
      </div>
    </AdminLayout>
  );
};

export default GuardasMunicipaisPage;
