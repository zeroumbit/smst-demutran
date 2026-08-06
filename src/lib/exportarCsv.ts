export function exportarCsv(nomeArquivo: string, cabecalho: string[], linhas: (string | number | null | undefined)[][]) {
  const escapar = (valor: string | number | null | undefined) => {
    if (valor === null || valor === undefined) return '';
    const texto = String(valor);
    if (/[;"\n]/.test(texto)) {
      return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
  };

  const conteudo = [cabecalho, ...linhas]
    .map((linha) => linha.map(escapar).join(';'))
    .join('\r\n');

  const bom = '\uFEFF';
  const blob = new Blob([bom + conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomeArquivo}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
