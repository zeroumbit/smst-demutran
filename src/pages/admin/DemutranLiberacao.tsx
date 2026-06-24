import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Car, CheckCircle2, CircleDollarSign, Eye, FileSpreadsheet, Plus, Search, SlidersHorizontal, Warehouse, X } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { buildReportFileName, exportReportCsv, formatReportCurrency, formatReportDateTime, openPdfPrintReport } from '@/lib/reports';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { maskCpf } from '@/lib/masks';
import type { Setor, VeiculoRecolhido } from '@/types/admin';

const custodyOptions = [
  { value: 'automoveis', label: 'Automoveis' },
  { value: 'motos', label: 'Motos' },
  { value: 'motos_delegacia', label: 'Motos de Delegacia' },
  { value: 'veiculos_forum', label: 'Veiculos de Forum' },
] as const;

const emptyApreensaoForm = {
  placa: '',
  chassi: '',
  descricao_veiculo: '',
  proprietario_nome: '',
  proprietario_cpf_cnpj: '',
  data_recolhimento: '',
  motivo: '',
  situacao: 'Apreendido',
  local_custodia: 'automoveis' as VeiculoRecolhido['local_custodia'],
  numero_liberacao: '',
  observacao: '',
};

const emptyLiberacaoForm = {
  data_liberacao: '',
  situacao: 'Liberado',
  numero_liberacao: '',
  observacao: '',
};

const emptyTaxaForm = {
  taxa_diaria: '',
};

const normalizePlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
const normalizeHeader = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

const sheetToCustodyMap: Record<string, VeiculoRecolhido['local_custodia']> = {
  automoveis: 'automoveis',
  motos: 'motos',
  motos_delegacia: 'motos_delegacia',
  veiculos_processo_forum: 'veiculos_forum',
};

const getCustodyLabel = (value: VeiculoRecolhido['local_custodia']) =>
  custodyOptions.find((option) => option.value === value)?.label || value;

const buildSyntheticPlate = (sheetName: string, rowNumber: number, chassi: string) => {
  const sheetPrefix = normalizeHeader(sheetName).replace(/_/g, '').slice(0, 8).toUpperCase() || 'IMPORT';
  const chassiSuffix = chassi.replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase();
  return normalizePlate(`SEMPLACA${sheetPrefix}${chassiSuffix || rowNumber}`);
};

const buildDateOnlyIso = (day: string, month: string, yearRaw: string) => {
  const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
  const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const parseLiberacaoDate = (value: string | null) => {
  if (!value) return null;

  const trimmed = value.trim().replace(/\/{2,}/g, '/');
  if (!trimmed) return null;

  const match = trimmed.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return buildDateOnlyIso(day, month, year);
};

const extractLiberacaoMetadata = (value: unknown) => {
  const text = String(value || '').trim();
  if (!text) {
    return { texto: null, dataIso: null, marcadoLiberado: false };
  }

  return {
    texto: text,
    dataIso: parseLiberacaoDate(text),
    marcadoLiberado: /liberad/i.test(text),
  };
};

const parseSpreadsheetDate = (value: unknown) => {
  if (!value) return null;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S).toISOString();
  }
  const asString = String(value).trim();
  if (!asString) return null;
  const directMatch = asString.replace(/\/{2,}/g, '/').match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (directMatch) {
    const [, day, month, year] = directMatch;
    return buildDateOnlyIso(day, month, year);
  }
  const parsed = new Date(asString);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const formatDateOnly = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR') : 'Nao informado';

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('pt-BR') : 'Nao informado';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const getTaxaDiariaValue = (item: VeiculoRecolhido) => Number(item.taxa_diaria || 0);

const getDiasEstadia = (item: VeiculoRecolhido) => {
  const entrada = new Date(item.data_recolhimento);
  const referencia = item.data_liberacao ? new Date(item.data_liberacao) : new Date();

  if (Number.isNaN(entrada.getTime()) || Number.isNaN(referencia.getTime())) {
    return 0;
  }

  const diff = referencia.getTime() - entrada.getTime();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
};

const getValorEstadia = (item: VeiculoRecolhido) =>
  getTaxaDiariaValue(item) * getDiasEstadia(item);

const getVehicleKind = (item: VeiculoRecolhido) =>
  item.local_custodia === 'motos' || item.local_custodia === 'motos_delegacia' ? 'Moto' : 'Carro';

const DemutranLiberacao = () => {
  const { isSuperAdmin, setorId, profile } = useAuth();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [veiculos, setVeiculos] = useState<VeiculoRecolhido[]>([]);
  const [selectedSetorId, setSelectedSetorId] = useState<string>('');
  const [searchTermPatio, setSearchTermPatio] = useState('');
  const [searchTermLiberados, setSearchTermLiberados] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroOrigem, setFiltroOrigem] = useState<string>('todos');
  const [filtroAno, setFiltroAno] = useState<string>('todos');
  const [dataEntradaInicio, setDataEntradaInicio] = useState('');
  const [dataEntradaFim, setDataEntradaFim] = useState('');
  const [dataSaidaInicio, setDataSaidaInicio] = useState('');
  const [dataSaidaFim, setDataSaidaFim] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [loading, setLoading] = useState(true);

  const [isApreensaoDialogOpen, setIsApreensaoDialogOpen] = useState(false);
  const [isDetalhesDialogOpen, setIsDetalhesDialogOpen] = useState(false);
  const [isLiberacaoDialogOpen, setIsLiberacaoDialogOpen] = useState(false);
  const [isTaxaDialogOpen, setIsTaxaDialogOpen] = useState(false);
  const [isCpfDialogOpen, setIsCpfDialogOpen] = useState(false);
  const [cpfEditItem, setCpfEditItem] = useState<VeiculoRecolhido | null>(null);
  const [cpfEditValue, setCpfEditValue] = useState('');
  const [cpfEditJustificativa, setCpfEditJustificativa] = useState('');
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isCustomReportDialogOpen, setIsCustomReportDialogOpen] = useState(false);
  const [selectedReportOption, setSelectedReportOption] = useState('patio_todos');
  const [selectedReportFormat, setSelectedReportFormat] = useState<'csv' | 'pdf'>('csv');
  const [selectedCustomReportFormat, setSelectedCustomReportFormat] = useState<'csv' | 'pdf'>('csv');

  const [detalhesItem, setDetalhesItem] = useState<VeiculoRecolhido | null>(null);
  const [liberacaoItem, setLiberacaoItem] = useState<VeiculoRecolhido | null>(null);
  const [taxaItem, setTaxaItem] = useState<VeiculoRecolhido | null>(null);
  const [taxaMode, setTaxaMode] = useState<'single' | 'all'>('single');
  const [apreensaoForm, setApreensaoForm] = useState(emptyApreensaoForm);
  const [liberacaoForm, setLiberacaoForm] = useState(emptyLiberacaoForm);
  const [taxaForm, setTaxaForm] = useState(emptyTaxaForm);

  const effectiveSetorId = isSuperAdmin ? selectedSetorId : (setorId || '');

  const loadSetores = async () => {
    const { data, error } = await supabase.rpc('get_manageable_setores');
    if (error) {
      toast({ title: 'Erro ao carregar setores', description: error.message, variant: 'destructive' });
      return;
    }

    const demutranOnly = ((data || []) as Setor[]).filter((setor) => setor.slug === 'demutran');
    setSetores(demutranOnly);

    if (!selectedSetorId && demutranOnly[0]?.id) {
      setSelectedSetorId(setorId || demutranOnly[0].id);
    }
  };

  const loadVeiculos = async () => {
    if (!effectiveSetorId) {
      setVeiculos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('veiculos_recolhidos')
      .select('*')
      .eq('setor_id', effectiveSetorId)
      .order('data_recolhimento', { ascending: false });

    if (error) {
      toast({ title: 'Erro ao carregar veiculos', description: error.message, variant: 'destructive' });
    } else {
      setVeiculos((data || []) as VeiculoRecolhido[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadSetores();
  }, []);

  useEffect(() => {
    if (effectiveSetorId) {
      loadVeiculos();
    }
  }, [effectiveSetorId]);

  const apreendidos = useMemo(
    () => veiculos.filter((item) => item.status !== 'liberado'),
    [veiculos],
  );

  const liberados = useMemo(
    () => veiculos.filter((item) => item.status === 'liberado'),
    [veiculos],
  );

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    veiculos.forEach((item) => {
      if (item.data_recolhimento) {
        const year = new Date(item.data_recolhimento).getFullYear();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [veiculos]);

  const matchData = (value: string | null, inicio: string, fim: string) => {
    if (!value) return !inicio && !fim;
    const date = value.slice(0, 10);
    if (inicio && date < inicio) return false;
    if (fim && date > fim) return false;
    return true;
  };

  const filteredApreendidos = useMemo(() => {
    return apreendidos.filter((item) => {
      const searchMatch =
        `${item.placa} ${item.descricao_veiculo} ${item.chassi || ''} ${item.local_custodia} ${item.situacao}`.toLowerCase().includes(searchTermPatio.toLowerCase());

      const isMoto = item.local_custodia === 'motos' || item.local_custodia === 'motos_delegacia';
      const tipoMatch = filtroTipo === 'todos' || (filtroTipo === 'moto' && isMoto) || (filtroTipo === 'carro' && !isMoto);

      const isForum = item.local_custodia === 'veiculos_forum';
      const isDelegacia = item.local_custodia === 'motos_delegacia';
      const origemMatch = filtroOrigem === 'todos'
        || (filtroOrigem === 'forum' && isForum)
        || (filtroOrigem === 'delegacia' && isDelegacia)
        || (filtroOrigem === 'padrao' && !isForum && !isDelegacia);

      const entradaMatch = matchData(item.data_recolhimento, dataEntradaInicio, dataEntradaFim);

      const anoMatch = filtroAno === 'todos' || new Date(item.data_recolhimento).getFullYear() === Number(filtroAno);

      return searchMatch && tipoMatch && origemMatch && entradaMatch && anoMatch;
    });
  }, [apreendidos, searchTermPatio, filtroTipo, filtroOrigem, dataEntradaInicio, dataEntradaFim, filtroAno]);

  const filteredLiberados = useMemo(() => {
    return liberados.filter((item) => {
      const searchMatch =
        `${item.placa} ${item.descricao_veiculo} ${item.chassi || ''} ${item.local_custodia} ${item.situacao} ${item.numero_liberacao || ''}`.toLowerCase().includes(searchTermLiberados.toLowerCase());

      const isMoto = item.local_custodia === 'motos' || item.local_custodia === 'motos_delegacia';
      const tipoMatch = filtroTipo === 'todos' || (filtroTipo === 'moto' && isMoto) || (filtroTipo === 'carro' && !isMoto);

      const isForum = item.local_custodia === 'veiculos_forum';
      const isDelegacia = item.local_custodia === 'motos_delegacia';
      const origemMatch = filtroOrigem === 'todos'
        || (filtroOrigem === 'forum' && isForum)
        || (filtroOrigem === 'delegacia' && isDelegacia)
        || (filtroOrigem === 'padrao' && !isForum && !isDelegacia);

      const entradaMatch = matchData(item.data_recolhimento, dataEntradaInicio, dataEntradaFim);
      const saidaMatch = matchData(item.data_liberacao, dataSaidaInicio, dataSaidaFim);

      const anoMatch = filtroAno === 'todos' || new Date(item.data_recolhimento).getFullYear() === Number(filtroAno);

      return searchMatch && tipoMatch && origemMatch && entradaMatch && saidaMatch && anoMatch;
    });
  }, [liberados, searchTermLiberados, filtroTipo, filtroOrigem, dataEntradaInicio, dataEntradaFim, dataSaidaInicio, dataSaidaFim, filtroAno]);

  const filteredConsolidado = useMemo(() => {
    return veiculos.filter((item) => {
      const isMoto = item.local_custodia === 'motos' || item.local_custodia === 'motos_delegacia';
      const tipoMatch = filtroTipo === 'todos' || (filtroTipo === 'moto' && isMoto) || (filtroTipo === 'carro' && !isMoto);

      const isForum = item.local_custodia === 'veiculos_forum';
      const isDelegacia = item.local_custodia === 'motos_delegacia';
      const origemMatch = filtroOrigem === 'todos'
        || (filtroOrigem === 'forum' && isForum)
        || (filtroOrigem === 'delegacia' && isDelegacia)
        || (filtroOrigem === 'padrao' && !isForum && !isDelegacia);

      const entradaMatch = matchData(item.data_recolhimento, dataEntradaInicio, dataEntradaFim);
      const saidaMatch = matchData(item.data_liberacao, dataSaidaInicio, dataSaidaFim);

      const anoMatch = filtroAno === 'todos' || new Date(item.data_recolhimento).getFullYear() === Number(filtroAno);

      return tipoMatch && origemMatch && entradaMatch && saidaMatch && anoMatch;
    });
  }, [veiculos, filtroTipo, filtroOrigem, dataEntradaInicio, dataEntradaFim, dataSaidaInicio, dataSaidaFim, filtroAno]);

  const activeFiltersCount = useMemo(
    () =>
      [filtroTipo !== 'todos', filtroOrigem !== 'todos', filtroAno !== 'todos', dataEntradaInicio, dataEntradaFim, dataSaidaInicio, dataSaidaFim]
        .filter(Boolean).length,
    [dataEntradaFim, dataEntradaInicio, dataSaidaFim, dataSaidaInicio, filtroAno, filtroOrigem, filtroTipo],
  );

  const valorAcumulado = useMemo(
    () => veiculos.reduce((acc, item) => acc + getValorEstadia(item), 0),
    [veiculos],
  );

  const vehicleRows = (items: VeiculoRecolhido[]) =>
    items.map((item) => ({
      Placa: item.placa,
      Chassi: item.chassi || '-',
      Descricao: item.descricao_veiculo,
      Tipo: getVehicleKind(item),
      Local_custodia: getCustodyLabel(item.local_custodia),
      Proprietario: item.proprietario_nome || '-',
      CPF_CNPJ: item.proprietario_cpf_cnpj || '-',
      Entrada: formatReportDateTime(item.data_recolhimento),
      Liberacao: formatReportDateTime(item.data_liberacao),
      Numero_liberacao: item.numero_liberacao || '-',
      Liberado_por: item.liberado_por || '-',
      Status: item.status,
      Situacao: item.situacao,
      Taxa_diaria: formatReportCurrency(getTaxaDiariaValue(item)),
      Dias_estadia: getDiasEstadia(item),
      Valor_estadia: formatReportCurrency(getValorEstadia(item)),
    }));

  const buildSelectedVehicleReport = () => {
    const reportMap: Record<string, { title: string; rows: ReturnType<typeof vehicleRows> }> = {
      filtros_aplicados: { title: 'Veiculos com filtros aplicados', rows: vehicleRows(filteredConsolidado) },
      patio_todos: { title: 'Veiculos no patio', rows: vehicleRows(filteredApreendidos) },
      patio_carros: { title: 'Carros no patio', rows: vehicleRows(filteredApreendidos.filter((item) => getVehicleKind(item) === 'Carro')) },
      patio_motos: { title: 'Motos no patio', rows: vehicleRows(filteredApreendidos.filter((item) => getVehicleKind(item) === 'Moto')) },
      liberados_todos: { title: 'Veiculos liberados', rows: vehicleRows(filteredLiberados) },
      liberados_carros: { title: 'Carros liberados', rows: vehicleRows(filteredLiberados.filter((item) => getVehicleKind(item) === 'Carro')) },
      liberados_motos: { title: 'Motos liberadas', rows: vehicleRows(filteredLiberados.filter((item) => getVehicleKind(item) === 'Moto')) },
      origem_forum: { title: 'Veiculos do forum', rows: vehicleRows(filteredConsolidado.filter((item) => item.local_custodia === 'veiculos_forum')) },
      origem_delegacia: { title: 'Motos de delegacia', rows: vehicleRows(filteredConsolidado.filter((item) => item.local_custodia === 'motos_delegacia')) },
      consolidado_geral: { title: 'Consolidado geral', rows: vehicleRows(filteredConsolidado) },
    };

    return reportMap[selectedReportOption];
  };

  const handleGenerateVehicleReport = () => {
    const report = buildSelectedVehicleReport();

    if (!report || !report.rows.length) {
      toast({ title: 'Sem dados', description: 'Nao existem registros para o relatorio selecionado.', variant: 'destructive' });
      return;
    }

    const fileName = buildReportFileName('veiculos-recolhidos', report.title);

    if (selectedReportFormat === 'csv') {
      exportReportCsv(fileName, report.rows);
    } else {
      openPdfPrintReport(report.title, [{ name: report.title, rows: report.rows }]);
    }

    setIsReportDialogOpen(false);
  };

  const handleGenerateCustomVehicleReport = () => {
    const rows = vehicleRows(filteredConsolidado);
    if (!rows.length) {
      toast({ title: 'Sem dados', description: 'Nao existem registros para os filtros aplicados.', variant: 'destructive' });
      return;
    }

    const fileName = buildReportFileName('veiculos-recolhidos', 'filtros-aplicados');
    if (selectedCustomReportFormat === 'csv') {
      exportReportCsv(fileName, rows);
    } else {
      openPdfPrintReport('Veiculos com filtros aplicados', [{ name: 'Filtros aplicados', rows }]);
    }
    setIsCustomReportDialogOpen(false);
  };

  const closeApreensaoDialog = () => {
    setApreensaoForm(emptyApreensaoForm);
    setIsApreensaoDialogOpen(false);
  };

  const closeLiberacaoDialog = () => {
    setLiberacaoItem(null);
    setLiberacaoForm(emptyLiberacaoForm);
    setIsLiberacaoDialogOpen(false);
  };

  const closeTaxaDialog = () => {
    setTaxaItem(null);
    setTaxaMode('single');
    setTaxaForm(emptyTaxaForm);
    setIsTaxaDialogOpen(false);
  };

  const handleSubmitApreensao = async () => {
    if (!effectiveSetorId || !apreensaoForm.placa || !apreensaoForm.data_recolhimento || !apreensaoForm.descricao_veiculo || !apreensaoForm.motivo || !apreensaoForm.situacao) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Preencha entrada, placa, descricao do veiculo, motivo e situacao.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      setor_id: effectiveSetorId,
      placa: normalizePlate(apreensaoForm.placa),
      chassi: apreensaoForm.chassi.trim() || null,
      descricao_veiculo: apreensaoForm.descricao_veiculo.trim(),
      proprietario_nome: apreensaoForm.proprietario_nome.trim() || 'Nao informado',
      proprietario_cpf_cnpj: apreensaoForm.proprietario_cpf_cnpj.trim() || null,
      data_recolhimento: new Date(apreensaoForm.data_recolhimento).toISOString(),
      motivo: apreensaoForm.motivo.trim(),
      status: 'recolhido',
      situacao: apreensaoForm.situacao.trim(),
      local_custodia: apreensaoForm.local_custodia,
      numero_liberacao: apreensaoForm.local_custodia === 'motos_delegacia'
        ? apreensaoForm.numero_liberacao.trim() || null
        : null,
      observacao: apreensaoForm.observacao.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data: insertData, error } = await supabase.rpc('recolher_veiculo', {
      _placa: apreensaoForm.placa,
      _proprietario_nome: apreensaoForm.proprietario_nome.trim() || 'Nao informado',
      _proprietario_cpf_cnpj: apreensaoForm.proprietario_cpf_cnpj.trim() || null,
      _chassi: apreensaoForm.chassi.trim() || null,
      _descricao_veiculo: apreensaoForm.descricao_veiculo.trim(),
      _data_recolhimento: new Date(apreensaoForm.data_recolhimento).toISOString(),
      _motivo: apreensaoForm.motivo.trim(),
      _situacao: apreensaoForm.situacao.trim(),
      _local_custodia: apreensaoForm.local_custodia,
      _observacao: apreensaoForm.observacao.trim() || null,
    });
    if (error) {
      toast({ title: 'Erro ao salvar apreensao', description: error.message, variant: 'destructive' });
      return;
    }

    const protocolo = insertData?.[0]?.protocolo;
    toast({
      title: 'Apreensao cadastrada',
      description: protocolo
        ? `Protocolo: ${protocolo} — forneca ao proprietario para consulta online.`
        : 'O veiculo entrou para a relacao de patio.',
    });
    closeApreensaoDialog();
    loadVeiculos();
  };

  const handleSubmitLiberacao = async () => {
    if (!liberacaoItem || !liberacaoForm.data_liberacao) {
      toast({ title: 'Campos obrigatorios', description: 'Informe a data de liberacao.', variant: 'destructive' });
      return;
    }

    if (liberacaoItem.local_custodia === 'motos_delegacia' && !liberacaoForm.numero_liberacao.trim()) {
      toast({ title: 'Campo obrigatorio', description: 'Informe o numero da liberacao para motos de delegacia.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.rpc('liberar_veiculo_recolhido', {
      _veiculo_id: liberacaoItem.id,
      _data_liberacao: new Date(liberacaoForm.data_liberacao).toISOString(),
      _numero_liberacao: liberacaoForm.numero_liberacao.trim() || null,
      _situacao: liberacaoForm.situacao.trim() || 'Liberado',
      _observacao: liberacaoForm.observacao.trim() || null,
    });

    if (error) {
      toast({ title: 'Erro ao liberar veiculo', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Veiculo liberado', description: 'O registro foi movido para a aba de liberacoes.' });
    closeLiberacaoDialog();
    loadVeiculos();
  };

  const handleSubmitTaxa = async () => {
    const taxa = Number(String(taxaForm.taxa_diaria).replace(',', '.'));

    if (Number.isNaN(taxa) || taxa < 0) {
      toast({ title: 'Valor invalido', description: 'Informe um valor diario valido.', variant: 'destructive' });
      return;
    }

    if (taxaMode === 'all') {
      if (!effectiveSetorId) {
        toast({ title: 'Setor nao selecionado', description: 'Selecione o setor do DEMUTRAN.', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.rpc('atualizar_taxa_diaria_veiculos_recolhidos_setor', {
        _setor_id: effectiveSetorId,
        _taxa_diaria: taxa,
      });

      if (error) {
        toast({ title: 'Erro ao atualizar taxa em massa', description: error.message, variant: 'destructive' });
        return;
      }

      toast({
        title: 'Taxa diaria atualizada',
        description: `${data || 0} veiculo(s) receberam a nova taxa diaria.`,
      });
      closeTaxaDialog();
      loadVeiculos();
      return;
    }

    if (!taxaItem) {
      toast({ title: 'Veiculo nao selecionado', description: 'Escolha um veiculo para atualizar.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.rpc('atualizar_taxa_veiculo_recolhido', {
      _veiculo_id: taxaItem.id,
      _taxa_diaria: taxa,
    });

    if (error) {
      toast({ title: 'Erro ao atualizar taxa', description: error.message, variant: 'destructive' });
      return;
    }

    toast({
      title: 'Taxa diaria atualizada',
      description: `A taxa diaria do veiculo ${taxaItem.placa} foi atualizada.`,
    });
    closeTaxaDialog();
    loadVeiculos();
  };

  const openDetalhes = (item: VeiculoRecolhido) => {
    setDetalhesItem(item);
    setIsDetalhesDialogOpen(true);
  };

  const openCpfDialog = (item: VeiculoRecolhido) => {
    setCpfEditItem(item);
    setCpfEditValue(item.proprietario_cpf_cnpj || '');
    setCpfEditJustificativa('');
    setIsCpfDialogOpen(true);
  };

  const closeCpfDialog = () => {
    setCpfEditItem(null);
    setCpfEditValue('');
    setCpfEditJustificativa('');
    setIsCpfDialogOpen(false);
  };

  const handleSubmitCpf = async () => {
    if (!cpfEditItem) return;

    if (!cpfEditJustificativa.trim()) {
      toast({ title: 'Justificativa obrigatoria', description: 'Informe o motivo da alteracao do CPF/CNPJ.', variant: 'destructive' });
      return;
    }

    const cpfNumeros = cpfEditValue.replace(/\D/g, '');
    if (cpfNumeros.length !== 11 && cpfNumeros.length !== 14) {
      toast({ title: 'CPF/CNPJ invalido', description: 'Informe um CPF (11 digitos) ou CNPJ (14 digitos) valido.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.rpc('atualizar_cpf_veiculo_recolhido', {
      _veiculo_id: cpfEditItem.id,
      _cpf_cnpj: cpfEditValue,
      _justificativa: cpfEditJustificativa.trim(),
    });

    if (error) {
      toast({ title: 'Erro ao atualizar CPF', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'CPF/CNPJ atualizado', description: 'O CPF/CNPJ do proprietario foi salvo com sucesso.' });
    closeCpfDialog();
    loadVeiculos();
  };

  const openTaxaDialog = (item?: VeiculoRecolhido) => {
    setTaxaItem(item || null);
    setTaxaMode(item ? 'single' : 'all');
    setTaxaForm({
      taxa_diaria: item ? String(getTaxaDiariaValue(item)).replace('.', ',') : '',
    });
    setIsTaxaDialogOpen(true);
  };

  const openLiberacaoDialog = (item: VeiculoRecolhido) => {
    setLiberacaoItem(item);
    setLiberacaoForm({
      data_liberacao: new Date().toISOString().slice(0, 16),
      situacao: 'Liberado',
      numero_liberacao: item.numero_liberacao || '',
      observacao: '',
    });
    setIsLiberacaoDialogOpen(true);
  };

  const handleMassUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!effectiveSetorId) {
      toast({ title: 'Setor nao selecionado', description: 'Selecione o setor do DEMUTRAN antes de importar.', variant: 'destructive' });
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const skippedRows: string[] = [];
      const payload = workbook.SheetNames.flatMap((sheetName) => {
        const normalizedSheetName = normalizeHeader(sheetName);
        const localCustodia = sheetToCustodyMap[normalizedSheetName];

        if (!localCustodia) {
          return [];
        }

        const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
          header: 1,
          defval: '',
        });

        const headerIndex = rows.findIndex((row) =>
          Array.isArray(row) && row.some((cell) => normalizeHeader(String(cell || '')) === 'placa'),
        );

        if (headerIndex === -1) {
          throw new Error(`A aba "${sheetName}" nao possui cabecalho reconhecido.`);
        }

        const headers = (rows[headerIndex] as unknown[]).map((cell) => normalizeHeader(String(cell || '')));
        const dataRows = rows.slice(headerIndex + 1);
        const situacaoIndex = headers.findIndex((header) => header === 'situacao' || header === 'situacao_detran');
        const unnamedAfterSituacaoIndex = headers.findIndex(
          (header, position) => position > situacaoIndex && header === '',
        );

        return dataRows
          .map((row, index) => {
            if (!Array.isArray(row)) {
              return null;
            }

            const normalized = Object.fromEntries(
              headers.map((header, headerPosition) => [header, row[headerPosition]]),
            );

            const rawPlate = String(normalized.placa || '').trim();
            const chassi = String(normalized.chassi || '').trim().toUpperCase();
            const plateValue = normalizePlate(rawPlate);
            const descricaoVeiculo = String(normalized.descricao_do_veiculo || normalized.veiculo || normalized.descricao_veiculo || '').trim();
            const motivo = String(normalized.motivo_da_apreensao || normalized.motivo || '').trim();
            const situacao = String(normalized.situacao_detran || normalized.situacao || '').trim();
            const dataRecolhimento = parseSpreadsheetDate(normalized.entrada || normalized.data || normalized.entrada_recolhimento || normalized.data_de_entrada);
            const liberacaoTextoPrincipal = String(normalized.liberacao || '').trim();
            const liberacaoTextoSecundario = unnamedAfterSituacaoIndex >= 0
              ? String(row[unnamedAfterSituacaoIndex] || '').trim()
              : '';
            const liberacaoMetadata = extractLiberacaoMetadata(liberacaoTextoPrincipal || liberacaoTextoSecundario);
            const ordem = String(normalized[''] || '').trim();
            const placa = plateValue || buildSyntheticPlate(sheetName, headerIndex + index + 2, chassi);

            const isEmptyRow = !plateValue && !descricaoVeiculo && !motivo && !situacao && !dataRecolhimento && !ordem && !chassi;
            if (isEmptyRow) {
              return null;
            }

            if (!descricaoVeiculo || !dataRecolhimento) {
              skippedRows.push(`Aba "${sheetName}", linha ${headerIndex + index + 2}`);
              return null;
            }

            const liberadoNaPlanilha = Boolean(liberacaoMetadata.dataIso);

            return {
              setor_id: effectiveSetorId,
              placa,
              chassi: chassi || null,
              descricao_veiculo: descricaoVeiculo,
              proprietario_nome: 'Nao informado',
              proprietario_cpf_cnpj: null,
              data_recolhimento: dataRecolhimento,
              data_liberacao: liberacaoMetadata.dataIso,
              motivo: motivo || 'Nao informado',
              status: liberadoNaPlanilha ? 'liberado' : 'recolhido',
              situacao: situacao || 'Nao informado',
              local_custodia: localCustodia,
              numero_liberacao: localCustodia === 'motos_delegacia' ? liberacaoMetadata.texto : null,
              importado_planilha: true,
              liberacao_registrada_no_sistema: false,
              observacao: [
                ordem ? `Linha original da planilha: ${ordem}` : null,
                !plateValue ? `Registro importado sem placa original na aba ${sheetName}.` : null,
                liberacaoMetadata.marcadoLiberado && !liberacaoMetadata.dataIso
                  ? `Marcado como liberado na planilha sem data valida: ${liberacaoMetadata.texto}`
                  : null,
              ].filter(Boolean).join(' ') || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          })
          .filter(Boolean);
      });

      if (!payload.length) {
        toast({ title: 'Planilha vazia', description: 'Nenhuma linha valida foi encontrada no modelo.', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.from('veiculos_recolhidos').insert(payload);
      if (error) {
        throw error;
      }

      toast({
        title: 'Cadastro em massa concluido',
        description: skippedRows.length
          ? `${payload.length} veiculo(s) importados. ${skippedRows.length} linha(s) foram ignoradas por falta de descricao ou data.`
          : `${payload.length} veiculo(s) foram importados para o patio.`,
      });
      loadVeiculos();
    } catch (error: any) {
      toast({
        title: 'Erro ao importar planilha',
        description: error.message || 'Nao foi possivel processar a planilha.',
        variant: 'destructive',
      });
    }
  };

  const apreensoesColumns = [
    { header: 'Entrada', accessor: (item: VeiculoRecolhido) => formatDateOnly(item.data_recolhimento) },
    { header: 'Placa', accessor: 'placa' as const },
    { header: 'Descricao', accessor: 'descricao_veiculo' as const },
    { header: 'Taxa/dia', accessor: (item: VeiculoRecolhido) => formatCurrency(getTaxaDiariaValue(item)) },
    { header: 'No patio', accessor: (item: VeiculoRecolhido) => getCustodyLabel(item.local_custodia) },
    { header: 'Situacao', accessor: 'situacao' as const },
    {
      header: 'Acoes',
      accessor: (item: VeiculoRecolhido) => (
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => openCpfDialog(item)}>
            <Search className="h-4 w-4" />
            CPF
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => openTaxaDialog(item)}>
            <CircleDollarSign className="h-4 w-4" />
            Taxa
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => openDetalhes(item)}>
            <Eye className="h-4 w-4" />
            Ver
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => openLiberacaoDialog(item)}>
            <CheckCircle2 className="h-4 w-4" />
            Liberar
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  const consolidadoColumns = [
    { header: 'Entrada', accessor: (item: VeiculoRecolhido) => formatDateOnly(item.data_recolhimento) },
    { header: 'Placa', accessor: 'placa' as const },
    { header: 'Descricao', accessor: 'descricao_veiculo' as const },
    { header: 'Taxa/dia', accessor: (item: VeiculoRecolhido) => formatCurrency(getTaxaDiariaValue(item)) },
    { header: 'Total estadia', accessor: (item: VeiculoRecolhido) => formatCurrency(getValorEstadia(item)) },
    { header: 'No patio', accessor: (item: VeiculoRecolhido) => getCustodyLabel(item.local_custodia) },
    { header: 'Situacao', accessor: 'situacao' as const },
    {
      header: 'Status',
      accessor: (item: VeiculoRecolhido) =>
        item.status === 'liberado'
          ? `Liberado em ${formatDateOnly(item.data_liberacao)}`
          : 'No patio',
    },
    {
      header: 'Liberacao',
      accessor: (item: VeiculoRecolhido) =>
        item.data_liberacao
          ? item.liberacao_registrada_no_sistema
            ? formatDateTime(item.data_liberacao)
            : formatDateOnly(item.data_liberacao)
          : '—',
    },
    {
      header: 'Acoes',
      accessor: (item: VeiculoRecolhido) => (
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => openDetalhes(item)}>
            <Eye className="h-4 w-4" />
            Ver
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  const liberacoesColumns = [
    {
      header: 'Liberacao',
      accessor: (item: VeiculoRecolhido) => (
        item.liberacao_registrada_no_sistema
          ? formatDateTime(item.data_liberacao)
          : formatDateOnly(item.data_liberacao)
      ),
    },
    { header: 'Placa', accessor: 'placa' as const },
    { header: 'Descricao', accessor: 'descricao_veiculo' as const },
    { header: 'Taxa/dia', accessor: (item: VeiculoRecolhido) => formatCurrency(getTaxaDiariaValue(item)) },
    { header: 'Total estadia', accessor: (item: VeiculoRecolhido) => formatCurrency(getValorEstadia(item)) },
    { header: 'No patio', accessor: (item: VeiculoRecolhido) => getCustodyLabel(item.local_custodia) },
    { header: 'Situacao', accessor: 'situacao' as const },
    { header: 'Liberado por', accessor: (item: VeiculoRecolhido) => item.liberado_por || '—' },
    {
      header: 'Acoes',
      accessor: (item: VeiculoRecolhido) => (
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => openTaxaDialog(item)}>
            <CircleDollarSign className="h-4 w-4" />
            Taxa
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => openDetalhes(item)}>
            <Eye className="h-4 w-4" />
            Ver
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  const renderMobileVehicleCard = (
    item: VeiculoRecolhido,
    mode: 'patio' | 'liberacao' | 'consolidado',
  ) => (
    <article
      key={item.id}
      className="overflow-hidden rounded-[28px] border border-slate-200/85 bg-white shadow-[0_20px_45px_-32px_rgba(15,23,42,0.38)]"
    >
      <div className="bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(30,41,59,0.96)_55%,_rgba(59,130,246,0.92)_100%)] px-4 pb-4 pt-3 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              {mode === 'patio' ? 'No patio' : mode === 'liberacao' ? 'Liberado' : item.status === 'liberado' ? 'Historico' : 'Em custodia'}
            </p>
            <h3 className="mt-2 text-[24px] font-black tracking-[-0.05em]">{item.placa}</h3>
            <p className="mt-1 truncate text-[14px] font-medium text-white/78">{item.descricao_veiculo}</p>
          </div>
          <div className="rounded-[20px] border border-white/15 bg-white/10 px-3 py-2 text-right backdrop-blur">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/65">Taxa/dia</p>
            <p className="mt-1 text-[15px] font-bold">{formatCurrency(getTaxaDiariaValue(item))}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold text-white/90">{getVehicleKind(item)}</span>
          <span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold text-white/90">{getCustodyLabel(item.local_custodia)}</span>
          <span className="rounded-full bg-emerald-400/18 px-3 py-1 text-[11px] font-semibold text-emerald-100">{item.situacao}</span>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <NativeInfoTile label="Entrada" value={formatDateOnly(item.data_recolhimento)} />
          <NativeInfoTile
            label={item.status === 'liberado' ? 'Saida' : 'Status'}
            value={item.status === 'liberado' ? formatDateOnly(item.data_liberacao) : 'No patio'}
          />
          <NativeInfoTile label="Dias" value={`${getDiasEstadia(item)} dia(s)`} />
          <NativeInfoTile label="Total" value={formatCurrency(getValorEstadia(item))} emphasis />
        </div>

        <div className="rounded-[22px] bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Protocolo</p>
          <p className="mt-1 text-[14px] font-mono font-semibold tracking-[-0.02em] text-primary">{item.protocolo}</p>
        </div>
        <div className="rounded-[22px] bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Proprietario</p>
            <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => openCpfDialog(item)}>
              {item.proprietario_cpf_cnpj ? 'Editar CPF' : 'Adicionar CPF'}
            </Button>
          </div>
          <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-slate-900">
            {item.proprietario_nome || 'Nao informado'}
          </p>
          <p className="mt-1 text-[13px] text-slate-500">{item.proprietario_cpf_cnpj || 'CPF/CNPJ nao informado'}</p>
        </div>
        {mode === 'liberacao' && item.liberado_por && (
          <div className="rounded-[22px] bg-emerald-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600">Liberado por</p>
            <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-emerald-900">{item.liberado_por}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button type="button" className="h-12 justify-center rounded-[18px] text-[15px] font-semibold" onClick={() => openDetalhes(item)}>
            <Eye className="mr-2 h-4 w-4" />
            Ver detalhes
          </Button>
          <div className="grid grid-cols-2 gap-2">
            {(mode === 'patio' || mode === 'liberacao') && (
              <Button type="button" variant="outline" className="h-11 rounded-[16px] text-[14px] font-semibold" onClick={() => openTaxaDialog(item)}>
                <CircleDollarSign className="mr-2 h-4 w-4" />
                Taxa
              </Button>
            )}
            {mode === 'patio' ? (
              <Button type="button" variant="outline" className="h-11 rounded-[16px] text-[14px] font-semibold" onClick={() => openLiberacaoDialog(item)}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Liberar
              </Button>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>
    </article>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-[34px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#2563eb_100%)]">
          <div className="space-y-6 px-5 pb-5 pt-6 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-100/70">Operacao de patio</p>
                <h1 className="mt-3 text-[32px] font-black tracking-[-0.07em] text-white sm:text-[38px]">Veiculos</h1>
                <p className="mt-2 max-w-xl text-[14px] leading-6 text-white">
              Gestao de apreensoes e liberacoes do {profile?.setor_nome || 'DEMUTRAN'}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard title="Total" value={veiculos.length} subtitle="Veiculos cadastrados" icon={Car} />
              <SummaryCard title="No patio" value={apreendidos.length} subtitle="Atualmente apreendidos" icon={Warehouse} />
              <SummaryCard title="Liberados" value={liberados.length} subtitle="Ja liberados" icon={CheckCircle2} />
              <SummaryCard title="Valor" value={formatCurrency(valorAcumulado)} subtitle="Total em taxas" icon={CircleDollarSign} />
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {isSuperAdmin && (
            <div className="w-full sm:max-w-xs">
              <Select value={selectedSetorId} onValueChange={setSelectedSetorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um setor" />
                </SelectTrigger>
                <SelectContent>
                  {setores.map((setor) => (
                    <SelectItem key={setor.id} value={setor.id}>
                      {setor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className={`lg:block ${filtrosAbertos ? 'block' : 'hidden'}`}>
          <div className="sticky top-0 z-10 bg-white pb-2 lg:rounded-[30px] lg:border lg:border-slate-200/80 lg:px-5 lg:pt-4">
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

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tipo</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="h-12 rounded-[18px] border-slate-200 bg-slate-50 text-[15px] font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="moto">Moto</SelectItem>
                    <SelectItem value="carro">Carro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Origem</Label>
                <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
                  <SelectTrigger className="h-12 rounded-[18px] border-slate-200 bg-slate-50 text-[15px] font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="padrao">Padrão</SelectItem>
                    <SelectItem value="forum">Fórum</SelectItem>
                    <SelectItem value="delegacia">Delegacia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Ano</Label>
                <Select value={filtroAno} onValueChange={setFiltroAno}>
                  <SelectTrigger className="h-12 rounded-[18px] border-slate-200 bg-slate-50 text-[15px] font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Entrada inicio</Label>
                  <Input type="date" value={dataEntradaInicio} onChange={(e) => setDataEntradaInicio(e.target.value)} className="h-12 rounded-[18px] border-slate-200 bg-slate-50 text-[15px] font-medium" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Entrada fim</Label>
                  <Input type="date" value={dataEntradaFim} onChange={(e) => setDataEntradaFim(e.target.value)} className="h-12 rounded-[18px] border-slate-200 bg-slate-50 text-[15px] font-medium" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Saida inicio</Label>
                  <Input type="date" value={dataSaidaInicio} onChange={(e) => setDataSaidaInicio(e.target.value)} className="h-12 rounded-[18px] border-slate-200 bg-slate-50 text-[15px] font-medium" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Saida fim</Label>
                  <Input type="date" value={dataSaidaFim} onChange={(e) => setDataSaidaFim(e.target.value)} className="h-12 rounded-[18px] border-slate-200 bg-slate-50 text-[15px] font-medium" />
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

        <Tabs defaultValue="patio" className="space-y-5">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {activeFiltersCount > 0 && (
              <Button type="button" variant="outline" className="gap-2" onClick={() => setIsCustomReportDialogOpen(true)}>
                <FileSpreadsheet className="h-4 w-4" />
                Relatorio personalizado
              </Button>
            )}
            <Button type="button" variant="outline" className="gap-2" onClick={() => setIsReportDialogOpen(true)}>
              <FileSpreadsheet className="h-4 w-4" />
              Gerar relatorio
            </Button>
          </div>
          <TabsList className="grid h-auto grid-cols-3 rounded-[26px] bg-slate-100/80 p-1.5">
            <TabsTrigger
              value="patio"
              className="rounded-[20px] px-3 py-3 text-[15px] font-bold tracking-[-0.02em] text-slate-500 shadow-none data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)]"
            >
              No patio
            </TabsTrigger>
            <TabsTrigger
              value="liberacoes"
              className="rounded-[20px] px-3 py-3 text-[15px] font-bold tracking-[-0.02em] text-slate-500 shadow-none data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)]"
            >
              Liberacoes
            </TabsTrigger>
            <TabsTrigger
              value="consolidado"
              className="rounded-[20px] px-3 py-3 text-[15px] font-bold tracking-[-0.02em] text-slate-500 shadow-none data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)]"
            >
              Consolidado
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patio" className="space-y-5">
            <div className="flex flex-col gap-3">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="h-12 rounded-[18px] border-slate-200 bg-slate-50 pl-11 text-[15px] font-medium"
                  value={searchTermPatio}
                  onChange={(event) => setSearchTermPatio(event.target.value)}
                  placeholder="Buscar por placa, descrição, pátio ou situação"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button type="button" variant="outline" className="h-12 gap-2 rounded-[18px] text-[14px] font-semibold" onClick={() => openTaxaDialog()} disabled={!effectiveSetorId}>
                  <CircleDollarSign className="h-4 w-4" />
                  Aplicar taxa em massa
                </Button>
                <label className="w-full">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleMassUpload}
                  />
                  <Button type="button" variant="outline" className="h-12 gap-2 rounded-[18px] text-[14px] font-semibold w-full" asChild>
                    <span>
                      <FileSpreadsheet className="h-4 w-4" />
                      Cadastro em Massa
                    </span>
                  </Button>
                </label>
                <Button onClick={() => setIsApreensaoDialogOpen(true)} className="h-12 gap-2 rounded-[18px] text-[14px] font-semibold w-full" disabled={!effectiveSetorId}>
                  <Plus className="w-4 h-4" />
                  Nova Apreensao
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando veículos no pátio...</div>
            ) : (
              <>
                {filteredApreendidos.length > 0 && (
                  <div className="flex flex-wrap items-center gap-4">
                    {(() => {
                      const carros = filteredApreendidos.filter((i) => i.local_custodia !== 'motos' && i.local_custodia !== 'motos_delegacia').length;
                      const motos = filteredApreendidos.filter((i) => i.local_custodia === 'motos' || i.local_custodia === 'motos_delegacia').length;
                      return (
                        <>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                            <span className="text-xs">🚗</span> Carros: {carros}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                            <span className="text-xs">🏍️</span> Motos: {motos}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
                            Total: {filteredApreendidos.length}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                )}
                <div className="space-y-3 lg:hidden">
                  {filteredApreendidos.map((item) => renderMobileVehicleCard(item, 'patio'))}
                </div>
                <div className="hidden overflow-hidden rounded-[22px] border border-border bg-card lg:block">
                  <DataTable data={filteredApreendidos} columns={apreensoesColumns} emptyMessage="Nenhum veículo apreendido no pátio" />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="liberacoes" className="space-y-5">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-12 rounded-[18px] border-slate-200 bg-slate-50 pl-11 text-[15px] font-medium"
                value={searchTermLiberados}
                onChange={(event) => setSearchTermLiberados(event.target.value)}
                placeholder="Buscar por placa, descrição, pátio, situação ou liberação"
              />
            </div>

            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando liberações...</div>
            ) : (
              <>
                {filteredLiberados.length > 0 && (
                  <div className="flex flex-wrap items-center gap-4">
                    {(() => {
                      const carros = filteredLiberados.filter((i) => i.local_custodia !== 'motos' && i.local_custodia !== 'motos_delegacia').length;
                      const motos = filteredLiberados.filter((i) => i.local_custodia === 'motos' || i.local_custodia === 'motos_delegacia').length;
                      return (
                        <>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                            <span className="text-xs">🚗</span> Carros: {carros}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                            <span className="text-xs">🏍️</span> Motos: {motos}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
                            Total: {filteredLiberados.length}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                )}
                <div className="space-y-3 lg:hidden">
                  {filteredLiberados.map((item) => renderMobileVehicleCard(item, 'liberacao'))}
                </div>
                <div className="hidden overflow-hidden rounded-[22px] border border-border bg-card lg:block">
                  <DataTable data={filteredLiberados} columns={liberacoesColumns} emptyMessage="Nenhum veículo liberado" />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="consolidado" className="space-y-5">
            {filteredConsolidado.length > 0 && (
              <div className="flex flex-wrap items-center gap-4">
                {(() => {
                  const carros = filteredConsolidado.filter((i) => i.local_custodia !== 'motos' && i.local_custodia !== 'motos_delegacia').length;
                  const motos = filteredConsolidado.filter((i) => i.local_custodia === 'motos' || i.local_custodia === 'motos_delegacia').length;
                  return (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        <span className="text-xs">🚗</span> Carros: {carros}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        <span className="text-xs">🏍️</span> Motos: {motos}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
                        Total: {filteredConsolidado.length}
                      </span>
                    </>
                  );
                })()}
              </div>
            )}
            <div className="space-y-3 lg:hidden">
              {filteredConsolidado.map((item) => renderMobileVehicleCard(item, 'consolidado'))}
            </div>
            <div className="hidden overflow-hidden rounded-[22px] border border-border bg-card lg:block">
              <DataTable
                data={filteredConsolidado}
                columns={consolidadoColumns}
                emptyMessage="Nenhum veículo encontrado para os filtros selecionados"
              />
            </div>
          </TabsContent>
        </Tabs>

        <ResponsiveDialog
          open={isCustomReportDialogOpen}
          onOpenChange={setIsCustomReportDialogOpen}
          title="Relatorio personalizado"
          description="Gerar relatorio exatamente com os filtros aplicados. Escolha o formato."
          onCancel={() => setIsCustomReportDialogOpen(false)}
          onConfirm={handleGenerateCustomVehicleReport}
          confirmLabel={selectedCustomReportFormat === 'csv' ? 'Baixar CSV' : 'Gerar PDF'}
        >
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={selectedCustomReportFormat} onValueChange={(value) => setSelectedCustomReportFormat(value as 'csv' | 'pdf')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
          description="Escolha o tipo de relatorio e o formato de saida."
          onCancel={() => setIsReportDialogOpen(false)}
          onConfirm={handleGenerateVehicleReport}
          confirmLabel={selectedReportFormat === 'csv' ? 'Baixar CSV' : 'Gerar PDF'}
        >
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Opcao de relatorio</Label>
              <Select value={selectedReportOption} onValueChange={setSelectedReportOption}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="filtros_aplicados">Resultado dos filtros aplicados</SelectItem>
                  <SelectItem value="patio_todos">Todos no patio</SelectItem>
                  <SelectItem value="patio_carros">Carros no patio</SelectItem>
                  <SelectItem value="patio_motos">Motos no patio</SelectItem>
                  <SelectItem value="liberados_todos">Todos liberados</SelectItem>
                  <SelectItem value="liberados_carros">Carros liberados</SelectItem>
                  <SelectItem value="liberados_motos">Motos liberadas</SelectItem>
                  <SelectItem value="origem_forum">Veiculos do forum</SelectItem>
                  <SelectItem value="origem_delegacia">Motos de delegacia</SelectItem>
                  <SelectItem value="consolidado_geral">Consolidado geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={selectedReportFormat} onValueChange={(value) => setSelectedReportFormat(value as 'csv' | 'pdf')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              O PDF abre em modo de impressao para salvar como PDF no navegador.
            </p>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={isApreensaoDialogOpen}
          onOpenChange={setIsApreensaoDialogOpen}
          title="Nova apreensao"
          description="Preencha os mesmos campos usados na planilha de entrada."
          onCancel={closeApreensaoDialog}
          onConfirm={handleSubmitApreensao}
          confirmLabel="Salvar apreensao"
        >
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="data_recolhimento">Entrada/Recolhimento *</Label>
                <Input id="data_recolhimento" type="datetime-local" value={apreensaoForm.data_recolhimento} onChange={(e) => setApreensaoForm({ ...apreensaoForm, data_recolhimento: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Onde ele vai ficar *</Label>
                <Select value={apreensaoForm.local_custodia} onValueChange={(value) => setApreensaoForm({ ...apreensaoForm, local_custodia: value as VeiculoRecolhido['local_custodia'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {custodyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="placa">Placa *</Label>
                <Input id="placa" value={apreensaoForm.placa} onChange={(e) => setApreensaoForm({ ...apreensaoForm, placa: normalizePlate(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chassi">Chassi</Label>
                <Input id="chassi" value={apreensaoForm.chassi} onChange={(e) => setApreensaoForm({ ...apreensaoForm, chassi: e.target.value.toUpperCase() })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao_veiculo">Descricao do veiculo *</Label>
              <Input id="descricao_veiculo" value={apreensaoForm.descricao_veiculo} onChange={(e) => setApreensaoForm({ ...apreensaoForm, descricao_veiculo: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="proprietario_nome">Proprietario</Label>
                <Input id="proprietario_nome" value={apreensaoForm.proprietario_nome} onChange={(e) => setApreensaoForm({ ...apreensaoForm, proprietario_nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proprietario_cpf_cnpj">CPF/CNPJ</Label>
                <Input id="proprietario_cpf_cnpj" value={apreensaoForm.proprietario_cpf_cnpj} onChange={(e) => setApreensaoForm({ ...apreensaoForm, proprietario_cpf_cnpj: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo *</Label>
                <Textarea id="motivo" rows={3} value={apreensaoForm.motivo} onChange={(e) => setApreensaoForm({ ...apreensaoForm, motivo: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="situacao">Situacao *</Label>
                <Textarea id="situacao" rows={3} value={apreensaoForm.situacao} onChange={(e) => setApreensaoForm({ ...apreensaoForm, situacao: e.target.value })} />
              </div>
            </div>

            {apreensaoForm.local_custodia === 'motos_delegacia' && (
              <div className="space-y-2">
                <Label htmlFor="numero_liberacao">Liberacao</Label>
                <Input id="numero_liberacao" value={apreensaoForm.numero_liberacao} onChange={(e) => setApreensaoForm({ ...apreensaoForm, numero_liberacao: e.target.value })} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="observacao">Observacao</Label>
              <Textarea id="observacao" rows={3} value={apreensaoForm.observacao} onChange={(e) => setApreensaoForm({ ...apreensaoForm, observacao: e.target.value })} />
            </div>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={Boolean(detalhesItem) && isDetalhesDialogOpen}
          onOpenChange={setIsDetalhesDialogOpen}
          title="Detalhes do veiculo"
          description={detalhesItem ? `${detalhesItem.placa} • ${detalhesItem.descricao_veiculo}` : ''}
          onCancel={() => setDetalhesItem(null)}
        >
          {detalhesItem && (
            <div className="space-y-4 py-2 text-sm">
              <div className="overflow-hidden rounded-[28px] border border-amber-200 bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)]">
                <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-100 px-5 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-900">DEMUTRAN</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">Detalhes oficiais do veiculo recolhido</p>
                </div>

                <div className="space-y-5 p-5">
                  <div className="rounded-[24px] bg-slate-950 px-4 py-4 text-white">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Placa</p>
                        <p className="mt-2 text-3xl font-black tracking-[0.14em] text-white">{detalhesItem.placa}</p>
                        <p className="mt-2 text-sm text-white/70">{detalhesItem.descricao_veiculo}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90">
                          {getVehicleKind(detalhesItem)}
                        </span>
                        <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
                          {detalhesItem.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <NativeInfoTile label="Protocolo" value={detalhesItem.protocolo || 'Nao informado'} />
                    <NativeInfoTile label="Patio" value={getCustodyLabel(detalhesItem.local_custodia)} />
                    <NativeInfoTile label="Entrada" value={formatDateTime(detalhesItem.data_recolhimento)} />
                    <NativeInfoTile label="Situacao" value={detalhesItem.situacao || 'Nao informada'} />
                    <NativeInfoTile label="Taxa diaria" value={formatCurrency(getTaxaDiariaValue(detalhesItem))} emphasis />
                    <NativeInfoTile label="Dias de estadia" value={`${getDiasEstadia(detalhesItem)} dia(s)`} emphasis />
                  </div>

                  <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Total acumulado</p>
                    <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-emerald-950">
                      {formatCurrency(getValorEstadia(detalhesItem))}
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <DetailSection
                      title="Dados do proprietario"
                      rows={[
                        { label: 'Nome', value: detalhesItem.proprietario_nome || 'Nao informado' },
                        {
                          label: 'CPF/CNPJ',
                          value: detalhesItem.proprietario_cpf_cnpj || 'Nao informado',
                          action: (
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs font-semibold text-primary"
                              onClick={() => {
                                setDetalhesItem(null);
                                setIsDetalhesDialogOpen(false);
                                openCpfDialog(detalhesItem);
                              }}
                            >
                              {detalhesItem.proprietario_cpf_cnpj ? 'Editar' : 'Adicionar'}
                            </Button>
                          ),
                        },
                      ]}
                    />

                    <DetailSection
                      title="Dados do veiculo"
                      rows={[
                        { label: 'Chassi', value: detalhesItem.chassi || 'Nao informado' },
                        { label: 'Motivo', value: detalhesItem.motivo || 'Nao informado' },
                        { label: 'Descricao', value: detalhesItem.descricao_veiculo || 'Nao informada' },
                      ]}
                    />
                  </div>

                  {(detalhesItem.numero_liberacao || detalhesItem.data_liberacao || detalhesItem.liberado_por) && (
                    <DetailSection
                      title="Dados da liberacao"
                      rows={[
                        { label: 'Numero', value: detalhesItem.numero_liberacao || 'Nao informado' },
                        { label: 'Data da liberacao', value: formatDateTime(detalhesItem.data_liberacao) },
                        { label: 'Liberado por', value: detalhesItem.liberado_por || 'Nao informado' },
                      ]}
                    />
                  )}

                  {detalhesItem.observacao && (
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Observacao</p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{detalhesItem.observacao}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </ResponsiveDialog>

        <ResponsiveDialog
          open={isTaxaDialogOpen}
          onOpenChange={setIsTaxaDialogOpen}
          title={taxaMode === 'all' ? 'Aplicar taxa diaria em massa' : 'Atualizar taxa diaria'}
          description={
            taxaMode === 'all'
              ? 'Defina um valor diario para todos os veiculos do setor DEMUTRAN.'
              : taxaItem
                ? `${taxaItem.placa} • ${taxaItem.descricao_veiculo}`
                : ''
          }
          onCancel={closeTaxaDialog}
          onConfirm={handleSubmitTaxa}
          confirmLabel={taxaMode === 'all' ? 'Aplicar a todos' : 'Salvar taxa'}
        >
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="taxa_diaria">Taxa diaria (R$) *</Label>
              <Input
                id="taxa_diaria"
                inputMode="decimal"
                placeholder="Ex.: 25,00"
                value={taxaForm.taxa_diaria}
                onChange={(e) => setTaxaForm({ taxa_diaria: e.target.value })}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              O valor acumulado sera calculado automaticamente pela quantidade de dias entre a entrada do veiculo e a data atual
              {taxaMode === 'single' ? ' exibida nos detalhes do registro.' : ' para todos os registros do setor.'}
            </p>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={isLiberacaoDialogOpen}
          onOpenChange={setIsLiberacaoDialogOpen}
          title="Liberar veiculo"
          description={liberacaoItem ? `${liberacaoItem.placa} • ${liberacaoItem.descricao_veiculo}` : ''}
          onCancel={closeLiberacaoDialog}
          onConfirm={handleSubmitLiberacao}
          confirmLabel="Confirmar liberacao"
        >
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="data_liberacao">Liberacao *</Label>
              <Input id="data_liberacao" type="datetime-local" value={liberacaoForm.data_liberacao} onChange={(e) => setLiberacaoForm({ ...liberacaoForm, data_liberacao: e.target.value })} />
            </div>

            {liberacaoItem?.local_custodia === 'motos_delegacia' && (
              <div className="space-y-2">
                <Label htmlFor="numero_liberacao_saida">Numero da liberacao *</Label>
                <Input id="numero_liberacao_saida" value={liberacaoForm.numero_liberacao} onChange={(e) => setLiberacaoForm({ ...liberacaoForm, numero_liberacao: e.target.value })} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="situacao_liberacao">Situacao</Label>
              <Input id="situacao_liberacao" value={liberacaoForm.situacao} onChange={(e) => setLiberacaoForm({ ...liberacaoForm, situacao: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacao_liberacao">Observacao da liberacao</Label>
              <Textarea id="observacao_liberacao" rows={3} value={liberacaoForm.observacao} onChange={(e) => setLiberacaoForm({ ...liberacaoForm, observacao: e.target.value })} />
            </div>
          </div>
        </ResponsiveDialog>

        <ResponsiveDialog
          open={isCpfDialogOpen}
          onOpenChange={setIsCpfDialogOpen}
          title="Editar CPF/CNPJ do proprietario"
          description={cpfEditItem ? `${cpfEditItem.placa} • ${cpfEditItem.descricao_veiculo}` : ''}
          onCancel={closeCpfDialog}
          onConfirm={handleSubmitCpf}
          confirmLabel="Salvar CPF"
        >
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
              <Input
                id="cpf_cnpj"
                placeholder="000.000.000-00"
                maxLength={18}
                value={cpfEditValue}
                onChange={(e) => setCpfEditValue(maskCpf(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf_justificativa">Justificativa *</Label>
              <Textarea
                id="cpf_justificativa"
                rows={3}
                placeholder="Informe o motivo da alteracao do CPF/CNPJ (ex.: proprietario compareceu ao DEMUTRAN com documento)"
                value={cpfEditJustificativa}
                onChange={(e) => setCpfEditJustificativa(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              A justificativa sera registrada no historico do veiculo. O CPF/CNPJ permite que o proprietario
              consulte a situacao do veiculo online usando o protocolo da apreensao.
            </p>
          </div>
        </ResponsiveDialog>
      </div>
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
  value: string | number;
  subtitle: string;
  icon: typeof Car;
}) {
  return (
    <div className="rounded-[26px] bg-white/10 p-3.5 sm:rounded-[30px] sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">{title}</p>
          <p className="mt-2 text-[18px] font-black tracking-[-0.06em] text-white break-words sm:text-[22px]">{value}</p>
          <p className="mt-1 hidden text-[12px] leading-5 text-white sm:block">{subtitle}</p>
        </div>
        <div className="shrink-0 rounded-[18px] bg-white/12 p-2.5 text-white sm:rounded-[20px] sm:p-3">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
}

function NativeInfoTile({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`rounded-[20px] px-3 py-3 ${emphasis ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-50 text-slate-900'}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${emphasis ? 'text-emerald-600' : 'text-slate-500'}`}>{label}</p>
      <p className="mt-1 text-[15px] font-bold tracking-[-0.02em]">{value}</p>
    </div>
  );
}

function DetailSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string; action?: React.ReactNode }>;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <div className="mt-3 divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{row.label}</p>
              <p className="mt-1 break-words text-sm font-medium text-slate-800">{row.value}</p>
            </div>
            {row.action ? <div className="shrink-0">{row.action}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default DemutranLiberacao;
