// Supabase Auth + admin_api client for `/deck/admin` (issue #76).
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

  const response = await fetch(`${config.functionsUrl}/admin_api`, {
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

  const response = await fetch(`${config.functionsUrl}/admin_drive`, {
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

export async function previewDriveSource(fileId) {
  if (ADMIN_DEMO) throw new Error('Google Drive preview is unavailable in demo mode.');
  return callAdminDrive('preview', { fileId });
}

export async function publishWedding(payload) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('publish');
  }
  return callAdmin('publish', payload);
}

export async function duplicateWedding(payload) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('duplicate');
  }
  return callAdmin('duplicate', payload);
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

export async function revokeSession(jti) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('revoke_session');
  }
  return callAdmin('revoke_session', { jti });
}
