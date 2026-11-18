// Supabase Edge Function: admin_api (owner only)
//
// Every request carries a Supabase Auth access token. The owner must be in
// `public.app_admins` and the session must be aal2 (verified TOTP MFA).
// Destructive actions additionally require a TOTP re-auth within 5 minutes
// (`amr` claim), matching the `/admin` UI.
//
// Issue #165: this function is the only cartridge publication path. It
// revalidates the cartridge server-side, requires an optimistic-concurrency
// revision, and delegates the atomic increment to
// `public.stage_deck_publish_cartridge(...)`.
//
// Deploy:
//   supabase functions deploy admin_api
// Secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PUBLIC_DECK_URL, ALLOWED_ORIGIN

import { createClient } from 'npm:@supabase/supabase-js@2';
import bcrypt from 'npm:bcryptjs@2.4.3';
import Ajv2020 from 'npm:ajv@8.20.0/dist/2020.js';
import weddingSchema from '../_shared/wedding-schema-v1.1.json' with { type: 'json' };
import oczepinyDomain from '../_shared/domains/oczepiny.json' with { type: 'json' };
import firstDanceDomain from '../_shared/domains/first-dance.json' with { type: 'json' };
import attractionsDomain from '../_shared/domains/attractions.json' with { type: 'json' };
import culturalRulesDomain from '../_shared/domains/cultural-rules.json' with { type: 'json' };
import coupleProfileDomain from '../_shared/domains/couple-profile.json' with { type: 'json' };
import photoPlanDomain from '../_shared/domains/photo-plan.json' with { type: 'json' };
import miniSessionDomain from '../_shared/domains/mini-session.json' with { type: 'json' };
import groupPhotosDomain from '../_shared/domains/group-photos.json' with { type: 'json' };
import specialEffectsDomain from '../_shared/domains/special-effects.json' with { type: 'json' };
import cakeDomain from '../_shared/domains/cake.json' with { type: 'json' };
import musicPolicyDomain from '../_shared/domains/music-policy.json' with { type: 'json' };
import demographicsDomain from '../_shared/domains/demographics.json' with { type: 'json' };
import stepsDomain from '../_shared/domains/steps.json' with { type: 'json' };
import speechesDomain from '../_shared/domains/speeches.json' with { type: 'json' };
import witnessesDomain from '../_shared/domains/witnesses.json' with { type: 'json' };
import musiciansDomain from '../_shared/domains/musicians.json' with { type: 'json' };
import languagesDomain from '../_shared/domains/languages.json' with { type: 'json' };
import {
  authorizeAdminSession,
  decodeJwt,
  mfaFresh,
} from '../_shared/adminAuth.js';
import { isOriginAllowed, withCors } from '../_shared/cors.js';
import { buildPortfolioKpis } from '../_shared/portfolioKpis.js';
import { normalizeCountry, resolveVenueCountry } from '../_shared/venueLocation.js';
import {
  ALLOWED_ROLES,
  WEDDING_ID_PATTERN,
  buildDriveSourceMetadata,
  buildPublishAuditDetail,
  driveSourceChanged,
  normalizePublishRequest,
  normalizeRoles,
  projectedRolesForPackage,
  publishCartridge,
} from '../_shared/adminPublish.js';
import { makeCartridgeValidator } from '../_shared/cartridgeValidator.js';
import {
  normalizeMusicianPayload,
  withMusicianSnapshot,
} from '../_shared/musicians.js';
import {
  DRIVE_DOC_MIME_TYPE,
  createGoogleDriveConnector,
  driveErrorHttpStatus,
} from '../_shared/googleDrive.js';
import { decryptGameBundle, encryptGameBundle } from '../_shared/gameBundle.js';
import {
  defaultGameId,
  gameQuestionDocFolderPath,
  isGameActive,
  normalizeGameLanguages,
  normalizeGameType,
  parseGameQuestionDoc,
  validateGameQuestionPayload,
} from '../_shared/gameQuestions.js';
import {
  collectLegacyGameEntries,
  planGameMigration,
  stripLegacyGameQuestions,
} from '../_shared/gameMigration.js';
import { checkPasswordBreach } from '../_shared/passwordBreach.js';
import { decryptSpeechScript, encryptSpeechScript } from '../_shared/speechBundle.js';
import { decryptSecret } from '../_shared/speechSecrets.js';
import {
  buildDocMigrationPlan,
  executeDocMigration,
} from '../_shared/docMigration.js';

const validateCartridge = makeCartridgeValidator(Ajv2020, weddingSchema, [oczepinyDomain, firstDanceDomain, attractionsDomain, culturalRulesDomain, coupleProfileDomain, photoPlanDomain, miniSessionDomain, groupPhotosDomain, specialEffectsDomain, cakeDomain, musicPolicyDomain, demographicsDomain, stepsDomain, speechesDomain, witnessesDomain, musiciansDomain, languagesDomain]);
const driveConnector = createGoogleDriveConnector({
  clientEmail: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL') ?? '',
  privateKey: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY') ?? '',
  apiBase: Deno.env.get('GOOGLE_DRIVE_API_BASE') ?? '',
});

async function sha256Text(value: string) {
  const bytes = new TextEncoder().encode(String(value ?? ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const DESTRUCTIVE_ACTIONS = new Set([
  'archive',
  'delete',
  'rotate_pins',
  'revoke_session',
  'publish_drive',
  'restore_revision',
  'publish_game_questions',
  'restore_game_questions',
  'delete_game_questions',
  'change_password',
  'migrate_docs',
]);

// Issue #1046: archived weddings are read-only. Listing and explicit
// archive/delete/revoke remain available; every content or access mutation is
// blocked centrally before the action handler can write anything.
const ARCHIVED_BLOCKED_ACTIONS = new Set([
  'publish',
  'publish_drive',
  'restore_revision',
  'rotate_pins',
  'confirm_mc',
  'upsert_speech_metadata',
  'publish_speech',
  'restore_speech',
  'delete_speech',
  'rotate_speech_access',
  'revoke_speech_access',
  'preflight_doc_migration',
  'migrate_docs',
  'preflight_speech_migration',
  'migrate_speeches',
  'preflight_game_migration',
  'migrate_game_questions',
  'publish_game_questions',
  'restore_game_questions',
  'delete_game_questions',
  'publish_recap',
  'upsert_provider',
  'deactivate_provider',
  'delete_provider',
  'upsert_vip_dj',
  'deactivate_vip_dj',
  'upsert_musician',
  'deactivate_musician',
  'delete_musician',
  'set_role',
  'remove_role',
  'update_wedding_venue',
]);
const REQUIRED_ADMIN_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function serverEnv(name: string, fallback = '') {
  const value = Deno.env.get(name) ?? fallback;
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

function randomPin() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 900000;
  return String(100000 + value);
}

const RECAP_FORBIDDEN_KEYS = new Set([
  'phone',
  'email',
  'pin',
  'password',
  'secret',
  'token',
  'token_hash',
  'tokenHash',
  'device_id',
  'deviceId',
  'mutation_log',
  'mutationLog',
  'notes',
  'mcCues',
  'teleprompter',
  'speeches',
  'musicianSuggestions',
]);

function findForbiddenRecapKey(value: any, path = ''): string | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenRecapKey(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (RECAP_FORBIDDEN_KEYS.has(key)) return childPath;
    const found = findForbiddenRecapKey(child, childPath);
    if (found) return found;
  }
  return null;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function randomRecapToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function normalizeRecapPayload(payload: any, weddingId: string) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { error: 'A recap payload object is required.' };
  }
  if (payload.schemaVersion !== 1) {
    return { error: 'Unsupported recap schema version.' };
  }
  if (!payload.wedding || typeof payload.wedding !== 'object') {
    return { error: 'Recap wedding identity is required.' };
  }
  if (payload.wedding.id !== weddingId) {
    return { error: 'Recap wedding id does not match the requested wedding.' };
  }
  if (!payload.summary || typeof payload.summary !== 'object') {
    return { error: 'Recap summary is required.' };
  }
  if (!Array.isArray(payload.timeline)) {
    return { error: 'Recap timeline must be an array.' };
  }
  let serialized = '';
  try {
    serialized = JSON.stringify(payload);
  } catch {
    return { error: 'Recap payload is not serializable.' };
  }
  if (serialized.length > 512_000) {
    return { error: 'Recap payload is too large.' };
  }
  const forbidden = findForbiddenRecapKey(payload);
  if (forbidden) {
    return { error: `Recap payload contains a private field (${forbidden}).` };
  }
  return { payload };
}

const PROVIDER_CATEGORIES = new Set(['dj', 'photo1', 'photo2', 'video', 'venue_manager', 'mc', 'dj_mc', 'other']);
const PROVIDER_ROLE_CATEGORIES = new Set(['dj', 'photo1', 'photo2', 'video', 'venue_manager', 'mc', 'dj_mc']);

function cleanProviderField(value: unknown, max = 200) {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

function normalizeProviderPayload(body: any) {
  const category = typeof body?.category === 'string' ? body.category.trim().toLowerCase() : '';
  if (!PROVIDER_CATEGORIES.has(category)) return { error: 'Choose a valid provider category.' };

  const firstName = cleanProviderField(body?.firstName, 120);
  const lastName = cleanProviderField(body?.lastName, 120);
  if (!firstName || !lastName) return { error: 'First and last name are required.' };

  const email = cleanProviderField(body?.email, 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address.' };
  }

  const functionLabel = cleanProviderField(body?.functionLabel, 120);
  if (category === 'other' && !functionLabel) {
    return { error: 'A function label is required for Other providers.' };
  }

  const requestedVipDjId = cleanProviderField(body?.vipDjId, 40);
  if (category === 'dj_mc' && !requestedVipDjId) {
    return { error: 'DJ_MC providers require an active VIP DJ.' };
  }
  const vipDjId = category === 'dj' || category === 'dj_mc' ? requestedVipDjId : null;

  return {
    provider: {
      category,
      function_label: category === 'other' ? functionLabel : null,
      vip_dj_id: vipDjId,
      first_name: firstName,
      last_name: lastName,
      phone: cleanProviderField(body?.phone, 60),
      email,
      address: cleanProviderField(body?.address, 300),
      instagram: cleanProviderField(body?.instagram, 200),
      active: body?.active === false ? false : true,
    },
  };
}

async function requireWritableWedding(admin: any, weddingId: string) {
  const { data, error } = await admin
    .from('weddings')
    .select('wedding_id, archived_at')
    .eq('wedding_id', weddingId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { error: 'Wedding not found.', status: 404 };
  if (data.archived_at) return { error: 'Archived weddings are read-only.', status: 409 };
  return { wedding: data };
}

async function assertProviderCategoryFree(admin: any, weddingId: string, category: string, id?: string) {
  if (!PROVIDER_ROLE_CATEGORIES.has(category)) return null;
  let query = admin
    .from('wedding_service_providers')
    .select('id')
    .eq('wedding_id', weddingId)
    .eq('category', category)
    .limit(1);
  if (id) query = query.neq('id', id);
  const { data, error } = await query;
  if (error) throw error;
  return (data?.length ?? 0) > 0
    ? `A ${category} provider already exists for this wedding.`
    : null;
}

// Provider categories map 1:1 to stage roles; `other` grants no access.
function providerRole(category: string) {
  return PROVIDER_ROLE_CATEGORIES.has(category) ? category : null;
}

async function activeProviderForRole(admin: any, weddingId: string, role: string) {
  if (!PROVIDER_ROLE_CATEGORIES.has(role)) return null;
  const { data, error } = await admin
    .from('wedding_service_providers')
    .select('id, category, active')
    .eq('wedding_id', weddingId)
    .eq('category', role)
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

async function ensureProviderRole(admin: any, weddingId: string, role: string) {
  const { data: existing, error } = await admin
    .from('wedding_roles')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('role', role)
    .maybeSingle();
  if (error) throw error;
  if (existing) return { role, pin: null, created: false };

  const pin = randomPin();
  const { error: upsertError } = await admin.from('wedding_roles').upsert(
    { wedding_id: weddingId, role, pin_hash: bcrypt.hashSync(pin, 10) },
    { onConflict: 'wedding_id,role' },
  );
  if (upsertError) throw upsertError;
  return { role, pin, created: true };
}

async function revokeProviderRole(admin: any, weddingId: string, role: string) {
  const { error: deleteError } = await admin
    .from('wedding_roles')
    .delete()
    .eq('wedding_id', weddingId)
    .eq('role', role);
  if (deleteError) throw deleteError;

  const now = new Date().toISOString();
  const { error: sessionError } = await admin
    .from('role_sessions')
    .update({ revoked_at: now })
    .eq('wedding_id', weddingId)
    .eq('role', role)
    .is('revoked_at', null);
  if (sessionError) throw sessionError;

  const { error: presenceError } = await admin
    .from('role_presence')
    .update({ status: 'offline', session_jti: null, last_seen: now })
    .eq('wedding_id', weddingId)
    .eq('role', role);
  if (presenceError) throw presenceError;
}

function pinFor(role: string, requestedPins: Record<string, unknown> | null | undefined) {
  const requested = requestedPins?.[role];
  return typeof requested === 'string' && /^\d{6}$/.test(requested) ? requested : randomPin();
}

async function writeAudit(admin: any, actor: any, action: string, target: string | null, detail: unknown) {
  await admin.from('admin_audit_log').insert({
    actor_id: actor.user_id ?? actor.id,
    actor_email: actor.email,
    action,
    target,
    detail: detail ?? null,
  });
}

// Issue #992: musician access is per musician, never a shared wedding role.
async function revokeMusicianAccess(admin: any, weddingId: string, musicianId: string) {
  const now = new Date().toISOString();
  const { error: accessError } = await admin
    .from('wedding_musician_access')
    .delete()
    .eq('wedding_id', weddingId)
    .eq('musician_id', musicianId);
  if (accessError) throw accessError;
  const { error: sessionError } = await admin
    .from('role_sessions')
    .update({ revoked_at: now })
    .eq('wedding_id', weddingId)
    .eq('role', 'musician')
    .eq('musician_id', musicianId)
    .is('revoked_at', null);
  if (sessionError) throw sessionError;
  const { error: presenceError } = await admin
    .from('role_presence')
    .update({ status: 'offline', session_jti: null, last_seen: now })
    .eq('wedding_id', weddingId)
    .eq('role', 'musician')
    .eq('musician_id', musicianId);
  if (presenceError) throw presenceError;
}

async function ensureMusicianAccess(admin: any, weddingId: string, musicianId: string) {
  const { data: existing, error } = await admin
    .from('wedding_musician_access')
    .select('musician_id')
    .eq('wedding_id', weddingId)
    .eq('musician_id', musicianId)
    .maybeSingle();
  if (error) throw error;
  if (existing) return null;
  const pin = randomPin();
  const { error: insertError } = await admin.from('wedding_musician_access').insert({
    musician_id: musicianId,
    wedding_id: weddingId,
    pin_hash: bcrypt.hashSync(pin, 10),
  });
  if (insertError) throw insertError;
  return pin;
}

// Create the role PINs and the initial live state for a brand-new wedding.
// Content-only republications never reach this function, so existing PINs,
// sessions and live progress are preserved.
async function initializeNewWedding(
  admin: any,
  weddingId: string,
  roles: string[],
  cartridge: Record<string, any>,
  requestedPins: Record<string, unknown> | null | undefined,
) {
  const pins: Record<string, string> = {};
  const roleRows = roles.map((role) => {
    const pin = pinFor(role, requestedPins);
    pins[role] = pin;
    return {
      wedding_id: weddingId,
      role,
      pin_hash: bcrypt.hashSync(pin, 10),
    };
  });

  const { error: roleError } = await admin
    .from('wedding_roles')
    .upsert(roleRows, { onConflict: 'wedding_id,role' });
  if (roleError) throw roleError;

  await admin.from('live_sync_state').upsert(
    {
      wedding_id: `wzsd:${weddingId}`,
      state: cartridge.liveSyncState ?? {},
    },
    { onConflict: 'wedding_id', ignoreDuplicates: true },
  );

  return pins;
}

function publishResponse(result: any, pins: Record<string, string> | null) {
  return {
    weddingId: result.weddingId,
    roomCode: result.roomCode,
    roles: pins ?? {},
    created: result.created,
    previousRevision: result.previousRevision,
    cartridgeRevision: result.cartridgeRevision,
    cartridgeSource: result.cartridgeSource,
    cartridgeSourceMetadata: result.cartridgeSourceMetadata ?? null,
    cartridgePublishedAt: result.cartridgePublishedAt,
  };
}

async function weddingExists(admin: any, weddingId: string) {
  const { data, error } = await admin
    .from('weddings')
    .select('wedding_id')
    .eq('wedding_id', weddingId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function handlePublish(admin: any, allowlisted: any, body: any, { source = 'admin_json' } = {}) {  const normalized = normalizePublishRequest(body, { source });
  if (normalized.error) return { response: json({ error: normalized.error }, normalized.status) };

  // Issue #990: the admin-managed roster is persisted separately from the Doc
  // and snapshotted into every publication. The Doc keeps only `expected`.
  const { data: musicianRows, error: musicianError } = await admin
    .from('wedding_musicians')
    .select('*')
    .eq('wedding_id', normalized.request.weddingId)
    .order('created_at', { ascending: true });
  if (musicianError) throw musicianError;
  normalized.request.cartridge = withMusicianSnapshot(
    normalized.request.cartridge,
    musicianRows ?? [],
  );

  const published = await publishCartridge({
    admin,
    request: normalized.request,
    actor: allowlisted,
    validate: validateCartridge,
  });
  if (!published.ok) {
    await writeAudit(admin, allowlisted, 'publish_failed', normalized.request.weddingId, {
      source,
      error: published.error,
      stale: Boolean(published.stale),
      currentRevision: published.currentRevision ?? null,
      expectedRevision: normalized.request.expectedRevision,
      sourceMetadata: normalized.request.sourceMetadata,
    });
    return {
      response: json(
        {
          error: published.error,
          currentRevision: published.currentRevision ?? null,
          stale: Boolean(published.stale),
          errors: published.errors ?? undefined,
        },
        published.status,
      ),
    };
  }

  const result = published.result!;
  const pins = result.created
    ? await initializeNewWedding(
        admin,
        normalized.request.weddingId,
        normalized.request.roles,
        published.cartridge!,
        body?.pins,
      )
    : null;

  await writeAudit(
    admin,
    allowlisted,
    result.created ? 'publish_create' : 'publish',
    result.weddingId,
    buildPublishAuditDetail(result, normalized.request),
  );

  return { response: json(publishResponse(result, pins)) };
}

function validateSpeechPayload(speech: any) {
  const id = typeof speech?.id === 'string' ? speech.id.trim() : '';
  const speakerName = cleanProviderField(speech?.speaker?.name, 160);
  const speakerRelationship = cleanProviderField(speech?.speaker?.relationship, 160);
  const speakerLanguage =
    typeof speech?.speakerLanguage === 'string' ? speech.speakerLanguage.trim().toUpperCase() : '';
  const mcLanguage =
    typeof speech?.mcLanguage === 'string' ? speech.mcLanguage.trim().toUpperCase() : '';
  const script = typeof speech?.script === 'string' ? speech.script : '';
  const order = Number.isInteger(speech?.order) ? speech.order : null;
  if (!id) return { error: 'A speech id is required.' };
  if (!speakerName) return { error: 'Speaker name is required.' };
  if (!/^[A-Z]{2}$/.test(speakerLanguage) || !/^[A-Z]{2}$/.test(mcLanguage)) {
    return { error: 'Speaker and MC languages must be ISO 639-1 codes.' };
  }
  if (speakerLanguage === mcLanguage) {
    return { error: 'Speaker and MC languages must differ.' };
  }
  if (order == null || order < 1) return { error: 'A positive speech order is required.' };
  if (!script.trim()) return { error: 'The speech script is empty.' };
  return {
    value: {
      id,
      order,
      speakerName,
      speakerRelationship: speakerRelationship ?? null,
      speakerLanguage,
      mcLanguage,
      speakerAccess: speech?.speakerAccess !== false,
      script,
    },
  };
}

async function writeSpeechLog(
  admin: any,
  weddingId: string,
  action: string,
  detail: { actor?: string; docId?: string; docVersion?: string; code?: string; message?: string } = {},
) {
  await admin.from('speech_logs').insert({
    wedding_id: weddingId,
    actor: detail.actor ?? null,
    action,
    doc_id: detail.docId ?? null,
    doc_version: detail.docVersion ?? null,
    error_code: detail.code ?? null,
    message: detail.message ?? null,
  });
}

async function writeGameQuestionLog(
  admin: any,
  weddingId: string,
  gameType: string | null,
  action: string,
  detail: { actor?: string; code?: string; message?: string } = {},
) {
  await admin.from('game_question_logs').insert({
    wedding_id: weddingId,
    game_type: gameType,
    actor: detail.actor ?? null,
    action,
    code: detail.code ?? null,
    message: detail.message ?? null,
  });
}

async function liveGameState(admin: any, weddingId: string) {
  const { data } = await admin
    .from('live_sync_state')
    .select('state')
    .eq('wedding_id', `wzsd:${weddingId}`)
    .maybeSingle();
  return data?.state ?? null;
}

async function resolveWeddingFolderId(admin: any, weddingId: string, explicit: unknown) {
  const provided = typeof explicit === 'string' ? explicit.trim() : '';
  if (provided) return provided;
  const { data } = await admin
    .from('weddings')
    .select('cartridge_source_metadata')
    .eq('wedding_id', weddingId)
    .maybeSingle();
  const sourceFileId = data?.cartridge_source_metadata?.driveFileId;
  if (typeof sourceFileId !== 'string' || !sourceFileId.trim()) return '';
  try {
    const source = await driveConnector.getFileMetadata(sourceFileId.trim());
    return Array.isArray(source?.parents) ? source.parents[0] ?? '' : '';
  } catch {
    return '';
  }
}

// Walk existing folders only. Migration must never create or move Drive data.
async function findExistingFolderPath(weddingFolderId: string, path: any) {
  let parent = weddingFolderId;
  if (path?.scope === 'private') {
    try {
      parent = await driveConnector.resolveMonthFolderId(weddingFolderId);
    } catch {
      return null;
    }
  }
  for (const segment of Array.isArray(path?.segments) ? path.segments : []) {
    if (!parent) return null;
    const { files } = await driveConnector.listChildren({
      parentId: parent,
      name: segment,
    });
    if (!files[0]?.id) return null;
    parent = files[0].id;
  }
  return parent || null;
}

async function inspectGameQuestionDoc({
  weddingId,
  gameType,
  entry,
  doc,
  weddingFolderId,
  languages,
}: {
  weddingId: string;
  gameType: string;
  entry: any;
  doc: any;
  weddingFolderId: string;
  languages: string[] | null;
}) {
  const sourceDocId =
    (typeof doc?.drive_doc_id === 'string' && doc.drive_doc_id.trim()) ||
    (typeof entry?.sourceDocId === 'string' && entry.sourceDocId.trim()) ||
    '';
  if (!sourceDocId) return { readable: false, reason: 'no_drive_doc', code: 'no_drive_doc' };
  if (!languages || languages.length === 0) {
    return {
      readable: false,
      reason: 'missing_languages',
      code: 'missing_languages',
      sourceDocId,
    };
  }

  let file: any;
  try {
    file = await driveConnector.getFileMetadata(sourceDocId);
  } catch (error: any) {
    return {
      readable: false,
      reason: 'unreadable_doc',
      code: typeof error?.code === 'string' ? error.code : 'unreadable_doc',
      sourceDocId,
    };
  }
  if (file?.mimeType !== DRIVE_DOC_MIME_TYPE) {
    return {
      readable: false,
      reason: 'not_a_google_doc',
      code: 'not_a_google_doc',
      sourceDocId,
      file,
    };
  }

  let expectedFolderId =
    typeof doc?.drive_folder_id === 'string' && doc.drive_folder_id.trim()
      ? doc.drive_folder_id.trim()
      : '';
  if (!expectedFolderId && weddingFolderId) {
    try {
      expectedFolderId =
        (await findExistingFolderPath(
          weddingFolderId,
          gameQuestionDocFolderPath(gameType, weddingId),
        )) ?? '';
    } catch {
      expectedFolderId = '';
    }
  }
  if (!expectedFolderId) {
    return {
      readable: false,
      reason: 'missing_expected_folder',
      code: 'missing_expected_folder',
      sourceDocId,
      file,
    };
  }
  if (!Array.isArray(file.parents) || !file.parents.includes(expectedFolderId)) {
    return {
      readable: false,
      reason: 'wrong_folder',
      code: 'wrong_folder',
      sourceDocId,
      file,
    };
  }

  let source: any;
  try {
    source = await driveConnector.readSource(sourceDocId);
  } catch (error: any) {
    return {
      readable: false,
      reason: 'unreadable_doc',
      code: typeof error?.code === 'string' ? error.code : 'unreadable_doc',
      sourceDocId,
      file,
    };
  }

  const parsed = parseGameQuestionDoc(source.text, gameType, { languages });
  if (parsed.errors.length > 0) {
    return {
      readable: true,
      migratable: false,
      reason: 'invalid_doc',
      code: parsed.errors[0]?.code ?? 'invalid_doc',
      errors: parsed.errors,
      sourceDocId,
      file: source.file ?? file,
    };
  }
  const validated = validateGameQuestionPayload({
    gameType,
    gameId: entry?.gameId ?? defaultGameId(gameType),
    title: entry?.title ?? parsed.languages.join(' / '),
    sourceDocId,
    questions: parsed.questions,
  });
  if (validated.error) {
    return {
      readable: true,
      migratable: false,
      reason: 'invalid_doc',
      code: 'invalid_game_questions',
      errors: [{ code: 'invalid_game_questions', message: validated.error }],
      sourceDocId,
      file: source.file ?? file,
    };
  }

  return {
    readable: true,
    migratable: true,
    reason: null,
    code: null,
    errors: [],
    sourceDocId,
    file: source.file ?? file,
    questions: validated.value.questions,
  };
}

function publicMigrationPlan(plan: any) {
  return {
    ...plan,
    games: plan.games.map(({ questions: _questions, ...game }: any) => game),
  };
}

function activeGameTypesForBundles(bundles: any[], liveState: any) {
  return ['TEST_WIEDZY', 'TEST_ZGODNOSCI'].filter((gameType) => {
    const bundle = bundles.find(
      (row) => normalizeGameType(row?.game_type) === gameType,
    );
    return isGameActive(liveState, {
      gameId: bundle?.game_id ?? defaultGameId(gameType),
      gameType,
    });
  });
}

async function gameMigrationContext(admin: any, weddingId: string) {
  const [docsResult, bundlesResult] = await Promise.all([
    admin
      .from('game_question_docs')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('game_type', { ascending: true }),
    admin
      .from('game_question_bundles')
      .select('game_type, game_id, title, status, live_revision, question_count')
      .eq('wedding_id', weddingId)
      .order('game_type', { ascending: true }),
  ]);
  if (docsResult.error) throw docsResult.error;
  if (bundlesResult.error) throw bundlesResult.error;
  return {
    docs: docsResult.data ?? [],
    bundles: bundlesResult.data ?? [],
  };
}

async function migrationChecks({
  weddingId,
  cartridge,
  docs,
  bundles,
  weddingFolderId,
}: {
  weddingId: string;
  cartridge: any;
  docs: any[];
  bundles: any[];
  weddingFolderId: string;
}) {
  const languages = normalizeGameLanguages(cartridge?.extensions?.languages?.supported);
  const entries = collectLegacyGameEntries(cartridge);
  const bundled = new Set(
    bundles
      .filter((bundle) => Number.isInteger(bundle?.live_revision))
      .map((bundle) => normalizeGameType(bundle.game_type))
      .filter(Boolean),
  );
  const checks: Record<string, any> = {};
  await Promise.all(
    entries
      .filter((entry) => !bundled.has(entry.gameType))
      .map(async (entry) => {
        const doc =
          docs.find(
            (row) => normalizeGameType(row?.game_type) === entry.gameType,
          ) ?? null;
        checks[entry.gameType] = await inspectGameQuestionDoc({
          weddingId,
          gameType: entry.gameType,
          entry,
          doc,
          weddingFolderId,
          languages,
        });
      }),
  );
  return checks;
}

async function docMigrationContext(admin: any, weddingId: string) {
  const [speechResult, docsResult] = await Promise.all([
    admin
      .from('speech_records')
      .select('*')
      .eq('wedding_id', weddingId)
      .neq('status', 'DELETED')
      .order('sort_order', { ascending: true }),
    admin
      .from('game_question_docs')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('game_type', { ascending: true }),
  ]);
  if (speechResult.error) throw speechResult.error;
  if (docsResult.error) throw docsResult.error;
  return {
    speeches: speechResult.data ?? [],
    gameDocs: docsResult.data ?? [],
  };
}

function docMigrationPlanResponse(plan: any, extra: Record<string, unknown> = {}) {
  return {
    weddingId: plan.weddingId,
    weddingIdValid: plan.weddingIdValid,
    weddingFolderId: plan.weddingFolderId,
    rootPath: plan.monthPath ?? [],
    counts: plan.counts,
    entries: plan.entries.map((entry: any) => ({
      kind: entry.kind,
      id: entry.id,
      gameType: entry.gameType,
      fileId: entry.fileId,
      status: entry.status,
      feasible: entry.feasible,
      weddingIdValid: plan.weddingIdValid,
      alreadyMigrated: entry.status === 'already-migrated',
      code: entry.code ?? null,
      current: entry.current ?? null,
      target: entry.target
        ? {
            name: entry.target.name,
            scope: entry.target.scope,
            displayPath: entry.target.displayPath,
            folderPath: [...(plan.monthPath ?? []), ...entry.target.displayPath].join(' / '),
          }
        : null,
      targetFolderId: entry.targetFolderId ?? null,
    })),
    ...extra,
  };
}

async function applyDocMigrationResults(
  admin: any,
  allowlisted: any,
  weddingId: string,
  execution: any,
) {
  const now = new Date().toISOString();
  for (const result of execution.results) {
    const upToDate =
      result.status === 'migrated' ||
      (result.status === 'already-migrated' && result.file && result.folderId);
    if (!upToDate) {
      const code = result.code ?? result.status;
      if (result.kind === 'speech') {
        await writeSpeechLog(admin, weddingId, 'speech_doc_migration', {
          actor: allowlisted.email,
          docId: result.fileId || null,
          code,
        });
      } else {
        await writeGameQuestionLog(admin, weddingId, result.gameType, 'game_question_doc_migration', {
          actor: allowlisted.email,
          code,
          message: result.fileId || null,
        });
      }
      continue;
    }

    const record = {
      drive_doc_id: result.file?.id ?? result.fileId,
      drive_doc_url:
        result.file?.webViewLink ??
        (result.file?.id
          ? `https://docs.google.com/document/d/${result.file.id}/edit`
          : null),
      drive_doc_name: result.file?.name ?? result.target?.name ?? null,
      drive_doc_version: result.file?.version ?? null,
      drive_doc_modified_at: result.file?.modifiedTime ?? null,
      drive_doc_retrieved_at: now,
      drive_folder_id: result.folderId ?? null,
    };
    if (result.kind === 'speech') {
      const { error } = await admin
        .from('speech_records')
        .update(record)
        .eq('wedding_id', weddingId)
        .eq('id', result.id);
      if (error) throw error;
      await writeSpeechLog(admin, weddingId, 'speech_doc_migration', {
        actor: allowlisted.email,
        docId: record.drive_doc_id,
        docVersion: record.drive_doc_version,
        code: null,
      });
    } else {
      const { error } = await admin
        .from('game_question_docs')
        .update(record)
        .eq('wedding_id', weddingId)
        .eq('game_type', result.gameType);
      if (error) throw error;
      await writeGameQuestionLog(admin, weddingId, result.gameType, 'game_question_doc_migration', {
        actor: allowlisted.email,
        code: 'migrated',
        message: record.drive_doc_id,
      });
    }
  }
}

async function revokeSpeechSessions(admin: any, weddingId: string, speechId: string) {
  const revokedAt = new Date().toISOString();
  const { data: sessions } = await admin
    .from('speech_sessions')
    .select('jti')
    .eq('wedding_id', weddingId)
    .eq('speech_id', speechId)
    .is('revoked_at', null);
  const jtis = (sessions ?? []).map((row: any) => row.jti);
  if (jtis.length === 0) return;
  await admin.from('speech_sessions').update({ revoked_at: revokedAt }).in('jti', jtis);
  // Speaker tokens also hold a role_sessions row so the standard cartridge RLS
  // can validate them; revoke both records together.
  await admin.from('role_sessions').update({ revoked_at: revokedAt }).in('jti', jtis);
}

async function revokeSpeechAccess(
  admin: any,
  weddingId: string,
  speechId: string,
  { actor = null, action = 'speech_access_revoke' }: { actor?: string | null; action?: string } = {},
) {
  const revokedAt = new Date().toISOString();
  await admin
    .from('speech_access')
    .update({ enabled: false, revoked_at: revokedAt })
    .eq('wedding_id', weddingId)
    .eq('speech_id', speechId);
  await admin
    .from('speech_records')
    .update({ speaker_access: false })
    .eq('wedding_id', weddingId)
    .eq('id', speechId);
  await revokeSpeechSessions(admin, weddingId, speechId);
  await writeSpeechLog(admin, weddingId, action, { actor, docId: speechId });
}

async function issueSpeechAccess(
  admin: any,
  weddingId: string,
  speechId: string,
  { actor = null, action = 'speech_access_issue' }: { actor?: string | null; action?: string } = {},
) {
  const pin = randomPin();
  const now = new Date().toISOString();
  const { error } = await admin.from('speech_access').upsert(
    {
      wedding_id: weddingId,
      speech_id: speechId,
      pin_hash: bcrypt.hashSync(pin, 10),
      enabled: true,
      rotated_at: now,
      revoked_at: null,
    },
    { onConflict: 'wedding_id,speech_id' },
  );
  if (error) throw error;
  await admin
    .from('speech_records')
    .update({ speaker_access: true })
    .eq('wedding_id', weddingId)
    .eq('id', speechId);
  await revokeSpeechSessions(admin, weddingId, speechId);
  await writeSpeechLog(admin, weddingId, action, { actor, docId: speechId });
  return pin;
}

function legacySpeeches(cartridge: any) {
  return Array.isArray(cartridge?.speeches)
    ? cartridge.speeches.filter((speech: any) => speech && typeof speech === 'object')
    : [];
}

function legacySpeechSummary(speech: any) {
  const sourceDoc = speech?.script?.sourceDoc;
  const fileId = typeof sourceDoc?.fileId === 'string' ? sourceDoc.fileId.trim() : '';
  return {
    id: typeof speech?.id === 'string' ? speech.id : '',
    order: Number.isInteger(speech?.order) ? speech.order : 0,
    speaker: {
      name: cleanProviderField(speech?.speaker?.name, 160) ?? 'Speaker',
      relationship: cleanProviderField(speech?.speaker?.relationship, 160),
    },
    linked: Boolean(fileId),
    fileId: fileId || null,
    docUrl: typeof sourceDoc?.url === 'string' ? sourceDoc.url : null,
    hasText: Boolean(typeof speech?.script?.text === 'string' && speech.script.text.trim()),
    redactionCount: Array.isArray(speech?.script?.redactions)
      ? speech.script.redactions.length
      : 0,
  };
}

async function mergeLegacySpeechText({
  masterKey,
  weddingId,
  speechId,
  speech,
}: {
  masterKey: string;
  weddingId: string;
  speechId: string;
  speech: any;
}) {
  let text = typeof speech?.script?.text === 'string' ? speech.script.text : '';
  const redactions = Array.isArray(speech?.script?.redactions) ? speech.script.redactions : [];
  const secrets = new Map<string, string>();
  for (const redaction of redactions) {
    if (!redaction?.id || !redaction?.ciphertext || !redaction?.iv) continue;
    try {
      secrets.set(
        redaction.id,
        await decryptSecret({ masterKey, weddingId, speechId, redaction }),
      );
    } catch {
      throw Object.assign(new Error('legacy_redaction_failed'), { code: 'legacy_redaction_failed' });
    }
  }
  // Marker parser exists only for this one-time conversion; no runtime path
  // reads or renders these tokens.
  text = text.replace(/\{\{secret\}\}([\s\S]*?)\{\{\/secret\}\}/g, '$1');
  text = text.replace(/\{\{secret:([A-Za-z0-9_-]+)\}\}/g, (_match, id) => secrets.get(id) ?? '');
  return text.trim();
}

async function handleRequest(req: Request) {
  if (!isOriginAllowed(req)) {
    return json({ error: 'Origin not allowed.' }, 403);
  }
  if (req.method === 'OPTIONS') return new Response('ok');
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Sign in first.' }, 401);

    const body = await req.json().catch(() => null);
    const action = typeof body?.action === 'string' ? body.action : '';
    const missingEnv = REQUIRED_ADMIN_ENV.filter((name) => !Deno.env.get(name));
    if (missingEnv.length > 0) {
      return json(
        {
          error:
            'Admin backend is read-only because required server secrets are missing. Mutating actions are disabled.',
          code: 'admin_read_only',
          readOnly: true,
          missing: missingEnv,
        },
        503,
      );
    }

    const admin = createClient(serverEnv('SUPABASE_URL'), serverEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: 'Invalid admin session.' }, 401);

    const { data: allowlisted } = await admin
      .from('app_admins')
      .select('user_id, email')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    const claims = decodeJwt(token);
    const authorized = authorizeAdminSession({ user: userData.user, allowlisted, claims });
    if (!authorized.ok) {
      return json(
        { error: authorized.error, requiresMfa: Boolean(authorized.requiresMfa) },
        authorized.status,
      );
    }

    if (DESTRUCTIVE_ACTIONS.has(action) && !mfaFresh(claims)) {
      return json(
        { error: 'Re-authenticate with your TOTP code before this action.', requiresMfaReauth: true },
        403,
      );
    }

    if (ARCHIVED_BLOCKED_ACTIONS.has(action)) {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (weddingId) {
        const writable = await requireWritableWedding(admin, weddingId);
        if (writable.error) {
          await writeAudit(admin, allowlisted, 'archived_write_blocked', weddingId, {
            action,
          });
          return json({ error: writable.error, code: 'wedding_archived' }, writable.status);
        }
      }
    }

    if (action === 'list_speeches') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      const [records, live, logs] = await Promise.all([
        admin
          .from('speech_records')
          .select('*')
          .eq('wedding_id', weddingId)
          .neq('status', 'DELETED')
          .order('sort_order', { ascending: true }),
        admin.from('speech_live').select('*').eq('wedding_id', weddingId).maybeSingle(),
        admin
          .from('speech_logs')
          .select('*')
          .eq('wedding_id', weddingId)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);
      const { data: historyRows } = await admin
        .from('speech_revisions')
        .select('revision, published_at, entries')
        .eq('wedding_id', weddingId)
        .order('revision', { ascending: false });
      if (records.error) throw records.error;
      const revisions = (records.data ?? []).filter((row: any) => row.live_revision != null);
      const { data: revisionRows } = revisions.length
        ? await admin
            .from('speech_revisions')
            .select('revision, entries')
            .eq('wedding_id', weddingId)
            .in('revision', revisions.map((row: any) => row.live_revision))
        : { data: [] };
      const byRevision = new Map((revisionRows ?? []).map((row: any) => [row.revision, row]));
      const speeches = [];
      for (const record of records.data ?? []) {
        const revision = record.live_revision ? byRevision.get(record.live_revision) : null;
        const entry = revision?.entries?.[record.id] ?? null;
        let preview = null;
        if (entry) {
          try {
            preview = await decryptSpeechScript({
              masterKey: serverEnv('SPEECH_SECRET_MASTER_KEY'),
              weddingId,
              speechId: record.id,
              revision: record.live_revision,
              entry,
            });
          } catch {
            preview = null;
          }
        }
        speeches.push({ ...record, preview });
      }
      return json({
        speeches,
        revisions: (historyRows ?? []).map((row: any) => ({
          revision: row.revision,
          publishedAt: row.published_at,
          speechIds: Object.keys(row.entries ?? {}),
        })),
        live: live.data ?? null,
        logs: logs.data ?? [],
      });
    }

    if (action === 'upsert_speech_metadata') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const speakerName = cleanProviderField(body?.speakerName, 160);
      const speechId = typeof body?.speechId === 'string' ? body.speechId.trim() : '';
      const relationship = cleanProviderField(body?.relationship, 160);
      const order = Number(body?.order);
      if (!WEDDING_ID_PATTERN.test(weddingId) || !speechId || !speakerName || !Number.isInteger(order)) {
        return json({ error: 'weddingId, speechId, speakerName and order are required.' }, 400);
      }
      const { data, error } = await admin
        .from('speech_records')
        .upsert(
          {
            wedding_id: weddingId,
            id: speechId,
            sort_order: order,
            speaker_name: speakerName,
            speaker_relationship: relationship ?? null,
            speaker_language: 'PL',
            mc_language: 'EN',
            speaker_access: false,
            status: 'DRAFT',
          },
          { onConflict: 'wedding_id,id' },
        )
        .select('*')
        .single();
      if (error) throw error;
      await writeSpeechLog(admin, weddingId, 'speech_metadata_upsert', {
        actor: allowlisted.email,
        docId: speechId,
      });
      return json({ speech: data });
    }

    if (action === 'preflight_doc_migration') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!weddingId) return json({ error: 'weddingId is required.' }, 400);
      const weddingFolderId = await resolveWeddingFolderId(
        admin,
        weddingId,
        body?.weddingFolderId,
      );
      const { speeches, gameDocs } = await docMigrationContext(admin, weddingId);
      const plan = await buildDocMigrationPlan({
        weddingId,
        weddingFolderId,
        speeches,
        gameDocs,
        connector: driveConnector,
      });
      return json({
        ok: true,
        action,
        ...docMigrationPlanResponse(plan),
      });
    }

    if (action === 'migrate_docs') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!weddingId) return json({ error: 'weddingId is required.' }, 400);
      const weddingFolderId = await resolveWeddingFolderId(
        admin,
        weddingId,
        body?.weddingFolderId,
      );
      const { speeches, gameDocs } = await docMigrationContext(admin, weddingId);
      const plan = await buildDocMigrationPlan({
        weddingId,
        weddingFolderId,
        speeches,
        gameDocs,
        connector: driveConnector,
      });
      if (!plan.weddingIdValid) {
        return json(
          {
            error: 'The wedding id is not in the UM format. Correct it before migrating Docs.',
            code: 'invalid_wedding_id',
            ...docMigrationPlanResponse(plan),
          },
          409,
        );
      }
      if (body?.confirmed !== true) {
        return json(
          {
            error: 'Review the preflight and confirm the Drive move/rename.',
            code: 'confirmation_required',
            ...docMigrationPlanResponse(plan),
          },
          409,
        );
      }
      if (plan.counts.ready === 0 && plan.counts.alreadyMigrated === 0) {
        return json({
          ok: true,
          action,
          alreadyMigrated: false,
          ...docMigrationPlanResponse(plan),
          summary: { migrated: 0, renamed: 0, moved: 0, skipped: 0, conflicts: plan.counts.conflicts, failed: 0 },
        });
      }

      const execution = await executeDocMigration({ plan, connector: driveConnector });
      await applyDocMigrationResults(admin, allowlisted, weddingId, execution);
      await writeAudit(admin, allowlisted, 'doc_migration', weddingId, {
        fileIds: execution.results.map((result: any) => result.fileId).filter(Boolean),
        statuses: execution.results.map((result: any) => ({
          fileId: result.fileId ?? null,
          status: result.status,
          targetFolderId: result.folderId ?? null,
        })),
        ...execution.summary,
      });
      return json({
        ok: true,
        action,
        alreadyMigrated: execution.summary.migrated === 0 && plan.counts.alreadyMigrated > 0,
        ...docMigrationPlanResponse(
          {
            ...plan,
            entries: plan.entries.map((entry: any) => {
              const result = execution.results.find(
                (candidate: any) =>
                  candidate.kind === entry.kind && candidate.id === entry.id,
              );
              return result
                ? {
                    ...entry,
                    status: result.status,
                    code: result.code ?? null,
                    targetFolderId: result.folderId ?? entry.targetFolderId,
                  }
                : entry;
            }),
          },
          { summary: execution.summary },
        ),
      });
    }

    if (action === 'preflight_speech_migration') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) {
        return json({ error: 'Invalid weddingId.' }, 400);
      }
      const { data: wedding } = await admin
        .from('weddings')
        .select('cartridge')
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (!wedding?.cartridge) return json({ error: 'Wedding not found.' }, 404);
      const legacy = legacySpeeches(wedding.cartridge);
      return json({
        speechMode: wedding.cartridge.speechMode ?? (legacy.length ? 'COMPLEX' : 'OFF'),
        speeches: legacy.map(legacySpeechSummary),
        unlinkedCount: legacy.filter((speech: any) => !legacySpeechSummary(speech).linked).length,
      });
    }

    if (action === 'migrate_speeches') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) {
        return json({ error: 'Invalid weddingId.' }, 400);
      }
      const { data: wedding } = await admin
        .from('weddings')
        .select('cartridge, cartridge_revision, couple, date, room_code')
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (!wedding?.cartridge) return json({ error: 'Wedding not found.' }, 404);
      const cartridge = wedding.cartridge;
      const legacy = legacySpeeches(cartridge);
      if (legacy.length === 0) {
        return json({ ok: true, migrated: 0, discarded: 0, alreadyMigrated: true });
      }
      const summaries = legacy.map(legacySpeechSummary);
      const unlinked = summaries.filter((speech: any) => !speech.linked);
      if (unlinked.length > 0 && body?.discardUnlinked !== true) {
        return json(
          {
            error: 'Unlinked legacy speeches will lose their text. Confirm the discard first.',
            requiresConfirmation: true,
            unlinked,
          },
          409,
        );
      }

      const masterKey = serverEnv('SPEECH_SECRET_MASTER_KEY');
      let revision = 0;
      let revisionCreated = false;
      const entries: Record<string, any> = {};
      const records: any[] = [];
      let migrated = 0;
      let discarded = 0;

      for (let index = 0; index < legacy.length; index += 1) {
        const legacySpeech = legacy[index];
        const summary = summaries[index];
        const speechId = summary.id || `speech_legacy_${index + 1}`;
        const existing = await admin
          .from('speech_records')
          .select('id, live_revision')
          .eq('wedding_id', weddingId)
          .eq('id', speechId)
          .maybeSingle();
        if (existing.data?.live_revision != null) continue;

        let text = '';
        if (summary.linked) {
          text = await mergeLegacySpeechText({
            masterKey,
            weddingId,
            speechId,
            speech: legacySpeech,
          });
          if (!text) {
            const source = await driveConnector.readSource(summary.fileId!);
            text = String(source.text ?? '').trim();
          }
        }
        if (!summary.linked && legacySpeech?.script?.text) discarded += 1;

        const speakerLanguage = /^[A-Za-z]{2}$/.test(legacySpeech?.language ?? '')
          ? String(legacySpeech.language).toUpperCase()
          : 'PL';
        const mcLanguage = speakerLanguage === 'EN' ? 'PL' : 'EN';
        const record: any = {
          wedding_id: weddingId,
          id: speechId,
          sort_order:
            Number.isInteger(legacySpeech?.order) && legacySpeech.order > 0
              ? legacySpeech.order
              : index + 1,
          speaker_name: summary.speaker.name,
          speaker_relationship: summary.speaker.relationship,
          speaker_language: speakerLanguage,
          mc_language: mcLanguage,
          speaker_access: false,
          status: 'DRAFT',
          drive_doc_id: summary.fileId,
          drive_doc_url: summary.docUrl,
          live_revision: null,
        };

        if (summary.linked && text) {
          if (!revisionCreated) {
            const { data: allocated, error: allocationError } = await admin.rpc(
              'stage_deck_next_speech_revision',
              { p_wedding_id: weddingId },
            );
            if (allocationError) throw allocationError;
            revision = Number(allocated ?? 0);
            if (!Number.isInteger(revision) || revision < 1) {
              return json({ error: 'Could not allocate a speech revision.' }, 409);
            }
            revisionCreated = true;
          }
          entries[speechId] = await encryptSpeechScript({
            masterKey,
            weddingId,
            speechId,
            revision,
            plaintext: text,
          });
          record.status = 'PUBLISHED';
          record.live_revision = revision;
          migrated += 1;
          await writeSpeechLog(admin, weddingId, 'speech_migration_import', {
            actor: allowlisted.email,
            docId: speechId,
            docVersion: String(revision),
          });
        } else if (!summary.linked) {
          await writeSpeechLog(admin, weddingId, 'speech_migration_discard', {
            actor: allowlisted.email,
            docId: speechId,
          });
        }
        records.push(record);
      }

      if (Object.keys(entries).length > 0) {
        const { error: revisionError } = await admin.from('speech_revisions').insert({
          wedding_id: weddingId,
          revision,
          published_by: allowlisted.user_id,
          entries,
        });
        if (revisionError) {
          if (String(revisionError.code ?? '') === '23505' || /duplicate key/i.test(revisionError.message ?? '')) {
            return json({ error: 'Revision conflict. Retry the operation.', code: 'revision_conflict' }, 409);
          }
          throw revisionError;
        }
      }
      if (records.length > 0) {
        const { error: upsertError } = await admin
          .from('speech_records')
          .upsert(records, { onConflict: 'wedding_id,id' });
        if (upsertError) throw upsertError;
      }

      const speechMode =
        ['OFF', 'LIGHT', 'COMPLEX'].includes(cartridge.speechMode)
          ? cartridge.speechMode
          : 'COMPLEX';
      const stripped = { ...cartridge, speechMode };
      delete stripped.speeches;
      const { data: roleRows } = await admin
        .from('wedding_roles')
        .select('role')
        .eq('wedding_id', weddingId);
      const roles = (roleRows ?? []).map((row: any) => row.role);
      const normalized = normalizePublishRequest({
        weddingId,
        couple: wedding.couple,
        date: wedding.date,
        cartridge: stripped,
        roles,
        expectedRevision: Number(wedding.cartridge_revision ?? 0),
        sourceMetadata: {
          migration: 'legacy_speeches',
          migrated,
          discarded,
          revision: revision || null,
        },
      });
      if (normalized.error) return json({ error: normalized.error }, normalized.status);
      const published = await publishCartridge({
        admin,
        request: normalized.request,
        actor: allowlisted,
        validate: validateCartridge,
      });
      if (!published.ok) {
        return json(
          {
            error: published.error,
            currentRevision: published.currentRevision ?? null,
            errors: published.errors ?? undefined,
          },
          published.status,
        );
      }
      await writeAudit(admin, allowlisted, 'speech_migration', weddingId, {
        migrated,
        discarded,
        revision: revision || null,
        cartridgeRevision: published.result?.cartridgeRevision ?? null,
      });
      return json({
        ok: true,
        migrated,
        discarded,
        revision: revision || null,
        cartridgeRevision: published.result?.cartridgeRevision ?? null,
      });
    }

    if (action === 'rotate_speech_access') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const speechId = typeof body?.speechId === 'string' ? body.speechId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId) || !speechId) {
        return json({ error: 'weddingId and speechId are required.' }, 400);
      }
      const { data: record } = await admin
        .from('speech_records')
        .select('id, status')
        .eq('wedding_id', weddingId)
        .eq('id', speechId)
        .maybeSingle();
      if (!record || record.status === 'DELETED') {
        return json({ error: 'Speech not found.' }, 404);
      }
      const pin = await issueSpeechAccess(admin, weddingId, speechId, {
        actor: allowlisted.email,
        action: 'speech_access_rotate',
      });
      return json({ speechId, pin });
    }

    if (action === 'revoke_speech_access') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const speechId = typeof body?.speechId === 'string' ? body.speechId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId) || !speechId) {
        return json({ error: 'weddingId and speechId are required.' }, 400);
      }
      await revokeSpeechAccess(admin, weddingId, speechId, { actor: allowlisted.email });
      return json({ speechId, enabled: false });
    }

    if (action === 'publish_speech') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      const validated = validateSpeechPayload(body?.speech);
      if (validated.error) {
        await writeSpeechLog(admin, weddingId, 'speech_publish_invalid', {
          code: 'invalid_speech',
          message: validated.error,
        });
        return json({ error: validated.error }, 400);
      }
      const speech = validated.value;
      const { data: live } = await admin
        .from('speech_live')
        .select('speech_id')
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (live?.speech_id) {
        return json({ error: 'Publishing is blocked while a speech is live.' }, 409);
      }

      const { data: records, error: recordsError } = await admin
        .from('speech_records')
        .select('*')
        .eq('wedding_id', weddingId);
      if (recordsError) throw recordsError;
      const { data: allocatedRevision, error: allocationError } = await admin.rpc(
        'stage_deck_next_speech_revision',
        { p_wedding_id: weddingId },
      );
      if (allocationError) throw allocationError;
      const revision = Number(allocatedRevision ?? 0);
      if (!Number.isInteger(revision) || revision < 1) {
        return json({ error: 'Could not allocate a speech revision.' }, 409);
      }
      const entries: Record<string, any> = {};
      for (const record of records ?? []) {
        if (record.id === speech.id || record.live_revision == null) continue;
        const { data: old } = await admin
          .from('speech_revisions')
          .select('entries')
          .eq('wedding_id', weddingId)
          .eq('revision', record.live_revision)
          .maybeSingle();
        if (old?.entries?.[record.id]) entries[record.id] = old.entries[record.id];
      }
      entries[speech.id] = await encryptSpeechScript({
        masterKey: serverEnv('SPEECH_SECRET_MASTER_KEY'),
        weddingId,
        speechId: speech.id,
        revision,
        plaintext: speech.script,
      });
      const { error: revisionError } = await admin.from('speech_revisions').insert({
        wedding_id: weddingId,
        revision,
        published_by: allowlisted.user_id,
        entries,
      });
      if (revisionError) {
          if (String(revisionError.code ?? '') === '23505' || /duplicate key/i.test(revisionError.message ?? '')) {
            return json({ error: 'Revision conflict. Retry the operation.', code: 'revision_conflict' }, 409);
          }
          throw revisionError;
        }
      const record = {
        wedding_id: weddingId,
        id: speech.id,
        sort_order: speech.order,
        speaker_name: speech.speakerName,
        speaker_relationship: speech.speakerRelationship,
        speaker_language: speech.speakerLanguage,
        mc_language: speech.mcLanguage,
        speaker_access: speech.speakerAccess,
        status: 'PUBLISHED',
        live_revision: revision,
      };
      const { error: upsertError } = await admin
        .from('speech_records')
        .upsert(record, { onConflict: 'wedding_id,id' });
      if (upsertError) throw upsertError;

      let access: { enabled: boolean; pin: string | null } = { enabled: false, pin: null };
      if (speech.speakerAccess) {
        const { data: existingAccess } = await admin
          .from('speech_access')
          .select('enabled, revoked_at')
          .eq('wedding_id', weddingId)
          .eq('speech_id', speech.id)
          .maybeSingle();
        if (existingAccess?.enabled && !existingAccess.revoked_at) {
          access = { enabled: true, pin: null };
        } else {
          const pin = await issueSpeechAccess(admin, weddingId, speech.id, {
            actor: allowlisted.email,
            action: 'speech_access_issue',
          });
          access = { enabled: true, pin };
        }
      } else {
        await revokeSpeechAccess(admin, weddingId, speech.id, {
          actor: allowlisted.email,
          action: 'speech_access_revoke',
        });
      }

      await writeSpeechLog(admin, weddingId, 'speech_publish', {
        actor: allowlisted.email,
        docId: speech.id,
        docVersion: String(revision),
      });
      return json({ speechId: speech.id, revision, access });
    }

    if (action === 'restore_speech') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const speechId = typeof body?.speechId === 'string' ? body.speechId.trim() : '';
      const revision = Number(body?.revision);
      if (!WEDDING_ID_PATTERN.test(weddingId) || !speechId || !Number.isInteger(revision)) {
        return json({ error: 'weddingId, speechId and revision are required.' }, 400);
      }
      const { data: live } = await admin
        .from('speech_live')
        .select('speech_id')
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (live?.speech_id) return json({ error: 'Restore is blocked while a speech is live.' }, 409);
      const { data: target } = await admin
        .from('speech_revisions')
        .select('revision, entries')
        .eq('wedding_id', weddingId)
        .eq('revision', revision)
        .maybeSingle();
      if (!target?.entries?.[speechId]) return json({ error: 'Revision not found.' }, 404);
      const { error } = await admin
        .from('speech_records')
        .update({ live_revision: revision, status: 'PUBLISHED' })
        .eq('wedding_id', weddingId)
        .eq('id', speechId);
      if (error) throw error;
      await writeSpeechLog(admin, weddingId, 'speech_restore', {
        actor: allowlisted.email,
        docId: speechId,
        docVersion: String(revision),
      });
      return json({ speechId, revision });
    }

    if (action === 'delete_speech') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const speechId = typeof body?.speechId === 'string' ? body.speechId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId) || !speechId) {
        return json({ error: 'weddingId and speechId are required.' }, 400);
      }
      const { data: live } = await admin
        .from('speech_live')
        .select('speech_id')
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (live?.speech_id) return json({ error: 'Delete is blocked while a speech is live.' }, 409);
      const { error } = await admin
        .from('speech_records')
        .update({ status: 'DELETED' })
        .eq('wedding_id', weddingId)
        .eq('id', speechId);
      if (error) throw error;
      await revokeSpeechAccess(admin, weddingId, speechId, {
        actor: allowlisted.email,
        action: 'speech_delete_access_revoke',
      });
      await writeSpeechLog(admin, weddingId, 'speech_delete', {
        actor: allowlisted.email,
        docId: speechId,
      });
      return json({ ok: true });
    }

    if (action === 'preflight_game_migration') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      const { data: wedding } = await admin
        .from('weddings')
        .select('cartridge, cartridge_source_metadata')
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (!wedding?.cartridge) return json({ error: 'Wedding not found.' }, 404);

      const weddingFolderId = await resolveWeddingFolderId(
        admin,
        weddingId,
        body?.weddingFolderId,
      );
      const { docs, bundles } = await gameMigrationContext(admin, weddingId);
      const checks = await migrationChecks({
        weddingId,
        cartridge: wedding.cartridge,
        docs,
        bundles,
        weddingFolderId,
      });
      const liveState = await liveGameState(admin, weddingId);
      const plan = planGameMigration({
        cartridge: wedding.cartridge,
        docs,
        bundles,
        checks,
        activeGameTypes: activeGameTypesForBundles(bundles, liveState),
      });
      return json({
        ...publicMigrationPlan(plan),
        languages: normalizeGameLanguages(wedding.cartridge?.extensions?.languages?.supported) ?? [],
        weddingFolderId: weddingFolderId || null,
      });
    }

    if (action === 'migrate_game_questions') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      const { data: wedding } = await admin
        .from('weddings')
        .select('cartridge, cartridge_revision, couple, date, room_code, cartridge_source_metadata')
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (!wedding?.cartridge) return json({ error: 'Wedding not found.' }, 404);
      const cartridge = wedding.cartridge;

      const weddingFolderId = await resolveWeddingFolderId(
        admin,
        weddingId,
        body?.weddingFolderId,
      );
      const { docs, bundles } = await gameMigrationContext(admin, weddingId);
      const checks = await migrationChecks({
        weddingId,
        cartridge,
        docs,
        bundles,
        weddingFolderId,
      });
      const liveState = await liveGameState(admin, weddingId);
      const plan = planGameMigration({
        cartridge,
        docs,
        bundles,
        checks,
        activeGameTypes: activeGameTypesForBundles(bundles, liveState),
      });
      const summary = publicMigrationPlan(plan);

      if (plan.blockedByActive.length > 0) {
        return json(
          {
            error: 'Game questions cannot be migrated while a results session is active.',
            blockedByActive: plan.blockedByActive,
            games: summary.games,
          },
          409,
        );
      }
      if (plan.requiresConfirmation && body?.discardUnlinked !== true) {
        return json(
          {
            error: 'Unlinked legacy game questions will lose their text. Confirm the discard first.',
            requiresConfirmation: true,
            games: summary.games,
            unlinkedQuestionCount: plan.unlinkedQuestionCount,
          },
          409,
        );
      }
      if (!plan.hasLegacy) {
        return json({
          ok: true,
          alreadyMigrated: true,
          migrated: 0,
          discarded: 0,
          cartridgeRevision: Number(wedding.cartridge_revision ?? 0),
          games: summary.games,
        });
      }

      const masterKey = serverEnv('SPEECH_SECRET_MASTER_KEY');
      const languageOrder =
        normalizeGameLanguages(cartridge?.extensions?.languages?.supported) ?? [];
      let migrated = 0;
      let discarded = 0;

      for (const game of plan.games) {
        if (game.action === 'migrate') {
          const { data: allocatedRevision, error: allocationError } = await admin.rpc(
            'stage_deck_next_game_revision',
            { p_wedding_id: weddingId, p_game_type: game.gameType },
          );
          if (allocationError) throw allocationError;
          const revision = Number(allocatedRevision ?? 0);
          if (!Number.isInteger(revision) || revision < 1) {
            return json({ error: 'Could not allocate a game revision.' }, 409);
          }
          const entry = await encryptGameBundle({
            masterKey,
            weddingId,
            gameType: game.gameType,
            revision,
            questions: game.questions,
          });
          const { error: revisionError } = await admin
            .from('game_question_revisions')
            .insert({
              wedding_id: weddingId,
              game_type: game.gameType,
              revision,
              published_by: allowlisted.user_id,
              source_doc_id: game.docCheck?.sourceDocId ?? game.sourceDocId ?? null,
              question_count: game.questions.length,
              entry,
            });
          if (revisionError) {
          if (String(revisionError.code ?? '') === '23505' || /duplicate key/i.test(revisionError.message ?? '')) {
            return json({ error: 'Revision conflict. Retry the operation.', code: 'revision_conflict' }, 409);
          }
          throw revisionError;
        }
          const { error: upsertError } = await admin
            .from('game_question_bundles')
            .upsert(
              {
                wedding_id: weddingId,
                game_type: game.gameType,
                game_id: game.gameId,
                title: game.title,
                source_doc_id: game.docCheck?.sourceDocId ?? game.sourceDocId ?? null,
                status: 'PUBLISHED',
                live_revision: revision,
                question_count: game.questions.length,
              },
              { onConflict: 'wedding_id,game_type' },
            );
          if (upsertError) throw upsertError;
          migrated += 1;
          await writeGameQuestionLog(
            admin,
            weddingId,
            game.gameType,
            'game_question_migration_import',
            {
              actor: allowlisted.email,
              code: null,
              message: `Revision ${revision} · ${game.questions.length} questions · ${
                languageOrder.join(', ') || 'no language order'
              }`,
            },
          );
        } else if (game.action === 'discard' && game.embeddedQuestionCount > 0) {
          discarded += game.embeddedQuestionCount;
          await writeGameQuestionLog(
            admin,
            weddingId,
            game.gameType,
            'game_question_migration_discard',
            {
              actor: allowlisted.email,
              code: game.reason ?? 'unlinked',
              message: `Discarded ${game.embeddedQuestionCount} embedded question${
                game.embeddedQuestionCount === 1 ? '' : 's'
              } after owner confirmation.`,
            },
          );
        }
      }

      if (plan.unknownLegacyQuestionCount > 0) {
        discarded += plan.unknownLegacyQuestionCount;
        await writeGameQuestionLog(
          admin,
          weddingId,
          null,
          'game_question_migration_discard',
          {
            actor: allowlisted.email,
            code: 'unsupported_game_type',
            message: `Discarded ${plan.unknownLegacyQuestionCount} embedded question${
              plan.unknownLegacyQuestionCount === 1 ? '' : 's'
            } from unsupported legacy game lists after owner confirmation.`,
          },
        );
      }

      const stripped = stripLegacyGameQuestions(cartridge);
      const { data: roleRows } = await admin
        .from('wedding_roles')
        .select('role')
        .eq('wedding_id', weddingId);
      const roles = (roleRows ?? []).map((row: any) => row.role);
      const normalized = normalizePublishRequest({
        weddingId,
        couple: wedding.couple,
        date: wedding.date,
        cartridge: stripped,
        roles,
        expectedRevision: Number(wedding.cartridge_revision ?? 0),
        sourceMetadata: {
          migration: 'legacy_game_questions',
          migrated,
          discarded,
        },
      });
      if (normalized.error) return json({ error: normalized.error }, normalized.status);
      const published = await publishCartridge({
        admin,
        request: normalized.request,
        actor: allowlisted,
        validate: validateCartridge,
      });
      if (!published.ok) {
        return json(
          {
            error: published.error,
            currentRevision: published.currentRevision ?? null,
            errors: published.errors ?? undefined,
          },
          published.status,
        );
      }
      await writeAudit(admin, allowlisted, 'game_migration', weddingId, {
        migrated,
        discarded,
        cartridgeRevision: published.result?.cartridgeRevision ?? null,
      });
      return json({
        ok: true,
        migrated,
        discarded,
        discardedQuestions: discarded,
        alreadyMigrated: false,
        cartridgeRevision: published.result?.cartridgeRevision ?? null,
        games: publicMigrationPlan(plan).games,
      });
    }

    if (action === 'list_game_questions') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      const [bundles, revisions, logs, docs] = await Promise.all([
        admin
          .from('game_question_bundles')
          .select('*')
          .eq('wedding_id', weddingId)
          .order('game_type', { ascending: true }),
        admin
          .from('game_question_revisions')
          .select('game_type, revision, published_at, published_by, question_count, source_doc_id, entry')
          .eq('wedding_id', weddingId)
          .order('revision', { ascending: false }),
        admin
          .from('game_question_logs')
          .select('*')
          .eq('wedding_id', weddingId)
          .order('created_at', { ascending: false })
          .limit(100),
        admin
          .from('game_question_docs')
          .select('*')
          .eq('wedding_id', weddingId)
          .order('game_type', { ascending: true }),
      ]);
      if (bundles.error) throw bundles.error;
      if (docs.error) throw docs.error;
      const liveState = await liveGameState(admin, weddingId);
      const revisionRows = revisions.data ?? [];
      const bundleRows = bundles.data ?? [];
      const byRevision = new Map(
        revisionRows.map((row: any) => [`${row.game_type}:${row.revision}`, row]),
      );
      const gameIdByType = new Map(
        bundleRows.map((row: any) => [normalizeGameType(row.game_type), row.game_id]),
      );
      const activeGameTypes = ['TEST_WIEDZY', 'TEST_ZGODNOSCI'].filter((gameType) =>
        isGameActive(liveState, {
          gameId: gameIdByType.get(gameType) ?? defaultGameId(gameType),
          gameType,
        }),
      );
      const games = [];
      for (const bundle of bundleRows) {
        const revision = bundle.live_revision
          ? byRevision.get(`${bundle.game_type}:${bundle.live_revision}`)
          : null;
        let preview = null;
        if (revision?.entry && bundle.status === 'PUBLISHED') {
          try {
            preview = await decryptGameBundle({
              masterKey: serverEnv('SPEECH_SECRET_MASTER_KEY'),
              weddingId,
              gameType: bundle.game_type,
              revision: bundle.live_revision,
              entry: revision.entry,
            });
          } catch {
            preview = null;
          }
        }
        games.push({
          ...bundle,
          preview,
          active: isGameActive(liveState, {
            gameId: bundle.game_id,
            gameType: bundle.game_type,
          }),
        });
      }
      return json({
        games,
        docs: docs.data ?? [],
        activeGameTypes,
        revisions: revisionRows.map((row: any) => ({
          gameType: row.game_type,
          revision: row.revision,
          publishedAt: row.published_at,
          publishedBy: row.published_by,
          questionCount: row.question_count,
          sourceDocId: row.source_doc_id,
        })),
        logs: logs.data ?? [],
      });
    }

    if (action === 'publish_game_questions') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      const gameTypeHint = normalizeGameType(body?.gameType);
      const validated = validateGameQuestionPayload(body);
      if (validated.error) {
        await writeGameQuestionLog(admin, weddingId, gameTypeHint, 'game_questions_publish_invalid', {
          actor: allowlisted.email,
          code: 'invalid_game_questions',
          message: validated.error,
        });
        return json({ error: validated.error }, 400);
      }
      const { gameType, gameId, title, sourceDocId, questions } = validated.value;
      const liveState = await liveGameState(admin, weddingId);
      if (isGameActive(liveState, { gameId, gameType })) {
        return json({ error: 'Publishing is blocked while the game is active.' }, 409);
      }

      const { data: allocatedRevision, error: allocationError } = await admin.rpc(
        'stage_deck_next_game_revision',
        { p_wedding_id: weddingId, p_game_type: gameType },
      );
      if (allocationError) throw allocationError;
      const revision = Number(allocatedRevision ?? 0);
      if (!Number.isInteger(revision) || revision < 1) {
        return json({ error: 'Could not allocate a game revision.' }, 409);
      }
      const entry = await encryptGameBundle({
        masterKey: serverEnv('SPEECH_SECRET_MASTER_KEY'),
        weddingId,
        gameType,
        revision,
        questions,
      });
      const { error: revisionError } = await admin.from('game_question_revisions').insert({
        wedding_id: weddingId,
        game_type: gameType,
        revision,
        published_by: allowlisted.user_id,
        source_doc_id: sourceDocId,
        question_count: questions.length,
        entry,
      });
      if (revisionError) {
          if (String(revisionError.code ?? '') === '23505' || /duplicate key/i.test(revisionError.message ?? '')) {
            return json({ error: 'Revision conflict. Retry the operation.', code: 'revision_conflict' }, 409);
          }
          throw revisionError;
        }

      const { error: upsertError } = await admin.from('game_question_bundles').upsert(
        {
          wedding_id: weddingId,
          game_type: gameType,
          game_id: gameId,
          title,
          source_doc_id: sourceDocId,
          status: 'PUBLISHED',
          live_revision: revision,
          question_count: questions.length,
        },
        { onConflict: 'wedding_id,game_type' },
      );
      if (upsertError) throw upsertError;

      await writeGameQuestionLog(admin, weddingId, gameType, 'game_questions_publish', {
        actor: allowlisted.email,
        message: `Revision ${revision}`,
      });
      return json({ gameType, gameId, revision, questionCount: questions.length });
    }

    if (action === 'restore_game_questions') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const gameType = normalizeGameType(body?.gameType);
      const revision = Number(body?.revision);
      if (!WEDDING_ID_PATTERN.test(weddingId) || !gameType || !Number.isInteger(revision) || revision < 1) {
        return json({ error: 'weddingId, gameType and revision are required.' }, 400);
      }
      const { data: bundle } = await admin
        .from('game_question_bundles')
        .select('game_id, game_type')
        .eq('wedding_id', weddingId)
        .eq('game_type', gameType)
        .maybeSingle();
      if (!bundle) return json({ error: 'Game bundle not found.' }, 404);
      const liveState = await liveGameState(admin, weddingId);
      if (isGameActive(liveState, { gameId: bundle.game_id, gameType })) {
        return json({ error: 'Restore is blocked while the game is active.' }, 409);
      }
      const { data: target } = await admin
        .from('game_question_revisions')
        .select('revision, question_count, source_doc_id')
        .eq('wedding_id', weddingId)
        .eq('game_type', gameType)
        .eq('revision', revision)
        .maybeSingle();
      if (!target) return json({ error: 'Revision not found.' }, 404);
      const { error } = await admin
        .from('game_question_bundles')
        .update({
          status: 'PUBLISHED',
          live_revision: revision,
          question_count: target.question_count,
          source_doc_id: target.source_doc_id,
        })
        .eq('wedding_id', weddingId)
        .eq('game_type', gameType);
      if (error) throw error;
      await writeGameQuestionLog(admin, weddingId, gameType, 'game_questions_restore', {
        actor: allowlisted.email,
        message: `Revision ${revision}`,
      });
      return json({ gameType, revision });
    }

    if (action === 'delete_game_questions') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const gameType = normalizeGameType(body?.gameType);
      if (!WEDDING_ID_PATTERN.test(weddingId) || !gameType) {
        return json({ error: 'weddingId and gameType are required.' }, 400);
      }
      const { data: bundle } = await admin
        .from('game_question_bundles')
        .select('game_id, game_type')
        .eq('wedding_id', weddingId)
        .eq('game_type', gameType)
        .maybeSingle();
      if (!bundle) return json({ error: 'Game bundle not found.' }, 404);
      const liveState = await liveGameState(admin, weddingId);
      if (isGameActive(liveState, { gameId: bundle.game_id, gameType })) {
        return json({ error: 'Delete is blocked while the game is active.' }, 409);
      }
      const { error } = await admin
        .from('game_question_bundles')
        .update({ status: 'DELETED', live_revision: null })
        .eq('wedding_id', weddingId)
        .eq('game_type', gameType);
      if (error) throw error;
      await writeGameQuestionLog(admin, weddingId, gameType, 'game_questions_delete', {
        actor: allowlisted.email,
      });
      return json({ ok: true });
    }

    if (action === 'list_vip_djs') {
      const { data, error } = await admin
        .from('vip_djs')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('display_name', { ascending: true });
      if (error) throw error;
      return json({ vipDjs: data ?? [] });
    }

    if (action === 'upsert_vip_dj') {
      const id = typeof body?.id === 'string' ? body.id.trim().toLowerCase() : '';
      const displayName = cleanProviderField(body?.displayName, 120);
      if (!/^[a-z0-9_]{3,40}$/.test(id)) {
        return json({ error: 'VIP DJ id must be 3-40 lowercase letters, digits or underscores.' }, 400);
      }
      if (!displayName) return json({ error: 'Display name is required.' }, 400);
      const logoUrl = cleanProviderField(body?.logoUrl, 500);
      if (logoUrl && !/^https?:\/\//i.test(logoUrl) && !logoUrl.startsWith('/')) {
        return json({ error: 'Logo URL must be an http(s) or root-relative URL.' }, 400);
      }
      const packageDefault =
        body?.packageDefault === 'HOST_AND_DJ_VIP' || body?.packageDefault === 'DJ_MC'
          ? body.packageDefault
          : null;
      const record = {
        id,
        display_name: displayName,
        phone: cleanProviderField(body?.phone, 60) || null,
        instagram: cleanProviderField(body?.instagram, 200) || null,
        logo_url: logoUrl || null,
        package_default: packageDefault,
        sort_order: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0,
        active: body?.active !== false,
        updated_at: new Date().toISOString(),
      };
      const { data: before } = await admin.from('vip_djs').select('*').eq('id', id).maybeSingle();
      const { data, error } = await admin
        .from('vip_djs')
        .upsert(record, { onConflict: 'id' })
        .select('*')
        .single();
      if (error) throw error;
      await writeAudit(admin, allowlisted, 'vip_dj_upsert', id, { before, after: data });
      return json({ vipDj: data });
    }

    if (action === 'deactivate_vip_dj') {
      const id = typeof body?.id === 'string' ? body.id.trim().toLowerCase() : '';
      if (!id) return json({ error: 'VIP DJ id is required.' }, 400);
      const { data: current, error: readError } = await admin
        .from('vip_djs')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (readError) throw readError;
      if (!current) return json({ error: 'VIP DJ not found.' }, 404);
      if (current.package_default) {
        return json(
          { error: 'This DJ is still a package default. Clear the default before deactivating.' },
          409,
        );
      }
      const { count, error: countError } = await admin
        .from('wedding_service_providers')
        .select('id', { count: 'exact', head: true })
        .eq('vip_dj_id', id)
        .eq('active', true);
      if (countError) throw countError;
      if ((count ?? 0) > 0) {
        return json(
          { error: 'This DJ is still assigned to a wedding. Reassign before deactivating.' },
          409,
        );
      }
      const { data, error } = await admin
        .from('vip_djs')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      await writeAudit(admin, allowlisted, 'vip_dj_deactivate', id, {
        before: current,
        after: data,
      });
      return json({ vipDj: data });
    }

    if (action === 'recap_source') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) {
        return json({ error: 'Invalid weddingId.' }, 400);
      }
      const [wedding, live, requests] = await Promise.all([
        admin
          .from('weddings')
          .select('wedding_id, couple, date, cartridge, cartridge_revision')
          .eq('wedding_id', weddingId)
          .maybeSingle(),
        admin
          .from('live_sync_state')
          .select('state, updated_at')
          .eq('wedding_id', `wzsd:${weddingId}`)
          .maybeSingle(),
        admin
          .from('song_requests')
          .select('song, artist, status, created_at')
          .eq('wedding_id', weddingId)
          .order('created_at', { ascending: true }),
      ]);
      const firstError = wedding.error || live.error || requests.error;
      if (firstError) throw firstError;
      if (!wedding.data) return json({ error: 'Wedding not found.' }, 404);
      return json({
        wedding: wedding.data.cartridge ?? null,
        liveState: live.data?.state ?? null,
        liveUpdatedAt: live.data?.updated_at ?? null,
        songRequests: requests.data ?? [],
      });
    }

    if (action === 'music_engagement') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) {
        return json({ error: 'Invalid weddingId.' }, 400);
      }
      const [live, requests] = await Promise.all([
        admin
          .from('live_sync_state')
          .select('state')
          .eq('wedding_id', `wzsd:${weddingId}`)
          .maybeSingle(),
        admin
          .from('song_requests')
          .select('created_at')
          .eq('wedding_id', weddingId)
          .order('created_at', { ascending: true }),
      ]);
      const firstError = live.error || requests.error;
      if (firstError) throw firstError;
      const state = live.data?.state ?? {};
      const order = Array.isArray(state.step_order) ? state.step_order : [];
      const completed = Array.isArray(state.completed_step_ids)
        ? state.completed_step_ids
        : [];
      const eventComplete =
        state.active_step_id == null &&
        order.length > 0 &&
        order.every((stepId: string) => completed.includes(stepId));
      return json({
        requests: (requests.data ?? []).map((row: any) => ({
          createdAt: row.created_at,
        })),
        eventComplete,
      });
    }

    if (action === 'publish_recap') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) {
        return json({ error: 'Invalid weddingId.' }, 400);
      }
      const normalized = normalizeRecapPayload(body?.payload, weddingId);
      if (normalized.error) return json({ error: normalized.error }, 400);

      const token = randomRecapToken();
      const tokenHash = await sha256Hex(token);
      const expiresAt = new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const { data, error } = await admin
        .from('wedding_recaps')
        .insert({
          wedding_id: weddingId,
          token_hash: tokenHash,
          schema_version: normalized.payload.schemaVersion,
          payload: normalized.payload,
          expires_at: expiresAt,
          created_by: allowlisted.user_id,
        })
        .select('id, published_at, expires_at')
        .single();
      if (error) throw error;

      const baseUrl = serverEnv(
        'PUBLIC_DECK_URL',
        'https://deck.weselnyzabojad.pl',
      ).replace(/\/+$/, '');
      const url = `${baseUrl}/recap/${token}`;
      await writeAudit(admin, allowlisted, 'recap_publish', weddingId, {
        recapId: data.id,
        expiresAt,
      });
      return json({
        recap: {
          id: data.id,
          url,
          token,
          publishedAt: data.published_at,
          expiresAt: data.expires_at,
        },
      });
    }

    if (action === 'list_recaps') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) {
        return json({ error: 'Invalid weddingId.' }, 400);
      }
      const { data, error } = await admin
        .from('wedding_recaps')
        .select('id, schema_version, published_at, expires_at, revoked_at')
        .eq('wedding_id', weddingId)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return json({ recaps: data ?? [] });
    }

    if (action === 'revoke_recap') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const recapId = typeof body?.recapId === 'string' ? body.recapId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId) || !/^[0-9a-f-]{36}$/i.test(recapId)) {
        return json({ error: 'Invalid recap.' }, 400);
      }
      const { data, error } = await admin
        .from('wedding_recaps')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', recapId)
        .eq('wedding_id', weddingId)
        .select('id, revoked_at')
        .maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: 'Recap not found.' }, 404);
      await writeAudit(admin, allowlisted, 'recap_revoke', weddingId, {
        recapId,
      });
      return json({ ok: true, recap: data });
    }

    if (action === 'portfolio_kpis') {
      const filters = {
        year: body?.year ? String(body.year) : '',
        status: ['active', 'archived', 'all'].includes(body?.status) ? body.status : 'all',
        package: typeof body?.package === 'string' ? body.package.trim() : '',
        language: typeof body?.language === 'string' ? body.language.trim().toUpperCase() : '',
      };
      const now = new Date();
      const [weddings, live, requests, recaps, roles] = await Promise.all([
        admin
          .from('weddings')
          .select('wedding_id, couple, date, cartridge, archived_at, expires_at, updated_at')
          .order('updated_at', { ascending: false }),
        admin.from('live_sync_state').select('wedding_id, state'),
        admin
          .from('song_requests')
          .select('wedding_id, status, played_at, created_at'),
        admin
          .from('wedding_recaps')
          .select('wedding_id, payload, published_at, expires_at, revoked_at')
          .order('published_at', { ascending: false }),
        admin.from('wedding_roles').select('wedding_id, role'),
      ]);
      const firstError =
        weddings.error || live.error || requests.error || recaps.error || roles.error;
      if (firstError) throw firstError;

      const liveStates: Record<string, any> = {};
      for (const row of live.data ?? []) {
        const id = String(row.wedding_id ?? '').replace(/^wzsd:/, '');
        if (id) liveStates[id] = row.state;
      }
      const requestsByWedding: Record<string, any[]> = {};
      for (const row of requests.data ?? []) {
        const id = row.wedding_id;
        if (!id) continue;
        requestsByWedding[id] ??= [];
        requestsByWedding[id].push(row);
      }
      const recapsByWedding: Record<string, any> = {};
      for (const row of recaps.data ?? []) {
        if (row.revoked_at) continue;
        if (row.expires_at && Date.parse(row.expires_at) <= now.getTime()) continue;
        if (!recapsByWedding[row.wedding_id]) recapsByWedding[row.wedding_id] = row;
      }
      const rolesByWedding: Record<string, string[]> = {};
      for (const row of roles.data ?? []) {
        if (!row.wedding_id || !row.role) continue;
        rolesByWedding[row.wedding_id] ??= [];
        rolesByWedding[row.wedding_id].push(row.role);
      }

      return json(
        buildPortfolioKpis({
          weddings: weddings.data ?? [],
          liveStates,
          requests: requestsByWedding,
          recaps: recapsByWedding,
          roles: rolesByWedding,
          filters,
          now,
        }),
      );
    }

    if (action === 'list') {
      const { data: vipRows } = await admin
        .from('vip_djs')
        .select('id')
        .eq('active', true);
      const activeVipIds = new Set((vipRows ?? []).map((row: any) => row.id));
      const [weddings, roles, sessions, presence, audit] = await Promise.all([
        admin
          .from('weddings')
          .select(
            'wedding_id, room_code, couple, date, expires_at, archived_at, created_at, updated_at, cartridge, cartridge_revision, cartridge_source, cartridge_source_metadata, cartridge_published_at, mc_confirmed_by, venue_name, venue_address, venue_city, venue_country',
          )
          .order('updated_at', { ascending: false }),
        admin.from('wedding_roles').select('wedding_id, role, updated_at'),
        admin
          .from('role_sessions')
          .select('jti, wedding_id, role, device_id, device_label, issued_at, expires_at, revoked_at')
          .order('issued_at', { ascending: false })
          .limit(250),
        admin.from('role_presence').select('*').order('last_seen', { ascending: false }).limit(250),
        admin
          .from('admin_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);
      const firstError =
        weddings.error || roles.error || sessions.error || presence.error || audit.error;
      if (firstError) throw firstError;

      const rolesByWedding: Record<string, string[]> = {};
      for (const row of roles.data ?? []) {
        rolesByWedding[row.wedding_id] ??= [];
        rolesByWedding[row.wedding_id].push(row.role);
      }

      return json({
        weddings: (weddings.data ?? []).map((row: any) => {
          const legacyVenue =
            typeof row.cartridge?.venueDetails?.venue === 'string'
              ? row.cartridge.venueDetails.venue
              : '';
          const legacyAddress =
            typeof row.cartridge?.venueDetails?.address === 'string'
              ? row.cartridge.venueDetails.address
              : '';
          const { cartridge: _cartridge, ...summary } = row;
          const servicePackage =
            typeof row.cartridge?.servicePackage === 'string' ? row.cartridge.servicePackage : null;
          const djIdentityId =
            row.cartridge?.djIdentityId ?? row.cartridge?.dj?.identityId ?? null;
          const requiresVip =
            servicePackage === 'HOST_AND_DJ_VIP' || servicePackage === 'DJ_MC';
          const vipDjValid = !requiresVip || activeVipIds.has(djIdentityId);
          const mcConfirmed = !requiresVip || Boolean(row.mc_confirmed_by);
          const vipWarning = requiresVip
            ? [
                !vipDjValid
                  ? `VIP DJ invalid (${djIdentityId ?? 'missing'})`
                  : 'VIP DJ valid',
                mcConfirmed ? 'MC confirmed' : 'MC unconfirmed',
              ].join(' · ')
            : null;
          const songRequestEligible =
            (servicePackage === 'HOST_AND_DJ_VIP' || servicePackage === 'DJ_MC') &&
            activeVipIds.has(djIdentityId);
          const supportedLanguages = row.cartridge?.extensions?.languages?.supported;
          const languageWarning =
            Array.isArray(supportedLanguages) && supportedLanguages.length > 0
              ? null
              : 'Content languages missing: set LANGUAGES → Supported before publishing.';
          return {
            ...summary,
            venue: legacyVenue,
            venue_name: row.venue_name ?? (legacyVenue || null),
            venue_address: row.venue_address ?? (legacyAddress || null),
            venue_city: row.venue_city ?? null,
            venue_country: row.venue_country ?? null,
            servicePackage,
            djIdentityId,
            vipDjValid,
            languageWarning,
            mcConfirmed,
            vipWarning,
            songRequestEligible,
            songRequestUrl: songRequestEligible
              ? `${serverEnv('PUBLIC_DECK_URL', 'https://deck.weselnyzabojad.pl').replace(/\/+$/, '')}/request/${row.room_code}`
              : null,
            roles: (rolesByWedding[row.wedding_id] ?? []).sort(),
          };
        }),
        sessions: sessions.data ?? [],
        presence: presence.data ?? [],
        audit: audit.data ?? [],
        publicDeckUrl: serverEnv('PUBLIC_DECK_URL', 'https://www.weselnyzabojad.pl/deck'),
      });
    }

    if (action === 'publish') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) {
        return json({ error: 'Invalid weddingId.' }, 400);
      }
      if (!(await weddingExists(admin, weddingId))) {
        await writeAudit(admin, allowlisted, 'publish_failed', weddingId, {
          source: 'admin_json',
          error: 'Manual wedding creation is disabled.',
        });
        return json(
          {
            error:
              'New weddings can only be introduced from the Google Drive folder library. Add the wedding folder in Drive instead.',
            code: 'manual_create_disabled',
          },
          403,
        );
      }
      const { response } = await handlePublish(admin, allowlisted, body);
      return response;
    }

    if (action === 'publish_drive') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) {
        return json({ error: 'Invalid weddingId.' }, 400);
      }
      const fileId = typeof body?.fileId === 'string' ? body.fileId.trim() : '';
      if (!fileId) return json({ error: 'A Drive file id is required.' }, 400);

      let source;
      try {
        source = await driveConnector.readSource(fileId);
      } catch (error: any) {
        if (typeof error?.code === 'string' && error.code.startsWith('drive_')) {
          await writeAudit(admin, allowlisted, 'publish_drive_failed', weddingId, {
            error: error.message,
            code: error.code,
            fileId,
          });
          return json({ error: error.message, code: error.code }, driveErrorHttpStatus(error.code));
        }
        throw error;
      }

      if (!['json', 'google_doc'].includes(source.kind)) {
        await writeAudit(admin, allowlisted, 'publish_drive_failed', weddingId, {
          error: 'Unsupported Drive source kind.',
          fileId,
        });
        return json(
          {
            error: 'Only cartridge JSON files and native Google Docs can be published.',
            code: 'drive_doc_publish_unsupported',
          },
          400,
        );
      }

      const expectedVersion =
        typeof body?.expectedVersion === 'string' ? body.expectedVersion.trim() : '';
      const expectedChecksum =
        typeof body?.expectedChecksum === 'string' ? body.expectedChecksum.trim() : '';
      const sourceCheck = driveSourceChanged(source.file, {
        expectedVersion,
        expectedChecksum,
      });
      if (sourceCheck.changed) {
        await writeAudit(admin, allowlisted, 'publish_drive_failed', weddingId, {
          error: 'Drive source changed after preview.',
          fileId,
          ...sourceCheck,
        });
        return json(
          {
            error: 'The Drive source changed after preview. Preview it again before publishing.',
            code: 'drive_source_changed',
            file: source.file,
          },
          409,
        );
      }

      let cartridge;
      if (source.kind === 'json') {
        try {
          cartridge = JSON.parse(source.text);
        } catch {
          return json({ error: 'The Drive JSON source is not valid JSON.' }, 422);
        }
      } else {
        const submitted = body?.cartridge;
        const expectedHash = typeof body?.sourceTextHash === 'string' ? body.sourceTextHash.trim() : '';
        if (!submitted || typeof submitted !== 'object' || Array.isArray(submitted)) {
          return json({ error: 'A mapped cartridge is required for Google Doc sources.' }, 400);
        }
        if (!expectedHash) {
          return json({ error: 'A source text hash is required for Google Doc sources.' }, 400);
        }
        const actualHash = await sha256Text(source.text);
        if (actualHash !== expectedHash) {
          await writeAudit(admin, allowlisted, 'publish_drive_failed', weddingId, {
            error: 'Drive source text changed after preview.',
            fileId,
            expectedHash,
            actualHash,
          });
          return json(
            {
              error: 'The Drive source changed after preview. Preview it again before publishing.',
              code: 'drive_source_changed',
              file: source.file,
            },
            409,
          );
        }
        cartridge = submitted;
      }

      // Game questions are published separately as encrypted bundles
      // (issue #931); the cartridge keeps only step.game metadata.
      const { response } = await handlePublish(
        admin,
        allowlisted,
        {
          weddingId,
          couple: body?.couple,
          date: body?.date,
          expectedRevision: body?.expectedRevision,
          cartridge,
          sourceMetadata: buildDriveSourceMetadata(source.file, {
            bytes: source.bytes,
            retrievedAt: source.retrievedAt,
          }),
        },
        { source: source.kind === 'json' ? 'drive_json' : 'drive_google_doc' },
      );
      return response;
    }

    if (action === 'revision_context') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) {
        return json({ error: 'Invalid weddingId.' }, 400);
      }
      const [wedding, live, history] = await Promise.all([
        admin
          .from('weddings')
          .select(
            'wedding_id, couple, date, cartridge, cartridge_revision, cartridge_source, cartridge_source_metadata, cartridge_published_at',
          )
          .eq('wedding_id', weddingId)
          .maybeSingle(),
        admin
          .from('live_sync_state')
          .select('state, updated_at')
          .eq('wedding_id', `wzsd:${weddingId}`)
          .maybeSingle(),
        admin
          .from('cartridge_revisions')
          .select('wedding_id, revision, source, source_metadata, published_at, published_by, created_at')
          .eq('wedding_id', weddingId)
          .order('revision', { ascending: false })
          .limit(50),
      ]);
      const firstError = wedding.error || live.error || history.error;
      if (firstError) throw firstError;
      if (!wedding.data) return json({ error: 'Wedding not found.' }, 404);
      return json({
        wedding: wedding.data,
        liveState: live.data?.state ?? null,
        liveUpdatedAt: live.data?.updated_at ?? null,
        history: history.data ?? [],
      });
    }

    if (action === 'restore_revision') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) {
        return json({ error: 'Invalid weddingId.' }, 400);
      }
      const { data: current, error: currentError } = await admin
        .from('weddings')
        .select('cartridge_revision')
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (currentError) throw currentError;
      if (!current) return json({ error: 'Wedding not found.' }, 404);

      const requestedRevision = Number(body?.revision);
      let query = admin
        .from('cartridge_revisions')
        .select('revision, cartridge, source, source_metadata')
        .eq('wedding_id', weddingId);
      if (Number.isInteger(requestedRevision) && requestedRevision > 0) {
        query = query.eq('revision', requestedRevision);
      } else {
        query = query
          .lt('revision', Number(current.cartridge_revision ?? 0))
          .order('revision', { ascending: false })
          .limit(1);
      }
      const { data: backupRows, error: backupError } = await query;
      if (backupError) throw backupError;
      const backup = Array.isArray(backupRows) ? backupRows[0] : backupRows;
      if (!backup?.cartridge) {
        return json({ error: 'No previous cartridge revision is available to restore.' }, 404);
      }

      const { response } = await handlePublish(
        admin,
        allowlisted,
        {
          weddingId,
          couple: body?.couple,
          date: body?.date,
          expectedRevision: body?.expectedRevision ?? Number(current.cartridge_revision ?? 0),
          cartridge: backup.cartridge,
          sourceMetadata: {
            provider: 'backup_restore',
            restoredFromRevision: backup.revision,
            restoredSource: backup.source,
            restoredSourceMetadata: backup.source_metadata ?? null,
          },
        },
        { source: 'backup_restore' },
      );
      return response;
    }

    if (action === 'update_wedding_venue') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);

      const venueName = cleanProviderField(body?.venueName, 160);
      const venueAddress = cleanProviderField(body?.venueAddress, 240);
      const venueCity = cleanProviderField(body?.venueCity, 120);
      const countryInput =
        typeof body?.venueCountry === 'string' ? body.venueCountry.trim() : '';
      const explicitCountry = normalizeCountry(countryInput);
      if (countryInput && !explicitCountry) {
        return json(
          { error: 'Venue country must be a valid two-letter ISO 3166-1 code.' },
          400,
        );
      }
      const venueCountry = resolveVenueCountry({
        country: explicitCountry,
        city: venueCity,
        address: venueAddress,
      });
      const fields = 'venue_name, venue_address, venue_city, venue_country';
      const { data: before, error: readError } = await admin
        .from('weddings')
        .select(fields)
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (readError) throw readError;
      if (!before) return json({ error: 'Wedding not found.' }, 404);

      const { data: after, error } = await admin
        .from('weddings')
        .update({
          venue_name: venueName,
          venue_address: venueAddress,
          venue_city: venueCity,
          venue_country: venueCountry,
        })
        .eq('wedding_id', weddingId)
        .select(fields)
        .single();
      if (error) throw error;

      await writeAudit(admin, allowlisted, 'update_wedding_venue', weddingId, {
        before,
        after,
      });
      return json({
        ok: true,
        venue: {
          name: after.venue_name,
          address: after.venue_address,
          city: after.venue_city,
          country: after.venue_country,
        },
      });
    }

    if (action === 'archive') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      const { error } = await admin
        .from('weddings')
        .update({ archived_at: new Date().toISOString() })
        .eq('wedding_id', weddingId);
      if (error) throw error;
      const archivedAt = new Date().toISOString();
      await Promise.all([
        admin
          .from('role_sessions')
          .update({ revoked_at: archivedAt })
          .eq('wedding_id', weddingId)
          .is('revoked_at', null),
        admin
          .from('speech_sessions')
          .update({ revoked_at: archivedAt })
          .eq('wedding_id', weddingId)
          .is('revoked_at', null),
        admin
          .from('role_presence')
          .update({ status: 'offline', session_jti: null, last_seen: archivedAt })
          .eq('wedding_id', weddingId),
      ]);
      await writeAudit(admin, allowlisted, 'archive', weddingId, null);
      return json({ ok: true });
    }

    if (action === 'delete') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      const { error } = await admin.from('weddings').delete().eq('wedding_id', weddingId);
      if (error) throw error;
      await writeAudit(admin, allowlisted, 'delete', weddingId, null);
      return json({ ok: true });
    }

    if (action === 'rotate_pins') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const requestedRoles = normalizeRoles(body?.roles);
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      if (requestedRoles.length === 0) return json({ error: 'Provide at least one role.' }, 400);

      const { data: weddingRow, error: weddingError } = await admin
        .from('weddings')
        .select('cartridge')
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (weddingError) throw weddingError;
      const roles = projectedRolesForPackage(
        weddingRow?.cartridge?.servicePackage,
        requestedRoles,
      );

      const requestedPins = body?.pins && typeof body.pins === 'object' ? body.pins : null;
      const pins: Record<string, string> = {};
      const rows = roles.map((role) => {
        const pin = pinFor(role, requestedPins);
        pins[role] = pin;
        return { wedding_id: weddingId, role, pin_hash: bcrypt.hashSync(pin, 10) };
      });
      const { error } = await admin
        .from('wedding_roles')
        .upsert(rows, { onConflict: 'wedding_id,role' });
      if (error) throw error;
      await writeAudit(admin, allowlisted, 'rotate_pins', weddingId, { roles });
      return json({ weddingId, roles: pins });
    }

    if (action === 'revoke_session') {
      const jti = typeof body?.jti === 'string' ? body.jti.trim() : '';
      if (!jti) return json({ error: 'Session id required.' }, 400);
      const { data: session, error: readError } = await admin
        .from('role_sessions')
        .select('jti, wedding_id, role, device_id')
        .eq('jti', jti)
        .maybeSingle();
      if (readError) throw readError;
      if (!session) return json({ error: 'Session not found.' }, 404);

      const { error } = await admin
        .from('role_sessions')
        .update({ revoked_at: new Date().toISOString(), revoked_by: allowlisted.user_id })
        .eq('jti', jti);
      if (error) throw error;

      // A speaker device has both a role session and a speech session; revoke
      // both so an already-open speech is blocked immediately (issue #1040).
      const { error: speechSessionError } = await admin
        .from('speech_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('jti', jti);
      if (speechSessionError) throw speechSessionError;

      await admin
        .from('role_presence')
        .update({ status: 'offline', session_jti: null, last_seen: new Date().toISOString() })
        .eq('wedding_id', session.wedding_id)
        .eq('role', session.role)
        .eq('device_id', session.device_id);

      await writeAudit(admin, allowlisted, 'revoke_session', session.wedding_id, {
        jti,
        role: session.role,
        deviceId: session.device_id,
      });
      return json({ ok: true });
    }

    if (action === 'list_roles') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      const [{ data: wedding, error: weddingError }, { data: roles, error: rolesError }] =
        await Promise.all([
          admin
            .from('weddings')
            .select('cartridge, mc_confirmed_by, room_code')
            .eq('wedding_id', weddingId)
            .maybeSingle(),
          admin
            .from('wedding_roles')
            .select('role, updated_at')
            .eq('wedding_id', weddingId)
            .order('role'),
        ]);
      if (weddingError) throw weddingError;
      if (rolesError) throw rolesError;
      if (!wedding) return json({ error: 'Wedding not found.' }, 404);

      const { data: providers } = await admin
        .from('wedding_service_providers')
        .select('category, active')
        .eq('wedding_id', weddingId)
        .eq('active', true);
      const { data: vipRows } = await admin
        .from('vip_djs')
        .select('id')
        .eq('active', true);
      const activeVipIds = new Set((vipRows ?? []).map((row: any) => row.id));
      const managed = new Set((providers ?? []).map((row: any) => row.category));
      const servicePackage = wedding.cartridge?.servicePackage ?? null;
      const djIdentityId =
        wedding.cartridge?.djIdentityId ?? wedding.cartridge?.dj?.identityId ?? null;
      const vipEligible =
        (servicePackage === 'HOST_AND_DJ_VIP' || servicePackage === 'DJ_MC') &&
        activeVipIds.has(djIdentityId);

      return json({
        weddingId,
        servicePackage,
        mcConfirmedBy: wedding.mc_confirmed_by ?? null,
        songRequestEligible: vipEligible,
        songRequestUrl: vipEligible
          ? `${serverEnv('PUBLIC_DECK_URL', 'https://deck.weselnyzabojad.pl').replace(/\/+$/, '')}/request/${wedding.room_code ?? ''}`
          : null,
        roles: (roles ?? []).map((row: any) => ({
          role: row.role,
          enabled: true,
          providerManaged: managed.has(row.role),
          updatedAt: row.updated_at,
        })),
        availableRoles: ALLOWED_ROLES,
      });
    }

    if (action === 'confirm_mc') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const mode = typeof body?.mode === 'string' ? body.mode.trim().toUpperCase() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      if (!['OWNER', 'PROVIDER'].includes(mode)) {
        return json({ error: 'MC confirmation must be OWNER or PROVIDER.' }, 400);
      }
      const writable = await requireWritableWedding(admin, weddingId);
      if (writable.error) return json({ error: writable.error }, writable.status);
      if (mode === 'PROVIDER' && !(await activeProviderForRole(admin, weddingId, 'mc'))) {
        return json({ error: 'Add an active MC provider first.' }, 409);
      }
      const { error } = await admin
        .from('weddings')
        .update({ mc_confirmed_by: mode })
        .eq('wedding_id', weddingId);
      if (error) throw error;
      await writeAudit(admin, allowlisted, 'mc_confirm', weddingId, { mode });
      return json({ weddingId, mcConfirmedBy: mode });
    }

    if (action === 'set_role') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const role = typeof body?.role === 'string' ? body.role.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      if (!ALLOWED_ROLES.includes(role)) return json({ error: 'Unknown role.' }, 400);
      const writable = await requireWritableWedding(admin, weddingId);
      if (writable.error) return json({ error: writable.error }, writable.status);

      const { data: wedding, error: weddingError } = await admin
        .from('weddings')
        .select('cartridge')
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (weddingError) throw weddingError;
      const servicePackage = wedding?.cartridge?.servicePackage ?? null;
      if (servicePackage === 'DJ_MC' && role !== 'dj_mc') {
        return json({ error: 'DJ_MC weddings use only the dj_mc role.' }, 409);
      }
      if (servicePackage !== 'DJ_MC' && role === 'dj_mc') {
        return json({ error: 'dj_mc is only available for DJ_MC weddings.' }, 409);
      }
      const managed = await activeProviderForRole(admin, weddingId, role);
      if (managed) return json({ error: 'This role is managed by an active provider.' }, 409);

      const requestedPin = pinFor(role, body?.pins ?? null);
      const { error } = await admin.from('wedding_roles').upsert(
        { wedding_id: weddingId, role, pin_hash: bcrypt.hashSync(requestedPin, 10) },
        { onConflict: 'wedding_id,role' },
      );
      if (error) throw error;
      await writeAudit(admin, allowlisted, 'role_enable', weddingId, { role });
      return json({ weddingId, role, pin: requestedPin });
    }

    if (action === 'remove_role') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const role = typeof body?.role === 'string' ? body.role.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      if (!ALLOWED_ROLES.includes(role)) return json({ error: 'Unknown role.' }, 400);
      const writable = await requireWritableWedding(admin, weddingId);
      if (writable.error) return json({ error: writable.error }, writable.status);
      const managed = await activeProviderForRole(admin, weddingId, role);
      if (managed) {
        return json(
          { error: 'Deactivate the provider before removing this role.' },
          409,
        );
      }
      await revokeProviderRole(admin, weddingId, role);
      await writeAudit(admin, allowlisted, 'role_disable', weddingId, { role });
      return json({ weddingId, role, removed: true });
    }

    if (action === 'list_musicians') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      const [{ data, error }, { data: wedding, error: weddingError }] = await Promise.all([
        admin
          .from('wedding_musicians')
          .select('*')
          .eq('wedding_id', weddingId)
          .order('created_at', { ascending: true }),
        admin.from('weddings').select('cartridge').eq('wedding_id', weddingId).maybeSingle(),
      ]);
      if (error) throw error;
      if (weddingError) throw weddingError;
      return json({
        musicians: data ?? [],
        expected: wedding?.cartridge?.musicians?.expected === true,
      });
    }

    if (action === 'upsert_musician') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      const writable = await requireWritableWedding(admin, weddingId);
      if (writable.error) return json({ error: writable.error }, writable.status);

      const normalized = normalizeMusicianPayload(body);
      if (normalized.error) return json({ error: normalized.error }, 400);

      const id = typeof body?.id === 'string' && body.id.trim() ? body.id.trim() : null;
      let before = null;
      if (id) {
        const { data, error } = await admin
          .from('wedding_musicians')
          .select('*')
          .eq('id', id)
          .eq('wedding_id', weddingId)
          .maybeSingle();
        if (error) throw error;
        if (!data) return json({ error: 'Musician not found.' }, 404);
        before = data;
      }

      const query = id
        ? admin
            .from('wedding_musicians')
            .update(normalized.musician)
            .eq('id', id)
            .eq('wedding_id', weddingId)
        : admin
            .from('wedding_musicians')
            .insert({ wedding_id: weddingId, ...normalized.musician });
      const { data, error } = await query.select('*').single();
      if (error) throw error;

      let pin = null;
      if (data.active !== false) {
        pin = await ensureMusicianAccess(admin, weddingId, data.id);
      } else {
        await revokeMusicianAccess(admin, weddingId, data.id);
      }

      await writeAudit(admin, allowlisted, 'musician_upsert', weddingId, {
        musicianId: data.id,
        before,
        after: data,
        pinIssued: Boolean(pin),
      });
      return json({ musician: data, pin });
    }

    if (action === 'deactivate_musician') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const id = typeof body?.id === 'string' ? body.id.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      if (!id) return json({ error: 'Musician id is required.' }, 400);
      const writable = await requireWritableWedding(admin, weddingId);
      if (writable.error) return json({ error: writable.error }, writable.status);
      const { data: before, error: readError } = await admin
        .from('wedding_musicians')
        .select('*')
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (readError) throw readError;
      if (!before) return json({ error: 'Musician not found.' }, 404);
      const { data, error } = await admin
        .from('wedding_musicians')
        .update({ active: false })
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      await revokeMusicianAccess(admin, weddingId, id);
      await writeAudit(admin, allowlisted, 'musician_deactivate', weddingId, {
        musicianId: id,
        before,
        after: data,
      });
      return json({ musician: data });
    }

    if (action === 'delete_musician') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const id = typeof body?.id === 'string' ? body.id.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      if (!id) return json({ error: 'Musician id is required.' }, 400);
      const writable = await requireWritableWedding(admin, weddingId);
      if (writable.error) return json({ error: writable.error }, writable.status);
      const { data: before, error: readError } = await admin
        .from('wedding_musicians')
        .select('*')
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (readError) throw readError;
      if (!before) return json({ error: 'Musician not found.' }, 404);
      await revokeMusicianAccess(admin, weddingId, id);
      const { error } = await admin
        .from('wedding_musicians')
        .delete()
        .eq('id', id)
        .eq('wedding_id', weddingId);
      if (error) throw error;
      await writeAudit(admin, allowlisted, 'musician_delete', weddingId, {
        musicianId: id,
        before,
      });
      return json({ removed: true });
    }

    if (action === 'list_providers') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      const { data, error } = await admin
        .from('wedding_service_providers')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('category', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return json({ providers: data ?? [] });
    }

    if (action === 'upsert_provider') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      const writable = await requireWritableWedding(admin, weddingId);
      if (writable.error) return json({ error: writable.error }, writable.status);

      const normalized = normalizeProviderPayload(body);
      if (normalized.error) return json({ error: normalized.error }, 400);
      if (normalized.provider.vip_dj_id) {
        const { data: vipDj, error: vipError } = await admin
          .from('vip_djs')
          .select('id')
          .eq('id', normalized.provider.vip_dj_id)
          .eq('active', true)
          .maybeSingle();
        if (vipError) throw vipError;
        if (!vipDj) return json({ error: 'Choose an active VIP DJ.' }, 400);
      }

      const id = typeof body?.id === 'string' && body.id.trim() ? body.id.trim() : null;
      let before = null;
      if (id) {
        const { data, error } = await admin
          .from('wedding_service_providers')
          .select('*')
          .eq('id', id)
          .eq('wedding_id', weddingId)
          .maybeSingle();
        if (error) throw error;
        if (!data) return json({ error: 'Provider not found.' }, 404);
        before = data;
      }

      const conflict = await assertProviderCategoryFree(
        admin,
        weddingId,
        normalized.provider.category,
        id ?? undefined,
      );
      if (conflict) return json({ error: conflict }, 409);

      const query = id
        ? admin
            .from('wedding_service_providers')
            .update(normalized.provider)
            .eq('id', id)
            .eq('wedding_id', weddingId)
        : admin
            .from('wedding_service_providers')
            .insert({ wedding_id: weddingId, ...normalized.provider });
      const { data, error } = await query.select('*').single();
      if (error) throw error;

      const role = providerRole(data.category);
      let roleAccess = null;
      if (role) {
        if (data.active) {
          roleAccess = await ensureProviderRole(admin, weddingId, role);
        } else {
          await revokeProviderRole(admin, weddingId, role);
          roleAccess = { role, pin: null, revoked: true };
        }
      }
      if (data.category === 'mc') {
        await admin
          .from('weddings')
          .update({ mc_confirmed_by: data.active ? 'PROVIDER' : null })
          .eq('wedding_id', weddingId);
      }

      // Never persist the one-time plaintext PIN in the audit log; the owner
      // still receives it in the HTTP response below.
      const roleAccessAudit = roleAccess
        ? {
            role: roleAccess.role ?? role ?? null,
            created: Boolean(roleAccess.pin),
            revoked: roleAccess.revoked === true,
          }
        : null;
      await writeAudit(admin, allowlisted, 'provider_upsert', weddingId, {
        providerId: data.id,
        before,
        after: data,
        roleAccess: roleAccessAudit,
      });
      return json({ provider: data, roleAccess });
    }

    if (action === 'deactivate_provider') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const id = typeof body?.id === 'string' ? body.id.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      if (!id) return json({ error: 'Provider id is required.' }, 400);
      const writable = await requireWritableWedding(admin, weddingId);
      if (writable.error) return json({ error: writable.error }, writable.status);
      const { data: before, error: readError } = await admin
        .from('wedding_service_providers')
        .select('*')
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (readError) throw readError;
      if (!before) return json({ error: 'Provider not found.' }, 404);
      const { data, error } = await admin
        .from('wedding_service_providers')
        .update({ active: false })
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: 'Provider not found.' }, 404);
      const role = providerRole(data.category);
      if (role) await revokeProviderRole(admin, weddingId, role);
      if (data.category === 'mc') {
        await admin
          .from('weddings')
          .update({ mc_confirmed_by: null })
          .eq('wedding_id', weddingId);
      }
      await writeAudit(admin, allowlisted, 'provider_deactivate', weddingId, {
        providerId: id,
        before,
        after: data,
        revokedRole: role,
      });
      return json({ provider: data, roleAccess: role ? { role, revoked: true } : null });
    }

    if (action === 'delete_provider') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const id = typeof body?.id === 'string' ? body.id.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      if (!id) return json({ error: 'Provider id is required.' }, 400);
      const writable = await requireWritableWedding(admin, weddingId);
      if (writable.error) return json({ error: writable.error }, writable.status);
      const { data: before, error: readError } = await admin
        .from('wedding_service_providers')
        .select('*')
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (readError) throw readError;
      if (!before) return json({ error: 'Provider not found.' }, 404);
      const role = providerRole(before.category);
      if (role) await revokeProviderRole(admin, weddingId, role);
      if (before.category === 'mc') {
        await admin
          .from('weddings')
          .update({ mc_confirmed_by: null })
          .eq('wedding_id', weddingId);
      }
      const { error } = await admin
        .from('wedding_service_providers')
        .delete()
        .eq('id', id)
        .eq('wedding_id', weddingId);
      if (error) throw error;
      await writeAudit(admin, allowlisted, 'provider_delete', weddingId, {
        providerId: id,
        before,
        revokedRole: role,
      });
      return json({ ok: true });
    }

    if (action === 'change_password') {
      const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
      if (newPassword.length < 12 || newPassword.length > 200) {
        return json(
          {
            code: 'password_policy',
            error: 'Use a password between 12 and 200 characters.',
          },
          400,
        );
      }

      const breach = await checkPasswordBreach(newPassword);
      if (!breach.ok) {
        return json(
          {
            code: 'password_check_unavailable',
            error: 'The password breach check is unavailable. Try again shortly.',
          },
          503,
        );
      }
      if (breach.breached) {
        return json(
          {
            code: 'password_breached',
            error: 'This password appears in a public data breach. Choose a different password.',
          },
          400,
        );
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(
        allowlisted.user_id,
        { password: newPassword },
      );
      if (updateError) throw updateError;
      await writeAudit(admin, allowlisted, 'change_password', allowlisted.user_id, null);
      return json({ ok: true });
    }

    return json({ error: 'Unknown admin action.' }, 400);
  } catch (error) {
    console.error('admin_api failed', error);
    return json({ error: 'Admin request failed. Try again shortly.' }, 500);
  }
}

Deno.serve(async (req) => withCors(req, await handleRequest(req)));
