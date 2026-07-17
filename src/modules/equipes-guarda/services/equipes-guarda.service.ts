import { supabase } from '@/lib/supabase';
import type {
  GuardaEquipe,
  GuardaEquipeAddResult,
  GuardaEquipeGuarda,
  GuardaEquipeHistorico,
  GuardaEquipeMembro,
  GuardaEquipePayload,
} from '../types/equipes-guarda.types';

type GuardaRow = {
  id: string;
  matricula: string;
  nome: string;
  ativo: boolean;
  graduacao_id: string | null;
  guarda_municipal_graduacoes?: { nome: string | null } | { nome: string | null }[] | null;
};

const getGraduacaoNome = (row: GuardaRow) => {
  const graduacao = row.guarda_municipal_graduacoes;
  return Array.isArray(graduacao) ? graduacao[0]?.nome ?? null : graduacao?.nome ?? null;
};

const normalizeGuarda = (row: GuardaRow): GuardaEquipeGuarda => ({
  id: row.id,
  matricula: row.matricula,
  nome: row.nome,
  ativo: row.ativo,
  graduacao_id: row.graduacao_id,
  graduacao_nome: getGraduacaoNome(row),
});

const cleanPayload = (payload: GuardaEquipePayload) => ({
  nome: payload.nome.trim(),
  descricao: payload.descricao?.trim() || null,
  responsavel_guarda_id: payload.responsavel_guarda_id || null,
  ativo: payload.ativo ?? true,
});

export const equipesGuardaService = {
  async listGuardas() {
    const { data, error } = await supabase
      .from('guardas_municipais')
      .select('id, matricula, nome, ativo, graduacao_id, guarda_municipal_graduacoes(nome)')
      .eq('ativo', true)
      .order('nome');

    if (error) throw error;
    return ((data || []) as GuardaRow[]).map(normalizeGuarda);
  },

  async listEquipes() {
    const [{ data: equipes, error: equipesError }, { data: guardas, error: guardasError }, { data: membros, error: membrosError }] =
      await Promise.all([
        supabase.from('guarda_equipes').select('*').order('nome'),
        supabase
          .from('guardas_municipais')
          .select('id, matricula, nome, ativo, graduacao_id, guarda_municipal_graduacoes(nome)')
          .order('nome'),
        supabase.from('guarda_equipe_membros').select('*').eq('ativo', true).order('created_at'),
      ]);

    if (equipesError) throw equipesError;
    if (guardasError) throw guardasError;
    if (membrosError) throw membrosError;

    const guardasMap = new Map(((guardas || []) as GuardaRow[]).map((guarda) => [guarda.id, normalizeGuarda(guarda)]));
    const membrosByEquipe = new Map<string, GuardaEquipeMembro[]>();

    for (const membro of (membros || []) as GuardaEquipeMembro[]) {
      const enriched = { ...membro, guarda: guardasMap.get(membro.guarda_id) ?? null };
      const current = membrosByEquipe.get(membro.equipe_id) ?? [];
      current.push(enriched);
      membrosByEquipe.set(membro.equipe_id, current);
    }

    return ((equipes || []) as GuardaEquipe[]).map((equipe) => {
      const equipeMembros = membrosByEquipe.get(equipe.id) ?? [];
      return {
        ...equipe,
        responsavel: equipe.responsavel_guarda_id ? guardasMap.get(equipe.responsavel_guarda_id) ?? null : null,
        membros: equipeMembros,
        total_membros: equipeMembros.length,
      };
    });
  },

  async createEquipe(payload: GuardaEquipePayload) {
    const userId = (await supabase.auth.getUser()).data.user?.id || null;
    const { data, error } = await supabase
      .from('guarda_equipes')
      .insert([{ ...cleanPayload(payload), created_by: userId }])
      .select('*')
      .single();

    if (error) throw error;
    return data as GuardaEquipe;
  },

  async updateEquipe(id: string, payload: GuardaEquipePayload) {
    const { data, error } = await supabase
      .from('guarda_equipes')
      .update(cleanPayload(payload))
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as GuardaEquipe;
  },

  async addMembro(equipeId: string, guardaId: string, transferir = false) {
    const { data, error } = await supabase.rpc('adicionar_guarda_equipe', {
      p_equipe_id: equipeId,
      p_guarda_id: guardaId,
      p_transferir: transferir,
    });

    if (error) throw error;
    return data as GuardaEquipeAddResult;
  },

  async removeMembro(equipeId: string, guardaId: string) {
    const { data, error } = await supabase.rpc('remover_guarda_equipe', {
      p_equipe_id: equipeId,
      p_guarda_id: guardaId,
    });

    if (error) throw error;
    return data as GuardaEquipeAddResult;
  },

  async listHistorico(equipeId: string) {
    const { data, error } = await supabase
      .from('guarda_equipes_historico')
      .select('*')
      .eq('equipe_id', equipeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as GuardaEquipeHistorico[];
  },
};
