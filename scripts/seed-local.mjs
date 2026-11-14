#!/usr/bin/env node
// Deterministic local-only seed for issue #918. Refuses any non-local target.

import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { DEFAULT_WEDDING } from '../src/demo/demoWedding.js';

const ROOT = process.cwd();
const CLIENT_ENV = `${ROOT}/.env.local`;
const SERVER_ENV = `${ROOT}/supabase/.env.local`;
const WEDDING_ID = DEFAULT_WEDDING.weddingId;
const ROOM_CODE = 'demo01';
const ADMIN_EMAIL = 'owner@local.test';
const ADMIN_PASSWORD = 'local-owner-123';
const ROLES = {
  mc: '111111',
  dj: '222222',
  photo1: '333333',
  photo2: '444444',
  video: '555555',
  venue_manager: '666666',
  speaker: '777777',
};

function parseEnv(file) {
  const values = {};
  if (!existsSync(file)) return values;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!match) continue;
    values[match[1]] = match[2].replace(/^"|"$/g, '');
  }
  return values;
}

function localOnly(url) {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  } catch {
    return false;
  }
}

const clientEnv = parseEnv(CLIENT_ENV);
const serverEnv = parseEnv(SERVER_ENV);
const url = process.env.VITE_SUPABASE_URL || clientEnv.VITE_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || serverEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !localOnly(url)) {
  console.error('local:seed refuses non-local Supabase targets. Set VITE_SUPABASE_URL to localhost/127.0.0.1.');
  process.exit(1);
}
if (!serviceKey) {
  console.error('Missing local service-role key. Run `npm run local:start` first.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureAdminUser() {
  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;
  const existing = list?.users?.find((user) => user.email === ADMIN_EMAIL);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

async function seed() {
  const userId = await ensureAdminUser();
  const cartridge = {
    ...DEFAULT_WEDDING,
    djIdentityId: 'dj_mark',
  };

  const { error: weddingError } = await admin.from('weddings').upsert(
    {
      wedding_id: WEDDING_ID,
      room_code: ROOM_CODE,
      couple: 'Jennifer & Guillaume',
      date: DEFAULT_WEDDING.date,
      cartridge,
      mc_confirmed_by: 'OWNER',
    },
    { onConflict: 'wedding_id' },
  );
  if (weddingError) throw weddingError;

  const { error: adminError } = await admin.from('app_admins').upsert(
    { user_id: userId, email: ADMIN_EMAIL },
    { onConflict: 'user_id' },
  );
  if (adminError) throw adminError;

  const roleRows = Object.entries(ROLES).map(([role, pin]) => ({
    wedding_id: WEDDING_ID,
    role,
    pin_hash: bcrypt.hashSync(pin, 10),
  }));
  const { error: roleError } = await admin
    .from('wedding_roles')
    .upsert(roleRows, { onConflict: 'wedding_id,role' });
  if (roleError) throw roleError;

  await admin.from('wedding_service_providers').delete().eq('wedding_id', WEDDING_ID);
  const providers = [
    { category: 'dj', vip_dj_id: 'dj_mark', first_name: 'DJ', last_name: 'Mark' },
    { category: 'mc', first_name: 'Demo', last_name: 'MC' },
    { category: 'photo1', first_name: 'Demo', last_name: 'Photographer' },
    { category: 'photo2', first_name: 'Second', last_name: 'Photographer' },
    { category: 'video', first_name: 'Demo', last_name: 'Cameraman' },
    { category: 'venue_manager', first_name: 'Demo', last_name: 'Venue' },
  ].map((provider) => ({ ...provider, wedding_id: WEDDING_ID, active: true }));
  const { error: providerError } = await admin
    .from('wedding_service_providers')
    .insert(providers);
  if (providerError) throw providerError;

  const { error: liveError } = await admin.from('live_sync_state').upsert(
    {
      wedding_id: `wzsd:${WEDDING_ID}`,
      state: DEFAULT_WEDDING.liveSyncState ?? {},
    },
    { onConflict: 'wedding_id' },
  );
  if (liveError) throw liveError;

  console.log('Local seed ready.');
  console.log(`  Wedding: ${WEDDING_ID}`);
  console.log(`  Room:    ${ROOM_CODE}`);
  console.log(`  Admin:   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log('  Role PINs:');
  for (const [role, pin] of Object.entries(ROLES)) console.log(`    ${role}: ${pin}`);
}

seed().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
