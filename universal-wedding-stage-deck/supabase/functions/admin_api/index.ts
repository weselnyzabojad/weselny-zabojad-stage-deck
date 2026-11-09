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
import speedFotoDomain from '../_shared/domains/speed-foto.json' with { type: 'json' };
import guestCoverageDomain from '../_shared/domains/guest-coverage.json' with { type: 'json' };
import specialEffectsDomain from '../_shared/domains/special-effects.json' with { type: 'json' };
import cakeDomain from '../_shared/domains/cake.json' with { type: 'json' };
import musicPolicyDomain from '../_shared/domains/music-policy.json' with { type: 'json' };
import {
  authorizeAdminSession,
  decodeJwt,
  mfaFresh,
} from '../_shared/adminAuth.js';
import {
  WEDDING_ID_PATTERN,
  buildDriveSourceMetadata,
  buildPublishAuditDetail,
  driveSourceChanged,
  normalizePublishRequest,
  normalizeRoles,
  publishCartridge,
} from '../_shared/adminPublish.js';
import { makeCartridgeValidator } from '../_shared/cartridgeValidator.js';
import {
  createGoogleDriveConnector,
  driveErrorHttpStatus,
} from '../_shared/googleDrive.js';
import { parseGameQuestionDoc } from '../_shared/gameQuestions.js';

const validateCartridge = makeCartridgeValidator(Ajv2020, weddingSchema, [oczepinyDomain, firstDanceDomain, attractionsDomain, culturalRulesDomain, coupleProfileDomain, photoPlanDomain, miniSessionDomain, groupPhotosDomain, speedFotoDomain, guestCoverageDomain, specialEffectsDomain, cakeDomain, musicPolicyDomain]);
const driveConnector = createGoogleDriveConnector({
  clientEmail: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL') ?? '',
  privateKey: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY') ?? '',
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
]);
const REQUIRED_ADMIN_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_JWT_SECRET'];

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
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

const PROVIDER_CATEGORIES = new Set(['dj', 'photo1', 'photo2', 'video', 'venue_manager', 'other']);
const PROVIDER_ROLE_CATEGORIES = new Set(['dj', 'photo1', 'photo2', 'video', 'venue_manager']);

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
  if (requestedVipDjId && !['dj_mark', 'dj_szymoniak'].includes(requestedVipDjId)) {
    return { error: 'Choose a known VIP DJ.' };
  }
  const vipDjId = category === 'dj' ? requestedVipDjId : null;

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
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

    if (action === 'list') {
      const [weddings, roles, sessions, presence, audit] = await Promise.all([
        admin
          .from('weddings')
          .select(
            'wedding_id, room_code, couple, date, expires_at, archived_at, created_at, updated_at, cartridge, cartridge_revision, cartridge_source, cartridge_source_metadata, cartridge_published_at',
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
          const venue =
            typeof row.cartridge?.venue === 'string'
              ? row.cartridge.venue
              : row.cartridge?.venue?.name ?? '';
          const { cartridge: _cartridge, ...summary } = row;
          return {
            ...summary,
            venue,
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

      // Fetch each game's dedicated question Doc at publish time and embed the
      // parsed questions. Missing Docs stay MISSING/UNAVAILABLE rather than
      // blocking the cartridge publication.
      if (Array.isArray(cartridge?.games?.questionLists)) {
        for (const list of cartridge.games.questionLists) {
          if (!list?.sourceDocId) continue;
          try {
            const questionDoc = await driveConnector.readSource(list.sourceDocId);
            const questions = parseGameQuestionDoc(questionDoc.text, list.gameType);
            list.questions = questions;
            list.status = questions.length > 0 ? 'AVAILABLE' : 'UNAVAILABLE';
          } catch {
            list.questions = [];
            list.status = 'UNAVAILABLE';
          }
        }
      }

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

    if (action === 'archive') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      const { error } = await admin
        .from('weddings')
        .update({ archived_at: new Date().toISOString() })
        .eq('wedding_id', weddingId);
      if (error) throw error;
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
      const roles = normalizeRoles(body?.roles);
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      if (roles.length === 0) return json({ error: 'Provide at least one role.' }, 400);

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

      await writeAudit(admin, allowlisted, 'provider_upsert', weddingId, {
        providerId: data.id,
        before,
        after: data,
        roleAccess,
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

    return json({ error: 'Unknown admin action.' }, 400);
  } catch (error) {
    console.error('admin_api failed', error);
    return json({ error: 'Admin request failed. Try again shortly.' }, 500);
  }
});
