// Supabase Auth + admin_api client for `/admin` (issue #76).
//
// The browser only ever holds the public anon key and the owner's Auth session.
// Every admin mutation goes through the `admin_api` Edge Function, which checks
// the allowlist and aal2 MFA with the service role.
import { createClient } from '@supabase/supabase-js';
import { getSyncConfig } from '../lib/sync/syncConfig.js';

// Inlined (not imported) so Vite/Rollup can statically remove the demo branches
// and the dynamic import entirely from production builds.
const ADMIN_DEMO = import.meta.env.DEV && import.meta.env.VITE_ADMIN_DEMO === '1';

const AUTH_STORAGE_KEY = 'wzsd:v1:admin-auth';

let client = null;
let clientKey = '';

export function getAdminConfig(env = import.meta.env) {
  const config = getSyncConfig(env);
  return {
    ...config,
    configured: Boolean(config.url && config.anonKey && config.functionsUrl),
  };
}

export function adminConfigured(env = import.meta.env) {
  if (ADMIN_DEMO) return true;
  return getAdminConfig(env).configured;
}

function adminEndpointError(endpoint, cause) {
  const error = new Error(
    `Could not reach ${endpoint}: ${cause?.message ?? 'network request failed'}`,
  );
  error.endpoint = endpoint;
  error.code = 'admin_endpoint_unreachable';
  error.cause = cause;
  return error;
}

async function fetchAdminEndpoint(url, options) {
  try {
    return await fetch(url, options);
  } catch (cause) {
    throw adminEndpointError(url, cause);
  }
}

export async function checkAdminBackend(env = import.meta.env) {
  const config = getAdminConfig(env);
  if (ADMIN_DEMO) {
    return {
      ok: true,
      readOnly: false,
      configured: true,
      adminApi: { ok: true, endpoint: 'demo' },
      adminDrive: { ok: true, endpoint: 'demo' },
      checkedAt: new Date().toISOString(),
    };
  }
  if (!config.configured) {
    return {
      ok: false,
      readOnly: true,
      configured: false,
      reason: 'Supabase is not configured for this build.',
      adminApi: { ok: false, endpoint: `${config.functionsUrl}/admin_api` },
      adminDrive: { ok: false, endpoint: `${config.functionsUrl}/admin_drive` },
      checkedAt: new Date().toISOString(),
    };
  }

  async function probe(name) {
    const endpoint = `${config.functionsUrl}/${name}`;
    try {
      const response = await fetch(endpoint, {
        method: 'OPTIONS',
        headers: {
          apikey: config.anonKey,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,apikey,content-type',
        },
      });
      if (response.status === 404) {
        return { ok: false, endpoint, status: 404, error: `${name} is not deployed (404).` };
      }
      return { ok: true, endpoint, status: response.status };
    } catch (cause) {
      return {
        ok: false,
        endpoint,
        status: null,
        error: `Could not reach ${name}: ${cause?.message ?? 'network request failed'}`,
      };
    }
  }

  const [adminApi, adminDrive] = await Promise.all([probe('admin_api'), probe('admin_drive')]);

  if (adminDrive.ok) {
    try {
      const session = await getAdminSession();
      if (session?.access_token) {
        const response = await fetchAdminEndpoint(`${config.functionsUrl}/admin_drive`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: config.anonKey,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'status' }),
        });
        if (response.ok) {
          const status = await response.json().catch(() => ({}));
          adminDrive.configured = status.configured === true;
          if (!adminDrive.configured) {
            adminDrive.ok = false;
            adminDrive.error = 'admin_drive is deployed but the Drive connector is not configured.';
          }
        }
      }
    } catch {
      // Preflight remains reachability-only when no admin session exists yet.
    }
  }

  const ok = adminApi.ok && adminDrive.ok;
  return {
    ok,
    readOnly: !ok,
    configured: true,
    adminApi,
    adminDrive,
    reason: ok
      ? null
      : [
          !adminApi.ok ? adminApi.error ?? 'admin_api is unavailable.' : null,
          !adminDrive.ok ? adminDrive.error ?? 'admin_drive is unavailable.' : null,
        ]
          .filter(Boolean)
          .join(' '),
    checkedAt: new Date().toISOString(),
  };
}

export function getAdminClient(env = import.meta.env) {
  const config = getAdminConfig(env);
  if (!config.configured) throw new Error('Supabase is not configured for this build.');
  const key = `${config.url}::${config.anonKey}`;
  if (!client || clientKey !== key) {
    client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: AUTH_STORAGE_KEY,
      },
    });
    clientKey = key;
  }
  return client;
}

export async function getAdminSession() {
  if (ADMIN_DEMO) {
    const { demoSession } = await import('./adminDemoApi.js');
    return demoSession();
  }
  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

export function onAdminAuthChange(handler) {
  if (ADMIN_DEMO) return () => {};
  const supabase = getAdminClient();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => handler(session));
  return () => data.subscription.unsubscribe();
}

export async function signInAdmin(email, password) {
  if (ADMIN_DEMO) {
    const { demoSession } = await import('./adminDemoApi.js');
    return demoSession();
  }
  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email).trim(),
    password,
  });
  if (error) throw error;
  return data.session;
}

export async function signOutAdmin() {
  if (ADMIN_DEMO) return;
  const supabase = getAdminClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getMfaState() {
  if (ADMIN_DEMO) {
    const { demoMfaState } = await import('./adminDemoApi.js');
    return demoMfaState();
  }
  const supabase = getAdminClient();
  const [{ data: assurance, error: assuranceError }, { data: factors, error: factorsError }] =
    await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
  if (assuranceError) throw assuranceError;
  if (factorsError) throw factorsError;

  const totp = (factors?.totp ?? []).filter((factor) => factor.status === 'verified');
  return {
    currentLevel: assurance?.currentLevel ?? 'aal1',
    nextLevel: assurance?.nextLevel ?? null,
    factors: totp,
    needsChallenge: (assurance?.currentLevel ?? 'aal1') !== 'aal2' && totp.length > 0,
    needsEnrollment: totp.length === 0,
  };
}

export async function enrollTotp() {
  if (ADMIN_DEMO) return { factorId: 'demo-factor', qrCode: null, secret: null };
  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Stage Deck owner',
  });
  if (error) throw error;
  return {
    factorId: data.id,
    qrCode: data.totp?.qr_code ?? null,
    secret: data.totp?.secret ?? null,
  };
}

export async function verifyTotp(factorId, code) {
  if (ADMIN_DEMO) return { ok: true };
  const supabase = getAdminClient();
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeError) throw challengeError;

  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: String(code).trim(),
  });
  if (error) throw error;
  return data;
}

export async function challengeExistingFactor(code) {
  if (ADMIN_DEMO) return { ok: true };
  const state = await getMfaState();
  const factor = state.factors[0];
  if (!factor) throw new Error('No verified TOTP factor on this account.');
  return verifyTotp(factor.id, code);
}

export async function callAdmin(action, payload = {}) {
  const config = getAdminConfig();
  if (!config.configured) throw new Error('Supabase is not configured for this build.');

  const session = await getAdminSession();
  if (!session?.access_token) throw new Error('Admin session expired. Sign in again.');

  const endpoint = `${config.functionsUrl}/admin_api`;
  const response = await fetchAdminEndpoint(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.anonKey,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || 'Admin request failed.');
    error.status = response.status;
    error.requiresMfa = Boolean(data?.requiresMfa);
    error.requiresMfaReauth = Boolean(data?.requiresMfaReauth);
    error.currentRevision = data?.currentRevision ?? null;
    error.stale = Boolean(data?.stale);
    error.errors = Array.isArray(data?.errors) ? data.errors : [];
    throw error;
  }
  return data;
}

export async function listAdminData() {
  if (ADMIN_DEMO) {
    const { demoList } = await import('./adminDemoApi.js');
    return demoList();
  }
  return callAdmin('list');
}

// Admin-only Google Drive proxy (issue #169). The browser never talks to Google
// directly and never receives credentials or access tokens.
async function callAdminDrive(action, payload = {}) {
  const config = getAdminConfig();
  if (!config.configured) throw new Error('Supabase is not configured for this build.');

  const session = await getAdminSession();
  if (!session?.access_token) throw new Error('Admin session expired. Sign in again.');

  const endpoint = `${config.functionsUrl}/admin_drive`;
  const response = await fetchAdminEndpoint(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.anonKey,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || 'Google Drive request failed.');
    error.status = response.status;
    error.code = data?.code ?? null;
    throw error;
  }
  return data;
}

export async function listDriveSources({ query = '', pageToken = null, pageSize = 20 } = {}) {
  if (ADMIN_DEMO) return { files: [], nextPageToken: null };
  return callAdminDrive('list', { query, pageToken, pageSize });
}

export async function listDriveChildren({
  parentId,
  name = '',
  nameContains = '',
  mimeType = undefined,
  pageToken = null,
  pageSize = 100,
} = {}) {
  if (ADMIN_DEMO) return { files: [], nextPageToken: null };
  return callAdminDrive('children', {
    parentId,
    name,
    nameContains,
    ...(mimeType ? { mimeType } : {}),
    pageToken,
    pageSize,
  });
}

export async function previewDriveSource(fileId) {
  if (ADMIN_DEMO) throw new Error('Google Drive preview is unavailable in demo mode.');
  return callAdminDrive('preview', { fileId });
}

export async function importSpeechSource(fileId, { weddingId, speechId } = {}) {
  if (ADMIN_DEMO) throw new Error('Google Drive import is unavailable in demo mode.');
  return callAdminDrive('parse_speech', { fileId, weddingId, speechId });
}

export async function checkDriveSource(fileId, { expectedVersion = '', expectedChecksum = '' } = {}) {
  if (ADMIN_DEMO) return { changed: false, reason: 'unchanged', file: null };
  return callAdminDrive('check', { fileId, expectedVersion, expectedChecksum });
}

export async function getRevisionContext(weddingId) {
  if (ADMIN_DEMO) {
    return { wedding: null, liveState: null, history: [] };
  }
  return callAdmin('revision_context', { weddingId });
}

export async function publishDriveRevision(payload) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('publish');
  }
  return callAdmin('publish_drive', payload);
}

export async function restorePreviousRevision(weddingId, expectedRevision, revision = null) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('publish');
  }
  return callAdmin('restore_revision', {
    weddingId,
    expectedRevision,
    ...(Number.isInteger(revision) ? { revision } : {}),
  });
}

export async function publishWedding(payload) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('publish');
  }
  return callAdmin('publish', payload);
}

export async function archiveWedding(weddingId) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('archive');
  }
  return callAdmin('archive', { weddingId });
}

export async function deleteWedding(weddingId) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('delete');
  }
  return callAdmin('delete', { weddingId });
}

export async function rotatePins(weddingId, roles, pins = null) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('rotate_pins');
  }
  return callAdmin('rotate_pins', { weddingId, roles, ...(pins ? { pins } : {}) });
}

export async function listProviders(weddingId) {
  if (ADMIN_DEMO) return { providers: [] };
  return callAdmin('list_providers', { weddingId });
}

export async function upsertProvider(payload) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('provider_upsert');
    return { provider: payload };
  }
  return callAdmin('upsert_provider', payload);
}

export async function deactivateProvider(weddingId, id) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('provider_deactivate');
    return { ok: true };
  }
  return callAdmin('deactivate_provider', { weddingId, id });
}

export async function deleteProvider(weddingId, id) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('provider_delete');
    return { ok: true };
  }
  return callAdmin('delete_provider', { weddingId, id });
}

export async function revokeSession(jti) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('revoke_session');
  }
  return callAdmin('revoke_session', { jti });
}
