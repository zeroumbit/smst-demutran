export type FalaPrioridade = 'baixa' | 'media' | 'alta' | 'urgente';

export type FalaStatus = 'recebido' | 'analise' | 'execucao' | 'concluido' | 'arquivado' | 'transferido';

export interface FalaSecretaria {
  id: string;
  nome: string;
  sigla: string;
  descricao: string | null;
  ativo: boolean;
}

export interface FalaAssunto {
  id: string;
  secretaria_id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
}

export interface FalaDemandaPublica {
  id: string;
  protocolo: string;
  secretaria_nome: string;
  assunto_nome: string | null;
  descricao: string;
  endereco: string;
  bairro: string | null;
  prioridade: FalaPrioridade;
  status: FalaStatus;
  resposta_cidadao: string | null;
  data_abertura: string;
  data_conclusao: string | null;
}

export interface FalaDemandaAdmin {
  id: string;
  protocolo: string;
  nome_cidadao: string;
  cpf: string;
  email: string | null;
  telefone: string | null;
  descricao: string;
  endereco: string;
  bairro: string | null;
  ponto_referencia: string | null;
  prioridade: FalaPrioridade;
  status: FalaStatus;
  resposta_cidadao: string | null;
  observacao_interna: string | null;
  secretaria_id: string;
  secretaria_atual_id: string;
  assunto_id: string | null;
  assunto_outro: string | null;
  data_abertura: string;
  data_conclusao: string | null;
  avaliacao: number | null;
  avaliacao_comentario: string | null;
  created_at: string;
  updated_at: string;
}

export interface FalaHistoricoStatus {
  id: string;
  demanda_id: string;
  status_anterior: FalaStatus | null;
  status_novo: FalaStatus;
  observacao: string | null;
  resposta_publica: string | null;
  usuario_id: string | null;
  created_at: string;
}

export interface FalaTransferencia {
  id: string;
  demanda_id: string;
  secretaria_origem_id: string;
  secretaria_destino_id: string;
  justificativa: string;
  usuario_id: string | null;
  created_at: string;
}

export interface FalaDemandaFormData {
  cpf: string;
  nome_cidadao: string;
  email: string;
  telefone: string;
  secretaria_id: string;
  assunto_id: string;
  assunto_outro: string;
  descricao: string;
  endereco: string;
  bairro: string;
  ponto_referencia: string;
  prioridade: FalaPrioridade;
}

export interface FalaExternalUser {
  id: string;
  nome_completo: string;
  email: string | null;
  telefone: string | null;
  tipo: string;
  cpf: string;
}

