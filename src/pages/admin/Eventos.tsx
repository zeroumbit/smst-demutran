import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Setor } from '@/types/admin';

interface Evento {
  id: string;
  titulo: string;
  descricao: string;
  local: string;
  data: string;
  horario: string;
  ativo: boolean;
  setor_id: string | null;
  created_at?: string;
  updated_at?: string;
}

const Eventos = ({ layout = true }: { layout?: boolean } = {}) => {
  const { isSuperAdmin, setorId } = useAuth();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [demutranSetorId, setDemutranSetorId] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Evento | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    local: '',
    data: '',
    horario: '',
    ativo: true,
  });
  const [loading, setLoading] = useState(true);

  const effectiveSetorId = demutranSetorId || setorId || '';

  const loadSetores = async () => {
    const { data } = await supabase.rpc('get_manageable_setores');
    const demutranOnly = ((data || []) as Setor[]).filter((setor) => setor.slug === 'demutran');
    if (demutranOnly[0]?.id) {
      setDemutranSetorId(demutranOnly[0].id);
    }
  };

  const loadEventos = async () => {
    setLoading(true);
    let query = supabase.from('eventos').select('*').order('data', { ascending: false });

    if (effectiveSetorId) {
      query = query.eq('setor_id', effectiveSetorId);
    }

    const { data, error } = await query;
    if (error) {
      toast({
        title: 'Erro ao carregar eventos',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setEventos((data || []) as Evento[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSetores();
  }, []);

  useEffect(() => {
    loadEventos();
  }, [effectiveSetorId, isSuperAdmin, setorId]);

  const handleSubmit = async () => {
    if (!formData.titulo || !formData.data) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatorios', variant: 'destructive' });
      return;
    }

    const payload = {
      titulo: formData.titulo,
      descricao: formData.descricao,
      local: formData.local,
      data: formData.data,
      horario: formData.horario || null,
      ativo: formData.ativo,
      setor_id: effectiveSetorId || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = editingItem
      ? await supabase.from('eventos').update(payload).eq('id', editingItem.id)
      : await supabase.from('eventos').insert([{ ...payload, created_at: new Date().toISOString() }]);

    if (error) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: editingItem ? 'Evento atualizado' : 'Evento criado' });
    handleCloseDialog();
    loadEventos();
  };

  const handleEdit = (item: Evento) => {
    setEditingItem(item);
    setFormData({
      titulo: item.titulo,
      descricao: item.descricao,
      local: item.local,
      data: item.data,
      horario: item.horario || '',
      ativo: item.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: Evento) => {
    const confirmed = await confirm({ title: 'Excluir evento', description: 'Deseja excluir este evento?' });
    if (!confirmed) return;

    const { error } = await supabase.from('eventos').delete().eq('id', item.id);

    if (error) {
      toast({
        title: 'Erro ao excluir evento',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setEventos((current) => current.filter((evento) => evento.id !== item.id));
    toast({ title: 'Evento excluido' });
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({ titulo: '', descricao: '', local: '', data: '', horario: '', ativo: true });
  };

  const filteredEventos = useMemo(() => {
    return eventos.filter((evento) =>
      evento.titulo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [eventos, searchTerm]);

  const columns = [
    { header: 'Titulo', accessor: 'titulo' as const },
    { header: 'Local', accessor: 'local' as const },
    { header: 'Data', accessor: (item: Evento) => new Date(item.data).toLocaleDateString('pt-BR') },
  ];

  const content = (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Eventos</h1>
          <p className="text-muted-foreground mt-1">Gerencie eventos globais ou vinculados a setores.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Evento
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>

      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          Carregando eventos...
        </div>
      ) : (
        <DataTable
          data={filteredEventos}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="Nenhum evento cadastrado"
        />
      )}

      <ResponsiveDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingItem ? 'Editar evento' : 'Novo evento'}
        description="Preencha os dados do evento"
        onCancel={handleCloseDialog}
        onConfirm={handleSubmit}
        confirmLabel={editingItem ? 'Atualizar' : 'Criar'}
      >
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="titulo">Titulo *</Label>
            <Input id="titulo" value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descricao</Label>
            <Textarea id="descricao" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="data">Data *</Label>
              <Input id="data" type="date" value={formData.data} onChange={(e) => setFormData({ ...formData, data: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horario">Horario</Label>
              <Input id="horario" type="time" value={formData.horario} onChange={(e) => setFormData({ ...formData, horario: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="local">Local</Label>
            <Input id="local" value={formData.local} onChange={(e) => setFormData({ ...formData, local: e.target.value })} />
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="ativo" checked={formData.ativo} onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })} />
            <Label htmlFor="ativo">Evento ativo</Label>
          </div>
        </div>
      </ResponsiveDialog>
      {confirmDialog}
    </div>
  );

  return layout ? <AdminLayout>{content}</AdminLayout> : content;
};

export default Eventos;
