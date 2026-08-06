import type { ModuloSistema } from '@/types/admin';
import { MODULOS_POR_SETOR } from '@/types/admin';

const CODIGO_VISUALIZAR_POR_MODULO: Partial<Record<ModuloSistema, string>> = {
  veiculos: 'demutran.veiculos.visualizar',
  concessionarios: 'demutran.concessionarios.visualizar',
  credenciais: 'demutran.credenciais.visualizar',
  recursos: 'demutran.recursos.visualizar',
  frota: 'demutran.frota.visualizar',
  documentos: 'demutran.documentos.visualizar',
  iros: 'guarda_municipal.iros.visualizar',
  guardas: 'guarda_municipal.guardas.visualizar',
  guarda_escalas: 'guarda_municipal.escalas.visualizar',
  guarda_frota: 'guarda_municipal.frota.visualizar',
  guarda_equipes: 'guarda_municipal.equipes.visualizar',
  fiscalizacao: 'guarda_municipal.fiscalizacao.visualizar',
};

export function codigoVisualizarModulo(setorSlug: string | null | undefined, modulo: ModuloSistema): string | null {
  if (modulo === 'midias') {
    if (setorSlug === 'demutran') return 'demutran.midias.visualizar';
    if (setorSlug === 'guarda-municipal') return 'guarda_municipal.midias.visualizar';
    return null;
  }
  if (modulo === 'fala_cidadao') {
    if (setorSlug === 'demutran') return 'demutran.fala_cidadao.visualizar';
    if (setorSlug === 'guarda-municipal') return 'guarda_municipal.fala_cidadao.visualizar';
    return null;
  }
  if (modulo === 'ordens_servico') {
    if (setorSlug === 'demutran') return 'demutran.ordens_servico.visualizar';
    if (setorSlug === 'guarda-municipal') return 'guarda_municipal.ordens_servico.visualizar';
    return null;
  }
  return CODIGO_VISUALIZAR_POR_MODULO[modulo] ?? null;
}

export function codigosVisualizarDoSetor(setorSlug: string | null | undefined): string[] {
  const modulos = MODULOS_POR_SETOR[setorSlug ?? ''] ?? [];
  return modulos
    .map((m) => codigoVisualizarModulo(setorSlug, m.value))
    .filter((c): c is string => !!c);
}
