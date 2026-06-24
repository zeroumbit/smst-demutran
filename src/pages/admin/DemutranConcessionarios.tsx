import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, Eye, FileSpreadsheet, IdCard, Loader2, Plus, Search, SlidersHorizontal, Upload, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
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
import { buildReportFileName, exportReportCsv, formatReportDate, openPdfPrintReport } from '@/lib/reports';
import { getConcessionarioFinancialCopy, getConcessionarioFinancialStatus } from '@/lib/demutranConcessionarioFinanceiro';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { DemutranConcessionario, Setor } from '@/types/admin';

type CategoriaConcessionario = DemutranConcessionario['categoria'];

type FormData = {
  categoria: CategoriaConcessionario;
  origem_planilha: string;
  ponto_referencia: string;
  numero_vaga: string;
  titular_nome: string;
  endereco: string;
  veiculo: string;
  placa: string;
  fabricacao: string;
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
  senha_acesso: string;
  confirmar_senha_acesso: string;
  ativo: boolean;
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

const initialForm: FormData = {
  categoria: 'mototaxi',
  origem_planilha: '',
  ponto_referencia: '',
  numero_vaga: '',
  titular_nome: '',
  endereco: '',
  veiculo: '',
  placa: '',
  fabricacao: '',
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
  senha_acesso: '',
  confirmar_senha_acesso: '',
  ativo: true,
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

const mapSheetRows = (sheetName: string, rows: unknown[][]): ParsedImportRow[] => {
  const categoria = getCategoriaFromSheet(sheetName);
  if (!categoria) return [];

  const mapped: ParsedImportRow[] = [];
  let districtTitle = '';

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
  const [selectedSetorId, setSelectedSetorId] = useState('');
  const [accessMap, setAccessMap] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DemutranConcessionario | null>(null);
  const [viewingItem, setViewingItem] = useState<DemutranConcessionario | null>(null);
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [notifyItem, setNotifyItem] = useState<DemutranConcessionario | null>(null);
  const [notifyForm, setNotifyForm] = useState({ titulo: '', mensagem: '', tipo: 'geral' });
  const [sendingNotification, setSendingNotification] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<'todas' | CategoriaConcessionario>('todas');
  const [selectedStatus, setSelectedStatus] = useState<'todos' | 'ativos' | 'inativos' | 'em_debito'>('todos');
  const [selectedPeriodoArrecadacao, setSelectedPeriodoArrecadacao] =
    useState<keyof typeof arrecadacaoReference>('2025_periodo');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isCustomReportDialogOpen, setIsCustomReportDialogOpen] = useState(false);
  const [selectedReportOption, setSelectedReportOption] = useState('todos');
  const [selectedReportFormat, setSelectedReportFormat] = useState<'csv' | 'pdf'>('csv');
  const [selectedCustomReportFormat, setSelectedCustomReportFormat] = useState<'csv' | 'pdf'>('csv');

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

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategoria !== 'todas' && item.categoria !== selectedCategoria) {
        return false;
      }
      if (selectedStatus === 'ativos' && !item.ativo) {
        return false;
      }
      if (selectedStatus === 'inativos' && item.ativo) {
        return false;
      }
      if (selectedStatus === 'em_debito' && getConcessionarioFinancialStatus(item) !== 'em_debito') {
        return false;
      }
      return (
      [
        categoriaLabels[item.categoria],
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
  }, [items, searchTerm, selectedCategoria, selectedStatus]);

  const filteredReferenceCards = useMemo(() => {
    const selected = arrecadacaoReference[selectedPeriodoArrecadacao];
    const entries = Object.entries(selected) as Array<
      [CategoriaConcessionario, (typeof arrecadacaoReference)[keyof typeof arrecadacaoReference][CategoriaConcessionario]]
    >;

    return entries.filter(([categoria]) => selectedCategoria === 'todas' || categoria === selectedCategoria);
  }, [selectedCategoria, selectedPeriodoArrecadacao]);

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
      Nome: item.titular_nome || '-',
      Vaga: item.numero_vaga || '-',
      Placa: item.placa || '-',
      CPF: item.cpf || '-',
      Veiculo: item.veiculo || '-',
      Rota: item.rota || '-',
      Origem_planilha: item.origem_planilha || '-',
      Ponto_referencia: item.ponto_referencia || '-',
      Email: item.email_notificacao || '-',
      Telefone: item.telefone_notificacao || '-',
      Aceita_notificacoes: item.aceita_notificacoes ? 'Sim' : 'Nao',
      Status: item.ativo ? 'Ativo' : 'Inativo',
      Situacao_financeira: getConcessionarioFinancialCopy(item).label,
      Ultimo_alvara: formatReportDate(item.ultimo_alvara),
      Inicio_atividade: formatReportDate(item.inicio_atividade),
      Tem_acesso: accessMap[item.id] ? 'Sim' : 'Nao',
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

  const resetAndCloseForm = () => {
    setEditingItem(null);
    setFormData(initialForm);
    setIsDialogOpen(false);
  };

  const toPayload = () => ({
    categoria: formData.categoria,
    origem_planilha: formData.origem_planilha.trim() || null,
    ponto_referencia: formData.ponto_referencia.trim() || null,
    numero_vaga: formData.numero_vaga.trim() || null,
    titular_nome: formData.titular_nome.trim() || null,
    endereco: formData.endereco.trim() || null,
    veiculo: formData.veiculo.trim() || null,
    placa: normalizePlate(formData.placa) || null,
    fabricacao: formData.fabricacao.trim() || null,
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
    if (!editingItem && !formData.senha_acesso) {
      toast({ title: 'Senha obrigatoria', description: 'Defina a senha de acesso do novo concessionario.', variant: 'destructive' });
      return;
    }
    if (editingItem && !accessMap[editingItem.id] && !formData.senha_acesso) {
      toast({ title: 'Acesso pendente', description: 'Este concessionario ainda nao possui senha de acesso. Defina uma senha para ativar a area publica.', variant: 'destructive' });
      return;
    }
    if (formData.senha_acesso && formData.senha_acesso.length < 6) {
      toast({ title: 'Senha invalida', description: 'A senha de acesso precisa ter ao menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (formData.senha_acesso !== formData.confirmar_senha_acesso) {
      toast({ title: 'Senha nao confere', description: 'Confirme a senha individual do concessionario.', variant: 'destructive' });
      return;
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

    const concessionarioId = operation.data?.id || editingItem?.id;
    if (concessionarioId && formData.senha_acesso) {
      const { data, error } = await (supabase as any).rpc('definir_acesso_concessionario', {
        _concessionario_id: concessionarioId,
        _senha: formData.senha_acesso,
      });

      if (error || data?.error) {
        setSaving(false);
        toast({ title: 'Erro ao configurar acesso', description: error?.message || data?.error || 'Nao foi possivel definir a senha.', variant: 'destructive' });
        return;
      }
    }

    setSaving(false);
    toast({ title: editingItem ? 'Concessionario atualizado' : 'Concessionario cadastrado' });
    resetAndCloseForm();
    loadData();
  };

  const handleEdit = (item: DemutranConcessionario) => {
    setEditingItem(item);
    setFormData({
      categoria: item.categoria,
      origem_planilha: item.origem_planilha || '',
      ponto_referencia: item.ponto_referencia || '',
      numero_vaga: item.numero_vaga || '',
      titular_nome: item.titular_nome || '',
      endereco: item.endereco || '',
      veiculo: item.veiculo || '',
      placa: item.placa || '',
      fabricacao: item.fabricacao || '',
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
      senha_acesso: '',
      confirmar_senha_acesso: '',
      ativo: item.ativo,
    });
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

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!effectiveSetorId) {
      toast({ title: 'Setor nao identificado', description: 'Nao foi possivel identificar o setor do usuario.', variant: 'destructive' });
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

      if (error) {
        toast({ title: 'Erro ao importar planilha', description: error.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Importacao concluida', description: `${payload.length} concessionarios importados da planilha.` });
      loadData();
    } catch (error) {
      setImporting(false);
      toast({
        title: 'Erro ao processar arquivo',
        description: error instanceof Error ? error.message : 'Falha ao ler a planilha.',
        variant: 'destructive',
      });
    }
  };

  const columns = [
    {
      header: 'Categoria',
      accessor: (item: DemutranConcessionario) => categoriaLabels[item.categoria],
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
    return count;
  }, [selectedCategoria, selectedStatus]);

  function renderMobileConcessionarioCard(item: DemutranConcessionario) {
    const financial = getConcessionarioFinancialCopy(item);

    return (
      <div
        key={item.id}
        className="rounded-[26px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]"
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">CPF</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.cpf || '-'}</p>
          </div>
          <div className="col-span-2 rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Rota / Origem</p>
            <p className="mt-0.5 font-semibold text-slate-800">{item.rota || '-'} &middot; {item.origem_planilha || '-'}</p>
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
                {isSuperAdmin && (
                  <Select value={selectedSetorId} onValueChange={setSelectedSetorId}>
                    <SelectTrigger className="w-[220px] rounded-[18px] border-white/20 bg-white/10 text-white">
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {setores.map((setor) => (
                        <SelectItem key={setor.id} value={setor.id}>
                          {setor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <label className="inline-flex cursor-pointer">
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileImport} disabled={importing} />
                  <Button type="button" variant="secondary" className="gap-2 rounded-[18px] bg-white/20 text-white shadow-none hover:bg-white/30" disabled={importing} asChild>
                    <span>
                      {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Importar
                    </span>
                  </Button>
                </label>
                <Button type="button" variant="secondary" className="gap-2 rounded-[18px] bg-white/20 text-white shadow-none hover:bg-white/30" onClick={() => setIsReportDialogOpen(true)}>
                  <FileSpreadsheet className="h-4 w-4" />
                  Relatorio
                </Button>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2 rounded-[18px] bg-white text-slate-900 hover:bg-slate-100">
                  <Plus className="h-4 w-4" />
                  Novo
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
              {isSuperAdmin && (
                <Select value={selectedSetorId} onValueChange={setSelectedSetorId}>
                  <SelectTrigger className="h-12 flex-1 rounded-[18px] border-white/20 bg-white/10 text-white">
                    <SelectValue placeholder="Setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {setores.map((setor) => (
                      <SelectItem key={setor.id} value={setor.id}>
                        {setor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <label className="inline-flex cursor-pointer flex-1">
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileImport} disabled={importing} />
                <Button type="button" variant="secondary" className="h-12 flex-1 gap-2 rounded-[18px] bg-white/20 text-white shadow-none hover:bg-white/30" disabled={importing} asChild>
                  <span>
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Planilha
                  </span>
                </Button>
              </label>
              <Button type="button" variant="secondary" className="h-12 flex-1 gap-2 rounded-[18px] bg-white/20 text-white shadow-none hover:bg-white/30" onClick={() => setIsReportDialogOpen(true)}>
                <FileSpreadsheet className="h-4 w-4" />
                Relatorio
              </Button>
              <Button onClick={() => setIsDialogOpen(true)} className="h-12 flex-1 gap-2 rounded-[18px] bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                Novo
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

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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
                    onChange={(event) => setSelectedStatus(event.target.value as 'todos' | 'ativos' | 'inativos' | 'em_debito')}
                  >
                    <option value="todos">Todos os status</option>
                    <option value="ativos">Somente ativos</option>
                    <option value="inativos">Somente inativos</option>
                    <option value="em_debito">Somente em debito</option>
                  </select>
                </div>
                <div className="col-span-2 space-y-1.5 lg:col-span-1">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Busca</Label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="h-12 rounded-[18px] border-slate-200 bg-slate-50 pl-11 text-[15px] font-medium"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Nome, vaga, placa, CPF, rota..."
                    />
                  </div>
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
                  Nenhum concessionario cadastrado
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
                emptyMessage="Nenhum concessionario cadastrado"
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
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetAndCloseForm();
          }}
          title={editingItem ? 'Editar concessionario' : 'Novo concessionario'}
          description="Preencha os campos conforme a categoria e os dados da planilha."
          onCancel={resetAndCloseForm}
          onConfirm={handleSubmit}
          confirmLabel={saving ? 'Salvando...' : editingItem ? 'Salvar alteracoes' : 'Cadastrar'}
        >
          <div className="space-y-4 py-2">
            <Tabs defaultValue="dados" className="space-y-4">
              <TabsList className="h-auto gap-2 bg-transparent p-0">
                <TabsTrigger value="dados" className="rounded-xl border border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Condutor principal</TabsTrigger>
                <TabsTrigger value="habilitacao" className="rounded-xl border border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Condutor auxiliar</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Categoria *">
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  <Field label="Origem da planilha">
                    <Input value={formData.origem_planilha} onChange={(event) => setFormData((current) => ({ ...current, origem_planilha: event.target.value }))} />
                  </Field>
                  <Field label="Numero da vaga / bata">
                    <Input value={formData.numero_vaga} onChange={(event) => setFormData((current) => ({ ...current, numero_vaga: event.target.value }))} />
                  </Field>
                  <Field label="Ponto / distrito / referencia">
                    <Input value={formData.ponto_referencia} onChange={(event) => setFormData((current) => ({ ...current, ponto_referencia: event.target.value }))} />
                  </Field>
                </div>

                <Field label="Nome do concessionario *">
                  <Input value={formData.titular_nome} onChange={(event) => setFormData((current) => ({ ...current, titular_nome: event.target.value }))} />
                </Field>

                <Field label="Endereco">
                  <Input value={formData.endereco} onChange={(event) => setFormData((current) => ({ ...current, endereco: event.target.value }))} />
                </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Veiculo">
                    <Input value={formData.veiculo} onChange={(event) => setFormData((current) => ({ ...current, veiculo: event.target.value }))} />
                  </Field>
                  <Field label="Placa">
                    <Input value={formData.placa} onChange={(event) => setFormData((current) => ({ ...current, placa: normalizePlate(event.target.value) }))} />
                  </Field>
                  <Field label="Fabricacao">
                    <Input value={formData.fabricacao} onChange={(event) => setFormData((current) => ({ ...current, fabricacao: event.target.value }))} />
                  </Field>
                  <Field label="Ultimo alvara">
                    <Input type="date" value={formData.ultimo_alvara} onChange={(event) => setFormData((current) => ({ ...current, ultimo_alvara: event.target.value }))} />
                  </Field>
                  <Field label="Exercicio">
                    <Input value={formData.exercicio} onChange={(event) => setFormData((current) => ({ ...current, exercicio: event.target.value }))} />
                  </Field>
                  <Field label="CPF">
                    <Input value={formData.cpf} onChange={(event) => setFormData((current) => ({ ...current, cpf: normalizeCpf(event.target.value) }))} />
                  </Field>
                  <Field label="Email para notificacoes">
                    <Input value={formData.email_notificacao} onChange={(event) => setFormData((current) => ({ ...current, email_notificacao: event.target.value }))} />
                  </Field>
                  <Field label="Telefone para notificacoes">
                    <Input value={formData.telefone_notificacao} onChange={(event) => setFormData((current) => ({ ...current, telefone_notificacao: event.target.value }))} />
                  </Field>
                  <Field label="Inicio da atividade">
                    <Input type="date" value={formData.inicio_atividade} onChange={(event) => setFormData((current) => ({ ...current, inicio_atividade: event.target.value }))} />
                  </Field>
                  <Field label="Rota">
                    <Input value={formData.rota} onChange={(event) => setFormData((current) => ({ ...current, rota: event.target.value }))} />
                  </Field>
                </div>

                <Field label="Observacoes">
                  <Textarea rows={3} value={formData.observacoes} onChange={(event) => setFormData((current) => ({ ...current, observacoes: event.target.value }))} />
                </Field>
              </TabsContent>

              <TabsContent value="habilitacao" className="space-y-4">
                <div className={`rounded-2xl border px-4 py-3 text-sm ${editingItem && accessMap[editingItem.id] ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                  {editingItem
                    ? accessMap[editingItem.id]
                      ? 'Este concessionario ja possui acesso ativo. Preencha a senha abaixo apenas se quiser redefinir.'
                      : 'Este concessionario ainda nao possui acesso. Defina uma senha para liberar o login publico por CPF + senha.'
                    : 'Defina agora a senha individual para liberar o primeiro acesso publico do concessionario.'}
                </div>
              <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Numero da CNH">
                    <Input value={formData.cnh_numero} onChange={(event) => setFormData((current) => ({ ...current, cnh_numero: event.target.value }))} />
                  </Field>
                  <Field label="Validade da CNH">
                    <Input type="date" value={formData.validade_cnh} onChange={(event) => setFormData((current) => ({ ...current, validade_cnh: event.target.value }))} />
                  </Field>
                  <Field label="Atividade remunerada">
                    <Input value={formData.atividade_remunerada} onChange={(event) => setFormData((current) => ({ ...current, atividade_remunerada: event.target.value }))} />
                  </Field>
                  <Field label="Categoria CNH">
                    <Input value={formData.categoria_cnh} onChange={(event) => setFormData((current) => ({ ...current, categoria_cnh: event.target.value }))} />
                  </Field>
                  <Field label="Curso">
                    <Input value={formData.curso} onChange={(event) => setFormData((current) => ({ ...current, curso: event.target.value }))} />
                  </Field>
                  <Field label="Motorista auxiliar">
                    <Input value={formData.motorista_auxiliar} onChange={(event) => setFormData((current) => ({ ...current, motorista_auxiliar: event.target.value }))} />
                  </Field>
                  <Field label="CNH auxiliar / registro">
                    <Input value={formData.cnh_auxiliar} onChange={(event) => setFormData((current) => ({ ...current, cnh_auxiliar: event.target.value }))} />
                  </Field>
                  <Field label="Validade CNH auxiliar">
                    <Input type="date" value={formData.validade_cnh_auxiliar} onChange={(event) => setFormData((current) => ({ ...current, validade_cnh_auxiliar: event.target.value }))} />
                  </Field>
                </div>
              </TabsContent>
            </Tabs>

            <div className={`space-y-4 rounded-2xl border px-4 py-4 ${editingItem && accessMap[editingItem.id] ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/80'}`}>
              <div>
                <h3 className="text-sm font-bold text-foreground">Senha de acesso do concessionario</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  O DEMUTRAN define aqui a senha que o concessionario vai usar para entrar no portal publico com CPF + senha.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={editingItem ? 'Senha de acesso' : 'Senha de acesso *'}>
                  <Input
                    type="password"
                    value={formData.senha_acesso}
                    onChange={(event) => setFormData((current) => ({ ...current, senha_acesso: event.target.value }))}
                    placeholder={editingItem ? 'Digite para criar ou redefinir a senha' : 'Minimo 6 caracteres'}
                  />
                </Field>
                <Field label={editingItem ? 'Confirmar senha de acesso' : 'Confirmar senha *'}>
                  <Input
                    type="password"
                    value={formData.confirmar_senha_acesso}
                    onChange={(event) => setFormData((current) => ({ ...current, confirmar_senha_acesso: event.target.value }))}
                  />
                </Field>
              </div>
              <p className="text-xs text-muted-foreground">
                Essa senha pode ser temporaria ou definitiva. Sempre que o DEMUTRAN alterar essa senha, o novo acesso passa a valer para o concessionario.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
              <Switch checked={formData.ativo} onCheckedChange={(checked) => setFormData((current) => ({ ...current, ativo: checked }))} />
              <span className="text-sm text-muted-foreground">{formData.ativo ? 'Cadastro ativo' : 'Cadastro inativo'}</span>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
              <Switch checked={formData.aceita_notificacoes} onCheckedChange={(checked) => setFormData((current) => ({ ...current, aceita_notificacoes: checked }))} />
              <span className="text-sm text-muted-foreground">{formData.aceita_notificacoes ? 'Recebe notificacoes pelo portal' : 'Notificacoes desativadas para o concessionario'}</span>
            </div>
          </div>
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
            />
          )}
        </ResponsiveDialog>

        <ResponsiveDialog
          open={Boolean(notifyItem)}
          onOpenChange={(open) => {
            if (!open) {
              setNotifyItem(null);
            }
          }}
          title="Enviar notificacao"
          description={notifyItem ? `Notifique ${notifyItem.titular_nome || 'o concessionario'} na area publica.` : ''}
          onCancel={() => setNotifyItem(null)}
          onConfirm={handleSendNotification}
          confirmLabel={sendingNotification ? 'Enviando...' : 'Enviar notificacao'}
        >
          <div className="space-y-4 py-2">
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
  icon: typeof IdCard;
}) {
  return (
    <div className="rounded-[26px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
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

function ConcessionarioDetails({ item, onNotify }: { item: DemutranConcessionario; onNotify: () => void }) {
  const financial = getConcessionarioFinancialCopy(item);
  const entries = [
    ['Categoria', categoriaLabels[item.categoria]],
    ['Situacao financeira', financial.label],
    ['Origem da planilha', item.origem_planilha || '-'],
    ['Numero da vaga / bata', item.numero_vaga || '-'],
    ['Nome', item.titular_nome || '-'],
    ['Endereco', item.endereco || '-'],
    ['Veiculo', item.veiculo || '-'],
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
    ['Motorista auxiliar', item.motorista_auxiliar || '-'],
    ['CNH auxiliar / registro', item.cnh_auxiliar || '-'],
    ['Validade CNH auxiliar', item.validade_cnh_auxiliar || '-'],
    ['Categoria CNH', item.categoria_cnh || '-'],
    ['Rota', item.rota || '-'],
    ['Ponto / distrito', item.ponto_referencia || '-'],
    ['Email notificacao', item.email_notificacao || '-'],
    ['Telefone notificacao', item.telefone_notificacao || '-'],
    ['Recebe notificacoes', item.aceita_notificacoes ? 'Sim' : 'Nao'],
    ['Importado de planilha', item.importado_planilha ? 'Sim' : 'Nao'],
    ['Status', item.ativo ? 'Ativo' : 'Inativo'],
  ];

  return (
    <div className="space-y-5 py-2">
      <div className={cn(
        'rounded-2xl border px-4 py-3',
        financial.status === 'pago' && 'border-emerald-200 bg-emerald-50/70 text-emerald-800',
        financial.status === 'prazo_aberto' && 'border-blue-200 bg-blue-50/70 text-blue-800',
        financial.status === 'em_debito' && 'border-red-200 bg-red-50/80 text-red-800',
      )}>
        <p className="text-sm font-bold">{financial.label}</p>
        <p className="mt-1 text-sm">{financial.description}</p>
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
        <div className="mt-4">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onNotify}>
            <Bell className="h-4 w-4" />
            Enviar notificacao
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {entries.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Observacoes</p>
        <p className="mt-1 text-sm font-medium text-foreground">{item.observacoes || '-'}</p>
      </div>
    </div>
  );
}

export default DemutranConcessionarios;
