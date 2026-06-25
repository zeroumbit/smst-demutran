import { useEffect, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import type { AdminProfileRow, Setor } from '@/types/admin';

interface GestorRow {
  id: string;
  setorId: string;
  perfilId: string | null;
  userId: string | null;
  setor: string;
  nome: string;
  sobrenome: string;
  nomeCompleto: string;
  email: string;
  ativo: boolean;
  setorAtivo: boolean;
  hasGestor: boolean;
}

const initialForm = {
  firstName: '',
  lastName: '',
  password: '',
  setorId: '',
  email: '',
  active: true,
};

const GestoresPage = () => {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [gestores, setGestores] = useState<AdminProfileRow[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(initialForm);
  const [editingItem, setEditingItem] = useState<GestorRow | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const loadData = async () => {
    setLoading(true);

    const [{ data: setoresData, error: setoresError }, { data: perfisData, error: perfisError }] = await Promise.all([
      supabase.from('setores').select('*').order('nome'),
      supabase.rpc('get_admin_profiles'),
    ]);

    if (setoresError) {
      toast({
        title: 'Erro ao carregar setores',
        description: setoresError.message,
        variant: 'destructive',
      });
    } else {
      setSetores(setoresData || []);
    }

    if (perfisError) {
      toast({
        title: 'Erro ao carregar gestores',
        description: perfisError.message,
        variant: 'destructive',
      });
    } else {
      setGestores((perfisData || []).filter((item: AdminProfileRow) => item.papel === 'gestor'));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClose = () => {
    setFormData(initialForm);
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  const handleCreateForSetor = (setorId: string) => {
    setEditingItem(null);
    setFormData({
      firstName: '',
      lastName: '',
      password: '',
      setorId,
      email: '',
      active: true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.password.trim() || !formData.setorId || !formData.email.trim()) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Preencha nome, sobrenome, senha, setor e email do gestor.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingItem?.perfilId) {
        const { error } = await supabase
          .from('perfis_usuarios')
          .update({
            nome: formData.firstName.trim(),
            sobrenome: formData.lastName.trim(),
            ativo: formData.active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.perfilId);

        if (error) {
          throw error;
        }

        toast({
          title: 'Gestor atualizado',
          description: 'Os dados cadastrais do gestor foram atualizados.',
        });

        handleClose();
        loadData();
        return;
      }

      await provisionAdminUser({
        email: formData.email.trim(),
        password: formData.password.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        setorId: formData.setorId,
        papel: 'gestor',
        active: formData.active,
      });

      toast({
        title: 'Gestor criado',
        description: 'A conta no Supabase Auth e o perfil de gestor foram criados com sucesso.',
      });

      handleClose();
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar gestor',
        description: error.message || 'Nao foi possivel criar o gestor.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (item: GestorRow) => {
    if (!item.hasGestor) {
      return;
    }

    setEditingItem(item);
    setFormData({
      firstName: item.nome,
      lastName: item.sobrenome,
      password: '',
      setorId: item.setorId,
      email: item.email,
      active: item.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: GestorRow) => {
    if (!item.perfilId || !item.hasGestor) {
      return;
    }

    const confirmed = await confirm({ title: 'Remover gestor', description: `Remover o gestor do setor ${item.setor}?` });
    if (!confirmed) return;

    const { error } = await supabase.rpc('deactivate_profile', {
      _perfil_id: item.perfilId,
    });

    if (error) {
      toast({
        title: 'Erro ao remover gestor',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Gestor removido',
      description: 'O perfil do gestor foi desativado para este setor.',
    });

    loadData();
  };

  const handleToggleAtivo = async (item: GestorRow) => {
    if (!item.perfilId || !item.hasGestor) {
      return;
    }

    const confirmed = await confirm({
      title: item.ativo ? 'Desativar gestor' : 'Ativar gestor',
      description: item.ativo ? `Deseja desativar o gestor ${item.nome}?` : `Deseja ativar o gestor ${item.nome}?`,
    });
    if (!confirmed) return;

    const { error } = await supabase
      .from('perfis_usuarios')
      .update({
        ativo: !item.ativo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.perfilId);

    if (error) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Status atualizado',
      description: `O gestor foi ${item.ativo ? 'desativado' : 'ativado'} com sucesso.`,
    });

    loadData();
  };

  const gestoresPorSetor: GestorRow[] = setores.map((setor) => {
    const gestor = gestores.find((item) => item.setor_id === setor.id);

    return {
      id: setor.id,
      setorId: setor.id,
      perfilId: gestor?.perfil_id || null,
      userId: gestor?.user_id || null,
      setor: setor.nome,
      nome: gestor?.nome || '',
      sobrenome: gestor?.sobrenome || '',
      nomeCompleto: gestor?.nome_completo || 'Sem gestor',
      email: gestor?.email || 'Nao definido',
      ativo: gestor?.ativo ?? false,
      setorAtivo: setor.ativo,
      hasGestor: Boolean(gestor),
    };
  });

  const columns = [
    { header: 'Setor', accessor: 'setor' as const },
    { header: 'Gestor atual', accessor: 'nomeCompleto' as const },
    { header: 'Email', accessor: 'email' as const },
    {
      header: 'Status',
      accessor: (item: GestorRow) => item.hasGestor ? (item.ativo ? 'Ativo' : 'Inativo') : 'Sem gestor',
    },
    {
      header: 'Acoes',
      accessor: (item: GestorRow) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => (item.hasGestor ? handleEdit(item) : handleCreateForSetor(item.setorId))}
          >
            <Pencil className="h-4 w-4" />
            {item.hasGestor ? 'Editar' : 'Criar'}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!item.hasGestor}
            onClick={() => handleDelete(item)}
          >
            <Trash2 className="h-4 w-4" />
            Deletar
          </Button>

          <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5">
            <Switch
              checked={item.hasGestor ? item.ativo : false}
              disabled={!item.hasGestor}
              onCheckedChange={() => handleToggleAtivo(item)}
            />
            <span className="text-sm text-muted-foreground">Status</span>
          </div>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestores</h1>
            <p className="text-muted-foreground mt-1">
              Crie contas de gestores e vincule-as diretamente aos setores.
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Criar Gestor
          </Button>
        </div>

        {loading ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            Carregando gestores...
          </div>
        ) : (
          <DataTable
            data={gestoresPorSetor}
            columns={columns}
            emptyMessage="Nenhum setor cadastrado"
          />
        )}

        <ResponsiveDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={editingItem ? 'Editar gestor' : 'Criar gestor'}
          description={editingItem ? 'Atualize os dados e o status do gestor.' : 'A conta sera criada automaticamente no Supabase Auth.'}
          confirmLabel={editingItem ? 'Salvar alteracoes' : 'Criar gestor'}
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Sobrenome</Label>
                <Input
                  id="last-name"
                  value={formData.lastName}
                  onChange={(event) => setFormData((current) => ({ ...current, lastName: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
                  disabled={Boolean(editingItem)}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {editingItem && (
                <p className="text-xs text-muted-foreground">
                  A troca de senha do gestor sera tratada em fluxo proprio; aqui editamos apenas dados cadastrais e status.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={formData.setorId} onValueChange={(value) => setFormData((current) => ({ ...current, setorId: value }))} disabled={Boolean(editingItem)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um setor" />
                </SelectTrigger>
                <SelectContent>
                  {setores
                    .filter((setor) => setor.ativo)
                    .map((setor) => (
                      <SelectItem key={setor.id} value={setor.id}>
                        {setor.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gestor-email">Email do gestor</Label>
              <Input
                id="gestor-email"
                type="email"
                value={formData.email}
                onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                placeholder="usuario@caninde.ce.gov.br"
                disabled={Boolean(editingItem)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gestor-status">Status</Label>
              <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                <Switch
                  id="gestor-status"
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
      </div>
      {confirmDialog}
    </AdminLayout>
  );
};

export default GestoresPage;
