export type JgcPerfil = 'gestor' | 'administrativo' | 'professor' | 'multiprofissional';
export type JgcPrivacidade = 'compartilhado' | 'restrito' | 'sigiloso';

export interface JgcAluno {
  id: string;
  matricula: string;
  nome_completo: string;
  data_nascimento: string;
  cpf: string | null;
  nis: string | null;
  naturalidade_cidade: string | null;
  naturalidade_uf: string | null;
  data_entrada: string;
  serie_ano: string | null;
  escola_nome: string | null;
  turno_escola: string | null;
  turma_id: string | null;
  projeto_hora_inicio: string | null;
  projeto_hora_fim: string | null;
  situacao: 'ativo' | 'afastado' | 'desligado' | 'concluido';
  saude?: {
    tipo_sanguineo: string;
    possui_condicao: 'sim' | 'nao' | 'nao_informado';
    condicao_saude: string | null;
    usa_medicamento: 'sim' | 'nao' | 'nao_informado';
    medicamentos: string | null;
    orientacao_medicamento: string | null;
  } | null;
  turma?: { nome: string } | null;
}

export interface JgcTurma {
  id: string;
  nome: string;
  descricao: string | null;
  turno: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  status: 'ativa' | 'inativa' | 'concluida';
}

export interface JgcAtendimento {
  id: string;
  aluno_id: string;
  data: string;
  area_profissional: string;
  tipo: string;
  motivo: string;
  relato: string;
  privacidade: JgcPrivacidade;
  necessita_retorno: boolean;
  retorno_data: string | null;
  aluno?: { nome_completo: string; matricula: string } | null;
}
