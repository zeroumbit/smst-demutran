import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { frotaGuardaService } from '../services/frota-guarda.service';
import type { GuardaFrotaStatus, GuardaFrotaVeiculoPayload } from '../types/frota-guarda.types';
import { escalasKeys } from '@/modules/escalas/hooks/useEscalas';

export const frotaGuardaKeys = {
  root: ['frota-guarda'] as const,
  veiculos: () => [...frotaGuardaKeys.root, 'veiculos'] as const,
  veiculo: (id: string) => [...frotaGuardaKeys.root, 'veiculo', id] as const,
  categorias: () => [...frotaGuardaKeys.root, 'categorias'] as const,
  demutran: () => [...frotaGuardaKeys.root, 'demutran-base'] as const,
  historico: (id: string) => [...frotaGuardaKeys.root, 'historico', id] as const,
  indisponibilidades: (id: string) => [...frotaGuardaKeys.root, 'indisponibilidades', id] as const,
  manutencoes: (id: string) => [...frotaGuardaKeys.root, 'manutencoes', id] as const,
  documentos: (id: string) => [...frotaGuardaKeys.root, 'documentos', id] as const,
};

export function useFrotaGuarda() {
  return useQuery({
    queryKey: frotaGuardaKeys.veiculos(),
    queryFn: () => frotaGuardaService.listVeiculos(),
  });
}

export function useFrotaGuardaCategorias() {
  return useQuery({
    queryKey: frotaGuardaKeys.categorias(),
    queryFn: () => frotaGuardaService.listCategorias(),
  });
}

export function useDemutranFrotaBase() {
  return useQuery({
    queryKey: frotaGuardaKeys.demutran(),
    queryFn: () => frotaGuardaService.listDemutranVehicles(),
  });
}

export function useFrotaGuardaDetalhe(id?: string) {
  return useQuery({
    queryKey: frotaGuardaKeys.veiculo(id || ''),
    queryFn: () => frotaGuardaService.getVeiculo(id!),
    enabled: Boolean(id),
  });
}

export function useFrotaGuardaApoio(veiculoId?: string) {
  return {
    historico: useQuery({
      queryKey: frotaGuardaKeys.historico(veiculoId || ''),
      queryFn: () => frotaGuardaService.listHistorico(veiculoId!),
      enabled: Boolean(veiculoId),
    }),
    indisponibilidades: useQuery({
      queryKey: frotaGuardaKeys.indisponibilidades(veiculoId || ''),
      queryFn: () => frotaGuardaService.listIndisponibilidades(veiculoId!),
      enabled: Boolean(veiculoId),
    }),
    manutencoes: useQuery({
      queryKey: frotaGuardaKeys.manutencoes(veiculoId || ''),
      queryFn: () => frotaGuardaService.listManutencoes(veiculoId!),
      enabled: Boolean(veiculoId),
    }),
    documentos: useQuery({
      queryKey: frotaGuardaKeys.documentos(veiculoId || ''),
      queryFn: () => frotaGuardaService.listDocumentos(veiculoId!),
      enabled: Boolean(veiculoId),
    }),
  };
}

export function useFrotaGuardaMutations() {
  const queryClient = useQueryClient();
  const invalidate = async (id?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: frotaGuardaKeys.veiculos() }),
      queryClient.invalidateQueries({ queryKey: escalasKeys.viaturas() }),
    ]);
    if (id) {
      await queryClient.invalidateQueries({ queryKey: frotaGuardaKeys.veiculo(id) });
      await queryClient.invalidateQueries({ queryKey: frotaGuardaKeys.historico(id) });
      await queryClient.invalidateQueries({ queryKey: frotaGuardaKeys.indisponibilidades(id) });
      await queryClient.invalidateQueries({ queryKey: frotaGuardaKeys.manutencoes(id) });
      await queryClient.invalidateQueries({ queryKey: frotaGuardaKeys.documentos(id) });
    }
  };

  return {
    createVeiculo: useMutation({
      mutationFn: (payload: GuardaFrotaVeiculoPayload) => frotaGuardaService.createVeiculo(payload),
      onSuccess: (veiculo) => invalidate(veiculo.id),
    }),
    updateVeiculo: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: GuardaFrotaVeiculoPayload }) =>
        frotaGuardaService.updateVeiculo(id, payload),
      onSuccess: (veiculo) => invalidate(veiculo.id),
    }),
    updateStatus: useMutation({
      mutationFn: ({ id, status, motivo }: { id: string; status: GuardaFrotaStatus; motivo?: string }) =>
        frotaGuardaService.updateStatus(id, status, motivo),
      onSuccess: (_, variables) => invalidate(variables.id),
    }),
    createIndisponibilidade: useMutation({
      mutationFn: (payload: Parameters<typeof frotaGuardaService.createIndisponibilidade>[0]) =>
        frotaGuardaService.createIndisponibilidade(payload),
      onSuccess: (_, variables) => invalidate(variables.veiculo_id),
    }),
    createManutencao: useMutation({
      mutationFn: (payload: Parameters<typeof frotaGuardaService.createManutencao>[0]) =>
        frotaGuardaService.createManutencao(payload),
      onSuccess: (_, variables) => invalidate(variables.veiculo_id),
    }),
    createDocumento: useMutation({
      mutationFn: (payload: Parameters<typeof frotaGuardaService.createDocumento>[0]) =>
        frotaGuardaService.createDocumento(payload),
      onSuccess: (_, variables) => invalidate(variables.veiculo_id),
    }),
    createCategoria: useMutation({
      mutationFn: (payload: { nome: string; descricao?: string | null; ordem?: number; ativo?: boolean }) =>
        frotaGuardaService.createCategoria(payload),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: frotaGuardaKeys.categorias() }),
    }),
    updateCategoria: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: { nome?: string; descricao?: string | null; ordem?: number; ativo?: boolean } }) =>
        frotaGuardaService.updateCategoria(id, payload),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: frotaGuardaKeys.categorias() }),
    }),
  };
}
