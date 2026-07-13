import { Link } from 'react-router-dom';
import { FileText, Gavel, ShieldAlert, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BadgeGravidade } from '../Shared/BadgeGravidade';
import type { FiscalizacaoInfracao } from '../../types/fiscalizacao.types';
import { formatarPontuacaoFiscalizacao } from '../../utils/fiscalizacao.formatters';

export function ResultadosBusca({
  items,
  loading,
  total,
  detalheHref,
}: {
  items: FiscalizacaoInfracao[];
  loading: boolean;
  total: number;
  detalheHref: (codigo: string) => string;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="rounded-[28px] border-slate-200">
            <CardContent className="space-y-4 p-5">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="rounded-[28px] border-dashed border-slate-300">
        <CardContent className="px-6 py-10 text-center">
          <p className="text-lg font-bold text-slate-800">Nenhuma infração encontrada</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Tente buscar pelo código CTB, por palavras da tipificação ou remova alguns filtros.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">{total} resultado(s) encontrado(s)</p>
      </div>

      {items.map((item) => (
        <Card key={item.id} className="rounded-[28px] border-slate-200 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full border-slate-300 bg-slate-50 px-3 py-1 font-mono text-[12px] font-bold text-slate-800">
                    {item.codigo}
                  </Badge>
                  <BadgeGravidade gravidade={item.gravidade} />
                  {item.pode_configurar_crime && (
                    <Badge variant="outline" className="rounded-full border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700">
                      Crime de trânsito
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-black leading-snug text-slate-900">{item.tipificacao_resumida}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{item.tipificacao_completa}</p>
                </div>

                <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
                    <FileText className="h-3.5 w-3.5" />
                    {item.amparo_legal}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
                    <Star className="h-3.5 w-3.5" />
                    {formatarPontuacaoFiscalizacao(item.pontuacao, item.gravidade)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
                    <Gavel className="h-3.5 w-3.5" />
                    {item.infrator}
                  </span>
                  {item.constatacao && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {item.constatacao}
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                <Button asChild className="rounded-2xl">
                  <Link to={detalheHref(item.codigo)}>Ver detalhes</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
