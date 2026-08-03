import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface LinhaRelatorio {
  guarda: string;
  horas: number;
  data: string;
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

interface LinhaRelatorioGuarda extends LinhaCandidaturaDetalhada {
  operacao: string;
}

interface InfoGuarda {
  nome: string;
  matricula: string;
  graduacao: string;
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

function addCabecalhoRodape(
  doc: jsPDF,
  titulo: string,
  subtitulo: string,
  detalhes: string[],
  startY: number,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = pageWidth - 14;

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('SECRETARIA MUNICIPAL DE SEGURANÇA E TRANSPORTE — SMST', pageWidth / 2, 14, { align: 'center' });
  doc.setFontSize(11);
  doc.text('GUARDA MUNICIPAL', pageWidth / 2, 21, { align: 'center' });

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(marginLeft, 25, marginRight, 25);

  doc.setFontSize(13);
  doc.text(titulo, pageWidth / 2, 33, { align: 'center' });
  doc.setFontSize(10);
  doc.text(subtitulo, pageWidth / 2, 40, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(detalhes.join('  |  '), pageWidth / 2, 47, { align: 'center' });

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, 51, marginRight, 51);

  const dataHoraGeracao = new Date().toLocaleString('pt-BR');
  const finalY = (doc as any).lastAutoTable?.finalY || startY;
  const bottomY = Math.max(finalY + 10, 270);

  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(`SMST — Guarda Municipal  |  Gerado em: ${dataHoraGeracao}`, pageWidth / 2, bottomY, { align: 'center' });

  return 55;
}

function addCabecalhoXlsx(titulo: string, subtitulo: string, detalhes: string[]): string[][] {
  const headerRows: string[][] = [
    ['SECRETARIA MUNICIPAL DE SEGURANÇA E TRANSPORTE — SMST'],
    ['GUARDA MUNICIPAL'],
    [],
    [titulo],
    [subtitulo],
    [detalhes.join('  |  ')],
    [],
  ];
  return headerRows;
}

export type SaidaRelatorio = 'download' | 'imprimir';

function salvarOuImprimirPdf(doc: jsPDF, nomeArquivo: string, saida: SaidaRelatorio) {
  if (saida === 'imprimir') {
    doc.autoPrint();
    const url = doc.output('datauristring');
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(
        `<html><head><title>${nomeArquivo}</title></head><body style="margin:0">` +
          `<embed src="${url}" type="application/pdf" width="100%" height="100%" style="border:none" />` +
          `</body></html>`,
      );
      win.document.close();
    }
    return;
  }
  doc.save(nomeArquivo);
}

function salvarOuImprimirXlsx(
  wb: XLSX.WorkBook,
  nomeArquivo: string,
  saida: SaidaRelatorio,
  tituloImpressao: string,
  wsData: (string | number)[][],
) {
  if (saida === 'imprimir') {
    const esc = (v: unknown) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const rows = wsData
      .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
      .join('');
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>${esc(tituloImpressao)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; }
            .cabecalho { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px; }
            .cabecalho h1 { font-size: 15px; margin: 0; letter-spacing: 0.08em; }
            .cabecalho h2 { font-size: 12px; margin: 0; color: #475569; }
            h3 { margin: 0 0 12px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; }
            th { background: #e2e8f0; }
            tr:nth-child(even) td { background: #f8fafc; }
          </style>
        </head>
        <body>
          <div class="cabecalho">
            <h1>SECRETARIA MUNICIPAL DE SEGURANÇA E TRANSPORTE — SMST</h1>
            <h2>GUARDA MUNICIPAL</h2>
          </div>
          <h3>${esc(tituloImpressao)}</h3>
          <table><tbody>${rows}</tbody></table>
        </body>
      </html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '800px';
    iframe.style.height = '600px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    iframe.contentDocument!.open();
    iframe.contentDocument!.write(html);
    iframe.contentDocument!.close();
    iframe.onload = () => {
      window.setTimeout(() => {
        iframe.contentWindow!.print();
        window.setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 2000);
    };
    if (iframe.contentDocument!.readyState === 'complete') {
      iframe.onload!(new Event('load'));
    }
    return;
  }
  XLSX.writeFile(wb, nomeArquivo);
}

export function gerarRelatorioOperacao(
  operacaoNome: string,
  linhas: LinhaRelatorio[],
  formato: 'pdf' | 'xlsx',
  filtroLabel?: string,
  saida?: SaidaRelatorio,
) {
  const totalHoras = linhas.reduce((s, l) => s + l.horas, 0);
  const agora = new Date();
  const dataHoraGeracao = agora.toLocaleString('pt-BR');

  if (formato === 'pdf') {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const detalhes = [`Gerado em: ${dataHoraGeracao}`];
    if (filtroLabel) detalhes.push(`Filtro: ${filtroLabel}`);

    addCabecalhoRodape(
      doc,
      'RELATÓRIO DE HORAS IRO',
      `Operação: ${operacaoNome}`,
      detalhes,
      55,
    );

    const cabecalho = [['Guarda', 'Horas IRO', 'Data']];
    const dados = linhas.map((l) => [
      l.guarda,
      l.horas.toFixed(1).replace('.', ','),
      new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR'),
    ]);
    if (dados.length > 0) {
      dados.push(['TOTAL', totalHoras.toFixed(1).replace('.', ','), '']);
    }

    autoTable(doc, {
      head: cabecalho,
      body: dados,
      startY: 55,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] },
      footStyles: { fillColor: [241, 245, 249] },
      styles: { fontSize: 9 },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(
          `Página ${pageCount}`,
          pageWidth / 2,
          290,
          { align: 'center' },
        );
      },
    });

    salvarOuImprimirPdf(doc, `relatorio-iro-${operacaoNome.replace(/\s+/g, '-').toLowerCase()}.pdf`, saida ?? 'download');
    return;
  }

  const wb = XLSX.utils.book_new();
  const agoraStr = `${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR')}`;
  const detalhesStr = [`Gerado em: ${agoraStr}`];
  if (filtroLabel) detalhesStr.push(`Filtro: ${filtroLabel}`);
  const headerRows = addCabecalhoXlsx('RELATÓRIO DE HORAS IRO', `Operação: ${operacaoNome}`, detalhesStr);
  const wsData = [
    ...headerRows.map((r) => [...r, '', '']),
    ['Guarda', 'Horas IRO', 'Data'],
    ...linhas.map((l) => [l.guarda, l.horas, l.data]),
  ];
  if (linhas.length > 0) {
    wsData.push(['TOTAL', totalHoras, '']);
  }
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 40 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, operacaoNome.slice(0, 31));
  salvarOuImprimirXlsx(
    wb,
    `relatorio-iro-${operacaoNome.replace(/\s+/g, '-').toLowerCase()}.xlsx`,
    saida ?? 'download',
    `Relatório de Horas IRO — Operação: ${operacaoNome}`,
    wsData,
  );
}

export function gerarRelatorioMensal(
  mesAnoTitulo: string,
  linhas: LinhaRelatorio[],
  formato: 'pdf' | 'xlsx',
  filtroLabel?: string,
  saida?: SaidaRelatorio,
) {
  const totalHoras = linhas.reduce((s, l) => s + l.horas, 0);
  const agora = new Date();
  const dataHoraGeracao = agora.toLocaleString('pt-BR');

  if (formato === 'pdf') {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const detalhes = [`Gerado em: ${dataHoraGeracao}`];
    if (filtroLabel) detalhes.push(`Filtro: ${filtroLabel}`);

    addCabecalhoRodape(
      doc,
      'RELATÓRIO DE HORAS IRO — MENSAL',
      `Referência: ${mesAnoTitulo}`,
      detalhes,
      55,
    );

    const cabecalho = [['Guarda', 'Horas IRO', 'Data']];
    const dados = linhas.map((l) => [
      l.guarda,
      l.horas.toFixed(1).replace('.', ','),
      new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR'),
    ]);
    if (dados.length > 0) {
      dados.push(['TOTAL GERAL', totalHoras.toFixed(1).replace('.', ','), '']);
    }

    autoTable(doc, {
      head: cabecalho,
      body: dados,
      startY: 55,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] },
      footStyles: { fillColor: [241, 245, 249] },
      styles: { fontSize: 9 },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(
          `Página ${pageCount}`,
          pageWidth / 2,
          290,
          { align: 'center' },
        );
      },
    });

    salvarOuImprimirPdf(doc, `relatorio-iro-mensal-${mesAnoTitulo.replace(/\s+/g, '-').toLowerCase()}.pdf`, saida ?? 'download');
    return;
  }

  const wb = XLSX.utils.book_new();
  const agoraStr = `${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR')}`;
  const detalhesStr = [`Gerado em: ${agoraStr}`];
  if (filtroLabel) detalhesStr.push(`Filtro: ${filtroLabel}`);
  const headerRows = addCabecalhoXlsx('RELATÓRIO DE HORAS IRO — MENSAL', `Referência: ${mesAnoTitulo}`, detalhesStr);
  const wsData = [
    ...headerRows.map((r) => [...r, '', '']),
    ['Guarda', 'Horas IRO', 'Data'],
    ...linhas.map((l) => [l.guarda, l.horas, l.data]),
  ];
  if (linhas.length > 0) {
    wsData.push(['TOTAL GERAL', totalHoras, '']);
  }
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 40 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, mesAnoTitulo.slice(0, 31));
  salvarOuImprimirXlsx(
    wb,
    `relatorio-iro-mensal-${mesAnoTitulo.replace(/\s+/g, '-').toLowerCase()}.xlsx`,
    saida ?? 'download',
    `Relatório de Horas IRO — Mensal (${mesAnoTitulo})`,
    wsData,
  );
}

export function gerarRelatorioPorDia(
  operacao: OperacaoInfo,
  data: string,
  candidatos: LinhaCandidaturaDetalhada[],
  formato: 'pdf' | 'xlsx',
  filtroLabel?: string,
  saida?: SaidaRelatorio,
) {
  const totalCandidatos = candidatos.length;
  const totalHoras = candidatos.reduce((s, l) => s + l.horas, 0);
  const totalValor = candidatos.reduce((s, l) => s + l.valor, 0);
  const dataBR = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
  const agora = new Date();
  const dataHoraGeracao = agora.toLocaleString('pt-BR');

  if (formato === 'pdf') {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();

    const detalhes = [`Gerado em: ${dataHoraGeracao}`];
    if (filtroLabel) detalhes.push(`Filtro: ${filtroLabel}`);

    addCabecalhoRodape(
      doc,
      'RELATÓRIO DE HORAS IRO — POR DIA',
      `${operacao.nome} — ${dataBR}`,
      detalhes,
      55,
    );

    const infoLines = [
      `Horário: ${operacao.horario_previsto.slice(0, 5)}  |  Horas/dia: ${operacao.horas_por_dia}h  |  Vagas/dia: ${operacao.vagas_por_dia}`,
      `Candidatos no dia: ${totalCandidatos}`,
    ];
    let y = 58;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    for (const line of infoLines) {
      doc.text(line, 14, y);
      y += 5;
    }

    const cabecalho = [['Nome', 'Matrícula', 'Graduação', 'Horário', 'Horas', 'Valor (R$)', 'Status']];
    const dados = candidatos.map((l) => [
      l.nome,
      l.matricula,
      l.graduacao,
      l.horario,
      l.horas.toFixed(1).replace('.', ','),
      l.valor.toFixed(2).replace('.', ','),
      l.status,
    ]);
    if (dados.length > 0) {
      dados.push(['TOTAL', '', '', '', totalHoras.toFixed(1).replace('.', ','), totalValor.toFixed(2).replace('.', ','), `${totalCandidatos} candidato(s)`]);
    }

    autoTable(doc, {
      head: cabecalho,
      body: dados,
      startY: y + 2,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
      footStyles: { fillColor: [241, 245, 249], fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 22 },
        2: { cellWidth: 30 },
        3: { cellWidth: 22 },
        4: { cellWidth: 18 },
        5: { cellWidth: 28 },
        6: { cellWidth: 30 },
      },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(`Página ${pageCount}`, pageWidth / 2, 200, { align: 'center' });
      },
    });

    salvarOuImprimirPdf(doc, `relatorio-iro-dia-${data}.pdf`, saida ?? 'download');
    return;
  }

  const wb = XLSX.utils.book_new();
  const detalhesStr = [`Gerado em: ${dataHoraGeracao}`];
  if (filtroLabel) detalhesStr.push(`Filtro: ${filtroLabel}`);
  const headerRows = addCabecalhoXlsx('RELATÓRIO DE HORAS IRO — POR DIA', `${operacao.nome} — ${dataBR}`, detalhesStr);
  const wsData = [
    ...headerRows.map((r) => [...r, '', '', '', '', '', '']),
    ['Operação', operacao.nome, 'Data', dataBR, '', '', ''],
    ['Horário', operacao.horario_previsto.slice(0, 5), 'Vagas/dia', String(operacao.vagas_por_dia), 'Horas/dia', `${operacao.horas_por_dia}h`, ''],
    ['', '', '', '', '', '', ''],
    ['Nome', 'Matrícula', 'Graduação', 'Horário', 'Horas', 'Valor (R$)', 'Status'],
    ...candidatos.map((l) => [
      l.nome, l.matricula, l.graduacao,
      l.horario, l.horas, l.valor, l.status,
    ]),
    ['', '', '', '', '', '', ''],
    ['TOTAL', '', '', '', totalHoras, totalValor, `${totalCandidatos} candidato(s)`],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 35 }, { wch: 14 }, { wch: 22 }, { wch: 12 },
    { wch: 10 }, { wch: 14 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, data.slice(0, 31));
  salvarOuImprimirXlsx(
    wb,
    `relatorio-iro-dia-${data}.xlsx`,
    saida ?? 'download',
    `Relatório de Horas IRO — Por Dia (${operacao.nome} — ${dataBR})`,
    wsData,
  );
}

export function gerarRelatorioDetalhadoOperacao(
  operacao: OperacaoInfo,
  candidatos: LinhaCandidaturaDetalhada[],
  formato: 'pdf' | 'xlsx',
  filtroLabel?: string,
  saida?: SaidaRelatorio,
) {
  const totalCandidatos = candidatos.length;
  const totalHoras = candidatos.reduce((s, l) => s + l.horas, 0);
  const totalValor = candidatos.reduce((s, l) => s + l.valor, 0);
  const dias = Math.max(1, Math.ceil((new Date(operacao.data_fim).getTime() - new Date(operacao.data_inicio).getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const capacidadeTotal = dias * operacao.vagas_por_dia;
  const confirmados = candidatos.filter((c) => c.status !== 'cancelado').length;
  const agora = new Date();
  const dataHoraGeracao = agora.toLocaleString('pt-BR');

  if (formato === 'pdf') {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();

    const detalhes = [`Gerado em: ${dataHoraGeracao}`];
    if (filtroLabel) detalhes.push(`Filtro: ${filtroLabel}`);

    addCabecalhoRodape(
      doc,
      'RELATÓRIO DETALHADO DE CANDIDATURAS',
      `Operação: ${operacao.nome}`,
      detalhes,
      55,
    );

    const infoLines = [
      `Período: ${new Date(operacao.data_inicio).toLocaleDateString('pt-BR')} a ${new Date(operacao.data_fim).toLocaleDateString('pt-BR')}`,
      `Horário: ${operacao.horario_previsto.slice(0, 5)}  |  Horas/dia: ${operacao.horas_por_dia}h  |  Vagas/dia: ${operacao.vagas_por_dia}`,
      `Capacidade total: ${capacidadeTotal} vagas  |  Candidatos: ${totalCandidatos}  |  Confirmados/Realizados: ${confirmados}`,
    ];
    if (operacao.descricao) infoLines.push(`Descrição: ${operacao.descricao}`);
    let y = 58;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    for (const line of infoLines) {
      doc.text(line, 14, y);
      y += 5;
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
    if (dados.length > 0) {
      dados.push(['TOTAL', '', '', '', '', totalHoras.toFixed(1).replace('.', ','), totalValor.toFixed(2).replace('.', ','), `${totalCandidatos} candidato(s)`]);
    }

    autoTable(doc, {
      head: cabecalho,
      body: dados,
      startY: y + 2,
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
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(`Página ${pageCount}`, pageWidth / 2, 200, { align: 'center' });
      },
    });

    salvarOuImprimirPdf(doc, `candidaturas-${operacao.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`, saida ?? 'download');
    return;
  }

  const wb = XLSX.utils.book_new();
  const detalhesStr = [`Gerado em: ${dataHoraGeracao}`];
  if (filtroLabel) detalhesStr.push(`Filtro: ${filtroLabel}`);
  const headerRows = addCabecalhoXlsx('RELATÓRIO DETALHADO DE CANDIDATURAS', `Operação: ${operacao.nome}`, detalhesStr);
  const wsData = [
    ...headerRows.map((r) => [...r, '', '', '', '', '', '', '']),
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
  salvarOuImprimirXlsx(
    wb,
    `candidaturas-${operacao.nome.replace(/\s+/g, '-').toLowerCase()}.xlsx`,
    saida ?? 'download',
    `Relatório Detalhado de Candidaturas — ${operacao.nome}`,
    wsData,
  );
}

export function gerarRelatorioPorGuarda(
  guarda: InfoGuarda,
  candidatos: LinhaRelatorioGuarda[],
  formato: 'pdf' | 'xlsx',
  filtroLabel?: string,
  saida?: SaidaRelatorio,
) {
  const totalCandidatos = candidatos.length;
  const totalHoras = candidatos.reduce((s, l) => s + l.horas, 0);
  const totalValor = candidatos.reduce((s, l) => s + l.valor, 0);
  const confirmados = candidatos.filter((c) => c.status !== 'cancelado').length;
  const agora = new Date();
  const dataHoraGeracao = agora.toLocaleString('pt-BR');

  if (formato === 'pdf') {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();

    const detalhes = [`Gerado em: ${dataHoraGeracao}`];
    if (filtroLabel) detalhes.push(`Filtro: ${filtroLabel}`);

    addCabecalhoRodape(
      doc,
      'RELATÓRIO DE HORAS IRO — POR GUARDA',
      `Guarda: ${guarda.nome}`,
      detalhes,
      55,
    );

    const infoLines = [
      `Matrícula: ${guarda.matricula || '—'}  |  Graduação: ${guarda.graduacao || '—'}`,
      `Candidaturas: ${totalCandidatos}  |  Confirmadas/Realizadas: ${confirmados}  |  Total de horas: ${totalHoras.toFixed(1).replace('.', ',')}h`,
    ];
    let y = 58;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    for (const line of infoLines) {
      doc.text(line, 14, y);
      y += 5;
    }

    const cabecalho = [['Operação', 'Data', 'Horário', 'Horas', 'Valor (R$)', 'Status']];
    const dados = candidatos.map((l) => [
      l.operacao,
      new Date(l.data).toLocaleDateString('pt-BR'),
      l.horario || '—',
      l.horas.toFixed(1).replace('.', ','),
      l.valor.toFixed(2).replace('.', ','),
      l.status,
    ]);
    if (dados.length > 0) {
      dados.push(['TOTAL', '', '', totalHoras.toFixed(1).replace('.', ','), totalValor.toFixed(2).replace('.', ','), `${confirmados} confirmada(s)`]);
    }

    autoTable(doc, {
      head: cabecalho,
      body: dados,
      startY: y + 2,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
      footStyles: { fillColor: [241, 245, 249], fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 28 },
        2: { cellWidth: 22 },
        3: { cellWidth: 18 },
        4: { cellWidth: 28 },
        5: { cellWidth: 30 },
      },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(`Página ${pageCount}`, pageWidth / 2, 200, { align: 'center' });
      },
    });

    salvarOuImprimirPdf(doc, `relatorio-iro-guarda-${guarda.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`, saida ?? 'download');
    return;
  }

  const wb = XLSX.utils.book_new();
  const detalhesStr = [`Gerado em: ${dataHoraGeracao}`];
  if (filtroLabel) detalhesStr.push(`Filtro: ${filtroLabel}`);
  const headerRows = addCabecalhoXlsx('RELATÓRIO DE HORAS IRO — POR GUARDA', `Guarda: ${guarda.nome}`, detalhesStr);
  const wsData = [
    ...headerRows.map((r) => [...r, '', '', '', '', '']),
    ['Matrícula', guarda.matricula || '—', 'Graduação', guarda.graduacao || '—', '', ''],
    ['Operação', 'Data', 'Horário', 'Horas', 'Valor (R$)', 'Status'],
    ...candidatos.map((l) => [
      l.operacao,
      new Date(l.data).toLocaleDateString('pt-BR'),
      l.horario,
      l.horas,
      l.valor,
      l.status,
    ]),
    ['', '', '', '', '', ''],
    ['TOTAL', '', '', totalHoras, totalValor, `${confirmados} confirmada(s)`],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 40 }, { wch: 14 }, { wch: 12 },
    { wch: 10 }, { wch: 14 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, `Guarda ${guarda.nome.slice(0, 27)}`);
  salvarOuImprimirXlsx(
    wb,
    `relatorio-iro-guarda-${guarda.nome.replace(/\s+/g, '-').toLowerCase()}.xlsx`,
    saida ?? 'download',
    `Relatório de Horas IRO — Guarda ${guarda.nome}`,
    wsData,
  );
}
