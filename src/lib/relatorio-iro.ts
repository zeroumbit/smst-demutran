import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface LinhaRelatorio {
  guarda: string;
  horas: number;
  valor: number;
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
