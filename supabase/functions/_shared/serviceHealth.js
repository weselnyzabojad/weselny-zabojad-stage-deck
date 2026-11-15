// Server-side service health probes for the admin monitoring bar (issue #979).
//
// Deliberately free of Deno-only imports so Vitest can exercise status mapping,
// timeouts and sanitized errors with mocked fetch calls. It never returns
// provider tokens, API keys or raw provider payloads.

export const HEALTH_PROVIDERS = ['supabase', 'sentry', 'drive', 'sunset'];
export const DEFAULT_HEALTH_TIMEOUT_MS = 4000;
export const DEFAULT_DRIVE_HEALTH_FILE_ID = '1Q7IVT0GNiLztKQE8l4eCDCRw-px1qheh';

export function healthStatusFor(httpStatus) {
  if (!Number.isFinite(httpStatus)) return 'down';
  if (httpStatus >= 200 && httpStatus < 300) return 'ok';
  if ((httpStatus >= 300 && httpStatus < 500) || httpStatus === 429) return 'degraded';
  return 'down';
}

function worstStatus(statuses) {
  if (statuses.includes('down')) return 'down';
  if (statuses.includes('degraded')) return 'degraded';
  return 'ok';
}

function nowIso(now) {
  return new Date(now()).toISOString();
}

export function createServiceHealth({
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_HEALTH_TIMEOUT_MS,
  now = () => Date.now(),
} = {}) {
  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error(`Timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
    });
    try {
      return await Promise.race([
        fetchImpl(url, { ...options, signal: controller.signal }),
        timeout,
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  async function probe({ id, name, run }) {
    const startedAt = now();
    try {
      const result = await run();
      return {
        id,
        name,
        status: result.status,
        httpStatus: result.httpStatus ?? null,
        latencyMs: Math.max(0, now() - startedAt),
        checkedAt: nowIso(now),
        detail: result.detail ?? null,
      };
    } catch (error) {
      const detail = String(error?.message ?? 'Health probe failed.');
      return {
        id,
        name,
        status: 'down',
        httpStatus: null,
        latencyMs: Math.max(0, now() - startedAt),
        checkedAt: nowIso(now),
        detail,
      };
    }
  }

  async function probeSupabase({ url, serviceKey }) {
    return probe({
      id: 'supabase',
      name: 'Supabase',
      run: async () => {
        if (!url || !serviceKey) {
          return { status: 'down', detail: 'Supabase is not configured for this function.' };
        }
        const authResponse = await fetchWithTimeout(`${url.replace(/\/+$/, '')}/auth/v1/health`, {
          headers: { apikey: serviceKey },
        });
        const authStatus = authResponse.status;
        if (healthStatusFor(authStatus) !== 'ok') {
          return {
            status: healthStatusFor(authStatus),
            httpStatus: authStatus,
            detail: `Auth health returned ${authStatus}.`,
          };
        }
        const restResponse = await fetchWithTimeout(`${url.replace(/\/+$/, '')}/rest/v1/`, {
          headers: { apikey: serviceKey },
        });
        const restStatus = restResponse.status;
        const status = healthStatusFor(restStatus);
        return {
          status,
          httpStatus: restStatus,
          detail: status === 'ok' ? null : `REST returned ${restStatus}.`,
        };
      },
    });
  }

  async function probeSentry({ apiBase, orgSlug, projectSlug, token }) {
    return probe({
      id: 'sentry',
      name: 'Sentry',
      run: async () => {
        if (!apiBase || !orgSlug || !projectSlug || !token) {
          return { status: 'down', detail: 'Sentry monitoring is not configured.' };
        }
        const endpoint = `${apiBase.replace(/\/+$/, '')}/projects/${encodeURIComponent(orgSlug)}/${encodeURIComponent(projectSlug)}/`;
        const response = await fetchWithTimeout(endpoint, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        const status = healthStatusFor(response.status);
        let detail = null;
        if (status !== 'ok') {
          detail =
            response.status === 401 || response.status === 403
              ? 'Sentry rejected the API token.'
              : `Sentry API returned ${response.status}.`;
        }
        return { status, httpStatus: response.status, detail };
      },
    });
  }

  async function probeDrive({ connector, fileId = DEFAULT_DRIVE_HEALTH_FILE_ID }) {
    return probe({
      id: 'drive',
      name: 'Google Drive',
      run: async () => {
        if (!connector?.isConfigured) {
          return { status: 'down', detail: 'Google Drive is not configured.' };
        }
        try {
          await connector.getFileMetadata(fileId);
          return { status: 'ok', httpStatus: 200, detail: null };
        } catch (error) {
          return {
            status: 'down',
            httpStatus: Number.isFinite(error?.status) ? error.status : null,
            detail: String(error?.message ?? 'Google Drive probe failed.'),
          };
        }
      },
    });
  }

  async function probeSunset({ url }) {
    return probe({
      id: 'sunset',
      name: 'sunrise-sunset.org',
      run: async () => {
        if (!url) return { status: 'down', detail: 'Sunset lookup is not configured.' };
        const response = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } });
        const status = healthStatusFor(response.status);
        return {
          status,
          httpStatus: response.status,
          detail: status === 'ok' ? null : `Sunrise-sunset API returned ${response.status}.`,
        };
      },
    });
  }

  return { probeSupabase, probeSentry, probeDrive, probeSunset, worstStatus };
}

export async function runServiceHealth({
  health = createServiceHealth(),
  supabase = {},
  sentry = {},
  drive = {},
  sunset = {},
  now = () => Date.now(),
} = {}) {
  const providers = await Promise.all([
    health.probeSupabase(supabase),
    health.probeSentry(sentry),
    health.probeDrive(drive),
    health.probeSunset(sunset),
  ]);
  return {
    ok: providers.every((provider) => provider.status === 'ok'),
    checkedAt: nowIso(now),
    providers,
  };
}

export { worstStatus };
