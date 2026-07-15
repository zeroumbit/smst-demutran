import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, Download, Edit, Eye, FileSpreadsheet, IdCard, Loader2, Plus, Printer, Save, Search, SlidersHorizontal, Upload, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { buildReportFileName, exportReportCsv, formatReportDate, openPdfPrintReport, printHtml } from '@/lib/reports';
import { type ConcessionarioFinanceiroStatus, getConcessionarioFinancialCopy, getConcessionarioFinancialStatus } from '@/lib/demutranConcessionarioFinanceiro';
import { supabase } from '@/lib/supabase';
import { uploadDemutranAnexo } from '@/lib/demutranUploads';
import { maskCpf, isValidCpf } from '@/lib/masks';
import { cn } from '@/lib/utils';
import type { DemutranConcessionario, Setor } from '@/types/admin';

type CategoriaConcessionario = DemutranConcessionario['categoria'];

type FormData = {
  categoria: CategoriaConcessionario;
  origem_planilha: string;
  taxi_grupo: string;
  estacionamento: string;
  ponto_referencia: string;
  numero_vaga: string;
  titular_nome: string;
  logradouro: string;
  numero: string;
  bairro_distrito: string;
  veiculo: string;
  placa: string;
  fabricacao: string;
  marca: string;
  cor: string;
  modelo: string;
  ano_fabricacao: string;
  ano_modelo: string;
  chassi: string;
  ultimo_alvara: string;
  exercicio: string;
  cpf: string;
  inicio_atividade: string;
  cnh_numero: string;
  validade_cnh: string;
  atividade_remunerada: string;
  curso: string;
  motorista_auxiliar: string;
  cnh_auxiliar: string;
  validade_cnh_auxiliar: string;
  categoria_cnh: string;
  rota: string;
  observacoes: string;
  email_notificacao: string;
  telefone_notificacao: string;
  aceita_notificacoes: boolean;
  ativo: boolean;
  concessao_arquivo_url: string;
  concessao_arquivo_nome: string;
};

type ParsedImportRow = Omit<DemutranConcessionario, 'id' | 'setor_id' | 'created_at' | 'updated_at'>;

const categoriaOptions: Array<{ value: CategoriaConcessionario; label: string }> = [
  { value: 'mototaxi', label: 'Moto-taxi' },
  { value: 'taxi', label: 'Taxi' },
  { value: 'carro_horario', label: 'Carro de horario' },
  { value: 'fretista', label: 'Fretista' },
];

const categoriaLabels: Record<CategoriaConcessionario, string> = {
  mototaxi: 'Moto-taxi',
  taxi: 'Taxi',
  carro_horario: 'Carro de horario',
  fretista: 'Fretista',
};

const arrecadacaoReference = {
  '2024': {
    carro_horario: { quantidade: 90, atualizados: 70, pendentes: 20, arrecadado: 45677.79 },
    mototaxi: { quantidade: 200, atualizados: 181, pendentes: 19, arrecadado: 44053.21 },
    taxi: { quantidade: 105, atualizados: 98, pendentes: 7, arrecadado: 47940.18 },
  },
  '2025': {
    carro_horario: { quantidade: 90, atualizados: 47, pendentes: 43, arrecadado: 28150.59 },
    mototaxi: { quantidade: 200, atualizados: 135, pendentes: 65, arrecadado: 30547.65 },
    taxi: { quantidade: 105, atualizados: 90, pendentes: 15, arrecadado: 36764.65 },
  },
  '2025_periodo': {
    carro_horario: { quantidade: 91, atualizados: 59, pendentes: 32, arrecadado: 45329.11 },
    mototaxi: { quantidade: 200, atualizados: 181, pendentes: 19, arrecadado: 47044.54 },
    taxi: { quantidade: 105, atualizados: 98, pendentes: 7, arrecadado: 49328.9 },
  },
} as const;

const TAB_FIELDS: Record<string, (keyof FormData)[]> = {
  concessao: [
    'categoria', 'numero_vaga', 'taxi_grupo', 'estacionamento',
    'ponto_referencia', 'concessao_arquivo_url',
    'concessao_arquivo_nome', 'ultimo_alvara', 'exercicio',
    'origem_planilha', 'observacoes', 'aceita_notificacoes', 'ativo',
  ],
  veiculo: [
    'veiculo', 'marca', 'cor', 'modelo', 'ano_fabricacao', 'ano_modelo',
    'chassi', 'placa', 'fabricacao', 'rota',
  ],
  pessoal: [
    'titular_nome', 'cpf', 'email_notificacao', 'telefone_notificacao',
    'cnh_numero', 'validade_cnh', 'atividade_remunerada', 'categoria_cnh',
    'curso', 'inicio_atividade', 'motorista_auxiliar', 'cnh_auxiliar',
    'validade_cnh_auxiliar', 'logradouro', 'numero', 'bairro_distrito',
  ],
};

const TAB_SAVE_MESSAGES: Record<string, string> = {
  concessao: 'Dados de concessão alterados com sucesso.',
  veiculo: 'Dados do veículo alterados com sucesso.',
  pessoal: 'Dados do concessionário alterados com sucesso.',
};

const initialForm: FormData = {
  categoria: 'mototaxi',
  origem_planilha: '',
  taxi_grupo: '',
  estacionamento: '',
  ponto_referencia: '',
  numero_vaga: '',
  titular_nome: '',
  logradouro: '',
  numero: '',
  bairro_distrito: '',
  veiculo: '',
  placa: '',
  fabricacao: '',
  marca: '',
  cor: '',
  modelo: '',
  ano_fabricacao: '',
  ano_modelo: '',
  chassi: '',
  ultimo_alvara: '',
  exercicio: '',
  cpf: '',
  inicio_atividade: '',
  cnh_numero: '',
  validade_cnh: '',
  atividade_remunerada: '',
  curso: '',
  motorista_auxiliar: '',
  cnh_auxiliar: '',
  validade_cnh_auxiliar: '',
  categoria_cnh: '',
  rota: '',
  observacoes: '',
  email_notificacao: '',
  telefone_notificacao: '',
  aceita_notificacoes: true,
  ativo: true,
  concessao_arquivo_url: '',
  concessao_arquivo_nome: '',
};

const statusBadgeClasses = {
  ativo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  inativo: 'border-slate-200 bg-slate-100 text-slate-600',
};

const normalizePlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
const normalizeCpf = (value: string) => value.replace(/[^\d./-]/g, '');

const excelDateToIso = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    return date.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return null;
};

const readString = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const getCategoriaFromSheet = (sheetName: string): CategoriaConcessionario | null => {
  const normalized = sheetName.toLowerCase();
  if (normalized.includes('moto')) return 'mototaxi';
  if (normalized.includes('taxi') || normalized.includes('táxi')) return 'taxi';
  if (normalized.includes('hor')) return 'carro_horario';
  if (normalized.includes('fret')) return 'fretista';
  return null;
};

const isNumericLike = (value: string) => /^\d+$/.test(value.replace(/\D/g, ''));

const getTaxiGroupFromSheet = (sheetName: string) => {
  const normalized = sheetName.toLowerCase();
  if (normalized.includes('astac')) return 'ASTAC';
  if (normalized.includes('cootac') || normalized.includes('cotac')) return 'COOTAC';
  if (normalized.includes('distrito')) return 'DISTRITO';
  return null;
};

const mapSheetRows = (sheetName: string, rows: unknown[][]): ParsedImportRow[] => {
  const categoria = getCategoriaFromSheet(sheetName);
  if (!categoria) return [];

  const mapped: ParsedImportRow[] = [];
  let districtTitle = '';
  const taxiGroup = categoria === 'taxi' ? getTaxiGroupFromSheet(sheetName) : null;

  for (const row of rows) {
    const cells = row.map(readString);
    const firstCell = cells[0];
    const joined = cells.join(' ').toLowerCase();

    if (!firstCell) continue;

    if (joined.includes('propriet') || joined.includes('nome') || joined.includes('ult. alvar') || joined.includes('últ. alvar')) {
      continue;
    }

    if (categoria === 'taxi' && firstCell.toLowerCase().includes('estacionamento')) {
      districtTitle = firstCell;
      continue;
    }

    if (categoria === 'mototaxi' && !isNumericLike(firstCell)) continue;
    if (categoria !== 'mototaxi' && categoria !== 'carro_horario' && !isNumericLike(firstCell)) continue;
    if (categoria === 'carro_horario' && !isNumericLike(firstCell)) continue;
    if (categoria === 'fretista' && !isNumericLike(firstCell)) continue;

    const base: ParsedImportRow = {
      categoria,
      origem_planilha: sheetName,
      taxi_grupo: taxiGroup,
      estacionamento: categoria === 'taxi' && districtTitle ? districtTitle : null,
      ponto_referencia: districtTitle || null,
      numero_vaga: firstCell || null,
      titular_nome: null,
      endereco: null,
      veiculo: null,
      placa: null,
      fabricacao: null,
      ultimo_alvara: null,
      exercicio: null,
      cpf: null,
      inicio_atividade: null,
      cnh_numero: null,
      validade_cnh: null,
      atividade_remunerada: null,
      curso: null,
      motorista_auxiliar: null,
      cnh_auxiliar: null,
      validade_cnh_auxiliar: null,
      categoria_cnh: null,
      rota: null,
      observacoes: null,
      importado_planilha: true,
      ativo: true,
    };

    if (categoria === 'mototaxi') {
      mapped.push({
        ...base,
        titular_nome: cells[1] || null,
        endereco: cells[2] || null,
        veiculo: cells[3] || null,
        placa: normalizePlate(cells[4]) || null,
        ultimo_alvara: excelDateToIso(row[5]),
        exercicio: cells[6] || null,
        cpf: normalizeCpf(cells[7]) || null,
        inicio_atividade: excelDateToIso(row[8]),
        cnh_numero: cells[9] || null,
        validade_cnh: excelDateToIso(row[10]),
        atividade_remunerada: cells[11] || null,
        curso: cells[12] || null,
        observacoes: cells.slice(13).filter(Boolean).join(' | ') || null,
      });
      continue;
    }

    if (categoria === 'taxi') {
      mapped.push({
        ...base,
        titular_nome: cells[1] || null,
        endereco: cells[2] || null,
        veiculo: cells[3] || null,
        placa: normalizePlate(cells[4]) || null,
        fabricacao: cells[5] || null,
        ultimo_alvara: excelDateToIso(row[6]),
        exercicio: cells[7] || null,
        inicio_atividade: excelDateToIso(row[8]),
        cpf: normalizeCpf(cells[9]) || null,
        validade_cnh: excelDateToIso(row[10]),
        atividade_remunerada: cells[11] || null,
        curso: cells[12] || null,
        motorista_auxiliar: cells[7]?.toLowerCase().includes('exerc') ? null : cells[7] || null,
        cnh_auxiliar: cells[12] || null,
        validade_cnh_auxiliar: excelDateToIso(row[13]),
        categoria_cnh: cells[14] || null,
        observacoes: cells.slice(15).filter(Boolean).join(' | ') || null,
      });
      continue;
    }

    if (categoria === 'carro_horario') {
      mapped.push({
        ...base,
        titular_nome: cells[1] || null,
        rota: cells[2] || null,
        veiculo: cells[3] || null,
        placa: normalizePlate(cells[4]) || null,
        ultimo_alvara: excelDateToIso(row[5]),
        observacoes: cells[6] || null,
        cpf: normalizeCpf(cells[7]) || null,
        cnh_numero: cells[8] || null,
        validade_cnh: excelDateToIso(row[9]),
        curso: cells[10] || null,
        inicio_atividade: excelDateToIso(row[11]),
        cnh_auxiliar: cells[12] || null,
        categoria_cnh: cells[13] || null,
        validade_cnh_auxiliar: excelDateToIso(row[14]),
      });
      continue;
    }

    mapped.push({
      ...base,
      titular_nome: cells[1] || null,
      endereco: cells[2] || null,
      veiculo: cells[3] || null,
      placa: normalizePlate(cells[4]) || null,
      ultimo_alvara: excelDateToIso(row[5]),
      motorista_auxiliar: cells[6] || null,
    });
  }

  return mapped.filter((item) => item.titular_nome || item.placa || item.numero_vaga);
};

const DemutranConcessionarios = () => {
  const { confirm, confirmDialog } = useConfirmDialog();
  const { isSuperAdmin, setorId } = useAuth();
  const [items, setItems] = useState<DemutranConcessionario[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [demutranSetorId, setDemutranSetorId] = useState('');
  const [accessMap, setAccessMap] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DemutranConcessionario | null>(null);
  const [viewingItem, setViewingItem] = useState<DemutranConcessionario | null>(null);
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [activeTab, setActiveTab] = useState('concessao');
  const [originalFormSnapshot, setOriginalFormSnapshot] = useState<FormData | null>(null);
  const [savingTab, setSavingTab] = useState<string | null>(null);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [notifyItem, setNotifyItem] = useState<DemutranConcessionario | null>(null);
  const [notifyForm, setNotifyForm] = useState({ titulo: '', mensagem: '', tipo: 'geral' });
  const [sendingNotification, setSendingNotification] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<'todas' | CategoriaConcessionario>('todas');
  const [selectedStatus, setSelectedStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [selectedFinancialStatus, setSelectedFinancialStatus] = useState<'todas' | ConcessionarioFinanceiroStatus>('todas');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedPeriodoArrecadacao, setSelectedPeriodoArrecadacao] =
    useState<keyof typeof arrecadacaoReference>('2025_periodo');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [paymentDialogItem, setPaymentDialogItem] = useState<DemutranConcessionario | null>(null);
  const [paymentDialogDate, setPaymentDialogDate] = useState('');
  const [paymentDialogSaving, setPaymentDialogSaving] = useState(false);
  const [isCustomReportDialogOpen, setIsCustomReportDialogOpen] = useState(false);
  const [selectedReportOption, setSelectedReportOption] = useState('todos');
  const [selectedReportFormat, setSelectedReportFormat] = useState<'csv' | 'pdf'>('csv');
  const [selectedCustomReportFormat, setSelectedCustomReportFormat] = useState<'csv' | 'pdf'>('csv');
  const [uploadingConcessao, setUploadingConcessao] = useState(false);

  const effectiveSetorId = demutranSetorId || setorId || '';

  const loadSetores = async () => {
    const { data, error } = await supabase.rpc('get_manageable_setores');
    if (error) {
      toast({ title: 'Erro ao carregar setores', description: error.message, variant: 'destructive' });
      return;
    }

    const demutranOnly = ((data || []) as Setor[]).filter((setor) => setor.slug === 'demutran');
    setSetores(demutranOnly);

    if (demutranOnly[0]?.id) {
      setDemutranSetorId(demutranOnly[0].id);
    }
  };

  const loadData = async () => {
    setLoading(true);
    let itemsQuery = (supabase as any)
      .from('demutran_concessionarios')
      .select('*');

    if (effectiveSetorId) {
      itemsQuery = itemsQuery.eq('setor_id', effectiveSetorId);
    }

    itemsQuery = itemsQuery.order('categoria').order('titular_nome');

    const [itemsResponse, accessResponse] = await Promise.all([
      itemsQuery,
      (supabase as any).from('demutran_concessionario_acessos').select('concessionario_id'),
    ]);

    if (itemsResponse.error) {
      toast({ title: 'Erro ao carregar concessionarios', description: itemsResponse.error.message, variant: 'destructive' });
    } else {
      setItems((itemsResponse.data || []) as DemutranConcessionario[]);
      const nextMap: Record<string, boolean> = {};
      ((accessResponse.data || []) as Array<{ concessionario_id: string }>).forEach((row) => {
        nextMap[row.concessionario_id] = true;
      });
      setAccessMap(nextMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSetores();
  }, []);

  useEffect(() => {
    if (effectiveSetorId) {
      loadData();
    } else if (!isSuperAdmin) {
      setItems([]);
      setLoading(false);
    }
  }, [effectiveSetorId, isSuperAdmin]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    items.forEach((item) => {
      if (item.exercicio) {
        const m = String(item.exercicio).match(/\b(20\d{2})\b/);
        if (m) years.add(Number(m[1]));
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategoria !== 'todas' && item.categoria !== selectedCategoria) return false;
      if (selectedStatus === 'ativo' && !item.ativo) return false;
      if (selectedStatus === 'inativo' && item.ativo) return false;
      if (selectedFinancialStatus !== 'todas' && getConcessionarioFinancialStatus(item) !== selectedFinancialStatus) return false;
      if (selectedYear !== null) {
        const m = String(item.exercicio).match(/\b(20\d{2})\b/);
        if (!m || Number(m[1]) !== selectedYear) return false;
      }
      return (
      [
        categoriaLabels[item.categoria],
        item.taxi_grupo,
        item.estacionamento,
        item.titular_nome,
        item.numero_vaga,
        item.placa,
        item.cpf,
        item.veiculo,
        item.origem_planilha,
        item.rota,
        item.ponto_referencia,
      ]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      );
    });
  }, [items, searchTerm, selectedCategoria, selectedStatus, selectedFinancialStatus, selectedYear]);

  const filteredReferenceCards = useMemo(() => {
    const selected = arrecadacaoReference[selectedPeriodoArrecadacao];
    const entries = Object.entries(selected) as Array<
      [CategoriaConcessionario, (typeof arrecadacaoReference)[keyof typeof arrecadacaoReference][CategoriaConcessionario]]
    >;

    return entries.filter(([categoria]) => selectedCategoria === 'todas' || categoria === selectedCategoria);
  }, [selectedCategoria, selectedPeriodoArrecadacao]);

  const hasUnsavedChanges = useMemo(() => {
    if (!originalFormSnapshot) return false;
    const keys = Object.keys(initialForm) as (keyof FormData)[];
    return keys.some((key) => {
      const a = formData[key];
      const b = originalFormSnapshot[key];
      if (typeof a === 'string' && typeof b === 'string') return a !== b;
      return a !== b;
    });
  }, [formData, originalFormSnapshot]);

  const updateSnapshotForTab = (tab: string) => {
    setOriginalFormSnapshot((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      const fields = TAB_FIELDS[tab] || [];
      for (const field of fields) {
        (updated as any)[field] = formData[field];
      }
      return updated;
    });
  };

  const actualCountByCategoria = useMemo(() => {
    return items.reduce<Record<CategoriaConcessionario, number>>(
      (acc, item) => {
        acc[item.categoria] += 1;
        return acc;
      },
      {
        mototaxi: 0,
        taxi: 0,
        carro_horario: 0,
        fretista: 0,
      },
    );
  }, [items]);

  const overdueItems = useMemo(
    () => items.filter((item) => getConcessionarioFinancialStatus(item) === 'em_debito'),
    [items],
  );

  const paidItems = useMemo(
    () => items.filter((item) => getConcessionarioFinancialStatus(item) === 'pago'),
    [items],
  );

  const pendingCount = useMemo(() => {
    if (selectedCategoria === 'todas') {
      return overdueItems.length;
    }
    return overdueItems.filter((item) => item.categoria === selectedCategoria).length;
  }, [overdueItems, selectedCategoria]);

  const withoutAccessCount = useMemo(
    () => items.filter((item) => !accessMap[item.id]).length,
    [accessMap, items],
  );

  const baseConcessionarioRows = (rows: DemutranConcessionario[]) =>
    rows.map((item) => ({
      Categoria: categoriaLabels[item.categoria],
      Grupo_taxi: item.taxi_grupo || '-',
      Estacionamento: item.estacionamento || '-',
      Nome: item.titular_nome || '-',
      Vaga: item.numero_vaga || '-',
      Placa: item.placa || '-',
      CPF: item.cpf || '-',
      Veiculo: item.veiculo || '-',
      Situacao_financeira: getConcessionarioFinancialCopy(item).label,
      Ultimo_alvara: formatReportDate(item.ultimo_alvara),
      Inicio_atividade: formatReportDate(item.inicio_atividade),
    }));

  const handleGenerateReport = () => {
    const reportMap: Record<string, { title: string; rows: ReturnType<typeof baseConcessionarioRows> }> = {
      filtros_aplicados: { title: 'Concessionarios com filtros aplicados', rows: baseConcessionarioRows(filteredItems) },
      todos: { title: 'Todos os concessionarios', rows: baseConcessionarioRows(filteredItems) },
      ativos: { title: 'Concessionarios ativos', rows: baseConcessionarioRows(filteredItems.filter((item) => item.ativo)) },
      inativos: { title: 'Concessionarios inativos', rows: baseConcessionarioRows(filteredItems.filter((item) => !item.ativo)) },
      sem_acesso: { title: 'Concessionarios sem acesso', rows: baseConcessionarioRows(filteredItems.filter((item) => !accessMap[item.id])) },
      categoria_atual: {
        title: selectedCategoria === 'todas' ? 'Concessionarios por categoria filtrada' : `Concessionarios - ${categoriaLabels[selectedCategoria]}`,
        rows: baseConcessionarioRows(filteredItems.filter((item) => selectedCategoria === 'todas' || item.categoria === selectedCategoria)),
      },
    };
    const selected = reportMap[selectedReportOption];
    if (!selected?.rows.length) {
      toast({ title: 'Sem dados', description: 'Nao existem registros para o relatorio selecionado.', variant: 'destructive' });
      return;
    }
    const fileName = buildReportFileName('concessionarios', selected.title);
    if (selectedReportFormat === 'csv') {
      exportReportCsv(fileName, selected.rows);
    } else {
      openPdfPrintReport(selected.title, [{ name: selected.title, rows: selected.rows }]);
    }
    setIsReportDialogOpen(false);
  };

  const handleGenerateCustomReport = () => {
    const rows = baseConcessionarioRows(filteredItems);
    if (!rows.length) {
      toast({ title: 'Sem dados', description: 'Nao existem registros para os filtros aplicados.', variant: 'destructive' });
      return;
    }
    const fileName = buildReportFileName('concessionarios', 'filtros-aplicados');
    if (selectedCustomReportFormat === 'csv') {
      exportReportCsv(fileName, rows);
    } else {
      openPdfPrintReport('Concessionarios com filtros aplicados', [{ name: 'Filtros aplicados', rows }]);
    }
    setIsCustomReportDialogOpen(false);
  };

  const resetAndCloseForm = (skipConfirm = false) => {
    if (!skipConfirm && editingItem && hasUnsavedChanges) {
      setUnsavedDialogOpen(true);
      return;
    }
    setEditingItem(null);
    setFormData(initialForm);
    setOriginalFormSnapshot(null);
    setActiveTab('concessao');
    setIsDialogOpen(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      resetAndCloseForm();
    }
  };

  const handleUnsavedSave = async () => {
    setUnsavedDialogOpen(false);
    if (editingItem) {
      setSaving(true);
      const payload = toPayload();
      const { error } = await (supabase as any)
        .from('demutran_concessionarios')
        .update(payload)
        .eq('id', editingItem.id);
      setSaving(false);
      if (!error) {
        toast({ title: 'Concessionário atualizado' });
        loadData();
      }
    }
    resetAndCloseForm(true);
  };

  const handleUnsavedDiscard = () => {
    setUnsavedDialogOpen(false);
    resetAndCloseForm(true);
  };

  const toPayload = () => ({
    categoria: formData.categoria,
    origem_planilha: formData.origem_planilha.trim() || null,
    taxi_grupo: formData.taxi_grupo.trim() || null,
    estacionamento: formData.estacionamento.trim() || null,
    ponto_referencia: formData.ponto_referencia.trim() || null,
    numero_vaga: formData.numero_vaga.trim() || null,
    titular_nome: formData.titular_nome.trim() || null,
    logradouro: formData.logradouro.trim() || null,
    numero: formData.numero.trim() || null,
    bairro_distrito: formData.bairro_distrito.trim() || null,
    veiculo: formData.veiculo.trim() || null,
    placa: normalizePlate(formData.placa) || null,
    fabricacao: formData.fabricacao.trim() || null,
    marca: formData.marca.trim() || null,
    cor: formData.cor.trim() || null,
    modelo: formData.modelo.trim() || null,
    ano_fabricacao: formData.ano_fabricacao.trim() || null,
    ano_modelo: formData.ano_modelo.trim() || null,
    chassi: formData.chassi.trim() || null,
    ultimo_alvara: formData.ultimo_alvara || null,
    exercicio: formData.exercicio.trim() || null,
    cpf: normalizeCpf(formData.cpf) || null,
    inicio_atividade: formData.inicio_atividade || null,
    cnh_numero: formData.cnh_numero.trim() || null,
    validade_cnh: formData.validade_cnh || null,
    atividade_remunerada: formData.atividade_remunerada.trim() || null,
    curso: formData.curso.trim() || null,
    motorista_auxiliar: formData.motorista_auxiliar.trim() || null,
    cnh_auxiliar: formData.cnh_auxiliar.trim() || null,
    validade_cnh_auxiliar: formData.validade_cnh_auxiliar || null,
    categoria_cnh: formData.categoria_cnh.trim() || null,
    rota: formData.rota.trim() || null,
    observacoes: formData.observacoes.trim() || null,
    email_notificacao: formData.email_notificacao.trim() || null,
    telefone_notificacao: formData.telefone_notificacao.trim() || null,
    aceita_notificacoes: formData.aceita_notificacoes,
    concessao_arquivo_url: formData.concessao_arquivo_url.trim() || null,
    concessao_arquivo_nome: formData.concessao_arquivo_nome.trim() || null,
    ativo: formData.ativo,
    updated_at: new Date().toISOString(),
  });

  const handleSubmit = async () => {
    if (!effectiveSetorId) {
      toast({ title: 'Setor nao identificado', description: 'Nao foi possivel identificar o setor do usuario.', variant: 'destructive' });
      return;
    }

    if (!formData.titular_nome.trim()) {
      toast({ title: 'Campo obrigatorio', description: 'Informe o nome do concessionario.', variant: 'destructive' });
      return;
    }
    if (editingItem) {
      const originalVeiculo = (editingItem.veiculo || '').trim();
      const originalPlaca = (editingItem.placa || '').trim();
      const newVeiculo = formData.veiculo.trim();
      const newPlaca = normalizePlate(formData.placa);

      if (newVeiculo !== originalVeiculo || newPlaca !== originalPlaca) {
        const proceed = await confirm({
          title: 'Alterar dados do veiculo',
          description: 'Confirma a alteração dos dados do veículo?',
          confirmText: 'Sim, confirmar',
          cancelText: 'Cancelar',
          variant: 'default',
        });
        if (!proceed) return;
      }
    }

    setSaving(true);
    const payload = toPayload();

    const operation = editingItem
      ? await (supabase as any).from('demutran_concessionarios').update(payload).eq('id', editingItem.id).select('id').single()
      : await (supabase as any).from('demutran_concessionarios').insert([{ ...payload, setor_id: effectiveSetorId, created_at: new Date().toISOString(), importado_planilha: false }]).select('id').single();

    if (operation.error) {
      setSaving(false);
      toast({ title: 'Erro ao salvar concessionario', description: operation.error.message, variant: 'destructive' });
      return;
    }

    setSaving(false);
    toast({ title: editingItem ? 'Concessionario atualizado' : 'Concessionario cadastrado' });
    resetAndCloseForm();
    loadData();
  };

  const saveTabFields = async (tab: string, payload: Record<string, unknown>) => {
    if (!editingItem) return;
    setSavingTab(tab);
    const { error } = await (supabase as any)
      .from('demutran_concessionarios')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', editingItem.id);
    setSavingTab(null);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return false;
    }
    updateSnapshotForTab(tab);
    toast({ title: TAB_SAVE_MESSAGES[tab] || 'Dados alterados com sucesso.' });
    loadData();
    return true;
  };

  const handleSaveConcessao = async () => {
    if (!editingItem) return;
    await saveTabFields('concessao', {
      categoria: formData.categoria,
      numero_vaga: formData.numero_vaga.trim() || null,
      taxi_grupo: formData.taxi_grupo.trim() || null,
      estacionamento: formData.estacionamento.trim() || null,
      ponto_referencia: formData.ponto_referencia.trim() || null,
      ultimo_alvara: formData.ultimo_alvara || null,
      exercicio: formData.exercicio.trim() || null,
      aceita_notificacoes: formData.aceita_notificacoes,
      concessao_arquivo_url: formData.concessao_arquivo_url.trim() || null,
      concessao_arquivo_nome: formData.concessao_arquivo_nome.trim() || null,
      origem_planilha: formData.origem_planilha.trim() || null,
      observacoes: formData.observacoes.trim() || null,
      ativo: formData.ativo,
    });
  };

  const handleSaveVeiculo = async () => {
    if (!editingItem) return;

    const originalVeiculo = (editingItem.veiculo || '').trim();
    const originalPlaca = (editingItem.placa || '').trim();
    const newVeiculo = formData.veiculo.trim();
    const newPlaca = normalizePlate(formData.placa);

    if (newVeiculo !== originalVeiculo || newPlaca !== originalPlaca) {
      const proceed = await confirm({
        title: 'Alterar dados do veículo',
        description: 'Confirma a alteração dos dados do veículo?',
        confirmText: 'Sim, confirmar',
        cancelText: 'Cancelar',
        variant: 'default',
      });
      if (!proceed) return;
    }

    await saveTabFields('veiculo', {
      veiculo: formData.veiculo.trim() || null,
      marca: formData.marca.trim() || null,
      cor: formData.cor.trim() || null,
      modelo: formData.modelo.trim() || null,
      ano_fabricacao: formData.ano_fabricacao.trim() || null,
      ano_modelo: formData.ano_modelo.trim() || null,
      chassi: formData.chassi.trim() || null,
      placa: normalizePlate(formData.placa) || null,
      fabricacao: formData.fabricacao.trim() || null,
      rota: formData.rota.trim() || null,
    });
  };

  const handleSavePessoal = async () => {
    if (!editingItem) return;
    if (!formData.titular_nome.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe o nome do concessionário.', variant: 'destructive' });
      return;
    }
    await saveTabFields('pessoal', {
      titular_nome: formData.titular_nome.trim() || null,
      cpf: normalizeCpf(formData.cpf) || null,
      email_notificacao: formData.email_notificacao.trim() || null,
      telefone_notificacao: formData.telefone_notificacao.trim() || null,
      cnh_numero: formData.cnh_numero.trim() || null,
      validade_cnh: formData.validade_cnh || null,
      atividade_remunerada: formData.atividade_remunerada.trim() || null,
      categoria_cnh: formData.categoria_cnh.trim() || null,
      curso: formData.curso.trim() || null,
      inicio_atividade: formData.inicio_atividade || null,
      motorista_auxiliar: formData.motorista_auxiliar.trim() || null,
      cnh_auxiliar: formData.cnh_auxiliar.trim() || null,
      validade_cnh_auxiliar: formData.validade_cnh_auxiliar || null,
      logradouro: formData.logradouro.trim() || null,
      numero: formData.numero.trim() || null,
      bairro_distrito: formData.bairro_distrito.trim() || null,
    });
  };

  const handleEdit = (item: DemutranConcessionario) => {
    setEditingItem(item);
    const data: FormData = {
      categoria: item.categoria,
      origem_planilha: item.origem_planilha || '',
      taxi_grupo: item.taxi_grupo || '',
      estacionamento: item.estacionamento || '',
      ponto_referencia: item.ponto_referencia || '',
      numero_vaga: item.numero_vaga || '',
      titular_nome: item.titular_nome || '',
      logradouro: item.logradouro || '',
      numero: item.numero || '',
      bairro_distrito: item.bairro_distrito || '',
      veiculo: item.veiculo || '',
      placa: item.placa || '',
      fabricacao: item.fabricacao || '',
      marca: item.marca || '',
      cor: item.cor || '',
      modelo: item.modelo || '',
      ano_fabricacao: item.ano_fabricacao || '',
      ano_modelo: item.ano_modelo || '',
      chassi: item.chassi || '',
      ultimo_alvara: item.ultimo_alvara || '',
      exercicio: item.exercicio || '',
      cpf: item.cpf || '',
      inicio_atividade: item.inicio_atividade || '',
      cnh_numero: item.cnh_numero || '',
      validade_cnh: item.validade_cnh || '',
      atividade_remunerada: item.atividade_remunerada || '',
      curso: item.curso || '',
      motorista_auxiliar: item.motorista_auxiliar || '',
      cnh_auxiliar: item.cnh_auxiliar || '',
      validade_cnh_auxiliar: item.validade_cnh_auxiliar || '',
      categoria_cnh: item.categoria_cnh || '',
      rota: item.rota || '',
      observacoes: item.observacoes || '',
      email_notificacao: item.email_notificacao || '',
      telefone_notificacao: item.telefone_notificacao || '',
      aceita_notificacoes: item.aceita_notificacoes,
      concessao_arquivo_url: item.concessao_arquivo_url || '',
      concessao_arquivo_nome: item.concessao_arquivo_nome || '',
      ativo: item.ativo,
    };
    setFormData(data);
    setOriginalFormSnapshot(JSON.parse(JSON.stringify(data)));
    setIsDialogOpen(true);
  };

  const handleSendNotification = async () => {
    if (!notifyItem) return;
    if (!notifyForm.titulo.trim() || !notifyForm.mensagem.trim()) {
      toast({ title: 'Campos obrigatorios', description: 'Informe titulo e mensagem da notificacao.', variant: 'destructive' });
      return;
    }

    setSendingNotification(true);
    const { data, error } = await (supabase as any).rpc('enviar_notificacao_concessionario', {
      _concessionario_id: notifyItem.id,
      _titulo: notifyForm.titulo,
      _mensagem: notifyForm.mensagem,
      _tipo: notifyForm.tipo,
    });
    setSendingNotification(false);

    if (error || data?.error) {
      toast({ title: 'Erro ao enviar notificacao', description: error?.message || data?.error || 'Falha ao notificar.', variant: 'destructive' });
      return;
    }

    toast({ title: 'Notificacao enviada' });
    setNotifyItem(null);
    setNotifyForm({ titulo: '', mensagem: '', tipo: 'geral' });
  };

  const handleDelete = async (item: DemutranConcessionario) => {
    const confirmed = await confirm({
      title: 'Excluir concessionario',
      description: `Excluir o cadastro de ${item.titular_nome || 'este concessionario'}?`,
    });
    if (!confirmed) return;

    const { error } = await (supabase as any).from('demutran_concessionarios').delete().eq('id', item.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Concessionario excluido' });
    setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
  };

  const handleToggleAtivo = async (item: DemutranConcessionario) => {
    const confirmed = await confirm({
      title: item.ativo ? 'Desativar concessionário' : 'Ativar concessionário',
      description: item.ativo
        ? `Deseja desativar o cadastro de ${item.titular_nome || 'este concessionário'}?`
        : `Deseja ativar o cadastro de ${item.titular_nome || 'este concessionário'}?`,
    });
    if (!confirmed) return;

    const { error } = await (supabase as any)
      .from('demutran_concessionarios')
      .update({ ativo: !item.ativo, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: item.ativo ? 'Cadastro inativado' : 'Cadastro ativado' });
    setItems((current) =>
      current.map((currentItem) => (currentItem.id === item.id ? { ...currentItem, ativo: !currentItem.ativo } : currentItem)),
    );
  };

  const handleOpenPaymentDialog = (item: DemutranConcessionario) => {
    setPaymentDialogItem(item);
    setPaymentDialogDate(new Date().toISOString().slice(0, 10));
  };

  const handleConfirmPayment = async () => {
    const item = paymentDialogItem;
    if (!item || !paymentDialogDate) return;

    const year = paymentDialogDate.slice(0, 4);

    setPaymentDialogSaving(true);
    const { error } = await (supabase as any)
      .from('demutran_concessionarios')
      .update({
        exercicio: year,
        ultimo_alvara: paymentDialogDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    setPaymentDialogSaving(false);

    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Taxas marcadas como pagas' });
    setPaymentDialogItem(null);
    setPaymentDialogDate('');
    loadData();
  };

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!effectiveSetorId) {
      toast({ title: 'Setor nao identificado', description: 'Nao foi possivel identificar o setor do usuario.', variant: 'destructive' });
      setIsImportDialogOpen(false);
      return;
    }

    setImporting(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const payload: ParsedImportRow[] = [];

      workbook.SheetNames.forEach((sheetName) => {
        const categoria = getCategoriaFromSheet(sheetName);
        if (!categoria) return;
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' }) as unknown[][];
        payload.push(...mapSheetRows(sheetName, rows));
      });

      if (!payload.length) {
        toast({ title: 'Nenhum registro importado', description: 'A planilha nao possui abas compativeis com concessionarios.', variant: 'destructive' });
        setImporting(false);
        setIsImportDialogOpen(false);
        return;
      }

      const confirmed = await confirm({
        title: 'Importar concessionarios',
        description: `Deseja importar ${payload.length} concessionario(s)? Esta acao nao pode ser desfeita.`,
      });
      if (!confirmed) {
        setImporting(false);
        setIsImportDialogOpen(false);
        return;
      }

      const { error } = await (supabase as any).from('demutran_concessionarios').insert(
        payload.map((item) => ({
          ...item,
          setor_id: effectiveSetorId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
      );

      setImporting(false);
      setIsImportDialogOpen(false);

      if (error) {
        toast({ title: 'Erro ao importar planilha', description: error.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Importacao concluida', description: `${payload.length} concessionarios importados da planilha.` });
      loadData();
    } catch (error) {
      setImporting(false);
      setIsImportDialogOpen(false);
      toast({
        title: 'Erro ao processar arquivo',
        description: error instanceof Error ? error.message : 'Falha ao ler a planilha.',
        variant: 'destructive',
      });
    }
  };

  const handleUploadConcessao = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingConcessao(true);
    try {
      const publicUrl = await uploadDemutranAnexo(file, 'concessao');
      setFormData((current) => ({
        ...current,
        concessao_arquivo_url: publicUrl,
        concessao_arquivo_nome: file.name,
      }));
      toast({ title: 'Arquivo enviado', description: 'PDF da concessão enviado com sucesso.' });
    } catch (error) {
      toast({
        title: 'Erro ao enviar arquivo',
        description: error instanceof Error ? error.message : 'Falha ao enviar o PDF.',
        variant: 'destructive',
      });
    } finally {
      setUploadingConcessao(false);
    }
  };

  const handleRemoveConcessao = () => {
    setFormData((current) => ({
      ...current,
      concessao_arquivo_url: '',
      concessao_arquivo_nome: '',
    }));
  };

  const handleDownloadModelo = () => {
    const wb = XLSX.utils.book_new();

    const sheets = [
      {
        name: 'Mototaxi',
        headers: [
          'Numero Vaga', 'Titular Nome', 'Endereco', 'Veiculo', 'Placa',
          'Ultimo Alvara', 'Exercicio', 'CPF', 'Inicio Atividade',
          'CNH Numero', 'Validade CNH', 'Atividade Remunerada', 'Curso', 'Observacoes',
        ],
      },
      {
        name: 'Taxi',
        headers: [
          'Numero Vaga', 'Titular Nome', 'Endereco', 'Veiculo', 'Placa',
          'Fabricacao', 'Ultimo Alvara', 'Exercicio', 'Inicio Atividade', 'CPF',
          'Validade CNH', 'Atividade Remunerada', 'Curso',
          'Motorista Auxiliar', 'CNH Auxiliar', 'Validade CNH Auxiliar',
          'Categoria CNH', 'Observacoes',
        ],
      },
      {
        name: 'Carro Horario',
        headers: [
          'Numero Vaga', 'Titular Nome', 'Rota', 'Veiculo', 'Placa',
          'Ultimo Alvara', 'Observacoes', 'CPF', 'CNH Numero',
          'Validade CNH', 'Curso', 'Inicio Atividade', 'CNH Auxiliar',
          'Categoria CNH', 'Validade CNH Auxiliar',
        ],
      },
      {
        name: 'Fretista',
        headers: [
          'Numero Vaga', 'Titular Nome', 'Endereco', 'Veiculo', 'Placa',
          'Ultimo Alvara', 'Motorista Auxiliar',
        ],
      },
    ];

    for (const sheet of sheets) {
      const emptyRow = sheet.headers.map(() => '');
      const ws = XLSX.utils.aoa_to_sheet([sheet.headers, emptyRow]);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    }

    XLSX.writeFile(wb, 'modelo-concessionarios.xlsx');
  };

  const columns = [
    {
      header: 'Categoria',
      accessor: (item: DemutranConcessionario) =>
        item.categoria === 'taxi' && item.taxi_grupo
          ? `${categoriaLabels[item.categoria]} • ${item.taxi_grupo}`
          : categoriaLabels[item.categoria],
    },
    {
      header: 'Concessionario',
      accessor: (item: DemutranConcessionario) => item.titular_nome || '-',
      className: 'min-w-[220px]',
    },
    {
      header: 'Vaga',
      accessor: (item: DemutranConcessionario) => item.numero_vaga || '-',
    },
    {
      header: 'Placa',
      accessor: (item: DemutranConcessionario) => item.placa || '-',
    },
    {
      header: 'Origem',
      accessor: (item: DemutranConcessionario) => item.origem_planilha || '-',
      className: 'min-w-[170px]',
    },
    {
      header: 'Financeiro',
      accessor: (item: DemutranConcessionario) => {
        const financial = getConcessionarioFinancialCopy(item);
        return (
          <Badge
            variant="outline"
            className={cn(
              'rounded-full px-3 py-1 text-xs font-bold',
              financial.status === 'pago' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
              financial.status === 'prazo_aberto' && 'border-blue-200 bg-blue-50 text-blue-700',
              financial.status === 'em_debito' && 'border-red-200 bg-red-50 text-red-700',
            )}
          >
            {financial.label}
          </Badge>
        );
      },
    },
    {
      header: 'Status',
      accessor: (item: DemutranConcessionario) => (
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

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategoria !== 'todas') count++;
    if (selectedStatus !== 'todos') count++;
    if (selectedFinancialStatus !== 'todas') count++;
    if (selectedYear !== null) count++;
    return count;
  }, [selectedCategoria, selectedStatus, selectedFinancialStatus, selectedYear]);

  function renderMobileConcessionarioCard(item: DemutranConcessionario) {
    const financial = getConcessionarioFinancialCopy(item);

    return (
      <div
        key={item.id}
        className="rounded-[34px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-slate-900">{item.titular_nome || '-'}</p>
            <p className="mt-0.5 text-[13px] leading-5 text-slate-500">
              {item.veiculo || 'Sem veiculo'} &middot; {item.placa || '-'}
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Vaga</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.numero_vaga || '-'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Grupo taxi</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.taxi_grupo || '-'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">CPF</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.cpf || '-'}</p>
          </div>
          <div className="col-span-2 rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Estacionamento / Origem</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.estacionamento || item.rota || '-'} &middot; {item.origem_planilha || '-'}</p>
          </div>
          <div className="col-span-2 rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Financeiro</p>
            <p className={cn(
              'mt-0.5 font-semibold',
              financial.status === 'pago' && 'text-emerald-700',
              financial.status === 'prazo_aberto' && 'text-blue-700',
              financial.status === 'em_debito' && 'text-red-700',
            )}>{financial.label}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          {getConcessionarioFinancialStatus(item) === 'em_debito' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 rounded-xl text-[13px] font-semibold text-emerald-600 hover:text-emerald-700"
              onClick={() => handleOpenPaymentDialog(item)}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Pagar
            </Button>
          )}
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
            onClick={() => setViewingItem(item)}
          >
            Detalhes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-[34px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#2563eb_100%)]">
          <div className="space-y-6 px-5 pb-5 pt-6 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-100/70">Permissoes de trafego</p>
                <h1 className="mt-3 text-[32px] font-black tracking-[-0.07em] text-white sm:text-[38px]">Concessionarios</h1>
                <p className="mt-2 max-w-xl text-[14px] leading-6 text-white">
                  Cadastre, consulte, edite e importe em massa os permissionarios do DEMUTRAN.
                </p>
              </div>

              <div className="mt-3 hidden shrink-0 flex-row gap-2 sm:flex">
                <Button type="button" variant="secondary" className="gap-2 rounded-[18px] bg-white/20 text-white shadow-none hover:bg-white/30" onClick={() => setIsImportDialogOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Importar
                </Button>
                <Button type="button" variant="secondary" className="gap-2 rounded-[18px] bg-white/20 text-white shadow-none hover:bg-white/30" onClick={() => setIsReportDialogOpen(true)}>
                  <FileSpreadsheet className="h-4 w-4" />
                  Relatorio
                </Button>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2 rounded-[18px] bg-white text-slate-900 hover:bg-slate-100">
                  <Plus className="h-4 w-4" />
                  Novo concessionário
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              <SummaryCard title="Total" value={items.length} subtitle="Cadastros registrados" icon={IdCard} />
              <SummaryCard title="Ativos" value={items.filter((item) => item.ativo).length} subtitle="Cadastros em operacao" icon={Eye} />
              <SummaryCard title="Em debito" value={pendingCount} subtitle="Taxas nao quitadas apos janeiro" icon={AlertTriangle} />
              <SummaryCard title="Taxas pagas" value={paidItems.length} subtitle="Exercicio atual regularizado" icon={FileSpreadsheet} />
              <SummaryCard title="Sem acesso" value={withoutAccessCount} subtitle="Ainda sem senha individual" icon={Bell} />
            </div>

            <div className="flex gap-2 sm:hidden">
              <Button type="button" variant="secondary" className="h-12 flex-1 gap-2 rounded-[18px] bg-white/20 text-white shadow-none hover:bg-white/30" onClick={() => setIsImportDialogOpen(true)}>
                <Upload className="h-4 w-4" />
                Importar
              </Button>
              <Button type="button" variant="secondary" className="h-12 flex-1 gap-2 rounded-[18px] bg-white/20 text-white shadow-none hover:bg-white/30" onClick={() => setIsReportDialogOpen(true)}>
                <FileSpreadsheet className="h-4 w-4" />
                Relatorio
              </Button>
              <Button onClick={() => setIsDialogOpen(true)} className="h-12 flex-1 gap-2 rounded-[18px] bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                Novo concessionário
              </Button>
            </div>
          </div>
        </section>

        <div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Referencia da arrecadacao</h2>
              <p className="text-sm text-muted-foreground">Dados trazidos da planilha `ARRECADAÇÃO.xlsx` para pesquisa, filtros e leitura operacional.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeFiltersCount > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCustomReportDialogOpen(true)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Relatorio personalizado
                </Button>
              )}
              <Button
                type="button"
                variant={selectedPeriodoArrecadacao === '2024' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriodoArrecadacao('2024')}
              >
                2024
              </Button>
              <Button
                type="button"
                variant={selectedPeriodoArrecadacao === '2025' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriodoArrecadacao('2025')}
              >
                2025
              </Button>
              <Button
                type="button"
                variant={selectedPeriodoArrecadacao === '2025_periodo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriodoArrecadacao('2025_periodo')}
              >
                2025 periodo
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {filteredReferenceCards.map(([categoria, stats]) => (
              <div key={categoria} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-foreground">{categoriaLabels[categoria]}</h3>
                  <Badge variant="outline" className="rounded-full bg-white">
                    {stats.quantidade} vagas
                  </Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {actualCountByCategoria[categoria]} cadastro(s) encontrado(s) na base
                  {actualCountByCategoria[categoria] !== stats.quantidade
                    ? ` • diferenca de ${stats.quantidade - actualCountByCategoria[categoria]} em relacao as vagas previstas`
                    : ' • base alinhada com as vagas previstas'}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Taxas pagas</p>
                    <p className="font-semibold text-foreground">{stats.atualizados}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Taxas em atraso</p>
                    <p className="font-semibold text-foreground">{stats.pendentes}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Valor arrecadado</p>
                    <p className="font-semibold text-foreground">
                      {stats.arrecadado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Categoria</Label>
                  <select
                    className="flex h-12 w-full appearance-none rounded-[18px] border border-slate-200 bg-slate-50 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:20px] bg-[center_right_12px] px-4 pr-11 text-[15px] font-medium text-slate-900"
                    value={selectedCategoria}
                    onChange={(event) => setSelectedCategoria(event.target.value as 'todas' | CategoriaConcessionario)}
                  >
                    <option value="todas">Todas as categorias</option>
                    {categoriaOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Status</Label>
                  <select
                    className="flex h-12 w-full appearance-none rounded-[18px] border border-slate-200 bg-slate-50 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:20px] bg-[center_right_12px] px-4 pr-11 text-[15px] font-medium text-slate-900"
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value as 'todos' | 'ativo' | 'inativo')}
                  >
                    <option value="todos">Todos</option>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Situacao financeira</Label>
                  <select
                    className="flex h-12 w-full appearance-none rounded-[18px] border border-slate-200 bg-slate-50 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:20px] bg-[center_right_12px] px-4 pr-11 text-[15px] font-medium text-slate-900"
                    value={selectedFinancialStatus}
                    onChange={(event) => setSelectedFinancialStatus(event.target.value as 'todas' | ConcessionarioFinanceiroStatus)}
                  >
                    <option value="todas">Todas</option>
                    <option value="pago">Taxas pagas</option>
                    <option value="prazo_aberto">Prazo em aberto</option>
                    <option value="em_debito">Em debito</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Ano (exercicio)</Label>
                  <select
                    className="flex h-12 w-full appearance-none rounded-[18px] border border-slate-200 bg-slate-50 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:20px] bg-[center_right_12px] px-4 pr-11 text-[15px] font-medium text-slate-900"
                    value={selectedYear ?? ''}
                    onChange={(event) => setSelectedYear(event.target.value ? Number(event.target.value) : null)}
                  >
                    <option value="">Todos os anos</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
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
                    placeholder="Nome, vaga, placa, CPF, rota..."
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

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando concessionarios...</div>
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {filteredItems.map((item) => renderMobileConcessionarioCard(item))}
              {filteredItems.length === 0 && (
                <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
                  Nenhum concessionario encontrado com os filtros aplicados
                </div>
              )}
            </div>
            <div className="hidden overflow-hidden rounded-[22px] border border-border bg-card lg:block">
              <DataTable
                data={filteredItems}
                columns={columns}
                onView={setViewingItem}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleAtivo={handleToggleAtivo}
                onMarkAsPaid={handleOpenPaymentDialog}
                canMarkAsPaid={(item) => getConcessionarioFinancialStatus(item) === 'em_debito'}
                emptyMessage="Nenhum concessionario encontrado com os filtros aplicados"
              />
            </div>
          </>
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
          description="Escolha o recorte dos concessionarios e o formato."
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
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativos">Ativos</SelectItem>
                  <SelectItem value="inativos">Inativos</SelectItem>
                  <SelectItem value="sem_acesso">Sem acesso</SelectItem>
                  <SelectItem value="categoria_atual">Categoria filtrada</SelectItem>
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
          onOpenChange={handleDialogOpenChange}
          title={editingItem ? 'Editar concessionário' : 'Novo concessionário'}
          description={editingItem ? 'Use as abas para navegar entre as seções. Cada aba pode ser salva individualmente.' : 'Preencha os campos conforme a categoria e os dados da planilha.'}
          onCancel={editingItem ? undefined : () => resetAndCloseForm()}
          onConfirm={editingItem ? undefined : handleSubmit}
          confirmLabel={editingItem ? undefined : (saving ? 'Salvando...' : 'Cadastrar')}
        >
          {editingItem ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="py-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="concessao" className="text-xs">Concessão</TabsTrigger>
                <TabsTrigger value="veiculo" className="text-xs">Veículo</TabsTrigger>
                <TabsTrigger value="pessoal" className="text-xs">Pessoal</TabsTrigger>
              </TabsList>

              <TabsContent value="concessao" className="space-y-6 pt-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Dados da concessão</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Categoria *">
                      <select
                        className="flex h-10 w-full appearance-none rounded-md border border-input bg-background bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:18px] bg-[center_right_10px] px-3 pr-9 text-sm"
                        value={formData.categoria}
                        onChange={(event) => setFormData((current) => ({ ...current, categoria: event.target.value as CategoriaConcessionario }))}
                      >
                        {categoriaOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Número da vaga / bata">
                      <Input value={formData.numero_vaga} onChange={(event) => setFormData((current) => ({ ...current, numero_vaga: event.target.value }))} placeholder="Ex: 123" />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Grupo do táxi">
                      <Input
                        value={formData.taxi_grupo}
                        onChange={(event) => setFormData((current) => ({ ...current, taxi_grupo: event.target.value }))}
                        placeholder="ASTAC, COOTAC ou DISTRITO"
                      />
                    </Field>
                    <Field label="Estacionamento">
                      <Input
                        value={formData.estacionamento}
                        onChange={(event) => setFormData((current) => ({ ...current, estacionamento: event.target.value }))}
                        placeholder="Nome do estacionamento"
                      />
                    </Field>
                  </div>
                  <Field label="Ponto / distrito / referência">
                    <Input value={formData.ponto_referencia} onChange={(event) => setFormData((current) => ({ ...current, ponto_referencia: event.target.value }))} placeholder="Ex: Centro, Distrito Industrial" />
                  </Field>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Observações</h3>
                  <Field label="Observações">
                    <Textarea rows={3} value={formData.observacoes} onChange={(event) => setFormData((current) => ({ ...current, observacoes: event.target.value }))} placeholder="Informações adicionais sobre o concessionário" />
                  </Field>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Vigência</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Último alvará">
                      <Input type="date" value={formData.ultimo_alvara} onChange={(event) => setFormData((current) => ({ ...current, ultimo_alvara: event.target.value }))} />
                    </Field>
                    <Field label="Exercício">
                      <Input value={formData.exercicio} onChange={(event) => setFormData((current) => ({ ...current, exercicio: event.target.value }))} placeholder="Ex: 2024" />
                    </Field>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Documento da concessão</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Nome do arquivo">
                      <div className="flex items-center gap-2">
                        <Input value={formData.concessao_arquivo_nome} onChange={(event) => setFormData((current) => ({ ...current, concessao_arquivo_nome: event.target.value }))} placeholder="Ex: concessao.pdf" />
                        {formData.concessao_arquivo_url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={handleRemoveConcessao}
                            title="Remover arquivo"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Field>
                    <Field label="Arquivo PDF">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          id="concessao-pdf-edit"
                          onChange={handleUploadConcessao}
                          disabled={uploadingConcessao}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={uploadingConcessao}
                          asChild
                        >
                          <label htmlFor="concessao-pdf-edit" className="cursor-pointer">
                            {uploadingConcessao ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {uploadingConcessao ? 'Enviando...' : 'Selecionar PDF'}
                          </label>
                        </Button>
                        {formData.concessao_arquivo_nome && (
                          <span className="truncate text-sm text-muted-foreground max-w-[200px]">
                            {formData.concessao_arquivo_nome}
                          </span>
                        )}
                      </div>
                    </Field>
                  </div>
                  {formData.concessao_arquivo_url && (
                    <a href={formData.concessao_arquivo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 underline">
                      {formData.concessao_arquivo_nome || 'Abrir arquivo'}
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                  <Switch checked={formData.ativo} onCheckedChange={(checked) => setFormData((current) => ({ ...current, ativo: checked }))} />
                  <span className="text-sm text-muted-foreground">{formData.ativo ? 'Cadastro ativo' : 'Cadastro inativo'}</span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Notificações</h3>
                  <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                    <Switch checked={formData.aceita_notificacoes} onCheckedChange={(checked) => setFormData((current) => ({ ...current, aceita_notificacoes: checked }))} />
                    <span className="text-sm text-muted-foreground">{formData.aceita_notificacoes ? 'Recebe notificações pelo portal' : 'Notificações desativadas para o concessionário'}</span>
                  </div>
                </div>
                {formData.origem_planilha && (
                  <p className="text-xs text-muted-foreground">
                    Origem da planilha: {formData.origem_planilha}
                  </p>
                )}

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button onClick={handleSaveConcessao} disabled={savingTab === 'concessao'} className="gap-2">
                    {savingTab === 'concessao' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {savingTab === 'concessao' ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="veiculo" className="space-y-6 pt-4">
                {editingItem && getConcessionarioFinancialStatus(editingItem) === 'em_debito' && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-red-800">Taxas em débito</p>
                        <p className="text-xs text-red-600">O concessionário está com o exercício pendente.</p>
                      </div>
                      <Button type="button" size="sm" className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleOpenPaymentDialog(editingItem)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Marcar como pago
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Dados do veículo</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Veículo">
                      <Input value={formData.veiculo} onChange={(event) => setFormData((current) => ({ ...current, veiculo: event.target.value }))} placeholder="Ex: Honda CG 150" />
                    </Field>
                    <Field label="Marca">
                      <Input value={formData.marca} onChange={(event) => setFormData((current) => ({ ...current, marca: event.target.value }))} placeholder="Ex: Honda" />
                    </Field>
                    <Field label="Modelo">
                      <Input value={formData.modelo} onChange={(event) => setFormData((current) => ({ ...current, modelo: event.target.value }))} placeholder="Ex: CG 150 Fan" />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Cor">
                      <Input value={formData.cor} onChange={(event) => setFormData((current) => ({ ...current, cor: event.target.value }))} placeholder="Ex: Vermelha" />
                    </Field>
                    <Field label="Fabricação">
                      <Input value={formData.fabricacao} onChange={(event) => setFormData((current) => ({ ...current, fabricacao: event.target.value }))} placeholder="Ex: 2020" />
                    </Field>
                    <Field label="Placa">
                      <Input value={formData.placa} onChange={(event) => setFormData((current) => ({ ...current, placa: normalizePlate(event.target.value) }))} placeholder="ABC-1234" />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Ano de fabricação">
                      <Input value={formData.ano_fabricacao} onChange={(event) => setFormData((current) => ({ ...current, ano_fabricacao: event.target.value }))} placeholder="Ex: 2020" />
                    </Field>
                    <Field label="Ano do modelo">
                      <Input value={formData.ano_modelo} onChange={(event) => setFormData((current) => ({ ...current, ano_modelo: event.target.value }))} placeholder="Ex: 2021" />
                    </Field>
                    <Field label="Chassi">
                      <Input value={formData.chassi} onChange={(event) => setFormData((current) => ({ ...current, chassi: event.target.value }))} placeholder="Número do chassi" />
                    </Field>
                  </div>
                  {formData.categoria === 'carro_horario' && (
                    <Field label="Rota">
                      <Input value={formData.rota} onChange={(event) => setFormData((current) => ({ ...current, rota: event.target.value }))} placeholder="Ex: Canindé - Fortaleza" />
                    </Field>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button onClick={handleSaveVeiculo} disabled={savingTab === 'veiculo'} className="gap-2">
                    {savingTab === 'veiculo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {savingTab === 'veiculo' ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="pessoal" className="space-y-6 pt-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Dados pessoais</h3>
                  <Field label="Nome do concessionário *">
                    <Input value={formData.titular_nome} onChange={(event) => setFormData((current) => ({ ...current, titular_nome: event.target.value }))} placeholder="Nome completo do concessionário" />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="CPF">
                      <Input value={formData.cpf} onChange={(event) => setFormData((current) => ({ ...current, cpf: maskCpf(event.target.value) }))} placeholder="000.000.000-00" />
                    </Field>
                    <Field label="Email do concessionário">
                      <Input value={formData.email_notificacao} onChange={(event) => setFormData((current) => ({ ...current, email_notificacao: event.target.value }))} type="email" placeholder="concessionario@email.com" />
                    </Field>
                    <Field label="Telefone do concessionário">
                      <Input value={formData.telefone_notificacao} onChange={(event) => setFormData((current) => ({ ...current, telefone_notificacao: event.target.value }))} placeholder="(00) 00000-0000" />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Número da CNH">
                      <Input value={formData.cnh_numero} onChange={(event) => setFormData((current) => ({ ...current, cnh_numero: event.target.value }))} placeholder="Número do documento" />
                    </Field>
                    <Field label="Validade da CNH">
                      <Input type="date" value={formData.validade_cnh} onChange={(event) => setFormData((current) => ({ ...current, validade_cnh: event.target.value }))} />
                    </Field>
                    <Field label="Categoria CNH">
                      <Input value={formData.categoria_cnh} onChange={(event) => setFormData((current) => ({ ...current, categoria_cnh: event.target.value }))} placeholder="Ex: A, B, AB" />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Atividade remunerada">
                      <Input value={formData.atividade_remunerada} onChange={(event) => setFormData((current) => ({ ...current, atividade_remunerada: event.target.value }))} placeholder="Ex: Motorista de táxi" />
                    </Field>
                    <Field label="Início da atividade">
                      <Input type="date" value={formData.inicio_atividade} onChange={(event) => setFormData((current) => ({ ...current, inicio_atividade: event.target.value }))} />
                    </Field>
                  </div>
                  <Field label="Curso">
                    <Input value={formData.curso} onChange={(event) => setFormData((current) => ({ ...current, curso: event.target.value }))} placeholder="Ex: Curso de condutor" />
                  </Field>
                  {(formData.categoria === 'taxi' || formData.categoria === 'carro_horario') && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Motorista auxiliar">
                        <Input value={formData.motorista_auxiliar} onChange={(event) => setFormData((current) => ({ ...current, motorista_auxiliar: event.target.value }))} placeholder="Nome completo" />
                      </Field>
                      <Field label="CNH auxiliar / registro">
                        <Input value={formData.cnh_auxiliar} onChange={(event) => setFormData((current) => ({ ...current, cnh_auxiliar: event.target.value }))} placeholder="Número do documento" />
                      </Field>
                      <Field label="Validade CNH auxiliar">
                        <Input type="date" value={formData.validade_cnh_auxiliar} onChange={(event) => setFormData((current) => ({ ...current, validade_cnh_auxiliar: event.target.value }))} />
                      </Field>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Endereço</h3>
                  <div className="flex gap-3 items-start">
                    <div className="flex-1">
                      <Field label="Logradouro">
                        <Input value={formData.logradouro} onChange={(event) => setFormData((current) => ({ ...current, logradouro: event.target.value }))} placeholder="Rua, avenida, etc" />
                      </Field>
                    </div>
                    <div className="w-[120px] shrink-0">
                      <Field label="Número">
                        <Input value={formData.numero} onChange={(event) => setFormData((current) => ({ ...current, numero: event.target.value }))} placeholder="Nº" maxLength={8} />
                      </Field>
                    </div>
                  </div>
                  <Field label="Bairro / Distrito">
                    <Input value={formData.bairro_distrito} onChange={(event) => setFormData((current) => ({ ...current, bairro_distrito: event.target.value }))} placeholder="Bairro ou distrito" />
                  </Field>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button onClick={handleSavePessoal} disabled={savingTab === 'pessoal'} className="gap-2">
                    {savingTab === 'pessoal' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {savingTab === 'pessoal' ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="py-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="concessao" className="text-xs">Concessão</TabsTrigger>
                <TabsTrigger value="veiculo" className="text-xs">Veículo</TabsTrigger>
                <TabsTrigger value="pessoal" className="text-xs">Pessoal</TabsTrigger>
              </TabsList>

              <TabsContent value="concessao" className="space-y-6 pt-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Dados da concessão</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Categoria *">
                      <select
                        className="flex h-10 w-full appearance-none rounded-md border border-input bg-background bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:18px] bg-[center_right_10px] px-3 pr-9 text-sm"
                        value={formData.categoria}
                        onChange={(event) => setFormData((current) => ({ ...current, categoria: event.target.value as CategoriaConcessionario }))}
                      >
                        {categoriaOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Número da vaga / bata">
                      <Input value={formData.numero_vaga} onChange={(event) => setFormData((current) => ({ ...current, numero_vaga: event.target.value }))} placeholder="Ex: 123" />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Grupo do táxi">
                      <Input value={formData.taxi_grupo} onChange={(event) => setFormData((current) => ({ ...current, taxi_grupo: event.target.value }))} placeholder="ASTAC, COOTAC ou DISTRITO" />
                    </Field>
                    <Field label="Estacionamento">
                      <Input value={formData.estacionamento} onChange={(event) => setFormData((current) => ({ ...current, estacionamento: event.target.value }))} placeholder="Nome do estacionamento" />
                    </Field>
                  </div>
                  <Field label="Ponto / distrito / referência">
                    <Input value={formData.ponto_referencia} onChange={(event) => setFormData((current) => ({ ...current, ponto_referencia: event.target.value }))} placeholder="Ex: Centro, Distrito Industrial" />
                  </Field>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Observações</h3>
                  <Field label="Observações">
                    <Textarea rows={3} value={formData.observacoes} onChange={(event) => setFormData((current) => ({ ...current, observacoes: event.target.value }))} placeholder="Informações adicionais sobre o concessionário" />
                  </Field>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Vigência</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Último alvará">
                      <Input type="date" value={formData.ultimo_alvara} onChange={(event) => setFormData((current) => ({ ...current, ultimo_alvara: event.target.value }))} />
                    </Field>
                    <Field label="Exercício">
                      <Input value={formData.exercicio} onChange={(event) => setFormData((current) => ({ ...current, exercicio: event.target.value }))} placeholder="Ex: 2024" />
                    </Field>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Documento da concessão</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Nome do arquivo">
                      <div className="flex items-center gap-2">
                        <Input value={formData.concessao_arquivo_nome} onChange={(event) => setFormData((current) => ({ ...current, concessao_arquivo_nome: event.target.value }))} placeholder="Ex: concessao.pdf" />
                        {formData.concessao_arquivo_url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={handleRemoveConcessao}
                            title="Remover arquivo"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Field>
                    <Field label="Arquivo PDF">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          id="concessao-pdf-new"
                          onChange={handleUploadConcessao}
                          disabled={uploadingConcessao}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={uploadingConcessao}
                          asChild
                        >
                          <label htmlFor="concessao-pdf-new" className="cursor-pointer">
                            {uploadingConcessao ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {uploadingConcessao ? 'Enviando...' : 'Selecionar PDF'}
                          </label>
                        </Button>
                        {formData.concessao_arquivo_nome && (
                          <span className="truncate text-sm text-muted-foreground max-w-[200px]">
                            {formData.concessao_arquivo_nome}
                          </span>
                        )}
                      </div>
                    </Field>
                  </div>
                  {formData.concessao_arquivo_url && (
                    <a href={formData.concessao_arquivo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 underline">
                      {formData.concessao_arquivo_nome || 'Abrir arquivo'}
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                  <Switch checked={formData.ativo} onCheckedChange={(checked) => setFormData((current) => ({ ...current, ativo: checked }))} />
                  <span className="text-sm text-muted-foreground">{formData.ativo ? 'Cadastro ativo' : 'Cadastro inativo'}</span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Notificações</h3>
                  <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                    <Switch checked={formData.aceita_notificacoes} onCheckedChange={(checked) => setFormData((current) => ({ ...current, aceita_notificacoes: checked }))} />
                    <span className="text-sm text-muted-foreground">{formData.aceita_notificacoes ? 'Recebe notificações pelo portal' : 'Notificações desativadas para o concessionário'}</span>
                  </div>
                </div>
                {formData.origem_planilha && (
                  <p className="text-xs text-muted-foreground">
                    Origem da planilha: {formData.origem_planilha}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="veiculo" className="space-y-6 pt-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Dados do veículo</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Veículo">
                      <Input value={formData.veiculo} onChange={(event) => setFormData((current) => ({ ...current, veiculo: event.target.value }))} placeholder="Ex: Honda CG 150" />
                    </Field>
                    <Field label="Marca">
                      <Input value={formData.marca} onChange={(event) => setFormData((current) => ({ ...current, marca: event.target.value }))} placeholder="Ex: Honda" />
                    </Field>
                    <Field label="Modelo">
                      <Input value={formData.modelo} onChange={(event) => setFormData((current) => ({ ...current, modelo: event.target.value }))} placeholder="Ex: CG 150 Fan" />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Cor">
                      <Input value={formData.cor} onChange={(event) => setFormData((current) => ({ ...current, cor: event.target.value }))} placeholder="Ex: Vermelha" />
                    </Field>
                    <Field label="Fabricação">
                      <Input value={formData.fabricacao} onChange={(event) => setFormData((current) => ({ ...current, fabricacao: event.target.value }))} placeholder="Ex: 2020" />
                    </Field>
                    <Field label="Placa">
                      <Input value={formData.placa} onChange={(event) => setFormData((current) => ({ ...current, placa: normalizePlate(event.target.value) }))} placeholder="ABC-1234" />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Ano de fabricação">
                      <Input value={formData.ano_fabricacao} onChange={(event) => setFormData((current) => ({ ...current, ano_fabricacao: event.target.value }))} placeholder="Ex: 2020" />
                    </Field>
                    <Field label="Ano do modelo">
                      <Input value={formData.ano_modelo} onChange={(event) => setFormData((current) => ({ ...current, ano_modelo: event.target.value }))} placeholder="Ex: 2021" />
                    </Field>
                    <Field label="Chassi">
                      <Input value={formData.chassi} onChange={(event) => setFormData((current) => ({ ...current, chassi: event.target.value }))} placeholder="Número do chassi" />
                    </Field>
                  </div>
                  {formData.categoria === 'carro_horario' && (
                    <Field label="Rota">
                      <Input value={formData.rota} onChange={(event) => setFormData((current) => ({ ...current, rota: event.target.value }))} placeholder="Ex: Canindé - Fortaleza" />
                    </Field>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="pessoal" className="space-y-6 pt-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Dados pessoais</h3>
                  <Field label="Nome do concessionário *">
                    <Input value={formData.titular_nome} onChange={(event) => setFormData((current) => ({ ...current, titular_nome: event.target.value }))} placeholder="Nome completo do concessionário" />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="CPF">
                      <Input value={formData.cpf} onChange={(event) => setFormData((current) => ({ ...current, cpf: maskCpf(event.target.value) }))} placeholder="000.000.000-00" />
                    </Field>
                    <Field label="Email do concessionário">
                      <Input value={formData.email_notificacao} onChange={(event) => setFormData((current) => ({ ...current, email_notificacao: event.target.value }))} type="email" placeholder="concessionario@email.com" />
                    </Field>
                    <Field label="Telefone do concessionário">
                      <Input value={formData.telefone_notificacao} onChange={(event) => setFormData((current) => ({ ...current, telefone_notificacao: event.target.value }))} placeholder="(00) 00000-0000" />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Número da CNH">
                      <Input value={formData.cnh_numero} onChange={(event) => setFormData((current) => ({ ...current, cnh_numero: event.target.value }))} placeholder="Número do documento" />
                    </Field>
                    <Field label="Validade da CNH">
                      <Input type="date" value={formData.validade_cnh} onChange={(event) => setFormData((current) => ({ ...current, validade_cnh: event.target.value }))} />
                    </Field>
                    <Field label="Categoria CNH">
                      <Input value={formData.categoria_cnh} onChange={(event) => setFormData((current) => ({ ...current, categoria_cnh: event.target.value }))} placeholder="Ex: A, B, AB" />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Atividade remunerada">
                      <Input value={formData.atividade_remunerada} onChange={(event) => setFormData((current) => ({ ...current, atividade_remunerada: event.target.value }))} placeholder="Ex: Motorista de táxi" />
                    </Field>
                    <Field label="Início da atividade">
                      <Input type="date" value={formData.inicio_atividade} onChange={(event) => setFormData((current) => ({ ...current, inicio_atividade: event.target.value }))} />
                    </Field>
                  </div>
                  <Field label="Curso">
                    <Input value={formData.curso} onChange={(event) => setFormData((current) => ({ ...current, curso: event.target.value }))} placeholder="Ex: Curso de condutor" />
                  </Field>
                  {(formData.categoria === 'taxi' || formData.categoria === 'carro_horario') && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Motorista auxiliar">
                        <Input value={formData.motorista_auxiliar} onChange={(event) => setFormData((current) => ({ ...current, motorista_auxiliar: event.target.value }))} placeholder="Nome completo" />
                      </Field>
                      <Field label="CNH auxiliar / registro">
                        <Input value={formData.cnh_auxiliar} onChange={(event) => setFormData((current) => ({ ...current, cnh_auxiliar: event.target.value }))} placeholder="Número do documento" />
                      </Field>
                      <Field label="Validade CNH auxiliar">
                        <Input type="date" value={formData.validade_cnh_auxiliar} onChange={(event) => setFormData((current) => ({ ...current, validade_cnh_auxiliar: event.target.value }))} />
                      </Field>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Endereço</h3>
                  <div className="flex gap-3 items-start">
                    <div className="flex-1">
                      <Field label="Logradouro">
                        <Input value={formData.logradouro} onChange={(event) => setFormData((current) => ({ ...current, logradouro: event.target.value }))} placeholder="Rua, avenida, etc" />
                      </Field>
                    </div>
                    <div className="w-[120px] shrink-0">
                      <Field label="Número">
                        <Input value={formData.numero} onChange={(event) => setFormData((current) => ({ ...current, numero: event.target.value }))} placeholder="Nº" maxLength={8} />
                      </Field>
                    </div>
                  </div>
                  <Field label="Bairro / Distrito">
                    <Input value={formData.bairro_distrito} onChange={(event) => setFormData((current) => ({ ...current, bairro_distrito: event.target.value }))} placeholder="Bairro ou distrito" />
                  </Field>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </ResponsiveDialog>

        <ResponsiveDialog
          open={Boolean(viewingItem)}
          onOpenChange={(open) => {
            if (!open) setViewingItem(null);
          }}
          title="Detalhes do concessionario"
          description={viewingItem ? `${viewingItem.titular_nome || '-'} • ${categoriaLabels[viewingItem.categoria]}` : ''}
        >
          {viewingItem && (
            <ConcessionarioDetails
              item={viewingItem}
              onNotify={() => {
                setNotifyItem(viewingItem);
                setNotifyForm({
                  titulo: '',
                  mensagem: '',
                  tipo: 'geral',
                });
              }}
              onMarkAsPaid={() => {
                handleOpenPaymentDialog(viewingItem!);
                setViewingItem(null);
              }}
              onEdit={() => {
                handleEdit(viewingItem);
                setViewingItem(null);
              }}
            />
          )}
        </ResponsiveDialog>

        {notifyItem && (
          <>
            <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => { setNotifyItem(null); setNotifyForm({ titulo: '', mensagem: '', tipo: 'geral' }); }} />
            <div className="fixed inset-y-0 right-0 z-[110] w-full sm:max-w-md bg-background shadow-xl border-l flex flex-col animate-in slide-in-from-right duration-300">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">Enviar notificacao</h2>
                  <p className="text-sm text-muted-foreground">
                    {notifyItem ? `Notifique ${notifyItem.titular_nome || 'o concessionario'} na area publica.` : ''}
                  </p>
                </div>
                <button type="button" onClick={() => { setNotifyItem(null); setNotifyForm({ titulo: '', mensagem: '', tipo: 'geral' }); }} className="rounded-sm opacity-70 hover:opacity-100 transition-opacity">
                  <X className="h-5 w-5" />
                  <span className="sr-only">Fechar</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="space-y-4">
                  <Field label="Titulo">
                    <Input value={notifyForm.titulo} onChange={(event) => setNotifyForm((current) => ({ ...current, titulo: event.target.value }))} />
                  </Field>
                  <Field label="Tipo">
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={notifyForm.tipo}
                      onChange={(event) => setNotifyForm((current) => ({ ...current, tipo: event.target.value }))}
                    >
                      <option value="geral">Geral</option>
                      <option value="cadastro">Cadastro</option>
                      <option value="financeiro">Financeiro</option>
                      <option value="alerta">Alerta</option>
                    </select>
                  </Field>
                  <Field label="Mensagem">
                    <Textarea rows={5} value={notifyForm.mensagem} onChange={(event) => setNotifyForm((current) => ({ ...current, mensagem: event.target.value }))} />
                  </Field>
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t px-6 py-4">
                <Button variant="outline" onClick={() => { setNotifyItem(null); setNotifyForm({ titulo: '', mensagem: '', tipo: 'geral' }); }}>Cancelar</Button>
                <Button onClick={handleSendNotification} disabled={sendingNotification}>
                  {sendingNotification ? 'Enviando...' : 'Enviar notificacao'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
      <AlertDialog open={unsavedDialogOpen} onOpenChange={(val) => { if (!val) setUnsavedDialogOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Existem alterações que ainda não foram salvas. Deseja salvar antes de fechar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={handleUnsavedDiscard}>
              Descartar
            </Button>
            <Button variant="outline" onClick={() => setUnsavedDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUnsavedSave}>
              Salvar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {confirmDialog}

      <ResponsiveDialog
        open={Boolean(paymentDialogItem)}
        onOpenChange={(open) => { if (!open) { setPaymentDialogItem(null); setPaymentDialogDate(''); } }}
        title="Marcar taxas como pagas"
        description={paymentDialogItem ? `Confirmar pagamento das taxas de ${paymentDialogItem.titular_nome}` : ''}
        onCancel={() => { setPaymentDialogItem(null); setPaymentDialogDate(''); }}
        onConfirm={handleConfirmPayment}
        confirmLabel={paymentDialogSaving ? 'Salvando...' : 'Confirmar pagamento'}
        confirmLoading={paymentDialogSaving}
      >
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Data do pagamento</Label>
            <Input
              type="date"
              value={paymentDialogDate}
              onChange={(e) => setPaymentDialogDate(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              {paymentDialogDate && `Exercício: ${paymentDialogDate.slice(0, 4)}`}
            </p>
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        title="Importar concessionarios"
        description="Baixe o modelo da planilha, preencha os dados e faca o upload."
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
                disabled={importing}
              />
              <Button type="button" variant="default" className="gap-2" disabled={importing} asChild>
                <span>
                  <Upload className="h-4 w-4" />
                  {importing ? 'Importando...' : 'Selecionar arquivo'}
                </span>
              </Button>
            </label>
          </div>
        </div>
      </ResponsiveDialog>
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
  icon: typeof IdCard;
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{children}</h3>;
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{label === 'Situacao financeira' ? value : (value || '-')}</p>
    </div>
  );
}

function ConcessionarioDetails({ item, onNotify, onMarkAsPaid, onEdit }: { item: DemutranConcessionario; onNotify: () => void; onMarkAsPaid?: () => void; onEdit?: () => void }) {
  const financial = getConcessionarioFinancialCopy(item);

  const handlePrint = () => {
    const allEntries: [string, string][] = [
      ['Categoria', categoriaLabels[item.categoria]],
      ['Grupo do taxi', item.taxi_grupo || '-'],
      ['Situacao financeira', financial.label],
      ['Estacionamento', item.estacionamento || '-'],
      ['Numero da vaga / bata', item.numero_vaga || '-'],
      ['Nome', item.titular_nome || '-'],
      ['Logradouro', item.logradouro || '-'],
      ['Numero', item.numero || '-'],
      ['Bairro / Distrito', item.bairro_distrito || '-'],
      ['Veiculo', item.veiculo || '-'],
      ['Marca', item.marca || '-'],
      ['Cor', item.cor || '-'],
      ['Modelo', item.modelo || '-'],
      ['Ano fabricacao', item.ano_fabricacao || '-'],
      ['Ano modelo', item.ano_modelo || '-'],
      ['Chassi', item.chassi || '-'],
      ['Placa', item.placa || '-'],
      ['Fabricacao', item.fabricacao || '-'],
      ['Ultimo alvara', item.ultimo_alvara || '-'],
      ['Exercicio', item.exercicio || '-'],
      ['CPF', item.cpf || '-'],
      ['Inicio', item.inicio_atividade || '-'],
      ['CNH', item.cnh_numero || '-'],
      ['Validade CNH', item.validade_cnh || '-'],
      ['Atividade remunerada', item.atividade_remunerada || '-'],
      ['Curso', item.curso || '-'],
      ...(item.categoria === 'taxi' || item.categoria === 'carro_horario'
        ? [
            ['Motorista auxiliar', item.motorista_auxiliar || '-'] as [string, string],
            ['CNH auxiliar / registro', item.cnh_auxiliar || '-'] as [string, string],
            ['Validade CNH auxiliar', item.validade_cnh_auxiliar || '-'] as [string, string],
          ]
        : []),
      ['Categoria CNH', item.categoria_cnh || '-'],
      ...(item.categoria === 'carro_horario'
        ? [['Rota', item.rota || '-'] as [string, string]]
        : []),
      ['Ponto / distrito', item.ponto_referencia || '-'],
      ['Email notificacao', item.email_notificacao || '-'],
      ['Telefone notificacao', item.telefone_notificacao || '-'],
      ['Recebe notificacoes', item.aceita_notificacoes ? 'Sim' : 'Nao'],
      ['Status', item.ativo ? 'Ativo' : 'Inativo'],
    ];
    const rows = allEntries.map(([label, value]) =>
      `<tr><td style="border:1px solid #cbd5e1;padding:6px;">${label}</td><td style="border:1px solid #cbd5e1;padding:6px;">${value}</td></tr>`
    ).join('');
    const obs = item.observacoes
      ? `<h3 style="font-size:14px;margin:16px 0 8px;">Observacoes</h3><p style="margin:0;font-size:12px;">${item.observacoes}</p>`
      : '';
    const html = `
      <h3 style="font-size:18px;margin:0 0 4px;">${item.titular_nome || '-'}</h3>
      <p style="color:#475569;margin:0 0 12px;">${item.veiculo || 'Sem veiculo'} ${item.placa ? '• ' + item.placa : ''}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:12px;">
        <tr><th style="border:1px solid #cbd5e1;padding:6px;background:#e2e8f0;text-align:left;">Campo</th><th style="border:1px solid #cbd5e1;padding:6px;background:#e2e8f0;text-align:left;">Valor</th></tr>
        ${rows}
      </table>
      ${obs}`;
    printHtml('Concessionario - ' + (item.titular_nome || item.placa || ''), html);
  };

  return (
    <div className="space-y-5 py-2">
      <div className={cn(
        'rounded-2xl border px-4 py-3',
        financial.status === 'pago' && 'border-emerald-200 bg-emerald-50/70 text-emerald-800',
        financial.status === 'prazo_aberto' && 'border-blue-200 bg-blue-50/70 text-blue-800',
        financial.status === 'em_debito' && 'border-red-200 bg-red-50/80 text-red-800',
      )}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">{financial.label}</p>
            <p className="mt-1 text-sm">{financial.description}</p>
          </div>
          {financial.status === 'em_debito' && onMarkAsPaid && (
            <Button
              type="button"
              size="sm"
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onMarkAsPaid}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Marcar como pago
            </Button>
          )}
        </div>
      </div>
      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Concessionario</p>
            <h3 className="mt-1 text-xl font-bold text-foreground">{item.titular_nome || '-'}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.veiculo || 'Sem veiculo informado'}</p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'rounded-full px-3 py-1 text-xs font-bold',
              item.ativo ? statusBadgeClasses.ativo : statusBadgeClasses.inativo,
            )}
          >
            {item.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onNotify}>
            <Bell className="h-4 w-4" />
            Enviar notificacao
          </Button>
          {onEdit && (
            <Button type="button" variant="default" size="sm" className="gap-2" onClick={onEdit}>
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeader>Dados da concessao</SectionHeader>
        <div className="grid gap-4 md:grid-cols-3">
          <DetailCard label="Categoria" value={categoriaLabels[item.categoria]} />
          <DetailCard label="Situacao financeira" value={financial.label} />
          <DetailCard label="Numero da vaga / bata" value={item.numero_vaga || '-'} />
          <DetailCard label="Grupo do taxi" value={item.taxi_grupo || '-'} />
          <DetailCard label="Estacionamento" value={item.estacionamento || '-'} />
          <DetailCard label="Ponto / distrito" value={item.ponto_referencia || '-'} />
          <DetailCard label="Exercicio" value={item.exercicio || '-'} />
          {item.categoria === 'carro_horario' && (
            <DetailCard label="Rota" value={item.rota || '-'} />
          )}
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeader>Dados do concessionario</SectionHeader>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <DetailCard label="Nome" value={item.titular_nome || '-'} />
          </div>
          <DetailCard label="CPF" value={item.cpf || '-'} />
        </div>
        <DetailCard label="Logradouro" value={item.logradouro || '-'} />
        <DetailCard label="Numero" value={item.numero || '-'} />
        <DetailCard label="Bairro / Distrito" value={item.bairro_distrito || '-'} />
      </div>

      <div className="space-y-4">
        <SectionHeader>Dados do veiculo</SectionHeader>
        <div className="grid gap-4 md:grid-cols-3">
          <DetailCard label="Veiculo" value={item.veiculo || '-'} />
          <DetailCard label="Marca" value={item.marca || '-'} />
          <DetailCard label="Cor" value={item.cor || '-'} />
          <DetailCard label="Modelo" value={item.modelo || '-'} />
          <DetailCard label="Ano fabricacao" value={item.ano_fabricacao || '-'} />
          <DetailCard label="Ano modelo" value={item.ano_modelo || '-'} />
          <DetailCard label="Chassi" value={item.chassi || '-'} />
          <DetailCard label="Placa" value={item.placa || '-'} />
          <DetailCard label="Fabricacao" value={item.fabricacao || '-'} />
          <DetailCard label="Ultimo alvara" value={item.ultimo_alvara || '-'} />
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeader>Habilitacao</SectionHeader>
        <div className="grid gap-4 md:grid-cols-3">
          <DetailCard label="CNH" value={item.cnh_numero || '-'} />
          <DetailCard label="Validade CNH" value={item.validade_cnh || '-'} />
          <DetailCard label="Categoria CNH" value={item.categoria_cnh || '-'} />
          <DetailCard label="Atividade remunerada" value={item.atividade_remunerada || '-'} />
          <DetailCard label="Curso" value={item.curso || '-'} />
          <DetailCard label="Inicio da atividade" value={item.inicio_atividade || '-'} />
        </div>
      </div>

      {(item.categoria === 'taxi' || item.categoria === 'carro_horario') && (
        <div className="space-y-4">
          <SectionHeader>Motorista auxiliar</SectionHeader>
          <DetailCard label="Nome" value={item.motorista_auxiliar || '-'} />
          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard label="CNH auxiliar / registro" value={item.cnh_auxiliar || '-'} />
            <DetailCard label="Validade CNH auxiliar" value={item.validade_cnh_auxiliar || '-'} />
          </div>
        </div>
      )}

      <div className="space-y-4">
        <SectionHeader>Notificacao</SectionHeader>
        <div className="grid gap-4 md:grid-cols-3">
          <DetailCard label="Email" value={item.email_notificacao || '-'} />
          <DetailCard label="Telefone" value={item.telefone_notificacao || '-'} />
          <DetailCard label="Recebe notificacoes" value={item.aceita_notificacoes ? 'Sim' : 'Nao'} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Observacoes</p>
        <p className="mt-1 text-sm font-medium text-foreground">{item.observacoes || '-'}</p>
      </div>

      <div className="space-y-4">
        <SectionHeader>Documento da concessao</SectionHeader>
        <DetailCard label="Arquivo" value={item.concessao_arquivo_nome || '-'} />
        {item.concessao_arquivo_url && (
          <a href={item.concessao_arquivo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 underline px-4">
            {item.concessao_arquivo_nome || 'Abrir arquivo'}
          </a>
        )}
      </div>
    </div>
  );
}

export default DemutranConcessionarios;
