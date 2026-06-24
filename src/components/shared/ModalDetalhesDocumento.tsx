import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

interface ModalDetalhesDocumentoProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  descricao: string;
}

const ModalDetalhesDocumento = ({
  isOpen,
  onClose,
  titulo,
  descricao
}: ModalDetalhesDocumentoProps) => {
  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={onClose}
      title={titulo}
    >
      <div className="prose max-w-none">
        <p className="text-muted-foreground whitespace-pre-wrap">{descricao}</p>
      </div>
    </ResponsiveDialog>
  );
};

export default ModalDetalhesDocumento;