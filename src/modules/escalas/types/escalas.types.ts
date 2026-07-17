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

export type GuardaEscalaCiencia = {
  id: string;
  escala_id: string;
  guarda_id: string;
  visualizado_em: string | null;
  confirmado_em: string | null;
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
  status: EscalaStatus;
  recorrencia_tipo: RecorrenciaTipo;
  recorrencia_config: Record<string, unknown>;
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
