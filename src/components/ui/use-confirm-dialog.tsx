import { useState, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
}

export function useConfirmDialog() {
  const [state, setState] = useState<{
    open: boolean;
    step: 1 | 2;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, step: 1, options, resolve });
    });
  }, []);

  const handleClose = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  const handleNext = useCallback(() => {
    if (state?.step === 1) {
      setState((prev) => (prev ? { ...prev, step: 2 } : null));
    }
  }, [state]);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const confirmDialog = state ? (
    <AlertDialog open={state.open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <AlertDialogContent>
        {state.step === 1 ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{state.options.title}</AlertDialogTitle>
              <AlertDialogDescription>{state.options.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {state.options.cancelText || 'Cancelar'}
              </Button>
              <Button variant={state.options.variant || 'destructive'} onClick={handleNext}>
                Continuar
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmação final</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Tem certeza absoluta que deseja prosseguir?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Voltar
              </Button>
              <Button variant={state.options.variant || 'destructive'} onClick={handleConfirm}>
                {state.options.confirmText || 'Sim, confirmar'}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  ) : null;

  return { confirm, confirmDialog };
}
