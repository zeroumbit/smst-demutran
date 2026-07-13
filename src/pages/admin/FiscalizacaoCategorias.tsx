import { AdminLayout } from '@/components/admin/AdminLayout';
import { FiscalizacaoCategoriasPage } from '@/modules/fiscalizacao/pages/CategoriasPage';

const AdminFiscalizacaoCategorias = () => (
  <AdminLayout>
    <FiscalizacaoCategoriasPage scope="admin" />
  </AdminLayout>
);

export default AdminFiscalizacaoCategorias;
