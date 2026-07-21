export type GuardaFrotaStatus =
  | 'DISPONIVEL'
  | 'EM_SERVICO'
  | 'EM_MANUTENCAO'
  | 'INDISPONIVEL'
  | 'RESERVADO'
  | 'INATIVO';

export type GuardaFrotaManutencaoTipo =
  | 'PREVENTIVA'
  | 'CORRETIVA'
  | 'REVISAO'
  | 'TROCA_OLEO'
  | 'PNEUS'
  | 'ELETRICA'
  | 'MECANICA'
  | 'FUNILARIA'
  | 'OUTRA';

export type GuardaFrotaCategoria = {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  created_at?: string;
  updated_at?: string;
};

export type GuardaFrotaVeiculo = {
  id: string;
  setor_id: string;
  demutran_veiculo_id: string | null;
  prefixo: string;
  placa: string;
  renavam: string | null;
  chassi: string | null;
  patrimonio: string | null;
  identificacao_interna: string | null;
  marca: string | null;
  modelo: string | null;
  versao: string | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
  cor: string | null;
  combustivel: string | null;
  categoria_id: string | null;
  tipo_uso: string[];
  vinculos: string[];
  grupamento: string | null;
  status: GuardaFrotaStatus;
  quilometragem_atual: number;
  foto_principal_url: string | null;
  observacoes: string | null;
  motivo_inativacao: string | null;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  categoria?: Pick<GuardaFrotaCategoria, 'id' | 'nome'> | null;
  demutran_veiculo?: {
    id: string;
    placa: string;
    chassi: string;
    marca: string | null;
    modelo: string | null;
    cor: string | null;
    ano: string | null;
    tipo: string | null;
    secretaria_responsavel: string;
  } | null;
};

export type GuardaFrotaHistorico = {
  id: string;
  veiculo_id: string;
  usuario_id: string | null;
  acao: string;
  descricao: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type GuardaFrotaIndisponibilidade = {
  id: string;
  veiculo_id: string;
  inicio: string;
  fim_previsto: string | null;
  motivo: string;
  descricao: string | null;
  encerrado_em: string | null;
  created_at: string;
};

export type GuardaFrotaManutencao = {
  id: string;
  veiculo_id: string;
  tipo: GuardaFrotaManutencaoTipo;
  data_entrada: string;
  data_prevista_saida: string | null;
  data_conclusao: string | null;
  descricao_problema: string;
  servico_realizado: string | null;
  oficina: string | null;
  valor: number | null;
  quilometragem: number | null;
  observacoes: string | null;
  created_at: string;
};

export type GuardaFrotaDocumento = {
  id: string;
  veiculo_id: string;
  nome: string;
  tipo: string;
  arquivo_url: string;
  data_emissao: string | null;
  data_validade: string | null;
  observacao: string | null;
  created_at: string;
};

export type GuardaFrotaVeiculoPayload = {
  demutran_veiculo_id?: string | null;
  prefixo: string;
  placa: string;
  renavam?: string | null;
  chassi?: string | null;
  patrimonio?: string | null;
  identificacao_interna?: string | null;
  marca?: string | null;
  modelo?: string | null;
  versao?: string | null;
  ano_fabricacao?: number | null;
  ano_modelo?: number | null;
  cor?: string | null;
  combustivel?: string | null;
  categoria_id?: string | null;
  tipo_uso?: string[];
  vinculos?: string[];
  grupamento?: string | null;
  status?: GuardaFrotaStatus;
  quilometragem_atual?: number;
  foto_principal_url?: string | null;
  observacoes?: string | null;
  motivo_inativacao?: string | null;
  ativo?: boolean;
};
