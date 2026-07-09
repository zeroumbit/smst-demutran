import { AdminLayout } from '@/components/admin/AdminLayout';
import { NotesWorkspace } from '@/components/notes/NotesWorkspace';

const AnotacoesPage = () => {
  return (
    <AdminLayout>
      <NotesWorkspace variant="admin" />
    </AdminLayout>
  );
};

export default AnotacoesPage;
