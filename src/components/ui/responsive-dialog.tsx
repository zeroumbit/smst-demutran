import { X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onCancel?: () => void;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  className?: string;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  onCancel,
  cancelLabel = 'Cancelar',
  onConfirm,
  confirmLabel = 'Salvar',
  confirmDisabled = false,
  className,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  const defaultFooter = (
    <div className="flex gap-3 w-full">
      {onConfirm && (
        <Button onClick={onConfirm} disabled={confirmDisabled} className="flex-1">
          {confirmLabel}
        </Button>
      )}
    </div>
  );
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85dvh] rounded-t-[28px]">
          <DrawerHeader className="text-left relative shrink-0">
            <DrawerClose className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity">
              <X className="h-5 w-5" />
            </DrawerClose>
            <DrawerTitle className="pr-8 break-words">{title}</DrawerTitle>
            {description && <DrawerDescription className="pr-8 break-words">{description}</DrawerDescription>}
          </DrawerHeader>
          <div className={`flex-1 overflow-y-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className ?? ''}`}>{children}</div>
          <DrawerFooter className="mt-0 pt-2 bg-background border-t pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {footer ?? defaultFooter}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-2xl max-h-[90vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className ?? ''}`}>
        <DialogHeader>
          <DialogTitle className="break-words">{title}</DialogTitle>
          {description && <DialogDescription className="break-words">{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {(footer || onCancel || onConfirm) && (
          <DialogFooter>
            {footer ?? defaultFooter}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
