import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit, Plus, Search, Shield, UserMinus, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useEquipeHistorico,
  useEquipesGuarda,
  useEquipesGuardaMutations,
  useGuardasParaEquipe,
} from '../hooks/useEquipesGuarda';
import type { GuardaEquipe, GuardaEquipeAddResult, GuardaEquipeGuarda, GuardaEquipePayload } from '../types/equipes-guarda.types';

type StatusFilter = 'ativas' | 'inativas' | 'todas';

const emptyForm: GuardaEquipePayload = {
  nome: '',
  descricao: '',
  responsavel_guarda_id: null,
  ativo: true,
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export default function EquipesGuardaPage() {
  const { data: equipes = [], isLoading } = useEquipesGuarda();
  const { data: guardas = [] } = useGuardasParaEquipe();
  const mutations = useEquipesGuardaMutations();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ativas');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [editingEquipe, setEditingEquipe] = useState<GuardaEquipe | null>(null);
  const [form, setForm] = useState<GuardaEquipePayload>(emptyForm);
  const [memberQuery, setMemberQuery] = useState('');
  const [pendingTransfer, setPendingTransfer] = useState<{
    equipe: GuardaEquipe;
    guarda: GuardaEquipeGuarda;
    result: GuardaEquipeAddResult;
  } | null>(null);

  const selectedEquipe = useMemo(() => {
    if (!equipes.length) return null;
    return equipes.find((equipe) => equipe.id === selectedId) ?? equipes[0] ?? null;
  }, [equipes, selectedId]);

  const { data: historico = [] } = useEquipeHistorico(selectedEquipe?.id);

  useEffect(() => {
    if (!selectedId && equipes[0]) setSelectedId(equipes[0].id);
    if (selectedId && equipes.length && !equipes.some((equipe) => equipe.id === selectedId)) {
      setSelectedId(equipes[0].id);
    }
  }, [equipes, selectedId]);

  const stats = useMemo(() => {
    const active = equipes.filter((equipe) => equipe.ativo);
    const members = active.reduce((sum, equipe) => sum + (equipe.total_membros ?? 0), 0);
    return {
      total: equipes.length,
      active: active.length,
      inactive: equipes.length - active.length,
      members,
    };
  }, [equipes]);

  const filteredEquipes = useMemo(() => {
    const term = normalize(query.trim());
    return equipes.filter((equipe) => {
      const matchesStatus =
        statusFilter === 'todas' ||
        (statusFilter === 'ativas' && equipe.ativo) ||
        (statusFilter === 'inativas' && !equipe.ativo);
      const searchable = normalize(`${equipe.nome} ${equipe.descricao ?? ''} ${equipe.responsavel?.nome ?? ''}`);
      return matchesStatus && (!term || searchable.includes(term));
    });
  }, [equipes, query, statusFilter]);

  const selectedMemberIds = useMemo(
    () => new Set((selectedEquipe?.membros ?? []).map((membro) => membro.guarda_id)),
    [selectedEquipe],
  );

  const memberOptions = useMemo(() => {
    const term = normalize(memberQuery.trim());
    return guardas
      .filter((guarda) => {
        const searchable = normalize(`${guarda.nome} ${guarda.matricula} ${guarda.graduacao_nome ?? ''}`);
        return !term || searchable.includes(term);
      })
      .slice(0, 80);
  }, [guardas, memberQuery]);

  const openCreate = () => {
    setEditingEquipe(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (equipe: GuardaEquipe) => {
    setEditingEquipe(equipe);
    setForm({
      nome: equipe.nome,
      descricao: equipe.descricao ?? '',
      responsavel_guarda_id: equipe.responsavel_guarda_id,
      ativo: equipe.ativo,
    });
    setFormOpen(true);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.nome.trim()) {
      toast.error('Informe o nome da equipe.');
      return;
    }

    try {
      if (editingEquipe) {
        await mutations.updateEquipe.mutateAsync({ id: editingEquipe.id, payload: form });
        toast.success('Equipe atualizada.');
      } else {
        const created = await mutations.createEquipe.mutateAsync(form);
        setSelectedId(created.id);
        toast.success('Equipe criada.');
      }
      setFormOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel salvar a equipe.');
    }
  };

  const handleAddMember = async (guarda: GuardaEquipeGuarda, transferir = false) => {
    if (!selectedEquipe) return;
    try {
      const result = await mutations.addMembro.mutateAsync({
        equipeId: selectedEquipe.id,
        guardaId: guarda.id,
        transferir,
      });

      if (!result.sucesso && result.codigo === 'JA_PERTENCE_A_EQUIPE') {
        setPendingTransfer({ equipe: selectedEquipe, guarda, result });
        return;
      }

      if (!result.sucesso) {
        toast.error(result.mensagem || 'Nao foi possivel adicionar o integrante.');
        return;
      }

      toast.success(result.mensagem || 'Integrante adicionado.');
      setMemberOpen(false);
      setPendingTransfer(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel adicionar o integrante.');
    }
  };

  const handleRemoveMember = async (guardaId: string) => {
    if (!selectedEquipe) return;
    try {
      const result = await mutations.removeMembro.mutateAsync({ equipeId: selectedEquipe.id, guardaId });
      if (!result.sucesso) {
        toast.error(result.mensagem || 'Nao foi possivel remover o integrante.');
        return;
      }
      toast.success(result.mensagem || 'Integrante removido.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel remover o integrante.');
    }
  };

  const confirmTransfer = async () => {
    if (!pendingTransfer) return;
    await handleAddMember(pendingTransfer.guarda, true);
  };

  const toggleEquipeStatus = async (equipe: GuardaEquipe) => {
    try {
      await mutations.updateEquipe.mutateAsync({
        id: equipe.id,
        payload: {
          nome: equipe.nome,
          descricao: equipe.descricao,
          responsavel_guarda_id: equipe.responsavel_guarda_id,
          ativo: !equipe.ativo,
        },
      });
      toast.success(!equipe.ativo ? 'Equipe reativada.' : 'Equipe inativada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel alterar o status.');
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-600">Guarda Municipal</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Equipes</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Agrupe guardas municipais em equipes operacionais e mantenha a equipe ativa pronta para uso em escalas futuras.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            Nova equipe
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-lg border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ativas</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.active}</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Inativas</p>
              <p className="mt-2 text-2xl font-bold text-slate-700">{stats.inactive}</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Integrantes ativos</p>
              <p className="mt-2 text-2xl font-bold text-brand-700">{stats.members}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="rounded-lg border-slate-200">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg">Lista de equipes</CardTitle>
                <Badge variant="outline" className="rounded-full">{filteredEquipes.length}</Badge>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar por nome ou responsavel"
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                  <SelectTrigger className="sm:w-44 xl:w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativas">Ativas</SelectItem>
                    <SelectItem value="inativas">Inativas</SelectItem>
                    <SelectItem value="todas">Todas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <div className="py-10 text-center text-sm text-slate-500">Carregando equipes...</div>
              ) : filteredEquipes.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">Nenhuma equipe encontrada.</div>
              ) : (
                filteredEquipes.map((equipe) => {
                  const selected = selectedEquipe?.id === equipe.id;
                  return (
                    <button
                      key={equipe.id}
                      onClick={() => setSelectedId(equipe.id)}
                      className={`w-full rounded-lg border p-4 text-left transition-colors ${
                        selected
                          ? 'border-brand-200 bg-brand-50'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{equipe.nome}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            Responsavel: {equipe.responsavel?.nome ?? 'Nao definido'}
                          </p>
                        </div>
                        <Badge className={equipe.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                          {equipe.ativo ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                        <Users className="h-4 w-4" />
                        {equipe.total_membros ?? 0} integrantes
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200">
            {selectedEquipe ? (
              <>
                <CardHeader className="gap-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-2xl">{selectedEquipe.nome}</CardTitle>
                        <Badge className={selectedEquipe.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                          {selectedEquipe.ativo ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{selectedEquipe.descricao || 'Sem descricao cadastrada.'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => openEdit(selectedEquipe)} className="gap-2 rounded-xl">
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => toggleEquipeStatus(selectedEquipe)}
                        className="rounded-xl"
                      >
                        {selectedEquipe.ativo ? 'Inativar' : 'Reativar'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Responsavel</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{selectedEquipe.responsavel?.nome ?? 'Nao definido'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Integrantes</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{selectedEquipe.total_membros ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Atualizada em</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(selectedEquipe.updated_at)}</p>
                    </div>
                  </div>

                  <section className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="text-lg font-bold text-slate-900">Integrantes</h2>
                      <Button
                        variant="outline"
                        onClick={() => setMemberOpen(true)}
                        disabled={!selectedEquipe.ativo}
                        className="gap-2 rounded-xl"
                      >
                        <UserPlus className="h-4 w-4" />
                        Adicionar integrante
                      </Button>
                    </div>

                    {(selectedEquipe.membros ?? []).length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                        Nenhum integrante nesta equipe.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                        {(selectedEquipe.membros ?? []).map((membro) => (
                          <div key={membro.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                                <Shield className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">{membro.guarda?.nome ?? 'Guarda nao encontrado'}</p>
                                <p className="text-xs text-slate-500">
                                  Matricula {membro.guarda?.matricula ?? '-'} {membro.guarda?.graduacao_nome ? `- ${membro.guarda.graduacao_nome}` : ''}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(membro.guarda_id)}
                              className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <UserMinus className="h-4 w-4" />
                              Remover
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-lg font-bold text-slate-900">Historico recente</h2>
                    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {historico.slice(0, 6).length === 0 ? (
                        <div className="p-4 text-sm text-slate-500">Nenhum registro de historico.</div>
                      ) : (
                        historico.slice(0, 6).map((item) => (
                          <div key={item.id} className="p-4">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-sm font-semibold text-slate-900">{item.acao.replaceAll('_', ' ')}</p>
                              <p className="text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
                            </div>
                            {item.descricao && <p className="mt-1 text-sm text-slate-500">{item.descricao}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </CardContent>
              </>
            ) : (
              <CardContent className="py-20 text-center text-sm text-slate-500">
                Selecione ou crie uma equipe para visualizar os detalhes.
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEquipe ? 'Editar equipe' : 'Nova equipe'}</DialogTitle>
            <DialogDescription>Informe os dados basicos da equipe da Guarda Municipal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                placeholder="Ex.: Equipe Alfa"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descricao</Label>
              <Textarea
                id="descricao"
                value={form.descricao ?? ''}
                onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
                placeholder="Observacoes sobre emprego, area ou rotina da equipe"
              />
            </div>
            <div className="grid gap-2">
              <Label>Responsavel</Label>
              <Select
                value={form.responsavel_guarda_id ?? 'none'}
                onValueChange={(value) => setForm((current) => ({ ...current, responsavel_guarda_id: value === 'none' ? null : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um guarda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsavel</SelectItem>
                  {guardas.map((guarda) => (
                    <SelectItem key={guarda.id} value={guarda.id}>
                      {guarda.nome} - {guarda.matricula}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <div>
                <Label>Status ativo</Label>
                <p className="text-xs text-slate-500">Equipes inativas ficam fora das selecoes futuras.</p>
              </div>
              <Switch
                checked={form.ativo ?? true}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, ativo: checked }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={mutations.createEquipe.isPending || mutations.updateEquipe.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar integrante</DialogTitle>
            <DialogDescription>Busque por nome ou matricula e adicione manualmente a equipe selecionada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={memberQuery}
                onChange={(event) => setMemberQuery(event.target.value)}
                placeholder="Buscar guarda"
                className="pl-9"
              />
            </div>
            <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
              {memberOptions.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">Nenhum guarda encontrado.</div>
              ) : (
                memberOptions.map((guarda) => {
                  const alreadyHere = selectedMemberIds.has(guarda.id);
                  return (
                    <div key={guarda.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{guarda.nome}</p>
                        <p className="text-xs text-slate-500">
                          Matricula {guarda.matricula} {guarda.graduacao_nome ? `- ${guarda.graduacao_nome}` : ''}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyHere ? 'outline' : 'default'}
                        disabled={alreadyHere || mutations.addMembro.isPending}
                        onClick={() => handleAddMember(guarda)}
                        className="gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        {alreadyHere ? 'Ja integrante' : 'Adicionar'}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingTransfer)} onOpenChange={(open) => !open && setPendingTransfer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transferir integrante?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingTransfer?.guarda.nome} ja pertence a equipe {pendingTransfer?.result.equipe_atual_nome}. Ao confirmar, o vinculo anterior sera encerrado e o guarda entrara em {pendingTransfer?.equipe.nome}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTransfer}>Transferir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
