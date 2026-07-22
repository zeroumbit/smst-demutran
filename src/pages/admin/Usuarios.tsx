import { useEffect, useMemo, useState } from 'react';
import { Building2, Check, CheckCircle, Eye, EyeOff, GraduationCap, IdCard, Plus, Search, SlidersHorizontal, Users, X } from 'lucide-react';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { provisionAdminUser } from '@/lib/adminProvision';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { AdminProfileRow, GuardaMunicipalGraduacao, ModuloSistema, PapelUsuario, Setor } from '@/types/admin';
import { MODULOS_POR_SETOR } from '@/types/admin';

const papelOptions: Array<{ value: PapelUsuario; label: string }> = [
  { value: 'gestor', label: 'Gestor de Setor' },
  { value: 'tecnico', label: 'Administrativo' },
];

const papelFilterOptions: Array<{ value: PapelUsuario | 'todos'; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'gestor', label: 'Gestor de Setor' },
  { value: 'tecnico', label: 'Administrativo' },
];

const papelLabels: Record<PapelUsuario, string> = {
  super_admin: 'Super Admin',
  gestor: 'Gestor de Setor',
  admin_setor: 'Gestor de Setor',
  tecnico: 'Administrativo',
};

const papelBadgeVariant: Record<PapelUsuario, string> = {
  super_admin: 'bg-purple-100 text-purple-800 border-purple-200',
  gestor: 'bg-blue-100 text-blue-800 border-blue-200',
  admin_setor: 'bg-blue-100 text-blue-800 border-blue-200',
  tecnico: 'bg-slate-100 text-slate-800 border-slate-200',
};

const initialForm = {
  firstName: '',
  lastName: '',
  password: '',
  email: '',
  active: true,
  papel: 'tecnico' as PapelUsuario,
};

const UsuariosPage = () => {
  const { isSuperAdmin, setorId: currentSetorId, profile } = useAuth();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [graduacoes, setGraduacoes] = useState<GuardaMunicipalGraduacao[]>([]);
  const [usuarios, setUsuarios] = useState<AdminProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [createSetorId, setCreateSetorId] = useState('');
  const [filtroPapel, setFiltroPapel] = useState<string>('todos');
  const [filtroSetor, setFiltroSetor] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const [formData, setFormData] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedModulos, setSelectedModulos] = useState<ModuloSistema[]>([]);
  const [selectedGraduacaoId, setSelectedGraduacaoId] = useState('');
  const [editingItem, setEditingItem] = useState<AdminProfileRow | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editSobrenome, setEditSobrenome] = useState('');
  const [editPapel, setEditPapel] = useState<PapelUsuario>('admin_setor');
  const [editSetorId, setEditSetorId] = useState('');
  const [editModulos, setEditModulos] = useState<ModuloSistema[]>([]);
  const [editGraduacaoId, setEditGraduacaoId] = useState('');

  const loadSetores = async () => {
    const { data, error } = await supabase.rpc('get_manageable_setores');

    if (!error) {
      setSetores((data || []) as Setor[]);
    }
  };

  const loadGraduacoes = async () => {
    const { data } = await supabase
      .from('guarda_municipal_graduacoes')
      .select('id, nome, ordem, ativo')
      .eq('ativo', true)
      .order('ordem', { ascending: true });
    setGraduacoes((data || []) as GuardaMunicipalGraduacao[]);
  };

  const loadUsuarios = async (setorIdToLoad?: string) => {
    if (!isSuperAdmin && !setorIdToLoad) {
      setUsuarios([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = isSuperAdmin && !setorIdToLoad
      ? await supabase.rpc('get_admin_profiles')
      : await supabase.rpc('get_admin_profiles', {
          _setor_id: setorIdToLoad,
        });

    if (error) {
      console.warn('Erro ao carregar usuarios (mantendo lista anterior):', error.message);
    } else {
      setUsuarios((data || []) as AdminProfileRow[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadSetores();
    loadGraduacoes();
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      loadUsuarios();
      return;
    }

    if (currentSetorId) {
      loadUsuarios(currentSetorId);
    }
  }, [isSuperAdmin, currentSetorId]);

  const displayedUsuarios = useMemo(() => {
    const list = isSuperAdmin
      ? usuarios
      : usuarios.filter((item) => item.user_id !== profile?.user_id && item.papel !== 'super_admin');

    return list
      .filter((item) => {
        if (filtroPapel !== 'todos' && item.papel !== filtroPapel) return false;
        if (filtroSetor !== 'todos' && item.setor_id !== filtroSetor) return false;
        return true;
      })
      .filter((item) => {
        const searchStr = `${item.nome} ${item.sobrenome} ${item.email} ${item.setor_nome || ''}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
      })
      .map((item) => ({ ...item, id: item.perfil_id }));
  }, [usuarios, isSuperAdmin, profile?.user_id, filtroPapel, filtroSetor, searchTerm]);

  const handleClose = () => {
    setFormData(initialForm);
    setSelectedModulos([]);
    setSelectedGraduacaoId('');
    setIsDialogOpen(false);
  };

  const handleSubmit = async () => {
    const targetSetorId = isSuperAdmin ? createSetorId : currentSetorId;

    if (isSuperAdmin && !createSetorId) {
      toast({
        title: 'Selecione o setor',
        description: 'E necessario selecionar um setor para vincular o novo usuario.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.password.trim() || !formData.email.trim()) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Preencha nome, sobrenome, senha e email do usuario.',
        variant: 'destructive',
      });
      return;
    }

    if (!isSuperAdmin && selectedModulos.length === 0) {
      toast({
        title: 'Selecione os modulos',
        description: 'Defina ao menos um modulo de acesso para o usuario.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await provisionAdminUser({
        email: formData.email.trim(),
        password: formData.password.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        setorId: targetSetorId,
        papel: formData.papel,
        active: formData.active,
        modulos: isSuperAdmin ? undefined : selectedModulos,
        graduacaoId: selectedGraduacaoId || undefined,
      });

      toast({
        title: 'Usuario criado',
        description: 'A conta no Supabase Auth e o perfil administrativo foram criados com sucesso.',
      });

      handleClose();
      const refreshSetorId = isSuperAdmin ? undefined : targetSetorId;
      setTimeout(() => loadUsuarios(refreshSetorId), 300);
    } catch (error: any) {
      console.error('Erro ao criar usuario:', error);
      toast({
        title: 'Erro ao criar usuario',
        description: error?.message || error?.error || 'Nao foi possivel criar o usuario.',
        variant: 'destructive',
      });
    }
  };

  const handleDeactivate = async (item: AdminProfileRow) => {
    const confirmed = await confirm({ title: 'Desativar perfil', description: `Desativar o perfil de ${item.nome}?` });
    if (!confirmed) return;

    const { error } = await supabase.rpc('deactivate_profile', {
      _perfil_id: item.perfil_id,
    });

    if (error) {
      toast({ title: 'Erro ao desativar perfil', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Perfil desativado', description: 'O acesso administrativo foi removido.' });
    loadUsuarios(isSuperAdmin ? undefined : currentSetorId || undefined);
  };

  const handleActivate = async (item: AdminProfileRow) => {
    const confirmed = await confirm({ title: 'Ativar perfil', description: `Ativar o perfil de ${item.nome}?` });
    if (!confirmed) return;

    const { error } = await supabase.rpc('activate_profile', {
      _perfil_id: item.perfil_id,
    });

    if (error) {
      toast({ title: 'Erro ao ativar perfil', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Perfil ativado', description: 'O usuario agora tem acesso ao sistema.' });
    loadUsuarios(isSuperAdmin ? undefined : currentSetorId || undefined);
  };

  const handleToggleAtivo = async (item: AdminProfileRow) => {
    if (item.ativo) {
      await handleDeactivate(item);
    } else {
      await handleActivate(item);
    }
  };

  const handleEdit = (item: AdminProfileRow) => {
    setEditingItem(item);
    setEditNome(item.nome || '');
    setEditSobrenome(item.sobrenome || '');
    setEditPapel(item.papel);
    setEditSetorId(item.setor_id || '');
    setEditModulos((item.modulos as ModuloSistema[]) || []);
    setEditGraduacaoId(item.graduacao_id || '');
    setIsEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingItem) return;

    if (!editNome.trim() || !editSobrenome.trim()) {
      toast({ title: 'Campos obrigatorios', description: 'Preencha nome e sobrenome.', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase.rpc('update_profile', {
        _perfil_id: editingItem.perfil_id,
        _nome: editNome.trim(),
        _sobrenome: editSobrenome.trim(),
        _papel: editPapel,
        _setor_id: editSetorId || null,
        _graduacao_id: editGraduacaoId || null,
      });

      if (error) throw error;

      const { error: modulosError } = await supabase.rpc('update_profile_modulos', {
        _user_id: editingItem.user_id,
        _modulos: editModulos,
      });
      if (modulosError) throw modulosError;

      toast({ title: 'Perfil atualizado', description: 'Os dados do usuario foram alterados.' });

      setIsEditDialogOpen(false);
      setEditingItem(null);
      loadUsuarios(isSuperAdmin ? undefined : currentSetorId || undefined);
    } catch (error: any) {
      console.error('Erro ao editar perfil:', error);
      toast({ title: 'Erro ao editar perfil', description: error?.message || error?.error || 'Nao foi possivel editar o perfil.', variant: 'destructive' });
    }
  };

  const handleDelete = async (item: AdminProfileRow) => {
    const confirmed = await confirm({ title: 'Excluir perfil', description: `Tem certeza que deseja EXCLUIR permanentemente o perfil de ${item.nome}? Isso remove apenas o perfil administrativo, a conta no Auth continua existindo.` });
    if (!confirmed) return;

    const { error } = await supabase.rpc('delete_profile', {
      _perfil_id: item.perfil_id,
    });

    if (error) {
      toast({ title: 'Erro ao excluir perfil', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Perfil excluido', description: 'O perfil foi removido permanentemente.' });
    loadUsuarios(isSuperAdmin ? undefined : currentSetorId || undefined);
  };

  const columns = [
    { header: 'Nome', accessor: 'nome' as const },
    { header: 'Email', accessor: 'email' as const },
    {
      header: 'Papel',
      accessor: (item: AdminProfileRow) => (
        <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs font-bold', papelBadgeVariant[item.papel])}>
          {papelLabels[item.papel]}
        </Badge>
      ),
    },
    { header: 'Setor', accessor: (item: AdminProfileRow) => item.setor_nome || 'Sem setor' },
    {
      header: 'Graduação',
      accessor: (item: AdminProfileRow) => item.graduacao_nome ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-bold text-amber-700">
          <GraduationCap className="h-3 w-3" />
          {item.graduacao_nome}
        </span>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      ),
    },
    {
      header: 'Status',
      accessor: (item: AdminProfileRow) => (
        <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs font-bold', item.ativo ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-800 border-slate-200')}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
  ];

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filtroPapel !== 'todos') count++;
    if (filtroSetor !== 'todos') count++;
    return count;
  }, [filtroPapel, filtroSetor]);

  const canManageItem = (item: AdminProfileRow) =>
    isSuperAdmin || (currentSetorId !== null && item.setor_id === currentSetorId && item.papel !== 'super_admin' && item.papel !== 'gestor' && item.papel !== 'admin_setor');
  const canEditItem = canManageItem;
  const canDeleteItem = (item: AdminProfileRow) =>
    canManageItem(item) && item.user_id !== profile?.user_id;
  const canToggleAtivoItem = (item: AdminProfileRow) =>
    canManageItem(item) && item.papel !== 'super_admin';

  const totalUsuarios = usuarios.length;
  const ativosCount = usuarios.filter((u) => u.ativo).length;
  const inativosCount = totalUsuarios - ativosCount;
  const setoresCount = new Set(usuarios.map((u) => u.setor_id).filter(Boolean)).size;
  const createPapelOptions = useMemo(
    () => isSuperAdmin ? papelOptions : papelOptions.filter((o) => o.value !== 'gestor'),
    [isSuperAdmin],
  );

  const targetSetorSlug = useMemo(() => {
    const setorId = isSuperAdmin ? createSetorId : currentSetorId;
    return setores.find((s) => s.id === setorId)?.slug || '';
  }, [isSuperAdmin, createSetorId, currentSetorId, setores]);

  const availableModulos = useMemo(
    () => MODULOS_POR_SETOR[targetSetorSlug] || MODULOS_POR_SETOR['demutran'] || [],
    [targetSetorSlug],
  );

  function renderMobileCard(item: AdminProfileRow) {
    return (
      <div
        key={item.perfil_id}
        className="rounded-[34px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-slate-900">{item.nome} {item.sobrenome}</p>
            <p className="mt-0.5 text-[13px] leading-5 text-slate-500">
              {item.email}
            </p>
          </div>
          <Badge variant="outline" className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold', item.ativo ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-800 border-slate-200')}>
            {item.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Papel</p>
            <div className="mt-0.5 font-semibold text-slate-800">
              <Badge variant="outline" className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', papelBadgeVariant[item.papel])}>
                {papelLabels[item.papel]}
              </Badge>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Setor</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.setor_nome || 'Sem setor'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Graduação</p>
            <p className="mt-0.5 font-semibold text-slate-800">
              {item.graduacao_nome ? (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {item.graduacao_nome}
                </span>
              ) : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Status</p>
            <Badge variant="outline" className={cn('mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold', item.ativo ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-800 border-slate-200')}>
              {item.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          {canEditItem(item) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 flex-1 rounded-xl text-[13px] font-semibold text-slate-600"
              onClick={() => handleEdit(item)}
            >
              Editar
            </Button>
          )}
          {canToggleAtivoItem(item) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 flex-1 rounded-xl text-[13px] font-semibold text-slate-600"
              onClick={() => handleToggleAtivo(item)}
            >
              {item.ativo ? 'Desativar' : 'Ativar'}
            </Button>
          )}
          {canDeleteItem(item) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 flex-1 rounded-xl text-[13px] font-semibold text-red-600"
              onClick={() => handleDelete(item)}
            >
              Excluir
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#2563eb_100%)] md:rounded-[34px]">
          <div className="space-y-4 px-4 pb-4 pt-5 md:space-y-6 md:px-6 md:pb-5 md:pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-sky-100/70 md:text-[11px]">Administracao</p>
                <h1 className="mt-2 text-xl font-black tracking-[-0.05em] text-white sm:text-2xl md:mt-3 md:text-[32px] md:tracking-[-0.07em] lg:text-[38px]">Usuarios do Sistema</h1>
                <p className="mt-1.5 hidden max-w-xl text-[13px] leading-5 text-white md:block md:mt-2 md:text-[14px] md:leading-6">
                  Gerencie todos os usuarios administrativos: crie, edite, ative, desative ou exclua.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard title="Total" value={totalUsuarios} subtitle="Usuarios cadastrados" icon={Users} />
              <SummaryCard title="Ativos" value={ativosCount} subtitle="Contas ativas" icon={CheckCircle} />
              <SummaryCard title="Inativos" value={inativosCount} subtitle="Contas desativadas" icon={X} />
              <SummaryCard title="Setores" value={setoresCount} subtitle="Orgaos com usuarios" icon={Building2} />
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Papel</Label>
                  <select
                    className="flex h-12 w-full appearance-none rounded-[18px] border border-slate-200 bg-slate-50 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:20px] bg-[center_right_12px] px-4 pr-11 text-[15px] font-medium text-slate-900"
                    value={filtroPapel}
                    onChange={(event) => setFiltroPapel(event.target.value)}
                  >
                    <option value="todos">Todos os papeis</option>
                    {papelFilterOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Setor</Label>
                  <select
                    className="flex h-12 w-full appearance-none rounded-[18px] border border-slate-200 bg-slate-50 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:20px] bg-[center_right_12px] px-4 pr-11 text-[15px] font-medium text-slate-900"
                    value={filtroSetor}
                    onChange={(event) => setFiltroSetor(event.target.value)}
                  >
                    <option value="todos">Todos os setores</option>
                    {setores.map((setor) => (
                      <option key={setor.id} value={setor.id}>
                        {setor.nome}
                      </option>
                    ))}
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
                    placeholder="Nome, email ou setor..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setFiltrosAbertos(true)}
          className={`admin-floating-action fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_8px_32px_-8px_rgba(15,23,42,0.45)] transition-all hover:bg-slate-800 active:scale-95 lg:hidden ${filtrosAbertos ? 'hidden' : ''}`}
        >
          <SlidersHorizontal className="h-6 w-6" />
        </button>

        <div className="flex items-center justify-end gap-2">
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="gap-2"
            disabled={!isSuperAdmin && !currentSetorId}
          >
            <IdCard className="h-4 w-4" />
            Criar Usuario
          </Button>
        </div>

        {loading ? (
          <div className="rounded-[22px] border border-border bg-card p-8 text-center text-muted-foreground">
            Carregando usuarios...
          </div>
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {displayedUsuarios.map((item) => renderMobileCard(item))}
              {displayedUsuarios.length === 0 && (
                <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
                  Nenhum usuario encontrado
                </div>
              )}
            </div>
            <div className="hidden overflow-hidden rounded-[22px] border border-border bg-card lg:block">
              <DataTable<AdminProfileRow>
                data={displayedUsuarios}
                columns={columns}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleAtivo={handleToggleAtivo}
                canEdit={canEditItem}
                canDelete={canDeleteItem}
                canToggleAtivo={canToggleAtivoItem}
                emptyMessage={isSuperAdmin ? 'Nenhum usuario encontrado' : 'Nenhum usuario vinculado a este setor'}
              />
            </div>
          </>
        )}

        {displayedUsuarios.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Users className="h-4 w-4" />
              Gerenciamento de perfis
            </div>
            <p className="mt-2">
              {isSuperAdmin
                ? 'Super admins podem editar, ativar/desativar e excluir qualquer perfil do sistema.'
                : 'Gestores podem editar, ativar/desativar e excluir usuarios do proprio setor. Nao e possivel excluir a si mesmo ou alterar super admins.'}
            </p>
          </div>
        )}

        {/* Dialog de criacao */}
        <ResponsiveDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title="Criar usuario do setor"
          description="A conta sera criada automaticamente no Supabase Auth."
          confirmLabel="Criar usuario"
          onCancel={handleClose}
          onConfirm={handleSubmit}
        >
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first-name">Nome</Label>
                <Input
                  id="first-name"
                  value={formData.firstName}
                  onChange={(event) => setFormData((current) => ({ ...current, firstName: event.target.value }))}
                  placeholder="Nome do usuario"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Sobrenome</Label>
                <Input
                  id="last-name"
                  value={formData.lastName}
                  onChange={(event) => setFormData((current) => ({ ...current, lastName: event.target.value }))}
                  placeholder="Sobrenome do usuario"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="usuario-email">Email do usuario</Label>
              <Input
                id="usuario-email"
                type="email"
                value={formData.email}
                onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                placeholder="usuario@caninde.ce.gov.br"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
                  className="pr-10"
                  placeholder="Senha de acesso"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>Setor</Label>
                <Select value={createSetorId} onValueChange={setCreateSetorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {setores.map((setor) => (
                      <SelectItem key={setor.id} value={setor.id}>
                        {setor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Papel no sistema</Label>
              <Select value={formData.papel} onValueChange={(value) => setFormData((current) => ({ ...current, papel: value as PapelUsuario }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {createPapelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Graduação na Guarda (opcional)</Label>
              <p className="text-xs text-muted-foreground">Se vinculada, o usuário também poderá atuar como guarda municipal no módulo IRO.</p>
              <Select value={selectedGraduacaoId} onValueChange={(v) => setSelectedGraduacaoId(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma graduação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {graduacoes.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isSuperAdmin && (
              <div className="space-y-2">
                <Label>Modulos de acesso</Label>
                <div className="grid grid-cols-2 gap-2">
                  {availableModulos.map((modulo) => {
                    const isSelected = selectedModulos.includes(modulo.value);
                    return (
                      <button
                        key={modulo.value}
                        type="button"
                        onClick={() =>
                          setSelectedModulos((prev) =>
                            isSelected ? prev.filter((m) => m !== modulo.value) : [...prev, modulo.value],
                          )
                        }
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition-all',
                          isSelected
                            ? 'border-sky-300 bg-sky-50 text-sky-800 font-medium'
                            : 'border-border text-muted-foreground hover:border-sky-300 hover:bg-sky-50/50',
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all',
                            isSelected ? 'border-sky-600 bg-sky-600 text-white' : 'border-border',
                          )}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </div>
                        {modulo.label}
                      </button>
                    );
                  })}
                </div>
                {selectedModulos.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedModulos.length} modulo(s) selecionado(s)
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="usuario-status">Status</Label>
              <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                <Switch
                  id="usuario-status"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData((current) => ({ ...current, active: checked }))}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.active ? 'Conta ativa' : 'Conta inativa'}
                </span>
              </div>
            </div>
          </div>
        </ResponsiveDialog>

        {/* Dialog de edicao */}
        <ResponsiveDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => { if (!open) { setIsEditDialogOpen(false); setEditingItem(null); setEditModulos([]); } }}
          title="Editar usuario"
          description={editingItem ? `Alterar dados de ${editingItem.nome}` : ''}
          confirmLabel="Salvar"
          onCancel={() => { setIsEditDialogOpen(false); setEditingItem(null); setEditModulos([]); }}
          onConfirm={handleEditSave}
        >
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome</Label>
                <Input id="edit-nome" value={editNome} onChange={(e) => setEditNome(e.target.value)} placeholder="Nome do usuario" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sobrenome">Sobrenome</Label>
                <Input id="edit-sobrenome" value={editSobrenome} onChange={(e) => setEditSobrenome(e.target.value)} placeholder="Sobrenome do usuario" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={editPapel} onValueChange={(value) => setEditPapel(value as PapelUsuario)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {createPapelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Setor</Label>
              {isSuperAdmin ? (
                editPapel !== 'super_admin' ? (
                  <Select value={editSetorId} onValueChange={setEditSetorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {setores.map((setor) => (
                        <SelectItem key={setor.id} value={setor.id}>
                          {setor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
                    Super admin nao possui setor vinculado
                  </div>
                )
              ) : (
                <div className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground">
                  {setores.find((s) => s.id === currentSetorId)?.nome || 'Setor atual'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Graduação na Guarda (opcional)</Label>
              <p className="text-xs text-muted-foreground">Permite atuar como guarda municipal no módulo IRO.</p>
              <Select value={editGraduacaoId} onValueChange={(v) => setEditGraduacaoId(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma graduação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {graduacoes.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editPapel !== 'super_admin' && (
              <div className="space-y-2">
                <Label>Modulos de acesso</Label>
                <div className="grid grid-cols-2 gap-2">
                  {availableModulos.map((modulo) => {
                    const isSelected = editModulos.includes(modulo.value);
                    return (
                      <button
                        key={modulo.value}
                        type="button"
                        onClick={() =>
                          setEditModulos((prev) =>
                            isSelected ? prev.filter((m) => m !== modulo.value) : [...prev, modulo.value],
                          )
                        }
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition-all',
                          isSelected
                            ? 'border-sky-300 bg-sky-50 text-sky-800 font-medium'
                            : 'border-border text-muted-foreground hover:border-sky-300 hover:bg-sky-50/50',
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all',
                            isSelected ? 'border-sky-600 bg-sky-600 text-white' : 'border-border',
                          )}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </div>
                        {modulo.label}
                      </button>
                    );
                  })}
                </div>
                {editModulos.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {editModulos.length} modulo(s) selecionado(s)
                  </p>
                )}
              </div>
            )}
          </div>
        </ResponsiveDialog>
      </div>
      {confirmDialog}
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
  icon: typeof Users;
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

export default UsuariosPage;
