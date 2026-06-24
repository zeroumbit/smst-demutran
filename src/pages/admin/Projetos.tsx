import { useState, useEffect } from 'react';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Plus, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface Projeto {
  id: string;
  nome: string;
  descricao: string;
  objetivo: string;
  imagem?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

const Projetos = () => {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Projeto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ nome: '', descricao: '', objetivo: '', imagem: '', ativo: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjetos = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('projetos')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching projetos:', fetchError.message);
          toast({
            title: 'Erro ao carregar projetos',
            description: fetchError.message,
            variant: 'destructive',
          });
        } else {
          setProjetos(data || []);
        }
      } catch (err) {
        console.error('Error fetching projetos:', err);
        toast({
          title: 'Erro ao carregar projetos',
          description: 'Ocorreu um erro ao carregar os projetos',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProjetos();
  }, []);

  const handleSubmit = async () => {
    if (!formData.nome) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('projetos')
          .update({
            nome: formData.nome,
            descricao: formData.descricao,
            objetivo: formData.objetivo,
            imagem: formData.imagem || null,
            ativo: formData.ativo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id);

        if (error) {
          throw error;
        }

        toast({ title: 'Projeto atualizado!' });
      } else {
        const { error } = await supabase
          .from('projetos')
          .insert([{
            nome: formData.nome,
            descricao: formData.descricao,
            objetivo: formData.objetivo,
            imagem: formData.imagem || null,
            ativo: formData.ativo,
            created_at: new Date().toISOString(),
          }]);

        if (error) {
          throw error;
        }

        toast({ title: 'Projeto criado!' });
      }

      // Reload projetos after successful submit
      const { data, error: reloadError } = await supabase
        .from('projetos')
        .select('*')
        .order('created_at', { ascending: false });

      if (reloadError) {
        console.error('Error reloading projetos:', reloadError.message);
      } else {
        setProjetos(data || []);
      }
    } catch (err: any) {
      console.error('Error saving projeto:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Ocorreu um erro ao salvar o projeto',
        variant: 'destructive',
      });
      return;
    }

    handleCloseDialog();
  };

  const handleEdit = (item: Projeto) => {
    setEditingItem(item);
    setFormData({ ...item, imagem: item.imagem || '' });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: Projeto) => {
    const confirmed = await confirm({ title: 'Excluir projeto', description: 'Deseja excluir este projeto?' });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('projetos')
        .delete()
        .eq('id', item.id);

      if (error) {
        throw error;
      }

      // Remove item from state
      setProjetos(projetos.filter(p => p.id !== item.id));
      toast({ title: 'Projeto excluído!' });
    } catch (err: any) {
      console.error('Error deleting projeto:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Ocorreu um erro ao excluir o projeto',
        variant: 'destructive',
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({ nome: '', descricao: '', objetivo: '', imagem: '', ativo: true });
  };

  const filteredProjetos = projetos.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { header: 'Nome', accessor: 'nome' as const },
    { header: 'Descrição', accessor: 'descricao' as const, className: 'max-w-md truncate' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Projetos e Campanhas</h1>
            <p className="text-muted-foreground mt-1">Gerencie os projetos em andamento</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Projeto
          </Button>
        </div>

        <div className="max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar projetos..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10" 
            />
          </div>
        </div>

        <DataTable 
          data={filteredProjetos} 
          columns={columns} 
          onEdit={handleEdit} 
          onDelete={handleDelete} 
          emptyMessage="Nenhum projeto cadastrado" 
        />

        <ResponsiveDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={editingItem ? 'Editar Projeto' : 'Novo Projeto'}
          description="Preencha os dados do projeto"
          onCancel={handleCloseDialog}
          onConfirm={handleSubmit}
          confirmLabel={editingItem ? 'Atualizar' : 'Criar'}
        >
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input 
                id="nome" 
                value={formData.nome} 
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea 
                id="descricao" 
                value={formData.descricao} 
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} 
                rows={3} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="objetivo">Objetivo</Label>
              <Textarea 
                id="objetivo" 
                value={formData.objetivo} 
                onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })} 
                rows={3} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imagem">URL da Imagem</Label>
              <Input 
                id="imagem" 
                value={formData.imagem} 
                onChange={(e) => setFormData({ ...formData, imagem: e.target.value })} 
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="ativo" 
                checked={formData.ativo} 
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })} 
              />
              <Label htmlFor="ativo">Projeto ativo</Label>
            </div>
          </div>
        </ResponsiveDialog>
      </div>
      {confirmDialog}
    </AdminLayout>
  );
};

export default Projetos;
