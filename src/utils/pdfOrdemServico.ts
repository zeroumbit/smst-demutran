import jsPDF from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import type { OrdemServico } from '@/types/ordem-servico.types';
import {
  carregarLogosSetor,
  desenharCabecalhoInstitucional,
  desenharMarcaDAgua,
  estiloTabelaInstitucional,
  SETOR_LINHA,
  type SetorDocumento,
} from '@/utils/pdfInstitucional';

export async function montarPdfOrdemServico(ordem: OrdemServico): Promise<{ doc: jsPDF; nomeArquivo: string }> {
  const isDemutran = ordem.setor_slug === 'demutran';
  const setor: SetorDocumento = isDemutran ? 'demutran' : 'guarda-municipal';
  const logos = await carregarLogosSetor(setor);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 14;
  const marginRight = 14;

  // --- Marca d'água: logo do Município em alta resolução, ao fundo ---
  desenharMarcaDAgua(doc, logos.municipio);

  // --- Cabeçalho institucional padrão ---
  const numFmt = ordem.numero_formatado || `Rascunho ${ordem.id.slice(0, 8)}`;
  let currentY = desenharCabecalhoInstitucional(doc, logos, `ORDEM DE SERVIÇO — ${numFmt}`, {
    setorLinha: SETOR_LINHA[setor],
  });

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

  // Tabela 1: Identificação da Demanda
  const dadosIdentificacao: RowInput[] = [
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
    ...estiloTabelaInstitucional({ fontSize: 9, cellPadding: 3, textColor: [15, 23, 42] }),
    body: dadosIdentificacao,
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

  const dadosExecucao: RowInput[] = [
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
    ...estiloTabelaInstitucional({ fontSize: 9, cellPadding: 3, textColor: [15, 23, 42] }),
    body: dadosExecucao,
  });

  // Tabela 3: Solicitante (quando houver)
  if (ordem.solicitante_nome || ordem.solicitante_orgao) {
    currentY = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('DADOS DO SOLICITANTE', marginLeft, currentY);
    currentY += 3;

    const dadosSolicitante: RowInput[] = [
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
      ...estiloTabelaInstitucional({ fontSize: 9, cellPadding: 3, textColor: [15, 23, 42] }),
      body: dadosSolicitante,
    });
  }

  // Tabela 4: Equipes Destinatárias (apenas Guarda Municipal)
  if (!isDemutran) {
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
      ...estiloTabelaInstitucional({ fontSize: 8.5, cellPadding: 3, textColor: [15, 23, 42] }),
      head: [['Equipe Responsável', 'Responsável no Momento', 'Status de Acesso']],
      body: equipesBody,
    });
  }

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
      ...estiloTabelaInstitucional({ fontSize: 8.5, cellPadding: 4, textColor: [15, 23, 42] }),
      body: [[{ content: ordem.observacoes }]],
    });
  }

  // Assinatura do Comandante
  const footerY = pageHeight - 16;
  let sigY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 22 : currentY + 22;
  if (sigY > footerY - 20) {
    doc.addPage();
    desenharMarcaDAgua(doc, logos.municipio);
    sigY = 60;
  }

  const sigLineWidth = 90;
  const sigLineStartX = (pageWidth - sigLineWidth) / 2;
  const sigLineEndX = (pageWidth + sigLineWidth) / 2;

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(sigLineStartX, sigY, sigLineEndX, sigY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Comandante da Guarda Municipal de Canindé', pageWidth / 2, sigY + 5, { align: 'center' });

  // Rodapé Institucional
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, footerY - 5, pageWidth - marginRight, footerY - 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    isDemutran
      ? 'Secretaria Municipal de Segurança Pública e Trânsito — SMST | Departamento Municipal de Trânsito'
      : 'Secretaria Municipal de Segurança Pública e Trânsito — SMST | Guarda Municipal de Canindé',
    pageWidth / 2,
    footerY,
    { align: 'center' },
  );
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
    `<html><head><title>${nomeArquivo}</title><style>` +
      `html,body{margin:0;height:100%;font-family:Arial,sans-serif}` +
      `iframe{width:100%;height:100%;border:0;display:block}` +
      `#aviso{display:none;padding:10px 16px;background:#fef3c7;border-bottom:1px solid #fcd34d;font-size:13px;color:#78350f}` +
      `#aviso a{color:#1d4ed8;font-weight:bold}` +
      `@media print{#aviso{display:none!important}}` +
      `</style></head>` +
      `<body>` +
      `<div id="aviso">Se o PDF nao abrir automaticamente, <a href="${url}" target="_blank" rel="noopener">clique aqui para abrir</a> e imprimir com Ctrl+P.</div>` +
      `<iframe src="${url}"></iframe>` +
      `</body></html>`,
  );
  printWindow.document.close();

  const iframe = printWindow.document.querySelector('iframe');
  const aviso = printWindow.document.querySelector('#aviso');
  if (iframe) {
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          if (aviso) aviso.style.display = 'block';
        }
      }, 300);
    };
  }
  setTimeout(() => {
    try {
      const viewerBlocked = iframe?.contentDocument?.body?.innerText?.includes('bloqueado');
      if (viewerBlocked && aviso) aviso.style.display = 'block';
    } catch {
      if (aviso) aviso.style.display = 'block';
    }
  }, 4000);

  const closeTimer = window.setInterval(() => {
    if (printWindow.closed) {
      window.clearInterval(closeTimer);
      URL.revokeObjectURL(url);
    }
  }, 500);
}
