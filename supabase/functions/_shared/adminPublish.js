// Pure publish contract shared by `admin_api` and its mocked tests (issue #165).
//
// No Deno/Node-only imports: the function receives the Supabase service client
// and the Async validator, so Vitest can exercise success, stale revisions and
// invalid/mismatched cartridges without deploying anything.

export const WEDDING_ID_PATTERN = /^\d{4}-\d{2}-\d{2}_[a-z0-9_]+$/;
export const ROOM_CODE_PATTERN = /^[a-z0-9]{6,12}$/;
export const ALLOWED_ROLES = ['mc', 'dj', 'speaker'];
export const DEFAULT_ROLES = ['mc', 'dj'];
const ROOM_CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function normalizeRoles(value) {
  const requested = Array.isArray(value) && value.length > 0 ? value : DEFAULT_ROLES;
  return [...new Set(requested)].filter((role) => ALLOWED_ROLES.includes(role));
}

export function randomRoomCode(length = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join('');
}

function parseEventDateISO(cartridge, fallbackDate, weddingId) {
  if (typeof cartridge.dateISO === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cartridge.dateISO)) {
    return cartridge.dateISO;
  }
  const display = typeof cartridge.date === 'string' ? cartridge.date : fallbackDate;
  const match = /^([0-3]\d)\.([01]\d)\.(\d{4})$/.exec(display ?? '');
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  const fromId = /^(\d{4}-\d{2}-\d{2})/.exec(weddingId);
  return fromId?.[1] ?? null;
}

// TTL runs from the event, not from publish time. `null` means "keep the
// existing expiry" (content-only republication); inserts default to 30 days.
export function resolveExpiresAt(body, cartridge, date, weddingId) {
  const requested = Number.isFinite(body?.expiresInDays) ? Math.round(body.expiresInDays) : null;
  const eventDateISO = parseEventDateISO(cartridge, date, weddingId);
  if (requested == null && !eventDateISO) return null;

  const days = Math.min(365, Math.max(1, requested ?? 7));
  const baseMs = eventDateISO ? Date.parse(`${eventDateISO}T23:59:59Z`) : Date.now();
  return new Date(baseMs + days * 86400000).toISOString();
}

function parseExpectedRevision(value) {
  if (value === undefined || value === null) return { value: null };
  const parsed = typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : value;
  if (!Number.isInteger(parsed) || parsed < 0) {
    return { error: 'expectedRevision must be a non-negative integer.' };
  }
  return { value: parsed };
}

function coupleDisplayName(cartridge) {
  const bride = typeof cartridge?.coupleProfile?.bride?.firstName === 'string'
    ? cartridge.coupleProfile.bride.firstName.trim()
    : '';
  const groom = typeof cartridge?.coupleProfile?.groom?.firstName === 'string'
    ? cartridge.coupleProfile.groom.firstName.trim()
    : '';
  return bride && groom ? `${bride} & ${groom}` : null;
}

export function normalizePublishRequest(body, { source = 'admin_json' } = {}) {
  const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
  const date = typeof body?.date === 'string' ? body.date.trim() : null;
  const cartridge = body?.cartridge && typeof body.cartridge === 'object' ? body.cartridge : null;
  const couple =
    coupleDisplayName(cartridge) ??
    (typeof body?.couple === 'string' ? body.couple.trim() : null);
  const roles = normalizeRoles(body?.roles);
  const requestedRoomCode =
    typeof body?.roomCode === 'string' ? body.roomCode.trim().toLowerCase() : '';
  const expected = parseExpectedRevision(body?.expectedRevision);
  const sourceMetadata =
    body?.sourceMetadata &&
    typeof body.sourceMetadata === 'object' &&
    !Array.isArray(body.sourceMetadata)
      ? body.sourceMetadata
      : null;

  if (!WEDDING_ID_PATTERN.test(weddingId)) {
    return { error: 'weddingId must look like YYYY-MM-DD_bride_groom.', status: 400 };
  }
  if (expected.error) return { error: expected.error, status: 400 };
  if (!cartridge || Array.isArray(cartridge)) {
    return { error: 'A cartridge object is required.', status: 400 };
  }
  if (typeof cartridge.weddingId === 'string' && cartridge.weddingId !== weddingId) {
    return { error: 'cartridge.weddingId must match the publication weddingId.', status: 400 };
  }
  if (requestedRoomCode && !ROOM_CODE_PATTERN.test(requestedRoomCode)) {
    return { error: 'roomCode must be 6–12 lowercase letters/digits.', status: 400 };
  }
  if (roles.length === 0) {
    return { error: 'Provide at least one role.', status: 400 };
  }

  return {
    request: {
      weddingId,
      couple,
      date,
      cartridge,
      roles,
      requestedRoomCode,
      expectedRevision: expected.value,
      expiresInDays: Number.isFinite(body?.expiresInDays) ? body.expiresInDays : null,
      source,
      sourceMetadata,
    },
  };
}

export function isStaleRevisionError(error) {
  const code = String(error?.code ?? '');
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`;
  return code === '40001' || /stale_cartridge_revision/i.test(text);
}

function normalizePublishedRow(row) {
  if (!row) return null;
  return {
    weddingId: row.wedding_id,
    roomCode: row.room_code,
    created: Boolean(row.created),
    previousRevision: Number(row.previous_revision ?? 0),
    cartridgeRevision: Number(row.cartridge_revision ?? 0),
    cartridgeSource: row.cartridge_source ?? 'admin_json',
    cartridgeSourceMetadata: row.cartridge_source_metadata ?? null,
    cartridgePublishedAt: row.cartridge_published_at ?? null,
  };
}

async function currentRevision(admin, weddingId) {
  const { data } = await admin
    .from('weddings')
    .select('cartridge_revision')
    .eq('wedding_id', weddingId)
    .maybeSingle();
  return Number(data?.cartridge_revision ?? 0);
}

// Publish one immutable revision.
//
// The pre-check gives a friendly 409 before touching the row; the SQL function
// repeats the check under `for update` so concurrent admin tabs cannot win.
export async function publishCartridge({ admin, request, actor, validate }) {
  const validation = await validate(request.cartridge);
  if (!validation?.valid) {
    return {
      ok: false,
      status: 400,
      error: 'Cartridge validation failed.',
      errors: (validation?.errors ?? []).slice(0, 20),
    };
  }
  const cartridge = validation.cartridge;
  if (cartridge.weddingId !== request.weddingId) {
    return {
      ok: false,
      status: 400,
      error: 'cartridge.weddingId must match the publication weddingId.',
    };
  }

  const { data: existing, error: readError } = await admin
    .from('weddings')
    .select('room_code, cartridge_revision, archived_at')
    .eq('wedding_id', request.weddingId)
    .maybeSingle();
  if (readError) throw readError;

  const revision = Number(existing?.cartridge_revision ?? 0);

  if (existing && request.expectedRevision == null) {
    return {
      ok: false,
      status: 409,
      error: 'expectedRevision is required to publish an existing wedding.',
      currentRevision: revision,
    };
  }
  if (existing && request.expectedRevision !== revision) {
    return {
      ok: false,
      status: 409,
      error: `Cartridge changed to revision ${revision}. Reload and retry.`,
      currentRevision: revision,
      stale: true,
    };
  }
  if (!existing && request.expectedRevision != null && request.expectedRevision !== 0) {
    return {
      ok: false,
      status: 409,
      error: 'This wedding has no published cartridge yet. expectedRevision must be 0.',
      currentRevision: 0,
      stale: true,
    };
  }
  if (!existing && request.roles.length === 0) {
    return { ok: false, status: 400, error: 'Provide at least one role for a new wedding.' };
  }
  if (existing && request.requestedRoomCode && request.requestedRoomCode !== existing.room_code) {
    return {
      ok: false,
      status: 400,
      error: 'A content-only publication cannot change the room code.',
    };
  }

  const roomCode = existing?.room_code || request.requestedRoomCode || randomRoomCode();
  const expiresAt = resolveExpiresAt(
    { expiresInDays: request.expiresInDays },
    cartridge,
    request.date,
    request.weddingId,
  );

  const { data, error } = await admin.rpc('stage_deck_publish_cartridge', {
    p_wedding_id: request.weddingId,
    p_room_code: roomCode,
    p_couple: request.couple,
    p_date: request.date,
    p_cartridge: cartridge,
    p_expires_at: expiresAt,
    p_source: request.source,
    p_expected_revision: request.expectedRevision ?? 0,
    p_actor: actor?.user_id ?? actor?.id ?? null,
    p_source_metadata: request.sourceMetadata ?? null,
  });

  if (error) {
    if (isStaleRevisionError(error)) {
      return {
        ok: false,
        status: 409,
        error: 'Cartridge was published by another admin tab. Reload and retry.',
        currentRevision: await currentRevision(admin, request.weddingId),
        stale: true,
      };
    }
    throw error;
  }

  return { ok: true, result: normalizePublishedRow(data), cartridge };
}

export function buildPublishAuditDetail(result, request) {
  return {
    oldRevision: result?.previousRevision ?? 0,
    newRevision: result?.cartridgeRevision ?? 0,
    source: result?.cartridgeSource ?? request?.source ?? 'admin_json',
    sourceMetadata: result?.cartridgeSourceMetadata ?? request?.sourceMetadata ?? null,
    expectedRevision: request?.expectedRevision ?? null,
    created: Boolean(result?.created),
  };
}

// Exact-source binding for the Drive publish action (issue #170). A preview may
// only be published if the file version/checksum still match the re-read file.
export function driveSourceChanged(file, { expectedVersion = '', expectedChecksum = '' } = {}) {
  const expectedV = typeof expectedVersion === 'string' ? expectedVersion.trim() : '';
  const expectedC = typeof expectedChecksum === 'string' ? expectedChecksum.trim() : '';
  const versionChanged = Boolean(expectedV && expectedV !== (file?.version ?? null));
  const checksumChanged = Boolean(expectedC && expectedC !== (file?.md5Checksum ?? null));
  return {
    changed: versionChanged || checksumChanged,
    reason: versionChanged ? 'version' : checksumChanged ? 'checksum' : 'unchanged',
    expectedVersion: expectedV || null,
    actualVersion: file?.version ?? null,
    expectedChecksum: expectedC || null,
    actualChecksum: file?.md5Checksum ?? null,
  };
}

export function buildDriveSourceMetadata(file, { bytes = null, retrievedAt = null } = {}) {
  return {
    provider: 'google_drive',
    driveFileId: file?.id ?? null,
    name: file?.name ?? null,
    mimeType: file?.mimeType ?? null,
    modifiedTime: file?.modifiedTime ?? null,
    version: file?.version ?? null,
    md5Checksum: file?.md5Checksum ?? null,
    size: file?.size ?? null,
    bytes,
    retrievedAt,
  };
}
