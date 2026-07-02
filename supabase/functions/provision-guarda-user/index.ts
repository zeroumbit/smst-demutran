import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(401, { error: 'Missing Authorization header.' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requester }, error: requesterError } = await adminClient.auth.getUser(token);

    if (requesterError || !requester) {
      return jsonResponse(401, { error: 'Invalid authenticated user.' });
    }

    const { data: requesterProfile } = await adminClient
      .from('perfis_usuarios')
      .select('papel, setor_id, ativo')
      .eq('user_id', requester.id)
      .eq('ativo', true)
      .limit(1)
      .maybeSingle();

    const isSuperAdmin = requesterProfile?.papel === 'super_admin';
    if (!isSuperAdmin) {
      return jsonResponse(403, { error: 'Only super admins can provision guard users.' });
    }

    const { guarda_id, matricula, nome, senha } = await req.json() as {
      guarda_id: string;
      matricula: string;
      nome: string;
      senha: string;
    };

    if (!guarda_id || !matricula || !nome || !senha) {
      return jsonResponse(400, { error: 'Missing required fields: guarda_id, matricula, nome, senha' });
    }

    const email = `gcm.${matricula}@guardamunicipal.sistema`;

    const { data: createdUserData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { name: nome, tipo: 'guarda_municipal' },
      app_metadata: { created_via: 'provision-guarda-user' },
    });

    if (createError || !createdUserData.user) {
      return jsonResponse(400, { error: createError?.message || 'Could not create auth user.' });
    }

    const { error: vinculoError } = await adminClient
      .from('guardas_usuarios')
      .insert({ guarda_id, usuario_id: createdUserData.user.id });

    if (vinculoError) {
      await adminClient.auth.admin.deleteUser(createdUserData.user.id);
      return jsonResponse(400, { error: vinculoError.message || 'Could not create guard-usuario link.' });
    }

    await adminClient
      .from('guardas_municipais')
      .update({ data_criacao_senha: new Date().toISOString() })
      .eq('id', guarda_id);

    return jsonResponse(200, {
      success: true,
      userId: createdUserData.user.id,
      email,
      mensagem: 'Usuário de guarda criado com sucesso',
    });
  } catch (error) {
    console.error('Unexpected error in provision-guarda-user:', error);
    return jsonResponse(500, { error: 'Unexpected server error.' });
  }
});
