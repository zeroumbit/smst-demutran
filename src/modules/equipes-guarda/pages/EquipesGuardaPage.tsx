import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, CheckCircle2, Edit, History, Plus, Search, Shield, UserMinus, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
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

  const [swapTarget, setSwapTarget] = useState<{ guardaId: string; guardaNome: string } | null>(null);
  const [swapTargetEquipeId, setSwapTargetEquipeId] = useState('');

  const selectedEquipe = useMemo(() => {
    if (!equipes.length) return null;
    return equipes.find((equipe) => equipe.id === selectedId) ?? equipes[0] ?? null;
  }, [equipes, selectedId]);

  const otherEquipes = useMemo(() => {
    if (!selectedEquipe) return [];
    return equipes.filter((eq) => eq.id !== selectedEquipe.id && eq.ativo);
  }, [equipes, selectedEquipe]);

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

  const [section, setSection] = useState<'geral' | 'equipes' | 'historico'>('equipes');

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

  const openSwapDialog = (guardaId: string, guardaNome: string) => {
    setSwapTargetEquipeId('');
    setSwapTarget({ guardaId, guardaNome });
  };

  const handleConfirmSwap = async () => {
    if (!swapTarget || !swapTargetEquipeId) return;
    try {
      const result = await mutations.addMembro.mutateAsync({
        equipeId: swapTargetEquipeId,
        guardaId: swapTarget.guardaId,
        transferir: true,
      });
      if (!result.sucesso) {
        toast.error(result.mensagem || 'Nao foi possivel trocar o guarda de equipe.');
        return;
      }
      toast.success(result.mensagem || 'Guarda trocado de equipe com sucesso.');
      setSwapTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel trocar o guarda de equipe.');
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
      <div className="space-y-6">
        <section className="rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)] px-4 py-5 text-white md:rounded-[34px] md:px-6 md:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-sky-100/70 md:text-[11px]">Guarda Municipal</p>
              <h1 className="mt-2 text-xl font-black tracking-[-0.05em] sm:text-2xl md:mt-3 md:text-[34px] md:tracking-[-0.08em]">Equipes</h1>
              <p className="mt-1.5 hidden max-w-2xl text-[13px] leading-5 text-slate-100 md:block md:mt-2 md:text-sm md:leading-6">
                Agrupe guardas municipais em equipes operacionais e mantenha a equipe ativa pronta para uso em escalas futuras.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={openCreate} className="h-9 gap-1.5 text-xs md:h-10 md:text-sm md:gap-2">
                <Plus className="h-4 w-4" />
                Nova equipe
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <StatCardEquipes label="Total de equipes" value={String(stats.total)} icon={Users} />
            <StatCardEquipes label="Ativas" value={String(stats.active)} icon={CheckCircle2} />
            <StatCardEquipes label="Inativas" value={String(stats.inactive)} icon={History} />
            <StatCardEquipes label="Integrantes ativos" value={String(stats.members)} icon={Shield} />
          </div>
        </section>

        {section === 'equipes' && (
          <Card className="rounded-[24px] border-slate-200">
            <CardContent className="px-5 py-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 transition focus-within:border-brand-500/50 focus-within:ring-2 focus-within:ring-brand-500/20">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar por nome ou responsável"
                    className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                  <SelectTrigger><SelectValue placeholder="Filtrar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativas">Ativas</SelectItem>
                    <SelectItem value="inativas">Inativas</SelectItem>
                    <SelectItem value="todas">Todas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-[26px] bg-slate-100/80 p-1.5">
            {(['geral', 'equipes', 'historico'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={cn(
                  'rounded-[20px] px-5 py-2.5 text-sm font-bold tracking-[-0.02em] transition-all',
                  section === key
                    ? 'bg-white text-slate-950 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)]'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {key === 'geral' ? 'Visão Geral' : key === 'equipes' ? 'Equipes' : 'Histórico'}
              </button>
            ))}
          </div>
        </div>

        {section === 'geral' && (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Resumo de Equipes</h3>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Ativas', value: stats.active, total: stats.total },
                  { label: 'Inativas', value: stats.inactive, total: stats.total },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="font-bold text-slate-900">{item.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-brand-600 transition-all"
                        style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Última Atividade</h3>
              <div className="mt-4 space-y-2">
                {historico.slice(0, 5).length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma atividade recente.</p>
                ) : (
                  historico.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      <p className="font-semibold text-slate-900">{item.acao.replaceAll('_', ' ')}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {section === 'equipes' && (
          <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Lista de equipes</h3>
                <Badge variant="outline" className="rounded-full">{filteredEquipes.length}</Badge>
              </div>
              <div className="mt-4 space-y-2">
                {isLoading ? (
                  <div className="py-10 text-center text-sm text-slate-500">Carregando equipes...</div>
                ) : filteredEquipes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Nenhuma equipe encontrada.</div>
                ) : (
                  filteredEquipes.map((equipe) => {
                    const selected = selectedEquipe?.id === equipe.id;
                    return (
                      <button
                        key={equipe.id}
                        onClick={() => setSelectedId(equipe.id)}
                        className={cn(
                          'w-full rounded-2xl border p-4 text-left transition-all',
                          selected
                            ? 'border-brand-200 bg-brand-50'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">{equipe.nome}</p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              Responsável: {equipe.responsavel?.nome ?? 'Não definido'}
                            </p>
                          </div>
                          <Badge className={equipe.ativo ? 'rounded-full bg-emerald-50 text-emerald-700' : 'rounded-full bg-slate-100 text-slate-600'}>
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
              </div>
            </div>

            {selectedEquipe ? (
              <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-black tracking-tight text-slate-950">{selectedEquipe.nome}</h2>
                      <Badge className={selectedEquipe.ativo ? 'rounded-full bg-emerald-50 text-emerald-700' : 'rounded-full bg-slate-100 text-slate-600'}>
                        {selectedEquipe.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{selectedEquipe.descricao || 'Sem descrição cadastrada.'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(selectedEquipe)} className="gap-2">
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleEquipeStatus(selectedEquipe)}>
                      {selectedEquipe.ativo ? 'Inativar' : 'Reativar'}
                    </Button>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <InfoEquipe label="Responsável" value={selectedEquipe.responsavel?.nome ?? 'Não definido'} />
                  <InfoEquipe label="Integrantes" value={String(selectedEquipe.total_membros ?? 0)} />
                  <InfoEquipe label="Atualizada em" value={formatDateTime(selectedEquipe.updated_at)} />
                </div>

                <section className="mt-6 space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Integrantes</h3>
                    <Button variant="outline" size="sm" onClick={() => setMemberOpen(true)} disabled={!selectedEquipe.ativo} className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Adicionar integrante
                    </Button>
                  </div>
                  {(selectedEquipe.membros ?? []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                      Nenhum integrante nesta equipe.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(selectedEquipe.membros ?? []).map((membro) => (
                        <div key={membro.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                              <Shield className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">{membro.guarda?.nome ?? 'Guarda não encontrado'}</p>
                              <p className="text-xs text-slate-500">
                                Matrícula {membro.guarda?.matricula ?? '-'} {membro.guarda?.graduacao_nome ? `- ${membro.guarda.graduacao_nome}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openSwapDialog(membro.guarda_id, membro.guarda?.nome ?? 'Guarda')} className="gap-2 text-slate-600 hover:bg-slate-50 hover:text-slate-700">
                              <ArrowLeftRight className="h-4 w-4" />
                              Trocar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(membro.guarda_id)} className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700">
                              <UserMinus className="h-4 w-4" />
                              Remover
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="mt-6 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Histórico recente</h3>
                  <div className="space-y-2">
                    {historico.slice(0, 6).length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Nenhum registro de histórico.</div>
                    ) : (
                      historico.slice(0, 6).map((item) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <p className="font-bold text-slate-900">{item.acao.replaceAll('_', ' ')}</p>
                            <p className="text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
                          </div>
                          {item.descricao && <p className="mt-1 text-sm text-slate-500">{item.descricao}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            ) : (
              <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="py-16 text-center text-sm text-slate-500">
                  Selecione ou crie uma equipe para visualizar os detalhes.
                </div>
              </div>
            )}
          </div>
        )}

        {section === 'historico' && (
          <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Histórico Completo</h3>
            <div className="mt-4 space-y-2">
              {historico.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Nenhum registro de histórico.</div>
              ) : (
                historico.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-bold text-slate-900">{item.acao.replaceAll('_', ' ')}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
                    </div>
                    {item.descricao && <p className="mt-1 text-sm text-slate-500">{item.descricao}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      <ResponsiveDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingEquipe ? 'Editar equipe' : 'Nova equipe'}
        description="Informe os dados basicos da equipe da Guarda Municipal."
        footer={(
          <div className="flex w-full gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button type="submit" form="equipe-form" disabled={mutations.createEquipe.isPending || mutations.updateEquipe.isPending}>
              Salvar
            </Button>
          </div>
        )}
      >
        <form id="equipe-form" onSubmit={handleSave} className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={form.nome} onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))} placeholder="Ex.: Equipe Alfa" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="descricao">Descricao</Label>
            <Textarea id="descricao" value={form.descricao ?? ''} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))} placeholder="Observacoes sobre emprego, area ou rotina da equipe" />
          </div>
          <div className="grid gap-2">
            <Label>Responsavel</Label>
            <Select value={form.responsavel_guarda_id ?? 'none'} onValueChange={(value) => setForm((current) => ({ ...current, responsavel_guarda_id: value === 'none' ? null : value }))}>
              <SelectTrigger><SelectValue placeholder="Selecione um guarda" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsavel</SelectItem>
                {guardas.map((guarda) => (<SelectItem key={guarda.id} value={guarda.id}>{guarda.nome} - {guarda.matricula}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <Label>Status ativo</Label>
              <p className="text-xs text-slate-500">Equipes inativas ficam fora das selecoes futuras.</p>
            </div>
            <Switch checked={form.ativo ?? true} onCheckedChange={(checked) => setForm((current) => ({ ...current, ativo: checked }))} />
          </div>
        </form>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={memberOpen}
        onOpenChange={setMemberOpen}
        title="Adicionar integrante"
        description="Busque por nome ou matricula e adicione manualmente a equipe selecionada."
      >
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 transition focus-within:border-brand-500/50 focus-within:ring-2 focus-within:ring-brand-500/20">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <Input value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="Buscar guarda" className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" />
          </div>
          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {memberOptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Nenhum guarda encontrado.</div>
            ) : (
              memberOptions.map((guarda) => {
                const alreadyHere = selectedMemberIds.has(guarda.id);
                return (
                  <div key={guarda.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{guarda.nome}</p>
                      <p className="text-xs text-slate-500">Matricula {guarda.matricula} {guarda.graduacao_nome ? `- ${guarda.graduacao_nome}` : ''}</p>
                    </div>
                    <Button size="sm" variant={alreadyHere ? 'outline' : 'default'} disabled={alreadyHere || mutations.addMembro.isPending} onClick={() => handleAddMember(guarda)} className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      {alreadyHere ? 'Ja integrante' : 'Adicionar'}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={Boolean(swapTarget)}
        onOpenChange={(open) => !open && setSwapTarget(null)}
        title="Trocar guarda de equipe"
        description={swapTarget ? `Selecione a equipe de destino para ${swapTarget.guardaNome}.` : ''}
        footer={(
          <div className="flex w-full gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setSwapTarget(null)}>Cancelar</Button>
            <Button onClick={handleConfirmSwap} disabled={!swapTargetEquipeId || mutations.addMembro.isPending}>Trocar</Button>
          </div>
        )}
      >
        <div className="space-y-4 py-2">
          <Select value={swapTargetEquipeId} onValueChange={setSwapTargetEquipeId}>
            <SelectTrigger><SelectValue placeholder="Selecione a equipe de destino" /></SelectTrigger>
            <SelectContent>
              {otherEquipes.length === 0 ? (
                <SelectItem value="none" disabled>Nenhuma equipe ativa disponivel</SelectItem>
              ) : (
                otherEquipes.map((eq) => (<SelectItem key={eq.id} value={eq.id}>{eq.nome}</SelectItem>))
              )}
            </SelectContent>
          </Select>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={Boolean(pendingTransfer)}
        onOpenChange={(open) => !open && setPendingTransfer(null)}
        title="Transferir integrante?"
        description={pendingTransfer ? `${pendingTransfer.guarda.nome} ja pertence a equipe ${pendingTransfer.result.equipe_atual_nome}. Ao confirmar, o vinculo anterior sera encerrado e o guarda entrara em ${pendingTransfer.equipe.nome}.` : ''}
        footer={(
          <div className="flex w-full gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setPendingTransfer(null)}>Cancelar</Button>
            <Button onClick={confirmTransfer}>Transferir</Button>
          </div>
        )}
      >
        <div className="py-2" />
      </ResponsiveDialog>
      </div>
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>;
}

function StatCardEquipes({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Shield }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">{label}</p>
        <p className="mt-0.5 text-2xl font-black tracking-tight text-white">{value}</p>
      </div>
    </div>
  );
}

function InfoEquipe({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
