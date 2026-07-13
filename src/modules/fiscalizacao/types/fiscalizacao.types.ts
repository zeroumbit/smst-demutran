export type FiscalizacaoGravidade = 'leve' | 'media' | 'grave' | 'gravissima' | 'nao_aplicavel';

export interface FiscalizacaoInfracao {
  id: string;
  codigo: string;
  tipificacao_resumida: string;
  amparo_legal: string;
  tipificacao_completa: string;
  gravidade: FiscalizacaoGravidade;
  penalidade: string;
  medida_administrativa: string | null;
  infrator: string;
  competencia: string | null;
  pontuacao: number;
  quando_autuar: string | null;
  quando_nao_autuar: string | null;
  definicoes_procedimentos: string | null;
  exemplos_observacoes: string | null;
  informacoes_complementares: string | null;
  pode_configurar_crime: boolean;
  constatacao: string | null;
  categoria: string | null;
  capitulo: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FiscalizacaoCategoria {
  id: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at?: string;
  total_infracoes?: number;
}

export type FiltroPontuacao = 'todas' | 'nao_computavel' | '1_3' | '4_5' | '6_7';

export interface FiltroInfracao {
  busca: string;
  gravidade: FiscalizacaoGravidade[];
  categoria: string | null;
  pontuacao: FiltroPontuacao;
  crimeTransito: 'todos' | 'sim' | 'nao';
  page: number;
  limit: number;
}

export interface FiscalizacaoSearchResult {
  data: FiscalizacaoInfracao[];
  total: number;
}

export interface FiscalizacaoSugestao {
  codigo: string;
  descricao: string;
}
