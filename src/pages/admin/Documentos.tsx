import { useEffect, useMemo, useRef, useState, FC } from 'react';
import { Eye, FileText, Loader2, Plus, Search, SlidersHorizontal, Upload, X } from 'lucide-react';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { DOCUMENT_UPLOAD_RULES, sanitizeFileName, validateFileUpload } from '@/lib/upload';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { Setor } from '@/types/admin';

interface Documento {
  id: string;
  nome: string;
  descricao: string;
  arquivo_url: string;
  local_exibicao: string;
  ativo: boolean;
  setor_id: string | null;
  created_at?: string;
  updated_at?: string;
}

type FormData = Omit<Documento, 'id' | 'created_at' | 'updated_at' | 'setor_id'>;

interface DocumentoFormProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  documentFile: File | null;
  setDocumentFile: React.Dispatch<React.SetStateAction<File | null>>;
  isSuperAdmin: boolean;
  isDemutranSector: boolean;
  selectedSetorId: string;
  setSelectedSetorId: React.Dispatch<React.SetStateAction<string>>;
  setores: Setor[];
}

const LOCAL_EXIBICAO_OPTIONS = [
  { value: 'todos', label: 'Todos os locais' },
  { value: 'demutran', label: 'Demutran' },
  { value: 'guarda-municipal', label: 'Guarda Municipal' },
  { value: 'defesa-civil', label: 'Defesa Civil' },
  { value: 'rope', label: 'ROPE' },
  { value: 'gmam', label: 'GMAM' },
  { value: 'gsu', label: 'GSU' },
  { value: 'jovem-guarda', label: 'Jovem Guarda' },
];

const statusBadgeClasses = {
  ativo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  inativo: 'border-slate-200 bg-slate-100 text-slate-600',
};

const DocumentoForm: FC<DocumentoFormProps> = ({
  formData,
  setFormData,
  documentFile,
  setDocumentFile,
  isSuperAdmin,
  isDemutranSector,
  selectedSetorId,
  setSelectedSetorId,
  setores,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setDocumentFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {isSuperAdmin && (
        <div className="space-y-2">
          <Label>Escopo do conteudo</Label>
          <Select value={selectedSetorId} onValueChange={setSelectedSetorId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global</SelectItem>
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
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descricao</Label>
        <Textarea id="descricao" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} rows={3} />
      </div>

      <div className="space-y-2">
        <Label>Arquivo *</Label>
        <Input ref={fileInputRef} id="arquivo" type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
          <Upload className="mr-2 h-4 w-4" />
          {documentFile ? 'Trocar documento' : 'Escolher documento'}
        </Button>
        {documentFile && (
          <div className="rounded-lg border border-border bg-muted/50 px-3 py-2">
            <p className="text-sm font-medium text-foreground truncate">{documentFile.name}</p>
          </div>
        )}
      </div>

      {isDemutranSector ? (
        <div className="space-y-2">
          <Label>Local de exibicao</Label>
          <Input value="Demutran" disabled />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="local_exibicao">Local de exibicao</Label>
          <Select value={formData.local_exibicao} onValueChange={(value) => setFormData({ ...formData, local_exibicao: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCAL_EXIBICAO_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Switch id="ativo" checked={formData.ativo} onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })} />
        <Label htmlFor="ativo">Documento ativo</Label>
      </div>
    </div>
  );
};

const Documentos = () => {
  const { isSuperAdmin, setorId, profile } = useAuth();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [selectedSetorId, setSelectedSetorId] = useState<string>('global');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Documento | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [selectedLocal, setSelectedLocal] = useState('todos');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    descricao: '',
    arquivo_url: '',
    local_exibicao: 'todos',
    ativo: true,
  });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);

  const effectiveSetorId = isSuperAdmin ? selectedSetorId : (setorId || 'global');
  const isDemutranSector = profile?.setor_slug === 'demutran' && !isSuperAdmin;

  const loadSetores = async () => {
    const { data } = await supabase.rpc('get_manageable_setores');
    setSetores((data || []) as Setor[]);
  };

  const fetchDocumentos = async () => {
    setLoading(true);
    let query = supabase.from('documentos').select('*').order('created_at', { ascending: false });

    if (effectiveSetorId === 'global') {
      if (!isSuperAdmin) {
        query = query.eq('setor_id', setorId);
      }
    } else {
      query = query.eq('setor_id', effectiveSetorId);
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: 'Erro ao carregar documentos', description: error.message, variant: 'destructive' });
    } else {
      setDocumentos((data || []) as Documento[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSetores();
  }, []);

  useEffect(() => {
    fetchDocumentos();
  }, [effectiveSetorId, isSuperAdmin, setorId]);

  useEffect(() => {
    if (isDemutranSector) {
      setFormData((current) => ({ ...current, local_exibicao: 'demutran' }));
    }
  }, [isDemutranSector]);

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({ nome: '', descricao: '', arquivo_url: '', local_exibicao: isDemutranSector ? 'demutran' : 'todos', ativo: true });
    setDocumentFile(null);
  };

  const handleSubmit = async () => {
    if (!formData.nome || (!editingItem && !documentFile)) {
      toast({ title: 'Erro', description: 'Nome e arquivo sao obrigatorios', variant: 'destructive' });
      return;
    }

    let uploadedPath: string | null = null;
    let arquivoUrl = formData.arquivo_url;

    try {
      if (documentFile) {
        validateFileUpload(documentFile, DOCUMENT_UPLOAD_RULES);
        const fileName = sanitizeFileName(documentFile.name);
        const { data: uploadData, error: uploadError } = await supabase.storage.from('documentos').upload(fileName, documentFile, { upsert: true });
        if (uploadError) {
          throw uploadError;
        }
        uploadedPath = uploadData.path;
        arquivoUrl = supabase.storage.from('documentos').getPublicUrl(uploadData.path).data.publicUrl;
      }

      const payload = {
        ...formData,
        arquivo_url: arquivoUrl,
        setor_id: effectiveSetorId === 'global' ? null : effectiveSetorId,
        updated_at: new Date().toISOString(),
      };

      const { error } = editingItem
        ? await supabase.from('documentos').update(payload).eq('id', editingItem.id)
        : await supabase.from('documentos').insert([{ ...payload, created_at: new Date().toISOString() }]);

      if (error) {
        throw error;
      }

      toast({ title: editingItem ? 'Documento atualizado' : 'Documento criado' });
      handleCloseDialog();
      fetchDocumentos();
    } catch (err: unknown) {
      if (uploadedPath) {
        await supabase.storage.from('documentos').remove([uploadedPath]);
      }
      const message = err instanceof Error ? err.message : 'Ocorreu um erro.';
      toast({ title: 'Erro ao salvar', description: message, variant: 'destructive' });
    }
  };

  const handleEdit = (item: Documento) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      descricao: item.descricao,
      arquivo_url: item.arquivo_url,
      local_exibicao: item.local_exibicao,
      ativo: item.ativo,
    });
    if (isSuperAdmin) {
      setSelectedSetorId(item.setor_id || 'global');
    }
    setDocumentFile(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: Documento) => {
    const confirmed = await confirm({ title: 'Excluir documento', description: 'Deseja excluir este documento?' });
    if (!confirmed) return;

    const { error } = await supabase.from('documentos').delete().eq('id', item.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }

    setDocumentos((current) => current.filter((documento) => documento.id !== item.id));
    toast({ title: 'Documento excluido' });
  };

  const handleToggleAtivo = async (item: Documento) => {
    const confirmed = await confirm({
      title: item.ativo ? 'Desativar documento' : 'Ativar documento',
      description: item.ativo
        ? `Deseja desativar o documento "${item.nome}"?`
        : `Deseja ativar o documento "${item.nome}"?`,
    });
    if (!confirmed) return;

    const { error } = await supabase
      .from('documentos')
      .update({ ativo: !item.ativo, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: item.ativo ? 'Documento desativado' : 'Documento ativado' });
    setDocumentos((current) =>
      current.map((currentItem) => (currentItem.id === item.id ? { ...currentItem, ativo: !currentItem.ativo } : currentItem)),
    );
  };

  const filteredDocumentos = useMemo(() => {
    return documentos.filter((documento) => {
      if (selectedStatus === 'ativos' && !documento.ativo) return false;
      if (selectedStatus === 'inativos' && documento.ativo) return false;
      if (selectedLocal !== 'todos' && documento.local_exibicao !== selectedLocal) return false;
      return `${documento.nome} ${documento.descricao || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    });
  }, [documentos, searchTerm, selectedStatus, selectedLocal]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedStatus !== 'todos') count++;
    if (selectedLocal !== 'todos') count++;
    return count;
  }, [selectedStatus, selectedLocal]);

  const columns = [
    {
      header: 'Nome',
      accessor: (item: Documento) => item.nome,
      className: 'min-w-[200px]',
    },
    {
      header: 'Descricao',
      accessor: (item: Documento) => item.descricao || '-',
      className: 'max-w-md truncate',
    },
    {
      header: 'Local',
      accessor: (item: Documento) => LOCAL_EXIBICAO_OPTIONS.find((o) => o.value === item.local_exibicao)?.label || item.local_exibicao,
    },
    {
      header: 'Escopo',
      accessor: (item: Documento) => setores.find((setor) => setor.id === item.setor_id)?.nome || 'Global',
    },
    {
      header: 'Status',
      accessor: (item: Documento) => (
        <Badge
          variant="outline"
          className={cn(
            'rounded-full px-3 py-1 text-xs font-bold',
            item.ativo ? statusBadgeClasses.ativo : statusBadgeClasses.inativo,
          )}
        >
          {item.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
  ];

  function renderMobileDocumentoCard(item: Documento) {
    return (
      <div
        key={item.id}
        className="rounded-[34px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-slate-900">{item.nome}</p>
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-slate-500">
              {item.descricao || 'Sem descricao'}
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em]',
              item.ativo
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-500',
            )}
          >
            {item.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Local</p>
            <p className="mt-0.5 font-semibold text-slate-800">
              {LOCAL_EXIBICAO_OPTIONS.find((o) => o.value === item.local_exibicao)?.label || item.local_exibicao}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Escopo</p>
            <p className="mt-0.5 font-semibold text-slate-800">
              {setores.find((setor) => setor.id === item.setor_id)?.nome || 'Global'}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 flex-1 rounded-xl text-[13px] font-semibold text-slate-600"
            onClick={() => handleEdit(item)}
          >
            Editar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 flex-1 rounded-xl text-[13px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleDelete(item)}
          >
            Excluir
          </Button>
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
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-sky-100/70 md:text-[11px]">Biblioteca digital</p>
                <h1 className="mt-2 text-xl font-black tracking-[-0.05em] text-white sm:text-2xl md:mt-3 md:text-[32px] md:tracking-[-0.07em] lg:text-[38px]">Documentos</h1>
                <p className="mt-1.5 hidden max-w-xl text-[13px] leading-5 text-white md:block md:mt-2 md:text-[14px] md:leading-6">
                  {isDemutranSector
                    ? 'Gerencie documentos publicados exclusivamente no DEMUTRAN.'
                    : 'Cadastre, edite e gerencie documentos publicos com controle de escopo e exibicao por setor.'}
                </p>
              </div>

              <div className="mt-3 hidden shrink-0 flex-row gap-2 sm:flex">
                {isSuperAdmin && (
                  <Select value={selectedSetorId} onValueChange={setSelectedSetorId}>
                    <SelectTrigger className="w-[220px] rounded-[18px] border-white/20 bg-white/10 text-white">
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      {setores.map((setor) => (
                        <SelectItem key={setor.id} value={setor.id}>
                          {setor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2 rounded-[18px] bg-white text-slate-900 hover:bg-slate-100">
                  <Plus className="h-4 w-4" />
                  Novo
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard title="Total" value={documentos.length} subtitle="Documentos cadastrados" icon={FileText} />
              <SummaryCard title="Ativos" value={documentos.filter((doc) => doc.ativo).length} subtitle="Documentos disponiveis" icon={Eye} />
              <SummaryCard title="Inativos" value={documentos.filter((doc) => !doc.ativo).length} subtitle="Documentos ocultos" icon={X} />
              <SummaryCard title="Locais" value={new Set(documentos.map((doc) => doc.local_exibicao)).size} subtitle="Locais de exibicao" icon={FileText} />
            </div>

            <div className="flex gap-2 sm:hidden">
              {isSuperAdmin && (
                <Select value={selectedSetorId} onValueChange={setSelectedSetorId}>
                  <SelectTrigger className="h-12 flex-1 rounded-[18px] border-white/20 bg-white/10 text-white">
                    <SelectValue placeholder="Setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    {setores.map((setor) => (
                      <SelectItem key={setor.id} value={setor.id}>
                        {setor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button onClick={() => setIsDialogOpen(true)} className="h-12 flex-1 gap-2 rounded-[18px] bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                Novo
              </Button>
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
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Status</Label>
                  <select
                    className="flex h-12 w-full appearance-none rounded-[18px] border border-slate-200 bg-slate-50 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:20px] bg-[center_right_12px] px-4 pr-11 text-[15px] font-medium text-slate-900"
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value as 'todos' | 'ativos' | 'inativos')}
                  >
                    <option value="todos">Todos os status</option>
                    <option value="ativos">Somente ativos</option>
                    <option value="inativos">Somente inativos</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Local de exibicao</Label>
                  <select
                    className="flex h-12 w-full appearance-none rounded-[18px] border border-slate-200 bg-slate-50 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:20px] bg-[center_right_12px] px-4 pr-11 text-[15px] font-medium text-slate-900"
                    value={selectedLocal}
                    onChange={(event) => setSelectedLocal(event.target.value)}
                  >
                    <option value="todos">Todos os locais</option>
                    {LOCAL_EXIBICAO_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
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
                    placeholder="Nome, descricao..."
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

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando documentos...</div>
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {filteredDocumentos.map((item) => renderMobileDocumentoCard(item))}
              {filteredDocumentos.length === 0 && (
                <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
                  Nenhum documento cadastrado
                </div>
              )}
            </div>
            <div className="hidden overflow-hidden rounded-[22px] border border-border bg-card lg:block">
              <DataTable
                data={filteredDocumentos}
                columns={columns}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleAtivo={handleToggleAtivo}
                emptyMessage="Nenhum documento cadastrado"
              />
            </div>
          </>
        )}

        <ResponsiveDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) handleCloseDialog();
          }}
          title={editingItem ? 'Editar documento' : 'Novo documento'}
          description="Preencha os dados do documento"
          onCancel={handleCloseDialog}
          onConfirm={handleSubmit}
          confirmLabel={editingItem ? 'Atualizar' : 'Criar'}
        >
          <DocumentoForm
            formData={formData}
            setFormData={setFormData}
            documentFile={documentFile}
            setDocumentFile={setDocumentFile}
            isSuperAdmin={isSuperAdmin}
            isDemutranSector={isDemutranSector}
            selectedSetorId={selectedSetorId}
            setSelectedSetorId={setSelectedSetorId}
            setores={setores}
          />
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
  icon: typeof FileText;
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

export default Documentos;
