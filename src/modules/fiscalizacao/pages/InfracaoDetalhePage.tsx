import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBuscarInfracaoPorCodigo } from '../hooks/useInfracoes';
import { fiscalizacaoRoutes } from '../routes';
import { CabecalhoFicha } from '../components/FichaInfracao/CabecalhoFicha';
import { DetalhesFicha } from '../components/FichaInfracao/DetalhesFicha';

export function FiscalizacaoInfracaoDetalhePage({ scope }: { scope: 'admin' | 'guarda' }) {
  const navigate = useNavigate();
  const { codigo = '' } = useParams<{ codigo: string }>();
  const { data, isLoading, isError } = useBuscarInfracaoPorCodigo(codigo);

  const backPath = scope === 'admin' ? fiscalizacaoRoutes.admin.infracoes : fiscalizacaoRoutes.guarda.infracoes;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[220px] rounded-[30px]" />
        <Skeleton className="h-[140px] rounded-[26px]" />
        <Skeleton className="h-[220px] rounded-[26px]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="rounded-[28px] border-red-200 bg-red-50">
        <CardContent className="px-6 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p className="mt-4 text-lg font-black text-red-800">Infração não encontrada</p>
          <p className="mt-2 text-sm leading-6 text-red-700">
            Não foi possível localizar a ficha solicitada no banco do MBFT.
          </p>
          <Button className="mt-5 rounded-2xl" onClick={() => navigate(backPath)}>
            Voltar para consulta
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Button variant="outline" className="rounded-2xl" onClick={() => navigate(backPath)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para consulta
      </Button>
      <CabecalhoFicha infracao={data} />
      <DetalhesFicha infracao={data} />
    </div>
  );
}
