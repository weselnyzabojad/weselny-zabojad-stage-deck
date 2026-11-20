#!/usr/bin/env node
// Guards the production CORS rule for the release PR (development -> master).
//
// Supabase secrets are write-only, so the CI check verifies the deployed
// behaviour instead of reading the value:
//   - https://deck.weselnyzabojad.pl must be accepted,
//   - localhost, www, the bare domain and an unknown origin must be rejected.
//
// With --exact and SUPABASE_ACCESS_TOKEN set, it also compares the SHA-256 of
// the configured ALLOWED_ORIGIN with the expected production origin.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const PROJECT_REF = 'qdcuxefperykmjlirufe';
export const EXPECTED_ORIGIN = 'https://deck.weselnyzabojad.pl';
export const FUNCTIONS = ['admin_api', 'admin_drive'];
export const FORBIDDEN_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'https://www.weselnyzabojad.pl',
  'https://weselnyzabojad.pl',
  'https://cors-check.invalid',
];

const BASE = `https://${PROJECT_REF}.supabase.co/functions/v1`;

export function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

// Returns an error message, or null when the preflight result is correct.
export function checkPreflightResult(origin, result) {
  if (origin === EXPECTED_ORIGIN) {
    if (result.status !== 200) return `expected origin returned HTTP ${result.status}`;
    if (result.allowOrigin !== EXPECTED_ORIGIN) {
      return `expected origin returned Access-Control-Allow-Origin "${result.allowOrigin}"`;
    }
    return null;
  }
  if (result.status === 200) return `forbidden origin was accepted with HTTP 200`;
  if (result.allowOrigin === origin) {
    return `forbidden origin was echoed in Access-Control-Allow-Origin`;
  }
  return null;
}

async function preflight(name, origin) {
  const response = await fetch(`${BASE}/${name}`, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
    signal: AbortSignal.timeout(15000),
  });
  return {
    status: response.status,
    allowOrigin: response.headers.get('access-control-allow-origin'),
    vary: response.headers.get('vary'),
  };
}

export function exactSecretError(listJson, tokenPresent = process.env.SUPABASE_ACCESS_TOKEN) {
  if (!tokenPresent) {
    return 'SUPABASE_ACCESS_TOKEN is required for the exact ALLOWED_ORIGIN check';
  }
  const secrets = Array.isArray(listJson?.secrets) ? listJson.secrets : [];
  const secret = secrets.find((entry) => entry?.name === 'ALLOWED_ORIGIN');
  if (!secret) return 'ALLOWED_ORIGIN is not configured on the production project';
  const expectedHash = sha256(EXPECTED_ORIGIN);
  if (String(secret.value).toLowerCase() !== expectedHash) {
    return `ALLOWED_ORIGIN must be exactly ${EXPECTED_ORIGIN}`;
  }
  return null;
}

function readExactSecretError() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    return 'SUPABASE_ACCESS_TOKEN is required for the exact ALLOWED_ORIGIN check';
  }
  const raw = execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['--yes', 'supabase', 'secrets', 'list', `--remote=${PROJECT_REF}`, '--output', 'json'],
    { encoding: 'utf8', env: { ...process.env, SUPABASE_ACCESS_TOKEN: token } },
  );
  return exactSecretError(JSON.parse(raw));
}

export async function run({ exact = false, log = console.log } = {}) {
  const failures = [];
  for (const name of FUNCTIONS) {
    for (const origin of [EXPECTED_ORIGIN, ...FORBIDDEN_ORIGINS]) {
      const result = await preflight(name, origin);
      const error = checkPreflightResult(origin, result);
      if (error) failures.push(`${name} ${origin}: ${error}`);
      else log(`ok ${name} ${origin} -> HTTP ${result.status}`);
    }
  }

  if (exact) {
    try {
      const error = readExactSecretError();
      if (error) failures.push(`ALLOWED_ORIGIN exact check: ${error}`);
      else log(`ok ALLOWED_ORIGIN is exactly ${EXPECTED_ORIGIN}`);
    } catch (error) {
      failures.push(`ALLOWED_ORIGIN exact check failed: ${error.message}`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    throw new Error(`Production CORS origin check failed (${failures.length} issue(s)).`);
  }
  log('Production CORS origin check passed.');
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  run({ exact: process.argv.includes('--exact') }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
