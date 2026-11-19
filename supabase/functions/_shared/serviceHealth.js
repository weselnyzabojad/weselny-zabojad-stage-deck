// Server-side service health probes for the admin monitoring bar (issue #979).
//
// Deliberately free of Deno-only imports so Vitest can exercise status mapping,
// timeouts and sanitized errors with mocked fetch calls. It never returns
// provider tokens, API keys or raw provider payloads.

export const HEALTH_PROVIDERS = [
  'supabase',
  'sentry',
  'drive',
  'sunset',
  'deck',
  'netlify',
  'main_site',
  'landing_banner',
  'deck_site',
  'francuski_dj',
  'itunes',
  'musicbrainz',
];

export const DEFAULT_HEALTH_TIMEOUT_MS = 4000;
export const DEFAULT_DRIVE_HEALTH_FILE_ID = '1Q7IVT0GNiLztKQE8l4eCDCRw-px1qheh';
export const MUSICBRAINZ_HEALTH_USER_AGENT =
  'WeselnyZabojadStageDeck/1.0 (https://deck.weselnyzabojad.pl)';

// Fixed public endpoints monitored from the owner admin. They are public URLs,
// not secrets, and carry no credentials or signed parameters.
export const HEALTH_ENDPOINTS = Object.freeze({
  mainSite: 'https://www.weselnyzabojad.pl/',
  landingBanner: 'https://www.weselnyzabojad.pl/extra/banner',
  deckSite: 'https://deck.weselnyzabojad.pl/',
  francuskiDj: 'https://francuskidj.pl/',
  itunes: 'https://itunes.apple.com/search?term=test&entity=song&limit=1',
  musicbrainz: 'https://musicbrainz.org/ws/2/recording?query=test&fmt=json&limit=1',
});

export function healthStatusFor(httpStatus) {
  if (!Number.isFinite(httpStatus)) return 'down';
  if (httpStatus >= 200 && httpStatus < 300) return 'ok';
  if ((httpStatus >= 300 && httpStatus < 500) || httpStatus === 429) return 'degraded';
  return 'down';
}

export function isHealthProvider(id) {
  return HEALTH_PROVIDERS.includes(id);
}

function worstStatus(statuses) {
  if (statuses.includes('down')) return 'down';
  if (statuses.includes('degraded')) return 'degraded';
  return 'ok';
}

function nowIso(now) {
  return new Date(now()).toISOString();
}

function result(status, httpStatus = null, detail = null, extra = {}) {
  return { status, httpStatus, detail, ...extra };
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

  async function probe({ id, name, url = null, run }) {
    const startedAt = now();
    try {
      const outcome = await run();
      return {
        id,
        name,
        status: outcome.status,
        httpStatus: outcome.httpStatus ?? null,
        statusText: outcome.statusText ?? null,
        latencyMs: Math.max(0, now() - startedAt),
        checkedAt: nowIso(now),
        detail: outcome.detail ?? null,
        url: outcome.url ?? url,
      };
    } catch (error) {
      const detail = String(error?.message ?? 'Health probe failed.');
      return {
        id,
        name,
        status: 'down',
        httpStatus: null,
        statusText: null,
        latencyMs: Math.max(0, now() - startedAt),
        checkedAt: nowIso(now),
        detail,
        url,
      };
    }
  }

  async function probePage({ id, name, url }) {
    return probe({
      id,
      name,
      url,
      run: async () => {
        if (!url) return result('down', null, `${name} URL is not configured.`);
        let response = await fetchWithTimeout(url, {
          method: 'HEAD',
          redirect: 'manual',
          headers: { Accept: 'text/html' },
        });
        if (response.status === 405 || response.status === 501) {
          response = await fetchWithTimeout(url, {
            method: 'GET',
            redirect: 'manual',
            headers: { Accept: 'text/html' },
          });
        }
        const status = healthStatusFor(response.status);
        return result(
          status,
          response.status,
          status === 'ok' ? null : `${name} returned ${response.status}.`,
          { statusText: response.statusText || null },
        );
      },
    });
  }

  async function probeJson({ id, name, url, headers }) {
    return probe({
      id,
      name,
      url,
      run: async () => {
        if (!url) return result('down', null, `${name} URL is not configured.`);
        const response = await fetchWithTimeout(url, {
          headers: { Accept: 'application/json', ...headers },
        });
        const status = healthStatusFor(response.status);
        return result(
          status,
          response.status,
          status === 'ok' ? null : `${name} returned ${response.status}.`,
          { statusText: response.statusText || null },
        );
      },
    });
  }

  async function probeSupabase({ url, serviceKey }) {
    return probe({
      id: 'supabase',
      name: 'Supabase',
      url: url || null,
      run: async () => {
        if (!url || !serviceKey) {
          return result('down', null, 'Supabase is not configured for this function.');
        }
        const authResponse = await fetchWithTimeout(`${url.replace(/\/+$/, '')}/auth/v1/health`, {
          headers: { apikey: serviceKey },
        });
        const authStatus = authResponse.status;
        if (healthStatusFor(authStatus) !== 'ok') {
          return result(
            healthStatusFor(authStatus),
            authStatus,
            `Auth health returned ${authStatus}.`,
            { statusText: authResponse.statusText || null },
          );
        }
        const restResponse = await fetchWithTimeout(`${url.replace(/\/+$/, '')}/rest/v1/`, {
          headers: { apikey: serviceKey },
        });
        const restStatus = restResponse.status;
        const status = healthStatusFor(restStatus);
        return result(
          status,
          restStatus,
          status === 'ok' ? null : `REST returned ${restStatus}.`,
          { statusText: restResponse.statusText || null },
        );
      },
    });
  }

  async function probeSentry({ apiBase, orgSlug, projectSlug, token }) {
    return probe({
      id: 'sentry',
      name: 'Sentry',
      url:
        orgSlug && projectSlug
          ? `https://sentry.io/organizations/${encodeURIComponent(orgSlug)}/projects/${encodeURIComponent(projectSlug)}/`
          : null,
      run: async () => {
        if (!apiBase || !orgSlug || !projectSlug || !token) {
          return result('down', null, 'Sentry monitoring is not configured.');
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
        return result(status, response.status, detail, {
          statusText: response.statusText || null,
        });
      },
    });
  }

  async function probeDrive({ connector, fileId = DEFAULT_DRIVE_HEALTH_FILE_ID }) {
    return probe({
      id: 'drive',
      name: 'Google Drive',
      url: fileId ? `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view` : null,
      run: async () => {
        if (!connector?.isConfigured) {
          return result('down', null, 'Google Drive is not configured.');
        }
        try {
          await connector.getFileMetadata(fileId);
          return result('ok', 200, null, { statusText: 'OK' });
        } catch (error) {
          return result('down', Number.isFinite(error?.status) ? error.status : null, String(error?.message ?? 'Google Drive probe failed.'));
        }
      },
    });
  }

  async function probeSunset({ url }) {
    return probe({
      id: 'sunset',
      name: 'sunrise-sunset.org',
      url: url || null,
      run: async () => {
        if (!url) return result('down', null, 'Sunset lookup is not configured.');
        const response = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } });
        const status = healthStatusFor(response.status);
        return result(
          status,
          response.status,
          status === 'ok' ? null : `Sunrise-sunset API returned ${response.status}.`,
          { statusText: response.statusText || null },
        );
      },
    });
  }

  async function probeDeck({ url }) {
    return probe({
      id: 'deck',
      name: 'Production deck',
      url: url || null,
      run: async () => {
        if (!url) return result('down', null, 'Deck URL is not configured.');
        let response = await fetchWithTimeout(url, {
          method: 'HEAD',
          redirect: 'manual',
          headers: { Accept: 'text/html' },
        });
        if (response.status === 405 || response.status === 501) {
          response = await fetchWithTimeout(url, {
            method: 'GET',
            redirect: 'manual',
            headers: { Accept: 'text/html' },
          });
        }
        const status = healthStatusFor(response.status);
        let detail = null;
        if (status !== 'ok') {
          detail =
            response.status === 401 || response.status === 403
              ? `Deck is behind a Netlify login redirect (HTTP ${response.status}).`
              : `Deck returned ${response.status}.`;
        }
        return result(status, response.status, detail, {
          statusText: response.statusText || null,
        });
      },
    });
  }

  async function probeNetlify({ apiBase, siteId, token }) {
    return probe({
      id: 'netlify',
      name: 'Netlify',
      url: siteId ? `https://app.netlify.com/sites/${encodeURIComponent(siteId)}` : null,
      run: async () => {
        if (!apiBase || !siteId || !token) {
          return result('down', null, 'Netlify monitoring is not configured.');
        }
        const endpoint = `${apiBase.replace(/\/+$/, '')}/sites/${encodeURIComponent(siteId)}`;
        const response = await fetchWithTimeout(endpoint, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        const status = healthStatusFor(response.status);
        if (status !== 'ok') {
          return result(
            status,
            response.status,
            response.status === 401 || response.status === 403
              ? 'Netlify rejected the API token.'
              : `Netlify API returned ${response.status}.`,
            { statusText: response.statusText || null },
          );
        }
        const site = await response.json().catch(() => null);
        const deployState = site?.published_deploy?.state ?? null;
        if (deployState === 'ready') {
          return result('ok', response.status, null, {
            statusText: response.statusText || null,
          });
        }
        return result(
          'degraded',
          response.status,
          deployState
            ? `Published deploy state: ${deployState}.`
            : 'No published deploy found.',
          { statusText: response.statusText || null },
        );
      },
    });
  }

  async function probeWeselnyzabojad({ url }) {
    return probePage({ id: 'main_site', name: 'weselnyzabojad.pl', url });
  }

  async function probeLandingBanner({ url }) {
    return probePage({ id: 'landing_banner', name: 'weselnyzabojad.pl/extra/banner', url });
  }

  async function probeDeckSite({ url }) {
    return probePage({ id: 'deck_site', name: 'deck.weselnyzabojad.pl', url });
  }

  async function probeFrancuskiDj({ url }) {
    return probePage({ id: 'francuski_dj', name: 'francuskidj.pl', url });
  }

  async function probeItunes({ url }) {
    return probeJson({ id: 'itunes', name: 'iTunes API', url });
  }

  async function probeMusicbrainz({ url }) {
    return probeJson({
      id: 'musicbrainz',
      name: 'MusicBrainz API',
      url,
      headers: { 'User-Agent': MUSICBRAINZ_HEALTH_USER_AGENT },
    });
  }

  return {
    probeSupabase,
    probeSentry,
    probeDrive,
    probeSunset,
    probeDeck,
    probeNetlify,
    probeWeselnyzabojad,
    probeLandingBanner,
    probeDeckSite,
    probeFrancuskiDj,
    probeItunes,
    probeMusicbrainz,
    worstStatus,
  };
}

export async function runServiceHealth({
  health = createServiceHealth(),
  supabase = {},
  sentry = {},
  drive = {},
  sunset = {},
  deck = {},
  netlify = {},
  mainSite = { url: HEALTH_ENDPOINTS.mainSite },
  landingBanner = { url: HEALTH_ENDPOINTS.landingBanner },
  deckSite = { url: HEALTH_ENDPOINTS.deckSite },
  francuskiDj = { url: HEALTH_ENDPOINTS.francuskiDj },
  itunes = { url: HEALTH_ENDPOINTS.itunes },
  musicbrainz = { url: HEALTH_ENDPOINTS.musicbrainz },
  providerId = null,
  now = () => Date.now(),
} = {}) {
  if (providerId && !isHealthProvider(providerId)) {
    throw new Error(`Unknown health provider: ${providerId}`);
  }

  const runners = {
    supabase: () => health.probeSupabase(supabase),
    sentry: () => health.probeSentry(sentry),
    drive: () => health.probeDrive(drive),
    sunset: () => health.probeSunset(sunset),
    deck: () => health.probeDeck(deck),
    netlify: () => health.probeNetlify(netlify),
    main_site: () => health.probeWeselnyzabojad(mainSite),
    landing_banner: () => health.probeLandingBanner(landingBanner),
    deck_site: () => health.probeDeckSite(deckSite),
    francuski_dj: () => health.probeFrancuskiDj(francuskiDj),
    itunes: () => health.probeItunes(itunes),
    musicbrainz: () => health.probeMusicbrainz(musicbrainz),
  };

  const ids = providerId ? [providerId] : HEALTH_PROVIDERS;
  const providers = await Promise.all(ids.map((id) => runners[id]()));
  return {
    ok: providers.every((provider) => provider.status === 'ok'),
    checkedAt: nowIso(now),
    providerId: providerId ?? null,
    providers,
  };
}

export { worstStatus };
