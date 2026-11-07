// Server-only Google Drive REST v3 connector (issue #168).
//
// The module is deliberately free of Deno-only imports so Vitest can exercise
// token exchange, caching, retries and sanitized errors with mocked fetch calls.
// It never logs or returns Google access tokens, the service-account private
// key, Authorization headers or raw Google error payloads.

export const DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
export const DRIVE_METADATA_FIELDS =
  'id,name,mimeType,modifiedTime,version,md5Checksum,size';

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BASE_DELAY_MS = 250;
const TOKEN_EXPIRY_SKEW_MS = 60_000;

const QUOTA_REASONS = new Set([
  'quotaExceeded',
  'dailyLimitExceeded',
  'userRateLimitExceeded',
  'rateLimitExceeded',
]);

export function createDriveError(code, message, status = null) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

export function driveErrorHttpStatus(code) {
  switch (code) {
    case 'drive_not_configured':
      return 503;
    case 'drive_invalid_request':
      return 400;
    case 'drive_permission_denied':
      return 403;
    case 'drive_file_not_found':
      return 404;
    case 'drive_rate_limited':
      return 429;
    case 'drive_timeout':
      return 504;
    case 'drive_quota_exceeded':
    case 'drive_unavailable':
      return 503;
    case 'drive_auth_failed':
    case 'drive_network_error':
    default:
      return 502;
  }
}

function base64UrlBytes(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlText(text) {
  return base64UrlBytes(new TextEncoder().encode(text));
}

function privateKeyBytes(pem) {
  const normalized = String(pem ?? '')
    .replace(/\\n/g, '\n')
    .replace(/-----[^-]+-----/g, '')
    .replace(/\s+/g, '');
  if (!normalized) throw createDriveError('drive_not_configured', 'Google Drive is not configured.');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function signServiceAccountAssertion({
  clientEmail,
  privateKey,
  nowSeconds = Math.floor(Date.now() / 1000),
  lifetimeSeconds = 3600,
} = {}) {
  if (!clientEmail || !privateKey) {
    throw createDriveError(
      'drive_not_configured',
      'Google Drive is not configured. Set the service-account email and private key.',
    );
  }

  const header = base64UrlText(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64UrlText(
    JSON.stringify({
      iss: clientEmail,
      scope: DRIVE_READONLY_SCOPE,
      aud: GOOGLE_TOKEN_ENDPOINT,
      iat: nowSeconds,
      exp: nowSeconds + lifetimeSeconds,
    }),
  );
  const unsigned = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${base64UrlBytes(new Uint8Array(signature))}`;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function googleErrorReason(payload) {
  const reason = payload?.error?.errors?.[0]?.reason ?? payload?.error?.status ?? '';
  return typeof reason === 'string' ? reason : '';
}

function sanitizedMetadata(payload) {
  const size = payload?.size;
  return {
    id: typeof payload?.id === 'string' ? payload.id : null,
    name: typeof payload?.name === 'string' ? payload.name : null,
    mimeType: typeof payload?.mimeType === 'string' ? payload.mimeType : null,
    modifiedTime: typeof payload?.modifiedTime === 'string' ? payload.modifiedTime : null,
    version: typeof payload?.version === 'string' ? payload.version : null,
    md5Checksum: typeof payload?.md5Checksum === 'string' ? payload.md5Checksum : null,
    size: typeof size === 'string' ? size : Number.isFinite(size) ? String(size) : null,
  };
}

function mapGoogleStatus(status, reason, resource) {
  if (resource === 'token' && (status === 400 || status === 401)) {
    return createDriveError(
      'drive_auth_failed',
      'Google rejected the service-account credentials. Check the client email and rotate the key if needed.',
      status,
    );
  }
  if (status === 401) {
    return createDriveError(
      'drive_auth_failed',
      'Google rejected the access token. Check the service-account credentials.',
      status,
    );
  }
  if (status === 403) {
    if (QUOTA_REASONS.has(reason)) {
      return createDriveError(
        'drive_quota_exceeded',
        'Google Drive quota is exhausted. Try again later or check the project quota.',
        status,
      );
    }
    return createDriveError(
      'drive_permission_denied',
      'The service account does not have permission to read this Drive file.',
      status,
    );
  }
  if (status === 404) {
    return createDriveError(
      'drive_file_not_found',
      'Drive file not found. Share the file with the service-account email and check the file id.',
      status,
    );
  }
  if (status === 429) {
    return createDriveError(
      'drive_rate_limited',
      'Google Drive is rate-limiting requests. Try again shortly.',
      status,
    );
  }
  if (status >= 500) {
    return createDriveError(
      'drive_unavailable',
      'Google Drive is temporarily unavailable. Try again shortly.',
      status,
    );
  }
  return createDriveError(
    'drive_invalid_request',
    'Google Drive rejected the request. Check the file id and fields.',
    status,
  );
}

function retryDelayMs(response, attempt, baseDelayMs) {
  const header = response?.headers?.get?.('retry-after');
  if (header != null && String(header).trim() !== '') {
    const retryAfter = Number(header);
    if (Number.isFinite(retryAfter) && retryAfter >= 0) {
      return Math.min(5000, retryAfter * 1000);
    }
  }
  return Math.min(5000, baseDelayMs * 2 ** attempt);
}

export function createGoogleDriveConnector({
  clientEmail = '',
  privateKey = '',
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRetries = DEFAULT_MAX_RETRIES,
  baseDelayMs = DEFAULT_BASE_DELAY_MS,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  tokenEndpoint = GOOGLE_TOKEN_ENDPOINT,
  filesEndpoint = GOOGLE_DRIVE_FILES_ENDPOINT,
} = {}) {
  let cachedToken = null;
  let tokenExpiresAt = 0;

  async function request(url, options, { resource = 'drive', retries = maxRetries } = {}) {
    let attempt = 0;
    for (;;) {
      const controller = new AbortController();
      let timeoutId;
      const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(createDriveError('drive_timeout', 'Google request timed out.', 504));
        }, timeoutMs);
      });

      let response;
      try {
        response = await Promise.race([
          fetchImpl(url, { ...options, signal: controller.signal }),
          timeout,
        ]);
      } catch (error) {
        if (error?.code === 'drive_timeout') throw error;
        if (attempt < retries) {
          await sleep(Math.min(5000, baseDelayMs * 2 ** attempt));
          attempt += 1;
          continue;
        }
        throw createDriveError(
          'drive_network_error',
          'Could not reach Google. Check the server network and try again.',
        );
      } finally {
        clearTimeout(timeoutId);
      }

      if (response.ok) return response;

      const payload = await readJson(response);
      const reason = googleErrorReason(payload);
      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        await sleep(retryDelayMs(response, attempt, baseDelayMs));
        attempt += 1;
        continue;
      }
      throw mapGoogleStatus(response.status, reason, resource);
    }
  }

  async function getAccessToken({ force = false } = {}) {
    const nowMs = now();
    if (!force && cachedToken && nowMs < tokenExpiresAt - TOKEN_EXPIRY_SKEW_MS) {
      return cachedToken;
    }

    const assertion = await signServiceAccountAssertion({
      clientEmail,
      privateKey,
      nowSeconds: Math.floor(nowMs / 1000),
    });

    const response = await request(
      tokenEndpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion,
        }).toString(),
      },
      { resource: 'token', retries: maxRetries },
    );

    const payload = await readJson(response);
    if (!payload?.access_token) {
      throw createDriveError(
        'drive_auth_failed',
        'Google did not return a service-account access token.',
      );
    }
    const expiresIn = Number(payload.expires_in);
    const lifetimeMs = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn * 1000 : 3600_000;
    cachedToken = payload.access_token;
    tokenExpiresAt = nowMs + lifetimeMs;
    return cachedToken;
  }

  async function getFileMetadata(fileId) {
    if (typeof fileId !== 'string' || fileId.trim().length === 0) {
      throw createDriveError('drive_invalid_request', 'A Drive file id is required.');
    }

    const token = await getAccessToken();
    const params = new URLSearchParams({ fields: DRIVE_METADATA_FIELDS });
    const url = `${filesEndpoint}/${encodeURIComponent(fileId.trim())}?${params.toString()}`;

    let response;
    try {
      response = await request(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      if (error?.code !== 'drive_auth_failed') throw error;
      // A cached token can expire early after revocation; refresh once.
      const refreshed = await getAccessToken({ force: true });
      response = await request(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${refreshed}` },
      });
    }

    return sanitizedMetadata(await readJson(response));
  }

  return {
    getAccessToken,
    getFileMetadata,
    isConfigured: Boolean(clientEmail && privateKey),
  };
}
