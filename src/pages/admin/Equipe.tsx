import { useState, useEffect } from 'react';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { sanitizeFileName } from '@/lib/upload';
import { ImageUpload } from '@/components/ui/image-upload';
import { useAuth } from '@/contexts/AuthContext';

interface Membro {
  id: string;
  nome: string;
  cargo: string;
  setor: string | null;
  pagina_destino?: string | null;
  foto?: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

const Equipe = ({ layout = true }: { layout?: boolean } = {}) => {
  const { isSuperAdmin, setorId, profile } = useAuth();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Membro | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ nome: '', cargo: '', setor: null, pagina_destino: null, foto: null, ativo: true });
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const isDemutranSector = profile?.setor_slug === 'demutran' && !isSuperAdmin;

  useEffect(() => {
    const fetchMembros = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('equipe') // Usando a tabela equipe para membros da equipe
          .select('*')
          .order('nome', { ascending: true });

        if (!isSuperAdmin && setorId) {
          query = query.eq('setor', profile?.setor_slug || '');
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error('Error fetching membros:', fetchError.message);
          toast({
            title: 'Erro ao carregar membros',
            description: fetchError.message,
            variant: 'destructive',
          });
        } else {
          setMembros(data || []);
        }
      } catch (err) {
        console.error('Error fetching membros:', err);
        toast({
          title: 'Erro ao carregar membros',
          description: 'Ocorreu um erro ao carregar os membros da equipe',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMembros();
  }, [isSuperAdmin, setorId, profile?.setor_slug]);

  useEffect(() => {
    if (isDemutranSector) {
      setFormData((current) => ({ ...current, setor: 'demutran', pagina_destino: 'demutran' }));
    }
  }, [isDemutranSector]);

  const handleSubmit = async () => {
    if (!formData.nome || !formData.cargo) {
      toast({ title: 'Erro', description: 'Nome e cargo são obrigatórios', variant: 'destructive' });
      return;
    }

    let uploadedPath: string | null = null;
    let oldImageUrl = editingItem?.foto || null;

    try {
      let imageUrl = formData.foto;
      if (imageFile) {
        const fileName = sanitizeFileName(imageFile.name);
        const filePath = `membros/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('imagens')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        uploadedPath = uploadData.path;

        const { data: { publicUrl } } = supabase.storage
          .from('imagens')
          .getPublicUrl(uploadData.path);

        imageUrl = publicUrl;
      }

      if (editingItem) {
        // Atualizar com um conjunto mínimo de colunas primeiro
        const updateData: any = {
          nome: formData.nome,
          cargo: formData.cargo,
          ativo: formData.ativo,
          updated_at: new Date().toISOString(),
        };

        // Adicionar campos opcionais se tiverem valores
        if (formData.setor) updateData.setor = formData.setor;
        if (formData.pagina_destino) updateData.pagina_destino = formData.pagina_destino;
        if (imageUrl) updateData.foto = imageUrl;

        try {
          const { error } = await supabase
            .from('equipe')
            .update(updateData)
            .eq('id', editingItem.id);

          if (error) {
            throw error;
          }

          toast({ title: 'Membro atualizado!' });
        } catch (error: any) {
          if (error.message.includes('Could not find') && error.message.includes('column')) {
            // Tentar atualizar com apenas campos essenciais
            const essentialUpdateData: any = {
              nome: formData.nome,
              cargo: formData.cargo,
              ativo: formData.ativo,
              updated_at: new Date().toISOString(),
            };

            // Adicionar apenas campos essenciais com valores
            if (formData.setor) essentialUpdateData.setor = formData.setor;

            const { error: essentialError } = await supabase
              .from('equipe')
              .update(essentialUpdateData)
              .eq('id', editingItem.id);

            if (essentialError) {
              console.error('Erro na atualização com campos essenciais:', essentialError);
              toast({
                title: 'Erro',
                description: essentialError.message || 'Ocorreu um erro ao atualizar o membro',
                variant: 'destructive',
              });
              return;
            } else {
              // Se a atualização essencial funcionou, tentar atualizar os campos opcionais posteriormente
              if (formData.pagina_destino || imageUrl) {
                setTimeout(async () => {
                  const optionalUpdateData: any = {};
                  if (formData.pagina_destino) optionalUpdateData.pagina_destino = formData.pagina_destino;
                  if (imageUrl) optionalUpdateData.foto = imageUrl;

                  const { error: optionalError } = await supabase
                    .from('equipe')
                    .update(optionalUpdateData)
                    .eq('id', editingItem.id);

                  if (optionalError) {
                    console.error('Erro ao atualizar campos opcionais:', optionalError);
                    // Não lançamos erro aqui pois a atualização principal já foi feita
                  }
                }, 1000);
              }
            }
          } else {
            console.error('Erro ao atualizar membro:', error);
            toast({
              title: 'Erro',
              description: error.message || 'Ocorreu um erro ao atualizar o membro',
              variant: 'destructive',
            });
            return;
          }
        }
      } else {
        // Inserir com campos principais
        const insertData: any = {
          nome: formData.nome,
          cargo: formData.cargo,
          ativo: formData.ativo,
          created_at: new Date().toISOString(),
        };

        // Adicionar campos opcionais se tiverem valores
        if (formData.setor) insertData.setor = formData.setor;
        if (formData.pagina_destino) insertData.pagina_destino = formData.pagina_destino;
        if (imageUrl) insertData.foto = imageUrl;

        try {
          const { error } = await supabase
            .from('equipe')
            .insert([insertData]);

          if (error) {
            throw error;
          }

          toast({ title: 'Membro adicionado!' });
        } catch (error: any) {
          if (error.message.includes('Could not find') && error.message.includes('column')) {
            // Tentar inserir com apenas campos essenciais
            const essentialInsertData = {
              nome: formData.nome,
              cargo: formData.cargo,
              ativo: formData.ativo,
              created_at: new Date().toISOString(),
            };

            const { error: essentialError } = await supabase
              .from('equipe')
              .insert([essentialInsertData]);

            if (essentialError) {
              console.error('Erro na inserção com campos essenciais:', essentialError);
              toast({
                title: 'Erro',
                description: essentialError.message || 'Ocorreu um erro ao adicionar o membro',
                variant: 'destructive',
              });
              return;
            } else {
              // Se a inserção essencial funcionou, tentar atualizar os campos opcionais posteriormente
              setTimeout(async () => {
                const optionalUpdateData: any = {};
                if (formData.setor) optionalUpdateData.setor = formData.setor;
                if (formData.pagina_destino) optionalUpdateData.pagina_destino = formData.pagina_destino;
                if (imageUrl) optionalUpdateData.foto = imageUrl;

                if (Object.keys(optionalUpdateData).length > 0) {
                  // Precisamos obter o ID do registro recém-criado para atualizar
                  const { data: insertedRecord } = await supabase
                    .from('equipe')
                    .select('id')
                    .eq('nome', formData.nome)
                    .eq('cargo', formData.cargo)
                    .order('created_at', { ascending: false })
                    .limit(1);

                  if (insertedRecord && insertedRecord.length > 0) {
                    const { error: optionalError } = await supabase
                      .from('equipe')
                      .update(optionalUpdateData)
                      .eq('id', insertedRecord[0].id);

                    if (optionalError) {
                      console.error('Erro ao atualizar campos opcionais após inserção:', optionalError);
                      // Não lançamos erro aqui pois a inserção principal já foi feita
                    }
                  }
                }
              }, 1000);
            }
          } else {
            console.error('Erro ao adicionar membro:', error);
            toast({
              title: 'Erro',
              description: error.message || 'Ocorreu um erro ao adicionar o membro',
              variant: 'destructive',
            });
            return;
          }
        }
      }

      // Reload membros after successful submit
      let { data, error: reloadError } = await supabase
        .from('equipe')
        .select('id, nome, cargo, setor, pagina_destino, foto, ativo, created_at, updated_at')
        .order('nome', { ascending: true });

      // Se ocorrer erro de coluna ausente, tentar com colunas essenciais
      if (reloadError && reloadError.message.includes('Could not find')) {
        const fallbackResult = await supabase
          .from('equipe')
          .select('id, nome, cargo, setor, ativo, created_at, updated_at')
          .order('nome', { ascending: true });

        if (!fallbackResult.error) {
          data = fallbackResult.data?.map(item => ({
            ...item,
            pagina_destino: item.pagina_destino || null,
            foto: item.foto || null
          })) || [];
        } else {
          console.error('Error reloading membros:', fallbackResult.error.message);
          data = [];
        }
      } else if (reloadError) {
        console.error('Error reloading membros:', reloadError.message);
      }

      if (data) {
        setMembros(data);
      }

      // Remove imagem antiga se foi substituída com sucesso
      if (uploadedPath && oldImageUrl) {
        const oldPath = oldImageUrl.match(/\/public\/imagens\/(.+)$/)?.[1];
        if (oldPath) {
          await supabase.storage.from('imagens').remove([oldPath]);
        }
      }
    } catch (err: any) {
      // Rollback: remove arquivo enviado se o banco falhou
      if (uploadedPath) {
        await supabase.storage.from('imagens').remove([uploadedPath]);
      }
      console.error('Error saving membro:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Ocorreu um erro ao salvar o membro',
        variant: 'destructive',
      });
      return;
    }

    handleCloseDialog();
  };

  const handleEdit = (item: Membro) => {
    setEditingItem(item);
    setFormData({
      ...item,
      pagina_destino: item.pagina_destino || '',
      foto: item.foto || '',
      setor: item.setor || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: Membro) => {
    const confirmed = await confirm({ title: 'Excluir membro', description: 'Deseja excluir este membro?' });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('equipe')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      // Remove foto do storage se existir
      if (item.foto) {
        const path = item.foto.match(/\/public\/imagens\/(.+)$/)?.[1];
        if (path) {
          await supabase.storage.from('imagens').remove([path]);
        }
      }

      setMembros(membros.filter(m => m.id !== item.id));
      toast({ title: 'Membro excluído!' });
    } catch (err: any) {
      console.error('Error deleting membro:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Ocorreu um erro ao excluir o membro',
        variant: 'destructive',
      });
    }
  };

  // Adiciona pagina_destino ao fetch se não existir nos dados
  useEffect(() => {
    if (membros.length > 0 && !membros.some(m => m.pagina_destino !== undefined)) {
      setMembros(membros.map(m => ({ ...m, pagina_destino: m.pagina_destino || '', foto: m.foto || '' })));
    }
  }, [membros]);

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      nome: '',
      cargo: '',
      setor: isDemutranSector ? 'demutran' : '',
      pagina_destino: isDemutranSector ? 'demutran' : '',
      foto: '',
      ativo: true
    });
    setImageFile(null);
  };

  const filteredMembros = membros.filter((m) =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { header: 'Nome', accessor: 'nome' as const },
    { header: 'Cargo', accessor: 'cargo' as const },
    { header: 'Setor', accessor: 'setor' as const },
  ];

  const content = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipe</h1>
          <p className="text-muted-foreground mt-1">Gerencie a estrutura da equipe</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Membro
        </Button>
      </div>

      <div className="max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar membros..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-10" 
          />
        </div>
      </div>

      <DataTable 
        data={filteredMembros} 
        columns={columns} 
        onEdit={handleEdit} 
        onDelete={handleDelete} 
        emptyMessage="Nenhum membro cadastrado" 
      />

      <ResponsiveDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingItem ? 'Editar Membro' : 'Novo Membro'}
        description="Preencha os dados do membro da equipe"
        onCancel={handleCloseDialog}
        onConfirm={handleSubmit}
        confirmLabel={editingItem ? 'Atualizar' : 'Adicionar'}
      >
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: João Silva"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo *</Label>
              <Input
                id="cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                placeholder="Ex: Guarda Municipal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setor">Setor</Label>
              {isDemutranSector ? (
                <Input value="Demutran" disabled />
              ) : (
                <Select value={formData.setor || ''} onValueChange={(value) => setFormData({ ...formData, setor: value })}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="central-comunicacao">Central de Comunicação</SelectItem>
                    <SelectItem value="vigilancia">Vigilância</SelectItem>
                    <SelectItem value="rancho">Rancho</SelectItem>
                    <SelectItem value="recepcao">Recepção</SelectItem>
                    <SelectItem value="demutran">Demutran</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pagina_destino">Para qual página</Label>
            {isDemutranSector ? (
              <Input value="Demutran" disabled />
            ) : (
              <Select value={formData.pagina_destino} onValueChange={(value) => setFormData({ ...formData, pagina_destino: value })}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Ex: Selecione onde será mostrado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="secretaria">Secretaria</SelectItem>
                  <SelectItem value="demutran">Demutran</SelectItem>
                  <SelectItem value="guarda-municipal">Guarda Municipal</SelectItem>
                  <SelectItem value="defesa-civil">Defesa Civil</SelectItem>
                  <SelectItem value="rope">ROPE</SelectItem>
                  <SelectItem value="gmam">GMAM</SelectItem>
                  <SelectItem value="gsu">GSU</SelectItem>
                  <SelectItem value="todos">Todos os locais</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <ImageUpload
            id="foto"
            label="Foto"
            value={formData.foto}
            onChange={(file) => {
              setImageFile(file);
              if (file) {
                setFormData({ ...formData, foto: URL.createObjectURL(file) });
              }
            }}
            onRemove={() => {
              setImageFile(null);
              setFormData({ ...formData, foto: '' });
            }}
          />
          <div className="flex items-center space-x-2">
            <Switch 
              id="ativo" 
              checked={formData.ativo} 
              onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })} 
            />
            <Label htmlFor="ativo">Membro ativo</Label>
          </div>
        </div>
      </ResponsiveDialog>
      {confirmDialog}
    </div>
  );

  return layout ? <AdminLayout>{content}</AdminLayout> : content;
};

export default Equipe;
