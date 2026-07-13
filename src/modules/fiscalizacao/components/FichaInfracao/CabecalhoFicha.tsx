import { Badge } from '@/components/ui/badge';
import { BadgeGravidade } from '../Shared/BadgeGravidade';
import type { FiscalizacaoInfracao } from '../../types/fiscalizacao.types';
import { formatarPontuacaoFiscalizacao } from '../../utils/fiscalizacao.formatters';

export function CabecalhoFicha({ infracao }: { infracao: FiscalizacaoInfracao }) {
  return (
    <section className="rounded-[30px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1f2937_45%,_#0f766e_100%)] px-5 py-6 text-white sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full border-white/20 bg-white/10 px-3 py-1 font-mono text-[12px] font-bold text-white">
              {infracao.codigo}
            </Badge>
            <BadgeGravidade gravidade={infracao.gravidade} className="border-white/15 bg-white/90 text-slate-900" />
            {infracao.categoria && (
              <Badge variant="outline" className="rounded-full border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
                {infracao.categoria}
              </Badge>
            )}
          </div>
          <h1 className="mt-4 text-[30px] font-black leading-tight tracking-[-0.05em] sm:text-[38px]">{infracao.tipificacao_resumida}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">{infracao.tipificacao_completa}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:w-[280px] lg:grid-cols-1">
          <FichaStat label="Amparo legal" value={infracao.amparo_legal} />
          <FichaStat label="Pontuação" value={formatarPontuacaoFiscalizacao(infracao.pontuacao, infracao.gravidade)} />
          <FichaStat label="Infrator" value={infracao.infrator} />
        </div>
      </div>
    </section>
  );
}

function FichaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
