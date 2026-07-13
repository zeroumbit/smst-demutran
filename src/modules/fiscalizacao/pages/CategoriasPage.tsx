import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategorias } from '../hooks/useCategorias';
import { useBuscarInfracoesPorCategoria } from '../hooks/useInfracoes';
import { InfracoesPorCategoria } from '../components/Categorias/InfracoesPorCategoria';
import { ListaCategorias } from '../components/Categorias/ListaCategorias';
import { fiscalizacaoRoutes } from '../routes';

export function FiscalizacaoCategoriasPage({ scope }: { scope: 'admin' | 'guarda' }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoriaAtual = searchParams.get('categoria') || '';
  const { data: categorias = [], isLoading } = useCategorias();
  const { data: itensCategoria = [], isLoading: carregandoCategoria } = useBuscarInfracoesPorCategoria(categoriaAtual);
  const categoriasComItens = useMemo(
    () => categorias.filter((item) => (item.total_infracoes || 0) > 0),
    [categorias],
  );
  const classificacaoTematicaDisponivel = categoriasComItens.length > 0;

  const backPath = scope === 'admin' ? fiscalizacaoRoutes.admin.infracoes : fiscalizacaoRoutes.guarda.infracoes;
  const detalheHref = (codigo: string) =>
    scope === 'admin' ? fiscalizacaoRoutes.admin.detalhe(codigo) : fiscalizacaoRoutes.guarda.detalhe(codigo);

  const categoriaSelecionada = useMemo(
    () => categorias.find((item) => item.nome === categoriaAtual) || null,
    [categoriaAtual, categorias],
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[220px] rounded-[28px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] bg-[linear-gradient(140deg,_#111827_0%,_#1d4ed8_50%,_#14b8a6_100%)] px-5 py-6 text-white sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/65">Fiscalização de Trânsito</p>
            <h1 className="mt-3 text-[30px] font-black tracking-[-0.06em] sm:text-[36px]">Navegação por categorias</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/82">
              Explore o manual por grandes grupos temáticos para acelerar a consulta em campo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => navigate(backPath)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para busca
            </Button>
            {categoriaAtual && (
              <Button
                variant="outline"
                className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20"
                onClick={() => setSearchParams({})}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Ver todas
              </Button>
            )}
          </div>
        </div>
      </section>

      {categoriaSelecionada && classificacaoTematicaDisponivel ? (
        carregandoCategoria ? (
          <Skeleton className="h-[320px] rounded-[28px]" />
        ) : (
          <InfracoesPorCategoria categoria={categoriaSelecionada.nome} items={itensCategoria} detalheHref={detalheHref} />
        )
      ) : (
        <Card className="rounded-[26px] border-slate-200">
          <CardContent className="space-y-6 p-5">
            <div>
              <p className="text-sm leading-6 text-slate-600">
                {classificacaoTematicaDisponivel
                  ? 'Selecione uma categoria para listar as infrações relacionadas e abrir suas fichas completas.'
                  : 'O conjunto atual do MBFT foi importado sem classificação temática por categoria. A consulta completa segue disponível pela busca textual, código, gravidade, pontuação e indicativo de crime de trânsito.'}
              </p>
            </div>
            {classificacaoTematicaDisponivel ? (
              <ListaCategorias
                categorias={categoriasComItens}
                href={(categoria) =>
                  `${scope === 'admin' ? fiscalizacaoRoutes.admin.categorias : fiscalizacaoRoutes.guarda.categorias}?categoria=${encodeURIComponent(categoria)}`
                }
              />
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm leading-6 text-slate-600">
                Nenhuma infração do arquivo importado possui os campos <code>categoria</code> e <code>capitulo</code> preenchidos. Se você produzir uma versão classificada desses campos, a navegação temática passa a funcionar automaticamente.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
