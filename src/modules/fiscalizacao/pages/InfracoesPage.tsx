import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookCheck, Filter, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from '@/hooks/use-toast';
import { useBuscarInfracoes, useSugestoesBusca } from '../hooks/useInfracoes';
import { useCategorias } from '../hooks/useCategorias';
import { fiscalizacaoRoutes } from '../routes';
import { FiltrosInfracoes } from '../components/BuscaInfracoes/FiltrosInfracoes';
import { ResultadosBusca } from '../components/BuscaInfracoes/ResultadosBusca';
import type { FiltroInfracao } from '../types/fiscalizacao.types';

const filtrosIniciais: FiltroInfracao = {
  busca: '',
  gravidade: [],
  categoria: null,
  pontuacao: 'todas',
  crimeTransito: 'todos',
  page: 1,
  limit: 20,
};

export function FiscalizacaoInfracoesPage({ scope }: { scope: 'admin' | 'guarda' }) {
  const [filtros, setFiltros] = useState<FiltroInfracao>(filtrosIniciais);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const buscaDeferred = useDeferredValue(filtros.busca);

  const { data: categorias = [] } = useCategorias();
  const categoriasComItens = useMemo(
    () => categorias.filter((item) => (item.total_infracoes || 0) > 0),
    [categorias],
  );
  const { data, isLoading, isError, refetch } = useBuscarInfracoes({
    ...filtros,
    busca: buscaDeferred,
  });
  const { data: sugestoes = [] } = useSugestoesBusca(buscaDeferred);

  const totalPages = useMemo(() => {
    const total = data?.total || 0;
    return Math.max(1, Math.ceil(total / filtros.limit));
  }, [data?.total, filtros.limit]);

  if (isError) {
    toast({
      title: 'Erro ao consultar infrações',
      description: 'Não foi possível carregar o manual no momento. Tente novamente.',
      variant: 'destructive',
    });
  }

  const detalheHref = (codigo: string) =>
    scope === 'admin' ? fiscalizacaoRoutes.admin.detalhe(codigo) : fiscalizacaoRoutes.guarda.detalhe(codigo);

  const categoriasHref = scope === 'admin' ? fiscalizacaoRoutes.admin.categorias : fiscalizacaoRoutes.guarda.categorias;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-[linear-gradient(140deg,_#111827_0%,_#0f766e_48%,_#f59e0b_100%)] px-4 py-5 text-white md:rounded-[32px] md:px-6 md:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/65 md:text-[11px]">Fiscalização de Trânsito</p>
            <h1 className="mt-2 text-xl font-black tracking-[-0.05em] text-white sm:text-2xl md:mt-3 md:text-[32px] md:tracking-[-0.06em] lg:text-[38px]">Manual Brasileiro de Fiscalização</h1>
            <p className="mt-1.5 hidden max-w-3xl text-[13px] leading-5 text-white/82 md:block md:mt-2 md:text-sm md:leading-6">
              Ferramenta de consulta rápida para tipificações, penalidades, procedimentos e exemplos operacionais do MBFT.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categoriasComItens.length > 0 ? (
              <Button asChild variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
                <Link to={categoriasHref}>Ver categorias</Link>
              </Button>
            ) : (
              <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" disabled>
                Ver categorias
              </Button>
            )}
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => void refetch()}>
              Atualizar consulta
            </Button>
          </div>
        </div>
      </section>

      <Card className="rounded-[28px] border-slate-200">
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Busca inteligente</label>
              <Popover open={autocompleteOpen && sugestoes.length > 0} onOpenChange={setAutocompleteOpen}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={filtros.busca}
                      onFocus={() => setAutocompleteOpen(true)}
                      onChange={(event) => setFiltros((current) => ({ ...current, page: 1, busca: event.target.value }))}
                      placeholder="Busque por código, tipificação, amparo legal ou palavra-chave"
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11"
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Filtrar sugestões..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma sugestão encontrada.</CommandEmpty>
                      <CommandGroup>
                        {sugestoes.map((item) => (
                          <CommandItem
                            key={item.codigo}
                            value={`${item.codigo} ${item.descricao}`}
                            onSelect={() => {
                              setFiltros((current) => ({ ...current, busca: item.codigo, page: 1 }));
                              setAutocompleteOpen(false);
                            }}
                          >
                            <div className="flex min-w-0 flex-col">
                              <span className="font-mono text-xs font-bold text-slate-700">{item.codigo}</span>
                              <span className="truncate text-sm text-slate-600">{item.descricao}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                className="h-12 rounded-2xl"
                onClick={() => setFiltros(filtrosIniciais)}
              >
                Limpar
              </Button>
              <Button asChild className="h-12 rounded-2xl">
                <Link to={categoriasHref}>
                  <BookCheck className="mr-2 h-4 w-4" />
                  Categorias
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Filter className="h-4 w-4" />
            Refinar consulta
          </div>
          <FiltrosInfracoes filtros={filtros} categorias={categorias} onChange={setFiltros} />
        </div>

        <div className="space-y-5">
          <ResultadosBusca items={data?.data || []} loading={isLoading} total={data?.total || 0} detalheHref={detalheHref} />

          <Card className="rounded-[24px] border-slate-200">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-slate-600">
                Página {filtros.page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  disabled={filtros.page <= 1}
                  onClick={() => setFiltros((current) => ({ ...current, page: current.page - 1 }))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  disabled={filtros.page >= totalPages}
                  onClick={() => setFiltros((current) => ({ ...current, page: current.page + 1 }))}
                >
                  Próxima
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
