import { supabase } from '@/lib/supabase';
import type {
  FiscalizacaoCategoria,
  FiscalizacaoInfracao,
  FiscalizacaoSearchResult,
  FiscalizacaoSugestao,
  FiltroInfracao,
} from '../types/fiscalizacao.types';

type FiscalizacaoFilterQuery = {
  eq: (column: string, value: unknown) => FiscalizacaoFilterQuery;
  gte: (column: string, value: unknown) => FiscalizacaoFilterQuery;
  lte: (column: string, value: unknown) => FiscalizacaoFilterQuery;
  in: (column: string, values: readonly unknown[]) => FiscalizacaoFilterQuery;
  or: (filters: string) => FiscalizacaoFilterQuery;
};

const applyPontuacaoFilter = (query: FiscalizacaoFilterQuery, pontuacao: FiltroInfracao['pontuacao']) => {
  if (pontuacao === 'nao_computavel') return query.eq('pontuacao', 0);
  if (pontuacao === '1_3') return query.gte('pontuacao', 1).lte('pontuacao', 3);
  if (pontuacao === '4_5') return query.gte('pontuacao', 4).lte('pontuacao', 5);
  if (pontuacao === '6_7') return query.gte('pontuacao', 6).lte('pontuacao', 7);
  return query;
};

const applyFiltros = (query: FiscalizacaoFilterQuery, filtros: FiltroInfracao) => {
  let next = query.eq('ativo', true);

  const busca = filtros.busca.trim();
  if (busca) {
    const escaped = busca.replace(/,/g, ' ');
    next = next.or(
      `codigo.ilike.%${escaped}%,tipificacao_resumida.ilike.%${escaped}%,tipificacao_completa.ilike.%${escaped}%,amparo_legal.ilike.%${escaped}%`,
    );
  }

  if (filtros.gravidade.length > 0) {
    next = next.in('gravidade', filtros.gravidade);
  }

  if (filtros.categoria) {
    next = next.eq('categoria', filtros.categoria);
  }

  if (filtros.crimeTransito === 'sim') {
    next = next.eq('pode_configurar_crime', true);
  }

  if (filtros.crimeTransito === 'nao') {
    next = next.eq('pode_configurar_crime', false);
  }

  return applyPontuacaoFilter(next, filtros.pontuacao);
};

export const fiscalizacaoService = {
  async buscarInfracoes(filtros: FiltroInfracao): Promise<FiscalizacaoSearchResult> {
    const from = (filtros.page - 1) * filtros.limit;
    const to = from + filtros.limit - 1;

    const query = applyFiltros(
      supabase.from('fiscalizacao_infracoes').select('*', { count: 'exact' }),
      filtros,
    );

    const { data, error, count } = await query.order('codigo', { ascending: true }).range(from, to);

    if (error) throw error;

    return {
      data: (data || []) as FiscalizacaoInfracao[],
      total: count || 0,
    };
  },

  async buscarInfracaoPorCodigo(codigo: string): Promise<FiscalizacaoInfracao> {
    const { data, error } = await supabase
      .from('fiscalizacao_infracoes')
      .select('*')
      .eq('codigo', codigo)
      .eq('ativo', true)
      .single();

    if (error) throw error;
    return data as FiscalizacaoInfracao;
  },

  async buscarCategorias(): Promise<FiscalizacaoCategoria[]> {
    const [{ data: categorias, error: categoriasError }, { data: infracoes, error: infracoesError }] = await Promise.all([
      supabase.from('fiscalizacao_categorias').select('*').eq('ativo', true).order('ordem', { ascending: true }).order('nome', { ascending: true }),
      supabase.from('fiscalizacao_infracoes').select('categoria').eq('ativo', true),
    ]);

    if (categoriasError) throw categoriasError;
    if (infracoesError) throw infracoesError;

    const countMap = new Map<string, number>();
    for (const item of infracoes || []) {
      const categoria = item.categoria || 'Sem categoria';
      countMap.set(categoria, (countMap.get(categoria) || 0) + 1);
    }

    return ((categorias || []) as FiscalizacaoCategoria[]).map((item) => ({
      ...item,
      total_infracoes: countMap.get(item.nome) || 0,
    }));
  },

  async buscarInfracoesPorCategoria(categoria: string, filtros?: Partial<FiltroInfracao>): Promise<FiscalizacaoInfracao[]> {
    let query = supabase
      .from('fiscalizacao_infracoes')
      .select('*')
      .eq('ativo', true)
      .eq('categoria', categoria);

    if (filtros?.gravidade?.length) {
      query = query.in('gravidade', filtros.gravidade);
    }

    if (filtros?.pontuacao) {
      query = applyPontuacaoFilter(query, filtros.pontuacao);
    }

    const { data, error } = await query.order('codigo', { ascending: true });
    if (error) throw error;
    return (data || []) as FiscalizacaoInfracao[];
  },

  async sugestoesBusca(termo: string): Promise<FiscalizacaoSugestao[]> {
    const busca = termo.trim();
    if (busca.length < 2) return [];

    const { data, error } = await supabase
      .from('fiscalizacao_infracoes')
      .select('codigo, tipificacao_resumida')
      .eq('ativo', true)
      .or(`codigo.ilike.%${busca}%,tipificacao_resumida.ilike.%${busca}%`)
      .order('codigo', { ascending: true })
      .limit(10);

    if (error) throw error;

    return (data || []).map((item) => ({
      codigo: item.codigo,
      descricao: item.tipificacao_resumida,
    }));
  },
};
