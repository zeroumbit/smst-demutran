import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ImageUpload } from '@/components/ui/image-upload';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { sanitizeFileName } from '@/lib/upload';
import { useAuth } from '@/contexts/AuthContext';
import type { Setor } from '@/types/admin';

const extractStoragePath = (publicUrl: string): string | null => {
  const match = publicUrl.match(/\/public\/imagens\/(.+)$/);
  return match ? match[1] : null;
};

interface Foto {
  id: string;
  url: string;
  titulo: string;
  descricao: string;
  categoria?: string;
  ativo?: boolean;
  setor_id: string | null;
  created_at?: string;
}

const Galeria = ({ layout = true }: { layout?: boolean } = {}) => {
  const { isSuperAdmin, setorId } = useAuth();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [demutranSetorId, setDemutranSetorId] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ url: '', titulo: '', descricao: '', categoria: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);

  const effectiveSetorId = demutranSetorId || setorId || '';

  const loadSetores = async () => {
    const { data } = await supabase.rpc('get_manageable_setores');
    const demutranOnly = ((data || []) as Setor[]).filter((setor) => setor.slug === 'demutran');
    if (demutranOnly[0]?.id) {
      setDemutranSetorId(demutranOnly[0].id);
    }
  };

  const loadFotos = async () => {
    setLoading(true);
    let query = supabase.from('galeria_fotos').select('*').order('created_at', { ascending: false });

    if (effectiveSetorId) {
      query = query.eq('setor_id', effectiveSetorId);
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: 'Erro ao carregar fotos', description: error.message, variant: 'destructive' });
    } else {
      setFotos((data || []) as Foto[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSetores();
  }, []);

  useEffect(() => {
    loadFotos();
  }, [effectiveSetorId, isSuperAdmin, setorId]);

  const handleSubmit = async () => {
    if ((!formData.url && !imageFile) || !formData.titulo) {
      toast({ title: 'Erro', description: 'Imagem e titulo sao obrigatorios', variant: 'destructive' });
      return;
    }

    let uploadedPath: string | null = null;
    let imageUrl = formData.url;

    try {
      if (imageFile) {
        const fileName = sanitizeFileName(imageFile.name);
        const { data: uploadData, error: uploadError } = await supabase.storage.from('imagens').upload(fileName, imageFile, {
          cacheControl: '3600',
          upsert: false,
        });

        if (uploadError) {
          throw uploadError;
        }

        uploadedPath = uploadData.path;
        imageUrl = supabase.storage.from('imagens').getPublicUrl(uploadData.path).data.publicUrl;
      }

      const { error } = await supabase.from('galeria_fotos').insert([{
        url: imageUrl,
        titulo: formData.titulo,
        descricao: formData.descricao,
        categoria: formData.categoria || null,
        setor_id: effectiveSetorId || null,
        ativo: true,
        created_at: new Date().toISOString(),
      }]);

      if (error) {
        throw error;
      }

      toast({ title: 'Foto adicionada' });
      setIsDialogOpen(false);
      setImageFile(null);
      setFormData({ url: '', titulo: '', descricao: '', categoria: '' });
      loadFotos();
    } catch (err: any) {
      if (uploadedPath) {
        await supabase.storage.from('imagens').remove([uploadedPath]);
      }
      toast({ title: 'Erro', description: err.message || 'Ocorreu um erro ao salvar a foto', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({ title: 'Excluir foto', description: 'Deseja excluir esta foto?' });
    if (!confirmed) return;

    const foto = fotos.find((item) => item.id === id);
    const { error } = await supabase.from('galeria_fotos').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }

    if (foto?.url) {
      const path = extractStoragePath(foto.url);
      if (path) {
        await supabase.storage.from('imagens').remove([path]);
      }
    }

    setFotos((current) => current.filter((item) => item.id !== id));
    toast({ title: 'Foto excluida' });
  };

  const categoryHint = useMemo(() => {
    if (effectiveSetorId === 'global') {
      return 'Use categorias globais ou de destaque institucional.';
    }

    return 'Use a categoria para organizar a galeria interna do setor.';
  }, [effectiveSetorId]);

  const content = (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Galeria de Fotos</h1>
          <p className="text-muted-foreground mt-1">Gerencie fotos globais ou associadas ao setor.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Foto
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            Carregando fotos...
          </CardContent>
        </Card>
      ) : fotos.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Nenhuma foto cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {fotos.map((foto) => (
            <Card key={foto.id} className="overflow-hidden group">
              <div className="relative aspect-video bg-muted">
                <img src={foto.url} alt={foto.titulo} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(foto.id)} className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg">{foto.titulo}</h3>
                {foto.descricao && <p className="text-sm text-muted-foreground mt-1">{foto.descricao}</p>}
                <p className="mt-2 text-xs text-muted-foreground">
                  {foto.setor_id === effectiveSetorId ? 'DEMUTRAN' : 'Global'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ResponsiveDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Adicionar foto"
        description="Insira os dados da nova foto"
        onCancel={() => setIsDialogOpen(false)}
        onConfirm={handleSubmit}
        confirmLabel="Adicionar"
      >
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="titulo">Titulo *</Label>
            <Input id="titulo" value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descricao</Label>
            <Input id="descricao" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Input id="categoria" value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} placeholder={categoryHint} />
          </div>
          <ImageUpload label="Imagem *" value={formData.url} onChange={setImageFile} required />
        </div>
      </ResponsiveDialog>
      {confirmDialog}
    </div>
  );

  return layout ? <AdminLayout>{content}</AdminLayout> : content;
};

export default Galeria;
