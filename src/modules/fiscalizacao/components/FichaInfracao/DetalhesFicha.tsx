import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { FiscalizacaoInfracao } from '../../types/fiscalizacao.types';
import { formatarPontuacaoFiscalizacao } from '../../utils/fiscalizacao.formatters';

const blocks = [
  { key: 'penalidade', title: 'Penalidade' },
  { key: 'medida_administrativa', title: 'Medida Administrativa' },
  { key: 'competencia', title: 'Competência' },
  { key: 'quando_autuar', title: 'Quando Autuar' },
  { key: 'quando_nao_autuar', title: 'Quando NÃO Autuar' },
  { key: 'definicoes_procedimentos', title: 'Definições e Procedimentos' },
  { key: 'exemplos_observacoes', title: 'Exemplos para Observações do AIT' },
  { key: 'informacoes_complementares', title: 'Informações Complementares' },
] as const;

function formatarBlocoDetalhe(
  key: (typeof blocks)[number]['key'],
  value: string,
) {
  if (key === 'quando_autuar') {
    return value.replace(/^\s*n[aã]o\s+comput[aá]vel\s*/i, '').trim();
  }

  return value;
}

export function DetalhesFicha({ infracao }: { infracao: FiscalizacaoInfracao }) {
  return (
    <div className="grid gap-4">
      <Card className="rounded-[26px] border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">Visão operacional</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailPill label="Constatação" value={infracao.constatacao || 'Não informado'} />
          <DetailPill label="Capítulo" value={infracao.capitulo || 'Não informado'} />
          <DetailPill label="Categoria" value={infracao.categoria || 'Não informado'} />
          <DetailPill
            label="Crime de trânsito"
            value={infracao.pode_configurar_crime ? 'Pode configurar crime' : 'Sem crime de trânsito'}
            tone={infracao.pode_configurar_crime ? 'danger' : 'neutral'}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[26px] border-slate-200">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">Síntese normativa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RichBlock title="Tipificação completa" value={infracao.tipificacao_completa} />
            <Separator />
            <RichBlock title="Penalidade" value={infracao.penalidade} />
            {infracao.medida_administrativa && (
              <>
                <Separator />
                <RichBlock title="Medida Administrativa" value={infracao.medida_administrativa} />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[26px] border-slate-200">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">Checklist rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChecklistItem title="Infrator" value={infracao.infrator} />
            <ChecklistItem title="Amparo legal" value={infracao.amparo_legal} />
            <ChecklistItem title="Pontuação" value={formatarPontuacaoFiscalizacao(infracao.pontuacao, infracao.gravidade)} />
            <ChecklistItem title="Competência" value={infracao.competencia || 'Não informado'} />
          </CardContent>
        </Card>
      </div>

      {blocks.map((block) => {
        const value = infracao[block.key];
        if (!value) return null;
        const formattedValue = formatarBlocoDetalhe(block.key, value);

        return (
          <Card key={block.key} className="rounded-[26px] border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">{block.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-slate max-w-none text-sm leading-7">
                <p className="whitespace-pre-line text-slate-700">{formattedValue}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function DetailPill({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'danger';
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <div className="mt-2">
        <Badge
          variant="outline"
          className={tone === 'danger'
            ? 'rounded-full border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700'
            : 'rounded-full border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-700'}
        >
          {value}
        </Badge>
      </div>
    </div>
  );
}

function RichBlock({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">{value}</p>
    </div>
  );
}

function ChecklistItem({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
