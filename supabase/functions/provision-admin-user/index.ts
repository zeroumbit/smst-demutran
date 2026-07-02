import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

type PapelUsuario = 'super_admin' | 'gestor' | 'admin_setor' | 'tecnico';

type ProvisionRequest = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  setorId: string | null;
  papel: PapelUsuario;
  active: boolean;
  modulos?: string[];
  graduacaoId?: string | null;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
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

    const {
      data: { user: requester },
      error: requesterError,
    } = await adminClient.auth.getUser(token);

    if (requesterError || !requester) {
      return jsonResponse(401, { error: 'Invalid authenticated user.' });
    }

    const { data: requesterProfileRow } = await adminClient
      .from('perfis_usuarios')
      .select('papel, setor_id, ativo')
      .eq('user_id', requester.id)
      .eq('ativo', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: legacyAdminRows } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', requester.id)
      .eq('role', 'admin');

    const payload = (await req.json()) as ProvisionRequest;
    const firstName = payload.firstName?.trim();
    const lastName = payload.lastName?.trim();
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password?.trim();
    const papel = payload.papel;
    const setorId = payload.setorId;
    const active = payload.active ?? true;
    const modulos = payload.modulos?.filter((m) => typeof m === 'string' && m.length > 0) ?? [];

    if (!firstName || !lastName || !email || !password || !papel) {
      return jsonResponse(400, { error: 'Missing required fields.' });
    }

    const requesterIsSuperAdmin =
      requesterProfileRow?.papel === 'super_admin' ||
      Boolean(legacyAdminRows && legacyAdminRows.length > 0);
    const requesterSetorId = requesterProfileRow?.setor_id ?? null;
    const requesterPapel = requesterProfileRow?.papel ?? null;

    if (papel === 'super_admin' && !requesterIsSuperAdmin) {
      return jsonResponse(403, { error: 'Only super admins can create another super admin.' });
    }

    if (papel === 'gestor' && !requesterIsSuperAdmin) {
      return jsonResponse(403, { error: 'Only super admins can create gestores.' });
    }

    if (!requesterIsSuperAdmin && (!requesterSetorId || requesterSetorId !== setorId)) {
      return jsonResponse(403, { error: 'You can only create users for your own setor.' });
    }

    if (!requesterIsSuperAdmin && !['gestor', 'admin_setor'].includes(requesterPapel)) {
      return jsonResponse(403, { error: 'Your profile cannot create administrative users.' });
    }

    if (papel !== 'super_admin' && !setorId) {
      return jsonResponse(400, { error: 'setorId is required for this role.' });
    }

    const { data: createdUserData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: `${firstName} ${lastName}`.trim(),
        first_name: firstName,
        last_name: lastName,
      },
      app_metadata: {
        created_via: 'provision-admin-user',
        ...(modulos.length > 0 ? { modulos } : {}),
      },
      ban_duration: active ? 'none' : '876000h',
    });

    if (createError || !createdUserData.user) {
      return jsonResponse(400, {
        error: createError?.message || 'Could not create auth user.',
      });
    }

    const createdUser = createdUserData.user;

    if (papel === 'gestor' && setorId) {
      await adminClient
        .from('perfis_usuarios')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('setor_id', setorId)
        .eq('papel', 'gestor')
        .eq('ativo', true);
    }

    const { data: perfil, error: perfilInsertError } = await adminClient
      .from('perfis_usuarios')
      .insert({
        user_id: createdUser.id,
        setor_id: papel === 'super_admin' ? null : setorId,
        papel,
        nome: firstName,
        sobrenome: lastName,
        ativo: active,
        graduacao_id: payload.graduacaoId || null,
      })
      .select('*')
      .single();

    if (perfilInsertError || !perfil) {
      await adminClient.auth.admin.deleteUser(createdUser.id);
      return jsonResponse(400, {
        error: perfilInsertError?.message || 'Could not create admin profile.',
      });
    }

    await adminClient.from('auditoria_logs').insert({
      user_id: requester.id,
      setor_id: papel === 'super_admin' ? null : setorId,
      entidade: 'perfis_usuarios',
      entidade_id: perfil.id,
      acao: 'provision_admin_user',
      payload_resumido: {
        email,
        papel,
        active,
      },
    });

    return jsonResponse(200, {
      success: true,
      userId: createdUser.id,
      perfilId: perfil.id,
    });
  } catch (error) {
    console.error('Unexpected error in provision-admin-user:', error);
    return jsonResponse(500, { error: 'Unexpected server error.' });
  }
});
