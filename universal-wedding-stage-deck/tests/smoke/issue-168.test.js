import { generateKeyPairSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createGoogleDriveConnector,
  DRIVE_METADATA_FIELDS,
  DRIVE_READONLY_SCOPE,
  driveErrorHttpStatus,
  GOOGLE_DRIVE_FILES_ENDPOINT,
  GOOGLE_TOKEN_ENDPOINT,
  signServiceAccountAssertion,
} from '../../supabase/functions/_shared/googleDrive.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

function response(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name) => headers[String(name).toLowerCase()] ?? null,
    },
    async json() {
      return body;
    },
  };
}

function tokenResponse(token = 'access-token-1') {
  return response(200, { access_token: token, expires_in: 3600, token_type: 'Bearer' });
}

function metadataResponse(overrides = {}) {
  return response(200, {
    id: 'file-1',
    name: 'wedding.json',
    mimeType: 'application/json',
    modifiedTime: '2026-11-06T10:00:00.000Z',
    version: '42',
    md5Checksum: 'abc123',
    size: '2048',
    owners: [{ emailAddress: 'private@example.com' }],
    permissions: [{ role: 'owner' }],
    ...overrides,
  });
}

function assertNoSecrets(value) {
  const text = JSON.stringify(value);
  expect(text).not.toContain('access-token');
  expect(text).not.toContain('PRIVATE KEY');
  expect(text).not.toContain('private@example.com');
}

function parseAssertion(body) {
  const assertion = new URLSearchParams(body).get('assertion');
  const [header, claims] = assertion.split('.');
  return {
    header: JSON.parse(Buffer.from(header, 'base64url').toString('utf8')),
    claims: JSON.parse(Buffer.from(claims, 'base64url').toString('utf8')),
  };
}

describe('issue #168 Google Drive connector', () => {
  it('exchanges a read-only service-account assertion and caches the token', async () => {
    let nowMs = 1_800_000_000_000;
    const calls = { token: 0, files: 0 };
    const assertions = [];

    const fetchImpl = async (url, options) => {
      if (url === GOOGLE_TOKEN_ENDPOINT) {
        calls.token += 1;
        assertions.push(parseAssertion(options.body));
        return tokenResponse(`access-token-${calls.token}`);
      }
      if (url.startsWith(GOOGLE_DRIVE_FILES_ENDPOINT)) {
        calls.files += 1;
        expect(url).toContain(`fields=${encodeURIComponent(DRIVE_METADATA_FIELDS)}`);
        expect(options.headers.Authorization).toBe(`Bearer access-token-${calls.token}`);
        return metadataResponse();
      }
      throw new Error(`Unexpected URL ${url}`);
    };

    const connector = createGoogleDriveConnector({
      clientEmail: 'service@example.iam.gserviceaccount.com',
      privateKey,
      fetchImpl,
      now: () => nowMs,
    });

    const first = await connector.getFileMetadata('file-1');
    const second = await connector.getFileMetadata('file-1');

    expect(calls.token).toBe(1);
    expect(calls.files).toBe(2);
    expect(first).toEqual(second);
    expect(first).toEqual({
      id: 'file-1',
      name: 'wedding.json',
      mimeType: 'application/json',
      modifiedTime: '2026-11-06T10:00:00.000Z',
      version: '42',
      md5Checksum: 'abc123',
      size: '2048',
    });
    assertNoSecrets(first);
    assertNoSecrets(assertions);
    expect(assertions[0].header).toMatchObject({ alg: 'RS256', typ: 'JWT' });
    expect(assertions[0].claims).toMatchObject({
      iss: 'service@example.iam.gserviceaccount.com',
      scope: DRIVE_READONLY_SCOPE,
      aud: GOOGLE_TOKEN_ENDPOINT,
    });

    nowMs += 3_600_000;
    await connector.getFileMetadata('file-1');
    expect(calls.token).toBe(2);
  });

  it('signs a verifiable service-account assertion', async () => {
    const assertion = await signServiceAccountAssertion({
      clientEmail: 'service@example.iam.gserviceaccount.com',
      privateKey,
      nowSeconds: 1_800_000_000,
    });
    expect(assertion.split('.')).toHaveLength(3);
    expect(assertion).not.toContain('PRIVATE KEY');
  });

  it('rejects missing configuration without calling Google', async () => {
    let called = false;
    const connector = createGoogleDriveConnector({
      fetchImpl: async () => {
        called = true;
        return tokenResponse();
      },
    });

    await expect(connector.getFileMetadata('file-1')).rejects.toMatchObject({
      code: 'drive_not_configured',
    });
    expect(called).toBe(false);
  });

  it('maps 401, 403 quota, 403 permission and 404 to safe errors', async () => {
    const cases = [
      [401, { error: { status: 'UNAUTHENTICATED' } }, 'drive_auth_failed'],
      [
        403,
        { error: { errors: [{ reason: 'quotaExceeded' }] } },
        'drive_quota_exceeded',
      ],
      [
        403,
        { error: { errors: [{ reason: 'forbidden' }] } },
        'drive_permission_denied',
      ],
      [404, { error: { status: 'NOT_FOUND' } }, 'drive_file_not_found'],
    ];

    for (const [status, body, code] of cases) {
      const connector = createGoogleDriveConnector({
        clientEmail: 'service@example.iam.gserviceaccount.com',
        privateKey,
        fetchImpl: async (url) =>
          url === GOOGLE_TOKEN_ENDPOINT ? tokenResponse('secret-token') : response(status, body),
        sleep: async () => {},
      });

      await expect(connector.getFileMetadata('file-1')).rejects.toMatchObject({ code });
      try {
        await connector.getFileMetadata('file-1');
      } catch (error) {
        assertNoSecrets(error);
        expect(error.message).not.toContain('secret-token');
      }
    }
    expect(driveErrorHttpStatus('drive_file_not_found')).toBe(404);
    expect(driveErrorHttpStatus('drive_permission_denied')).toBe(403);
  });

  it('retries 429 and 5xx with bounded backoff before failing safely', async () => {
    for (const status of [429, 503]) {
      let fileCalls = 0;
      const delays = [];
      const connector = createGoogleDriveConnector({
        clientEmail: 'service@example.iam.gserviceaccount.com',
        privateKey,
        fetchImpl: async (url) => {
          if (url === GOOGLE_TOKEN_ENDPOINT) return tokenResponse();
          fileCalls += 1;
          return response(status, { error: { status: 'UPSTREAM', secret: 'raw-error-payload' } });
        },
        sleep: async (ms) => delays.push(ms),
        maxRetries: 2,
        baseDelayMs: 100,
      });

      const expectedCode = status === 429 ? 'drive_rate_limited' : 'drive_unavailable';
      await expect(connector.getFileMetadata('file-1')).rejects.toMatchObject({
        code: expectedCode,
      });
      expect(fileCalls).toBe(3);
      expect(delays).toEqual([100, 200]);
    }
  });

  it('maps network failures and timeouts without leaking details', async () => {
    const networkConnector = createGoogleDriveConnector({
      clientEmail: 'service@example.iam.gserviceaccount.com',
      privateKey,
      fetchImpl: async () => {
        throw new Error('socket secret');
      },
      sleep: async () => {},
      maxRetries: 1,
      baseDelayMs: 1,
    });
    await expect(networkConnector.getFileMetadata('file-1')).rejects.toMatchObject({
      code: 'drive_network_error',
    });

    const timeoutConnector = createGoogleDriveConnector({
      clientEmail: 'service@example.iam.gserviceaccount.com',
      privateKey,
      fetchImpl: async (url) =>
        url === GOOGLE_TOKEN_ENDPOINT ? tokenResponse() : new Promise(() => {}),
      timeoutMs: 10,
      maxRetries: 0,
    });
    await expect(timeoutConnector.getFileMetadata('file-1')).rejects.toMatchObject({
      code: 'drive_timeout',
    });
  });
});

describe('issue #168 admin-only wiring and secret hygiene', () => {
  it('guards Drive actions with the allowlisted AAL2 admin session', () => {
    const source = read('supabase/functions/admin_drive/index.ts');
    expect(source).toContain('authorizeAdminSession');
    expect(source).toContain("from('app_admins')");
    expect(source).toContain('decodeJwt(token)');
    expect(source).toContain("['status', 'metadata', 'list', 'preview']");
    expect(source).toContain('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    expect(source).toContain('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
    expect(source).toContain('GOOGLE_DRIVE_TEST_FILE_ID');
    expect(source).not.toContain('VITE_');
    expect(source).not.toContain('console.log');

    const connector = read('supabase/functions/_shared/googleDrive.js');
    expect(connector).toContain('drive.readonly');
    expect(connector).toContain('Promise.race');
    expect(connector).toContain('drive_auth_failed');
    expect(connector).toContain('drive_quota_exceeded');
    expect(connector).toContain('drive_timeout');
  });

  it('documents setup, sharing, rotation and smoke-test steps', () => {
    const readme = read('README.md');
    expect(readme).toContain('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    expect(readme).toContain('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
    expect(readme).toContain('Drive API');
    expect(readme).toContain('admin_drive');
    expect(readme).toMatch(/rotat/i);
    expect(readme).toMatch(/smoke/i);
  });
});
