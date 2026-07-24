import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface OperacaoEscalaPdfData {
  codigo: string;
  nome: string;
  descricao?: string | null;
  horario_previsto: string;
  data_inicio: string;
  data_fim: string;
  vagas_por_dia?: number;
  horas_por_dia?: number;
}

export interface ParticipanteEscalaPdfData {
  matricula: string;
  nome: string;
  graduacao?: string | null;
  data_operacao: string;
  status: string;
  observacao?: string | null;
}

export function gerarPdfEscalaOperacao(
  operacao: OperacaoEscalaPdfData,
  participantes: ParticipanteEscalaPdfData[],
  dataFiltro?: string | null
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = pageWidth - 14;

  // Header - Governamental / Institucional
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('ESTADO DO CEARÁ — MUNICÍPIO DE CANINDÉ', pageWidth / 2, 12, { align: 'center' });
  
  doc.setFontSize(9);
  doc.text('SECRETARIA MUNICIPAL DE SEGURANÇA E TRANSPORTE — SMST', pageWidth / 2, 17, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138); // Azul escuro
  doc.text('GUARDA MUNICIPAL DE CANINDÉ', pageWidth / 2, 23, { align: 'center' });

  // Linha separadora principal
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(marginLeft, 26, marginRight, 26);

  // Título da Escala
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('ESCALA DE SERVIÇO OPERACIONAL — IRO', pageWidth / 2, 33, { align: 'center' });

  // Subtítulo com Operação
  const codStr = operacao.codigo ? `[${operacao.codigo}] ` : '';
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${codStr}${operacao.nome}`, pageWidth / 2, 39, { align: 'center' });

  // Bloco de informações da Operação
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  let periodoText = '';
  if (dataFiltro) {
    try {
      const d = new Date(`${dataFiltro}T00:00:00`);
      periodoText = `Data da Escala: ${format(d, "dd/MM/yyyy (EEEE)", { locale: ptBR })}`;
    } catch {
      periodoText = `Data da Escala: ${dataFiltro}`;
    }
  } else {
    try {
      const dInic = new Date(operacao.data_inicio);
      const dFim = new Date(operacao.data_fim);
      periodoText = `Período: ${format(dInic, 'dd/MM/yyyy', { locale: ptBR })} até ${format(dFim, 'dd/MM/yyyy', { locale: ptBR })}`;
    } catch {
      periodoText = `Período: ${operacao.data_inicio} a ${operacao.data_fim}`;
    }
  }

  const horarioText = `Horário Previsto: ${operacao.horario_previsto || 'Não especificado'}`;
  const cargaVagasText = `Carga Horária: ${operacao.horas_por_dia ?? '-'}h/dia  |  Vagas por Dia: ${operacao.vagas_por_dia ?? '-'}`;

  doc.text(periodoText, marginLeft, 46);
  doc.text(horarioText, pageWidth / 2, 46, { align: 'center' });
  doc.text(cargaVagasText, marginRight, 46, { align: 'right' });

  if (operacao.descricao) {
    const descText = `Descrição: ${operacao.descricao.length > 110 ? operacao.descricao.slice(0, 110) + '...' : operacao.descricao}`;
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(descText, marginLeft, 51);
  }

  // Linha separadora secundária
  const lineY = operacao.descricao ? 54 : 49;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(marginLeft, lineY, marginRight, lineY);

  // Tabela de Guardas Escalados
  const tableData = participantes.map((p, index) => {
    let dataFmt = p.data_operacao;
    try {
      const d = new Date(`${p.data_operacao}T00:00:00`);
      dataFmt = format(d, 'dd/MM/yyyy');
    } catch {
      // keep original
    }

    const statusLabel = 
      p.status === 'confirmado' ? 'CONFIRMADO' :
      p.status === 'realizado' ? 'REALIZADO' :
      p.status === 'pendente' ? 'PENDENTE' : p.status.toUpperCase();

    return [
      String(index + 1).padStart(2, '0'),
      p.matricula || '-',
      p.nome || '-',
      p.graduacao || 'Guarda Municipal',
      dataFmt,
      p.observacao || statusLabel,
    ];
  });

  autoTable(doc, {
    startY: lineY + 3,
    head: [['Nº', 'Matrícula', 'Guarda Municipal', 'Graduação / Posto', 'Data', 'Observação / Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 25 },
      2: { cellWidth: 55, fontStyle: 'bold' },
      3: { cellWidth: 35 },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 'auto' },
    },
    margin: { left: marginLeft, right: 14 },
  });

  // Campo de Assinaturas e Rodapé
  const finalY = (doc as any).lastAutoTable?.finalY || lineY + 40;
  const pageHeight = doc.internal.pageSize.getHeight();
  const signatureY = Math.min(finalY + 25, pageHeight - 30);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  // Linha de assinatura
  const boxWidth = 70;
  const boxX1 = (pageWidth - boxWidth) / 2;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(boxX1, signatureY, boxX1 + boxWidth, signatureY);

  doc.text('Comando da Guarda Municipal', pageWidth / 2, signatureY + 4, { align: 'center' });
  doc.setFontSize(7);
  doc.text('Secretaria Municipal de Segurança e Transporte — Canindé/CE', pageWidth / 2, signatureY + 8, { align: 'center' });

  // Data e hora da emissão
  const dataEmissao = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Documento emitido em ${dataEmissao} | Sistema de Gestão SMST`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Salvar PDF
  const filename = `escala-operacao-${operacao.codigo || 'iro'}-${dataFiltro || 'geral'}.pdf`;
  doc.save(filename);
}
