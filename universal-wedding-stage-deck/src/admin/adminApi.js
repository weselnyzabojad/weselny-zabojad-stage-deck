// Supabase Auth + admin_api client for `/deck/admin` (issue #76).
//
// The browser only ever holds the public anon key and the owner's Auth session.
// Every admin mutation goes through the `admin_api` Edge Function, which checks
// the allowlist and aal2 MFA with the service role.
import { createClient } from '@supabase/supabase-js';
import { getSyncConfig } from '../lib/sync/syncConfig.js';

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
  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

export function onAdminAuthChange(handler) {
  const supabase = getAdminClient();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => handler(session));
  return () => data.subscription.unsubscribe();
}

export async function signInAdmin(email, password) {
  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email).trim(),
    password,
  });
  if (error) throw error;
  return data.session;
}

export async function signOutAdmin() {
  const supabase = getAdminClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getMfaState() {
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
    throw error;
  }
  return data;
}

export async function listAdminData() {
  return callAdmin('list');
}

export async function publishWedding(payload) {
  return callAdmin('publish', payload);
}

export async function duplicateWedding(payload) {
  return callAdmin('duplicate', payload);
}

export async function archiveWedding(weddingId) {
  return callAdmin('archive', { weddingId });
}

export async function deleteWedding(weddingId) {
  return callAdmin('delete', { weddingId });
}

export async function rotatePins(weddingId, roles, pins = null) {
  return callAdmin('rotate_pins', { weddingId, roles, ...(pins ? { pins } : {}) });
}

export async function revokeSession(jti) {
  return callAdmin('revoke_session', { jti });
}
