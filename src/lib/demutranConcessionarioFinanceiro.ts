import type { DemutranConcessionario } from '@/types/admin';

export type ConcessionarioFinanceiroStatus = 'pago' | 'prazo_aberto' | 'em_debito';

const extractYear = (value: string | null | undefined) => {
  if (!value) return null;

  const yearMatch = String(value).match(/\b(20\d{2})\b/);
  if (yearMatch) return Number(yearMatch[1]);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getFullYear();
};

export const getConcessionarioFinancialStatus = (
  concessionario: Pick<DemutranConcessionario, 'exercicio' | 'ultimo_alvara'>,
  referenceDate = new Date(),
): ConcessionarioFinanceiroStatus => {
  const currentYear = referenceDate.getFullYear();
  const deadline = new Date(currentYear, 1, 1);
  const exercicioYear = extractYear(concessionario.exercicio);
  const alvaraYear = extractYear(concessionario.ultimo_alvara);
  const regularizedYear = exercicioYear ?? alvaraYear;

  if (regularizedYear !== null && regularizedYear >= currentYear) {
    return 'pago';
  }

  return referenceDate >= deadline ? 'em_debito' : 'prazo_aberto';
};

export const getConcessionarioFinancialCopy = (
  concessionario: Pick<DemutranConcessionario, 'exercicio' | 'ultimo_alvara'>,
  referenceDate = new Date(),
) => {
  const status = getConcessionarioFinancialStatus(concessionario, referenceDate);
  const currentYear = referenceDate.getFullYear();

  if (status === 'pago') {
    return {
      status,
      label: 'Taxas pagas',
      description: `Regularizado para o exercicio de ${currentYear}.`,
    };
  }

  if (status === 'prazo_aberto') {
    return {
      status,
      label: 'Prazo em aberto',
      description: `O pagamento das taxas de ${currentYear} pode ser feito ate 31 de janeiro.`,
    };
  }

  return {
    status,
    label: 'Em debito',
    description: `As taxas de ${currentYear} nao foram identificadas. Desde 1 de fevereiro o cadastro fica em debito.`,
  };
};
