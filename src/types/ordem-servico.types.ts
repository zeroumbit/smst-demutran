export type OrdemServicoStatus = 'RASCUNHO' | 'PUBLICADA' | 'SUBSTITUIDA' | 'CANCELADA' | 'ARQUIVADA';

export type OrdemServicoOrigem =
  | 'Ofício'
  | 'Memorando'
  | 'Processo Administrativo'
  | 'Comunicação Interna (CI)'
  | 'E-mail'
  | 'WhatsApp'
  | 'Solicitação Verbal'
  | 'Determinação Superior'
  | 'Outro';

export interface OrdemServicoEquipeInfo {
  equipe_id: string;
  equipe_nome: string;
  lider_nome?: string | null;
  primeira_visualizacao_em?: string | null;
  ultima_visualizacao_em?: string | null;
  baixada_em?: string | null;
  impressa_em?: string | null;
}

export interface OrdemServico {
  id: string;
  setor_id?: string | null;
  setor_slug?: string | null;
  numero?: number | null;
  ano: number;
  numero_formatado?: string | null;
  versao: number;
  origem: string;
  origem_outros?: string | null;
  numero_documento_origem?: string | null;
  assunto: string;
  data_emissao: string;
  data_execucao_inicio: string;
  data_execucao_fim?: string | null;
  hora_inicio: string;
  hora_fim?: string | null;
  ate_termino: boolean;
  descricao: string;
  local_execucao: string;
  ponto_apresentacao?: string | null;
  observacoes?: string | null;
  solicitante_nome?: string | null;
  solicitante_orgao?: string | null;
  solicitante_funcao?: string | null;
  solicitante_telefone?: string | null;
  solicitante_whatsapp?: string | null;
  solicitante_email?: string | null;
  status: OrdemServicoStatus;
  publicado_em?: string | null;
  cancelado_em?: string | null;
  motivo_cancelamento?: string | null;
  created_at: string;
  equipes?: OrdemServicoEquipeInfo[];
}

export interface OrdemServicoFormData {
  id?: string;
  origem: string;
  origem_outros?: string;
  numero_documento_origem?: string;
  assunto: string;
  data_execucao_inicio: string;
  data_execucao_fim?: string;
  hora_inicio: string;
  hora_fim?: string;
  ate_termino: boolean;
  descricao: string;
  local_execucao: string;
  ponto_apresentacao?: string;
  observacoes?: string;
  solicitante_nome?: string;
  solicitante_orgao?: string;
  solicitante_funcao?: string;
  solicitante_telefone?: string;
  solicitante_whatsapp?: string;
  solicitante_email?: string;
  equipes_ids: string[];
}
