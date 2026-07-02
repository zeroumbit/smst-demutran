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

    const { guarda_id, nova_senha } = await req.json() as {
      guarda_id: string;
      nova_senha: string;
    };

    if (!guarda_id || !nova_senha) {
      return jsonResponse(400, { error: 'Missing required fields: guarda_id, nova_senha' });
    }

    if (nova_senha.length > 10) {
      return jsonResponse(400, { error: 'A senha deve ter no máximo 10 caracteres.' });
    }

    const { data: vinculo } = await adminClient
      .from('guardas_usuarios')
      .select('usuario_id')
      .eq('guarda_id', guarda_id)
      .limit(1)
      .maybeSingle();

    if (!vinculo) {
      return jsonResponse(404, { error: 'Guarda não possui usuário auth vinculado.' });
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      vinculo.usuario_id,
      { password: nova_senha }
    );

    if (updateError) {
      return jsonResponse(400, { error: updateError.message || 'Erro ao atualizar senha.' });
    }

    return jsonResponse(200, {
      success: true,
      mensagem: 'Senha atualizada com sucesso.',
    });
  } catch (error) {
    console.error('Unexpected error in update-guarda-password:', error);
    return jsonResponse(500, { error: 'Unexpected server error.' });
  }
});
