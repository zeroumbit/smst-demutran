import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface DoubleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
}

export function DoubleConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = 'Sim, confirmar',
  cancelText = 'Cancelar',
  variant = 'destructive',
}: DoubleConfirmDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);

  const handleClose = () => {
    setStep(1);
    onOpenChange(false);
  };

  const handleNext = () => {
    setStep(2);
  };

  const handleConfirm = () => {
    setStep(1);
    onConfirm();
  };

  const handleCancel = () => {
    handleClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <AlertDialogContent>
        {step === 1 ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>{description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                {cancelText}
              </Button>
              <Button variant={variant} onClick={handleNext}>
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
              <Button variant="outline" onClick={handleCancel}>
                Voltar
              </Button>
              <Button variant={variant} onClick={handleConfirm}>
                {confirmText}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
