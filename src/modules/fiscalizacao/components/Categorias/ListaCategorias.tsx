import { Link } from 'react-router-dom';
import { ArrowRight, Bike, Cone, FileBadge, Gauge, LampDesk, Route, ShieldCheck, Signpost, Truck, WineOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { FiscalizacaoCategoria } from '../../types/fiscalizacao.types';

const iconMap = {
  'badge-alert': FileBadge,
  route: Route,
  'parking-circle': Signpost,
  gauge: Gauge,
  'arrow-right-left': ArrowRight,
  'shield-check': ShieldCheck,
  'file-badge': FileBadge,
  truck: Truck,
  'wine-off': WineOff,
  bike: Bike,
  cone: Cone,
  signpost: Signpost,
  lamp: LampDesk,
} as const;

export function ListaCategorias({
  categorias,
  href,
}: {
  categorias: FiscalizacaoCategoria[];
  href: (categoria: string) => string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {categorias.map((categoria) => {
        const Icon = iconMap[categoria.icone as keyof typeof iconMap] || FileBadge;

        return (
          <Link key={categoria.id} to={href(categoria.nome)}>
            <Card className="h-full rounded-[28px] border-slate-200 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-700">
                    {categoria.total_infracoes || 0} infrações
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{categoria.nome}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{categoria.descricao || 'Categoria de consulta do MBFT.'}</p>
                </div>
                <div className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  Explorar categoria
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
