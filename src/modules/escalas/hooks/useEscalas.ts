import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { escalasService } from '../services/escalas.service';
import type { GuardaEscalaPayload } from '../types/escalas.types';

export const escalasKeys = {
  root: ['guarda-escalas'] as const,
  escalas: () => [...escalasKeys.root, 'escalas'] as const,
  minhas: () => [...escalasKeys.root, 'minhas'] as const,
  tipos: () => [...escalasKeys.root, 'tipos'] as const,
  postos: () => [...escalasKeys.root, 'postos'] as const,
  guardas: () => [...escalasKeys.root, 'guardas'] as const,
  equipes: () => [...escalasKeys.root, 'equipes'] as const,
  viaturas: () => [...escalasKeys.root, 'viaturas'] as const,
  historico: (id?: string) => [...escalasKeys.root, 'historico', id || 'all'] as const,
  trocas: () => [...escalasKeys.root, 'trocas'] as const,
};

export function useEscalas() {
  return useQuery({ queryKey: escalasKeys.escalas(), queryFn: () => escalasService.listEscalas() });
}

export function useMinhasEscalas() {
  return useQuery({ queryKey: escalasKeys.minhas(), queryFn: () => escalasService.listMinhasEscalas() });
}

export function useEscalasApoio() {
  return {
    tipos: useQuery({ queryKey: escalasKeys.tipos(), queryFn: () => escalasService.listTipos() }),
    postos: useQuery({ queryKey: escalasKeys.postos(), queryFn: () => escalasService.listPostos() }),
    guardas: useQuery({ queryKey: escalasKeys.guardas(), queryFn: () => escalasService.listGuardas() }),
    equipes: useQuery({ queryKey: escalasKeys.equipes(), queryFn: () => escalasService.listEquipes() }),
    viaturas: useQuery({ queryKey: escalasKeys.viaturas(), queryFn: () => escalasService.listViaturas() }),
  };
}

export function useEscalasHistorico(escalaId?: string) {
  return useQuery({ queryKey: escalasKeys.historico(escalaId), queryFn: () => escalasService.listHistorico(escalaId) });
}

export function useEscalasTrocas() {
  return useQuery({ queryKey: escalasKeys.trocas(), queryFn: () => escalasService.listTrocas() });
}

export function useEscalasMutations() {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: escalasKeys.root });
  };

  return {
    createEscala: useMutation({ mutationFn: (payload: GuardaEscalaPayload) => escalasService.createEscala(payload), onSuccess: invalidate }),
    updateEscala: useMutation({ mutationFn: ({ id, payload }: { id: string; payload: GuardaEscalaPayload }) => escalasService.updateEscala(id, payload), onSuccess: invalidate }),
    deleteDraft: useMutation({ mutationFn: (id: string) => escalasService.deleteDraft(id), onSuccess: invalidate }),
    addAgente: useMutation({ mutationFn: escalasService.addAgente.bind(escalasService), onSuccess: invalidate }),
    updateAgente: useMutation({ mutationFn: ({ id, payload }: { id: string; payload: any }) => escalasService.updateAgente(id, payload), onSuccess: invalidate }),
    removeAgente: useMutation({ mutationFn: (id: string) => escalasService.removeAgente(id), onSuccess: invalidate }),
    addViatura: useMutation({ mutationFn: escalasService.addViatura.bind(escalasService), onSuccess: invalidate }),
    removeViatura: useMutation({ mutationFn: (id: string) => escalasService.removeViatura(id), onSuccess: invalidate }),
    publicar: useMutation({ mutationFn: (id: string) => escalasService.publicar(id), onSuccess: invalidate }),
    gerarRecorrencias: useMutation({ mutationFn: (id: string) => escalasService.gerarRecorrencias(id), onSuccess: invalidate }),
    cancelar: useMutation({ mutationFn: ({ id, motivo }: { id: string; motivo: string }) => escalasService.cancelar(id, motivo), onSuccess: invalidate }),
    confirmarCiencia: useMutation({ mutationFn: (id: string) => escalasService.confirmarCiencia(id), onSuccess: invalidate }),
    saveTipo: useMutation({ mutationFn: escalasService.saveTipo, onSuccess: invalidate }),
    savePosto: useMutation({ mutationFn: escalasService.savePosto, onSuccess: invalidate }),
    criarTroca: useMutation({ mutationFn: escalasService.criarTroca, onSuccess: invalidate }),
    responderTroca: useMutation({ mutationFn: ({ id, aceitar, motivo }: { id: string; aceitar: boolean; motivo?: string }) => escalasService.responderTroca(id, aceitar, motivo), onSuccess: invalidate }),
    cancelarTroca: useMutation({ mutationFn: (id: string) => escalasService.cancelarTroca(id), onSuccess: invalidate }),
    aprovarTroca: useMutation({ mutationFn: ({ id, aprovar, motivo }: { id: string; aprovar: boolean; motivo?: string }) => escalasService.aprovarTroca(id, aprovar, motivo), onSuccess: invalidate }),
  };
}
