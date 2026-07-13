import { AdminLayout } from '@/components/admin/AdminLayout';
import { FiscalizacaoInfracaoDetalhePage } from '@/modules/fiscalizacao/pages/InfracaoDetalhePage';

const AdminFiscalizacaoInfracaoDetalhe = () => (
  <AdminLayout>
    <FiscalizacaoInfracaoDetalhePage scope="admin" />
  </AdminLayout>
);

export default AdminFiscalizacaoInfracaoDetalhe;
