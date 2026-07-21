import type { GuardaFrotaStatus, GuardaFrotaManutencaoTipo } from '../types/frota-guarda.types';

export const normalizePlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const statusLabels: Record<GuardaFrotaStatus, string> = {
  DISPONIVEL: 'Disponivel',
  EM_SERVICO: 'Em servico',
  EM_MANUTENCAO: 'Em manutencao',
  INDISPONIVEL: 'Indisponivel',
  RESERVADO: 'Reservado',
  INATIVO: 'Inativo',
};

export const statusClasses: Record<GuardaFrotaStatus, string> = {
  DISPONIVEL: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  EM_SERVICO: 'border-blue-200 bg-blue-50 text-blue-700',
  EM_MANUTENCAO: 'border-amber-200 bg-amber-50 text-amber-700',
  INDISPONIVEL: 'border-rose-200 bg-rose-50 text-rose-700',
  RESERVADO: 'border-violet-200 bg-violet-50 text-violet-700',
  INATIVO: 'border-slate-200 bg-slate-100 text-slate-600',
};

export const manutencaoTipoLabels: Record<GuardaFrotaManutencaoTipo, string> = {
  PREVENTIVA: 'Preventiva',
  CORRETIVA: 'Corretiva',
  REVISAO: 'Revisao',
  TROCA_OLEO: 'Troca de oleo',
  PNEUS: 'Pneus',
  ELETRICA: 'Eletrica',
  MECANICA: 'Mecanica',
  FUNILARIA: 'Funilaria',
  OUTRA: 'Outra',
};

export const tiposUso = [
  'Patrulhamento',
  'Fiscalizacao',
  'Operacoes Especiais',
  'Patrulhamento Escolar',
  'Ambiental',
  'Administrativo',
  'Apoio',
];

export const vinculos = [
  'Guarda Municipal',
  'GMAM',
  'ROPE',
  'GSU',
  'Guarda Cidada',
  'Defesa Civil',
  'Jovem Guarda',
  'Vinculo Geral',
];

export const grupamentos = [
  'Guarda Municipal',
  'GMAM',
  'ROPE',
  'GSU',
  'Guarda Cidada',
];

export const formatKm = (value?: number | null) =>
  `${new Intl.NumberFormat('pt-BR').format(value || 0)} km`;

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
