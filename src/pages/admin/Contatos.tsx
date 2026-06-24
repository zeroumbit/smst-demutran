import { useState, useEffect } from 'react';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Plus, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface Contato {
  id: string;
  titulo: string;
  descricao: string;
  telefone: string;
  email: string;
  endereco: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

const Contatos = () => {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Contato | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ titulo: '', descricao: '', telefone: '', email: '', endereco: '', ativo: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContatos = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('contatos') // Usando a tabela contatos para contatos úteis
          .select('*')
          .order('titulo', { ascending: true });

        if (fetchError) {
          console.error('Error fetching contatos:', fetchError.message);
          toast({
            title: 'Erro ao carregar contatos',
            description: fetchError.message,
            variant: 'destructive',
          });
        } else {
          setContatos(data || []);
        }
      } catch (err) {
        console.error('Error fetching contatos:', err);
        toast({
          title: 'Erro ao carregar contatos',
          description: 'Ocorreu um erro ao carregar os contatos',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchContatos();
  }, []);

  const handleSubmit = async () => {
    if (!formData.titulo) {
      toast({ title: 'Erro', description: 'Título é obrigatório', variant: 'destructive' });
      return;
    }

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('contatos')
          .update({
            titulo: formData.titulo,
            descricao: formData.descricao,
            telefone: formData.telefone,
            email: formData.email,
            endereco: formData.endereco,
            ativo: formData.ativo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id);

        if (error) {
          throw error;
        }

        toast({ title: 'Contato atualizado!' });
      } else {
        const { error } = await supabase
          .from('contatos')
          .insert([{
            titulo: formData.titulo,
            descricao: formData.descricao,
            telefone: formData.telefone,
            email: formData.email,
            endereco: formData.endereco,
            ativo: formData.ativo,
            created_at: new Date().toISOString(),
          }]);

        if (error) {
          throw error;
        }

        toast({ title: 'Contato adicionado!' });
      }

      // Reload contatos after successful submit
      const { data, error: reloadError } = await supabase
        .from('contatos')
        .select('*')
        .order('titulo', { ascending: true });

      if (reloadError) {
        console.error('Error reloading contatos:', reloadError.message);
      } else {
        setContatos(data || []);
      }
    } catch (err: any) {
      console.error('Error saving contato:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Ocorreu um erro ao salvar o contato',
        variant: 'destructive',
      });
      return;
    }

    handleCloseDialog();
  };

  const handleEdit = (item: Contato) => {
    setEditingItem(item);
    setFormData(item);
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: Contato) => {
    const confirmed = await confirm({ title: 'Excluir contato', description: 'Deseja excluir este contato?' });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('contatos')
        .delete()
        .eq('id', item.id);

      if (error) {
        throw error;
      }

      // Remove item from state
      setContatos(contatos.filter(c => c.id !== item.id));
      toast({ title: 'Contato excluído!' });
    } catch (err: any) {
      console.error('Error deleting contato:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Ocorreu um erro ao excluir o contato',
        variant: 'destructive',
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({ titulo: '', descricao: '', telefone: '', email: '', endereco: '', ativo: true });
  };

  const filteredContatos = contatos.filter((c) =>
    c.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { header: 'Título', accessor: 'titulo' as const },
    { header: 'Telefone', accessor: 'telefone' as const },
    { header: 'E-mail', accessor: 'email' as const },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Contatos Úteis</h1>
            <p className="text-muted-foreground mt-1">Gerencie a lista de contatos importantes</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Contato
          </Button>
        </div>

        <div className="max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar contatos..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10" 
            />
          </div>
        </div>

        <DataTable 
          data={filteredContatos} 
          columns={columns} 
          onEdit={handleEdit} 
          onDelete={handleDelete} 
          emptyMessage="Nenhum contato cadastrado" 
        />

        <ResponsiveDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={editingItem ? 'Editar Contato' : 'Novo Contato'}
          description="Preencha os dados do contato"
          onCancel={handleCloseDialog}
          onConfirm={handleSubmit}
          confirmLabel={editingItem ? 'Atualizar' : 'Adicionar'}
        >
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input 
                id="titulo" 
                value={formData.titulo} 
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} 
                placeholder="Ex: Guarda Municipal" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input 
                id="descricao" 
                value={formData.descricao} 
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input 
                  id="telefone" 
                  value={formData.telefone} 
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input 
                id="endereco" 
                value={formData.endereco} 
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} 
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="ativo" 
                checked={formData.ativo} 
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })} 
              />
              <Label htmlFor="ativo">Contato ativo</Label>
            </div>
          </div>
        </ResponsiveDialog>
      </div>
      {confirmDialog}
    </AdminLayout>
  );
};

export default Contatos;
