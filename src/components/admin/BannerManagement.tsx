import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IMAGE_UPLOAD_RULES, sanitizeFileName, validateFileUpload } from '../../lib/upload';
import { useConfirmDialog } from '../ui/use-confirm-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ResponsiveDialog } from '../ui/responsive-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Trash2, Edit3, Plus, Upload, Play, Image } from 'lucide-react';

// Definindo o tipo para banners
interface Banner {
  id: string;
  pagina_destino: string;
  nome: string;
  tipo: 'imagem' | 'video';
  url: string;
  descricao: string;
  ativo: boolean;
  created_at: string;
}

const BannerManagement: React.FC = () => {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para o formulário
  const [paginaDestino, setPaginaDestino] = useState<string>('');
  const [nome, setNome] = useState<string>('');
  const [tipo, setTipo] = useState<'imagem' | 'video'>('imagem');
  const [url, setUrl] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [ativo, setAtivo] = useState<boolean>(true);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Estados para edição
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  // Opções para o select de página
  const paginas = [
    { value: 'home', label: 'Home' },
    { value: 'secretaria', label: 'Secretaria' },
    { value: 'demutran', label: 'Demutran' },
    { value: 'guarda_municipal', label: 'Guarda Municipal' },
    { value: 'guarda_cidada', label: 'Guarda Cidadã' },
    { value: 'jovem_guarda_cidada', label: 'Jovem Guarda Cidadã' },
    { value: 'rope', label: 'ROPE' },
    { value: 'gmam', label: 'GMAM' },
    { value: 'gsu', label: 'GSU' },
    { value: 'paginas', label: 'Páginas' }
  ];

  // Carregar banners do banco de dados
  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar banners:', error);
        // Verificar se é erro de tabela não encontrada (PGRST205 é específico do PostgREST)
        if (error.code === 'PGRST205' || error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('Could not find the table')) {
          setError('A tabela de banners ainda não foi criada no banco de dados. Contate o administrador do sistema para aplicar as migrações necessárias.');
        } else {
          setError(`Erro ao carregar banners: ${error.message}`);
        }
        setBanners([]);
      } else {
        setBanners(data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar banners:', err);
      setError('Erro ao carregar banners');
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  // Função para validar o formulário
  const validateForm = (): boolean => {
    if (!paginaDestino) {
      setError('Por favor, selecione uma página de destino');
      return false;
    }
    if (!nome.trim()) {
      setError('Por favor, informe um nome para o banner');
      return false;
    }
    if (tipo === 'video' && !url.trim()) {
      setError('Por favor, informe a URL do vídeo');
      return false;
    }
    if (tipo === 'video' && !url.includes('youtube.com') && !url.includes('youtu.be')) {
      setError('Para vídeos, informe um link do YouTube válido');
      return false;
    }
    if (tipo === 'imagem' && !imageFile && !url.trim()) {
      setError('Por favor, selecione uma imagem ou informe uma URL válida');
      return false;
    }

    setError(null);
    return true;
  };

  // Extrai o caminho do arquivo dentro do bucket a partir da URL pública
  const getFilePathFromUrl = (publicUrl: string): string | null => {
    const match = publicUrl.match(/\/public\/imagens\/(.+)$/);
    return match ? match[1] : null;
  };

  // Remove arquivo do storage
  const removeFileFromStorage = async (fileUrl: string) => {
    const filePath = getFilePathFromUrl(fileUrl);
    if (!filePath) return;
    try {
      await supabase.storage.from('imagens').remove([filePath]);
    } catch {
      // Fallha silenciosa na limpeza não deve impedir a operação principal
    }
  };

  // Função para lidar com o upload de imagem
  const uploadImage = async (): Promise<string> => {
    if (!imageFile) throw new Error('Nenhum arquivo selecionado');
    validateFileUpload(imageFile, IMAGE_UPLOAD_RULES);

    const fileName = `banners/${sanitizeFileName(imageFile.name)}`;
    const { data, error } = await supabase.storage
      .from('imagens')
      .upload(fileName, imageFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('imagens')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  // Função para salvar banner (novo ou edição)
  const saveBanner = async () => {
    if (!validateForm()) return;

    let uploadedUrl: string | null = null;

    try {
      let finalUrl = url;
      const oldUrl = editingBanner?.url || null;

      // Se for imagem e tiver arquivo, fazer upload
      if (tipo === 'imagem' && imageFile) {
        uploadedUrl = await uploadImage();
        finalUrl = uploadedUrl;
      }

      if (editingBanner) {
        const { error } = await supabase
          .from('banners')
          .update({
            pagina_destino: paginaDestino,
            nome,
            tipo,
            url: finalUrl,
            descricao,
            ativo
          })
          .eq('id', editingBanner.id);

        if (error) throw error;

        // Remove imagem antiga se foi substituída
        if (uploadedUrl && oldUrl) {
          await removeFileFromStorage(oldUrl);
        }
      } else {
        const { error } = await supabase
          .from('banners')
          .insert([{
            pagina_destino: paginaDestino,
            nome,
            tipo,
            url: finalUrl,
            descricao,
            ativo
          }]);

        if (error) throw error;
      }

      resetForm();
      fetchBanners();
    } catch (err) {
      // Rollback: remove arquivo enviado se o banco falhou
      if (uploadedUrl) {
        await removeFileFromStorage(uploadedUrl);
      }
      console.error('Erro ao salvar banner:', err);
      setError('Erro ao salvar banner');
    }
  };

  // Função para resetar o formulário
  const resetForm = () => {
    setPaginaDestino('');
    setNome('');
    setTipo('imagem');
    setUrl('');
    setDescricao('');
    setAtivo(true);
    setImageFile(null);
    setEditingBanner(null);
  };

  // Função para preencher o formulário com dados para edição
  const editBanner = (banner: Banner) => {
    setPaginaDestino(banner.pagina_destino);
    setNome(banner.nome);
    setTipo(banner.tipo);
    setUrl(banner.url);
    setDescricao(banner.descricao);
    setAtivo(banner.ativo);
    setEditingBanner(banner);
    setIsDialogOpen(true);
  };

  // Função para deletar banner
  const deleteBanner = async (id: string) => {
    const confirmed = await confirm({ title: 'Excluir banner', description: 'Tem certeza que deseja excluir este banner?' });
    if (!confirmed) return;

    try {
      // Buscar URL antes de deletar para limpar storage
      const { data: banner } = await supabase
        .from('banners')
        .select('url')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove arquivo do storage se existir
      if (banner?.url) {
        await removeFileFromStorage(banner.url);
      }

      fetchBanners();
    } catch (err) {
      console.error('Erro ao deletar banner:', err);
      setError('Erro ao deletar banner');
    }
  };

  // Alternar status do banner
  const toggleBannerStatus = async (id: string, currentStatus: boolean) => {
    const confirmed = await confirm({
      title: currentStatus ? 'Desativar banner' : 'Ativar banner',
      description: currentStatus ? 'Deseja desativar este banner?' : 'Deseja ativar este banner?',
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('banners')
        .update({ ativo: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      fetchBanners();
    } catch (err) {
      console.error('Erro ao alternar status do banner:', err);
      setError('Erro ao alternar status do banner');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando banners...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciamento de Banners</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Banner
        </Button>
        <ResponsiveDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={editingBanner ? 'Editar Banner' : 'Adicionar Novo Banner'}
          onCancel={() => { resetForm(); setIsDialogOpen(false); }}
          onConfirm={saveBanner}
          confirmLabel={editingBanner ? 'Atualizar' : 'Salvar'}
        >
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="pagina_destino" className="sm:text-right">
                Página
              </Label>
              <Select value={paginaDestino} onValueChange={setPaginaDestino}>
                <SelectTrigger className="sm:col-span-3">
                  <SelectValue placeholder="Selecione a página" />
                </SelectTrigger>
                <SelectContent>
                  {paginas.map((pagina) => (
                    <SelectItem key={pagina.value} value={pagina.value}>
                      {pagina.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="nome" className="sm:text-right">
                Nome *
              </Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="sm:col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label className="sm:text-right">
                Tipo *
              </Label>
              <div className="sm:col-span-3 flex gap-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="imagem"
                    name="tipo"
                    checked={tipo === 'imagem'}
                    onChange={() => setTipo('imagem')}
                  />
                  <Label htmlFor="imagem">Imagem</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="video"
                    name="tipo"
                    checked={tipo === 'video'}
                    onChange={() => setTipo('video')}
                  />
                  <Label htmlFor="video">Vídeo</Label>
                </div>
              </div>
            </div>
            
            {tipo === 'imagem' ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="imagem" className="sm:text-right">
                  Imagem *
                </Label>
                <div className="sm:col-span-3">
                  <div className="flex items-center gap-2">
                    <Input
                      id="imagem"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      className="flex-1"
                    />
                    {url && tipo === 'imagem' && (
                      <div className="w-16 h-16 border rounded flex items-center justify-center">
                        <Image className="h-8 w-8 text-gray-500" />
                      </div>
                    )}
                  </div>
                  {url && tipo === 'imagem' && (
                    <div className="mt-2">
                      <img 
                        src={url} 
                        alt="Pré-visualização" 
                        className="max-h-32 rounded border"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="video_url" className="sm:text-right">
                  Link do Vídeo *
                </Label>
                <Input
                  id="video_url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="sm:col-span-3"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                {url && tipo === 'video' && (
                  <div className="col-span-4 flex justify-center">
                    <div className="w-full max-w-md aspect-video bg-gray-200 rounded flex items-center justify-center">
                      <Play className="h-12 w-12 text-gray-500" />
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="descricao" className="sm:text-right">
                Descrição
              </Label>
              <Input
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="sm:col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="ativo" className="sm:text-right">
                Ativo
              </Label>
              <Switch
                id="ativo"
                checked={ativo}
                onCheckedChange={setAtivo}
                className="sm:col-span-3"
              />
            </div>
          </div>
        </ResponsiveDialog>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <Tabs defaultValue="ativos" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ativos">Banners Ativos</TabsTrigger>
          <TabsTrigger value="todos">Todos os Banners</TabsTrigger>
        </TabsList>
        <TabsContent value="ativos">
          <Card>
            <CardHeader>
              <CardTitle>Banners Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imagem/Vídeo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Página</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banners
                    .filter(banner => banner.ativo)
                    .map((banner) => (
                      <TableRow key={banner.id}>
                        <TableCell>
                          {banner.tipo === 'imagem' ? (
                            <img 
                              src={banner.url} 
                              alt={banner.nome} 
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                              <Play className="h-6 w-6 text-gray-500" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{banner.nome}</TableCell>
                        <TableCell>{banner.pagina_destino}</TableCell>
                        <TableCell>{banner.tipo}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => editBanner(banner)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteBanner(banner.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="todos">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Banners</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imagem/Vídeo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Página</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banners.map((banner) => (
                    <TableRow key={banner.id}>
                      <TableCell>
                        {banner.tipo === 'imagem' ? (
                          <img 
                            src={banner.url} 
                            alt={banner.nome} 
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                            <Play className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{banner.nome}</TableCell>
                      <TableCell>{banner.pagina_destino}</TableCell>
                      <TableCell>{banner.tipo}</TableCell>
                      <TableCell>
                        <Switch
                          checked={banner.ativo}
                          onCheckedChange={() => toggleBannerStatus(banner.id, banner.ativo)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => editBanner(banner)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteBanner(banner.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {confirmDialog}
    </div>
  );
};

export default BannerManagement;
export { BannerManagement };
