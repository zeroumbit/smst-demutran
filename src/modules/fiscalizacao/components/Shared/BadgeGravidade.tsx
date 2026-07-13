import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FiscalizacaoGravidade } from '../../types/fiscalizacao.types';

const GRAVIDADE_CONFIG: Record<FiscalizacaoGravidade, { label: string; classes: string }> = {
  leve: { label: 'Leve', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  media: { label: 'Média', classes: 'border-amber-200 bg-amber-50 text-amber-700' },
  grave: { label: 'Grave', classes: 'border-orange-200 bg-orange-50 text-orange-700' },
  gravissima: { label: 'Gravíssima', classes: 'border-red-200 bg-red-50 text-red-700' },
};

export function BadgeGravidade({
  gravidade,
  className,
}: {
  gravidade: FiscalizacaoGravidade;
  className?: string;
}) {
  const config = GRAVIDADE_CONFIG[gravidade];

  return (
    <Badge
      variant="outline"
      className={cn('rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em]', config.classes, className)}
    >
      {config.label}
    </Badge>
  );
}
