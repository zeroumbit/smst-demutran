const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERRO: Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function checkBucket() {
    console.log('🔍 Verificando acesso ao bucket "documentos" com Anon Key...');
    try {
        const { data, error } = await supabase.storage.from('documentos').list();
        if (error) {
            console.error('❌ Erro ao acessar bucket:', error.message);
            if (error.message.includes('Bucket not found')) {
                console.log('   O bucket não foi encontrado ou não está acessível publicamente.');
            }
        } else {
            console.log('✅ Acesso ao bucket bem sucedido!');
            console.log(`   Arquivos encontrados: ${data.length}`);
        }
        const { data: publicUrlData } = supabase.storage.from('documentos').getPublicUrl('test.pdf');
        console.log('ℹ️  URL Pública de teste:', publicUrlData.publicUrl);
    } catch (err) {
        console.error('❌ Erro inesperado:', err.message);
    }
}
checkBucket();
