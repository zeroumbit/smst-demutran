import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { FiscalizacaoInfracaoDetalhePage } from '@/modules/fiscalizacao/pages/InfracaoDetalhePage';

const GuardaFiscalizacaoInfracaoDetalhe = () => (
  <GuardsLayout>
    <FiscalizacaoInfracaoDetalhePage scope="guarda" />
  </GuardsLayout>
);

export default GuardaFiscalizacaoInfracaoDetalhe;
