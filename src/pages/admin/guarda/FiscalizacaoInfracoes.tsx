import { GuardsLayout } from '@/components/admin/GuardsLayout';
import { FiscalizacaoInfracoesPage } from '@/modules/fiscalizacao/pages/InfracoesPage';

const GuardaFiscalizacaoInfracoes = () => (
  <GuardsLayout>
    <FiscalizacaoInfracoesPage scope="guarda" />
  </GuardsLayout>
);

export default GuardaFiscalizacaoInfracoes;
