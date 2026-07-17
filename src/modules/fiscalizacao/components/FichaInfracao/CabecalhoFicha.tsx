import { Badge } from '@/components/ui/badge';
import { BadgeGravidade } from '../Shared/BadgeGravidade';
import type { FiscalizacaoInfracao } from '../../types/fiscalizacao.types';
import { formatarPontuacaoFiscalizacao } from '../../utils/fiscalizacao.formatters';

export function CabecalhoFicha({ infracao }: { infracao: FiscalizacaoInfracao }) {
  return (
    <section className="rounded-[24px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1f2937_45%,_#0f766e_100%)] px-4 py-5 text-white md:rounded-[30px] md:px-6 md:py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 native-scrollbar whitespace-nowrap">
            <Badge variant="outline" className="flex-shrink-0 rounded-full border-white/20 bg-white/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white md:px-3 md:py-1 md:text-[12px]">
              {infracao.codigo}
            </Badge>
            <div className="flex-shrink-0">
              <BadgeGravidade gravidade={infracao.gravidade} className="border-white/15 bg-white/90 text-slate-900" />
            </div>
            {infracao.categoria && (
              <Badge variant="outline" className="flex-shrink-0 rounded-full border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white md:px-3 md:py-1 md:text-[11px]">
                {infracao.categoria}
              </Badge>
            )}
          </div>
          <h1 className="mt-3 text-xl font-black leading-tight tracking-[-0.04em] text-white sm:text-2xl md:mt-4 md:text-[30px] md:tracking-[-0.05em] lg:text-[38px]">{infracao.tipificacao_resumida}</h1>
          <p className="mt-1.5 hidden max-w-3xl text-[13px] leading-5 text-white/80 md:block md:mt-3 md:text-sm md:leading-6">{infracao.tipificacao_completa}</p>
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
