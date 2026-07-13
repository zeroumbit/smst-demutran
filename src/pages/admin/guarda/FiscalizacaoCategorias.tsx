import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { FiscalizacaoCategoriasPage } from '@/modules/fiscalizacao/pages/CategoriasPage';

const GuardaFiscalizacaoCategorias = () => (
  <GuardsLayout>
    <FiscalizacaoCategoriasPage scope="guarda" />
  </GuardsLayout>
);

export default GuardaFiscalizacaoCategorias;
