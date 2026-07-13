import { AdminLayout } from '@/components/admin/AdminLayout';
import { FiscalizacaoInfracoesPage } from '@/modules/fiscalizacao/pages/InfracoesPage';

const AdminFiscalizacaoInfracoes = () => (
  <AdminLayout>
    <FiscalizacaoInfracoesPage scope="admin" />
  </AdminLayout>
);

export default AdminFiscalizacaoInfracoes;
