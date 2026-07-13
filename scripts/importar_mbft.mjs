import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Uso: node scripts/importar_mbft.mjs <arquivo.csv|arquivo.json>');
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar a importação.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
};

const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  const text = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'sim', 'yes', 's', 'y'].includes(text);
};

const normalizeGravidade = (value) => {
  const text = String(value || '').trim().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const map = {
    leve: 'leve',
    media: 'media',
    grave: 'grave',
    gravissima: 'gravissima',
  };

  const normalized = map[text];
  if (!normalized) {
    throw new Error(`Gravidade inválida: ${value}`);
  }

  return normalized;
};

const normalizePontuacao = (value) => {
  const parsed = Number(String(value || '0').replace(/[^\d-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseCsv = (raw) => {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const delimiter = lines[0]?.includes(';') ? ';' : ',';

  const splitLine = (line) => {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        if (insideQuotes && next === '"') {
          current += '"';
          i += 1;
        } else {
          insideQuotes = !insideQuotes;
        }
        continue;
      }

      if (char === delimiter && !insideQuotes) {
        result.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    result.push(current);
    return result.map((item) => item.trim());
  };

  const headers = splitLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitLine(line);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
};

const loadRows = (filePath) => {
  const resolved = path.resolve(filePath);
  const raw = fs.readFileSync(resolved, 'utf8');

  if (resolved.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('O JSON precisa ser um array de infrações.');
    }
    return parsed;
  }

  if (resolved.toLowerCase().endsWith('.csv')) {
    return parseCsv(raw);
  }

  throw new Error('Formato não suportado. Use CSV ou JSON.');
};

const normalizeRow = (row) => ({
  codigo: String(row.codigo || '').trim(),
  tipificacao_resumida: String(row.tipificacao_resumida || '').trim(),
  amparo_legal: String(row.amparo_legal || '').trim(),
  tipificacao_completa: String(row.tipificacao_completa || '').trim(),
  gravidade: normalizeGravidade(row.gravidade),
  penalidade: String(row.penalidade || '').trim(),
  medida_administrativa: normalizeText(row.medida_administrativa),
  infrator: String(row.infrator || '').trim(),
  competencia: normalizeText(row.competencia),
  pontuacao: normalizePontuacao(row.pontuacao),
  quando_autuar: normalizeText(row.quando_autuar),
  quando_nao_autuar: normalizeText(row.quando_nao_autuar),
  definicoes_procedimentos: normalizeText(row.definicoes_procedimentos),
  exemplos_observacoes: normalizeText(row.exemplos_observacoes),
  informacoes_complementares: normalizeText(row.informacoes_complementares),
  pode_configurar_crime: normalizeBoolean(row.pode_configurar_crime),
  constatacao: normalizeText(row.constatacao),
  categoria: normalizeText(row.categoria),
  capitulo: normalizeText(row.capitulo),
  ativo: true,
});

const requiredFields = [
  'codigo',
  'tipificacao_resumida',
  'amparo_legal',
  'tipificacao_completa',
  'gravidade',
  'penalidade',
  'infrator',
];

const rows = loadRows(inputPath).map(normalizeRow);

rows.forEach((row, index) => {
  for (const field of requiredFields) {
    if (!row[field]) {
      throw new Error(`Linha ${index + 1}: campo obrigatório ausente -> ${field}`);
    }
  }
});

console.log(`Importando ${rows.length} infrações para fiscalizacao_infracoes...`);

const batchSize = 200;
for (let index = 0; index < rows.length; index += batchSize) {
  const chunk = rows.slice(index, index + batchSize);
  const { error } = await supabase
    .from('fiscalizacao_infracoes')
    .upsert(chunk, { onConflict: 'codigo' });

  if (error) {
    console.error(`Falha no lote ${index / batchSize + 1}:`, error.message);
    process.exit(1);
  }

  console.log(`Lote ${index / batchSize + 1} concluído (${chunk.length} registros).`);
}

console.log('Importação concluída com sucesso.');
