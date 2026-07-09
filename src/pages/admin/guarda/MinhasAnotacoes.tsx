import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { NotesWorkspace } from '@/components/notes/NotesWorkspace';

const GuardaAnotacoesPage = () => {
  return (
    <GuardsLayout>
      <NotesWorkspace variant="guard" />
    </GuardsLayout>
  );
};

export default GuardaAnotacoesPage;
