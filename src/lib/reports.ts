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
          @page { margin: 0; size: A4 portrait; }
          html, body { background: #ffffff; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; color: #0f172a; padding: 95px 20px 20px; }
          .report-header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #cbd5e1; padding: 12px 20px; background: #ffffff; }
          .report-header img { width: 60px; height: 60px; object-fit: contain; }
          .report-header-text { display: flex; flex-direction: column; gap: 4px; }
          .report-title { font-size: 24px; font-weight: 800; letter-spacing: -0.04em; color: #0f172a; }
          .report-subtitle { font-size: 13px; font-weight: 600; color: #475569; }
          h1 { margin: 0 0 6px; font-size: 22px; }
          h2 { margin: 20px 0 8px; font-size: 16px; }
          p.meta { color: #475569; margin: 0 0 14px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; }
          th { background: #e2e8f0; }
          tr:nth-child(even) td { background: #f8fafc; }
          section { break-inside: avoid; }
          @media print {
            body { padding: 95px 12px 12px; }
            .report-header { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <img src="${escapeHtml(logoUrl)}" alt="Logo do Demutran" onerror="this.style.display='none'" />
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

export const printHtml = (title: string, contentHtml: string) => {
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { margin: 0; size: A4 portrait; }
          html, body { background: #ffffff; margin: 0; padding: 0; font-family: Arial, sans-serif; color: #0f172a; }
          body { padding: 20px; }
          .print-header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #cbd5e1; padding-bottom: 12px; margin-bottom: 20px; }
          .print-header img { width: 60px; height: 60px; object-fit: contain; }
          .print-header-text { display: flex; flex-direction: column; gap: 4px; }
          .print-title { font-size: 24px; font-weight: 800; letter-spacing: -0.04em; color: #0f172a; }
          .print-subtitle { font-size: 13px; font-weight: 600; color: #475569; }
          p.meta { color: #475569; margin: 0 0 14px; font-size: 13px; }
          @media print {
            body { padding: 12px; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <img src="${escapeHtml(`${window.location.origin}/images/demutran.png`)}" alt="Logo do Demutran" onerror="this.style.display='none'" />
          <div class="print-header-text">
            <span class="print-title">DEMUTRAN</span>
            <span class="print-subtitle">Departamento Municipal de Trânsito</span>
          </div>
        </div>
        <p class="meta">${escapeHtml(title)}</p>
        ${contentHtml}
      </body>
    </html>
  `;

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
