import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { JgcAluno } from '@/types/jovem-guarda';
import { printHtml } from '@/lib/reports';

const dateLabel = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
        new Date(`${value.slice(0, 10)}T12:00:00Z`),
      )
    : '—';

export function imprimirListaAlunos({
  alunos,
  turmaNome,
}: {
  alunos: JgcAluno[];
  turmaNome?: string;
}) {
  const title = turmaNome
    ? `Lista de Alunos — Turma: ${turmaNome}`
    : 'Lista Completa de Alunos — Jovem Guarda Cidadã';

  const rowsHtml = alunos
    .map(
      (aluno, idx) => `
    <tr>
      <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
      <td><strong>${aluno.matricula}</strong></td>
      <td><strong>${aluno.nome_completo}</strong></td>
      <td>${dateLabel(aluno.data_nascimento)}</td>
      <td>${
        aluno.turmas && aluno.turmas.length > 0
          ? aluno.turmas.map((t: any) => t.nome).join(', ')
          : aluno.turma?.nome || 'Sem turma'
      }</td>
      <td>${aluno.escola_nome || '—'} ${aluno.serie_ano ? `(${aluno.serie_ano})` : ''}</td>
      <td style="text-align: center;">${(aluno.situacao || 'ativo').toUpperCase()}</td>
    </tr>
  `,
    )
    .join('');

  const html = `
    <div style="margin-bottom: 12px;">
      <h2 style="font-size: 16px; font-weight: bold; margin: 0 0 4px 0; text-align: center; color: #0f766e;">
        ${title}
      </h2>
      <p style="font-size: 11px; color: #64748b; margin: 0 0 12px 0; text-align: center;">
        Total de alunos listados: <strong>${alunos.length}</strong> · Impressão gerada em ${new Date().toLocaleString('pt-BR')}
      </p>
      <table>
        <thead>
          <tr style="background-color: #0f766e; color: #ffffff;">
            <th style="width: 35px; text-align: center;">#</th>
            <th style="width: 85px;">Matrícula</th>
            <th>Nome do Aluno</th>
            <th style="width: 85px;">Data Nasc.</th>
            <th>Turma(s)</th>
            <th>Escola / Série</th>
            <th style="width: 75px; text-align: center;">Situação</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div style="margin-top: 40px; display: flex; justify-content: space-around; font-size: 11px; text-align: center;">
        <div style="border-top: 1px solid #94a3b8; width: 220px; padding-top: 6px;">
          Coordenação do Jovem Guarda Cidadã
        </div>
        <div style="border-top: 1px solid #94a3b8; width: 220px; padding-top: 6px;">
          Secretaria Municipal de Segurança Pública
        </div>
      </div>
    </div>
  `;

  printHtml(title, html, 'municipio');
}

export function baixarPdfAlunos({
  alunos,
  turmaNome,
}: {
  alunos: JgcAluno[];
  turmaNome?: string;
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const title = turmaNome
    ? `RELAÇÃO DE ALUNOS — TURMA: ${turmaNome.toUpperCase()}`
    : 'RELAÇÃO COMPLETA DE ALUNOS DO PROGRAMA';

  // Cabeçalho Institucional no PDF
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('ESTADO DO CEARÁ', 105, 14, { align: 'center' });
  doc.text('GOVERNO MUNICIPAL DE CANINDÉ', 105, 19, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'SECRETARIA MUNICIPAL DE SEGURANÇA PÚBLICA E TRÂNSITO — SMST',
    105,
    24,
    { align: 'center' },
  );
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110); // teal-700
  doc.text('PROGRAMA JOVEM GUARDA CIDADÃ', 105, 29, { align: 'center' });

  // Linha divisória
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  // Título do Documento
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 105, 39, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Total de alunos: ${alunos.length}  |  Emissão: ${new Date().toLocaleString('pt-BR')}`,
    105,
    44,
    { align: 'center' },
  );

  // Tabela com autoTable
  const tableData = alunos.map((aluno, idx) => [
    idx + 1,
    aluno.matricula || '—',
    aluno.nome_completo || '—',
    dateLabel(aluno.data_nascimento),
    aluno.turmas && aluno.turmas.length > 0
      ? aluno.turmas.map((t: any) => t.nome).join(', ')
      : aluno.turma?.nome || 'Sem turma',
    [aluno.escola_nome, aluno.serie_ano].filter(Boolean).join(' - ') || '—',
    (aluno.situacao || 'ativo').toUpperCase(),
  ]);

  autoTable(doc, {
    startY: 48,
    head: [['#', 'Matrícula', 'Nome Completo', 'Nascimento', 'Turma(s)', 'Escola / Série', 'Situação']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110], // Teal-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
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
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 'auto', fontStyle: 'bold' },
      3: { cellWidth: 22 },
      4: { cellWidth: 32 },
      5: { cellWidth: 'auto' },
      6: { cellWidth: 20, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Jovem Guarda Cidadã — SMST Canindé | Página ${data.pageNumber} de ${pageCount}`,
        105,
        287,
        { align: 'center' },
      );
    },
  });

  const fileName = turmaNome
    ? `jovem_guarda_alunos_${turmaNome.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`
    : 'jovem_guarda_alunos_lista_completa.pdf';

  doc.save(fileName);
}
