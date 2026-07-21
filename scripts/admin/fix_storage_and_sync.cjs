const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de executar.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const bucketDefinitions = [
  {
    id: 'documentos',
    options: {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ],
    },
  },
  {
    id: 'imagens',
    options: {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    },
  },
];

async function ensureBucket(existingBuckets, definition) {
  const existing = existingBuckets.find((bucket) => bucket.id === definition.id);
  if (!existing) {
    const { error } = await supabase.storage.createBucket(definition.id, definition.options);
    if (error) throw error;
    console.log(`Bucket ${definition.id} criado.`);
    return;
  }

  if (!existing.public) {
    const { error } = await supabase.storage.updateBucket(definition.id, definition.options);
    if (error) throw error;
    console.log(`Bucket ${definition.id} atualizado.`);
  }
}

async function fixStorage() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;

    for (const definition of bucketDefinitions) {
      await ensureBucket(buckets, definition);
    }
  } catch (error) {
    console.error('Não foi possível configurar o Storage:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

void fixStorage();
