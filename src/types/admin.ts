export type PapelUsuario = 'super_admin' | 'gestor' | 'admin_setor' | 'tecnico';

export type ModuloSistema =
  | 'veiculos'
  | 'concessionarios'
  | 'credenciais'
  | 'recursos'
  | 'frota'
  | 'documentos'
  | 'midias'
  | 'iros'
  | 'guardas'
  | 'fiscalizacao'
  | 'guarda_frota'
  | 'guarda_equipes'
  | 'guarda_escalas'
  | 'frota_guarda';

export const MODULOS_DEMUTRAN: { value: ModuloSistema; label: string }[] = [
  { value: 'veiculos', label: 'Veículos' },
  { value: 'concessionarios', label: 'Concessionários' },
  { value: 'credenciais', label: 'Credenciais' },
  { value: 'recursos', label: 'Recursos' },
  { value: 'frota', label: 'Frota Municipal' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'midias', label: 'Mídias' },
];

export const MODULOS_GUARDA: { value: ModuloSistema; label: string }[] = [
  { value: 'iros', label: 'IROs' },
  { value: 'guardas', label: 'Guardas' },
  { value: 'guarda_escalas', label: 'Escalas da Guarda' },
  { value: 'guarda_frota', label: 'Frota da Guarda' },
  { value: 'guarda_equipes', label: 'Equipes da Guarda' },
  { value: 'fiscalizacao', label: 'Fiscalização' },
  { value: 'midias', label: 'Mídias' },
];

export const MODULOS_POR_SETOR: Record<string, { value: ModuloSistema; label: string }[]> = {
  demutran: MODULOS_DEMUTRAN,
  'guarda-municipal': MODULOS_GUARDA,
};

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
  graduacao_id?: string | null;
  graduacao_nome?: string | null;
  aceitou_lei_iro_at?: string | null;
  can_manage_guarda_iros?: boolean;
  guarda_setor_id?: string | null;
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

export interface GuardaMunicipalGraduacao {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface GuardaMunicipal {
  id: string;
  matricula: string;
  nome: string;
  cpf?: string | null;
  graduacao_id: string;
  graduacao_nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  ativo: boolean;
  possui_conta?: boolean;
  data_autocadastro?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface GuardaPerfil {
  id: string;
  matricula: string;
  nome: string;
  cpf: string | null;
  graduacao_id: string;
  graduacao_nome: string | null;
  email: string | null;
  telefone: string | null;
}

export interface GuardaUsuarioVinculo {
  id: string;
  guarda_id: string;
  usuario_id: string;
  created_at: string;
}

export type IROTipo =
  | 'patrulhamento_preventivo'
  | 'perturbacao_ordem'
  | 'seguranca_escolar'
  | 'transito'
  | 'apoio_pm'
  | 'protecao_patrimonial'
  | 'mediacao_conflitos'
  | 'outros';

export type IROStatus = 'pendente' | 'em_andamento' | 'concluido';

export interface GuardaMunicipalIRO {
  id: string;
  setor_id: string;
  protocolo: string;
  guarda_id: string | null;
  guarda_nome?: string | null;
  data_ocorrencia: string;
  tipo: IROTipo;
  local: string;
  bairro: string;
  descricao: string;
  medidas_tomadas: string;
  status: IROStatus;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
}

// ---- Módulo IRO v2 (Operational Resources Integration) ----

export interface IROOperacao {
  id: string;
  nome: string;
  descricao: string | null;
  horario_previsto: string;
  data_inicio: string;
  data_fim: string;
  vagas_por_dia: number;
  horas_por_dia: number;
  tempo_solicitacao: 'imediato' | '1h' | '6h' | '8h' | '12h' | '24h' | '48h';
  setor_id: string;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IROCandidatura {
  id: string;
  operacao_id: string;
  usuario_id: string;
  usuario_nome?: string;
  data_operacao: string;
  horas_trabalhadas: number;
  status: 'pendente' | 'confirmado' | 'cancelado' | 'realizado';
  adicionado_manual: boolean;
  observacao: string | null;
  motivo_manual?: string | null;
  gestor_responsavel_id?: string | null;
  created_at: string;
  updated_at: string;
  operacao_nome?: string;
}

export interface IROHoraManual {
  id: string;
  usuario_id: string;
  usuario_nome?: string;
  quantidade_horas: number;
  data_referencia: string;
  justificativa: string | null;
  gestor_id: string | null;
  operacao_id: string | null;
  setor_id: string;
  created_at: string;
  operacao_nome?: string;
}

export interface IROBancoHoras {
  id: string;
  usuario_id: string;
  usuario_nome?: string;
  horas_excedentes: number;
  origem: string | null;
  descricao: string | null;
  created_at: string;
  updated_at: string;
}

export interface IRONotificacao {
  id: string;
  usuario_id: string;
  usuario_nome?: string;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'sucesso' | 'alerta' | 'erro' | 'manual';
  lida: boolean;
  link: string | null;
  created_at: string;
}

export interface IROAuditoriaManual {
  id: string;
  candidatura_id: string;
  gestor_id: string;
  guarda_id: string;
  operacao_id: string;
  motivo: string;
  horas_adicionadas: number;
  data_referencia: string;
  created_at: string;
}

export interface IROValorGraduacao {
  id: string;
  graduacao_id: string;
  graduacao_nome?: string | null;
  valor_hora: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
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
  graduacao_id?: string | null;
  graduacao_nome?: string | null;
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
  marca: string | null;
  fabricacao: string | null;
  ano_fabricacao: string | null;
  ano_modelo: string | null;
  rota: string | null;
  municipio: string | null;
  proprietario_nome: string;
  proprietario_cpf_cnpj: string | null;
  infrator_nome: string | null;
  genero_condutor: 'masculino' | 'feminino' | 'nao_informado' | 'outro' | null;
  bairro_apreensao: string | null;
  logradouro: string | null;
  restricao_legal:
    | 'busca_apreensao'
    | 'restricao_circulacao_penhora'
    | 'restricao_transferencia'
    | 'alienacao_fiduciaria'
    | 'alerta_roubo_furto'
    | 'apropriacao_indebita'
    | 'bloqueio_falta_transferencia'
    | 'restricao_media_grande_monta'
    | 'queixa_duble_clonagem'
    | null;
  envolvimento_acidente: 'nao' | 'sem_vitima' | 'com_vitima' | null;
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
  tipo: string | null;
  ano: string | null;
  modelo: string | null;
  marca: string | null;
  cor: string | null;
  principal_local_atuacao: string | null;
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
  logradouro: string | null;
  numero: string | null;
  bairro_distrito: string | null;
  veiculo: string | null;
  marca: string | null;
  cor: string | null;
  modelo: string | null;
  ano_fabricacao: string | null;
  ano_modelo: string | null;
  chassi: string | null;
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
