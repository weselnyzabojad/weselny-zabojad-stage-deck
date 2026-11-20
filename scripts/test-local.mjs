#!/usr/bin/env node
// Opt-in local integration suite (issue #920). Never runs against a host.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { assertLocalSupabaseUrl } from './lib/local-guard.mjs';

const ROOT = process.cwd();
const CLIENT_ENV = `${ROOT}/.env.local`;
const SERVER_ENV = `${ROOT}/supabase/.env.local`;

function parseEnv(file) {
  const values = {};
  if (!existsSync(file)) return values;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) values[match[1]] = match[2].replace(/^"|"$/g, '');
  }
  return values;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: options.capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: options.env ?? process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
  return result;
}

function status() {
  const result = run('npx', ['supabase', 'status', '-o', 'env'], {
    capture: true,
    allowFailure: true,
  });
  if (result.status !== 0) return null;
  const values = {};
  for (const line of (result.stdout ?? '').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/.exec(line.trim());
    if (match) values[match[1]] = match[2];
  }
  return {
    apiUrl: values.API_URL ?? values.SUPABASE_URL ?? '',
    anonKey: values.ANON_KEY ?? '',
    serviceKey: values.SERVICE_ROLE_KEY ?? '',
    jwtSecret: values.JWT_SECRET ?? '',
  };
}

function functionsReady(apiUrl) {
  return fetch(`${apiUrl.replace(/\/+$/, '')}/functions/v1/join_room`, { method: 'OPTIONS' })
    .then((response) => response.ok || response.status === 405 || response.status === 401)
    .catch(() => false);
}

try {
  let current = status();
  if (!current?.apiUrl) {
    console.error('Local Supabase is not running. Starting it with `npm run local:start`...');
    run('npm', ['run', 'local:start']);
    current = status();
  }
  if (!current?.apiUrl) {
    console.error('Local Supabase did not report a URL. Run `npm run local:start` and retry.');
    process.exit(1);
  }
  assertLocalSupabaseUrl(current.apiUrl, 'test:local Supabase URL');

  const client = parseEnv(CLIENT_ENV);
  const server = parseEnv(SERVER_ENV);
  const env = {
    ...process.env,
    LOCAL_SUPABASE_URL: current.apiUrl,
    LOCAL_SUPABASE_ANON_KEY: current.anonKey || client.VITE_SUPABASE_ANON_KEY || '',
    LOCAL_SUPABASE_SERVICE_ROLE_KEY:
      current.serviceKey || server.SUPABASE_SERVICE_ROLE_KEY || '',
    LOCAL_FUNCTIONS_URL: `${current.apiUrl.replace(/\/+$/, '')}/functions/v1`,
    VITE_SUPABASE_URL: current.apiUrl,
    VITE_SUPABASE_ANON_KEY: current.anonKey || client.VITE_SUPABASE_ANON_KEY || '',
    LOCAL_JWT_SECRET: current.jwtSecret || server.LOCAL_JWT_SECRET || '',
  };
  if (!env.LOCAL_SUPABASE_ANON_KEY || !env.LOCAL_SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Local keys are missing. Run `npm run local:start` to regenerate the env files.');
    process.exit(1);
  }
  if (!(await functionsReady(current.apiUrl))) {
    console.error('Edge Functions are unavailable. Run `npm run local:start` and retry.');
    process.exit(1);
  }

  const result = run('npx', ['vitest', 'run', '--config', 'vitest.local.config.js'], { env });
  process.exit(result.status ?? 1);
} catch (error) {
  console.error(error.message ?? error);
  process.exit(1);
}
