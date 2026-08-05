// Precificação de horas IRO pela graduação vigente na data da operação.
// A troca de graduação pode ser retroativa (data_a_partir), portanto o valor
// por hora é definido pela graduação que o guarda tinha na data_operacao.

export interface HistoricoGraduacao {
  guarda_id: string;
  graduacao_anterior_id: string | null;
  graduacao_id: string;
  data_a_partir: string;
}

export interface LinhaDoTempoGraduacao {
  /** '' indica a graduação-base (antes de qualquer evento registrado). */
  data: string;
  graduacao_id: string;
}

/**
 * Monta a linha do tempo de graduações de um guarda a partir do histórico de
 * promoções (de -> para na data_a_partir) e da graduação atual.
 */
export function montarLinhaDoTempoGraduacao(
  historico: HistoricoGraduacao[],
  graduacaoAtualId: string,
  dataGraduacaoAtual: string | null,
  hoje: string = new Date().toISOString().slice(0, 10),
): LinhaDoTempoGraduacao[] {
  const eventos = [...historico].sort((a, b) => a.data_a_partir.localeCompare(b.data_a_partir));
  const base = eventos[0]?.graduacao_anterior_id ?? graduacaoAtualId;

  const timeline: LinhaDoTempoGraduacao[] = [{ data: '', graduacao_id: base }];
  for (const evento of eventos) {
    timeline.push({ data: evento.data_a_partir, graduacao_id: evento.graduacao_id });
  }
  timeline.push({ data: dataGraduacaoAtual ?? hoje, graduacao_id: graduacaoAtualId });
  return timeline;
}

/**
 * Retorna a graduação vigente na data informada (mais recente evento com
 * data <= a data informada). Se nenhum evento se aplica, retorna a base.
 */
export function graduacaoVigenteEm(timeline: LinhaDoTempoGraduacao[], data: string): string {
  let vigente = timeline[0]?.graduacao_id ?? '';
  for (const evento of timeline) {
    if (evento.data && evento.data <= data) {
      vigente = evento.graduacao_id;
    }
  }
  return vigente;
}

/**
 * Valor por hora IRO vigente na data informada, conforme a graduação da época.
 */
export function valorHoraNaData(
  valorByGraduacao: ReadonlyMap<string, number>,
  timeline: LinhaDoTempoGraduacao[],
  data: string,
): number {
  const graduacaoId = graduacaoVigenteEm(timeline, data);
  return graduacaoId ? valorByGraduacao.get(graduacaoId) ?? 0 : 0;
}
