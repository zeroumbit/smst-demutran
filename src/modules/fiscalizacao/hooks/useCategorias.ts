import { useQuery } from '@tanstack/react-query';
import { fiscalizacaoService } from '../services/fiscalizacao.service';

export const CATEGORIAS_QUERY_KEYS = {
  all: ['fiscalizacao', 'categorias'] as const,
};

export function useCategorias() {
  return useQuery({
    queryKey: CATEGORIAS_QUERY_KEYS.all,
    queryFn: () => fiscalizacaoService.buscarCategorias(),
    staleTime: 1000 * 60 * 10,
  });
}
