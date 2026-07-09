import { memo, useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import * as XLSX from 'xlsx';
import { Car, CheckCircle2, CircleDollarSign, Copy, Download, Eye, FileSpreadsheet, Loader2, Plus, Printer, Search, SlidersHorizontal, Upload, Warehouse, X } from 'lucide-react';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
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
import { buildReportFileName, exportReportCsv, formatReportCurrency, formatReportDateTime, openPdfPrintReport, printHtml } from '@/lib/reports';
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

const genderOptions = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'nao_informado', label: 'Nao informado' },
  { value: 'outro', label: 'Outro' },
] as const;

const legalRestrictionOptions = [
  { value: 'busca_apreensao', label: 'Busca e Apreensao', description: 'Ordem judicial para recolher o veiculo por falta de pagamento do financiamento.' },
  { value: 'restricao_circulacao_penhora', label: 'Restricao de Circulacao (Penhora)', description: 'Bloqueio judicial grave que impede o carro de andar em vias publicas.' },
  { value: 'restricao_transferencia', label: 'Restricao de Transferencia', description: 'Bloqueio judicial que impede a venda ou troca de nome do proprietario.' },
  { value: 'alienacao_fiduciaria', label: 'Alienacao Fiduciaria', description: 'O veiculo esta financiado e alienado ao banco ate a quitacao da divida.' },
  { value: 'alerta_roubo_furto', label: 'Alerta de Roubo ou Furto', description: 'Cadastro policial que indica que o veiculo e fruto de crime.' },
  { value: 'apropriacao_indebita', label: 'Apropriacao Indebita', description: 'Registro policial de quando o carro foi alugado ou emprestado e nao foi devolvido.' },
  { value: 'bloqueio_falta_transferencia', label: 'Bloqueio por Falta de Transferencia', description: 'O comprador nao passou o carro para o nome no prazo de 30 dias.' },
  { value: 'restricao_media_grande_monta', label: 'Restricao de Media ou Grande Monta', description: 'Bloqueio por acidente grave que exige vistoria ou impede o retorno as ruas.' },
  { value: 'queixa_duble_clonagem', label: 'Queixa de Duble / Clonagem', description: 'Marcacao administrativa para investigar placas clonadas e multas indevidas.' },
] as const;

const accidentOptions = [
  { value: 'nao', label: 'Nao' },
  { value: 'sem_vitima', label: 'Sim, sem vitima' },
  { value: 'com_vitima', label: 'Sim, com vitima' },
] as const;

type LogradouroSuggestion = {
  nome: string;
  bairro: string | null;
  cep: string | null;
  municipio: string | null;
  uf: string | null;
  origem: string;
};

const emptyApreensaoForm = {
  placa: '',
  chassi: '',
  descricao_veiculo: '',
  ano: '',
  cor: '',
  modelo: '',
  municipio: '',
  proprietario_nome: '',
  proprietario_cpf_cnpj: '',
  infrator_nome: '',
  genero_condutor: '',
  bairro_apreensao: '',
  logradouro: '',
  restricao_legal: '',
  envolvimento_acidente: '',
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

const getGenderLabel = (value: VeiculoRecolhido['genero_condutor']) =>
  genderOptions.find((option) => option.value === value)?.label || 'Nao informado';

const getRestrictionLabel = (value: VeiculoRecolhido['restricao_legal']) =>
  legalRestrictionOptions.find((option) => option.value === value)?.label || 'Nao informado';

const getAccidentLabel = (value: VeiculoRecolhido['envolvimento_acidente']) =>
  accidentOptions.find((option) => option.value === value)?.label || 'Nao informado';

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

const getPeriodoRange = (periodo: string, dataInicio?: string, dataFim?: string): { inicio: string | null; fim: string | null } => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (periodo) {
    case 'hoje':
      return {
        inicio: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        fim: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      };
    case 'semana': {
      const dia = now.getDay();
      const diff = dia === 0 ? 6 : dia - 1;
      const inicio = new Date(now);
      inicio.setDate(now.getDate() - diff);
      const fim = new Date(inicio);
      fim.setDate(inicio.getDate() + 6);
      return {
        inicio: inicio.toISOString().slice(0, 10),
        fim: fim.toISOString().slice(0, 10),
      };
    }
    case 'mes':
      return {
        inicio: `${y}-${String(m + 1).padStart(2, '0')}-01`,
        fim: new Date(y, m + 1, 0).toISOString().slice(0, 10),
      };
    case 'ano':
      return {
        inicio: `${y}-01-01`,
        fim: `${y}-12-31`,
      };
    case '3meses': {
      const d3 = new Date(now);
      d3.setMonth(m - 2);
      d3.setDate(1);
      return {
        inicio: d3.toISOString().slice(0, 10),
        fim: now.toISOString().slice(0, 10),
      };
    }
    case '6meses': {
      const d6 = new Date(now);
      d6.setMonth(m - 5);
      d6.setDate(1);
      return {
        inicio: d6.toISOString().slice(0, 10),
        fim: now.toISOString().slice(0, 10),
      };
    }
    case '12meses': {
      const d12 = new Date(now);
      d12.setMonth(m - 11);
      d12.setDate(1);
      return {
        inicio: d12.toISOString().slice(0, 10),
        fim: now.toISOString().slice(0, 10),
      };
    }
    case 'intervalo':
      return {
        inicio: dataInicio || null,
        fim: dataFim || null,
      };
    default:
      return { inicio: null, fim: null };
  }
};

const DemutranLiberacao = () => {
  const { setorId, profile } = useAuth();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [veiculos, setVeiculos] = useState<VeiculoRecolhido[]>([]);
  const [demutranSetorId, setDemutranSetorId] = useState<string>('');
  const [searchTermPatio, setSearchTermPatio] = useState('');
  const [searchTermLiberados, setSearchTermLiberados] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroOrigem, setFiltroOrigem] = useState<string>('todos');
  const [filtroAno, setFiltroAno] = useState<string>('todos');
  const [dataEntradaInicio, setDataEntradaInicio] = useState('');
  const [dataEntradaFim, setDataEntradaFim] = useState('');
  const [dataSaidaInicio, setDataSaidaInicio] = useState('');
  const [dataSaidaFim, setDataSaidaFim] = useState('');
  const [valorPeriodo, setValorPeriodo] = useState<string>('total');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [loading, setLoading] = useState(true);

  const [isApreensaoDialogOpen, setIsApreensaoDialogOpen] = useState(false);
  const [isDetalhesDialogOpen, setIsDetalhesDialogOpen] = useState(false);
  const [isLiberacaoDialogOpen, setIsLiberacaoDialogOpen] = useState(false);
  const [isTaxaDialogOpen, setIsTaxaDialogOpen] = useState(false);
  const [isCpfDialogOpen, setIsCpfDialogOpen] = useState(false);
  const [cpfEditItem, setCpfEditItem] = useState<VeiculoRecolhido | null>(null);
  const [cpfEditValue, setCpfEditValue] = useState('');
  const [cpfEditName, setCpfEditName] = useState('');
  const [cpfEditLogradouro, setCpfEditLogradouro] = useState('');
  const [cpfEditBairro, setCpfEditBairro] = useState('');
  const [cpfEditJustificativa, setCpfEditJustificativa] = useState('');
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportTipo, setReportTipo] = useState<string>('todos');
  const [reportEstado, setReportEstado] = useState<string>('todos');
  const [reportPeriodo, setReportPeriodo] = useState<string>('todos');
  const [reportDataInicio, setReportDataInicio] = useState('');
  const [reportDataFim, setReportDataFim] = useState('');
  const [reportFormato, setReportFormato] = useState<'csv' | 'pdf'>('csv');

  const [detalhesItem, setDetalhesItem] = useState<VeiculoRecolhido | null>(null);
  const [liberacaoItem, setLiberacaoItem] = useState<VeiculoRecolhido | null>(null);
  const [taxaItem, setTaxaItem] = useState<VeiculoRecolhido | null>(null);
  const [taxaMode, setTaxaMode] = useState<'single' | 'all'>('single');
  const [apreensaoForm, setApreensaoForm] = useState(emptyApreensaoForm);
  const [liberacaoForm, setLiberacaoForm] = useState(emptyLiberacaoForm);
  const [taxaForm, setTaxaForm] = useState(emptyTaxaForm);
  const [protocoloCopiado, setProtocoloCopiado] = useState(false);
  const [isConfirmacaoLiberacaoOpen, setIsConfirmacaoLiberacaoOpen] = useState(false);
  const [confirmacaoStep, setConfirmacaoStep] = useState<1 | 2>(1);
  const [editandoObservacao, setEditandoObservacao] = useState(false);
  const [observacaoText, setObservacaoText] = useState('');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number; skipped: number } | null>(null);
  const [taxaDiariaInput, setTaxaDiariaInput] = useState('');
  const [logradouroSuggestions, setLogradouroSuggestions] = useState<LogradouroSuggestion[]>([]);
  const [loadingLogradouros, setLoadingLogradouros] = useState(false);

  const copiarTexto = useCallback(async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const el = document.createElement('textarea');
      el.value = texto;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setProtocoloCopiado(true);
    setTimeout(() => setProtocoloCopiado(false), 2000);
  }, []);

  const handlePrintVehicle = (item: typeof detalhesItem) => {
    if (!item) return;
    const html = `
      <div style="margin-bottom:16px;">
        <p style="font-size:20px;font-weight:800;margin:0;">${item.placa}</p>
        <p style="color:#475569;margin:4px 0 0;">${item.descricao_veiculo || ''}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:12px;">
        <tr><th style="border:1px solid #cbd5e1;padding:6px;background:#e2e8f0;text-align:left;">Campo</th><th style="border:1px solid #cbd5e1;padding:6px;background:#e2e8f0;text-align:left;">Valor</th></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Protocolo</td><td style="border:1px solid #cbd5e1;padding:6px;">${item.protocolo || 'Nao informado'}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Status</td><td style="border:1px solid #cbd5e1;padding:6px;">${item.status}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Tipo</td><td style="border:1px solid #cbd5e1;padding:6px;">${getVehicleKind(item)}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Patio</td><td style="border:1px solid #cbd5e1;padding:6px;">${getCustodyLabel(item.local_custodia)}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Entrada</td><td style="border:1px solid #cbd5e1;padding:6px;">${formatDateTime(item.data_recolhimento)}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Situacao</td><td style="border:1px solid #cbd5e1;padding:6px;">${item.situacao || 'Nao informada'}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Ano</td><td style="border:1px solid #cbd5e1;padding:6px;">${item.ano || 'Nao informado'}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Cor</td><td style="border:1px solid #cbd5e1;padding:6px;">${item.cor || 'Nao informado'}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Modelo</td><td style="border:1px solid #cbd5e1;padding:6px;">${item.modelo || 'Nao informado'}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Municipio</td><td style="border:1px solid #cbd5e1;padding:6px;">${item.municipio || 'Nao informado'}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Genero do condutor</td><td style="border:1px solid #cbd5e1;padding:6px;">${getGenderLabel(item.genero_condutor)}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Taxa diaria</td><td style="border:1px solid #cbd5e1;padding:6px;">${formatCurrency(getTaxaDiariaValue(item))}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Dias de estadia</td><td style="border:1px solid #cbd5e1;padding:6px;">${getDiasEstadia(item)} dia(s)</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;font-weight:700;">Total acumulado</td><td style="border:1px solid #cbd5e1;padding:6px;font-weight:700;">${formatCurrency(getValorEstadia(item))}</td></tr>
      </table>
      <h3 style="font-size:14px;margin:16px 0 8px;">Dados do proprietario</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:12px;">
        <tr><th style="border:1px solid #cbd5e1;padding:6px;background:#e2e8f0;text-align:left;">Campo</th><th style="border:1px solid #cbd5e1;padding:6px;background:#e2e8f0;text-align:left;">Valor</th></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Nome</td><td style="border:1px solid #cbd5e1;padding:6px;">${item.proprietario_nome || 'Nao informado'}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">CPF/CNPJ</td><td style="border:1px solid #cbd5e1;padding:6px;">${item.proprietario_cpf_cnpj || 'Nao informado'}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Infrator</td><td style="border:1px solid #cbd5e1;padding:6px;">${item.infrator_nome || 'Nao informado'}</td></tr>
      </table>
      <h3 style="font-size:14px;margin:16px 0 8px;">Dados do veiculo</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:12px;">
        <tr><th style="border:1px solid #cbd5e1;padding:6px;background:#e2e8f0;text-align:left;">Campo</th><th style="border:1px solid #cbd5e1;padding:6px;background:#e2e8f0;text-align:left;">Valor</th></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Chassi</td><td style="border:1px solid #cbd5e1;padding:6px;">${item.chassi || 'Nao informado'}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Motivo</td><td style="border:1px solid #cbd5e1;padding:6px;">${item.motivo || 'Nao informado'}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Restricao legal</td><td style="border:1px solid #cbd5e1;padding:6px;">${getRestrictionLabel(item.restricao_legal)}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Envolvimento em acidente</td><td style="border:1px solid #cbd5e1;padding:6px;">${getAccidentLabel(item.envolvimento_acidente)}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Bairro / distrito da apreensao</td><td style="border:1px solid #cbd5e1;padding:6px;">${item.bairro_apreensao || 'Nao informado'}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Logradouro</td><td style="border:1px solid #cbd5e1;padding:6px;">${item.logradouro || 'Nao informado'}</td></tr>
        <tr><td style="border:1px solid #cbd5e1;padding:6px;">Descricao</td><td style="border:1px solid #cbd5e1;padding:6px;">${item.descricao_veiculo || 'Nao informada'}</td></tr>
      </table>`;
    printHtml('Veiculo recolhido - ' + item.placa, html);
  };

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

  const loadVeiculos = async () => {
    if (!effectiveSetorId) {
      setVeiculos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const PAGE_SIZE = 900;
    let allData: VeiculoRecolhido[] = [];
    let fetchError: any = null;

    for (let page = 0; ; page++) {
      const { data, error } = await supabase
        .from('veiculos_recolhidos')
        .select('*')
        .eq('setor_id', effectiveSetorId)
        .order('data_recolhimento', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) {
        fetchError = error;
        break;
      }
      if (!data || data.length === 0) break;
      allData = allData.concat(data as VeiculoRecolhido[]);
      if (data.length < PAGE_SIZE) break;
    }

    if (fetchError) {
      toast({ title: 'Erro ao carregar veiculos', description: fetchError.message, variant: 'destructive' });
    } else {
      setVeiculos(allData);
    }

    setLoading(false);
  };

  const loadLogradouroSuggestions = async () => {
    if (!effectiveSetorId) return;

    setLoadingLogradouros(true);
    const { data, error } = await supabase.rpc('listar_logradouros_demutran', {
      _setor_id: effectiveSetorId,
      _search: null,
      _limit: 200,
    });

    if (error) {
      toast({ title: 'Erro ao carregar logradouros', description: error.message, variant: 'destructive' });
      setLoadingLogradouros(false);
      return;
    }

    setLogradouroSuggestions((data || []) as LogradouroSuggestion[]);
    setLoadingLogradouros(false);
  };

  useEffect(() => {
    loadSetores();
  }, []);

  useEffect(() => {
    if (effectiveSetorId) {
      loadVeiculos();
    }
  }, [effectiveSetorId]);

  useEffect(() => {
    if (!isApreensaoDialogOpen || !effectiveSetorId) return;
    loadLogradouroSuggestions();
  }, [effectiveSetorId, isApreensaoDialogOpen]);

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

  const valorPeriodoLabel: Record<string, string> = {
    total: 'Total em taxas',
    hoje: 'Taxas de hoje',
    semana: 'Taxas da semana',
    mes: 'Taxas do mes',
    '3meses': 'Taxas dos ultimos 3 meses',
    '6meses': 'Taxas dos ultimos 6 meses',
    '12meses': 'Taxas dos ultimos 12 meses',
  };

  const valorFiltrado = useMemo(() => {
    if (valorPeriodo === 'total') return valorAcumulado;
    const range = getPeriodoRange(valorPeriodo);
    if (!range.inicio) return valorAcumulado;
    return veiculos
      .filter((item) => matchData(item.data_recolhimento, range.inicio, range.fim))
      .reduce((acc, item) => acc + getValorEstadia(item), 0);
  }, [veiculos, valorPeriodo, valorAcumulado]);

  const filteredLogradouroSuggestions = useMemo(() => {
    const termo = apreensaoForm.logradouro.trim().toLowerCase();
    if (!termo) {
      return [];
    }

    return logradouroSuggestions
      .filter((item) => {
        const nome = item.nome.toLowerCase();
        const bairro = (item.bairro || '').toLowerCase();
        return nome.includes(termo) || bairro.includes(termo);
      })
      .slice(0, 40);
  }, [apreensaoForm.logradouro, logradouroSuggestions]);

  const vehicleRows = (items: VeiculoRecolhido[]) =>
    items.map((item) => ({
      Placa: item.placa,
      Chassi: item.chassi || '-',
      Descricao: item.descricao_veiculo,
      Tipo: getVehicleKind(item),
      Local_custodia: getCustodyLabel(item.local_custodia),
      Proprietario: item.proprietario_nome || '-',
      CPF_CNPJ: item.proprietario_cpf_cnpj || '-',
      Genero_condutor: getGenderLabel(item.genero_condutor),
      Logradouro: item.logradouro || '-',
      Bairro_apreensao: item.bairro_apreensao || '-',
      Restricao_legal: getRestrictionLabel(item.restricao_legal),
      Envolvimento_acidente: getAccidentLabel(item.envolvimento_acidente),
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

  const handleGenerateReport = () => {
    let baseItems: VeiculoRecolhido[];
    if (reportEstado === 'patio') {
      baseItems = apreendidos;
    } else if (reportEstado === 'liberados') {
      baseItems = liberados;
    } else {
      baseItems = veiculos;
    }

    if (reportTipo === 'carro') {
      baseItems = baseItems.filter((i) => getVehicleKind(i) === 'Carro');
    } else if (reportTipo === 'moto') {
      baseItems = baseItems.filter((i) => getVehicleKind(i) === 'Moto');
    }

    const periodoRange = getPeriodoRange(reportPeriodo, reportDataInicio, reportDataFim);
    if (periodoRange.inicio) {
      baseItems = baseItems.filter((item) => matchData(item.data_recolhimento, periodoRange.inicio, periodoRange.fim));
    }

    const rows = vehicleRows(baseItems);
    if (!rows.length) {
      toast({ title: 'Sem dados', description: 'Nenhum registro encontrado para os filtros selecionados.', variant: 'destructive' });
      return;
    }

    const titleParts = [
      reportEstado !== 'todos' ? (reportEstado === 'patio' ? 'No patio' : 'Liberados') : 'Todos',
      reportTipo !== 'todos' ? reportTipo : '',
      periodoRange.inicio ? `${periodoRange.inicio} a ${periodoRange.fim}` : '',
    ].filter(Boolean).join(' - ');

    const fileName = buildReportFileName('veiculos', titleParts);
    if (reportFormato === 'csv') {
      exportReportCsv(fileName, rows);
    } else {
      openPdfPrintReport(`Relatorio - ${titleParts}`, [{ name: titleParts, rows }]);
    }
    setIsReportDialogOpen(false);
  };

  const handleGenerateGeral = () => {
    const rows = vehicleRows(veiculos);
    if (!rows.length) {
      toast({ title: 'Sem dados', description: 'Nenhum veiculo cadastrado.', variant: 'destructive' });
      return;
    }
    const fileName = buildReportFileName('veiculos', 'geral');
    exportReportCsv(fileName, rows);
  };

  const closeApreensaoDialog = () => {
    setApreensaoForm(emptyApreensaoForm);
    setLogradouroSuggestions([]);
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
    setTaxaDiariaInput('');
    setIsTaxaDialogOpen(false);
  };

  const handleSubmitApreensao = async () => {
    if (!effectiveSetorId || !apreensaoForm.placa || !apreensaoForm.data_recolhimento || !apreensaoForm.logradouro || !apreensaoForm.motivo || !apreensaoForm.situacao) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Preencha entrada, placa, logradouro, motivo e situacao.',
        variant: 'destructive',
      });
      return;
    }

    const placaNormalizada = normalizePlate(apreensaoForm.placa);

    const { data: veiculoExistente } = await supabase
      .from('veiculos_recolhidos')
      .select('id, placa, status')
      .eq('placa', placaNormalizada)
      .eq('status', 'recolhido')
      .maybeSingle();

    if (veiculoExistente) {
      toast({
        title: 'Veiculo ja esta no patio',
        description: `A placa ${placaNormalizada} ja possui uma apreensao ativa. Libere o veiculo antes de registrar uma nova entrada.`,
        variant: 'destructive',
      });
      return;
    }

    const { data: insertData, error } = await supabase.rpc('recolher_veiculo', {
      _placa: apreensaoForm.placa,
      _proprietario_nome: apreensaoForm.proprietario_nome.trim() || 'Nao informado',
      _proprietario_cpf_cnpj: apreensaoForm.proprietario_cpf_cnpj.trim() || null,
      _chassi: apreensaoForm.chassi.trim() || null,
      _descricao_veiculo: apreensaoForm.descricao_veiculo.trim() || null,
      _ano: apreensaoForm.ano.trim() || null,
      _cor: apreensaoForm.cor.trim() || null,
      _modelo: apreensaoForm.modelo.trim() || null,
      _municipio: apreensaoForm.municipio.trim() || null,
      _infrator_nome: apreensaoForm.infrator_nome.trim() || null,
      _genero_condutor: apreensaoForm.genero_condutor || null,
      _bairro_apreensao: apreensaoForm.bairro_apreensao.trim() || null,
      _logradouro: apreensaoForm.logradouro.trim() || null,
      _restricao_legal: apreensaoForm.restricao_legal || null,
      _envolvimento_acidente: apreensaoForm.envolvimento_acidente || null,
      _data_recolhimento: new Date(apreensaoForm.data_recolhimento).toISOString(),
      _motivo: apreensaoForm.motivo.trim(),
      _situacao: apreensaoForm.situacao.trim(),
      _local_custodia: apreensaoForm.local_custodia,
      _numero_liberacao: apreensaoForm.local_custodia === 'motos_delegacia'
        ? apreensaoForm.numero_liberacao.trim() || null
        : null,
      _observacao: apreensaoForm.observacao.trim() || null,
    });
    if (error) {
      toast({ title: 'Erro ao salvar apreensao', description: error.message, variant: 'destructive' });
      return;
    }

    const protocolo = (insertData as { protocolo?: string })?.protocolo;
    toast({
      title: 'Veiculo cadastrado com sucesso!',
      description: protocolo
        ? `Protocolo ${protocolo} gerado — informe ao proprietario para consulta online.`
        : 'O veiculo entrou na relacao de patio.',
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

    setConfirmacaoStep(1);
    setIsConfirmacaoLiberacaoOpen(true);
  };

  const handleConfirmarLiberacao = async () => {
    if (!liberacaoItem) return;

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
    setIsConfirmacaoLiberacaoOpen(false);
    setConfirmacaoStep(1);
    closeLiberacaoDialog();
    loadVeiculos();
  };

  const handleSubmitTaxa = async () => {
    const taxa = Number(taxaDiariaInput.replace(',', '.'));

    if (Number.isNaN(taxa) || taxa < 0) {
      toast({ title: 'Valor invalido', description: 'Informe um valor diario valido.', variant: 'destructive' });
      return;
    }

    if (taxaMode === 'all') {
      if (!effectiveSetorId) {
        toast({ title: 'Setor nao selecionado', description: 'Selecione o setor do DEMUTRAN.', variant: 'destructive' });
        return;
      }

      const confirmed = await confirm({
        title: 'Aplicar taxa em massa',
        description: `Deseja aplicar a taxa de R$ ${taxa.toFixed(2)}/dia para todos os veiculos do patio? Esta acao nao pode ser desfeita.`,
      });
      if (!confirmed) return;

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

  const openDetalhes = useCallback((item: VeiculoRecolhido) => {
    setDetalhesItem(item);
    setIsDetalhesDialogOpen(true);
  }, []);

  const openCpfDialog = useCallback((item: VeiculoRecolhido) => {
    setCpfEditItem(item);
    setCpfEditValue(item.proprietario_cpf_cnpj || '');
    setCpfEditName(item.proprietario_nome === 'Nao informado' ? '' : (item.proprietario_nome || ''));
    setCpfEditLogradouro(item.logradouro || '');
    setCpfEditBairro(item.bairro_apreensao || '');
    setCpfEditJustificativa('');
    setIsCpfDialogOpen(true);
  }, []);

  const closeCpfDialog = () => {
    setCpfEditItem(null);
    setCpfEditValue('');
    setCpfEditName('');
    setCpfEditLogradouro('');
    setCpfEditBairro('');
    setCpfEditJustificativa('');
    setIsCpfDialogOpen(false);
  };

  const handleSubmitCpf = async () => {
    if (!cpfEditItem) return;

    const cpfNumeros = cpfEditValue.replace(/\D/g, '');
    if (cpfEditValue && cpfNumeros.length !== 11 && cpfNumeros.length !== 14) {
      toast({ title: 'CPF/CNPJ invalido', description: 'Informe um CPF (11 digitos) ou CNPJ (14 digitos) valido.', variant: 'destructive' });
      return;
    }

    let novaObservacao = cpfEditItem.observacao;
    if (cpfEditJustificativa.trim()) {
      const timestamp = new Date().toLocaleString('pt-BR');
      const logText = `[Dados Proprietario] ${timestamp} - ${cpfEditJustificativa.trim()}`;
      novaObservacao = novaObservacao ? `${novaObservacao}\n${logText}` : logText;
    }

    const { error } = await supabase
      .from('veiculos_recolhidos')
      .update({
        proprietario_nome: cpfEditName.trim() || 'Nao informado',
        proprietario_cpf_cnpj: cpfNumeros ? cpfEditValue : null,
        logradouro: cpfEditLogradouro.trim() || null,
        bairro_apreensao: cpfEditBairro.trim() || null,
        observacao: novaObservacao,
        updated_at: new Date().toISOString()
      })
      .eq('id', cpfEditItem.id)
      .eq('setor_id', effectiveSetorId);

    if (error) {
      toast({ title: 'Erro ao atualizar dados', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Dados atualizados', description: 'Os dados do proprietario foram salvos com sucesso.' });
    closeCpfDialog();
    loadVeiculos();
  };

  const openTaxaDialog = useCallback((item?: VeiculoRecolhido) => {
    setTaxaItem(item || null);
    setTaxaMode(item ? 'single' : 'all');
    setTaxaDiariaInput(item ? String(getTaxaDiariaValue(item)).replace('.', ',') : '');
    setIsTaxaDialogOpen(true);
  }, []);

  const openLiberacaoDialog = useCallback((item: VeiculoRecolhido) => {
    setLiberacaoItem(item);
    setLiberacaoForm({
      data_liberacao: new Date().toISOString().slice(0, 16),
      situacao: 'Liberado',
      numero_liberacao: item.numero_liberacao || '',
      observacao: '',
    });
    setIsLiberacaoDialogOpen(true);
  }, []);

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

    setIsImporting(true);

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
            const generoCondutor = String(normalized.genero_do_condutor || normalized.genero_condutor || '').trim().toLowerCase();
            const restricaoLegal = String(normalized.restricao_legal || normalized.restricoes_legais || '').trim().toLowerCase();
            const envolvimentoAcidente = String(normalized.envolvimento_acidente || normalized.envolvido_em_acidente || '').trim().toLowerCase();
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
              genero_condutor:
                generoCondutor === 'masculino' || generoCondutor === 'feminino' || generoCondutor === 'nao_informado' || generoCondutor === 'outro'
                  ? generoCondutor
                  : null,
              bairro_apreensao: String(normalized.bairro_apreensao || '').trim() || null,
              logradouro: String(normalized.logradouro || '').trim() || null,
              data_recolhimento: dataRecolhimento,
              data_liberacao: liberacaoMetadata.dataIso,
              motivo: motivo || 'Nao informado',
              status: liberadoNaPlanilha ? 'liberado' : 'recolhido',
              situacao: situacao || 'Nao informado',
              local_custodia: localCustodia,
              numero_liberacao: localCustodia === 'motos_delegacia' ? liberacaoMetadata.texto : null,
              restricao_legal: legalRestrictionOptions.find((option) => option.value === restricaoLegal)?.value || null,
              envolvimento_acidente: accidentOptions.find((option) => option.value === envolvimentoAcidente)?.value || null,
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
        setIsImportDialogOpen(false);
        return;
      }

      const confirmed = await confirm({
        title: 'Cadastro em massa',
        description: `Deseja importar ${payload.length} veiculo(s) para o patio? Esta acao nao pode ser desfeita.`,
      });
      if (!confirmed) {
        setIsImportDialogOpen(false);
        return;
      }

      const CHUNK_SIZE = 200;
      let totalInseridos = 0;
      for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        const chunk = payload.slice(i, i + CHUNK_SIZE);
        const { data: inserted, error: chunkError } = await supabase
          .from('veiculos_recolhidos')
          .insert(chunk)
          .select('id');
        if (chunkError) throw chunkError;
        totalInseridos += inserted?.length ?? chunk.length;
      }

      setIsImportDialogOpen(false);
      setImportResult({ count: totalInseridos, skipped: skippedRows.length });
      loadVeiculos();
    } catch (error: any) {
      setIsImportDialogOpen(false);
      toast({
        title: 'Erro ao importar planilha',
        description: error.message || 'Nao foi possivel processar a planilha.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadModelo = () => {
    const wb = XLSX.utils.book_new();
    const headers = [
      'Placa', 'Chassi', 'Descricao do Veiculo', 'Ano', 'Cor', 'Modelo',
      'Municipio', 'Proprietario Nome', 'Proprietario CPF CNPJ', 'Infrator Nome', 'Genero do Condutor',
      'Bairro Apreensao', 'Logradouro', 'Restricao Legal', 'Envolvimento Acidente', 'Data de Entrada', 'Motivo',
      'Situacao', 'Liberacao', 'Observacao',
    ];
    const emptyRow = headers.map(() => '');
    const sheets = [
      { name: 'Automoveis', label: 'Automoveis' },
      { name: 'Motos', label: 'Motos' },
      { name: 'Motos Delegacia', label: 'Motos Delegacia' },
      { name: 'Veiculos Processo Forum', label: 'Veiculos Processo Forum' },
    ];
    for (const sheet of sheets) {
      const ws = XLSX.utils.aoa_to_sheet([headers, emptyRow]);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    }
    XLSX.writeFile(wb, 'modelo-veiculos-recolhidos.xlsx');
  };

  const apreensoesColumns = useMemo(() => [
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
            Proprietario
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
  ], [openCpfDialog, openDetalhes, openLiberacaoDialog, openTaxaDialog]);

  const consolidadoColumns = useMemo(() => [
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
  ], [openDetalhes]);

  const liberacoesColumns = useMemo(() => [
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
  ], [openDetalhes, openTaxaDialog]);

  const renderMobileVehicleCard = useCallback((
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
          <div className="mt-1 flex items-center gap-2">
            <p className="text-[14px] font-mono font-semibold tracking-[-0.02em] text-primary">{item.protocolo}</p>
            <button
              type="button"
              onClick={() => copiarTexto(item.protocolo)}
              className="inline-flex items-center justify-center rounded-md border border-border bg-white p-1 text-primary shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              title="Copiar protocolo"
            >
              {protocoloCopiado ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        <div className="rounded-[22px] bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Proprietario</p>
            <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => openCpfDialog(item)}>
              {item.proprietario_cpf_cnpj || item.proprietario_nome !== 'Nao informado' ? 'Editar dados' : 'Adicionar dados'}
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
  ), [copiarTexto, openCpfDialog, openDetalhes, openLiberacaoDialog, openTaxaDialog, protocoloCopiado]);

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
              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60 leading-none">Valor</span>
                      <Select value={valorPeriodo} onValueChange={setValorPeriodo}>
                        <SelectTrigger className="h-auto border-0 bg-transparent p-0 text-[11px] font-bold uppercase tracking-[0.14em] text-white/60 shadow-none focus:ring-0 focus:ring-offset-0 [&>svg]:text-white/60 [&>svg]:h-3 [&>svg]:w-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="total">Total</SelectItem>
                          <SelectItem value="hoje">Hoje</SelectItem>
                          <SelectItem value="semana">Essa semana</SelectItem>
                          <SelectItem value="mes">Este mes</SelectItem>
                          <SelectItem value="3meses">Ultimos 3 meses</SelectItem>
                          <SelectItem value="6meses">Ultimos 6 meses</SelectItem>
                          <SelectItem value="12meses">Ultimos 12 meses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="mt-1 text-[20px] font-black tracking-[-0.04em] text-white sm:text-[28px]">{formatCurrency(valorFiltrado)}</p>
                    <p className="mt-0.5 text-[13px] leading-5 text-white/70">{valorPeriodoLabel[valorPeriodo] || 'Total em taxas'}</p>
                  </div>
                  <div className="shrink-0 rounded-[18px] bg-white/15 p-3 text-white backdrop-blur-sm">
                    <CircleDollarSign className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

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
            <Button type="button" variant="outline" className="gap-2" onClick={() => setIsReportDialogOpen(true)}>
              <FileSpreadsheet className="h-4 w-4" />
              Relatorio personalizado
            </Button>
            <Button type="button" variant="default" className="gap-2" onClick={handleGenerateGeral}>
              <FileSpreadsheet className="h-4 w-4" />
              Relatorio geral
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
                  className="h-12 rounded-[18px] border-slate-200 bg-white pl-11 text-[15px] font-medium"
                  value={searchTermPatio}
                  onChange={(event) => setSearchTermPatio(event.target.value)}
                  placeholder="Buscar por placa, descrição, pátio ou situação"
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="outline" className="h-12 gap-2 rounded-[18px] text-[14px] font-semibold px-3" onClick={() => openTaxaDialog()} disabled={!effectiveSetorId}>
                  <CircleDollarSign className="h-4 w-4" />
                  Aplicar taxa em massa
                </Button>
                <Button type="button" variant="outline" className="h-12 gap-2 rounded-[18px] text-[14px] font-semibold px-3" onClick={() => setIsImportDialogOpen(true)}>
                  <FileSpreadsheet className="h-4 w-4" />
                  Cadastro em Massa
                </Button>
                <Button onClick={() => setIsApreensaoDialogOpen(true)} className="h-12 gap-2 rounded-[18px] text-[14px] font-semibold px-6" disabled={!effectiveSetorId}>
                  <Plus className="w-4 h-4" />
                  Nova Apreensao
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando veículos no pátio...</div>
            ) : (
              <>
                {activeFiltersCount > 0 && filteredApreendidos.length > 0 && (
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
                <VehicleCollectionSection
                  data={filteredApreendidos}
                  columns={apreensoesColumns}
                  emptyMessage="Nenhum veículo apreendido no pátio"
                  mode="patio"
                  renderMobileVehicleCard={renderMobileVehicleCard}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="liberacoes" className="space-y-5">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-12 rounded-[18px] border-slate-200 bg-white pl-11 text-[15px] font-medium"
                value={searchTermLiberados}
                onChange={(event) => setSearchTermLiberados(event.target.value)}
                placeholder="Buscar por placa, descrição, pátio, situação ou liberação"
              />
            </div>

            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando liberações...</div>
            ) : (
              <>
                {activeFiltersCount > 0 && filteredLiberados.length > 0 && (
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
                <VehicleCollectionSection
                  data={filteredLiberados}
                  columns={liberacoesColumns}
                  emptyMessage="Nenhum veículo liberado"
                  mode="liberacao"
                  renderMobileVehicleCard={renderMobileVehicleCard}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="consolidado" className="space-y-5">
            {activeFiltersCount > 0 && filteredConsolidado.length > 0 && (
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
            <VehicleCollectionSection
              data={filteredConsolidado}
              columns={consolidadoColumns}
              emptyMessage="Nenhum veículo encontrado para os filtros selecionados"
              mode="consolidado"
              renderMobileVehicleCard={renderMobileVehicleCard}
            />
          </TabsContent>
        </Tabs>

        <ResponsiveDialog
          open={isReportDialogOpen}
          onOpenChange={setIsReportDialogOpen}
          title="Relatorio personalizado"
          description="Escolha o tipo, estado, periodo e formato do relatorio."
          onCancel={() => setIsReportDialogOpen(false)}
          onConfirm={handleGenerateReport}
          confirmLabel={reportFormato === 'csv' ? 'Baixar CSV' : 'Gerar PDF'}
        >
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={reportTipo} onValueChange={setReportTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="carro">Carro</SelectItem>
                    <SelectItem value="moto">Moto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={reportEstado} onValueChange={setReportEstado}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="patio">No patio</SelectItem>
                    <SelectItem value="liberados">Liberados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Periodo</Label>
              <Select value={reportPeriodo} onValueChange={setReportPeriodo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tempos</SelectItem>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana">Esta semana</SelectItem>
                  <SelectItem value="mes">Este mes</SelectItem>
                  <SelectItem value="ano">Este ano</SelectItem>
                  <SelectItem value="intervalo">Intervalo personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reportPeriodo === 'intervalo' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data inicio</Label>
                  <Input type="date" value={reportDataInicio} onChange={(e) => setReportDataInicio(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Data fim</Label>
                  <Input type="date" value={reportDataFim} onChange={(e) => setReportDataFim(e.target.value)} />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={reportFormato} onValueChange={(value) => setReportFormato(value as 'csv' | 'pdf')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
          <div className="space-y-4 py-2">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sobre a apreensão</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="data_recolhimento">Entrada/Recolhimento *</Label>
                  <Input id="data_recolhimento" type="datetime-local" placeholder="Selecione a data e hora do recolhimento" value={apreensaoForm.data_recolhimento} onChange={(e) => setApreensaoForm({ ...apreensaoForm, data_recolhimento: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Onde ele vai ficar *</Label>
                  <Select value={apreensaoForm.local_custodia} onValueChange={(value) => setApreensaoForm({ ...apreensaoForm, local_custodia: value as VeiculoRecolhido['local_custodia'] })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o patio de destino" />
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
                <div className="space-y-2">
                  <Label>Restricoes legais</Label>
                  <Select value={apreensaoForm.restricao_legal || undefined} onValueChange={(value) => setApreensaoForm({ ...apreensaoForm, restricao_legal: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione se houver" />
                    </SelectTrigger>
                    <SelectContent>
                      {legalRestrictionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {apreensaoForm.restricao_legal && (
                    <p className="text-xs text-muted-foreground">
                      {legalRestrictionOptions.find((option) => option.value === apreensaoForm.restricao_legal)?.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 mt-3">
                <Label htmlFor="motivo">Motivo *</Label>
                <Textarea id="motivo" rows={3} placeholder="Descreva o motivo da apreensão" value={apreensaoForm.motivo} onChange={(e) => setApreensaoForm({ ...apreensaoForm, motivo: e.target.value })} />
              </div>

              <div className="space-y-2 mt-3">
                <Label htmlFor="situacao">Situacao *</Label>
                <Textarea id="situacao" rows={3} placeholder="Descreva a situacao do veiculo" value={apreensaoForm.situacao} onChange={(e) => setApreensaoForm({ ...apreensaoForm, situacao: e.target.value })} />
              </div>

              <div className="space-y-2 mt-3">
                <Label htmlFor="logradouro">Logradouro *</Label>
                <div className="relative">
                  <Input
                    id="logradouro"
                    autoComplete="off"
                    placeholder={loadingLogradouros ? 'Carregando ruas do municipio...' : 'Digite para buscar uma rua'}
                    value={apreensaoForm.logradouro}
                    onChange={(e) => setApreensaoForm((current) => ({ ...current, logradouro: e.target.value }))}
                  />
                  {!!filteredLogradouroSuggestions.length && (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                      {filteredLogradouroSuggestions.map((item) => (
                        <button
                          key={`${item.nome}-${item.bairro || 'sem-bairro'}`}
                          type="button"
                          className="block w-full border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setApreensaoForm((current) => ({
                              ...current,
                              logradouro: item.nome,
                              bairro_apreensao: current.bairro_apreensao || item.bairro || '',
                              municipio: current.municipio || item.municipio || '',
                            }));
                          }}
                        >
                          <p className="truncate text-sm font-medium text-slate-900">{item.nome}</p>
                          <p className="truncate text-xs text-slate-500">
                            {[item.bairro, item.municipio].filter(Boolean).join(' - ') || 'Rua cadastrada'}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {loadingLogradouros
                    ? 'Carregando ruas do municipio...'
                    : 'Digite o nome da rua e selecione uma sugestao. Se nao aparecer, continue escrevendo manualmente.'}
                </p>
              </div>

              <div className="space-y-2 mt-3">
                <Label htmlFor="bairro_apreensao">Bairro / distrito da apreensao</Label>
                <Input id="bairro_apreensao" placeholder="Ex: Centro, Jardim America..." value={apreensaoForm.bairro_apreensao} onChange={(e) => setApreensaoForm({ ...apreensaoForm, bairro_apreensao: e.target.value })} />
              </div>

              {apreensaoForm.local_custodia === 'motos_delegacia' && (
                <div className="space-y-2 mt-3">
                  <Label htmlFor="numero_liberacao">Liberacao</Label>
                  <Input id="numero_liberacao" placeholder="Numero do documento de liberacao" value={apreensaoForm.numero_liberacao} onChange={(e) => setApreensaoForm({ ...apreensaoForm, numero_liberacao: e.target.value })} />
                </div>
              )}
            </div>

            <hr className="border-t border-muted" />

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dados do veículo</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="placa">Placa *</Label>
                    <Input id="placa" placeholder="ABC-1234" value={apreensaoForm.placa} onChange={(e) => setApreensaoForm({ ...apreensaoForm, placa: normalizePlate(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chassi">Chassi</Label>
                    <Input id="chassi" placeholder="Numero do chassi" value={apreensaoForm.chassi} onChange={(e) => setApreensaoForm({ ...apreensaoForm, chassi: e.target.value.toUpperCase() })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div className="space-y-2">
                    <Label htmlFor="ano">Ano</Label>
                    <Input id="ano" placeholder="Ex: 2010" value={apreensaoForm.ano} onChange={(e) => setApreensaoForm({ ...apreensaoForm, ano: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cor">Cor</Label>
                    <Input id="cor" placeholder="Ex: Prata" value={apreensaoForm.cor} onChange={(e) => setApreensaoForm({ ...apreensaoForm, cor: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modelo">Modelo/Marca</Label>
                    <Input id="modelo" placeholder="Ex: Fiat Uno" value={apreensaoForm.modelo} onChange={(e) => setApreensaoForm({ ...apreensaoForm, modelo: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2 mt-3">
                  <Label htmlFor="descricao_veiculo">Descricao do veiculo</Label>
                  <Input id="descricao_veiculo" placeholder="Ex: Fiat Uno Mille 1.0" value={apreensaoForm.descricao_veiculo} onChange={(e) => setApreensaoForm({ ...apreensaoForm, descricao_veiculo: e.target.value })} />
                </div>

                <div className="space-y-2 mt-3">
                  <Label htmlFor="municipio">Municipio</Label>
                  <Input id="municipio" placeholder="Ex: Sao Paulo" value={apreensaoForm.municipio} onChange={(e) => setApreensaoForm({ ...apreensaoForm, municipio: e.target.value })} />
                </div>
              </div>

              <hr className="border-t border-muted" />

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dados do condutor</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="proprietario_nome">Nome do proprietario</Label>
                    <Input id="proprietario_nome" placeholder="Nome completo do proprietario" value={apreensaoForm.proprietario_nome} onChange={(e) => setApreensaoForm({ ...apreensaoForm, proprietario_nome: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proprietario_cpf_cnpj">CPF/CNPJ do proprietario</Label>
                    <Input id="proprietario_cpf_cnpj" placeholder="000.000.000-00" value={apreensaoForm.proprietario_cpf_cnpj} onChange={(e) => setApreensaoForm({ ...apreensaoForm, proprietario_cpf_cnpj: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mt-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="infrator_nome">Nome do infrator</Label>
                    <Input id="infrator_nome" placeholder="Nome completo do infrator (se diferente do proprietario)" value={apreensaoForm.infrator_nome} onChange={(e) => setApreensaoForm({ ...apreensaoForm, infrator_nome: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Genero do condutor</Label>
                    <Select value={apreensaoForm.genero_condutor || undefined} onValueChange={(value) => setApreensaoForm({ ...apreensaoForm, genero_condutor: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione se informado" />
                      </SelectTrigger>
                      <SelectContent>
                        {genderOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 mt-3">
                  <Label>Envolvido em acidente</Label>
                  <Select value={apreensaoForm.envolvimento_acidente || undefined} onValueChange={(value) => setApreensaoForm({ ...apreensaoForm, envolvimento_acidente: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione se houve acidente" />
                    </SelectTrigger>
                    <SelectContent>
                      {accidentOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

            <hr className="border-t border-muted" />

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Outras informações</h3>
              <div className="space-y-2">
                <Label htmlFor="observacao">Observacao</Label>
                <Textarea id="observacao" rows={3} placeholder="Informacoes adicionais sobre a apreensao" value={apreensaoForm.observacao} onChange={(e) => setApreensaoForm({ ...apreensaoForm, observacao: e.target.value })} />
              </div>
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
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handlePrintVehicle(detalhesItem)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </button>
              </div>
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
                    <NativeInfoTile
                      label="Protocolo"
                      value={detalhesItem.protocolo || 'Nao informado'}
                      action={
                        detalhesItem.protocolo ? (
                          <button
                            type="button"
                            onClick={() => copiarTexto(detalhesItem.protocolo!)}
                            className="inline-flex items-center justify-center rounded-md border border-border bg-white p-1 text-primary shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                            title="Copiar protocolo"
                          >
                            {protocoloCopiado ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        ) : null
                      }
                    />
                    <NativeInfoTile label="Patio" value={getCustodyLabel(detalhesItem.local_custodia)} />
                    <NativeInfoTile label="Entrada" value={formatDateTime(detalhesItem.data_recolhimento)} />
                    <NativeInfoTile label="Situacao" value={detalhesItem.situacao || 'Nao informada'} />
                    <NativeInfoTile label="Taxa diaria" value={formatCurrency(getTaxaDiariaValue(detalhesItem))} emphasis />
                    <NativeInfoTile label="Dias de estadia" value={`${getDiasEstadia(detalhesItem)} dia(s)`} emphasis />
                    <NativeInfoTile label="Ano" value={detalhesItem.ano || 'Nao informado'} />
                    <NativeInfoTile label="Cor" value={detalhesItem.cor || 'Nao informado'} />
                    <NativeInfoTile label="Modelo" value={detalhesItem.modelo || 'Nao informado'} />
                    <NativeInfoTile label="Municipio" value={detalhesItem.municipio || 'Nao informado'} />
                    <NativeInfoTile label="Genero do condutor" value={getGenderLabel(detalhesItem.genero_condutor)} />
                    <NativeInfoTile label="Acidente" value={getAccidentLabel(detalhesItem.envolvimento_acidente)} />
                  </div>

                  <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Total acumulado</p>
                    <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-emerald-950">
                      {formatCurrency(getValorEstadia(detalhesItem))}
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
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
                              Editar dados
                            </Button>
                          ),
                        },
                        { label: 'Infrator', value: detalhesItem.infrator_nome || 'Nao informado' },
                        { label: 'Logradouro', value: detalhesItem.logradouro || 'Nao informado' },
                        { label: 'Bairro / distrito', value: detalhesItem.bairro_apreensao || 'Nao informado' },
                      ]}
                    />

                    <DetailSection
                      title="Dados do veiculo"
                      rows={[
                        { label: 'Chassi', value: detalhesItem.chassi || 'Nao informado' },
                        { label: 'Motivo', value: detalhesItem.motivo || 'Nao informado' },
                        { label: 'Restricao legal', value: getRestrictionLabel(detalhesItem.restricao_legal) },
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

                  {detalhesItem.observacao !== undefined && (
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Observacao</p>
                        <button
                          type="button"
                          onClick={() => {
                            if (editandoObservacao) {
                              setEditandoObservacao(false);
                            } else {
                              setObservacaoText(detalhesItem.observacao || '');
                              setEditandoObservacao(true);
                            }
                          }}
                          className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                        >
                          {editandoObservacao ? 'Cancelar' : 'Editar'}
                        </button>
                      </div>
                      {editandoObservacao ? (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            rows={3}
                            value={observacaoText}
                            onChange={(e) => setObservacaoText(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={async () => {
                                const { error } = await supabase
                                  .from('veiculos_recolhidos')
                                  .update({ observacao: observacaoText.trim() || null, updated_at: new Date().toISOString() })
                                  .eq('id', detalhesItem.id);
                                if (error) {
                                  toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
                                  return;
                                }
                                setDetalhesItem({ ...detalhesItem, observacao: observacaoText.trim() || null });
                                setEditandoObservacao(false);
                                toast({ title: 'Observacao atualizada' });
                              }}
                            >
                              Salvar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                          {detalhesItem.observacao || 'Nenhuma observacao registrada.'}
                        </p>
                      )}
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
                placeholder="Ex.: 25,00"
                value={taxaDiariaInput}
                onChange={(e) => setTaxaDiariaInput(e.target.value)}
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

        <AlertDialog open={isConfirmacaoLiberacaoOpen} onOpenChange={(v) => { if (!v) { setIsConfirmacaoLiberacaoOpen(false); setConfirmacaoStep(1); }}}>
          <AlertDialogContent>
            {confirmacaoStep === 1 ? (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deseja mesmo liberar esse veiculo?</AlertDialogTitle>
                  <AlertDialogDescription>Confira os dados antes de liberar.</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-medium">Placa:</span>
                    <span>{liberacaoItem?.placa}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-medium">Veiculo:</span>
                    <span>{liberacaoItem?.descricao_veiculo}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-medium">Proprietario:</span>
                    <span>{liberacaoItem?.proprietario_nome}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-medium">CPF/CNPJ:</span>
                    <span>{liberacaoItem?.proprietario_cpf_cnpj || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-medium">Data recolhimento:</span>
                    <span>{liberacaoItem?.data_recolhimento ? new Date(liberacaoItem.data_recolhimento).toLocaleDateString('pt-BR') : '-'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-medium">Data liberacao:</span>
                    <span>{liberacaoForm.data_liberacao ? new Date(liberacaoForm.data_liberacao + ':00').toLocaleString('pt-BR') : '-'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-medium">Situacao:</span>
                    <span>{liberacaoForm.situacao || 'Liberado'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="font-medium">Protocolo:</span>
                    <span>{liberacaoItem?.protocolo}</span>
                  </div>
                  {liberacaoForm.observacao && (
                    <div className="flex justify-between border-b pb-1">
                      <span className="font-medium">Observacao:</span>
                      <span className="text-right max-w-[200px] truncate">{liberacaoForm.observacao}</span>
                    </div>
                  )}
                </div>
                <AlertDialogFooter>
                  <Button variant="outline" onClick={() => { setIsConfirmacaoLiberacaoOpen(false); setConfirmacaoStep(1); }}>Voltar</Button>
                  <Button variant="default" onClick={() => setConfirmacaoStep(2)}>Continuar</Button>
                </AlertDialogFooter>
              </>
            ) : (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmacao final</AlertDialogTitle>
                  <AlertDialogDescription>Esta acao nao pode ser desfeita. Tem certeza absoluta que deseja prosseguir?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <Button variant="outline" onClick={() => setConfirmacaoStep(1)}>Voltar</Button>
                  <Button variant="default" onClick={handleConfirmarLiberacao}>Sim, liberar veiculo</Button>
                </AlertDialogFooter>
              </>
            )}
          </AlertDialogContent>
        </AlertDialog>

        <ResponsiveDialog
          open={isCpfDialogOpen}
          onOpenChange={setIsCpfDialogOpen}
          title="Editar dados do proprietario"
          description={cpfEditItem ? `${cpfEditItem.placa} • ${cpfEditItem.descricao_veiculo}` : ''}
          onCancel={closeCpfDialog}
          onConfirm={handleSubmitCpf}
          confirmLabel="Salvar dados"
        >
          <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label htmlFor="edit_nome">Nome</Label>
              <Input
                id="edit_nome"
                placeholder="Nome do proprietario"
                value={cpfEditName}
                onChange={(e) => setCpfEditName(e.target.value)}
              />
            </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit_logradouro">Endereço (logradouro)</Label>
                <Input
                  id="edit_logradouro"
                  placeholder="Nome da rua"
                  value={cpfEditLogradouro}
                  onChange={(e) => setCpfEditLogradouro(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_bairro">Bairro / Distrito</Label>
                <Input
                  id="edit_bairro"
                  placeholder="Bairro"
                  value={cpfEditBairro}
                  onChange={(e) => setCpfEditBairro(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf_justificativa">Justificativa (Opcional)</Label>
              <Textarea
                id="cpf_justificativa"
                rows={2}
                placeholder="Informe o motivo da alteracao se necessario"
                value={cpfEditJustificativa}
                onChange={(e) => setCpfEditJustificativa(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              A justificativa sera registrada no historico de observacoes do veiculo.
            </p>
          </div>
        </ResponsiveDialog>
      </div>
      {confirmDialog}

      <ResponsiveDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        title="Cadastro em massa"
        description="Selecione o arquivo preenchido para importar os veiculos."
      >
        <div className="space-y-6 py-4">
          <div className="rounded-xl border-2 border-brand-200 bg-brand-50/40 p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
              <Upload className="h-7 w-7 text-brand-600" />
            </div>
            <p className="text-base font-semibold text-slate-800">Selecione o arquivo preenchido</p>
            <p className="mt-1 text-sm text-slate-500">Formatos aceitos: .xlsx, .xls, .csv</p>
            <label className="mt-5 inline-flex cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleMassUpload}
                disabled={isImporting}
              />
              <Button type="button" variant="default" className="h-11 gap-2 rounded-xl px-6 text-sm font-semibold shadow-lg shadow-brand-200/50" disabled={isImporting} asChild>
                <span>
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isImporting ? 'Importando...' : 'Escolher arquivo'}
                </span>
              </Button>
            </label>
            {isImporting && (
              <p className="mt-3 text-xs text-brand-600 animate-pulse">Processando planilha, aguarde...</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-sm font-medium text-slate-600">Nao tem o modelo ainda?</p>
            <p className="mt-0.5 text-xs text-slate-400">Baixe o modelo, preencha e depois volte aqui para importar.</p>
            <Button type="button" variant="outline" size="sm" className="mt-3 gap-2" onClick={handleDownloadModelo}>
              <Download className="h-4 w-4" />
              Baixar modelo
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      <AlertDialog open={importResult !== null} onOpenChange={() => setImportResult(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <AlertDialogTitle className="text-center text-lg">
              Importacao concluida com sucesso!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <p className="text-sm text-slate-600">
                {importResult?.count} veiculo(s) foram importados para o patio.
              </p>
              {importResult && importResult.skipped > 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  {importResult.skipped} linha(s) foram ignoradas por falta de descricao ou data.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center sm:justify-center">
            <Button onClick={() => setImportResult(null)} className="rounded-xl px-8">
              OK, entendi
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

const VehicleCollectionSection = memo(function VehicleCollectionSection({
  data,
  columns,
  emptyMessage,
  mode,
  renderMobileVehicleCard,
}: {
  data: VeiculoRecolhido[];
  columns: Array<{
    header: string;
    accessor: keyof VeiculoRecolhido | ((item: VeiculoRecolhido) => ReactNode);
    render?: (value: unknown, item: VeiculoRecolhido) => ReactNode;
    className?: string;
  }>;
  emptyMessage: string;
  mode: 'patio' | 'liberacao' | 'consolidado';
  renderMobileVehicleCard: (item: VeiculoRecolhido, mode: 'patio' | 'liberacao' | 'consolidado') => ReactNode;
}) {
  return (
    <>
      <div className="space-y-3 lg:hidden">
        {data.map((item) => renderMobileVehicleCard(item, mode))}
        {data.length === 0 && (
          <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
            {emptyMessage}
          </div>
        )}
      </div>
      <div className="hidden overflow-hidden rounded-[22px] border border-border bg-card lg:block">
        <DataTable data={data} columns={columns} emptyMessage={emptyMessage} />
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
  value: string | number;
  subtitle: string;
  icon: typeof Car;
}) {
  return (
    <div className="rounded-[22px] bg-white/10 p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">{title}</p>
          <p className="mt-2 text-[20px] font-black tracking-[-0.06em] text-white break-words sm:text-[28px]">{value}</p>
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
  action,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className={`rounded-[20px] px-3 py-3 ${emphasis ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-50 text-slate-900'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${emphasis ? 'text-emerald-600' : 'text-slate-500'}`}>{label}</p>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <p className="mt-1 text-[15px] font-bold tracking-[-0.02em]">{value}</p>
    </div>
  );
}

function DetailSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string; action?: ReactNode }>;
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
