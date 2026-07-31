import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OrdemServico } from '@/types/ordem-servico.types';
import municipioLogo from '@/logo/municipio.png';
import guardaLogo from '@/logo/guarda.png';
import demutranLogo from '@/logo/demutran.png';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

interface LogoImage {
  img: HTMLImageElement | null;
  aspect: number;
}

async function loadLogo(src: string): Promise<LogoImage> {
  try {
    const img = await loadImage(src);
    const aspect = img.naturalWidth / img.naturalHeight;
    return { img, aspect: aspect || 1 };
  } catch {
    return { img: null, aspect: 1 };
  }
}

export async function montarPdfOrdemServico(ordem: OrdemServico): Promise<{ doc: jsPDF; nomeArquivo: string }> {
  const [logoMunicipio, logoGuarda, logoDemutran] = await Promise.all([
    loadLogo(municipioLogo),
    loadLogo(guardaLogo),
    loadLogo(demutranLogo),
  ]);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 14;
  const marginRight = 14;

  // --- Marca d'água: logo do Município/Secretaria em alta resolução, ao fundo ---
  if (logoMunicipio.img) {
    const wmHeight = 130;
    const wmWidth = wmHeight * logoMunicipio.aspect;
    doc.saveGraphicsState();
    const gState = doc.GState({ opacity: 0.08 });
    doc.setGState(gState);
    doc.addImage(
      logoMunicipio.img,
      'PNG',
      (pageWidth - wmWidth) / 2,
      (pageHeight - wmHeight) / 2,
      wmWidth,
      wmHeight,
    );
    doc.restoreGraphicsState();
  }

  // --- TOPO: Logos (Secretaria, Guarda e Demutran) lado a lado, proporção preservada ---
  const logoHeight = 22;
  const gap = 6;

  const logos = [logoMunicipio, logoGuarda, logoDemutran].filter((l) => l.img);
  const logoWidths = logos.map((l) => logoHeight * l.aspect);
  const totalLogosWidth = logoWidths.reduce((acc, w) => acc + w, 0) + gap * (logos.length - 1);
  let logosStartX = (pageWidth - totalLogosWidth) / 2;

  logos.forEach((l, idx) => {
    doc.addImage(l.img!, 'PNG', logosStartX, 8, logoWidths[idx], logoHeight);
    logosStartX += logoWidths[idx] + gap;
  });

  let currentY = 8 + logoHeight + 6;

  // --- Texto institucional centralizado ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('ESTADO DO CEARÁ', pageWidth / 2, currentY, { align: 'center' });
  currentY += 4.5;

  doc.setFontSize(9);
  doc.text('GOVERNO MUNICIPAL DE CANINDÉ', pageWidth / 2, currentY, { align: 'center' });
  currentY += 4.5;

  doc.setFontSize(8.5);
  doc.text('SECRETARIA MUNICIPAL DE SEGURANÇA E TRÂNSITO — SMST', pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text('Guarda Civil Municipal', pageWidth / 2, currentY, { align: 'center' });
  currentY += 4;

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Departamento Municipal de Trânsito', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  // Linha separadora
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.6);
  doc.line(marginLeft, currentY, pageWidth - marginRight, currentY);
  currentY += 5;

  // Marca D'água textual se CANCELADA ou SUBSTITUÍDA
  if (ordem.status === 'CANCELADA') {
    doc.saveGraphicsState();
    doc.setFontSize(48);
    doc.setTextColor(239, 68, 68);
    doc.text('CANCELADA', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();
  } else if (ordem.status === 'SUBSTITUIDA') {
    doc.saveGraphicsState();
    doc.setFontSize(40);
    doc.setTextColor(245, 158, 11);
    doc.text('SUBSTITUÍDA (v' + ordem.versao + ')', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();
  }

  // Title Box
  const numFmt = ordem.numero_formatado || `Rascunho ${ordem.id.slice(0, 8)}`;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`ORDEM DE SERVIÇO — ${numFmt}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 4;

  // Tabela 1: Identificação da Demanda
  const dadosIdentificacao = [
    [
      { content: 'NÚMERO:', styles: { fontStyle: 'bold' } },
      numFmt,
      { content: 'DATA DE EMISSÃO:', styles: { fontStyle: 'bold' } },
      new Date(ordem.data_emissao + 'T00:00:00').toLocaleDateString('pt-BR'),
    ],
    [
      { content: 'ORIGEM DA O.S.:', styles: { fontStyle: 'bold' } },
      ordem.origem === 'Outro' ? (ordem.origem_outros || 'Outro') : ordem.origem,
      { content: 'DOC. ORIGEM:', styles: { fontStyle: 'bold' } },
      ordem.numero_documento_origem || 'Não informado',
    ],
    [
      { content: 'ASSUNTO:', styles: { fontStyle: 'bold' } },
      { content: ordem.assunto, colSpan: 3, styles: { fontStyle: 'bold', textColor: [30, 58, 138] } },
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginLeft, right: marginRight },
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    body: dadosIdentificacao,
    styles: { fontSize: 9, cellPadding: 3, textColor: [15, 23, 42] },
  });

  // Tabela 2: Dados da Execução Operacional
  currentY = (doc as any).lastAutoTable.finalY + 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('DADOS DA EXECUÇÃO OPERACIONAL', marginLeft, currentY);
  currentY += 3;

  const dataFimStr = ordem.data_execucao_fim
    ? new Date(ordem.data_execucao_fim + 'T00:00:00').toLocaleDateString('pt-BR')
    : 'Mesmo dia';

  const horaFimStr = ordem.ate_termino ? 'Até o término do serviço' : (ordem.hora_fim || 'Não informado');

  const dadosExecucao = [
    [
      { content: 'PERÍODO:', styles: { fontStyle: 'bold' } },
      `${new Date(ordem.data_execucao_inicio + 'T00:00:00').toLocaleDateString('pt-BR')} até ${dataFimStr}`,
      { content: 'HORÁRIO:', styles: { fontStyle: 'bold' } },
      `${ordem.hora_inicio} hs — ${horaFimStr}`,
    ],
    [
      { content: 'LOCAL DE EXECUÇÃO:', styles: { fontStyle: 'bold' } },
      { content: ordem.local_execucao, colSpan: 3 },
    ],
    [
      { content: 'PONTO DE APRESENTAÇÃO:', styles: { fontStyle: 'bold' } },
      { content: ordem.ponto_apresentacao || 'Local da ocorrência / execução', colSpan: 3 },
    ],
    [
      { content: 'DESCRIÇÃO DA MISSÃO:', styles: { fontStyle: 'bold' } },
      { content: ordem.descricao, colSpan: 3 },
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginLeft, right: marginRight },
    theme: 'grid',
    body: dadosExecucao,
    styles: { fontSize: 9, cellPadding: 3, textColor: [15, 23, 42] },
  });

  // Tabela 3: Solicitante (quando houver)
  if (ordem.solicitante_nome || ordem.solicitante_orgao) {
    currentY = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('DADOS DO SOLICITANTE', marginLeft, currentY);
    currentY += 3;

    const dadosSolicitante = [
      [
        { content: 'SOLICITANTE:', styles: { fontStyle: 'bold' } },
        ordem.solicitante_nome || 'Não informado',
        { content: 'ÓRGÃO / INSTITUIÇÃO:', styles: { fontStyle: 'bold' } },
        ordem.solicitante_orgao || 'Não informado',
      ],
      [
        { content: 'FUNÇÃO / CARGO:', styles: { fontStyle: 'bold' } },
        ordem.solicitante_funcao || 'Não informado',
        { content: 'CONTATO:', styles: { fontStyle: 'bold' } },
        [ordem.solicitante_telefone, ordem.solicitante_whatsapp, ordem.solicitante_email].filter(Boolean).join(' / ') || 'Não informado',
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginLeft, right: marginRight },
      theme: 'grid',
      body: dadosSolicitante,
      styles: { fontSize: 9, cellPadding: 3, textColor: [15, 23, 42] },
    });
  }

  // Tabela 4: Equipes Destinatárias
  currentY = (doc as any).lastAutoTable.finalY + 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('EQUIPES DESTINATÁRIAS E DISTRIBUIÇÃO', marginLeft, currentY);
  currentY += 3;

  const equipesBody = (ordem.equipes || []).map((eq) => [
    eq.equipe_nome,
    eq.lider_nome || 'Não informado',
    eq.primeira_visualizacao_em
      ? new Date(eq.primeira_visualizacao_em).toLocaleString('pt-BR')
      : 'Pendente',
  ]);

  if (equipesBody.length === 0) {
    equipesBody.push(['Todas as Equipes Operacionais', 'Comandante de Turno', 'Distribuído geral']);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginLeft, right: marginRight },
    theme: 'grid',
    head: [['Equipe Responsável', 'Responsável no Momento', 'Status de Acesso']],
    body: equipesBody,
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [15, 23, 42] },
  });

  // Observações Operacionais (se houver)
  if (ordem.observacoes) {
    currentY = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('OBSERVAÇÕES OPERACIONAIS', marginLeft, currentY);
    currentY += 3;

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginLeft, right: marginRight },
      theme: 'grid',
      body: [[{ content: ordem.observacoes }]],
      styles: { fontSize: 8.5, cellPadding: 4, textColor: [15, 23, 42] },
    });
  }

  // Rodapé Institucional
  const footerY = pageHeight - 16;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, footerY - 5, pageWidth - marginRight, footerY - 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Secretaria Municipal de Segurança e Trânsito — SMST | Guarda Municipal de Canindé', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Documento emitido eletronicamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, footerY + 4, { align: 'center' });

  // Download do PDF
  const nomeArquivo = `Ordem_de_Servico_${numFmt.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  return { doc, nomeArquivo };
}

export async function gerarPdfOrdemServico(ordem: OrdemServico) {
  const { doc, nomeArquivo } = await montarPdfOrdemServico(ordem);
  doc.save(nomeArquivo);
}

export async function imprimirPdfOrdemServico(ordem: OrdemServico) {
  const { doc, nomeArquivo } = await montarPdfOrdemServico(ordem);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(url);
    doc.save(nomeArquivo);
    return;
  }

  printWindow.document.title = nomeArquivo;
  printWindow.document.write(
    `<html><head><title>${nomeArquivo}</title><style>html,body{margin:0;height:100%}iframe{width:100%;height:100%;border:0}</style></head>` +
      `<body><iframe src="${url}"></iframe></body></html>`,
  );
  printWindow.document.close();

  const iframe = printWindow.document.querySelector('iframe');
  if (iframe) {
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          // ignore
        }
      }, 300);
    };
  }

  const closeTimer = window.setInterval(() => {
    if (printWindow.closed) {
      window.clearInterval(closeTimer);
      URL.revokeObjectURL(url);
    }
  }, 500);
}
