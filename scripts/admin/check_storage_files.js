import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY antes de executar.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listFolder(folder) {
  const label = folder || 'raiz';
  const { data, error } = await supabase.storage.from('imagens').list(folder, { limit: 100 });

  if (error) {
    console.error(`Erro ao listar ${label}:`, error.message);
    return;
  }

  console.log(`Arquivos em ${label}:`);
  console.log(
    data?.map((file) => `  - ${file.name} (${file.metadata?.size || 'N/A'} bytes)`).join('\n') ||
      '  Nenhum arquivo encontrado',
  );
}

async function checkStorage() {
  await listFolder('');
  await listFolder('images');
}

void checkStorage();
