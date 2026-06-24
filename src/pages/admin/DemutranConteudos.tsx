import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { uploadDemutranAnexo } from '@/lib/demutranUploads';
import { useAuth } from '@/contexts/AuthContext';
import type { DemutranMidia } from '@/types/admin';

const initialForm = {
  titulo: '',
  tipo: '' as '' | 'texto' | 'video',
  descricao: '',
  video_url: '',
};

const DemutranConteudos = ({ layout = true }: { layout?: boolean } = {}) => {
  const { confirm, confirmDialog } = useConfirmDialog();
  const { isSuperAdmin, setorId } = useAuth();
  const [items, setItems] = useState<DemutranMidia[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DemutranMidia | null>(null);
  const [formData, setFormData] = useState(initialForm);
  const [arquivoFile, setArquivoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    let query = supabase
      .from('demutran_midias')
      .select('*');

    if (!isSuperAdmin && setorId) {
      query = query.eq('setor_id', setorId);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      toast({ title: 'Erro ao carregar midias', description: error.message, variant: 'destructive' });
    } else {
      setItems((data || []) as DemutranMidia[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClose = () => {
    setEditingItem(null);
    setFormData(initialForm);
    setArquivoFile(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!formData.titulo.trim() || !formData.tipo || !formData.descricao.trim()) {
      toast({ title: 'Campos obrigatorios', description: 'Preencha titulo, tipo e descricao.', variant: 'destructive' });
      return;
    }

    if (formData.tipo === 'video' && !formData.video_url.trim()) {
      toast({ title: 'URL do video obrigatoria', description: 'Informe a URL do YouTube para midias do tipo video.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      let arquivoUrl = editingItem?.arquivo_url || null;

      if (arquivoFile) {
        arquivoUrl = await uploadDemutranAnexo(arquivoFile, 'midias');
      }

      const payload: Record<string, any> = {
        titulo: formData.titulo.trim(),
        tipo: formData.tipo,
        descricao: formData.descricao.trim(),
        arquivo_url: formData.tipo === 'texto' ? arquivoUrl : null,
        video_url: formData.tipo === 'video' ? formData.video_url.trim() : null,
        updated_at: new Date().toISOString(),
      };

      if (!editingItem) {
        payload.created_at = new Date().toISOString();
      }

      const { error } = editingItem
        ? await supabase.from('demutran_midias').update(payload).eq('id', editingItem.id)
        : await supabase.from('demutran_midias').insert([payload]);

      if (error) throw error;

      toast({ title: editingItem ? 'Midia atualizada' : 'Midia cadastrada' });
      handleClose();
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar midia', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: DemutranMidia) => {
    setEditingItem(item);
    setFormData({
      titulo: item.titulo,
      tipo: item.tipo,
      descricao: item.descricao,
      video_url: item.video_url || '',
    });
    setArquivoFile(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: DemutranMidia) => {
    const confirmed = await confirm({ title: 'Excluir mídia', description: `Excluir a mídia "${item.titulo}"?` });
    if (!confirmed) return;

    const { error } = await supabase.from('demutran_midias').delete().eq('id', item.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Midia excluida' });
    setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      `${item.titulo} ${item.descricao} ${item.tipo}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const columns = [
    { header: 'Titulo', accessor: 'titulo' as const },
    { header: 'Tipo', accessor: (item: DemutranMidia) => (item.tipo === 'video' ? 'Video' : 'Texto') },
    { header: 'Descricao', accessor: (item: DemutranMidia) => item.descricao.slice(0, 80) + (item.descricao.length > 80 ? '...' : '') },
    { header: 'Criado em', accessor: (item: DemutranMidia) => new Date(item.created_at).toLocaleDateString('pt-BR') },
  ];

  const content = (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Conteudos DEMUTRAN</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gerencie as midias exibidas na pagina publica do DEMUTRAN.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Nova Midia
        </Button>
      </div>

      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-3 border-b border-border shadow-sm mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10 h-10 text-base md:text-sm" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por titulo, tipo ou descricao" />
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">Carregando midias...</div>
      ) : (
        <DataTable data={filteredItems} columns={columns} onEdit={handleEdit} onDelete={handleDelete} emptyMessage="Nenhuma midia cadastrada" />
      )}

      <ResponsiveDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingItem ? 'Editar midia' : 'Nova midia'}
        description="Preencha os dados da midia para exibicao publica."
        onCancel={handleClose}
        onConfirm={handleSubmit}
        confirmLabel={editingItem ? 'Salvar alteracoes' : 'Cadastrar'}
        confirmLoading={saving}
      >
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="titulo">Titulo *</Label>
            <Input id="titulo" value={formData.titulo} onChange={(event) => setFormData((current) => ({ ...current, titulo: event.target.value }))} placeholder="Titulo da midia" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo *</Label>
            <Select
              value={formData.tipo}
              onValueChange={(value) => setFormData((current) => ({ ...current, tipo: value as 'texto' | 'video' }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="texto">Texto</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descricao *</Label>
            <Textarea id="descricao" rows={4} value={formData.descricao} onChange={(event) => setFormData((current) => ({ ...current, descricao: event.target.value }))} placeholder="Descricao do conteudo" />
          </div>

          {formData.tipo === 'texto' && (
            <div className="space-y-2">
              <Label htmlFor="arquivo">Arquivo (PDF) — opcional</Label>
              <Input
                id="arquivo"
                type="file"
                accept=".pdf"
                onChange={(event) => setArquivoFile(event.target.files?.[0] || null)}
              />
              {editingItem?.arquivo_url && (
                <p className="text-xs text-muted-foreground">Arquivo atual: {editingItem.arquivo_url.split('/').pop()}</p>
              )}
            </div>
          )}

          {formData.tipo === 'video' && (
            <div className="space-y-2">
              <Label htmlFor="video_url">URL do YouTube *</Label>
              <Input
                id="video_url"
                value={formData.video_url}
                onChange={(event) => setFormData((current) => ({ ...current, video_url: event.target.value }))}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          )}
        </div>
      </ResponsiveDialog>
      {confirmDialog}
    </div>
  );

  return layout ? <AdminLayout>{content}</AdminLayout> : content;
};

export default DemutranConteudos;
