import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AlertTriangle, ArrowLeft, CalendarClock, Download, Eye, FileSpreadsheet, Pencil, Plus, Search, Trash2, Upload, UserRoundCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { exportarCsv } from '@/lib/exportarCsv';
import { maskCpfParcial } from '@/lib/masks';
import { usePermission } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

type RhServidor = {
  id: string;
  matricula: string;
  nome_completo: string;
  cpf: string | null;
  cargo: string | null;
  lotacao: string | null;
  data_admissao: string | null;
  data_nascimento: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  situacao: 'ativo' | 'afastado' | 'inativo';
  genero?: string | null;
  estado_civil?: string | null;
  escolaridade?: string | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  contato_emergencia_nome?: string | null;
  contato_emergencia_telefone?: string | null;
  cod_servidor?: string | null;
  naturalidade?: string | null;
  mes_aniversario?: string | null;
  nome_pai?: string | null;
  nome_mae?: string | null;
  nome_conjuge?: string | null;
  rg_numero?: string | null;
  rg_orgao?: string | null;
  rg_emissao?: string | null;
  pis_pasep?: string | null;
  data_pis_pasep?: string | null;
  ctps_numero?: string | null;
  ctps_serie?: string | null;
  ctps_uf?: string | null;
  titulo_eleitor?: string | null;
  titulo_zona?: string | null;
  titulo_secao?: string | null;
  reservista?: string | null;
  cnh_numero?: string | null;
  cnh_categoria?: string | null;
  celular?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  data_base?: string | null;
  carga_horaria?: number | null;
  inicio_contrato?: string | null;
  final_contrato?: string | null;
  secretaria?: string | null;
  cod_setor?: string | null;
  setor_nome?: string | null;
  funcao?: string | null;
  vinculo?: string | null;
  tipo_admissao?: string | null;
  tipo_previdencia?: string | null;
  natureza_vinculo?: string | null;
  num_expediente?: string | null;
  data_expediente?: string | null;
  num_amparo?: string | null;
  data_amparo?: string | null;
  senha_contracheque?: string | null;
  banco_codigo?: string | null;
  agencia_dv?: string | null;
  conta_dv?: string | null;
  banco_operacao?: string | null;
  salario_base?: number | null;
  salario_familia?: number | null;
  created_at: string;
};

type RhAfastamento = {
  id: string;
  servidor_id: string;
  tipo: 'ferias' | 'atestado' | 'licenca' | 'licenca_premio' | 'outro';
  data_inicio: string;
  data_fim: string;
  observacao: string | null;
};

type RhPonto = {
  id: string;
  servidor_id: string;
  data_ponto: string;
  entrada: string | null;
  saida: string | null;
  horas_extras: number;
  observacao: string | null;
};

const afastamentoLabels: Record<RhAfastamento['tipo'], string> = {
  ferias: 'Férias',
  atestado: 'Atestado',
  licenca: 'Licença',
  licenca_premio: 'Licença-prêmio',
  outro: 'Outro',
};

const situacaoBadge: Record<RhServidor['situacao'], string> = {
  ativo: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  afastado: 'bg-amber-100 text-amber-800 border-amber-200',
  inativo: 'bg-slate-100 text-slate-800 border-slate-200',
};

const initialServidor = {
  matricula: '',
  nome_completo: '',
  cpf: '',
  cargo: '',
  lotacao: '',
  data_admissao: '',
  data_nascimento: '',
  email: '',
  telefone: '',
  endereco: '',
  situacao: 'ativo' as RhServidor['situacao'],
  genero: '',
  estado_civil: '',
  escolaridade: '',
  banco: '',
  agencia: '',
  conta: '',
  contato_emergencia_nome: '',
  contato_emergencia_telefone: '',
  cod_servidor: '',
  naturalidade: '',
  mes_aniversario: '',
  nome_pai: '',
  nome_mae: '',
  nome_conjuge: '',
  rg_numero: '',
  rg_orgao: '',
  rg_emissao: '',
  pis_pasep: '',
  data_pis_pasep: '',
  ctps_numero: '',
  ctps_serie: '',
  ctps_uf: '',
  titulo_eleitor: '',
  titulo_zona: '',
  titulo_secao: '',
  reservista: '',
  cnh_numero: '',
  cnh_categoria: '',
  celular: '',
  bairro: '',
  cidade: '',
  uf: '',
  cep: '',
  data_base: '',
  carga_horaria: '',
  inicio_contrato: '',
  final_contrato: '',
  secretaria: '',
  cod_setor: '',
  setor_nome: '',
  funcao: '',
  vinculo: '',
  tipo_admissao: '',
  tipo_previdencia: '',
  natureza_vinculo: '',
  num_expediente: '',
  data_expediente: '',
  num_amparo: '',
  data_amparo: '',
  senha_contracheque: '',
  banco_codigo: '',
  agencia_dv: '',
  conta_dv: '',
  banco_operacao: '',
  salario_base: '',
  salario_familia: '',
};

const initialAfastamento = {
  tipo: 'ferias' as RhAfastamento['tipo'],
  data_inicio: '',
  data_fim: '',
  observacao: '',
};

const initialPonto = {
  servidor_id: '',
  data_ponto: '',
  entrada: '',
  saida: '',
  horas_extras: '',
  observacao: '',
};

type ServidorForm = typeof initialServidor;
type ServidorFormKey = keyof ServidorForm;

type ImportResumo = {
  validos: number;
  ignorados: number;
  alertasNome: string[];
  erros: string[];
};

const importAcceptedExtensions = ['.xlsx', '.xls', '.csv'];

const servidorImportColumns: Array<{ key: ServidorFormKey; label: string; required?: boolean; example?: string }> = [
  { key: 'matricula', label: 'Matricula', required: true, example: '000123' },
  { key: 'nome_completo', label: 'Nome Completo', required: true, example: 'MARIA DA SILVA' },
  { key: 'cpf', label: 'CPF', example: '000.000.000-00' },
  { key: 'cod_servidor', label: 'Cod Servidor', example: '24654' },
  { key: 'mes_aniversario', label: 'Aniversario', example: 'Fevereiro' },
  { key: 'cargo', label: 'Cargo', example: 'Guarda Municipal' },
  { key: 'funcao', label: 'Funcao', example: 'Agente de Transito' },
  { key: 'lotacao', label: 'Lotacao', example: 'SMST' },
  { key: 'secretaria', label: 'Secretaria', example: 'Seguranca Publica' },
  { key: 'data_admissao', label: 'Data Admissao', example: '2026-08-01' },
  { key: 'data_nascimento', label: 'Data Nascimento', example: '1990-01-31' },
  { key: 'situacao', label: 'Situacao', example: 'ativo' },
  { key: 'email', label: 'Email', example: 'servidor@caninde.ce.gov.br' },
  { key: 'telefone', label: 'Telefone', example: '(85) 0000-0000' },
  { key: 'celular', label: 'Celular', example: '(85) 90000-0000' },
  { key: 'endereco', label: 'Endereco' },
  { key: 'bairro', label: 'Bairro' },
  { key: 'cidade', label: 'Cidade', example: 'CANINDE' },
  { key: 'uf', label: 'UF', example: 'CE' },
  { key: 'cep', label: 'CEP', example: '62700-000' },
  { key: 'genero', label: 'Genero' },
  { key: 'estado_civil', label: 'Estado Civil' },
  { key: 'escolaridade', label: 'Escolaridade' },
  { key: 'naturalidade', label: 'Naturalidade' },
  { key: 'nome_pai', label: 'Nome Pai' },
  { key: 'nome_mae', label: 'Nome Mae' },
  { key: 'rg_numero', label: 'RG Numero' },
  { key: 'rg_orgao', label: 'RG Orgao' },
  { key: 'rg_emissao', label: 'RG Emissao' },
  { key: 'pis_pasep', label: 'PIS PASEP' },
  { key: 'data_pis_pasep', label: 'Data PASEP' },
  { key: 'ctps_numero', label: 'CTPS Numero' },
  { key: 'ctps_serie', label: 'CTPS Serie' },
  { key: 'ctps_uf', label: 'CTPS UF' },
  { key: 'cnh_numero', label: 'CNH Numero' },
  { key: 'cnh_categoria', label: 'CNH Categoria' },
  { key: 'titulo_eleitor', label: 'Titulo' },
  { key: 'titulo_zona', label: 'Titulo Zona' },
  { key: 'titulo_secao', label: 'Titulo Secao' },
  { key: 'reservista', label: 'Reservista' },
  { key: 'vinculo', label: 'Vinculo' },
  { key: 'tipo_admissao', label: 'Tipo Admissao' },
  { key: 'natureza_vinculo', label: 'Natureza Vinculo' },
  { key: 'tipo_previdencia', label: 'Tipo Previdencia' },
  { key: 'cod_setor', label: 'Cod Setor' },
  { key: 'setor_nome', label: 'Setor' },
  { key: 'num_expediente', label: 'Num Expediente' },
  { key: 'data_expediente', label: 'Data Expediente' },
  { key: 'num_amparo', label: 'Num Amparo' },
  { key: 'data_amparo', label: 'Data Amparo' },
  { key: 'senha_contracheque', label: 'Senha' },
  { key: 'banco_codigo', label: 'Cod Banco' },
  { key: 'banco', label: 'Banco' },
  { key: 'conta', label: 'Conta' },
  { key: 'conta_dv', label: 'Conta DV' },
  { key: 'agencia', label: 'Agencia' },
  { key: 'agencia_dv', label: 'Agencia DV' },
  { key: 'banco_operacao', label: 'Operacao' },
  { key: 'carga_horaria', label: 'Carga Horaria', example: '200' },
  { key: 'salario_base', label: 'Salario Base', example: '1518,00' },
];

const normalizeImportHeader = (header: string) =>
  header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const normalizeDigits = (value?: string | null) => String(value || '').replace(/\D/g, '');
const normalizeTextKey = (value?: string | null) => String(value || '').trim().toLowerCase();
const normalizeNameKey = (value?: string | null) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const servidorImportAliases: Record<string, ServidorFormKey> = servidorImportColumns.reduce((acc, column) => {
  acc[normalizeImportHeader(column.label)] = column.key;
  acc[normalizeImportHeader(column.key)] = column.key;
  return acc;
}, {} as Record<string, ServidorFormKey>);

Object.assign(servidorImportAliases, {
  nome: 'nome_completo',
  servidor: 'nome_completo',
  nomecompleto: 'nome_completo',
  codigoservidor: 'cod_servidor',
  codservidor: 'cod_servidor',
  codigo: 'cod_servidor',
  rg: 'rg_numero',
  orgaorg: 'rg_orgao',
  orgaoemissor: 'rg_orgao',
  admissao: 'data_admissao',
  nascimento: 'data_nascimento',
  datadenascimento: 'data_nascimento',
  telefonefixo: 'telefone',
  whatsapp: 'celular',
  salario: 'salario_base',
  cpf: 'cpf',
  pasep: 'pis_pasep',
  datapasep: 'data_pis_pasep',
  sexo: 'genero',
  endereco: 'endereco',
  cep: 'cep',
  pai: 'nome_pai',
  mae: 'nome_mae',
  conjuge: 'nome_conjuge',
  titulosecao: 'titulo_secao',
  titulozona: 'titulo_zona',
  titul: 'titulo_eleitor',
  codbanco: 'banco_codigo',
  codsetor: 'cod_setor',
  setor: 'setor_nome',
  natureza: 'natureza_vinculo',
  numexpediente: 'num_expediente',
  dataexpediente: 'data_expediente',
  numamparo: 'num_amparo',
  dataamparo: 'data_amparo',
  aniversrio: 'mes_aniversario',
  aniversario: 'mes_aniversario',
  categoriacnh: 'cnh_categoria',
});

const parseDateCell = (value: unknown) => {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const raw = String(value).trim();
  if (!raw) return '';
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const brMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`;
  return '';
};

const normalizeSituacao = (value: unknown): RhServidor['situacao'] => {
  const raw = normalizeImportHeader(String(value || 'ativo'));
  if (raw === 'afastado' || raw === 'afastada') return 'afastado';
  if (raw === 'inativo' || raw === 'inativa' || raw === 'desligado' || raw === 'desligada') return 'inativo';
  return 'ativo';
};

const parseNumberCell = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  return String(value || '').trim();
};

const parseDecimalValue = (value: string) => {
  const raw = String(value || '').replace(/R\$/gi, '').replace(/\s/g, '').trim();
  if (!raw) return null;
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(/,/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
};

const RecursosHumanosPage = () => {
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirmDialog();
  const podeExportarDadosSensiveis = usePermission('administracao.recursos_humanos.editar');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [servidores, setServidores] = useState<RhServidor[]>([]);
  const [afastamentos, setAfastamentos] = useState<RhAfastamento[]>([]);
  const [pontos, setPontos] = useState<RhPonto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [tab, setTab] = useState('servidores');

  const [modalTab, setModalTab] = useState('pessoais');
  const [servidorDialogOpen, setServidorDialogOpen] = useState(false);
  const [servidorDialogMode, setServidorDialogMode] = useState<'create' | 'edit'>('create');
  const [servidorAlvo, setServidorAlvo] = useState<RhServidor | null>(null);
  const [formServidor, setFormServidor] = useState(initialServidor);

  const [afastamentoDialogOpen, setAfastamentoDialogOpen] = useState(false);
  const [afastamentoServidor, setAfastamentoServidor] = useState<RhServidor | null>(null);
  const [formAfastamento, setFormAfastamento] = useState(initialAfastamento);

  const [pontoDialogOpen, setPontoDialogOpen] = useState(false);
  const [pontoServidor, setPontoServidor] = useState<RhServidor | null>(null);
  const [formPonto, setFormPonto] = useState(initialPonto);
  const [afastamentosAVencer, setAfastamentosAVencer] = useState<RhAfastamento[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importandoServidores, setImportandoServidores] = useState(false);
  const [importResumo, setImportResumo] = useState<ImportResumo | null>(null);

  const [detalhesDialogOpen, setDetalhesDialogOpen] = useState(false);
  const [servidorDetalhes, setServidorDetalhes] = useState<RhServidor | null>(null);
  const [detalhesModalTab, setDetalhesModalTab] = useState('pessoais');

  const openDetalhes = async (servidor: RhServidor) => {
    const { data, error } = await supabase.rpc('rh_obter_ficha_servidor', { _servidor_id: servidor.id });
    if (error || (data && typeof data === 'object' && 'error' in (data as object))) {
      const msg = (data as { error?: string } | null)?.error || error?.message || 'Sem permissao para abrir a ficha.';
      toast({ title: 'Acesso negado', description: msg, variant: 'destructive' });
      return;
    }
    setServidorDetalhes((data as unknown) as RhServidor);
    setDetalhesModalTab('pessoais');
    setDetalhesDialogOpen(true);
  };

  const loadData = useCallback(async () => {
    const [servidoresResponse, afastamentosResponse, pontosResponse, aVencerResponse] = await Promise.all([
      supabase.from('rh_servidores').select('*').order('nome_completo'),
      supabase.from('rh_afastamentos').select('*').order('data_inicio', { ascending: false }).limit(200),
      supabase.from('rh_folhas_ponto').select('*').order('data_ponto', { ascending: false }).limit(300),
      supabase.rpc('rh_afastamentos_a_vencer', { _dias: 7 }),
    ]);
    if (servidoresResponse.error) console.warn('Erro ao carregar servidores:', servidoresResponse.error.message);
    else setServidores((servidoresResponse.data || []) as RhServidor[]);
    if (afastamentosResponse.error) console.warn('Erro ao carregar afastamentos:', afastamentosResponse.error.message);
    else setAfastamentos((afastamentosResponse.data || []) as RhAfastamento[]);
    if (pontosResponse.error) console.warn('Erro ao carregar folhas de ponto:', pontosResponse.error.message);
    else setPontos((pontosResponse.data || []) as RhPonto[]);
    if (aVencerResponse.error) console.warn('Erro ao carregar afastamentos a vencer:', aVencerResponse.error.message);
    else setAfastamentosAVencer((aVencerResponse.data || []) as unknown as RhAfastamento[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredServidores = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return servidores;
    return servidores.filter(
      (s) =>
        s.nome_completo.toLowerCase().includes(termo) ||
        s.matricula.toLowerCase().includes(termo) ||
        (s.cargo || '').toLowerCase().includes(termo) ||
        (s.cpf || '').includes(termo),
    );
  }, [servidores, busca]);

  const ativosCount = servidores.filter((s) => s.situacao === 'ativo').length;
  const afastadosCount = servidores.filter((s) => s.situacao === 'afastado').length;
  const afastamentosVigentes = afastamentos.filter((a) => new Date(a.data_fim) >= new Date()).length;

  const openCreate = () => {
    setServidorDialogMode('create');
    setServidorAlvo(null);
    setFormServidor(initialServidor);
    setModalTab('pessoais');
    setServidorDialogOpen(true);
  };

  const openEdit = (servidor: RhServidor) => {
    setServidorDialogMode('edit');
    setServidorAlvo(servidor);
    setModalTab('pessoais');
    setFormServidor({
      matricula: servidor.matricula || '',
      nome_completo: servidor.nome_completo || '',
      cpf: servidor.cpf || '',
      cargo: servidor.cargo || '',
      lotacao: servidor.lotacao || '',
      data_admissao: servidor.data_admissao || '',
      data_nascimento: servidor.data_nascimento || '',
      email: servidor.email || '',
      telefone: servidor.telefone || '',
      endereco: servidor.endereco || '',
      situacao: servidor.situacao || 'ativo',
      genero: servidor.genero || '',
      estado_civil: servidor.estado_civil || '',
      escolaridade: servidor.escolaridade || '',
      banco: servidor.banco || '',
      agencia: servidor.agencia || '',
      conta: servidor.conta || '',
      contato_emergencia_nome: servidor.contato_emergencia_nome || '',
      contato_emergencia_telefone: servidor.contato_emergencia_telefone || '',
      cod_servidor: servidor.cod_servidor || '',
      naturalidade: servidor.naturalidade || '',
      mes_aniversario: servidor.mes_aniversario || '',
      nome_pai: servidor.nome_pai || '',
      nome_mae: servidor.nome_mae || '',
      nome_conjuge: servidor.nome_conjuge || '',
      rg_numero: servidor.rg_numero || '',
      rg_orgao: servidor.rg_orgao || '',
      rg_emissao: servidor.rg_emissao || '',
      pis_pasep: servidor.pis_pasep || '',
      data_pis_pasep: servidor.data_pis_pasep || '',
      ctps_numero: servidor.ctps_numero || '',
      ctps_serie: servidor.ctps_serie || '',
      ctps_uf: servidor.ctps_uf || '',
      titulo_eleitor: servidor.titulo_eleitor || '',
      titulo_zona: servidor.titulo_zona || '',
      titulo_secao: servidor.titulo_secao || '',
      reservista: servidor.reservista || '',
      cnh_numero: servidor.cnh_numero || '',
      cnh_categoria: servidor.cnh_categoria || '',
      celular: servidor.celular || '',
      bairro: servidor.bairro || '',
      cidade: servidor.cidade || '',
      uf: servidor.uf || '',
      cep: servidor.cep || '',
      data_base: servidor.data_base || '',
      carga_horaria: servidor.carga_horaria ? String(servidor.carga_horaria) : '',
      inicio_contrato: servidor.inicio_contrato || '',
      final_contrato: servidor.final_contrato || '',
      secretaria: servidor.secretaria || '',
      cod_setor: servidor.cod_setor || '',
      setor_nome: servidor.setor_nome || '',
      funcao: servidor.funcao || '',
      vinculo: servidor.vinculo || '',
      tipo_admissao: servidor.tipo_admissao || '',
      tipo_previdencia: servidor.tipo_previdencia || '',
      natureza_vinculo: servidor.natureza_vinculo || '',
      num_expediente: servidor.num_expediente || '',
      data_expediente: servidor.data_expediente || '',
      num_amparo: servidor.num_amparo || '',
      data_amparo: servidor.data_amparo || '',
      senha_contracheque: servidor.senha_contracheque || '',
      banco_codigo: servidor.banco_codigo || '',
      agencia_dv: servidor.agencia_dv || '',
      conta_dv: servidor.conta_dv || '',
      banco_operacao: servidor.banco_operacao || '',
      salario_base: servidor.salario_base !== null && servidor.salario_base !== undefined ? String(servidor.salario_base) : '',
      salario_familia: servidor.salario_familia !== null && servidor.salario_familia !== undefined ? String(servidor.salario_familia) : '',
    });
    setServidorDialogOpen(true);
  };

  const handleServidorSave = async () => {
    if (!formServidor.nome_completo.trim() || !formServidor.matricula.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Informe nome completo e matrícula.', variant: 'destructive' });
      return;
    }
    const payload = {
      matricula: formServidor.matricula.trim(),
      nome_completo: formServidor.nome_completo.trim(),
      cpf: formServidor.cpf.trim() || null,
      cargo: formServidor.cargo.trim() || null,
      lotacao: formServidor.lotacao.trim() || null,
      data_admissao: formServidor.data_admissao || null,
      data_nascimento: formServidor.data_nascimento || null,
      email: formServidor.email.trim() || null,
      telefone: formServidor.telefone.trim() || null,
      endereco: formServidor.endereco.trim() || null,
      situacao: formServidor.situacao,
      genero: formServidor.genero.trim() || null,
      estado_civil: formServidor.estado_civil.trim() || null,
      escolaridade: formServidor.escolaridade.trim() || null,
      banco: formServidor.banco.trim() || null,
      agencia: formServidor.agencia.trim() || null,
      conta: formServidor.conta.trim() || null,
      contato_emergencia_nome: formServidor.contato_emergencia_nome.trim() || null,
      contato_emergencia_telefone: formServidor.contato_emergencia_telefone.trim() || null,
      cod_servidor: formServidor.cod_servidor.trim() || null,
      naturalidade: formServidor.naturalidade.trim() || null,
      mes_aniversario: formServidor.mes_aniversario.trim() || null,
      nome_pai: formServidor.nome_pai.trim() || null,
      nome_mae: formServidor.nome_mae.trim() || null,
      nome_conjuge: formServidor.nome_conjuge.trim() || null,
      rg_numero: formServidor.rg_numero.trim() || null,
      rg_orgao: formServidor.rg_orgao.trim() || null,
      rg_emissao: formServidor.rg_emissao || null,
      pis_pasep: formServidor.pis_pasep.trim() || null,
      data_pis_pasep: formServidor.data_pis_pasep || null,
      ctps_numero: formServidor.ctps_numero.trim() || null,
      ctps_serie: formServidor.ctps_serie.trim() || null,
      ctps_uf: formServidor.ctps_uf.trim() || null,
      titulo_eleitor: formServidor.titulo_eleitor.trim() || null,
      titulo_zona: formServidor.titulo_zona.trim() || null,
      titulo_secao: formServidor.titulo_secao.trim() || null,
      reservista: formServidor.reservista.trim() || null,
      cnh_numero: formServidor.cnh_numero.trim() || null,
      cnh_categoria: formServidor.cnh_categoria.trim() || null,
      celular: formServidor.celular.trim() || null,
      bairro: formServidor.bairro.trim() || null,
      cidade: formServidor.cidade.trim() || null,
      uf: formServidor.uf.trim() || null,
      cep: formServidor.cep.trim() || null,
      data_base: formServidor.data_base || null,
      carga_horaria: formServidor.carga_horaria ? Number(formServidor.carga_horaria) : null,
      inicio_contrato: formServidor.inicio_contrato || null,
      final_contrato: formServidor.final_contrato || null,
      secretaria: formServidor.secretaria.trim() || null,
      cod_setor: formServidor.cod_setor.trim() || null,
      setor_nome: formServidor.setor_nome.trim() || null,
      funcao: formServidor.funcao.trim() || null,
      vinculo: formServidor.vinculo.trim() || null,
      tipo_admissao: formServidor.tipo_admissao.trim() || null,
      tipo_previdencia: formServidor.tipo_previdencia.trim() || null,
      natureza_vinculo: formServidor.natureza_vinculo.trim() || null,
      num_expediente: formServidor.num_expediente.trim() || null,
      data_expediente: formServidor.data_expediente || null,
      num_amparo: formServidor.num_amparo.trim() || null,
      data_amparo: formServidor.data_amparo || null,
      senha_contracheque: formServidor.senha_contracheque.trim() || null,
      banco_codigo: formServidor.banco_codigo.trim() || null,
      agencia_dv: formServidor.agencia_dv.trim() || null,
      conta_dv: formServidor.conta_dv.trim() || null,
      banco_operacao: formServidor.banco_operacao.trim() || null,
      salario_base: formServidor.salario_base ? Number(formServidor.salario_base.replace(',', '.')) : null,
      salario_familia: formServidor.salario_familia ? Number(formServidor.salario_familia.replace(',', '.')) : null,
    };
    const { error } = servidorDialogMode === 'edit' && servidorAlvo
      ? await supabase.from('rh_servidores').update(payload).eq('id', servidorAlvo.id)
      : await supabase.from('rh_servidores').insert(payload);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: servidorDialogMode === 'edit' ? 'Servidor atualizado' : 'Servidor cadastrado',
      description: 'Todos os campos foram gravados no banco de dados com sucesso.',
    });
    setServidorDialogOpen(false);
    setServidorAlvo(null);
    void loadData();
  };

  const handleDelete = async (servidor: RhServidor) => {
    const confirmed = await confirm({
      title: 'Excluir servidor',
      description: `Remover permanentemente ${servidor.nome_completo}? Os afastamentos vinculados serão removidos.`,
    });
    if (!confirmed) return;
    const { error } = await supabase.from('rh_servidores').delete().eq('id', servidor.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Servidor excluído', description: `${servidor.nome_completo} foi removido.` });
    void loadData();
  };

  const openAfastamento = (servidor: RhServidor) => {
    setAfastamentoServidor(servidor);
    setFormAfastamento(initialAfastamento);
    setAfastamentoDialogOpen(true);
  };

  const handleAfastamentoSave = async () => {
    if (!afastamentoServidor) return;
    if (!formAfastamento.data_inicio || !formAfastamento.data_fim) {
      toast({ title: 'Campos obrigatórios', description: 'Informe as datas de início e fim.', variant: 'destructive' });
      return;
    }
    if (new Date(formAfastamento.data_fim) < new Date(formAfastamento.data_inicio)) {
      toast({ title: 'Datas inválidas', description: 'A data final deve ser maior ou igual à inicial.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('rh_afastamentos').insert({
      servidor_id: afastamentoServidor.id,
      tipo: formAfastamento.tipo,
      data_inicio: formAfastamento.data_inicio,
      data_fim: formAfastamento.data_fim,
      observacao: formAfastamento.observacao.trim() || null,
    });
    if (error) {
      toast({ title: 'Erro ao registrar', description: error.message, variant: 'destructive' });
      return;
    }
    const { error: updateError } = await supabase
      .from('rh_servidores')
      .update({ situacao: 'afastado' })
      .eq('id', afastamentoServidor.id)
      .eq('situacao', 'ativo');
    if (updateError) console.warn('Não foi possível atualizar a situação do servidor:', updateError.message);
    toast({ title: 'Afastamento registrado', description: 'O período de afastamento foi salvo.' });
    setAfastamentoDialogOpen(false);
    setAfastamentoServidor(null);
    void loadData();
  };

  const handleCancelarAfastamento = async (afastamento: RhAfastamento) => {
    const confirmed = await confirm({
      title: 'Remover afastamento',
      description: 'Excluir este registro de afastamento?',
    });
    if (!confirmed) return;
    const { error } = await supabase.from('rh_afastamentos').delete().eq('id', afastamento.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Afastamento removido', description: 'O registro foi excluído.' });
    void loadData();
  };

  const afastamentosDoServidor = (servidorId: string) => afastamentos.filter((a) => a.servidor_id === servidorId);

  const handleExportarServidores = () => {
    const exportarCompleto = podeExportarDadosSensiveis;
    exportarCsv(exportarCompleto ? 'servidores-rh-completo' : 'servidores-rh', [
      'Matricula', 'CodServidor', 'Nome', 'CPF', 'RG', 'Cargo', 'Funcao', 'Lotacao', 'Secretaria', 'Admissao', 'Situacao', 'Email', 'Telefone', 'Celular', ...(exportarCompleto ? ['SalarioBase'] : [])
    ], servidores.map((s) => [
      s.matricula,
      s.cod_servidor || '',
      s.nome_completo,
      exportarCompleto ? (s.cpf || '') : (s.cpf ? maskCpfParcial(s.cpf) : ''),
      s.rg_numero || '',
      s.cargo || '',
      s.funcao || '',
      s.lotacao || '',
      s.secretaria || '',
      s.data_admissao || '',
      s.situacao,
      s.email || '',
      s.telefone || '',
      s.celular || '',
      ...(exportarCompleto ? [s.salario_base !== null && s.salario_base !== undefined ? String(s.salario_base) : ''] : []),
    ]));
    toast({
      title: 'Exportação iniciada',
      description: exportarCompleto
        ? 'O CSV completo dos servidores foi gerado.'
        : 'CSV gerado com CPF mascarado (dados sensíveis protegidos).',
    });
  };

  const buildServidorPayload = (form: ServidorForm) => ({
    matricula: form.matricula.trim(),
    nome_completo: form.nome_completo.trim(),
    cpf: form.cpf.trim() || null,
    cargo: form.cargo.trim() || null,
    lotacao: form.lotacao.trim() || null,
    data_admissao: form.data_admissao || null,
    data_nascimento: form.data_nascimento || null,
    email: form.email.trim() || null,
    telefone: form.telefone.trim() || null,
    endereco: form.endereco.trim() || null,
    situacao: form.situacao,
    genero: form.genero.trim() || null,
    estado_civil: form.estado_civil.trim() || null,
    escolaridade: form.escolaridade.trim() || null,
    banco: form.banco.trim() || null,
    agencia: form.agencia.trim() || null,
    conta: form.conta.trim() || null,
    contato_emergencia_nome: form.contato_emergencia_nome.trim() || null,
    contato_emergencia_telefone: form.contato_emergencia_telefone.trim() || null,
    cod_servidor: form.cod_servidor.trim() || null,
    naturalidade: form.naturalidade.trim() || null,
    mes_aniversario: form.mes_aniversario.trim() || null,
    nome_pai: form.nome_pai.trim() || null,
    nome_mae: form.nome_mae.trim() || null,
    nome_conjuge: form.nome_conjuge.trim() || null,
    rg_numero: form.rg_numero.trim() || null,
    rg_orgao: form.rg_orgao.trim() || null,
    rg_emissao: form.rg_emissao || null,
    pis_pasep: form.pis_pasep.trim() || null,
    data_pis_pasep: form.data_pis_pasep || null,
    ctps_numero: form.ctps_numero.trim() || null,
    ctps_serie: form.ctps_serie.trim() || null,
    ctps_uf: form.ctps_uf.trim() || null,
    titulo_eleitor: form.titulo_eleitor.trim() || null,
    titulo_zona: form.titulo_zona.trim() || null,
    titulo_secao: form.titulo_secao.trim() || null,
    reservista: form.reservista.trim() || null,
    cnh_numero: form.cnh_numero.trim() || null,
    cnh_categoria: form.cnh_categoria.trim() || null,
    celular: form.celular.trim() || null,
    bairro: form.bairro.trim() || null,
    cidade: form.cidade.trim() || null,
    uf: form.uf.trim() || null,
    cep: form.cep.trim() || null,
    data_base: form.data_base || null,
    carga_horaria: form.carga_horaria ? Number(form.carga_horaria) : null,
    inicio_contrato: form.inicio_contrato || null,
    final_contrato: form.final_contrato || null,
    secretaria: form.secretaria.trim() || null,
    cod_setor: form.cod_setor.trim() || null,
    setor_nome: form.setor_nome.trim() || null,
    funcao: form.funcao.trim() || null,
    vinculo: form.vinculo.trim() || null,
    tipo_admissao: form.tipo_admissao.trim() || null,
    tipo_previdencia: form.tipo_previdencia.trim() || null,
    natureza_vinculo: form.natureza_vinculo.trim() || null,
    num_expediente: form.num_expediente.trim() || null,
    data_expediente: form.data_expediente || null,
    num_amparo: form.num_amparo.trim() || null,
    data_amparo: form.data_amparo || null,
    senha_contracheque: form.senha_contracheque.trim() || null,
    banco_codigo: form.banco_codigo.trim() || null,
    agencia_dv: form.agencia_dv.trim() || null,
    conta_dv: form.conta_dv.trim() || null,
    banco_operacao: form.banco_operacao.trim() || null,
    salario_base: parseDecimalValue(form.salario_base),
    salario_familia: parseDecimalValue(form.salario_familia),
  });

  const handleDownloadModeloServidores = () => {
    const wb = XLSX.utils.book_new();
    const headers = servidorImportColumns.map((column) => column.label);
    const exemplos = servidorImportColumns.map((column) => column.example || '');
    const ws = XLSX.utils.aoa_to_sheet([headers, exemplos]);
    XLSX.utils.book_append_sheet(wb, ws, 'Servidores');
    XLSX.writeFile(wb, 'modelo-importacao-servidores-rh.xlsx');
  };

  const handleOpenImportDialog = () => {
    setImportResumo(null);
    setImportDialogOpen(true);
  };

  const handleServidorFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setImportResumo(null);
    if (!file) return;

    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!extension || !importAcceptedExtensions.includes(extension)) {
      toast({ title: 'Formato inválido', description: 'Envie uma planilha .xlsx, .xls ou .csv.', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'O limite para importação é de 10 MB.', variant: 'destructive' });
      return;
    }

    setImportandoServidores(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const existingMatriculas = new Set(servidores.map((s) => normalizeTextKey(s.matricula)).filter(Boolean));
      const existingCpfs = new Set(servidores.map((s) => normalizeDigits(s.cpf)).filter(Boolean));
      const existingCodigos = new Set(servidores.map((s) => normalizeTextKey(s.cod_servidor)).filter(Boolean));
      const existingNomes = new Set(servidores.map((s) => normalizeNameKey(s.nome_completo)).filter(Boolean));
      const seenMatriculas = new Set<string>();
      const seenCpfs = new Set<string>();
      const seenCodigos = new Set<string>();
      const payload: ReturnType<typeof buildServidorPayload>[] = [];
      const erros: string[] = [];
      const alertasNome: string[] = [];
      let ignorados = 0;

      for (const sheetName of workbook.SheetNames) {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: '' });
        const headerIndex = rows.findIndex((row) => {
          if (!Array.isArray(row)) return false;
          const normalized = row.map((cell) => normalizeImportHeader(String(cell || '')));
          const hasNome = normalized.some((cell) => servidorImportAliases[cell] === 'nome_completo');
          const hasIdentificador = normalized.some((cell) => {
            const mapped = servidorImportAliases[cell];
            return mapped === 'matricula' || mapped === 'cod_servidor';
          });
          return hasNome && hasIdentificador;
        });

        if (headerIndex === -1) continue;

        const rawHeaders = (rows[headerIndex] as unknown[]).map((cell) => normalizeImportHeader(String(cell || '')));
        const columnMap = new Map<ServidorFormKey, number>();
        rawHeaders.forEach((rawHeader, index) => {
          let header = servidorImportAliases[rawHeader];
          if (rawHeader === 'dv') {
            const previousHeader = rawHeaders[index - 1];
            if (previousHeader === 'conta') header = 'conta_dv';
            if (previousHeader === 'agencia') header = 'agencia_dv';
          }
          if (rawHeader === 'ctpsvia') header = 'ctps_uf';
          if (header && !columnMap.has(header)) columnMap.set(header, index);
        });

        for (const [rowOffset, row] of rows.slice(headerIndex + 1).entries()) {
          if (!Array.isArray(row) || row.every((cell) => String(cell || '').trim() === '')) continue;
          const lineNumber = headerIndex + rowOffset + 2;
          const form: ServidorForm = { ...initialServidor };

          columnMap.forEach((index, key) => {
            const raw = row[index];
            if (key === 'situacao') form.situacao = normalizeSituacao(raw);
            else if (key.startsWith('data_') || key === 'inicio_contrato' || key === 'final_contrato' || key === 'rg_emissao') form[key] = parseDateCell(raw);
            else if (key === 'carga_horaria' || key === 'salario_base' || key === 'salario_familia') form[key] = parseNumberCell(raw);
            else form[key] = String(raw || '').trim();
          });

          if (!form.matricula.trim() && form.cod_servidor.trim()) {
            form.matricula = form.cod_servidor.trim();
          }

          const matriculaKey = normalizeTextKey(form.matricula);
          const nomeKey = normalizeNameKey(form.nome_completo);
          const cpfKey = normalizeDigits(form.cpf);
          const codigoKey = normalizeTextKey(form.cod_servidor);

          if (!matriculaKey || !nomeKey) {
            erros.push(`Linha ${lineNumber}: matrícula e nome completo são obrigatórios.`);
            ignorados += 1;
            continue;
          }
          if (existingMatriculas.has(matriculaKey) || seenMatriculas.has(matriculaKey)) {
            erros.push(`Linha ${lineNumber}: matrícula já cadastrada ou repetida na planilha (${form.matricula}).`);
            ignorados += 1;
            continue;
          }
          if (cpfKey && (existingCpfs.has(cpfKey) || seenCpfs.has(cpfKey))) {
            erros.push(`Linha ${lineNumber}: CPF já cadastrado ou repetido na planilha.`);
            ignorados += 1;
            continue;
          }
          if (codigoKey && (existingCodigos.has(codigoKey) || seenCodigos.has(codigoKey))) {
            erros.push(`Linha ${lineNumber}: código do servidor já cadastrado ou repetido na planilha (${form.cod_servidor}).`);
            ignorados += 1;
            continue;
          }
          if (existingNomes.has(nomeKey) && alertasNome.length < 8) {
            alertasNome.push(`Linha ${lineNumber}: nome já existe no RH (${form.nome_completo}).`);
          }

          seenMatriculas.add(matriculaKey);
          if (cpfKey) seenCpfs.add(cpfKey);
          if (codigoKey) seenCodigos.add(codigoKey);
          payload.push(buildServidorPayload(form));
        }
      }

      if (!payload.length) {
        setImportResumo({ validos: 0, ignorados, alertasNome, erros });
        toast({ title: 'Nenhum servidor válido', description: 'Revise os campos obrigatórios e duplicidades apontadas.', variant: 'destructive' });
        return;
      }

      const confirmed = await confirm({
        title: 'Importar servidores',
        description: `Foram encontrados ${payload.length} servidor(es) válido(s). ${ignorados} linha(s) serão ignoradas. Deseja continuar?`,
      });
      if (!confirmed) {
        setImportResumo({ validos: payload.length, ignorados, alertasNome, erros });
        return;
      }

      for (let index = 0; index < payload.length; index += 500) {
        const { error } = await supabase.from('rh_servidores').insert(payload.slice(index, index + 500));
        if (error) throw error;
      }

      setImportResumo({ validos: payload.length, ignorados, alertasNome, erros });
      toast({ title: 'Importação concluída', description: `${payload.length} servidor(es) importado(s) para o RH.` });
      setImportDialogOpen(false);
      void loadData();
    } catch (error) {
      toast({ title: 'Erro ao importar', description: error instanceof Error ? error.message : 'Erro inesperado ao ler a planilha.', variant: 'destructive' });
    } finally {
      setImportandoServidores(false);
    }
  };
  const handleExportarAfastamentos = () => {
    exportarCsv('afastamentos-rh', ['Servidor', 'Tipo', 'Data início', 'Data fim', 'Observação'], afastamentos.map((a) => [
      servidores.find((s) => s.id === a.servidor_id)?.nome_completo || 'Servidor removido',
      afastamentoLabels[a.tipo],
      a.data_inicio,
      a.data_fim,
      a.observacao || '',
    ]));
    toast({ title: 'Exportação iniciada', description: 'O CSV de afastamentos foi gerado.' });
  };

  const handleExportarPonto = () => {
    exportarCsv('folha-ponto-rh', ['Data', 'Servidor', 'Entrada', 'Saída', 'Horas extras', 'Observação'], pontos.map((p) => [
      p.data_ponto,
      servidores.find((s) => s.id === p.servidor_id)?.nome_completo || 'Servidor removido',
      p.entrada || '',
      p.saida || '',
      String(Number(p.horas_extras || 0)),
      p.observacao || '',
    ]));
    toast({ title: 'Exportação iniciada', description: 'O CSV da folha de ponto foi gerado.' });
  };

  const openPonto = (servidor: RhServidor) => {
    setPontoServidor(servidor);
    setFormPonto({ ...initialPonto, servidor_id: servidor.id, data_ponto: new Date().toISOString().slice(0, 10) });
    setPontoDialogOpen(true);
  };

  const openPontoNovo = () => {
    if (servidores.length === 0) {
      toast({ title: 'Sem servidores', description: 'Cadastre servidores antes de registrar ponto.', variant: 'destructive' });
      return;
    }
    setPontoServidor(null);
    setFormPonto({ ...initialPonto, data_ponto: new Date().toISOString().slice(0, 10) });
    setPontoDialogOpen(true);
  };

  const handlePontoSave = async () => {
    const servidorId = formPonto.servidor_id || pontoServidor?.id;
    const servidorAlvoPonto = servidores.find((s) => s.id === servidorId);
    if (!servidorId || !servidorAlvoPonto) {
      toast({ title: 'Selecione o servidor', description: 'Escolha o servidor antes de salvar o ponto.', variant: 'destructive' });
      return;
    }
    if (!formPonto.data_ponto) {
      toast({ title: 'Campo obrigatório', description: 'Informe a data do ponto.', variant: 'destructive' });
      return;
    }
    const horasExtras = Number(formPonto.horas_extras.replace(',', '.')) || 0;
    if (horasExtras < 0) {
      toast({ title: 'Horas inválidas', description: 'As horas extras não podem ser negativas.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('rh_folhas_ponto').insert({
      servidor_id: servidorId,
      data_ponto: formPonto.data_ponto,
      entrada: formPonto.entrada || null,
      saida: formPonto.saida || null,
      horas_extras: Number(horasExtras.toFixed(2)),
      observacao: formPonto.observacao.trim() || null,
    });
    if (error) {
      const message = error.message || '';
      const bloqueadoPorAfastamento = /afastamento/i.test(message);
      toast({
        title: bloqueadoPorAfastamento ? 'Ponto bloqueado' : 'Erro ao registrar ponto',
        description: bloqueadoPorAfastamento
          ? `${servidorAlvoPonto.nome_completo} está em afastamento na data informada. Registre apenas quando o afastamento terminar.`
          : message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Ponto registrado', description: 'A jornada foi salva na folha de ponto.' });
    setPontoDialogOpen(false);
    setPontoServidor(null);
    void loadData();
  };

  const handleDeletePonto = async (ponto: RhPonto) => {
    const confirmed = await confirm({
      title: 'Excluir ponto',
      description: `Remover o registro de ponto de ${new Date(ponto.data_ponto).toLocaleDateString('pt-BR')}?`,
    });
    if (!confirmed) return;
    const { error } = await supabase.from('rh_folhas_ponto').delete().eq('id', ponto.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Ponto excluído', description: 'O registro foi removido.' });
    void loadData();
  };

  const calcularHoras = (entrada: string | null, saida: string | null) => {
    if (!entrada || !saida) return null;
    const [eh, em] = entrada.split(':').map(Number);
    const [sh, sm] = saida.split(':').map(Number);
    if (eh === undefined || em === undefined || sh === undefined || sm === undefined) return null;
    const inicio = eh * 60 + em;
    const fim = sh * 60 + sm;
    let minutos = fim - inicio;
    if (minutos < 0) minutos += 24 * 60;
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return `${horas}h${resto > 0 ? String(resto).padStart(2, '0') : ''}`;
  };

  const pontosDoMes = useMemo(() => {
    const agora = new Date();
    const mesKey = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    return pontos.filter((p) => p.data_ponto.startsWith(mesKey));
  }, [pontos]);

  const totalPontosMes = pontosDoMes.length;
  const totalHorasExtrasMes = pontosDoMes.reduce((acc, p) => acc + Number(p.horas_extras || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-1 px-1 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Voltar"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">Recursos Humanos</h1>
        </div>

        <section className="hidden rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#0d9488_100%)] md:rounded-[34px] lg:block">
          <div className="space-y-4 px-4 pb-4 pt-5 md:space-y-6 md:px-6 md:pb-5 md:pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-teal-100/70 md:text-[11px]">Administração Central</p>
                <h1 className="mt-2 text-xl font-black tracking-[-0.05em] text-white sm:text-2xl md:mt-3 md:text-[32px] md:tracking-[-0.07em] lg:text-[38px]">Recursos Humanos</h1>
                <p className="mt-1.5 hidden max-w-xl text-[13px] leading-5 text-white md:block md:mt-2 md:text-[14px] md:leading-6">
                  Ficha completa do servidor com todos os 63 campos da Secretaria (dados pessoais, documentos, vínculo, atos e dados bancários).
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Servidores</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{servidores.length}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/70">Total cadastrados</p>
              </div>
              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Ativos</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{ativosCount}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/70">Em atividade</p>
              </div>
              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Afastados</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{afastadosCount}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/70">Férias/atestado/licença</p>
              </div>
              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Afast. vigentes</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{afastamentosVigentes}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/70">Períodos em andamento</p>
              </div>
            </div>
          </div>
        </section>

        {afastamentosAVencer.length > 0 && (
          <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">
              {afastamentosAVencer.length} afastamento(s) terminam nos próximos 7 dias:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {afastamentosAVencer.map((a) => (
                <span key={a.id} className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                  {(a as any).servidor_nome || 'Servidor'} · {afastamentoLabels[(a as any).tipo]} · até {new Date(a.data_fim).toLocaleDateString('pt-BR')}
                </span>
              ))}
            </div>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="servidores">Servidores</TabsTrigger>
            <TabsTrigger value="ponto">Folha de Ponto</TabsTrigger>
            <TabsTrigger value="afastamentos">Afastamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="servidores" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10 text-sm font-medium"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, matrícula, CPF ou cargo..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl text-[13px] font-semibold" onClick={handleExportarServidores} disabled={servidores.length === 0}>
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
                <Button variant="outline" onClick={handleOpenImportDialog} className="gap-2 rounded-2xl">
                  <Upload className="h-4 w-4" />
                  Cadastrar em massa
                </Button>
                <Button onClick={openCreate} className="gap-2 rounded-2xl">
                  <Plus className="h-4 w-4" />
                  Cadastrar servidor
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="rounded-[22px] border border-border bg-card p-8 text-center text-muted-foreground">Carregando servidores...</div>
            ) : filteredServidores.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
                Nenhum servidor encontrado
              </div>
            ) : (
              <div className="space-y-3">
                {filteredServidores.map((servidor) => {
                  const afastamentosAtivosServidor = afastamentosDoServidor(servidor.id).filter(
                    (a) => new Date(a.data_fim) >= new Date(),
                  );
                  return (
                    <div key={servidor.id} className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-700 text-white">
                            <UserRoundCog className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[15px] font-bold text-slate-900">{servidor.nome_completo}</p>
                              {servidor.cod_servidor && (
                                <Badge variant="outline" className="rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                                  Cód: {servidor.cod_servidor}
                                </Badge>
                              )}
                              <Badge variant="outline" className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', situacaoBadge[servidor.situacao])}>
                                {servidor.situacao === 'ativo' ? 'Ativo' : servidor.situacao === 'afastado' ? 'Afastado' : 'Inativo'}
                              </Badge>
                              {afastamentosAtivosServidor.length > 0 && (
                                <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                                  {afastamentosAtivosServidor.length} afastamento(s) vigente(s)
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-[13px] text-slate-500">
                              Matrícula {servidor.matricula}
                              {servidor.cpf ? ` · CPF: ${maskCpfParcial(servidor.cpf)}` : ''}
                              {servidor.cargo ? ` · Cargo: ${servidor.cargo}` : ''}
                              {servidor.funcao ? ` · Função: ${servidor.funcao}` : ''}
                              {servidor.lotacao ? ` · Lotação: ${servidor.lotacao}` : ''}
                            </p>
                            <p className="mt-0.5 text-[12px] text-slate-400">
                              {[servidor.email, servidor.telefone, servidor.celular].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-9 rounded-xl text-[13px] font-semibold" onClick={() => openAfastamento(servidor)}>
                            <CalendarClock className="h-4 w-4" />
                            Afastamento
                          </Button>
                          <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl text-[13px] font-semibold text-slate-700 hover:bg-slate-100" title="Ver Detalhes" onClick={() => void openDetalhes(servidor)}>
                            <Eye className="h-4 w-4 text-teal-700" />
                            Detalhes
                          </Button>
                          <Button variant="ghost" size="sm" className="h-9 rounded-xl text-[13px] font-semibold text-slate-600" onClick={() => openEdit(servidor)}>
                            <Pencil className="h-4 w-4" />
                            Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="h-9 rounded-xl text-[13px] font-semibold text-red-600" onClick={() => void handleDelete(servidor)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ponto" className="space-y-4">
            <div className="grid grid-cols-1 gap-3 rounded-[22px] border border-slate-200/80 bg-white p-4 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Registros do mês</p>
                <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-slate-900">{totalPontosMes}</p>
                <p className="mt-0.5 text-[13px] text-slate-500">Jornadas lançadas</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Horas extras no mês</p>
                <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-amber-600">{totalHorasExtrasMes.toFixed(2)}h</p>
                <p className="mt-0.5 text-[13px] text-slate-500">Acumulado do período</p>
              </div>
              <div className="flex items-end justify-end gap-2">
                <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl text-[13px] font-semibold" onClick={handleExportarPonto} disabled={pontos.length === 0}>
                  <Download className="h-4 w-4" />
                  Exportar ponto
                </Button>
                <Button variant="outline" size="sm" className="h-9 rounded-xl text-[13px] font-semibold" onClick={openPontoNovo}>
                  <CalendarClock className="h-4 w-4" />
                  Registrar ponto
                </Button>
              </div>
            </div>

            {pontos.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
                Nenhum registro de ponto. Registre a jornada de entrada/saída dos servidores.
              </div>
            ) : (
              <div className="space-y-2">
                {pontos.map((ponto) => {
                  const servidor = servidores.find((s) => s.id === ponto.servidor_id);
                  const horas = calcularHoras(ponto.entrada, ponto.saida);
                  return (
                    <div key={ponto.id} className="flex flex-col gap-2 rounded-[18px] border border-slate-200/80 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-100 text-teal-700">
                          <CalendarClock className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{servidor?.nome_completo || 'Servidor removido'}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {new Date(ponto.data_ponto).toLocaleDateString('pt-BR')}
                            {ponto.entrada ? ` · Entrada ${ponto.entrada}` : ''}
                            {ponto.saida ? ` · Saída ${ponto.saida}` : ''}
                            {horas ? ` · ${horas}` : ''}
                            {Number(ponto.horas_extras) > 0 ? ` · +${Number(ponto.horas_extras).toFixed(2)}h extras` : ''}
                            {ponto.observacao ? ` · ${ponto.observacao}` : ''}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 self-start rounded-lg p-0 text-red-600 sm:self-auto" onClick={() => void handleDeletePonto(ponto)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="afastamentos" className="space-y-4">
            <div className="flex items-center justify-end">
              <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl text-[13px] font-semibold" onClick={handleExportarAfastamentos} disabled={afastamentos.length === 0}>
                <Download className="h-4 w-4" />
                Exportar afastamentos
              </Button>
            </div>
            {afastamentos.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-slate-200 p-8 text-center text-[15px] text-slate-400">
                Nenhum afastamento registrado
              </div>
            ) : (
              <div className="space-y-3">
                {afastamentos.map((afastamento) => {
                  const servidor = servidores.find((s) => s.id === afastamento.servidor_id);
                  const vigente = new Date(afastamento.data_fim) >= new Date();
                  return (
                    <div key={afastamento.id} className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[15px] font-bold text-slate-900">{servidor?.nome_completo || 'Servidor removido'}</p>
                            <Badge variant="outline" className="rounded-full border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-700">
                              {afastamentoLabels[afastamento.tipo]}
                            </Badge>
                            {vigente && (
                              <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                                Vigente
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-[13px] text-slate-500">
                            {new Date(afastamento.data_inicio).toLocaleDateString('pt-BR')} até {new Date(afastamento.data_fim).toLocaleDateString('pt-BR')}
                            {afastamento.observacao ? ` · ${afastamento.observacao}` : ''}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-9 self-start rounded-xl text-[13px] font-semibold text-red-600 sm:self-auto" onClick={() => void handleCancelarAfastamento(afastamento)}>
                          <Trash2 className="h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal Importação em Massa */}
      <ResponsiveDialog
        open={importDialogOpen}
        onOpenChange={(open) => { if (!open && !importandoServidores) setImportDialogOpen(false); }}
        title="Cadastrar servidores em massa"
        description="Importe uma planilha com os dados cadastrais dos servidores."
        confirmLabel={importandoServidores ? 'Importando...' : 'Selecionar planilha'}
        confirmLoading={importandoServidores}
        onCancel={() => setImportDialogOpen(false)}
        onConfirm={() => fileInputRef.current?.click()}
      >
        <div className="space-y-4 py-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => void handleServidorFileImport(event)}
          />

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-100 text-teal-700">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">Formatos aceitos</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  O sistema aceita arquivos .xlsx, .xls e .csv. As colunas obrigatórias são Matrícula e Nome Completo; os demais campos são opcionais e seguem o modelo disponível para download.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" variant="outline" className="h-auto justify-start gap-3 rounded-2xl px-4 py-3 text-left" onClick={handleDownloadModeloServidores}>
              <Download className="h-4 w-4 shrink-0" />
              <span>
                <span className="block text-sm font-bold">Baixar modelo</span>
                <span className="block text-xs font-normal text-slate-500">Planilha com os campos cadastrais do servidor</span>
              </span>
            </Button>
            <Button type="button" className="h-auto justify-start gap-3 rounded-2xl px-4 py-3 text-left" onClick={() => fileInputRef.current?.click()} disabled={importandoServidores}>
              <Upload className="h-4 w-4 shrink-0" />
              <span>
                <span className="block text-sm font-bold">Enviar planilha</span>
                <span className="block text-xs font-normal text-white/80">Validar obrigatórios e duplicidades</span>
              </span>
            </Button>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Duplicidade é bloqueada por matrícula, CPF ou código do servidor. Nome igual aparece como alerta, porque pode existir homônimo legítimo.
              </p>
            </div>
          </div>

          {importResumo && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-bold text-slate-900">Resumo da última leitura</p>
              <p className="mt-1 text-sm text-slate-600">
                {importResumo.validos} válido(s), {importResumo.ignorados} ignorado(s).
              </p>
              {(importResumo.erros.length > 0 || importResumo.alertasNome.length > 0) && (
                <div className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-600">
                  {[...importResumo.erros.slice(0, 10), ...importResumo.alertasNome].map((item, index) => (
                    <p key={`${item}-${index}`}>{item}</p>
                  ))}
                  {importResumo.erros.length > 10 && <p>Mais {importResumo.erros.length - 10} ocorrência(s) não exibida(s).</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </ResponsiveDialog>
      {/* Modal Reformulado com 6 Abas para os 63 Campos do Excel */}
      <ResponsiveDialog
        open={servidorDialogOpen}
        onOpenChange={(open) => { if (!open) { setServidorDialogOpen(false); setServidorAlvo(null); } }}
        title={servidorDialogMode === 'edit' ? 'Ficha do Servidor - Editar' : 'Ficha do Servidor - Novo Cadastro'}
        description={servidorDialogMode === 'edit' ? servidorAlvo?.nome_completo || '' : 'Formulário completo com 63 campos institucionais.'}
        confirmLabel={servidorDialogMode === 'edit' ? 'Salvar Servidor' : 'Cadastrar Servidor'}
        onCancel={() => { setServidorDialogOpen(false); setServidorAlvo(null); }}
        onConfirm={() => void handleServidorSave()}
      >
        <div className="space-y-4 py-2 max-h-[75vh] overflow-y-auto pr-1">
          <Tabs value={modalTab} onValueChange={setModalTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <TabsTrigger value="pessoais" className="rounded-lg py-1.5">👤 Pessoais</TabsTrigger>
              <TabsTrigger value="documentos" className="rounded-lg py-1.5">🪪 Documentos</TabsTrigger>
              <TabsTrigger value="endereco" className="rounded-lg py-1.5">📍 Contato</TabsTrigger>
              <TabsTrigger value="vinculo" className="rounded-lg py-1.5">💼 Vínculo</TabsTrigger>
              <TabsTrigger value="atos" className="rounded-lg py-1.5">📜 Atos</TabsTrigger>
              <TabsTrigger value="banco" className="rounded-lg py-1.5">🏦 Banco/Salário</TabsTrigger>
            </TabsList>

            {/* ABA 1: DADOS PESSOAIS & FAMÍLIA */}
            <TabsContent value="pessoais" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nome Completo *</Label>
                  <Input value={formServidor.nome_completo} onChange={(e) => setFormServidor({ ...formServidor, nome_completo: e.target.value })} placeholder="Nome do servidor" />
                </div>
                <div className="space-y-1.5">
                  <Label>Matrícula *</Label>
                  <Input value={formServidor.matricula} onChange={(e) => setFormServidor({ ...formServidor, matricula: e.target.value })} placeholder="00000" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Cód. Servidor (Sistemas)</Label>
                  <Input value={formServidor.cod_servidor} onChange={(e) => setFormServidor({ ...formServidor, cod_servidor: e.target.value })} placeholder="Ex: 24654" />
                </div>
                <div className="space-y-1.5">
                  <Label>CPF</Label>
                  <Input value={formServidor.cpf} onChange={(e) => setFormServidor({ ...formServidor, cpf: e.target.value })} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Data de Nascimento</Label>
                  <Input type="date" value={formServidor.data_nascimento} onChange={(e) => setFormServidor({ ...formServidor, data_nascimento: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Gênero / Sexo</Label>
                  <Select value={formServidor.genero} onValueChange={(v) => setFormServidor({ ...formServidor, genero: v === '__none__' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      <SelectItem value="masculino">Masculino (M)</SelectItem>
                      <SelectItem value="feminino">Feminino (F)</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Estado Civil</Label>
                  <Select value={formServidor.estado_civil} onValueChange={(v) => setFormServidor({ ...formServidor, estado_civil: v === '__none__' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      <SelectItem value="SOLTEIRO">Solteiro(a)</SelectItem>
                      <SelectItem value="CASADO">Casado(a)</SelectItem>
                      <SelectItem value="DIVORCIADO">Divorciado(a)</SelectItem>
                      <SelectItem value="VIUVO">Viúvo(a)</SelectItem>
                      <SelectItem value="UNIAO_ESTAVEL">União Estável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Grau de Instrução</Label>
                  <Input value={formServidor.escolaridade} onChange={(e) => setFormServidor({ ...formServidor, escolaridade: e.target.value })} placeholder="Ex: Ensino Médio Completo" />
                </div>
                <div className="space-y-1.5">
                  <Label>Naturalidade</Label>
                  <Input value={formServidor.naturalidade} onChange={(e) => setFormServidor({ ...formServidor, naturalidade: e.target.value })} placeholder="Cidade-UF" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Nome do Pai</Label>
                  <Input value={formServidor.nome_pai} onChange={(e) => setFormServidor({ ...formServidor, nome_pai: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nome da Mãe</Label>
                  <Input value={formServidor.nome_mae} onChange={(e) => setFormServidor({ ...formServidor, nome_mae: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cônjuge</Label>
                  <Input value={formServidor.nome_conjuge} onChange={(e) => setFormServidor({ ...formServidor, nome_conjuge: e.target.value })} />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Aniversário & Emergência</p>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Mês de Aniversário</Label>
                    <Input value={formServidor.mes_aniversario} onChange={(e) => setFormServidor({ ...formServidor, mes_aniversario: e.target.value })} placeholder="Ex: Fevereiro" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contato Emergência (Nome)</Label>
                    <Input value={formServidor.contato_emergencia_nome} onChange={(e) => setFormServidor({ ...formServidor, contato_emergencia_nome: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contato Emergência (Tel)</Label>
                    <Input value={formServidor.contato_emergencia_telefone} onChange={(e) => setFormServidor({ ...formServidor, contato_emergencia_telefone: e.target.value })} />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: DOCUMENTAÇÃO & HABILITAÇÃO */}
            <TabsContent value="documentos" className="space-y-4 pt-3">
              <div className="border-b border-slate-100 pb-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-3">RG (Registro Geral)</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Número do RG</Label>
                    <Input value={formServidor.rg_numero} onChange={(e) => setFormServidor({ ...formServidor, rg_numero: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Órgão Expedidor</Label>
                    <Input value={formServidor.rg_orgao} onChange={(e) => setFormServidor({ ...formServidor, rg_orgao: e.target.value })} placeholder="Ex: SSPDS" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data de Emissão RG</Label>
                    <Input type="date" value={formServidor.rg_emissao} onChange={(e) => setFormServidor({ ...formServidor, rg_emissao: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-100 pb-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-3">PIS / PASEP & CTPS</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>Número PIS / PASEP</Label>
                    <Input value={formServidor.pis_pasep} onChange={(e) => setFormServidor({ ...formServidor, pis_pasep: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data PIS / PASEP</Label>
                    <Input type="date" value={formServidor.data_pis_pasep} onChange={(e) => setFormServidor({ ...formServidor, data_pis_pasep: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>CTPS (Número)</Label>
                    <Input value={formServidor.ctps_numero} onChange={(e) => setFormServidor({ ...formServidor, ctps_numero: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>CTPS Série / Via</Label>
                    <div className="flex gap-2">
                      <Input value={formServidor.ctps_serie} onChange={(e) => setFormServidor({ ...formServidor, ctps_serie: e.target.value })} placeholder="Série" />
                      <Input value={formServidor.ctps_uf} onChange={(e) => setFormServidor({ ...formServidor, ctps_uf: e.target.value })} placeholder="UF" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-100 pb-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-3">Título de Eleitor & Reservista</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>Título de Eleitor</Label>
                    <Input value={formServidor.titulo_eleitor} onChange={(e) => setFormServidor({ ...formServidor, titulo_eleitor: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Zona Eleitoral</Label>
                    <Input value={formServidor.titulo_zona} onChange={(e) => setFormServidor({ ...formServidor, titulo_zona: e.target.value })} placeholder="000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Seção Eleitoral</Label>
                    <Input value={formServidor.titulo_secao} onChange={(e) => setFormServidor({ ...formServidor, titulo_secao: e.target.value })} placeholder="0000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Certificado Reservista</Label>
                    <Input value={formServidor.reservista} onChange={(e) => setFormServidor({ ...formServidor, reservista: e.target.value })} />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-3">Carteira de Habilitação (CNH)</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Número CNH</Label>
                    <Input value={formServidor.cnh_numero} onChange={(e) => setFormServidor({ ...formServidor, cnh_numero: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Categoria CNH</Label>
                    <Input value={formServidor.cnh_categoria} onChange={(e) => setFormServidor({ ...formServidor, cnh_categoria: e.target.value })} placeholder="Ex: AB, B, D" />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA 3: CONTATO & ENDEREÇO */}
            <TabsContent value="endereco" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input type="email" value={formServidor.email} onChange={(e) => setFormServidor({ ...formServidor, email: e.target.value })} placeholder="servidor@caninde.ce.gov.br" />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone Fixo</Label>
                  <Input value={formServidor.telefone} onChange={(e) => setFormServidor({ ...formServidor, telefone: e.target.value })} placeholder="(85) 0000-0000" />
                </div>
                <div className="space-y-1.5">
                  <Label>Celular / WhatsApp</Label>
                  <Input value={formServidor.celular} onChange={(e) => setFormServidor({ ...formServidor, celular: e.target.value })} placeholder="(85) 90000-0000" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Endereço / Logradouro</Label>
                  <Input value={formServidor.endereco} onChange={(e) => setFormServidor({ ...formServidor, endereco: e.target.value })} placeholder="Rua, Av, Número, Comp." />
                </div>
                <div className="space-y-1.5">
                  <Label>C.E.P.</Label>
                  <Input value={formServidor.cep} onChange={(e) => setFormServidor({ ...formServidor, cep: e.target.value })} placeholder="62700-000" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Bairro</Label>
                  <Input value={formServidor.bairro} onChange={(e) => setFormServidor({ ...formServidor, bairro: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cidade</Label>
                  <Input value={formServidor.cidade} onChange={(e) => setFormServidor({ ...formServidor, cidade: e.target.value })} placeholder="CANINDE" />
                </div>
                <div className="space-y-1.5">
                  <Label>UF</Label>
                  <Input value={formServidor.uf} onChange={(e) => setFormServidor({ ...formServidor, uf: e.target.value })} placeholder="CE" />
                </div>
              </div>
            </TabsContent>

            {/* ABA 4: VÍNCULO & CARGO (FUNCIONAL) */}
            <TabsContent value="vinculo" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Situação Cadastral</Label>
                  <Select value={formServidor.situacao} onValueChange={(v) => setFormServidor({ ...formServidor, situacao: v as RhServidor['situacao'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="afastado">Afastado</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Cargo</Label>
                  <Input value={formServidor.cargo} onChange={(e) => setFormServidor({ ...formServidor, cargo: e.target.value })} placeholder="Ex: Guarda Municipal" />
                </div>
                <div className="space-y-1.5">
                  <Label>Função</Label>
                  <Input value={formServidor.funcao} onChange={(e) => setFormServidor({ ...formServidor, funcao: e.target.value })} placeholder="Ex: Agente de Trânsito" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Lotação</Label>
                  <Input value={formServidor.lotacao} onChange={(e) => setFormServidor({ ...formServidor, lotacao: e.target.value })} placeholder="Ex: SMST" />
                </div>
                <div className="space-y-1.5">
                  <Label>Secretaria</Label>
                  <Input value={formServidor.secretaria} onChange={(e) => setFormServidor({ ...formServidor, secretaria: e.target.value })} placeholder="Ex: SMST" />
                </div>
                <div className="space-y-1.5">
                  <Label>Cód. Setor</Label>
                  <Input value={formServidor.cod_setor} onChange={(e) => setFormServidor({ ...formServidor, cod_setor: e.target.value })} placeholder="137" />
                </div>
                <div className="space-y-1.5">
                  <Label>Nome do Setor</Label>
                  <Input value={formServidor.setor_nome} onChange={(e) => setFormServidor({ ...formServidor, setor_nome: e.target.value })} placeholder="Ex: CONTRATADOS" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                <div className="space-y-1.5">
                  <Label>Admissão</Label>
                  <Input type="date" value={formServidor.data_admissao} onChange={(e) => setFormServidor({ ...formServidor, data_admissao: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Data Base</Label>
                  <Input type="date" value={formServidor.data_base} onChange={(e) => setFormServidor({ ...formServidor, data_base: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Carga Horária (h)</Label>
                  <Input type="number" value={formServidor.carga_horaria} onChange={(e) => setFormServidor({ ...formServidor, carga_horaria: e.target.value })} placeholder="200" />
                </div>
                <div className="space-y-1.5">
                  <Label>Início Contrato</Label>
                  <Input type="date" value={formServidor.inicio_contrato} onChange={(e) => setFormServidor({ ...formServidor, inicio_contrato: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Término Contrato</Label>
                  <Input type="date" value={formServidor.final_contrato} onChange={(e) => setFormServidor({ ...formServidor, final_contrato: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Vínculo</Label>
                  <Input value={formServidor.vinculo} onChange={(e) => setFormServidor({ ...formServidor, vinculo: e.target.value })} placeholder="Ex: CONTRATADO" />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de Admissão</Label>
                  <Input value={formServidor.tipo_admissao} onChange={(e) => setFormServidor({ ...formServidor, tipo_admissao: e.target.value })} placeholder="Ex: CONCURSO / CONTRATO" />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo Previdência</Label>
                  <Input value={formServidor.tipo_previdencia} onChange={(e) => setFormServidor({ ...formServidor, tipo_previdencia: e.target.value })} placeholder="Ex: INSS / PREVMU" />
                </div>
                <div className="space-y-1.5">
                  <Label>Natureza do Vínculo</Label>
                  <Input value={formServidor.natureza_vinculo} onChange={(e) => setFormServidor({ ...formServidor, natureza_vinculo: e.target.value })} placeholder="Ex: TEMPORARIO" />
                </div>
              </div>
            </TabsContent>

            {/* ABA 5: ATOS ADMINISTRATIVOS */}
            <TabsContent value="atos" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Núm. Expediente / Portaria</Label>
                  <Input value={formServidor.num_expediente} onChange={(e) => setFormServidor({ ...formServidor, num_expediente: e.target.value })} placeholder="Ex: 13/2025" />
                </div>
                <div className="space-y-1.5">
                  <Label>Data do Expediente</Label>
                  <Input type="date" value={formServidor.data_expediente} onChange={(e) => setFormServidor({ ...formServidor, data_expediente: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Núm. Amparo Legal / Lei</Label>
                  <Input value={formServidor.num_amparo} onChange={(e) => setFormServidor({ ...formServidor, num_amparo: e.target.value })} placeholder="Ex: Lei 2318/2016" />
                </div>
                <div className="space-y-1.5">
                  <Label>Data do Amparo Legal</Label>
                  <Input type="date" value={formServidor.data_amparo} onChange={(e) => setFormServidor({ ...formServidor, data_amparo: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5 max-w-sm">
                <Label>Senha de Acesso ao Contracheque</Label>
                <Input type="password" value={formServidor.senha_contracheque} onChange={(e) => setFormServidor({ ...formServidor, senha_contracheque: e.target.value })} placeholder="Código/Senha" />
              </div>
            </TabsContent>

            {/* ABA 6: DADOS BANCÁRIOS & SALÁRIO */}
            <TabsContent value="banco" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Cód. Banco</Label>
                  <Input value={formServidor.banco_codigo} onChange={(e) => setFormServidor({ ...formServidor, banco_codigo: e.target.value })} placeholder="Ex: 237" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nome do Banco</Label>
                  <Input value={formServidor.banco} onChange={(e) => setFormServidor({ ...formServidor, banco: e.target.value })} placeholder="Ex: BRADESCO" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Agência</Label>
                  <Input value={formServidor.agencia} onChange={(e) => setFormServidor({ ...formServidor, agencia: e.target.value })} placeholder="1302" />
                </div>
                <div className="space-y-1.5">
                  <Label>DV Agência</Label>
                  <Input value={formServidor.agencia_dv} onChange={(e) => setFormServidor({ ...formServidor, agencia_dv: e.target.value })} placeholder="1" />
                </div>
                <div className="space-y-1.5">
                  <Label>Número Conta</Label>
                  <Input value={formServidor.conta} onChange={(e) => setFormServidor({ ...formServidor, conta: e.target.value })} placeholder="46513" />
                </div>
                <div className="space-y-1.5">
                  <Label>DV Conta</Label>
                  <Input value={formServidor.conta_dv} onChange={(e) => setFormServidor({ ...formServidor, conta_dv: e.target.value })} placeholder="5" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Operação Bancária</Label>
                  <Input value={formServidor.banco_operacao} onChange={(e) => setFormServidor({ ...formServidor, banco_operacao: e.target.value })} placeholder="Ex: 013" />
                </div>
                <div className="space-y-1.5">
                  <Label>Salário Base (R$)</Label>
                  <Input value={formServidor.salario_base} onChange={(e) => setFormServidor({ ...formServidor, salario_base: e.target.value })} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Salário Família (R$)</Label>
                  <Input value={formServidor.salario_familia} onChange={(e) => setFormServidor({ ...formServidor, salario_familia: e.target.value })} placeholder="0.00" />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ResponsiveDialog>

      {/* Modal Registrar Ponto */}
      <ResponsiveDialog
        open={pontoDialogOpen}
        onOpenChange={(open) => { if (!open) { setPontoDialogOpen(false); setPontoServidor(null); } }}
        title="Registrar ponto"
        description={pontoServidor?.nome_completo || 'Jornada de entrada/saída'}
        confirmLabel="Registrar"
        onCancel={() => { setPontoDialogOpen(false); setPontoServidor(null); }}
        onConfirm={() => void handlePontoSave()}
      >
        <div className="space-y-4 py-2">
          {!pontoServidor && (
            <div className="space-y-2">
              <Label>Servidor *</Label>
              <Select value={formPonto.servidor_id} onValueChange={(v) => setFormPonto({ ...formPonto, servidor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o servidor" /></SelectTrigger>
                <SelectContent>
                  {servidores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Data *</Label>
            <Input type="date" value={formPonto.data_ponto} onChange={(e) => setFormPonto({ ...formPonto, data_ponto: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Entrada</Label>
              <Input type="time" value={formPonto.entrada} onChange={(e) => setFormPonto({ ...formPonto, entrada: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Saída</Label>
              <Input type="time" value={formPonto.saida} onChange={(e) => setFormPonto({ ...formPonto, saida: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Horas extras</Label>
              <Input inputMode="decimal" value={formPonto.horas_extras} onChange={(e) => setFormPonto({ ...formPonto, horas_extras: e.target.value })} placeholder="0" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observação</Label>
            <Input value={formPonto.observacao} onChange={(e) => setFormPonto({ ...formPonto, observacao: e.target.value })} placeholder="Opcional" />
          </div>
        </div>
      </ResponsiveDialog>

      {/* Modal Registrar Afastamento */}
      <ResponsiveDialog
        open={afastamentoDialogOpen}
        onOpenChange={(open) => { if (!open) { setAfastamentoDialogOpen(false); setAfastamentoServidor(null); } }}
        title="Registrar afastamento"
        description={afastamentoServidor?.nome_completo || ''}
        confirmLabel="Registrar"
        onCancel={() => { setAfastamentoDialogOpen(false); setAfastamentoServidor(null); }}
        onConfirm={() => void handleAfastamentoSave()}
      >
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Tipo de afastamento</Label>
            <Select value={formAfastamento.tipo} onValueChange={(v) => setFormAfastamento({ ...formAfastamento, tipo: v as RhAfastamento['tipo'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ferias">Férias</SelectItem>
                <SelectItem value="atestado">Atestado</SelectItem>
                <SelectItem value="licenca">Licença</SelectItem>
                <SelectItem value="licenca_premio">Licença-prêmio</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Data início</Label>
              <Input type="date" value={formAfastamento.data_inicio} onChange={(e) => setFormAfastamento({ ...formAfastamento, data_inicio: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data fim</Label>
              <Input type="date" value={formAfastamento.data_fim} onChange={(e) => setFormAfastamento({ ...formAfastamento, data_fim: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observação</Label>
            <Input value={formAfastamento.observacao} onChange={(e) => setFormAfastamento({ ...formAfastamento, observacao: e.target.value })} placeholder="Opcional" />
          </div>
        </div>
      </ResponsiveDialog>

      {/* Modal de Detalhes Completo do Servidor */}
      <ResponsiveDialog
        open={detalhesDialogOpen}
        onOpenChange={(open) => { if (!open) { setDetalhesDialogOpen(false); setServidorDetalhes(null); } }}
        title={servidorDetalhes ? `Ficha do Servidor: ${servidorDetalhes.nome_completo}` : 'Detalhes do Servidor'}
        description={servidorDetalhes ? `Matrícula ${servidorDetalhes.matricula} · ${servidorDetalhes.cargo || 'Sem cargo'}` : ''}
        confirmLabel="Fechar Ficha"
        onConfirm={() => { setDetalhesDialogOpen(false); setServidorDetalhes(null); }}
        className="sm:max-w-4xl"
      >
        {servidorDetalhes && (
          <div className="space-y-4 py-2 max-h-[75vh] overflow-y-auto pr-1">
            {/* Cabeçalho de resumo */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-700 text-white font-bold text-lg">
                  <UserRoundCog className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{servidorDetalhes.nome_completo}</h3>
                    <Badge variant="outline" className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', situacaoBadge[servidorDetalhes.situacao])}>
                      {servidorDetalhes.situacao === 'ativo' ? 'Ativo' : servidorDetalhes.situacao === 'afastado' ? 'Afastado' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Matrícula: <strong className="text-slate-800">{servidorDetalhes.matricula}</strong>
                    {servidorDetalhes.cod_servidor && ` · Cód: ${servidorDetalhes.cod_servidor}`}
                    {servidorDetalhes.cpf && ` · CPF: ${servidorDetalhes.cpf}`}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-9 gap-1.5 rounded-xl text-xs font-semibold" onClick={() => { setDetalhesDialogOpen(false); openEdit(servidorDetalhes); }}>
                <Pencil className="h-3.5 w-3.5" /> Editar Ficha
              </Button>
            </div>

            {/* Abas com os detalhes organizados */}
            <Tabs value={detalhesModalTab} onValueChange={setDetalhesModalTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <TabsTrigger value="pessoais" className="rounded-lg py-1.5">👤 Pessoais</TabsTrigger>
                <TabsTrigger value="documentos" className="rounded-lg py-1.5">🪪 Documentos</TabsTrigger>
                <TabsTrigger value="endereco" className="rounded-lg py-1.5">📍 Contato</TabsTrigger>
                <TabsTrigger value="vinculo" className="rounded-lg py-1.5">💼 Vínculo</TabsTrigger>
                <TabsTrigger value="atos" className="rounded-lg py-1.5">📜 Atos</TabsTrigger>
                <TabsTrigger value="banco" className="rounded-lg py-1.5">🏦 Banco/Salário</TabsTrigger>
              </TabsList>

              {/* ABA 1: DADOS PESSOAIS */}
              <TabsContent value="pessoais" className="space-y-3 pt-3">
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Nome Completo</span><span className="font-semibold text-slate-900">{servidorDetalhes.nome_completo}</span></div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Matrícula</span><span className="font-semibold text-slate-900">{servidorDetalhes.matricula}</span></div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Cód. Servidor</span><span className="font-semibold text-slate-900">{servidorDetalhes.cod_servidor || '—'}</span></div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">CPF</span><span className="font-semibold text-slate-900">{servidorDetalhes.cpf || '—'}</span></div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Data de Nascimento</span><span className="font-semibold text-slate-900">{servidorDetalhes.data_nascimento ? new Date(servidorDetalhes.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span></div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Gênero</span><span className="font-semibold text-slate-900 capitalize">{servidorDetalhes.genero || '—'}</span></div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Estado Civil</span><span className="font-semibold text-slate-900 capitalize">{servidorDetalhes.estado_civil || '—'}</span></div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Grau de Instrução</span><span className="font-semibold text-slate-900">{servidorDetalhes.escolaridade || '—'}</span></div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Naturalidade</span><span className="font-semibold text-slate-900">{servidorDetalhes.naturalidade || '—'}</span></div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Mês Aniversário</span><span className="font-semibold text-slate-900">{servidorDetalhes.mes_aniversario || '—'}</span></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Nome do Pai</span><span className="font-semibold text-slate-900">{servidorDetalhes.nome_pai || '—'}</span></div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Nome da Mãe</span><span className="font-semibold text-slate-900">{servidorDetalhes.nome_mae || '—'}</span></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Cônjuge</span><span className="font-semibold text-slate-900">{servidorDetalhes.nome_conjuge || '—'}</span></div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Contato de Emergência</span><span className="font-semibold text-slate-900">{servidorDetalhes.contato_emergencia_nome || '—'} {servidorDetalhes.contato_emergencia_telefone ? `(${servidorDetalhes.contato_emergencia_telefone})` : ''}</span></div>
                  </div>
                </div>
              </TabsContent>

              {/* ABA 2: DOCUMENTOS */}
              <TabsContent value="documentos" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">RG (Número)</span><span className="font-semibold text-slate-900">{servidorDetalhes.rg_numero || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">RG Órgão</span><span className="font-semibold text-slate-900">{servidorDetalhes.rg_orgao || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">RG Emissão</span><span className="font-semibold text-slate-900">{servidorDetalhes.rg_emissao ? new Date(servidorDetalhes.rg_emissao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">PIS / PASEP</span><span className="font-semibold text-slate-900">{servidorDetalhes.pis_pasep || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Data PIS / PASEP</span><span className="font-semibold text-slate-900">{servidorDetalhes.data_pis_pasep ? new Date(servidorDetalhes.data_pis_pasep + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">CTPS (Número/Série/UF)</span><span className="font-semibold text-slate-900">{[servidorDetalhes.ctps_numero, servidorDetalhes.ctps_serie, servidorDetalhes.ctps_uf].filter(Boolean).join(' - ') || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Título de Eleitor</span><span className="font-semibold text-slate-900">{servidorDetalhes.titulo_eleitor || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Zona / Seção</span><span className="font-semibold text-slate-900">{servidorDetalhes.titulo_zona ? `Zona: ${servidorDetalhes.titulo_zona}` : ''} {servidorDetalhes.titulo_secao ? `Seção: ${servidorDetalhes.titulo_secao}` : ''} {!servidorDetalhes.titulo_zona && !servidorDetalhes.titulo_secao ? '—' : ''}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Certificado Reservista</span><span className="font-semibold text-slate-900">{servidorDetalhes.reservista || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">CNH / Categoria</span><span className="font-semibold text-slate-900">{servidorDetalhes.cnh_numero ? `${servidorDetalhes.cnh_numero} (${servidorDetalhes.cnh_categoria || 'S/Cat'})` : '—'}</span></div>
                </div>
              </TabsContent>

              {/* ABA 3: CONTATO & ENDEREÇO */}
              <TabsContent value="endereco" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">E-mail</span><span className="font-semibold text-slate-900">{servidorDetalhes.email || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Telefone Fixo</span><span className="font-semibold text-slate-900">{servidorDetalhes.telefone || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Celular / WhatsApp</span><span className="font-semibold text-slate-900">{servidorDetalhes.celular || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 col-span-2"><span className="text-slate-400 block text-[10px] uppercase font-bold">Logradouro / Endereço</span><span className="font-semibold text-slate-900">{servidorDetalhes.endereco || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">CEP</span><span className="font-semibold text-slate-900">{servidorDetalhes.cep || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Bairro</span><span className="font-semibold text-slate-900">{servidorDetalhes.bairro || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Cidade</span><span className="font-semibold text-slate-900">{servidorDetalhes.cidade || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Estado (UF)</span><span className="font-semibold text-slate-900">{servidorDetalhes.uf || '—'}</span></div>
                </div>
              </TabsContent>

              {/* ABA 4: VÍNCULO & CARGO */}
              <TabsContent value="vinculo" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Cargo</span><span className="font-semibold text-slate-900">{servidorDetalhes.cargo || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Função</span><span className="font-semibold text-slate-900">{servidorDetalhes.funcao || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Lotação</span><span className="font-semibold text-slate-900">{servidorDetalhes.lotacao || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Secretaria</span><span className="font-semibold text-slate-900">{servidorDetalhes.secretaria || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Cód. Setor / Setor</span><span className="font-semibold text-slate-900">{servidorDetalhes.cod_setor ? `[${servidorDetalhes.cod_setor}] ${servidorDetalhes.setor_nome || ''}` : servidorDetalhes.setor_nome || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Data de Admissão</span><span className="font-semibold text-slate-900">{servidorDetalhes.data_admissao ? new Date(servidorDetalhes.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Data Base</span><span className="font-semibold text-slate-900">{servidorDetalhes.data_base ? new Date(servidorDetalhes.data_base + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Carga Horária</span><span className="font-semibold text-slate-900">{servidorDetalhes.carga_horaria ? `${servidorDetalhes.carga_horaria}h semanais` : '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Período Contrato</span><span className="font-semibold text-slate-900">{servidorDetalhes.inicio_contrato ? new Date(servidorDetalhes.inicio_contrato + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} até {servidorDetalhes.final_contrato ? new Date(servidorDetalhes.final_contrato + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Vínculo</span><span className="font-semibold text-slate-900">{servidorDetalhes.vinculo || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Tipo de Admissão</span><span className="font-semibold text-slate-900">{servidorDetalhes.tipo_admissao || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Tipo Previdência</span><span className="font-semibold text-slate-900">{servidorDetalhes.tipo_previdencia || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Natureza do Vínculo</span><span className="font-semibold text-slate-900">{servidorDetalhes.natureza_vinculo || '—'}</span></div>
                </div>
              </TabsContent>

              {/* ABA 5: ATOS */}
              <TabsContent value="atos" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Núm. Expediente</span><span className="font-semibold text-slate-900">{servidorDetalhes.num_expediente || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Data Expediente</span><span className="font-semibold text-slate-900">{servidorDetalhes.data_expediente ? new Date(servidorDetalhes.data_expediente + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Núm. Amparo Legal</span><span className="font-semibold text-slate-900">{servidorDetalhes.num_amparo || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Data Amparo Legal</span><span className="font-semibold text-slate-900">{servidorDetalhes.data_amparo ? new Date(servidorDetalhes.data_amparo + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span></div>
                </div>
              </TabsContent>

              {/* ABA 6: BANCO / SALÁRIO */}
              <TabsContent value="banco" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Cód. Banco / Banco</span><span className="font-semibold text-slate-900">{servidorDetalhes.banco_codigo ? `[${servidorDetalhes.banco_codigo}] ${servidorDetalhes.banco || ''}` : servidorDetalhes.banco || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Agência</span><span className="font-semibold text-slate-900">{servidorDetalhes.agencia ? `${servidorDetalhes.agencia}${servidorDetalhes.agencia_dv ? '-' + servidorDetalhes.agencia_dv : ''}` : '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Conta Bancária</span><span className="font-semibold text-slate-900">{servidorDetalhes.conta ? `${servidorDetalhes.conta}${servidorDetalhes.conta_dv ? '-' + servidorDetalhes.conta_dv : ''}` : '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Operação</span><span className="font-semibold text-slate-900">{servidorDetalhes.banco_operacao || '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Salário Base</span><span className="font-bold text-emerald-700">{servidorDetalhes.salario_base !== null && servidorDetalhes.salario_base !== undefined ? `R$ ${Number(servidorDetalhes.salario_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</span></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80"><span className="text-slate-400 block text-[10px] uppercase font-bold">Salário Família</span><span className="font-bold text-slate-900">{servidorDetalhes.salario_familia !== null && servidorDetalhes.salario_familia !== undefined ? `R$ ${Number(servidorDetalhes.salario_familia).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</span></div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </ResponsiveDialog>
      {confirmDialog}
    </AdminLayout>
  );
};

export default RecursosHumanosPage;
