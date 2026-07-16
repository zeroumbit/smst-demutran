export type GuardaEquipe = {
  id: string;
  setor_id: string;
  nome: string;
  descricao: string | null;
  responsavel_guarda_id: string | null;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  responsavel?: GuardaEquipeGuarda | null;
  membros?: GuardaEquipeMembro[];
  total_membros?: number;
};

export type GuardaEquipeGuarda = {
  id: string;
  matricula: string;
  nome: string;
  ativo: boolean;
  graduacao_id?: string | null;
  graduacao_nome?: string | null;
};

export type GuardaEquipeMembro = {
  id: string;
  equipe_id: string;
  guarda_id: string;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  removed_by: string | null;
  removed_at: string | null;
  motivo_remocao: string | null;
  guarda?: GuardaEquipeGuarda | null;
};

export type GuardaEquipeHistorico = {
  id: string;
  equipe_id: string | null;
  guarda_id: string | null;
  usuario_id: string | null;
  acao: string;
  descricao: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type GuardaEquipePayload = {
  nome: string;
  descricao?: string | null;
  responsavel_guarda_id?: string | null;
  ativo?: boolean;
};

export type GuardaEquipeAddResult = {
  sucesso: boolean;
  codigo: string;
  mensagem: string;
  equipe_atual_id?: string;
  equipe_atual_nome?: string;
};
