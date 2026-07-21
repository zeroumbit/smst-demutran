import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

if (!supabaseUrl || !supabaseServiceKey || !adminPassword) {
  console.error(
    'Defina VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e ADMIN_PASSWORD antes de executar.',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      emailConfirm: true,
    });

    if (error) throw error;

    const { error: updateError } = await supabase.auth.admin.updateUserById(data.user.id, {
      user_metadata: { role: 'admin', name: 'Administrador MST' },
    });

    if (updateError) throw updateError;
    console.log('Usuário administrador criado com sucesso:', data.user.id);
  } catch (error) {
    console.error('Não foi possível criar o usuário administrador:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

void createAdminUser();
