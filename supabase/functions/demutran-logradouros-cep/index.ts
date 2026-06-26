import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

type SearchPayload = {
  action?: 'search' | 'cep';
  query?: string;
  cep?: string;
  setorId?: string;
};

type LogradouroApiItem = {
  nome: string;
  bairro: string | null;
  cep: string | null;
  municipio: string | null;
  uf: string | null;
  origem: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

const normalizeStreetName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\bRua\b/gi, 'Rua')
    .replace(/\bAvenida\b/gi, 'Avenida');

const saveSuggestions = async (setorId: string, items: LogradouroApiItem[]) => {
  for (const item of items) {
    await adminClient.rpc('upsert_logradouro_demutran', {
      _setor_id: setorId,
      _nome: item.nome,
      _bairro: item.bairro,
      _cep: item.cep,
      _municipio: item.municipio,
      _uf: item.uf,
      _origem: item.origem,
    });
  }
};

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
      data: { user },
      error: authError,
    } = await adminClient.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse(401, { error: 'Invalid authenticated user.' });
    }

    const payload = (await req.json()) as SearchPayload;
    const action = payload.action ?? 'search';
    const setorId = payload.setorId?.trim();

    if (!setorId) {
      return jsonResponse(400, { error: 'setorId is required.' });
    }

    if (action === 'cep') {
      const cep = (payload.cep ?? '').replace(/\D/g, '');
      if (cep.length !== 8) {
        return jsonResponse(400, { error: 'CEP invalido.' });
      }

      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return jsonResponse(502, { error: 'Falha ao consultar o servico de CEP.' });
      }

      const data = await response.json();
      if (data.erro) {
        return jsonResponse(404, { error: 'CEP nao encontrado.' });
      }

      const suggestion: LogradouroApiItem = {
        nome: normalizeStreetName(String(data.logradouro || '')),
        bairro: data.bairro || null,
        cep,
        municipio: data.localidade || null,
        uf: data.uf || null,
        origem: 'viacep',
      };

      if (suggestion.nome) {
        await saveSuggestions(setorId, [suggestion]);
      }

      return jsonResponse(200, { data: suggestion });
    }

    const query = (payload.query ?? '').trim();
    const { data: cachedRows, error: cachedError } = await adminClient.rpc('listar_logradouros_demutran', {
      _setor_id: setorId,
      _search: query || null,
      _limit: query ? 20 : 60,
    });

    if (cachedError) {
      return jsonResponse(400, { error: cachedError.message });
    }

    const suggestions = ((cachedRows ?? []) as LogradouroApiItem[]).map((item) => ({
      ...item,
      nome: normalizeStreetName(item.nome),
    }));

    return jsonResponse(200, { data: suggestions });
  } catch (error) {
    console.error('Unexpected error in demutran-logradouros-cep:', error);
    return jsonResponse(500, { error: 'Unexpected server error.' });
  }
});
