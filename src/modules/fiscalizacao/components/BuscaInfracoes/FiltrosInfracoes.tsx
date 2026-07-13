import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BadgeGravidade } from '../Shared/BadgeGravidade';
import type { FiscalizacaoCategoria, FiscalizacaoGravidade, FiltroInfracao } from '../../types/fiscalizacao.types';

const gravidades: FiscalizacaoGravidade[] = ['leve', 'media', 'grave', 'gravissima'];

export function FiltrosInfracoes({
  filtros,
  categorias,
  onChange,
}: {
  filtros: FiltroInfracao;
  categorias: FiscalizacaoCategoria[];
  onChange: (next: FiltroInfracao) => void;
}) {
  const toggleGravidade = (gravidade: FiscalizacaoGravidade, checked: boolean | 'indeterminate') => {
    const gravidadesAtuais = new Set(filtros.gravidade);
    if (checked) gravidadesAtuais.add(gravidade);
    else gravidadesAtuais.delete(gravidade);

    onChange({
      ...filtros,
      page: 1,
      gravidade: Array.from(gravidadesAtuais),
    });
  };

  return (
    <Card className="rounded-[26px] border-slate-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">Filtros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Gravidade</Label>
          <div className="space-y-2.5">
            {gravidades.map((gravidade) => (
              <label key={gravidade} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2.5 transition-colors hover:bg-slate-50">
                <Checkbox
                  checked={filtros.gravidade.includes(gravidade)}
                  onCheckedChange={(checked) => toggleGravidade(gravidade, checked)}
                />
                <BadgeGravidade gravidade={gravidade} />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Categoria</Label>
          <Select
            value={filtros.categoria || 'todas'}
            onValueChange={(value) =>
              onChange({
                ...filtros,
                page: 1,
                categoria: value === 'todas' ? null : value,
              })
            }
          >
            <SelectTrigger className="h-12 rounded-2xl">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {categorias.map((categoria) => (
                <SelectItem key={categoria.id} value={categoria.nome}>
                  {categoria.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Pontuação</Label>
          <RadioGroup
            value={filtros.pontuacao}
            onValueChange={(value) =>
              onChange({
                ...filtros,
                page: 1,
                pontuacao: value as FiltroInfracao['pontuacao'],
              })
            }
            className="space-y-2"
          >
            {[
              { value: 'todas', label: 'Todas' },
              { value: 'nao_computavel', label: 'Não computável' },
              { value: '1_3', label: '1 a 3 pontos' },
              { value: '4_5', label: '4 a 5 pontos' },
              { value: '6_7', label: '6 a 7 pontos' },
            ].map((item) => (
              <label key={item.value} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2.5 transition-colors hover:bg-slate-50">
                <RadioGroupItem value={item.value} />
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Crime de trânsito</Label>
          <RadioGroup
            value={filtros.crimeTransito}
            onValueChange={(value) =>
              onChange({
                ...filtros,
                page: 1,
                crimeTransito: value as FiltroInfracao['crimeTransito'],
              })
            }
            className="space-y-2"
          >
            {[
              { value: 'todos', label: 'Todos' },
              { value: 'sim', label: 'Pode configurar crime' },
              { value: 'nao', label: 'Sem crime de trânsito' },
            ].map((item) => (
              <label key={item.value} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2.5 transition-colors hover:bg-slate-50">
                <RadioGroupItem value={item.value} />
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
              </label>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}
