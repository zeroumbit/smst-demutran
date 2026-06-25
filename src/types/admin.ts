export type PapelUsuario = 'super_admin' | 'gestor' | 'admin_setor' | 'tecnico';

export type ModuloSistema =
  | 'veiculos'
  | 'concessionarios'
  | 'credenciais'
  | 'recursos'
  | 'frota'
  | 'documentos'
  | 'midias';

export const MODULOS_DEMUTRAN: { value: ModuloSistema; label: string }[] = [
  { value: 'veiculos', label: 'Veículos' },
  { value: 'concessionarios', label: 'Concessionários' },
  { value: 'credenciais', label: 'Credenciais' },
  { value: 'recursos', label: 'Recursos' },
  { value: 'frota', label: 'Frota Municipal' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'midias', label: 'Mídias' },
];

export interface AdminProfile {
  user_id: string;
  email: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  papel: PapelUsuario | null;
  perfil_id: string | null;
  setor_id: string | null;
  setor_nome: string | null;
  setor_slug: string | null;
  ativo: boolean;
  legacy_admin: boolean;
  modulos?: ModuloSistema[];
}

export interface Setor {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  ativo: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminProfileRow {
  perfil_id: string;
  user_id: string;
  email: string;
  nome: string;
  sobrenome?: string | null;
  nome_completo?: string | null;
  setor_id: string | null;
  setor_nome: string | null;
  setor_slug: string | null;
  papel: PapelUsuario;
  ativo: boolean;
  modulos?: string[] | null;
  created_at?: string | null;
}

export interface VeiculoRecolhido {
  id: string;
  setor_id: string;
  placa: string;
  chassi: string | null;
  descricao_veiculo: string;
  ano: string | null;
  cor: string | null;
  modelo: string | null;
  municipio: string | null;
  proprietario_nome: string;
  proprietario_cpf_cnpj: string | null;
  infrator_nome: string | null;
  bairro_apreensao: string | null;
  logradouro: string | null;
  data_recolhimento: string;
  data_liberacao: string | null;
  motivo: string;
  status: 'recolhido' | 'liberado';
  situacao: string;
  local_custodia: 'automoveis' | 'motos' | 'motos_delegacia' | 'veiculos_forum';
  numero_liberacao: string | null;
  taxa_diaria?: number | null;
  importado_planilha?: boolean;
  liberacao_registrada_no_sistema?: boolean;
  liberado_por?: string | null;
  protocolo: string;
  observacao: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DemutranVeiculoMunicipal {
  id: string;
  setor_id: string;
  placa: string;
  chassi: string;
  secretaria_responsavel: string;
  motorista_responsavel: string | null;
  observacao: string | null;
  ativo: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DemutranConcessionario {
  id: string;
  setor_id: string;
  categoria: 'mototaxi' | 'taxi' | 'carro_horario' | 'fretista';
  origem_planilha: string | null;
  taxi_grupo: string | null;
  estacionamento: string | null;
  ponto_referencia: string | null;
  numero_vaga: string | null;
  titular_nome: string | null;
  endereco: string | null;
  veiculo: string | null;
  placa: string | null;
  fabricacao: string | null;
  ultimo_alvara: string | null;
  exercicio: string | null;
  cpf: string | null;
  inicio_atividade: string | null;
  cnh_numero: string | null;
  validade_cnh: string | null;
  atividade_remunerada: string | null;
  curso: string | null;
  motorista_auxiliar: string | null;
  cnh_auxiliar: string | null;
  validade_cnh_auxiliar: string | null;
  categoria_cnh: string | null;
  rota: string | null;
  observacoes: string | null;
  email_notificacao: string | null;
  telefone_notificacao: string | null;
  aceita_notificacoes: boolean;
  importado_planilha: boolean;
  ativo: boolean;
  concessao_arquivo_url: string | null;
  concessao_arquivo_nome: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DemutranConcessionarioNotificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  created_at: string;
  lida_em: string | null;
}

export interface AdminNotification {
  id: string;
  user_id: string;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  link: string | null;
  created_at: string;
  lida_em: string | null;
}

export type DemutranSolicitacaoStatus =
  | 'pendente'
  | 'em_analise'
  | 'aprovado'
  | 'rejeitado'
  | 'concluido';

export interface DemutranCredencialSolicitacao {
  id: string;
  setor_id: string;
  protocolo: string;
  tipo: 'idoso' | 'pcd';
  nome_completo: string;
  cpf: string;
  rg: string;
  email: string | null;
  telefone: string | null;
  logradouro: string;
  numero: string;
  bairro: string;
  complemento: string | null;
  endereco: string | null;
  observacao: string | null;
  documento_identidade_url: string | null;
  comprovante_residencia_url: string | null;
  laudo_medico_url: string | null;
  status: DemutranSolicitacaoStatus;
  analisado_por: string | null;
  analisado_em: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DemutranMidia {
  id: string;
  setor_id: string;
  titulo: string;
  tipo: 'texto' | 'video';
  descricao: string;
  arquivo_url: string | null;
  video_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface DemutranRecurso {
  id: string;
  setor_id: string;
  protocolo: string;
  tipo: 'defesa_previa' | 'jari';
  nome_completo: string;
  cpf: string;
  email: string | null;
  telefone: string | null;
  placa: string | null;
  auto_infracao: string;
  defesa_documento_url: string;
  observacao: string | null;
  status: DemutranSolicitacaoStatus;
  analisado_por: string | null;
  analisado_em: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type PixChaveTipo = 'email' | 'cpf' | 'cnpj' | 'aleatoria';

export interface ConfiguracaoPagamentoPixManual {
  chave_tipo: PixChaveTipo;
  chave_valor: string;
  qrcode_ativo: boolean;
  qrcode_url: string | null;
  favorecido: string;
  telefone: string;
}

export interface Configuracao {
  id: string;
  grupo: string;
  tipo: string;
  config: Record<string, unknown>;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}
