import { supabase } from '@/lib/supabase';
import type {
  GuardaEscala,
  GuardaEscalaAgente,
  GuardaEscalaGuarda,
  GuardaEscalaHistorico,
  GuardaEscalaPayload,
  GuardaEscalaPosto,
  GuardaEscalaTipoServico,
  GuardaEscalaTroca,
  GuardaEscalaViatura,
  RpcResult,
  TrocaTipo,
} from '../types/escalas.types';

type GuardaRow = {
  id: string;
  matricula: string;
  nome: string;
  ativo: boolean;
  graduacao_id: string | null;
  guarda_municipal_graduacoes?: { nome: string | null } | { nome: string | null }[] | null;
};

const escalaSelect = `
  *,
  tipo_servico:guarda_tipos_servico(id,nome,cor),
  posto:guarda_postos_servico(id,nome,bairro),
  equipe:guarda_equipes(id,nome)
`;

const getGraduacaoNome = (row: GuardaRow) => {
  const value = row.guarda_municipal_graduacoes;
  return Array.isArray(value) ? value[0]?.nome ?? null : value?.nome ?? null;
};

const normalizeGuarda = (row: GuardaRow): GuardaEscalaGuarda => ({
  id: row.id,
  matricula: row.matricula,
  nome: row.nome,
  ativo: row.ativo,
  graduacao_id: row.graduacao_id,
  graduacao_nome: getGraduacaoNome(row),
});

const cleanEscalaPayload = (payload: GuardaEscalaPayload) => ({
  titulo: payload.titulo.trim(),
  tipo_servico_id: payload.tipo_servico_id || null,
  descricao: payload.descricao?.trim() || null,
  observacoes: payload.observacoes?.trim() || null,
  data_inicio: payload.data_inicio,
  data_fim: payload.data_fim,
  posto_id: payload.posto_id || null,
  local_texto: payload.local_texto?.trim() || null,
  ponto_apresentacao: payload.ponto_apresentacao?.trim() || null,
  area_atuacao: payload.area_atuacao?.trim() || null,
  equipe_id: payload.equipe_id || null,
  grupamento: payload.grupamento?.trim() || null,
  recorrencia_tipo: payload.recorrencia_tipo ?? 'NAO_REPETIR',
  recorrencia_config: payload.recorrencia_config ?? {},
});

export const escalasService = {
  async listEscalas() {
    const { data, error } = await supabase
      .from('guarda_escalas')
      .select(escalaSelect)
      .order('data_inicio', { ascending: false });

    if (error) throw error;
    const escalas = (data || []) as GuardaEscala[];
    return this.attachChildren(escalas);
  },

  async getEscala(id: string) {
    const { data, error } = await supabase.from('guarda_escalas').select(escalaSelect).eq('id', id).single();
    if (error) throw error;
    const [escala] = await this.attachChildren([data as GuardaEscala]);
    return escala;
  },

  async attachChildren(escalas: GuardaEscala[]) {
    const ids = escalas.map((escala) => escala.id);
    if (ids.length === 0) return escalas;

    const [{ data: guardas }, { data: agentes }, { data: viaturas }, { data: ciencias }] = await Promise.all([
      supabase.from('guardas_municipais').select('id, matricula, nome, ativo, graduacao_id, guarda_municipal_graduacoes(nome)'),
      supabase.from('guarda_escala_agentes').select('*').in('escala_id', ids).order('created_at'),
      supabase.from('guarda_escala_viaturas').select('*, veiculo:guarda_frota_veiculos(id,prefixo,placa,modelo,marca,status)').in('escala_id', ids),
      supabase.from('guarda_escala_ciencias').select('*').in('escala_id', ids),
    ]);

    const guardasMap = new Map(((guardas || []) as GuardaRow[]).map((row) => [row.id, normalizeGuarda(row)]));
    const agentsByEscala = new Map<string, GuardaEscalaAgente[]>();
    const viaturasByEscala = new Map<string, GuardaEscalaViatura[]>();
    const cienciasByEscala = new Map<string, any[]>();

    for (const agente of (agentes || []) as GuardaEscalaAgente[]) {
      const current = agentsByEscala.get(agente.escala_id) ?? [];
      current.push({ ...agente, guarda: guardasMap.get(agente.guarda_id) ?? null });
      agentsByEscala.set(agente.escala_id, current);
    }

    for (const viatura of (viaturas || []) as GuardaEscalaViatura[]) {
      const current = viaturasByEscala.get(viatura.escala_id) ?? [];
      current.push(viatura);
      viaturasByEscala.set(viatura.escala_id, current);
    }

    for (const ciencia of (ciencias || []) as any[]) {
      const current = cienciasByEscala.get(ciencia.escala_id) ?? [];
      current.push(ciencia);
      cienciasByEscala.set(ciencia.escala_id, current);
    }

    return escalas.map((escala) => ({
      ...escala,
      agentes: agentsByEscala.get(escala.id) ?? [],
      viaturas: viaturasByEscala.get(escala.id) ?? [],
      ciencias: cienciasByEscala.get(escala.id) ?? [],
    }));
  },

  async listMinhasEscalas() {
    const { data, error } = await supabase
      .from('guarda_escalas')
      .select(escalaSelect)
      .eq('status', 'PUBLICADA')
      .order('data_inicio', { ascending: true });

    if (error) throw error;
    return this.attachChildren((data || []) as GuardaEscala[]);
  },

  async listTipos() {
    const { data, error } = await supabase.from('guarda_tipos_servico').select('*').order('ordem').order('nome');
    if (error) throw error;
    return (data || []) as GuardaEscalaTipoServico[];
  },

  async saveTipo(payload: Partial<GuardaEscalaTipoServico> & { nome: string }) {
    const body = {
      nome: payload.nome.trim(),
      descricao: payload.descricao?.trim() || null,
      cor: payload.cor || '#2563eb',
      ordem: payload.ordem ?? 0,
      ativo: payload.ativo ?? true,
    };
    const query = payload.id
      ? supabase.from('guarda_tipos_servico').update(body).eq('id', payload.id)
      : supabase.from('guarda_tipos_servico').insert([body]);
    const { error } = await query;
    if (error) throw error;
  },

  async listPostos() {
    const { data, error } = await supabase.from('guarda_postos_servico').select('*').order('nome');
    if (error) throw error;
    return (data || []) as GuardaEscalaPosto[];
  },

  async savePosto(payload: Partial<GuardaEscalaPosto> & { nome: string }) {
    const body = {
      nome: payload.nome.trim(),
      descricao: payload.descricao?.trim() || null,
      endereco: payload.endereco?.trim() || null,
      bairro: payload.bairro?.trim() || null,
      ponto_referencia: payload.ponto_referencia?.trim() || null,
      latitude: payload.latitude || null,
      longitude: payload.longitude || null,
      ativo: payload.ativo ?? true,
    };
    const query = payload.id
      ? supabase.from('guarda_postos_servico').update(body).eq('id', payload.id)
      : supabase.from('guarda_postos_servico').insert([body]);
    const { error } = await query;
    if (error) throw error;
  },

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
    const { data, error } = await supabase.from('guarda_equipes').select('id,nome,ativo').eq('ativo', true).order('nome');
    if (error) throw error;
    return (data || []) as Array<{ id: string; nome: string; ativo: boolean }>;
  },

  async listEquipeMembros(equipeId: string) {
    const { data, error } = await supabase.from('guarda_equipe_membros').select('guarda_id').eq('equipe_id', equipeId).eq('ativo', true);
    if (error) throw error;
    return ((data || []) as Array<{ guarda_id: string }>).map((item) => item.guarda_id);
  },

  async listViaturas() {
    const { data, error } = await supabase
      .from('guarda_frota_veiculos')
      .select('id,prefixo,placa,modelo,marca,status,ativo')
      .eq('ativo', true)
      .order('prefixo');
    if (error) throw error;
    return (data || []) as Array<{ id: string; prefixo: string; placa: string; modelo: string | null; marca: string | null; status: string }>;
  },

  async createEscala(payload: GuardaEscalaPayload) {
    const userId = (await supabase.auth.getUser()).data.user?.id || null;
    const { data, error } = await supabase
      .from('guarda_escalas')
      .insert([{ ...cleanEscalaPayload(payload), criado_por: userId }])
      .select(escalaSelect)
      .single();
    if (error) throw error;
    return data as GuardaEscala;
  },

  async updateEscala(id: string, payload: GuardaEscalaPayload) {
    const { data, error } = await supabase.from('guarda_escalas').update(cleanEscalaPayload(payload)).eq('id', id).select(escalaSelect).single();
    if (error) throw error;
    return data as GuardaEscala;
  },

  async deleteDraft(id: string) {
    const { error } = await supabase.from('guarda_escalas').delete().eq('id', id).eq('status', 'RASCUNHO');
    if (error) throw error;
  },

  async addAgente(payload: { escala_id: string; guarda_id: string; funcao: string; observacao?: string | null; conflito_autorizado?: boolean; motivo_conflito?: string | null }) {
    const userId = (await supabase.auth.getUser()).data.user?.id || null;
    const escala = await this.getEscala(payload.escala_id);
    const { data, error } = await supabase.rpc('detectar_conflitos_guarda_escala', {
      p_guarda_id: payload.guarda_id,
      p_inicio: escala.data_inicio,
      p_fim: escala.data_fim,
      p_ignorar_escala_id: payload.escala_id,
    });
    if (error) throw error;
    const conflicts = Array.isArray(data) ? data : [];
    if (conflicts.length > 0 && !payload.conflito_autorizado) {
      return { sucesso: false, codigo: 'CONFLITO', mensagem: 'Conflito de horario identificado.', conflitos: conflicts } as RpcResult;
    }

    const { error: insertError } = await supabase.from('guarda_escala_agentes').insert([{
      ...payload,
      created_by: userId,
    }]);
    if (insertError) throw insertError;
    return { sucesso: true, mensagem: 'Agente adicionado.' } as RpcResult;
  },

  async updateAgente(id: string, payload: Partial<GuardaEscalaAgente>) {
    const { error } = await supabase.from('guarda_escala_agentes').update(payload).eq('id', id);
    if (error) throw error;
  },

  async removeAgente(id: string) {
    const { error } = await supabase.from('guarda_escala_agentes').delete().eq('id', id);
    if (error) throw error;
  },

  async addViatura(payload: { escala_id: string; veiculo_id: string | null; agente_id?: string | null; observacao?: string | null }) {
    const userId = (await supabase.auth.getUser()).data.user?.id || null;
    const { error } = await supabase.from('guarda_escala_viaturas').insert([{ ...payload, created_by: userId }]);
    if (error) throw error;
  },

  async removeViatura(id: string) {
    const { error } = await supabase.from('guarda_escala_viaturas').delete().eq('id', id);
    if (error) throw error;
  },

  async publicar(id: string) {
    const { data, error } = await supabase.rpc('publicar_guarda_escala', { p_escala_id: id });
    if (error) throw error;
    return data as RpcResult;
  },

  async gerarRecorrencias(id: string, limite = 180) {
    const { data, error } = await supabase.rpc('gerar_recorrencias_guarda_escala', {
      p_escala_id: id,
      p_limite: limite,
    });
    if (error) throw error;
    return data as RpcResult;
  },

  async cancelar(id: string, motivo: string) {
    const { data, error } = await supabase.rpc('cancelar_guarda_escala', { p_escala_id: id, p_motivo: motivo });
    if (error) throw error;
    return data as RpcResult;
  },

  async confirmarCiencia(id: string) {
    const { data, error } = await supabase.rpc('confirmar_ciencia_guarda_escala', { p_escala_id: id });
    if (error) throw error;
    return data as RpcResult;
  },

  async listHistorico(escalaId?: string) {
    let query = supabase.from('guarda_escala_historico').select('*').order('created_at', { ascending: false }).limit(150);
    if (escalaId) query = query.eq('escala_id', escalaId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as GuardaEscalaHistorico[];
  },

  async listTrocas() {
    const [{ data: trocas, error }, { data: guardas }, { data: escalas }] = await Promise.all([
      supabase.from('guarda_escala_trocas').select('*').order('solicitado_em', { ascending: false }),
      supabase.from('guardas_municipais').select('id, matricula, nome, ativo, graduacao_id, guarda_municipal_graduacoes(nome)'),
      supabase.from('guarda_escalas').select(escalaSelect),
    ]);
    if (error) throw error;
    const guardasMap = new Map(((guardas || []) as GuardaRow[]).map((row) => [row.id, normalizeGuarda(row)]));
    const escalasMap = new Map(((escalas || []) as GuardaEscala[]).map((escala) => [escala.id, escala]));
    return ((trocas || []) as GuardaEscalaTroca[]).map((troca) => ({
      ...troca,
      solicitante: guardasMap.get(troca.solicitante_guarda_id) ?? null,
      destinatario: guardasMap.get(troca.destinatario_guarda_id) ?? null,
      escala_origem: escalasMap.get(troca.escala_origem_id) ?? null,
      escala_destino: troca.escala_destino_id ? escalasMap.get(troca.escala_destino_id) ?? null : null,
    }));
  },

  async criarTroca(payload: { tipo: TrocaTipo; escala_origem_id: string; destinatario_guarda_id: string; escala_destino_id?: string | null; motivo?: string | null; observacao?: string | null }) {
    const { data, error } = await supabase.rpc('criar_solicitacao_troca_escala', {
      p_tipo: payload.tipo,
      p_escala_origem_id: payload.escala_origem_id,
      p_destinatario_guarda_id: payload.destinatario_guarda_id,
      p_escala_destino_id: payload.escala_destino_id || null,
      p_motivo: payload.motivo || null,
      p_observacao: payload.observacao || null,
    });
    if (error) throw error;
    return data as RpcResult;
  },

  async responderTroca(id: string, aceitar: boolean, motivo?: string) {
    const { data, error } = await supabase.rpc('responder_solicitacao_troca_escala', {
      p_troca_id: id,
      p_aceitar: aceitar,
      p_motivo: motivo || null,
    });
    if (error) throw error;
    return data as RpcResult;
  },

  async cancelarTroca(id: string) {
    const { data, error } = await supabase.rpc('cancelar_solicitacao_troca_escala', { p_troca_id: id });
    if (error) throw error;
    return data as RpcResult;
  },

  async aprovarTroca(id: string, aprovar: boolean, motivo?: string) {
    const { data, error } = await supabase.rpc('aprovar_solicitacao_troca_escala', {
      p_troca_id: id,
      p_aprovar: aprovar,
      p_motivo: motivo || null,
    });
    if (error) throw error;
    return data as RpcResult;
  },
};
