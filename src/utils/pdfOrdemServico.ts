import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OrdemServico } from '@/types/ordem-servico.types';

export function gerarPdfOrdemServico(ordem: OrdemServico) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 14;

  // 1. Cabeçalho Institucional
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('ESTADO DO CEARÁ — MUNICÍPIO DE CANINDÉ', pageWidth / 2, 12, { align: 'center' });

  doc.setFontSize(9);
  doc.text('SECRETARIA MUNICIPAL DE SEGURANÇA E TRANSPORTE — SMST', pageWidth / 2, 17, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138); // Azul Marinho
  doc.text('GUARDA MUNICIPAL DE CANINDÉ', pageWidth / 2, 23, { align: 'center' });

  // Linha separadora do cabeçalho
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.8);
  doc.line(marginLeft, 27, pageWidth - 14, 27);

  // Marca D'água se CANCELADA ou SUBSTITUÍDA
  if (ordem.status === 'CANCELADA') {
    doc.saveGraphicsState();
    doc.setFontSize(48);
    doc.setTextColor(239, 68, 68); // Red-500
    doc.text('CANCELADA', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();
  } else if (ordem.status === 'SUBSTITUIDA') {
    doc.saveGraphicsState();
    doc.setFontSize(40);
    doc.setTextColor(245, 158, 11); // Amber-500
    doc.text('SUBSTITUÍDA (v' + ordem.versao + ')', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();
  }

  // Title Box
  const numFmt = ordem.numero_formatado || `Rascunho ${ordem.id.slice(0, 8)}`;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`ORDEM DE SERVIÇO — ${numFmt}`, pageWidth / 2, 36, { align: 'center' });

  // Tabela 1: Identificação da Demandas
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
    startY: 42,
    margin: { left: marginLeft, right: 14 },
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    body: dadosIdentificacao,
    styles: { fontSize: 9, cellPadding: 3, textColor: [15, 23, 42] },
  });

  // Tabela 2: Dados da Execução Operacional
  let currentY = (doc as any).lastAutoTable.finalY + 6;

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
    margin: { left: marginLeft, right: 14 },
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
      margin: { left: marginLeft, right: 14 },
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
    margin: { left: marginLeft, right: 14 },
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
      margin: { left: marginLeft, right: 14 },
      theme: 'grid',
      body: [[{ content: ordem.observacoes }]],
      styles: { fontSize: 8.5, cellPadding: 4, textColor: [15, 23, 42] },
    });
  }

  // Rodapé Institucional
  const footerY = pageHeight - 16;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, footerY - 5, pageWidth - 14, footerY - 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Secretaria Municipal de Segurança e Transporte — SMST | Guarda Municipal de Canindé', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Documento emitido eletronicamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, footerY + 4, { align: 'center' });

  // Download do PDF
  const nomeArquivo = `Ordem_de_Servico_${numFmt.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(nomeArquivo);
}
