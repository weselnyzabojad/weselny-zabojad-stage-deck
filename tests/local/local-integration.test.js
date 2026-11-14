import { beforeAll, describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.LOCAL_SUPABASE_URL;
const ANON = process.env.LOCAL_SUPABASE_ANON_KEY;
const SERVICE = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.LOCAL_JWT_SECRET;
const FUNCTIONS = process.env.LOCAL_FUNCTIONS_URL;
const WEDDING_ID = '2026-08-20_jennifer_guillaume';
const ROOM_CODE = 'demo01';
const DEVICE = `local-test-${Date.now()}`;

const functionsHeaders = {
  apikey: ANON,
  Authorization: `Bearer ${ANON}`,
  'Content-Type': 'application/json',
};

async function callFunction(name, body, token = ANON) {
  const response = await fetch(`${FUNCTIONS}/${name}`, {
    method: 'POST',
    headers: {
      ...functionsHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

let admin;
let anon;
let mcToken;

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function localRoleToken(payload) {
  if (!JWT_SECRET) throw new Error('LOCAL_JWT_SECRET is missing; run test:local.');
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

beforeAll(async () => {
  if (!SUPABASE_URL || !ANON || !SERVICE || !FUNCTIONS) {
    throw new Error('Run this suite with `npm run test:local`; local Supabase env is missing.');
  }
  const host = new URL(SUPABASE_URL).hostname;
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) {
    throw new Error('test:local refuses non-local Supabase URLs.');
  }
  admin = createClient(SUPABASE_URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  anon = createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
});

describe('local database contract', () => {
  it('has the seeded wedding, registry and providers', async () => {
    const { data: wedding, error } = await admin
      .from('weddings')
      .select('wedding_id, room_code, cartridge')
      .eq('wedding_id', WEDDING_ID)
      .maybeSingle();
    expect(error).toBeNull();
    expect(wedding?.room_code).toBe(ROOM_CODE);
    expect(wedding?.cartridge?.servicePackage).toBe('HOST_AND_DJ_VIP');

    const { data: vipDjs } = await admin.from('vip_djs').select('id').eq('active', true);
    expect((vipDjs ?? []).map((row) => row.id)).toEqual(
      expect.arrayContaining(['dj_mark', 'dj_szymoniak']),
    );

    const { data: providers } = await admin
      .from('wedding_service_providers')
      .select('category, vip_dj_id')
      .eq('wedding_id', WEDDING_ID)
      .eq('active', true);
    expect(providers?.find((row) => row.category === 'dj')?.vip_dj_id).toBe('dj_mark');
  });
});

describe('local RLS contract', () => {
  it('denies anon access to protected registry and role tables', async () => {
    const registry = await anon.from('vip_djs').select('*');
    expect(registry.error).toBeTruthy();
    const roles = await anon.from('wedding_roles').select('*');
    expect(roles.error).toBeTruthy();
  });

  it('lets a joined role read only its own room', async () => {
    const join = await callFunction('join_room', {
      roomCode: ROOM_CODE,
      role: 'mc',
      pin: '111111',
      deviceId: DEVICE,
    });
    expect(join.status).toBe(200);
    mcToken = join.data.token;
    expect(mcToken).toBeTruthy();
    const payload = JSON.parse(
      Buffer.from(mcToken.split('.')[1], 'base64url').toString('utf8'),
    );
    const localToken = localRoleToken(payload);

    const joined = createClient(SUPABASE_URL, ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${localToken}` } },
    });
    const own = await joined
      .from('live_sync_state')
      .select('wedding_id')
      .eq('wedding_id', `wzsd:${WEDDING_ID}`);
    expect(own.error).toBeNull();
    expect(own.data).toHaveLength(1);

    const other = await joined
      .from('live_sync_state')
      .select('wedding_id')
      .eq('wedding_id', 'wzsd:another-room');
    expect(other.error).toBeNull();
    expect(other.data).toHaveLength(0);
  });

  it('rejects a wrong PIN', async () => {
    const join = await callFunction('join_room', {
      roomCode: ROOM_CODE,
      role: 'dj',
      pin: '000000',
      deviceId: `${DEVICE}-bad`,
    });
    expect(join.status).toBe(401);
  });
});

describe('local Edge Functions', () => {
  it('runs the song request submit/status lifecycle', async () => {
    const submit = await callFunction('submit_song_request', {
      roomCode: ROOM_CODE,
      song: 'Local Test Song',
      artist: 'Local Test Artist',
      device_id: DEVICE,
    });
    expect(submit.status).toBe(202);
    expect(submit.data.requestId).toBeTruthy();

    const status = await callFunction('get_song_request_status', {
      roomCode: ROOM_CODE,
      requestId: submit.data.requestId,
      device_id: DEVICE,
    });
    expect(status.status).toBe(200);
    expect(status.data.request.status).toBe('pending');
  });

  it('rejects unauthenticated speech key requests', async () => {
    const response = await fetch(`${FUNCTIONS}/reveal_speech_key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speechId: 'speech_witness' }),
    });
    expect(response.status).toBe(401);
  });
});

