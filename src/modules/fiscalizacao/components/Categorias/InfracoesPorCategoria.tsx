import { ResultadosBusca } from '../BuscaInfracoes/ResultadosBusca';
import type { FiscalizacaoInfracao } from '../../types/fiscalizacao.types';

export function InfracoesPorCategoria({
  categoria,
  items,
  detalheHref,
}: {
  categoria: string;
  items: FiscalizacaoInfracao[];
  detalheHref: (codigo: string) => string;
}) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Categoria selecionada</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-900">{categoria}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Consulte rapidamente as tipificações vinculadas a esta categoria do manual.
        </p>
      </div>

      <ResultadosBusca items={items} loading={false} total={items.length} detalheHref={detalheHref} />
    </section>
  );
}
