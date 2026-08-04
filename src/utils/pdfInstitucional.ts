import jsPDF from 'jspdf';
import type { UserOptions, Styles } from 'jspdf-autotable';
import municipioLogo from '@/logo/municipio.png';
import guardaLogo from '@/logo/guarda.png';
import demutranLogo from '@/logo/demutran.png';

export type SetorDocumento = 'municipio' | 'guarda-municipal' | 'demutran';

export interface LogoPdf {
  img: HTMLImageElement | null;
  aspect: number;
}

export const LINHA_1_CEARA = 'ESTADO DO CEARÁ';
export const LINHA_2_GOVERNO = 'GOVERNO MUNICIPAL DE CANINDÉ';
export const LINHA_3_SECRETARIA = 'SECRETARIA MUNICIPAL DE SEGURANÇA PÚBLICA E TRÂNSITO — SMST';

export const SETOR_LINHA: Record<SetorDocumento, string> = {
  municipio: 'Secretaria Municipal de Segurança Pública e Trânsito — SMST',
  'guarda-municipal': 'Guarda Civil Municipal',
  demutran: 'Departamento Municipal de Trânsito — Demutran',
};

const SETOR_LOGO: Record<SetorDocumento, string> = {
  municipio: municipioLogo,
  'guarda-municipal': guardaLogo,
  demutran: demutranLogo,
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function carregarLogo(src: string): Promise<LogoPdf> {
  try {
    const img = await loadImage(src);
    const aspect = img.naturalWidth / img.naturalHeight;
    return { img, aspect: aspect || 1 };
  } catch {
    return { img: null, aspect: 1 };
  }
}

export async function carregarLogosSetor(setor: SetorDocumento): Promise<{ municipio: LogoPdf; setor: LogoPdf }> {
  const [municipio, setorLogo] = await Promise.all([
    carregarLogo(municipioLogo),
    carregarLogo(SETOR_LOGO[setor]),
  ]);
  return { municipio, setor: setorLogo };
}

export function desenharMarcaDAgua(doc: jsPDF, logo: LogoPdf) {
  if (!logo.img) return;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const wmHeight = 130;
  const wmWidth = wmHeight * logo.aspect;
  doc.saveGraphicsState();
  const gState = doc.GState({ opacity: 0.08 });
  doc.setGState(gState);
  doc.addImage(logo.img, 'PNG', (pageWidth - wmWidth) / 2, (pageHeight - wmHeight) / 2, wmWidth, wmHeight);
  doc.restoreGraphicsState();
}

export interface CabecalhoInstitucionalOptions {
  setorLinha?: string;
  tituloSubtitulo?: string;
  detalhes?: string[];
}

/**
 * Desenha o cabeçalho institucional padrão:
 * logos do município + setor no topo, L1/L2/L3, linha do setor,
 * linha separadora e o nome do tipo de documento.
 * Retorna a posição Y atual (após o título) para prosseguir com o conteúdo.
 */
export function desenharCabecalhoInstitucional(
  doc: jsPDF,
  logos: { municipio: LogoPdf; setor: LogoPdf },
  tituloDocumento: string,
  options: CabecalhoInstitucionalOptions = {},
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;

  const logoHeight = 22;
  const gap = 6;
  const logosDisponiveis = [logos.municipio, logos.setor].filter((l) => l.img);
  const logoWidths = logosDisponiveis.map((l) => logoHeight * l.aspect);
  const totalLogosWidth = logoWidths.reduce((acc, w) => acc + w, 0) + gap * (logosDisponiveis.length - 1);
  let logosStartX = (pageWidth - totalLogosWidth) / 2;

  logosDisponiveis.forEach((l, idx) => {
    doc.addImage(l.img!, 'PNG', logosStartX, 8, logoWidths[idx], logoHeight);
    logosStartX += logoWidths[idx] + gap;
  });

  let currentY = 8 + logoHeight + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(LINHA_1_CEARA, pageWidth / 2, currentY, { align: 'center' });
  currentY += 4.5;

  doc.setFontSize(9);
  doc.text(LINHA_2_GOVERNO, pageWidth / 2, currentY, { align: 'center' });
  currentY += 4.5;

  doc.setFontSize(8.5);
  doc.text(LINHA_3_SECRETARIA, pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  if (options.setorLinha) {
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138);
    doc.text(options.setorLinha, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
  }

  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.6);
  doc.line(marginLeft, currentY, pageWidth - marginRight, currentY);
  currentY += 5;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(tituloDocumento, pageWidth / 2, currentY, { align: 'center' });
  currentY += 4;

  if (options.tituloSubtitulo) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(options.tituloSubtitulo, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
  }

  if (options.detalhes?.length) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(options.detalhes.join('  |  '), pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;
  }

  return currentY;
}

/**
 * Configuração padrão de tabela institucional:
 * fundo transparente (grid) com cabeçalho sem preenchimento em azul.
 */
export function estiloTabelaInstitucional(extraStyles: Partial<Styles> = {}): Partial<UserOptions> {
  return {
    theme: 'grid',
    headStyles: { fillColor: false, textColor: [30, 58, 138], fontStyle: 'bold' },
    styles: { fillColor: false, ...extraStyles },
  };
}
