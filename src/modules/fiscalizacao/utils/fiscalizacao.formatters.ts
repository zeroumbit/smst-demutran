import type { FiscalizacaoGravidade } from '../types/fiscalizacao.types';

export function formatarPontuacaoFiscalizacao(
  pontuacao: number,
  gravidade: FiscalizacaoGravidade,
): string {
  if (gravidade === 'nao_aplicavel') {
    return 'Não aplicável';
  }

  return pontuacao > 0 ? `${pontuacao} ponto(s)` : 'Não computável';
}
