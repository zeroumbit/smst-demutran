import { useQuery } from '@tanstack/react-query';
import { fiscalizacaoService } from '../services/fiscalizacao.service';
import type { FiltroInfracao } from '../types/fiscalizacao.types';

export const INFRACOES_QUERY_KEYS = {
  all: ['fiscalizacao', 'infracoes'] as const,
  list: (filtros: FiltroInfracao) => ['fiscalizacao', 'infracoes', 'list', filtros] as const,
  detail: (codigo: string) => ['fiscalizacao', 'infracoes', 'detail', codigo] as const,
  sugestoes: (termo: string) => ['fiscalizacao', 'infracoes', 'sugestoes', termo] as const,
  categoria: (categoria: string) => ['fiscalizacao', 'infracoes', 'categoria', categoria] as const,
};

export function useBuscarInfracoes(filtros: FiltroInfracao) {
  return useQuery({
    queryKey: INFRACOES_QUERY_KEYS.list(filtros),
    queryFn: () => fiscalizacaoService.buscarInfracoes(filtros),
  });
}

export function useBuscarInfracaoPorCodigo(codigo: string) {
  return useQuery({
    queryKey: INFRACOES_QUERY_KEYS.detail(codigo),
    queryFn: () => fiscalizacaoService.buscarInfracaoPorCodigo(codigo),
    enabled: !!codigo,
  });
}

export function useSugestoesBusca(termo: string) {
  return useQuery({
    queryKey: INFRACOES_QUERY_KEYS.sugestoes(termo),
    queryFn: () => fiscalizacaoService.sugestoesBusca(termo),
    enabled: termo.trim().length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

export function useBuscarInfracoesPorCategoria(categoria: string, filtros?: Partial<FiltroInfracao>) {
  return useQuery({
    queryKey: [...INFRACOES_QUERY_KEYS.categoria(categoria), filtros || {}] as const,
    queryFn: () => fiscalizacaoService.buscarInfracoesPorCategoria(categoria, filtros),
    enabled: !!categoria,
  });
}
