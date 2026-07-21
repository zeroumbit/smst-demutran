import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { equipesGuardaService } from '../services/equipes-guarda.service';
import type { GuardaEquipePayload } from '../types/equipes-guarda.types';
import { escalasKeys } from '@/modules/escalas/hooks/useEscalas';

export const equipesGuardaKeys = {
  root: ['equipes-guarda'] as const,
  equipes: () => [...equipesGuardaKeys.root, 'equipes'] as const,
  guardas: () => [...equipesGuardaKeys.root, 'guardas'] as const,
  historico: (id: string) => [...equipesGuardaKeys.root, 'historico', id] as const,
};

export function useEquipesGuarda() {
  return useQuery({
    queryKey: equipesGuardaKeys.equipes(),
    queryFn: () => equipesGuardaService.listEquipes(),
  });
}

export function useGuardasParaEquipe() {
  return useQuery({
    queryKey: equipesGuardaKeys.guardas(),
    queryFn: () => equipesGuardaService.listGuardas(),
  });
}

export function useEquipeHistorico(equipeId?: string) {
  return useQuery({
    queryKey: equipesGuardaKeys.historico(equipeId || ''),
    queryFn: () => equipesGuardaService.listHistorico(equipeId!),
    enabled: Boolean(equipeId),
  });
}

export function useEquipesGuardaMutations() {
  const queryClient = useQueryClient();

  const invalidate = async (equipeId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: equipesGuardaKeys.equipes() }),
      queryClient.invalidateQueries({ queryKey: equipesGuardaKeys.guardas() }),
      queryClient.invalidateQueries({ queryKey: escalasKeys.root }),
    ]);
    if (equipeId) {
      await queryClient.invalidateQueries({ queryKey: equipesGuardaKeys.historico(equipeId) });
    }
  };

  return {
    createEquipe: useMutation({
      mutationFn: (payload: GuardaEquipePayload) => equipesGuardaService.createEquipe(payload),
      onSuccess: (equipe) => invalidate(equipe.id),
    }),
    updateEquipe: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: GuardaEquipePayload }) =>
        equipesGuardaService.updateEquipe(id, payload),
      onSuccess: (equipe) => invalidate(equipe.id),
    }),
    addMembro: useMutation({
      mutationFn: ({ equipeId, guardaId, transferir }: { equipeId: string; guardaId: string; transferir?: boolean }) =>
        equipesGuardaService.addMembro(equipeId, guardaId, transferir),
      onSuccess: (_, variables) => invalidate(variables.equipeId),
    }),
    removeMembro: useMutation({
      mutationFn: ({ equipeId, guardaId }: { equipeId: string; guardaId: string }) =>
        equipesGuardaService.removeMembro(equipeId, guardaId),
      onSuccess: (_, variables) => invalidate(variables.equipeId),
    }),
  };
}
