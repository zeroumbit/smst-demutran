import * as XLSX from 'xlsx';

type ReportRow = Record<string, string | number | boolean | null | undefined>;

type ReportSheet = {
  name: string;
  rows: ReportRow[];
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

export const openPdfPrintReport = (title: string, sections: ReportSheet[]) => {
  const logoUrl = `${window.location.origin}/images/demutran.png`;
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
        <style>
          html, body { background: #ffffff; }
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
          .report-header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #cbd5e1; padding-bottom: 16px; margin-bottom: 20px; }
          .report-header img { width: 72px; height: 72px; object-fit: contain; }
          .report-header-text { display: flex; flex-direction: column; gap: 4px; }
          .report-title { font-size: 28px; font-weight: 800; letter-spacing: -0.04em; color: #0f172a; }
          .report-subtitle { font-size: 14px; font-weight: 600; color: #475569; }
          h1 { margin-bottom: 8px; }
          .report-header h1 { margin: 0; font-size: 28px; }
          h2 { margin: 24px 0 10px; font-size: 18px; }
          p.meta { color: #475569; margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #e2e8f0; }
          tr:nth-child(even) td { background: #f8fafc; }
          section { break-inside: avoid; }
          @media print { body { margin: 12px; } }
        </style>
      </head>
      <body>
        <div class="report-header">
          <img src="${escapeHtml(logoUrl)}" alt="Logo do Demutran" />
          <div class="report-header-text">
            <span class="report-title">DEMUTRAN</span>
            <span class="report-subtitle">Departamento Municipal de Trânsito</span>
          </div>
        </div>
        <h1>${escapeHtml(title)}</h1>
        <p class="meta">Gerado em ${escapeHtml(new Date().toLocaleString('pt-BR'))}</p>
        ${sectionsHtml}
      </body>
    </html>
  `;

  const reportBlob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const reportUrl = URL.createObjectURL(reportBlob);
  const reportWindow = window.open(reportUrl, '_blank', 'width=1200,height=900');

  if (!reportWindow) {
    URL.revokeObjectURL(reportUrl);
    throw new Error('Nao foi possivel abrir a janela de impressao do relatorio.');
  }

  const triggerPrint = () => {
    window.setTimeout(() => {
      reportWindow.focus();
      reportWindow.print();
      window.setTimeout(() => URL.revokeObjectURL(reportUrl), 60000);
    }, 500);
  };

  reportWindow.addEventListener('load', triggerPrint, { once: true });
};
