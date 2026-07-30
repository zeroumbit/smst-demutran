export type EscalaStatus = 'RASCUNHO' | 'PUBLICADA' | 'CANCELADA';
export type EscalaStatusCalculado = EscalaStatus | 'EM_ANDAMENTO' | 'CONCLUIDA';
export type TrocaTipo = 'TROCA' | 'SUBSTITUICAO';
export type TrocaStatus =
  | 'AGUARDANDO_ACEITE'
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADA'
  | 'RECUSADA_PELO_GUARDA'
  | 'REJEITADA_PELA_ADMINISTRACAO'
  | 'CANCELADA'
  | 'EXPIRADA';
export type RecorrenciaTipo = 'NAO_REPETIR' | 'DIARIA' | 'SEMANAL' | 'DIAS_SEMANA' | 'CICLO_HORAS' | 'PERSONALIZADO';

export type GuardaEscalaTipoServico = {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  ativo: boolean;
  ordem: number;
};

export type GuardaEscalaPosto = {
  id: string;
  nome: string;
  descricao: string | null;
  endereco: string | null;
  bairro: string | null;
  ponto_referencia: string | null;
  latitude: number | null;
  longitude: number | null;
  ativo: boolean;
};

export type GuardaEscalaGuarda = {
  id: string;
  matricula: string;
  nome: string;
  ativo: boolean;
  graduacao_id?: string | null;
  graduacao_nome?: string | null;
};

export type GuardaEscalaAgente = {
  id: string;
  escala_id: string;
  guarda_id: string;
  funcao: string;
  observacao: string | null;
  conflito_autorizado: boolean;
  motivo_conflito: string | null;
  guarda?: GuardaEscalaGuarda | null;
};

export type GuardaEscalaViatura = {
  id: string;
  escala_id: string;
  veiculo_id: string | null;
  agente_id: string | null;
  observacao: string | null;
  veiculo?: {
    id: string;
    prefixo: string;
    placa: string;
    modelo: string | null;
    marca: string | null;
    status: string;
  } | null;
};

export type CienciaStatus = 'PENDENTE_CIENCIA' | 'CIENTE' | 'ALTERADA_APOS_CIENCIA' | 'CIENTE_ALTERACAO';

export type GuardaEscalaCiencia = {
  id: string;
  escala_id: string;
  guarda_id: string;
  visualizado_em: string | null;
  confirmado_em: string | null;
  escala_versao?: number;
  status_ciencia?: CienciaStatus;
};

export type GuardaEscalaVersao = {
  id: string;
  escala_id: string;
  versao: number;
  titulo: string;
  data_inicio: string;
  data_fim: string;
  posto_texto: string | null;
  tipo_servico_nome: string | null;
  equipe_nome: string | null;
  grupamento: string | null;
  ponto_apresentacao: string | null;
  observacoes: string | null;
  agentes_snapshot: Array<{ id: string; nome: string; funcao: string }>;
  viaturas_snapshot: Array<{ veiculo: string; agente?: string }>;
  created_at: string;
};

export type GuardaEscala = {
  id: string;
  setor_id: string;
  titulo: string;
  tipo_servico_id: string | null;
  descricao: string | null;
  observacoes: string | null;
  data_inicio: string;
  data_fim: string;
  posto_id: string | null;
  local_texto: string | null;
  ponto_apresentacao: string | null;
  area_atuacao: string | null;
  equipe_id: string | null;
  grupamento: string | null;
  versao?: number;
  status: EscalaStatus;
  recorrencia_tipo: RecorrenciaTipo;
  recorrencia_config: Record<string, unknown>;
  recorrencia_origem_id?: string | null;
  publicado_em: string | null;
  cancelado_em: string | null;
  motivo_cancelamento: string | null;
  created_at: string;
  updated_at: string;
  tipo_servico?: Pick<GuardaEscalaTipoServico, 'id' | 'nome' | 'cor'> | null;
  posto?: Pick<GuardaEscalaPosto, 'id' | 'nome' | 'bairro'> | null;
  equipe?: { id: string; nome: string } | null;
  agentes?: GuardaEscalaAgente[];
  viaturas?: GuardaEscalaViatura[];
  ciencias?: GuardaEscalaCiencia[];
};

export type GuardaEscalaResumoCienciaAgente = {
  guarda_id: string;
  nome: string;
  matricula: string;
  funcao: string;
  status_ciencia: CienciaStatus;
  confirmado_em: string | null;
  escala_versao: number | null;
};

export type GuardaEscalaResumoCienciaGestor = {
  sucesso: boolean;
  versao_atual: number;
  total_agentes: number;
  cientes: number;
  pendentes: number;
  alteradas_pendentes: number;
  agentes: GuardaEscalaResumoCienciaAgente[];
};

export type GuardaEscalaPayload = {
  titulo: string;
  tipo_servico_id?: string | null;
  descricao?: string | null;
  observacoes?: string | null;
  data_inicio: string;
  data_fim: string;
  posto_id?: string | null;
  local_texto?: string | null;
  ponto_apresentacao?: string | null;
  area_atuacao?: string | null;
  equipe_id?: string | null;
  grupamento?: string | null;
  recorrencia_tipo?: RecorrenciaTipo;
  recorrencia_config?: Record<string, unknown>;
};

export type GuardaEscalaHistorico = {
  id: string;
  escala_id: string | null;
  troca_id: string | null;
  guarda_id: string | null;
  usuario_id: string | null;
  acao: string;
  descricao: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type GuardaEscalaTroca = {
  id: string;
  tipo: TrocaTipo;
  solicitante_guarda_id: string;
  destinatario_guarda_id: string;
  escala_origem_id: string;
  escala_destino_id: string | null;
  status: TrocaStatus;
  motivo_solicitacao: string | null;
  observacao: string | null;
  motivo_recusa: string | null;
  motivo_rejeicao: string | null;
  solicitado_em: string;
  visualizado_em: string | null;
  respondido_em: string | null;
  aprovado_em: string | null;
  cancelado_em: string | null;
  solicitante?: GuardaEscalaGuarda | null;
  destinatario?: GuardaEscalaGuarda | null;
  escala_origem?: GuardaEscala | null;
  escala_destino?: GuardaEscala | null;
};

export type RpcResult = {
  sucesso: boolean;
  mensagem: string;
  [key: string]: unknown;
};

export type GuardaEscalaAgenteDraft = {
  guarda_id: string;
  funcao: string;
  observacao?: string | null;
};

export type GuardaEscalaCompletaPayload = {
  escala: GuardaEscalaPayload;
  agentes: GuardaEscalaAgenteDraft[];
  viatura_id?: string | null;
  publicar?: boolean;
};

export type GuardaSolicitacaoTipo =
  | 'TROCA_SERVICO'
  | 'ESCLARECIMENTO_ESCALA'
  | 'CORRECAO_ESCALA'
  | 'ATUALIZACAO_CADASTRAL'
  | 'PROBLEMA_EQUIPAMENTO'
  | 'SOLICITACAO_ADMINISTRATIVA'
  | 'OUTRO';

export type GuardaSolicitacaoStatus =
  | 'PENDENTE'
  | 'EM_ANALISE'
  | 'AGUARDANDO_INFORMACAO'
  | 'APROVADA'
  | 'RECUSADA'
  | 'CONCLUIDA'
  | 'CANCELADA';

export type GuardaSolicitacaoInteracao = {
  id: string;
  autor_usuario_id: string | null;
  autor_tipo: 'GUARDA' | 'GESTAO' | 'SISTEMA';
  mensagem: string;
  anexos: Array<{ nome: string; url: string }>;
  status_anterior: string | null;
  status_novo: string | null;
  created_at: string;
};

export type GuardaSolicitacao = {
  id: string;
  protocolo: string;
  guarda_id: string;
  guarda_nome?: string;
  tipo: GuardaSolicitacaoTipo;
  assunto: string;
  descricao: string | null;
  escala_id: string | null;
  escala_titulo?: string | null;
  status: GuardaSolicitacaoStatus;
  resposta_gestao?: string | null;
  analisado_em?: string | null;
  created_at: string;
  updated_at: string;
  interacoes?: GuardaSolicitacaoInteracao[];
};

