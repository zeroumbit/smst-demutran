import type { EscalaStatus, EscalaStatusCalculado, GuardaEscala } from '../types/escalas.types';

export const statusLabels: Record<EscalaStatusCalculado, string> = {
  RASCUNHO: 'Rascunho',
  PUBLICADA: 'Publicada',
  CANCELADA: 'Cancelada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluida',
};

export const trocaStatusLabels: Record<string, string> = {
  AGUARDANDO_ACEITE: 'Aguardando aceite',
  AGUARDANDO_APROVACAO: 'Aguardando aprovacao',
  APROVADA: 'Aprovada',
  RECUSADA_PELO_GUARDA: 'Recusada pelo guarda',
  REJEITADA_PELA_ADMINISTRACAO: 'Rejeitada pela administracao',
  CANCELADA: 'Cancelada',
  EXPIRADA: 'Expirada',
};

export const statusClassName = (status: EscalaStatusCalculado) => {
  if (status === 'PUBLICADA') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (status === 'EM_ANDAMENTO') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'CONCLUIDA') return 'bg-slate-100 text-slate-700 border-slate-200';
  if (status === 'CANCELADA') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

export const getEscalaStatusCalculado = (escala: Pick<GuardaEscala, 'status' | 'data_inicio' | 'data_fim'>): EscalaStatusCalculado => {
  if (escala.status !== 'PUBLICADA') return escala.status;
  const now = Date.now();
  const start = new Date(escala.data_inicio).getTime();
  const end = new Date(escala.data_fim).getTime();
  if (start <= now && end > now) return 'EM_ANDAMENTO';
  if (end <= now) return 'CONCLUIDA';
  return 'PUBLICADA';
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
};

export const formatTime = (value?: string | null) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
};

export const toDatetimeLocal = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

export const fromDatetimeLocal = (value: string) => new Date(value).toISOString();
