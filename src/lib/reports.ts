import * as XLSX from 'xlsx';
import municipioLogo from '@/logo/municipio.png';
import guardaLogo from '@/logo/guarda.png';
import demutranLogo from '@/logo/demutran.png';

type ReportRow = Record<string, string | number | boolean | null | undefined>;

type ReportSheet = {
  name: string;
  rows: ReportRow[];
};

type SetorImpressao = 'demutran' | 'guarda-municipal';

const SETOR_HTML: Record<SetorImpressao, { logoUrl: string; linhaSetor: string }> = {
  demutran: { logoUrl: demutranLogo, linhaSetor: 'Departamento Municipal de Trânsito — Demutran' },
  'guarda-municipal': { logoUrl: guardaLogo, linhaSetor: 'Guarda Civil Municipal' },
};

const REPORT_CSS = `
  @page { margin: 0; size: A4 portrait; }
  html, body { background: #ffffff; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #0f172a; padding: 20px; position: relative; z-index: 1; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.08; max-width: 70%; z-index: 0; pointer-events: none; }
  .doc-header { text-align: center; padding: 6px 0 0; }
  .doc-logos { display: flex; justify-content: center; align-items: center; gap: 12px; margin-bottom: 6px; }
  .doc-logos img { height: 55px; width: auto; object-fit: contain; }
  .l1, .l2, .l3 { margin: 2px 0; color: #0f172a; }
  .l1 { font-weight: 800; font-size: 13px; letter-spacing: 0.08em; }
  .l2 { font-weight: 800; font-size: 13px; }
  .l3 { font-size: 11px; font-weight: 600; }
  .l-setor { color: #1e3a8a; font-weight: 700; font-size: 12px; margin-top: 4px; }
  .sep { border: 0; border-top: 2px solid #1e3a8a; margin: 8px 0 14px; }
  h1 { margin: 0 0 6px; font-size: 22px; text-align: center; }
  h2 { margin: 20px 0 8px; font-size: 16px; }
  p.meta { color: #475569; margin: 0 0 14px; font-size: 13px; text-align: center; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; background: transparent !important; }
  tr:nth-child(even) td { background: transparent !important; }
  section { break-inside: avoid; }
`;

const headerHtml = (setor: SetorImpressao) => `
  <div class="doc-header">
    <div class="doc-logos">
      <img src="${municipioLogo}" alt="Município" onerror="this.style.display='none'" />
      <img src="${SETOR_HTML[setor].logoUrl}" alt="Setor" onerror="this.style.display='none'" />
    </div>
    <p class="l1">ESTADO DO CEARÁ</p>
    <p class="l2">GOVERNO MUNICIPAL DE CANINDÉ</p>
    <p class="l3">SECRETARIA MUNICIPAL DE SEGURANÇA PÚBLICA E TRÂNSITO — SMST</p>
    <p class="l-setor">${SETOR_HTML[setor].linhaSetor}</p>
  </div>
  <hr class="sep" />
`;

const watermarkHtml = `<img class="watermark" src="${municipioLogo}" alt="" onerror="this.style.display='none'" />`;

const abrirImpressaoHtml = (html: string) => {
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
      window.setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 2000);
  };

  if (iframe.contentDocument!.readyState === 'complete') {
    iframe.onload!(new Event('load'));
  }
};

const normalizeSheetName = (value: string) =>
  value
    .replace(/[\\/*?:[\]]/g, ' ')
    .trim()
    .slice(0, 31) || 'Relatorio';

const normalizeFileNamePart = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'relatorio';

export const formatReportDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('pt-BR') : '-';

export const formatReportDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString('pt-BR') : '-';

export const formatReportCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export const buildReportFileName = (moduleName: string, reportType: string) => {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');

  return `${normalizeFileNamePart(moduleName)}-${normalizeFileNamePart(reportType)}-${stamp}.xlsx`;
};

export const exportReportWorkbook = (fileName: string, sheets: ReportSheet[]) => {
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, normalizeSheetName(sheet.name));
  });

  XLSX.writeFile(workbook, fileName);
};

const escapeCsvValue = (value: string) => `"${value.replace(/"/g, '""')}"`;

const toDisplayString = (value: ReportRow[string]) => {
  if (value === null || value === undefined) return '';
  return String(value);
};

export const exportReportCsv = (fileName: string, rows: ReportRow[]) => {
  if (!rows.length) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvValue).join(';'),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(toDisplayString(row[header]))).join(';')),
  ];

  const blob = new Blob(["\uFEFF" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.replace(/\.xlsx$/i, '.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const openPdfPrintReport = (title: string, sections: ReportSheet[], setor: SetorImpressao = 'demutran') => {
  const sectionsHtml = sections
    .map((section) => {
      const headers = section.rows.length ? Object.keys(section.rows[0]) : [];
      const headerHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
      const bodyHtml = section.rows
        .map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(toDisplayString(row[header]))}</td>`).join('')}</tr>`)
        .join('');

      return `
        <section>
          <h2>${escapeHtml(section.name)}</h2>
          ${section.rows.length
            ? `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`
            : '<p>Nenhum dado encontrado para este recorte.</p>'}
        </section>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
        <style>${REPORT_CSS}</style>
      </head>
      <body>
        ${watermarkHtml}
        ${headerHtml(setor)}
        <h1>${escapeHtml(title)}</h1>
        <p class="meta">Gerado em ${escapeHtml(new Date().toLocaleString('pt-BR'))}</p>
        ${sectionsHtml}
      </body>
    </html>
  `;

  abrirImpressaoHtml(html);
};

export const printHtml = (title: string, contentHtml: string, setor: SetorImpressao = 'demutran') => {
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
        <style>${REPORT_CSS}</style>
      </head>
      <body>
        ${watermarkHtml}
        ${headerHtml(setor)}
        <h1>${escapeHtml(title)}</h1>
        <p class="meta">${escapeHtml(new Date().toLocaleString('pt-BR'))}</p>
        ${contentHtml}
      </body>
    </html>
  `;

  abrirImpressaoHtml(html);
};
