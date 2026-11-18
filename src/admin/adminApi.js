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

export async function changeAdminPassword(newPassword) {
  if (ADMIN_DEMO) throw new Error('Password changes are unavailable in demo mode.');
  return callAdmin('change_password', { newPassword: String(newPassword) });
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

export async function checkServiceHealth() {
  const config = getAdminConfig();
  if (!config.configured) throw new Error('Supabase is not configured for this build.');

  const session = await getAdminSession();
  if (!session?.access_token) throw new Error('Admin session expired. Sign in again.');

  const response = await fetchAdminEndpoint(`${config.functionsUrl}/service_health`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.anonKey,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: '{}',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || 'Health check failed.');
    error.status = response.status;
    throw error;
  }
  return data;
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

export async function fetchMusicEngagement(weddingId) {
  if (ADMIN_DEMO) return { requests: [], eventComplete: false };
  return callAdmin('music_engagement', { weddingId });
}

export async function listAdminData() {
  if (ADMIN_DEMO) {
    const { demoList } = await import('./adminDemoApi.js');
    return demoList();
  }
  return callAdmin('list');
}

export async function fetchPortfolioKpis(filters = {}) {
  if (ADMIN_DEMO) {
    const { demoPortfolio } = await import('./adminDemoApi.js');
    return demoPortfolio(filters);
  }
  return callAdmin('portfolio_kpis', filters);
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
    error.errors = Array.isArray(data?.errors) ? data.errors : [];
    error.progress = Array.isArray(data?.progress) ? data.progress : [];
    throw error;
  }
  return data;
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

export async function listDrivePermissions(fileId) {
  if (ADMIN_DEMO) return { permissions: [] };
  return callAdminDrive('list_permissions', { fileId });
}

export async function shareDriveFile(payload) {
  if (ADMIN_DEMO) throw new Error('File sharing is unavailable in demo mode.');
  return callAdminDrive('share_file', payload);
}

export async function revokeDrivePermission(payload) {
  if (ADMIN_DEMO) throw new Error('File sharing is unavailable in demo mode.');
  return callAdminDrive('revoke_permission', payload);
}

export async function listSpeeches(weddingId) {
  return callAdmin('list_speeches', { weddingId });
}

export async function createSpeechDoc(payload) {
  if (ADMIN_DEMO) throw new Error('Speech Doc creation is unavailable in demo mode.');
  return callAdminDrive('create_speech_doc', payload);
}

export async function renameSpeechDoc(payload) {
  if (ADMIN_DEMO) throw new Error('Speech Doc rename is unavailable in demo mode.');
  return callAdminDrive('rename_speech_doc', payload);
}

export async function parseSpeechDoc(payload) {
  if (ADMIN_DEMO) throw new Error('Speech Doc parsing is unavailable in demo mode.');
  return callAdminDrive('parse_speech_doc', payload);
}

export async function createGameQuestionDoc(payload) {
  if (ADMIN_DEMO) throw new Error('Game question Doc creation is unavailable in demo mode.');
  return callAdminDrive('create_game_question_doc', payload);
}

export async function rewriteGameQuestionDocColumns(payload) {
  if (ADMIN_DEMO) throw new Error('Game question Doc rewriting is unavailable in demo mode.');
  return callAdminDrive('rewrite_game_question_doc_columns', payload);
}

export async function parseGameQuestionDoc(payload) {
  if (ADMIN_DEMO) throw new Error('Game question Doc parsing is unavailable in demo mode.');
  return callAdminDrive('parse_game_question_doc', payload);
}

export async function listGameQuestions(weddingId) {
  if (ADMIN_DEMO) {
    return { games: [], docs: [], revisions: [], logs: [], activeGameTypes: [] };
  }
  return callAdmin('list_game_questions', { weddingId });
}

export async function preflightGameMigration(weddingId, weddingFolderId = '') {
  if (ADMIN_DEMO) {
    return {
      games: [],
      hasLegacy: false,
      requiresConfirmation: false,
      questionCount: 0,
      unlinkedQuestionCount: 0,
    };
  }
  return callAdmin('preflight_game_migration', {
    weddingId,
    ...(weddingFolderId ? { weddingFolderId } : {}),
  });
}

export async function migrateGameQuestions(payload) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('game_migration');
    return { ok: true, migrated: 0, discarded: 0, alreadyMigrated: true };
  }
  return callAdmin('migrate_game_questions', payload);
}

export async function publishGameQuestions(payload) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('game_questions_publish');
    return { ok: true, gameType: payload?.gameType, revision: 1 };
  }
  return callAdmin('publish_game_questions', payload);
}

export async function restoreGameQuestions(payload) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('game_questions_restore');
    return { ok: true, gameType: payload?.gameType, revision: payload?.revision };
  }
  return callAdmin('restore_game_questions', payload);
}

export async function deleteGameQuestions(payload) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('game_questions_delete');
    return { ok: true };
  }
  return callAdmin('delete_game_questions', payload);
}

export async function publishSpeech(payload) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('speech_publish');
    return { ok: true };
  }
  return callAdmin('publish_speech', payload);
}

export async function upsertSpeechMetadata(payload) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('speech_metadata');
    return { speech: payload };
  }
  return callAdmin('upsert_speech_metadata', payload);
}

export async function restoreSpeech(payload) {
  return callAdmin('restore_speech', payload);
}

export async function rotateSpeechAccess(payload) {
  return callAdmin('rotate_speech_access', payload);
}

export async function revokeSpeechAccess(payload) {
  return callAdmin('revoke_speech_access', payload);
}

export async function deleteSpeech(payload) {
  return callAdmin('delete_speech', payload);
}

export async function preflightDocMigration(weddingId, weddingFolderId = '') {
  if (ADMIN_DEMO) {
    return {
      weddingId,
      weddingIdValid: true,
      entries: [],
      counts: { total: 0, ready: 0, alreadyMigrated: 0, conflicts: 0 },
    };
  }
  return callAdmin('preflight_doc_migration', {
    weddingId,
    ...(weddingFolderId ? { weddingFolderId } : {}),
  });
}

export async function migrateDocs(payload) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('doc_migration');
    return { ok: true, alreadyMigrated: true, summary: { migrated: 0 } };
  }
  return callAdmin('migrate_docs', payload);
}

export async function preflightSpeechMigration(weddingId) {
  return callAdmin('preflight_speech_migration', { weddingId });
}

export async function migrateSpeeches(payload) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('speech_migration');
    return { ok: true, migrated: 0, discarded: 0 };
  }
  return callAdmin('migrate_speeches', payload);
}

export async function getRevisionContext(weddingId) {
  if (ADMIN_DEMO) {
    return { wedding: null, liveState: null, history: [] };
  }
  return callAdmin('revision_context', { weddingId });
}

export async function getRecapSource(weddingId) {
  if (ADMIN_DEMO) {
    return { wedding: null, liveState: null, songRequests: [] };
  }
  return callAdmin('recap_source', { weddingId });
}

export async function publishRecap(weddingId, payload) {
  if (ADMIN_DEMO) throw new Error('Recap publishing is unavailable in demo mode.');
  return callAdmin('publish_recap', { weddingId, payload });
}

export async function listRecaps(weddingId) {
  if (ADMIN_DEMO) return { recaps: [] };
  return callAdmin('list_recaps', { weddingId });
}

export async function revokeRecap(weddingId, recapId) {
  if (ADMIN_DEMO) throw new Error('Recap revocation is unavailable in demo mode.');
  return callAdmin('revoke_recap', { weddingId, recapId });
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

export async function listWeddingRoles(weddingId) {
  return callAdmin('list_roles', { weddingId });
}

export async function setWeddingRole(weddingId, role, pins = null) {
  return callAdmin('set_role', { weddingId, role, ...(pins ? { pins } : {}) });
}

export async function removeWeddingRole(weddingId, role) {
  return callAdmin('remove_role', { weddingId, role });
}

export async function confirmWeddingMc(weddingId, mode) {
  return callAdmin('confirm_mc', { weddingId, mode });
}

export async function listMusicians(weddingId) {
  if (ADMIN_DEMO) {
    return {
      expected: true,
      musicians: [
        {
          id: 'demo-musician-1',
          name: 'Anna',
          instrument: 'violin',
          start_time: '15:00',
          end_time: '21:00',
          ceremony_required: true,
          notes: 'Ceremony and dinner.',
          active: true,
        },
      ],
    };
  }
  return callAdmin('list_musicians', { weddingId });
}

export async function upsertMusician(payload) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('musician_upsert');
    return { musician: { id: payload.id ?? 'demo-musician-1', ...payload } };
  }
  return callAdmin('upsert_musician', payload);
}

export async function deactivateMusician(weddingId, id) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('musician_deactivate');
    return { musician: { id, active: false } };
  }
  return callAdmin('deactivate_musician', { weddingId, id });
}

export async function deleteMusician(weddingId, id) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('musician_delete');
    return { removed: true };
  }
  return callAdmin('delete_musician', { weddingId, id });
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

export async function listVipDjs() {
  if (ADMIN_DEMO) {
    return {
      vipDjs: [
        { id: 'dj_mark', display_name: 'DJ Mark', active: true, package_default: 'HOST_AND_DJ_VIP' },
        { id: 'dj_szymoniak', display_name: 'DJ Szymoniak', active: true, package_default: null },
        { id: 'dj_zaremba', display_name: 'DJ Zaremba', active: true, package_default: null },
      ],
    };
  }
  return callAdmin('list_vip_djs');
}

export async function upsertVipDj(payload) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('vip_dj_upsert');
    return { vipDj: payload };
  }
  return callAdmin('upsert_vip_dj', payload);
}

export async function deactivateVipDj(id) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('vip_dj_deactivate');
    return { ok: true };
  }
  return callAdmin('deactivate_vip_dj', { id });
}

export async function revokeSession(jti) {
  if (ADMIN_DEMO) {
    const { demoMutate } = await import('./adminDemoApi.js');
    demoMutate('revoke_session');
  }
  return callAdmin('revoke_session', { jti });
}
