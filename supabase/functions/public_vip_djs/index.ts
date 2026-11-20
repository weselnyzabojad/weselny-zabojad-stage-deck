// Supabase Edge Function: public_vip_djs
//
// Public landing projection for active VIP DJ partners. Only id, display name,
// logo URL and sort order are returned; contact data never leaves the database.
//
// Deploy:
//   supabase functions deploy public_vip_djs
// Secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ALLOWED_ORIGIN (optional)

import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN')?.trim() ?? '';

function originAllowed(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  return !origin || (ALLOWED_ORIGIN !== '' && origin === ALLOWED_ORIGIN);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
}

function serverEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

Deno.serve(async (req) => {
  if (!originAllowed(req)) return json({ error: 'Origin not allowed.' }, 403);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  try {
    const admin = createClient(serverEnv('SUPABASE_URL'), serverEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin
      .from('vip_djs')
      .select('id, display_name, logo_url, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('display_name', { ascending: true });
    if (error) throw error;
    return json({
      partners: (data ?? []).map((row: any) => ({
        id: row.id,
        displayName: row.display_name,
        logoUrl: row.logo_url,
        order: row.sort_order,
      })),
    });
  } catch {
    return json({ error: 'Partners are unavailable.' }, 500);
  }
});
