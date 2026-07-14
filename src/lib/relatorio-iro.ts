import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface LinhaRelatorio {
  guarda: string;
  horas: number;
  valor: number;
}

interface LinhaCandidaturaDetalhada {
  nome: string;
  matricula: string;
  graduacao: string;
  data: string;
  horario: string;
  horas: number;
  valor: number;
  status: string;
}

interface OperacaoInfo {
  nome: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string;
  horario_previsto: string;
  vagas_por_dia: number;
  horas_por_dia: number;
}

export function gerarRelatorioOperacao(
  operacaoNome: string,
  linhas: LinhaRelatorio[],
  formato: 'pdf' | 'xlsx',
) {
  const totalHoras = linhas.reduce((s, l) => s + l.horas, 0);
  const totalValor = linhas.reduce((s, l) => s + l.valor, 0);

  if (formato === 'pdf') {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório IRO — ' + operacaoNome, 14, 20);
    doc.setFontSize(10);
    doc.text(new Date().toLocaleDateString('pt-BR'), 14, 28);

    const cabecalho = [['Guarda', 'Horas IRO', 'Valor (R$)']];
    const dados = linhas.map((l) => [
      l.guarda,
      l.horas.toFixed(1).replace('.', ','),
      l.valor.toFixed(2).replace('.', ','),
    ]);
    dados.push([
      'TOTAL',
      totalHoras.toFixed(1).replace('.', ','),
      totalValor.toFixed(2).replace('.', ','),
    ]);

    autoTable(doc, {
      head: cabecalho,
      body: dados,
      startY: 34,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] },
      footStyles: { fillColor: [241, 245, 249] },
      styles: { fontSize: 9 },
    });

    doc.save(`relatorio-iro-${operacaoNome.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    return;
  }

  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Guarda', 'Horas IRO', 'Valor (R$)'],
    ...linhas.map((l) => [l.guarda, l.horas, l.valor]),
    ['TOTAL', totalHoras, totalValor],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, operacaoNome.slice(0, 31));
  XLSX.writeFile(wb, `relatorio-iro-${operacaoNome.replace(/\s+/g, '-').toLowerCase()}.xlsx`);
}

export function gerarRelatorioMensal(
  mesAnoTitulo: string,
  linhas: LinhaRelatorio[],
  formato: 'pdf' | 'xlsx',
) {
  const totalHoras = linhas.reduce((s, l) => s + l.horas, 0);
  const totalValor = linhas.reduce((s, l) => s + l.valor, 0);

  if (formato === 'pdf') {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório IRO Mensal — ' + mesAnoTitulo, 14, 20);
    doc.setFontSize(10);
    doc.text(new Date().toLocaleDateString('pt-BR'), 14, 28);

    const cabecalho = [['Guarda', 'Total Horas IRO', 'Total Valor (R$)']];
    const dados = linhas.map((l) => [
      l.guarda,
      l.horas.toFixed(1).replace('.', ','),
      l.valor.toFixed(2).replace('.', ','),
    ]);
    dados.push([
      'TOTAL GERAL',
      totalHoras.toFixed(1).replace('.', ','),
      totalValor.toFixed(2).replace('.', ','),
    ]);

    autoTable(doc, {
      head: cabecalho,
      body: dados,
      startY: 34,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] },
      footStyles: { fillColor: [241, 245, 249] },
      styles: { fontSize: 9 },
    });

    doc.save(`relatorio-iro-mensal-${mesAnoTitulo.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    return;
  }

  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Guarda', 'Total Horas IRO', 'Total Valor (R$)'],
    ...linhas.map((l) => [l.guarda, l.horas, l.valor]),
    ['TOTAL GERAL', totalHoras, totalValor],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, mesAnoTitulo.slice(0, 31));
  XLSX.writeFile(wb, `relatorio-iro-mensal-${mesAnoTitulo.replace(/\s+/g, '-').toLowerCase()}.xlsx`);
}

export function gerarRelatorioDetalhadoOperacao(
  operacao: OperacaoInfo,
  candidatos: LinhaCandidaturaDetalhada[],
  formato: 'pdf' | 'xlsx',
) {
  const totalCandidatos = candidatos.length;
  const totalHoras = candidatos.reduce((s, l) => s + l.horas, 0);
  const totalValor = candidatos.reduce((s, l) => s + l.valor, 0);
  const dias = Math.max(1, Math.ceil((new Date(operacao.data_fim).getTime() - new Date(operacao.data_inicio).getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const capacidadeTotal = dias * operacao.vagas_por_dia;
  const confirmados = candidatos.filter((c) => c.status !== 'cancelado').length;

  if (formato === 'pdf') {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text('SMST — Guarda Municipal', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`Relatório Detalhado de Candidaturas — ${operacao.nome}`, pageWidth / 2, 28, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(10);
    const infoLines = [
      `Período: ${new Date(operacao.data_inicio).toLocaleDateString('pt-BR')} a ${new Date(operacao.data_fim).toLocaleDateString('pt-BR')}`,
      `Horário: ${operacao.horario_previsto.slice(0, 5)}  |  Horas/dia: ${operacao.horas_por_dia}h  |  Vagas/dia: ${operacao.vagas_por_dia}`,
      `Capacidade total: ${capacidadeTotal} vagas  |  Candidatos: ${totalCandidatos}  |  Confirmados/Realizados: ${confirmados}`,
    ];
    if (operacao.descricao) infoLines.push(`Descrição: ${operacao.descricao}`);
    let y = 42;
    for (const line of infoLines) {
      doc.text(line, 14, y);
      y += 6;
    }

    const cabecalho = [['Nome', 'Matrícula', 'Graduação', 'Data', 'Horário', 'Horas', 'Valor (R$)', 'Status']];
    const dados = candidatos.map((l) => [
      l.nome,
      l.matricula,
      l.graduacao,
      new Date(l.data).toLocaleDateString('pt-BR'),
      l.horario,
      l.horas.toFixed(1).replace('.', ','),
      l.valor.toFixed(2).replace('.', ','),
      l.status,
    ]);
    dados.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      totalHoras.toFixed(1).replace('.', ','),
      totalValor.toFixed(2).replace('.', ','),
      `${totalCandidatos} candidato(s)`,
    ]);

    autoTable(doc, {
      head: cabecalho,
      body: dados,
      startY: y + 4,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
      footStyles: { fillColor: [241, 245, 249], fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 22 },
        2: { cellWidth: 30 },
        3: { cellWidth: 28 },
        4: { cellWidth: 22 },
        5: { cellWidth: 18 },
        6: { cellWidth: 28 },
        7: { cellWidth: 30 },
      },
    });

    doc.save(`candidaturas-${operacao.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    return;
  }

  const wb = XLSX.utils.book_new();
  const wsData = [
    ['SMST - Guarda Municipal', '', '', '', '', '', '', ''],
    [`Relatório Detalhado de Candidaturas - ${operacao.nome}`, '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['Período', `${new Date(operacao.data_inicio).toLocaleDateString('pt-BR')} a ${new Date(operacao.data_fim).toLocaleDateString('pt-BR')}`, '', '', '', '', '', ''],
    ['Horário', operacao.horario_previsto.slice(0, 5), 'Vagas/dia', String(operacao.vagas_por_dia), 'Horas/dia', `${operacao.horas_por_dia}h`, 'Capacidade total', String(capacidadeTotal)],
    ['', '', '', '', '', '', '', ''],
    ['Nome', 'Matrícula', 'Graduação', 'Data', 'Horário', 'Horas', 'Valor (R$)', 'Status'],
    ...candidatos.map((l) => [
      l.nome,
      l.matricula,
      l.graduacao,
      new Date(l.data).toLocaleDateString('pt-BR'),
      l.horario,
      l.horas,
      l.valor,
      l.status,
    ]),
    ['', '', '', '', '', '', '', ''],
    ['TOTAL', '', '', '', '', totalHoras, totalValor, `${totalCandidatos} candidato(s)`],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 35 }, { wch: 14 }, { wch: 22 }, { wch: 14 },
    { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, operacao.nome.slice(0, 31));
  XLSX.writeFile(wb, `candidaturas-${operacao.nome.replace(/\s+/g, '-').toLowerCase()}.xlsx`);
}
