import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  carregarLogosSetor,
  desenharCabecalhoInstitucional,
  desenharMarcaDAgua,
  estiloTabelaInstitucional,
  SETOR_LINHA,
  type LogoPdf,
} from '@/utils/pdfInstitucional';

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
  logos: { municipio: LogoPdf; setor: LogoPdf },
  titulo: string,
  subtitulo: string,
  detalhes: string[],
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 14;
  const marginRight = pageWidth - 14;

  desenharMarcaDAgua(doc, logos.municipio);

  const startY = desenharCabecalhoInstitucional(doc, logos, titulo, {
    setorLinha: SETOR_LINHA['guarda-municipal'],
    tituloSubtitulo: subtitulo,
    detalhes,
  });

  const dataHoraGeracao = new Date().toLocaleString('pt-BR');
  const footerY = pageHeight - 16;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, footerY - 5, marginRight, footerY - 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Secretaria Municipal de Segurança Pública e Trânsito — SMST | Guarda Municipal de Canindé', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Documento emitido eletronicamente em ${dataHoraGeracao}`, pageWidth / 2, footerY + 4, { align: 'center' });

  return startY;
}

function addCabecalhoXlsx(titulo: string, subtitulo: string, detalhes: string[]): string[][] {
  const headerRows: string[][] = [
    ['ESTADO DO CEARÁ'],
    ['GOVERNO MUNICIPAL DE CANINDÉ'],
    ['SECRETARIA MUNICIPAL DE SEGURANÇA PÚBLICA E TRÂNSITO — SMST'],
    ['GUARDA CIVIL MUNICIPAL'],
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
            .doc-header { text-align: center; padding: 8px 0 0; }
            .l1, .l2, .l3 { margin: 2px 0; color: #0f172a; }
            .l1 { font-weight: 800; font-size: 13px; letter-spacing: 0.08em; }
            .l2 { font-weight: 800; font-size: 13px; }
            .l3 { font-size: 11px; font-weight: 600; }
            .l-setor { color: #1e3a8a; font-weight: 700; font-size: 12px; margin-top: 4px; }
            .sep { border: 0; border-top: 2px solid #1e3a8a; margin: 8px 0 14px; }
            h3 { margin: 0 0 12px; font-size: 16px; text-align: center; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; background: transparent; }
            tr:nth-child(even) td { background: transparent; }
          </style>
        </head>
        <body>
          <div class="doc-header">
            <p class="l1">ESTADO DO CEARÁ</p>
            <p class="l2">GOVERNO MUNICIPAL DE CANINDÉ</p>
            <p class="l3">SECRETARIA MUNICIPAL DE SEGURANÇA PÚBLICA E TRÂNSITO — SMST</p>
            <p class="l-setor">Guarda Civil Municipal</p>
          </div>
          <hr class="sep" />
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

export async function gerarRelatorioOperacao(
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
    const logos = await carregarLogosSetor('guarda-municipal');

    const detalhes = [`Gerado em: ${dataHoraGeracao}`];
    if (filtroLabel) detalhes.push(`Filtro: ${filtroLabel}`);

    const startY = addCabecalhoRodape(
      doc,
      logos,
      'RELATÓRIO DE HORAS IRO',
      `Operação: ${operacaoNome}`,
      detalhes,
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
      startY,
      ...estiloTabelaInstitucional({ fontSize: 9 }),
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

export async function gerarRelatorioMensal(
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
    const logos = await carregarLogosSetor('guarda-municipal');

    const detalhes = [`Gerado em: ${dataHoraGeracao}`];
    if (filtroLabel) detalhes.push(`Filtro: ${filtroLabel}`);

    const startY = addCabecalhoRodape(
      doc,
      logos,
      'RELATÓRIO DE HORAS IRO — MENSAL',
      `Referência: ${mesAnoTitulo}`,
      detalhes,
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
      startY,
      ...estiloTabelaInstitucional({ fontSize: 9 }),
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

export async function gerarRelatorioPorDia(
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
    const logos = await carregarLogosSetor('guarda-municipal');

    const detalhes = [`Gerado em: ${dataHoraGeracao}`];
    if (filtroLabel) detalhes.push(`Filtro: ${filtroLabel}`);

    let startY = addCabecalhoRodape(
      doc,
      logos,
      'RELATÓRIO DE HORAS IRO — POR DIA',
      `${operacao.nome} — ${dataBR}`,
      detalhes,
    );

    const infoLines = [
      `Horário: ${operacao.horario_previsto.slice(0, 5)}  |  Horas/dia: ${operacao.horas_por_dia}h  |  Vagas/dia: ${operacao.vagas_por_dia}`,
      `Candidatos no dia: ${totalCandidatos}`,
    ];
    startY += 2;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    for (const line of infoLines) {
      doc.text(line, 14, startY);
      startY += 5;
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
      startY: startY + 2,
      ...estiloTabelaInstitucional({ fontSize: 8 }),
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

export async function gerarRelatorioDetalhadoOperacao(
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
    const logos = await carregarLogosSetor('guarda-municipal');

    const detalhes = [`Gerado em: ${dataHoraGeracao}`];
    if (filtroLabel) detalhes.push(`Filtro: ${filtroLabel}`);

    let startY = addCabecalhoRodape(
      doc,
      logos,
      'RELATÓRIO DETALHADO DE CANDIDATURAS',
      `Operação: ${operacao.nome}`,
      detalhes,
    );

    const infoLines = [
      `Período: ${new Date(operacao.data_inicio).toLocaleDateString('pt-BR')} a ${new Date(operacao.data_fim).toLocaleDateString('pt-BR')}`,
      `Horário: ${operacao.horario_previsto.slice(0, 5)}  |  Horas/dia: ${operacao.horas_por_dia}h  |  Vagas/dia: ${operacao.vagas_por_dia}`,
      `Capacidade total: ${capacidadeTotal} vagas  |  Candidatos: ${totalCandidatos}  |  Confirmados/Realizados: ${confirmados}`,
    ];
    if (operacao.descricao) infoLines.push(`Descrição: ${operacao.descricao}`);
    startY += 2;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    for (const line of infoLines) {
      doc.text(line, 14, startY);
      startY += 5;
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
      startY: startY + 2,
      ...estiloTabelaInstitucional({ fontSize: 8 }),
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

export async function gerarRelatorioPorGuarda(
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
    const logos = await carregarLogosSetor('guarda-municipal');

    const detalhes = [`Gerado em: ${dataHoraGeracao}`];
    if (filtroLabel) detalhes.push(`Filtro: ${filtroLabel}`);

    let startY = addCabecalhoRodape(
      doc,
      logos,
      'RELATÓRIO DE HORAS IRO — POR GUARDA',
      `Guarda: ${guarda.nome}`,
      detalhes,
    );

    const infoLines = [
      `Matrícula: ${guarda.matricula || '—'}  |  Graduação: ${guarda.graduacao || '—'}`,
      `Candidaturas: ${totalCandidatos}  |  Confirmadas/Realizadas: ${confirmados}  |  Total de horas: ${totalHoras.toFixed(1).replace('.', ',')}h`,
    ];
    startY += 2;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    for (const line of infoLines) {
      doc.text(line, 14, startY);
      startY += 5;
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
      startY: startY + 2,
      ...estiloTabelaInstitucional({ fontSize: 8 }),
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
