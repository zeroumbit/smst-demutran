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
import { IMAGE_UPLOAD_RULES, sanitizeFileName, validateFileUpload } from '@/lib/upload';
import { useAuth } from '@/contexts/AuthContext';
import { ImageUpload } from '@/components/ui/image-upload';
import type { Setor } from '@/types/admin';

const extractStoragePath = (publicUrl: string): string | null => {
  const match = publicUrl.match(/\/public\/imagens\/(.+)$/);
  return match ? match[1] : null;
};

interface Noticia {
  id: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  imagem?: string | null;
  ativo: boolean;
  data: string;
  setor_id: string | null;
  created_at?: string;
  updated_at?: string;
}

const Noticias = ({ layout = true }: { layout?: boolean } = {}) => {
  const { isSuperAdmin, setorId } = useAuth();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [demutranSetorId, setDemutranSetorId] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Noticia | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    titulo: '',
    resumo: '',
    conteudo: '',
    imagem: '',
    ativo: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);

  const effectiveSetorId = demutranSetorId || setorId || '';

  const loadSetores = async () => {
    const { data, error } = await supabase.rpc('get_manageable_setores');
    if (!error) {
      const demutranOnly = ((data || []) as Setor[]).filter((setor) => setor.slug === 'demutran');
      if (demutranOnly[0]?.id) {
        setDemutranSetorId(demutranOnly[0].id);
      }
    }
  };

  const loadNoticias = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('noticias')
        .select('*')
        .order('created_at', { ascending: false });

      if (effectiveSetorId) {
        query = query.eq('setor_id', effectiveSetorId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        toast({
          title: 'Erro ao carregar noticias',
          description: fetchError.message,
          variant: 'destructive',
        });
      } else {
        setNoticias((data || []) as Noticia[]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSetores();
  }, []);

  useEffect(() => {
    loadNoticias();
  }, [effectiveSetorId, isSuperAdmin, setorId]);

  const handleSubmit = async () => {
    if (!formData.titulo || !formData.resumo || !formData.conteudo) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatorios',
        variant: 'destructive',
      });
      return;
    }

    let uploadedPath: string | null = null;
    const oldImageUrl = editingItem?.imagem || null;

    try {
      let imageUrl = formData.imagem;

      if (imageFile) {
        validateFileUpload(imageFile, IMAGE_UPLOAD_RULES);
        const fileName = sanitizeFileName(imageFile.name);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('imagens')
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        uploadedPath = uploadData.path;

        const { data: { publicUrl } } = supabase.storage
          .from('imagens')
          .getPublicUrl(uploadData.path);

        imageUrl = publicUrl;
      }

      const payload = {
        titulo: formData.titulo,
        resumo: formData.resumo,
        conteudo: formData.conteudo,
        imagem: imageUrl || null,
        ativo: formData.ativo,
        data: new Date().toISOString(),
        setor_id: effectiveSetorId || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = editingItem
        ? await supabase.from('noticias').update(payload).eq('id', editingItem.id)
        : await supabase.from('noticias').insert([{ ...payload, created_at: new Date().toISOString() }]);

      if (error) {
        throw error;
      }

      if (uploadedPath && oldImageUrl) {
        const oldPath = extractStoragePath(oldImageUrl);
        if (oldPath) {
          await supabase.storage.from('imagens').remove([oldPath]);
        }
      }

      toast({ title: editingItem ? 'Noticia atualizada' : 'Noticia criada' });
      handleCloseDialog();
      loadNoticias();
    } catch (err: unknown) {
      if (uploadedPath) {
        await supabase.storage.from('imagens').remove([uploadedPath]);
      }
      const message = err instanceof Error ? err.message : 'Ocorreu um erro ao salvar a noticia';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (item: Noticia) => {
    setEditingItem(item);
    setFormData({
      titulo: item.titulo,
      resumo: item.resumo,
      conteudo: item.conteudo,
      imagem: item.imagem || '',
      ativo: item.ativo,
    });
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: Noticia) => {
    const confirmed = await confirm({ title: 'Excluir notícia', description: 'Deseja realmente excluir esta notícia?' });
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('noticias').delete().eq('id', item.id);
      if (error) {
        throw error;
      }

      if (item.imagem) {
        const path = extractStoragePath(item.imagem);
        if (path) {
          await supabase.storage.from('imagens').remove([path]);
        }
      }

      setNoticias((current) => current.filter((noticia) => noticia.id !== item.id));
      toast({ title: 'Noticia excluida com sucesso' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro ao excluir a noticia';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setImageFile(null);
    setFormData({
      titulo: '',
      resumo: '',
      conteudo: '',
      imagem: '',
      ativo: true,
    });
  };

  const filteredNoticias = useMemo(() => {
    return noticias.filter((noticia) =>
      noticia.titulo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [noticias, searchTerm]);

  const columns = [
    { header: 'Titulo', accessor: 'titulo' as const },
    { header: 'Resumo', accessor: 'resumo' as const, className: 'max-w-md truncate' },
  ];

  const content = (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Noticias</h1>
        <p className="text-muted-foreground mt-1">Gerencie noticias globais ou por setor.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar noticias..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>

        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Nova Noticia
        </Button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          Carregando noticias...
        </div>
      ) : (
        <DataTable
          data={filteredNoticias}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="Nenhuma noticia cadastrada"
        />
      )}

      <ResponsiveDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingItem ? 'Editar noticia' : 'Nova noticia'}
        description="Preencha os campos abaixo para salvar o conteudo."
        onCancel={handleCloseDialog}
        onConfirm={handleSubmit}
        confirmLabel={editingItem ? 'Atualizar' : 'Criar'}
      >
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="titulo">Titulo *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(event) => setFormData({ ...formData, titulo: event.target.value })}
              placeholder="Digite o titulo da noticia"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resumo">Resumo *</Label>
            <Textarea
              id="resumo"
              value={formData.resumo}
              onChange={(event) => setFormData({ ...formData, resumo: event.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conteudo">Conteudo *</Label>
            <Textarea
              id="conteudo"
              value={formData.conteudo}
              onChange={(event) => setFormData({ ...formData, conteudo: event.target.value })}
              rows={5}
            />
          </div>

          <ImageUpload
            label="Imagem da noticia"
            value={formData.imagem}
            onChange={setImageFile}
          />

          <div className="flex items-center space-x-2">
            <Switch
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
            />
            <Label htmlFor="ativo">Publicar noticia</Label>
          </div>
        </div>
      </ResponsiveDialog>
      {confirmDialog}
    </div>
  );

  return layout ? <AdminLayout>{content}</AdminLayout> : content;
};

export default Noticias;
