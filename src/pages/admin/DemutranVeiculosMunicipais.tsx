import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Building2, Calendar, CarFront, CheckCircle, Clock, Download, Eye, FileSpreadsheet, IdCard, Search, ShieldCheck, SlidersHorizontal, Upload, User, X } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { buildReportFileName, exportReportCsv, formatReportDateTime, openPdfPrintReport } from '@/lib/reports';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { DemutranVeiculoMunicipal } from '@/types/admin';
import * as XLSX from 'xlsx';

const SECRETARIAS = [
  'Administracao',
  'Agricultura e recursos hidricos',
  'Assistencia social',
  'Camara de vereadores',
  'Controladoria geral',
  'Desenvolvimento economico e turismo',
  'Educacao',
  'Fundacao de esporte e lazer',
  'Gabinete',
  'Infra estrutura',
  'Ipmc',
  'Meio ambiente',
  'Procuradoria do municipio',
  'Saae',
  'Saude',
  'Seguranca publica',
] as const;

const initialForm = {
  placa: '',
  chassi: '',
  secretaria_responsavel: '',
  motorista_responsavel: '',
  tipo: '',
  ano: '',
  modelo: '',
  marca: '',
  cor: '',
  principal_local_atuacao: '',
  observacao: '',
  ativo: true,
};

const normalizePlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

const DemutranVeiculosMunicipais = () => {
  const { confirm, confirmDialog } = useConfirmDialog();
  const { isSuperAdmin, setorId } = useAuth();
  const [items, setItems] = useState<DemutranVeiculoMunicipal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DemutranVeiculoMunicipal | null>(null);
  const [viewingItem, setViewingItem] = useState<DemutranVeiculoMunicipal | null>(null);
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [selectedSecretaria, setSelectedSecretaria] = useState<string>('todas');
  const [selectedStatus, setSelectedStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isCustomReportDialogOpen, setIsCustomReportDialogOpen] = useState(false);
  const [selectedReportOption, setSelectedReportOption] = useState('todos');
  const [selectedReportFormat, setSelectedReportFormat] = useState<'csv' | 'pdf'>('csv');
  const [selectedCustomReportFormat, setSelectedCustomReportFormat] = useState<'csv' | 'pdf'>('csv');
  const [isImporting, setIsImporting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    let query = supabase
      .from('demutran_veiculos_municipais')
      .select('*');

    if (!isSuperAdmin && setorId) {
      query = query.eq('setor_id', setorId);
    }

    query = query.order('secretaria_responsavel').order('placa');

    const { data, error } = await query;

    if (error) {
      toast({ title: 'Erro ao carregar frota', description: error.message, variant: 'destructive' });
    } else {
      setItems((data || []) as DemutranVeiculoMunicipal[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClose = () => {
    setEditingItem(null);
    setFormData(initialForm);
    setIsDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!formData.placa.trim() || !formData.chassi.trim() || !formData.secretaria_responsavel) {
      toast({ title: 'Campos obrigatorios', description: 'Preencha placa, chassi e secretaria.', variant: 'destructive' });
      return;
    }

    const payload = {
      placa: normalizePlate(formData.placa),
      chassi: formData.chassi.trim().toUpperCase(),
      secretaria_responsavel: formData.secretaria_responsavel,
      motorista_responsavel: formData.motorista_responsavel.trim() || null,
      tipo: formData.tipo.trim() || null,
      ano: formData.ano.trim() || null,
      modelo: formData.modelo.trim() || null,
      marca: formData.marca.trim() || null,
      cor: formData.cor.trim() || null,
      principal_local_atuacao: formData.principal_local_atuacao.trim() || null,
      observacao: formData.observacao.trim() || null,
      ativo: formData.ativo,
      updated_at: new Date().toISOString(),
    };

    const { error } = editingItem
      ? await supabase.from('demutran_veiculos_municipais').update(payload).eq('id', editingItem.id)
      : await supabase.from('demutran_veiculos_municipais').insert([{ ...payload, created_at: new Date().toISOString() }]);

    if (error) {
      toast({ title: 'Erro ao salvar veiculo', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: editingItem ? 'Veiculo atualizado' : 'Veiculo cadastrado' });
    handleClose();
    loadData();
  };

  const handleEdit = useCallback((item: DemutranVeiculoMunicipal) => {
    setEditingItem(item);
    setFormData({
      placa: item.placa,
      chassi: item.chassi,
      secretaria_responsavel: item.secretaria_responsavel,
      motorista_responsavel: item.motorista_responsavel || '',
      tipo: item.tipo || '',
      ano: item.ano || '',
      modelo: item.modelo || '',
      marca: item.marca || '',
      cor: item.cor || '',
      principal_local_atuacao: item.principal_local_atuacao || '',
      observacao: item.observacao || '',
      ativo: item.ativo,
    });
    setIsDialogOpen(true);
  }, []);

  const handleView = useCallback((item: DemutranVeiculoMunicipal) => {
    setViewingItem(item);
  }, []);

  const handleDelete = useCallback(async (item: DemutranVeiculoMunicipal) => {
    const confirmed = await confirm({ title: 'Excluir veículo', description: `Excluir o cadastro do veículo ${item.placa}?` });
    if (!confirmed) return;

    const { error } = await supabase.from('demutran_veiculos_municipais').delete().eq('id', item.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Veiculo excluido' });
    setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
  }, [confirm]);

  const handleDownloadModelo = () => {
    const wb = XLSX.utils.book_new();
    const headers = ['Placa', 'Chassi', 'Secretaria Responsavel', 'Motorista Responsavel', 'Tipo', 'Ano', 'Modelo', 'Marca', 'Cor', 'Principal Local Atuacao', 'Observacao'];
    const ws = XLSX.utils.aoa_to_sheet([headers, ['', '', '', '', '']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Frota');
    XLSX.writeFile(wb, 'modelo-frota-municipal.xlsx');
  };

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!setorId) {
      toast({ title: 'Setor nao identificado', description: 'Nao foi possivel identificar o setor do usuario.', variant: 'destructive' });
      return;
    }

    setIsImporting(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const payload: Record<string, unknown>[] = [];

      const normalizeHeader = (header: string) =>
        header
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9_]/g, '')
          .trim();

      for (const sheetName of workbook.SheetNames) {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
          header: 1,
          defval: '',
        });

        const headerIndex = rows.findIndex((row) =>
          Array.isArray(row) && row.some((cell) => normalizeHeader(String(cell || '')) === 'placa'),
        );

        if (headerIndex === -1) continue;

        const headers = (rows[headerIndex] as unknown[]).map((cell) => normalizeHeader(String(cell || '')));
        const dataRows = rows.slice(headerIndex + 1);

        const columnMap: Record<string, number> = {};
        headers.forEach((header, index) => {
          if (header === 'placa') columnMap.placa = index;
          else if (header === 'chassi') columnMap.chassi = index;
          else if (header === 'secretaria_responsavel' || header === 'secretaria' || header === 'orgao') columnMap.secretaria_responsavel = index;
          else if (header === 'motorista_responsavel' || header === 'motorista') columnMap.motorista_responsavel = index;
          else if (header === 'tipo') columnMap.tipo = index;
          else if (header === 'ano') columnMap.ano = index;
          else if (header === 'modelo') columnMap.modelo = index;
          else if (header === 'marca') columnMap.marca = index;
          else if (header === 'cor') columnMap.cor = index;
          else if (header === 'principal_local_atuacao' || header === 'local_atuacao') columnMap.principal_local_atuacao = index;
          else if (header === 'observacao' || header === 'obs' || header === 'observacoes') columnMap.observacao = index;
          else if (header === 'ativo' || header === 'status' || header === 'situacao') columnMap.ativo = index;
        });

        if (columnMap.placa === undefined || columnMap.chassi === undefined || columnMap.secretaria_responsavel === undefined) {
          throw new Error(`A aba "${sheetName}" nao possui as colunas obrigatorias (placa, chassi, secretaria).`);
        }

        for (const row of dataRows) {
          if (!Array.isArray(row)) continue;

          const placa = normalizePlate(String(row[columnMap.placa] || '').trim());
          const chassi = String(row[columnMap.chassi] || '').trim().toUpperCase();
          const secretaria = String(row[columnMap.secretaria_responsavel] || '').trim();

          if (!placa || !chassi || !secretaria) continue;

          const motorista = columnMap.motorista_responsavel !== undefined
            ? String(row[columnMap.motorista_responsavel] || '').trim() || null
            : null;

          const tipo = columnMap.tipo !== undefined
            ? String(row[columnMap.tipo] || '').trim() || null
            : null;

          const ano = columnMap.ano !== undefined
            ? String(row[columnMap.ano] || '').trim() || null
            : null;

          const modelo = columnMap.modelo !== undefined
            ? String(row[columnMap.modelo] || '').trim() || null
            : null;

          const marca = columnMap.marca !== undefined
            ? String(row[columnMap.marca] || '').trim() || null
            : null;

          const cor = columnMap.cor !== undefined
            ? String(row[columnMap.cor] || '').trim() || null
            : null;

          const principalLocalAtuacao = columnMap.principal_local_atuacao !== undefined
            ? String(row[columnMap.principal_local_atuacao] || '').trim() || null
            : null;

          const observacao = columnMap.observacao !== undefined
            ? String(row[columnMap.observacao] || '').trim() || null
            : null;

          let ativo = true;
          if (columnMap.ativo !== undefined) {
            const rawAtivo = String(row[columnMap.ativo] || '').trim().toLowerCase();
            ativo = rawAtivo === '' || rawAtivo === '1' || rawAtivo === 'sim' || rawAtivo === 'ativo' || rawAtivo === 'true';
          }

          payload.push({
            setor_id: setorId,
            placa,
            chassi,
            secretaria_responsavel: secretaria,
            motorista_responsavel: motorista,
            tipo,
            ano,
            modelo,
            marca,
            cor,
            principal_local_atuacao: principalLocalAtuacao,
            observacao,
            ativo,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      if (!payload.length) {
        toast({ title: 'Planilha vazia', description: 'Nenhuma linha valida foi encontrada.', variant: 'destructive' });
        setIsImporting(false);
        return;
      }

      const confirmed = await confirm({
        title: 'Importar veiculos',
        description: `Deseja importar ${payload.length} veiculo(s) para a frota municipal? Esta acao nao pode ser desfeita.`,
      });
      if (!confirmed) {
        setIsImporting(false);
        return;
      }

      const { error } = await supabase.from('demutran_veiculos_municipais').insert(payload);
      if (error) throw error;

      toast({ title: 'Importacao concluida', description: `${payload.length} veiculo(s) importado(s) com sucesso.` });
      loadData();
      setIsImportDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erro ao importar', description: error instanceof Error ? error.message : 'Erro inesperado.', variant: 'destructive' });
      setIsImportDialogOpen(false);
    } finally {
      setIsImporting(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedSecretaria !== 'todas' && item.secretaria_responsavel !== selectedSecretaria) {
        return false;
      }
      if (selectedStatus === 'ativos' && !item.ativo) {
        return false;
      }
      if (selectedStatus === 'inativos' && item.ativo) {
        return false;
      }
      return `${item.placa} ${item.chassi} ${item.secretaria_responsavel} ${item.motorista_responsavel || ''} ${item.tipo || ''} ${item.ano || ''} ${item.modelo || ''} ${item.marca || ''} ${item.cor || ''} ${item.principal_local_atuacao || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    });
  }, [items, searchTerm, selectedSecretaria, selectedStatus]);

  const secretariaStats = useMemo(() => {
    const stats = new Map<string, { total: number; ativos: number }>();
    items.forEach((item) => {
      const current = stats.get(item.secretaria_responsavel) || { total: 0, ativos: 0 };
      current.total += 1;
      if (item.ativo) current.ativos += 1;
      stats.set(item.secretaria_responsavel, current);
    });

    return Array.from(stats.entries())
      .map(([secretaria, data]) => ({ secretaria, ...data, inativos: data.total - data.ativos }))
      .sort((a, b) => b.total - a.total);
  }, [items]);

  const filteredSecretariaCards = useMemo(() => {
    if (selectedSecretaria === 'todas') return secretariaStats;
    return secretariaStats.filter((s) => s.secretaria === selectedSecretaria);
  }, [secretariaStats, selectedSecretaria]);

  const columns = useMemo(() => [
    { header: 'Placa', accessor: 'placa' as const },
    { header: 'Chassi', accessor: 'chassi' as const },
    { header: 'Tipo', accessor: (item: DemutranVeiculoMunicipal) => item.tipo || '-' },
    { header: 'Ano', accessor: (item: DemutranVeiculoMunicipal) => item.ano || '-' },
    { header: 'Modelo', accessor: (item: DemutranVeiculoMunicipal) => item.modelo || '-' },
    { header: 'Marca', accessor: (item: DemutranVeiculoMunicipal) => item.marca || '-' },
    { header: 'Cor', accessor: (item: DemutranVeiculoMunicipal) => item.cor || '-' },
    { header: 'Secretaria', accessor: 'secretaria_responsavel' as const },
    { header: 'Local Atuacao', accessor: (item: DemutranVeiculoMunicipal) => item.principal_local_atuacao || '-' },
    { header: 'Motorista', accessor: (item: DemutranVeiculoMunicipal) => item.motorista_responsavel || '-' },
    {
      header: 'Status',
      accessor: (item: DemutranVeiculoMunicipal) => (
        <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs font-bold', item.ativo ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-800 border-slate-200')}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
  ], []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedSecretaria !== 'todas') count++;
    if (selectedStatus !== 'todos') count++;
    return count;
  }, [selectedSecretaria, selectedStatus]);

  const activeCount = items.filter((item) => item.ativo).length;
  const inactiveCount = items.length - activeCount;
  const secretariaCount = secretariaStats.length;

  const baseFleetRows = (rows: DemutranVeiculoMunicipal[]) =>
    rows.map((item) => ({
      Placa: item.placa,
      Chassi: item.chassi,
      Tipo: item.tipo || '-',
      Ano: item.ano || '-',
      Modelo: item.modelo || '-',
      Marca: item.marca || '-',
      Cor: item.cor || '-',
      Secretaria: item.secretaria_responsavel,
      Local_atuacao: item.principal_local_atuacao || '-',
      Motorista: item.motorista_responsavel || '-',
      Status: item.ativo ? 'Ativo' : 'Inativo',
      Observacao: item.observacao || '-',
      Criado_em: formatReportDateTime(item.created_at),
      Atualizado_em: formatReportDateTime(item.updated_at),
    }));

  const handleGenerateReport = () => {
    const reportMap: Record<string, { title: string; rows: ReturnType<typeof baseFleetRows> }> = {
      filtros_aplicados: { title: 'Frota com filtros aplicados', rows: baseFleetRows(filteredItems) },
      todos: { title: 'Frota completa', rows: baseFleetRows(filteredItems) },
      ativos: { title: 'Frota ativa', rows: baseFleetRows(filteredItems.filter((item) => item.ativo)) },
      inativos: { title: 'Frota inativa', rows: baseFleetRows(filteredItems.filter((item) => !item.ativo)) },
      secretaria_atual: {
        title: selectedSecretaria === 'todas' ? 'Frota por secretaria filtrada' : `Frota - ${selectedSecretaria}`,
        rows: baseFleetRows(filteredItems.filter((item) => selectedSecretaria === 'todas' || item.secretaria_responsavel === selectedSecretaria)),
      },
    };
    const selected = reportMap[selectedReportOption];
    if (!selected?.rows.length) {
      toast({ title: 'Sem dados', description: 'Nao existem registros para o relatorio selecionado.', variant: 'destructive' });
      return;
    }
    const fileName = buildReportFileName('frota-municipal', selected.title);
    if (selectedReportFormat === 'csv') {
      exportReportCsv(fileName, selected.rows);
    } else {
      openPdfPrintReport(selected.title, [{ name: selected.title, rows: selected.rows }]);
    }
    setIsReportDialogOpen(false);
  };

  const handleGenerateCustomReport = () => {
    const rows = baseFleetRows(filteredItems);
    if (!rows.length) {
      toast({ title: 'Sem dados', description: 'Nao existem registros para os filtros aplicados.', variant: 'destructive' });
      return;
    }
    const fileName = buildReportFileName('frota-municipal', 'filtros-aplicados');
    if (selectedCustomReportFormat === 'csv') {
      exportReportCsv(fileName, rows);
    } else {
      openPdfPrintReport('Frota com filtros aplicados', [{ name: 'Filtros aplicados', rows }]);
    }
    setIsCustomReportDialogOpen(false);
  };

  const renderMobileCard = useCallback((item: DemutranVeiculoMunicipal) => {
    return (
      <div
        key={item.id}
        className="rounded-[34px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-slate-900">{item.placa}</p>
            <p className="mt-0.5 text-[13px] leading-5 text-slate-500">
              {item.secretaria_responsavel}
            </p>
          </div>
          <Badge variant="outline" className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold', item.ativo ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-800 border-slate-200')}>
            {item.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
          <div className="col-span-2 rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Chassi</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.chassi}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Tipo</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.tipo || '-'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Ano</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.ano || '-'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Modelo</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.modelo || '-'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Marca</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.marca || '-'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Cor</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.cor || '-'}</p>
          </div>
          <div className="col-span-2 rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Local de atuacao</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.principal_local_atuacao || '-'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Motorista</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.motorista_responsavel || '-'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Observacao</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.observacao || '-'}</p>
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
            className="h-9 flex-1 rounded-xl text-[13px] font-semibold text-slate-600"
            onClick={() => handleView(item)}
          >
            Detalhes
          </Button>
        </div>
      </div>
    );
  }, [handleEdit, handleView]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#2563eb_100%)] md:rounded-[34px]">
          <div className="space-y-4 px-4 pb-4 pt-5 md:space-y-6 md:px-6 md:pb-5 md:pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-sky-100/70 md:text-[11px]">Estacionamento rotativo</p>
                <h1 className="mt-2 text-xl font-black tracking-[-0.05em] text-white sm:text-2xl md:mt-3 md:text-[32px] md:tracking-[-0.07em] lg:text-[38px]">Frota Municipal</h1>
                <p className="mt-1.5 hidden max-w-xl text-[13px] leading-5 text-white md:block md:mt-2 md:text-[14px] md:leading-6">
                  Cadastre os veiculos oficiais com placa, chassi e secretaria responsavel.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard title="Total" value={items.length} subtitle="Veiculos cadastrados" icon={CarFront} />
              <SummaryCard title="Ativos" value={activeCount} subtitle="Veiculos em operacao" icon={ShieldCheck} />
              <SummaryCard title="Inativos" value={inactiveCount} subtitle="Veiculos desativados" icon={X} />
              <SummaryCard title="Secretarias" value={secretariaCount} subtitle="Orgaos com frota" icon={Building2} />
            </div>
          </div>
        </section>

        <div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Situacao por secretaria</h2>
              <p className="text-sm text-muted-foreground">Distribuicao dos veiculos da frota municipal por orgao responsavel.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredSecretariaCards.length > 0 ? (
              filteredSecretariaCards.map(({ secretaria, total, ativos, inativos }) => (
                <div key={secretaria} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-foreground">{secretaria}</h3>
                    <Badge variant="outline" className="rounded-full bg-white">
                      {total} {total === 1 ? 'veiculo' : 'veiculos'}
                    </Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Ativos</p>
                      <p className="font-semibold text-emerald-700">{ativos}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Inativos</p>
                      <p className="font-semibold text-slate-600">{inativos}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-sm text-muted-foreground py-8">
                Nenhum veiculo cadastrado nesta secretaria.
              </div>
            )}
          </div>
        </div>

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
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Secretaria</Label>
                  <select
                    className="flex h-12 w-full appearance-none rounded-[18px] border border-slate-200 bg-slate-50 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:20px] bg-[center_right_12px] px-4 pr-11 text-[15px] font-medium text-slate-900"
                    value={selectedSecretaria}
                    onChange={(event) => setSelectedSecretaria(event.target.value)}
                  >
                    <option value="todas">Todas as secretarias</option>
                    {SECRETARIAS.map((secretaria) => (
                      <option key={secretaria} value={secretaria}>
                        {secretaria}
                      </option>
                    ))}
                  </select>
                </div>
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
              </div>

              <div className="mt-3 space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Busca</Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="h-12 w-full rounded-[18px] border-slate-200 bg-slate-50 pl-11 text-[15px] font-medium"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Placa, chassi ou secretaria..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setFiltrosAbertos(true)}
          className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_8px_32px_-8px_rgba(15,23,42,0.45)] transition-all hover:bg-slate-800 active:scale-95 lg:hidden ${filtrosAbertos ? 'hidden' : ''}`}
        >
          <SlidersHorizontal className="h-6 w-6" />
        </button>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {activeFiltersCount > 0 && (
            <Button type="button" variant="outline" onClick={() => setIsCustomReportDialogOpen(true)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Relatorio personalizado
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => setIsReportDialogOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Gerar relatorio
          </Button>
          <Button type="button" variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <IdCard className="h-4 w-4" />
            Novo Veiculo
          </Button>
        </div>

        {loading ? (
          <div className="rounded-[22px] border border-border bg-card p-8 text-center text-muted-foreground">Carregando frota...</div>
        ) : (
          <FleetResultsSection
            items={filteredItems}
            columns={columns}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            renderMobileCard={renderMobileCard}
          />
        )}

        <ResponsiveDialog
          open={isCustomReportDialogOpen}
          onOpenChange={setIsCustomReportDialogOpen}
          title="Relatorio personalizado"
          description="Gerar relatorio exatamente com os filtros aplicados. Escolha o formato."
          onCancel={() => setIsCustomReportDialogOpen(false)}
          onConfirm={handleGenerateCustomReport}
          confirmLabel={selectedCustomReportFormat === 'csv' ? 'Baixar CSV' : 'Gerar PDF'}
        >
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={selectedCustomReportFormat} onValueChange={(value) => setSelectedCustomReportFormat(value as 'csv' | 'pdf')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={isReportDialogOpen}
          onOpenChange={setIsReportDialogOpen}
          title="Gerar relatorio"
          description="Escolha o recorte da frota e o formato."
          onCancel={() => setIsReportDialogOpen(false)}
          onConfirm={handleGenerateReport}
          confirmLabel={selectedReportFormat === 'csv' ? 'Baixar CSV' : 'Gerar PDF'}
        >
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tipo de relatorio</Label>
              <Select value={selectedReportOption} onValueChange={setSelectedReportOption}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="filtros_aplicados">Resultado dos filtros aplicados</SelectItem>
                  <SelectItem value="todos">Todos os veiculos</SelectItem>
                  <SelectItem value="ativos">Somente ativos</SelectItem>
                  <SelectItem value="inativos">Somente inativos</SelectItem>
                  <SelectItem value="secretaria_atual">Secretaria filtrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={selectedReportFormat} onValueChange={(value) => setSelectedReportFormat(value as 'csv' | 'pdf')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={editingItem ? 'Editar veiculo municipal' : 'Novo veiculo municipal'}
          description="Preencha os dados do veiculo oficial."
          onCancel={handleClose}
          onConfirm={handleSubmit}
          confirmLabel={editingItem ? 'Salvar alteracoes' : 'Cadastrar'}
        >
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="placa">Placa *</Label>
                <Input id="placa" value={formData.placa} onChange={(event) => setFormData((current) => ({ ...current, placa: normalizePlate(event.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chassi">Chassi *</Label>
                <Input id="chassi" value={formData.chassi} onChange={(event) => setFormData((current) => ({ ...current, chassi: event.target.value.toUpperCase() }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secretaria">Secretaria / orgao responsavel *</Label>
              <Select
                value={formData.secretaria_responsavel}
                onValueChange={(value) => setFormData((current) => ({ ...current, secretaria_responsavel: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a secretaria" />
                </SelectTrigger>
                <SelectContent>
                  {SECRETARIAS.map((secretaria) => (
                    <SelectItem key={secretaria} value={secretaria}>
                      {secretaria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData((current) => ({ ...current, tipo: value }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carro">Carro</SelectItem>
                    <SelectItem value="moto">Moto</SelectItem>
                    <SelectItem value="caminhao">Caminhao</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="onibus">Onibus</SelectItem>
                    <SelectItem value="picape">Picape</SelectItem>
                    <SelectItem value="utilitario">Utilitario</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ano">Ano</Label>
                <Input id="ano" value={formData.ano} onChange={(event) => setFormData((current) => ({ ...current, ano: event.target.value }))} placeholder="Ex: 2022" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cor">Cor</Label>
                <Input id="cor" value={formData.cor} onChange={(event) => setFormData((current) => ({ ...current, cor: event.target.value }))} placeholder="Ex: Branco" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="marca">Marca</Label>
                <Input id="marca" value={formData.marca} onChange={(event) => setFormData((current) => ({ ...current, marca: event.target.value }))} placeholder="Ex: Ford" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo</Label>
                <Input id="modelo" value={formData.modelo} onChange={(event) => setFormData((current) => ({ ...current, modelo: event.target.value }))} placeholder="Ex: Fiesta" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="motorista">Motorista(s)</Label>
              <Input id="motorista" value={formData.motorista_responsavel} onChange={(event) => setFormData((current) => ({ ...current, motorista_responsavel: event.target.value }))} placeholder="Nome(s) do(s) motorista(s) responsavel(is)" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="local_atuacao">Principal local de atuacao</Label>
              <Input id="local_atuacao" value={formData.principal_local_atuacao} onChange={(event) => setFormData((current) => ({ ...current, principal_local_atuacao: event.target.value }))} placeholder="Ex: Centro, Zona Sul, vias principais..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacao">Observacao</Label>
              <Textarea id="observacao" rows={3} value={formData.observacao} onChange={(event) => setFormData((current) => ({ ...current, observacao: event.target.value }))} />
            </div>

            <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
              <Switch checked={formData.ativo} onCheckedChange={(checked) => setFormData((current) => ({ ...current, ativo: checked }))} />
              <span className="text-sm text-muted-foreground">{formData.ativo ? 'Cadastro ativo' : 'Cadastro inativo'}</span>
            </div>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={Boolean(viewingItem)}
          onOpenChange={(open) => { if (!open) setViewingItem(null); }}
          title="Detalhes do veiculo"
          description={viewingItem ? `${viewingItem.placa} • ${viewingItem.secretaria_responsavel}` : ''}
        >
          {viewingItem && <ViewDetailsModalContent item={viewingItem} />}
        </ResponsiveDialog>
      </div>
      {confirmDialog}

      <ResponsiveDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        title="Importacao em massa"
        description="Baixe o modelo preenchido e faca o upload dos dados."
      >
        <div className="space-y-6 py-4">
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
            <p className="text-sm font-medium text-slate-700">1. Baixe o modelo da planilha</p>
            <p className="mt-1 text-xs text-slate-500">Preencha os dados no arquivo modelo e depois importe abaixo.</p>
            <Button type="button" variant="outline" className="mt-4 gap-2" onClick={handleDownloadModelo}>
              <Download className="h-4 w-4" />
              Baixar modelo
            </Button>
          </div>

          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
            <p className="text-sm font-medium text-slate-700">2. Selecione o arquivo preenchido</p>
            <p className="mt-1 text-xs text-slate-500">Formatos aceitos: .xlsx, .xls, .csv</p>
            <label className="mt-4 inline-flex cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileImport}
                disabled={isImporting}
              />
              <Button type="button" variant="default" className="gap-2" disabled={isImporting} asChild>
                <span>
                  <Upload className="h-4 w-4" />
                  {isImporting ? 'Importando...' : 'Selecionar arquivo'}
                </span>
              </Button>
            </label>
          </div>
        </div>
      </ResponsiveDialog>
    </AdminLayout>
  );
};

const FleetResultsSection = memo(function FleetResultsSection({
  items,
  columns,
  onView,
  onEdit,
  onDelete,
  renderMobileCard,
}: {
  items: DemutranVeiculoMunicipal[];
  columns: Array<{
    header: string;
    accessor: keyof DemutranVeiculoMunicipal | ((item: DemutranVeiculoMunicipal) => ReactNode);
    render?: (value: unknown, item: DemutranVeiculoMunicipal) => ReactNode;
    className?: string;
  }>;
  onView: (item: DemutranVeiculoMunicipal) => void;
  onEdit: (item: DemutranVeiculoMunicipal) => void;
  onDelete: (item: DemutranVeiculoMunicipal) => void;
  renderMobileCard: (item: DemutranVeiculoMunicipal) => ReactNode;
}) {
  return (
    <>
      <div className="space-y-3 lg:hidden">
        {items.map((item) => renderMobileCard(item))}
        {items.length === 0 && (
          <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
            Nenhum veiculo encontrado
          </div>
        )}
      </div>
      <div className="hidden overflow-hidden rounded-[22px] border border-border bg-card lg:block">
        <DataTable data={items} columns={columns} onView={onView} onEdit={onEdit} onDelete={onDelete} emptyMessage="Nenhum veiculo cadastrado" />
      </div>
    </>
  );
});

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: typeof CarFront;
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

function ViewDetailsModalContent({
  item,
}: {
  item: DemutranVeiculoMunicipal;
}) {
  return (
    <div className="space-y-5 py-2">
      <div className="rounded-xl border-2 border-yellow-400 bg-white shadow-lg">
        <div className="bg-yellow-400 px-5 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-900/60">Brasil</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-yellow-900/50">Veiculo oficial</span>
          </div>
          <div className="mt-2 flex items-baseline justify-center gap-3">
            <span className="text-[36px] font-black tracking-[0.06em] text-yellow-900">{item.placa}</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100 px-5 py-4">
          <div className="flex items-center justify-between py-3">
            <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              <CarFront className="h-3.5 w-3.5" />
              Chassi
            </span>
            <span className="text-[14px] font-bold text-slate-800">{item.chassi}</span>
          </div>
          {(item.tipo || item.ano || item.modelo || item.marca || item.cor) && (
            <div className="grid grid-cols-2 gap-3 py-3">
              {item.tipo && (
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Tipo</span>
                  <p className="mt-0.5 text-[14px] font-semibold text-slate-800">{item.tipo}</p>
                </div>
              )}
              {item.ano && (
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Ano</span>
                  <p className="mt-0.5 text-[14px] font-semibold text-slate-800">{item.ano}</p>
                </div>
              )}
              {item.modelo && (
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Modelo</span>
                  <p className="mt-0.5 text-[14px] font-semibold text-slate-800">{item.modelo}</p>
                </div>
              )}
              {item.marca && (
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Marca</span>
                  <p className="mt-0.5 text-[14px] font-semibold text-slate-800">{item.marca}</p>
                </div>
              )}
              {item.cor && (
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Cor</span>
                  <p className="mt-0.5 text-[14px] font-semibold text-slate-800">{item.cor}</p>
                </div>
              )}
            </div>
          )}
          {item.principal_local_atuacao && (
            <div className="flex items-center justify-between py-3">
              <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">Local de atuacao</span>
              <span className="text-[14px] font-semibold text-slate-800 text-right max-w-[60%]">{item.principal_local_atuacao}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-3">
            <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              <Building2 className="h-3.5 w-3.5" />
              Secretaria
            </span>
            <span className="text-[14px] font-semibold text-slate-800 text-right max-w-[60%]">{item.secretaria_responsavel}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              <User className="h-3.5 w-3.5" />
              Motorista
            </span>
            <span className="text-[14px] font-semibold text-slate-800">{item.motorista_responsavel || '-'}</span>
          </div>
          {item.observacao && (
            <div className="flex items-center justify-between py-3">
              <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">Observacao</span>
              <span className="text-[14px] font-semibold text-slate-800 text-right max-w-[60%]">{item.observacao}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-5 py-3">
        <span className="flex items-center gap-2 text-[12px] text-slate-500">
          <Calendar className="h-3.5 w-3.5" />
          Cadastro
        </span>
        <span className="text-[13px] font-medium text-slate-700">
          {item.created_at && new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div className="flex justify-center">
        <div className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-bold',
          item.ativo
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
        )}>
          <div className={cn(
            'h-2 w-2 rounded-full',
            item.ativo ? 'bg-emerald-500' : 'bg-slate-400'
          )} />
          {item.ativo ? 'Veiculo ativo na frota' : 'Veiculo inativo'}
        </div>
      </div>
    </div>
  );
}

export default DemutranVeiculosMunicipais;
