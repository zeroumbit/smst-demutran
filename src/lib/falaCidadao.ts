import { supabase } from '@/lib/supabase';
import type {
  FalaAssunto,
  FalaDemandaAdmin,
  FalaDemandaFormData,
  FalaDemandaPublica,
  FalaExternalUser,
  FalaHistoricoStatus,
  FalaPrioridade,
  FalaSecretaria,
  FalaStatus,
  FalaTransferencia,
} from '@/types/fala-cidadao';

export const FALA_CIDADAO_SESSION_KEY = 'fala_cidadao_session';

export const falaStatusLabels: Record<FalaStatus, string> = {
  recebido: 'Recebido',
  analise: 'Em analise',
  execucao: 'Em execucao',
  concluido: 'Concluido',
  arquivado: 'Arquivado',
  transferido: 'Transferido',
};

export const falaPrioridadeLabels: Record<FalaPrioridade, string> = {
  baixa: 'Baixa',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
};

export async function listFalaSecretarias() {
  const { data, error } = await supabase
    .from('fala_secretarias')
    .select('id, nome, sigla, descricao, ativo')
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (error) throw error;
  return (data ?? []) as FalaSecretaria[];
}

export async function listFalaAssuntos(secretariaId?: string) {
  let query = supabase
    .from('fala_assuntos')
    .select('id, secretaria_id, nome, ordem, ativo')
    .eq('ativo', true)
    .order('ordem', { ascending: true });

  if (secretariaId) {
    query = query.eq('secretaria_id', secretariaId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as FalaAssunto[];
}

export async function createFalaDemanda(form: FalaDemandaFormData, sessionToken?: string | null) {
  const { data, error } = await supabase.rpc('criar_demanda_fala_cidadao', {
    _cpf: form.cpf,
    _nome_cidadao: form.nome_cidadao,
    _email: form.email || null,
    _telefone: form.telefone || null,
    _secretaria_id: form.secretaria_id || null,
    _assunto_id: form.assunto_id || null,
    _assunto_outro: form.assunto_outro || null,
    _descricao: form.descricao,
    _endereco: form.endereco,
    _bairro: form.bairro || null,
    _ponto_referencia: form.ponto_referencia || null,
    _prioridade: form.prioridade,
    _session_token: sessionToken || null,
  });

  if (error) throw error;
  return (data?.[0] ?? null) as { id: string; protocolo: string } | null;
}

export async function consultarDemandaPorProtocolo(protocolo: string, cpf: string) {
  const { data, error } = await supabase.rpc('consultar_demanda_fala_cidadao', {
    _protocolo: protocolo,
    _cpf: cpf,
  });

  if (error) throw error;
  return (data?.[0] ?? null) as FalaDemandaPublica | null;
}

export async function registerFalaExternalUser(payload: {
  cpf: string;
  nomeCompleto: string;
  senha: string;
  email?: string;
  telefone?: string;
}) {
  const { data, error } = await supabase.rpc('registrar_usuario_externo', {
    _cpf: payload.cpf,
    _nome_completo: payload.nomeCompleto,
    _senha: payload.senha,
    _email: payload.email || null,
    _telefone: payload.telefone || null,
    _tipo: 'fala_cidadao',
  });

  if (error) throw error;
  return data as { success?: boolean; error?: string; usuario_externo_id?: string };
}

export async function loginFalaExternalUser(cpf: string, senha: string) {
  const { data, error } = await supabase.rpc('autenticar_usuario_externo', {
    _cpf: cpf,
    _senha: senha,
  });

  if (error) throw error;
  return (data?.[0] ?? null) as { session_token: string; usuario: FalaExternalUser } | null;
}

export async function validarFalaExternalSession(sessionToken: string) {
  const { data, error } = await supabase.rpc('validar_sessao_externa', {
    _session_token: sessionToken,
  });

  if (error) throw error;
  return (data?.[0] ?? null) as { valido: boolean; usuario: FalaExternalUser | null } | null;
}

export async function listMinhasSolicitacoesFala(sessionToken: string) {
  const { data, error } = await supabase.rpc('listar_minhas_solicitacoes_fala_cidadao', {
    _session_token: sessionToken,
  });

  if (error) throw error;
  return (data ?? []) as FalaDemandaPublica[];
}

export async function avaliarDemandaFala(sessionToken: string, demandaId: string, avaliacao: number, comentario?: string) {
  const { data, error } = await supabase.rpc('avaliar_demanda_fala_cidadao', {
    _session_token: sessionToken,
    _demanda_id: demandaId,
    _avaliacao: avaliacao,
    _comentario: comentario || null,
  });

  if (error) throw error;
  return data;
}

export async function listAdminFalaDemandas() {
  const { data, error } = await supabase
    .from('fala_demandas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as FalaDemandaAdmin[];
}

export async function listAdminFalaHistorico(demandaId: string) {
  const { data, error } = await supabase
    .from('fala_historico_status')
    .select('*')
    .eq('demanda_id', demandaId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as FalaHistoricoStatus[];
}

export async function listAdminFalaTransferencias(demandaId: string) {
  const { data, error } = await supabase
    .from('fala_transferencias')
    .select('*')
    .eq('demanda_id', demandaId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as FalaTransferencia[];
}

export async function atualizarStatusFalaDemanda(demandaId: string, status: FalaStatus, respostaCidadao?: string, observacaoInterna?: string) {
  const { data, error } = await supabase.rpc('atualizar_status_fala_cidadao', {
    _demanda_id: demandaId,
    _status: status,
    _resposta_cidadao: respostaCidadao || null,
    _observacao_interna: observacaoInterna || null,
  });

  if (error) throw error;
  return data;
}

export async function transferirFalaDemanda(demandaId: string, secretariaDestinoId: string, justificativa: string) {
  const { data, error } = await supabase.rpc('transferir_demanda_fala_cidadao', {
    _demanda_id: demandaId,
    _secretaria_destino_id: secretariaDestinoId,
    _justificativa: justificativa,
  });

  if (error) throw error;
  return data;
}

export function getStoredFalaSession() {
  return localStorage.getItem(FALA_CIDADAO_SESSION_KEY);
}

export function storeFalaSession(token: string) {
  localStorage.setItem(FALA_CIDADAO_SESSION_KEY, token);
}

export function clearFalaSession() {
  localStorage.removeItem(FALA_CIDADAO_SESSION_KEY);
}

