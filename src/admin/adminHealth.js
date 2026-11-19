// Pure helpers for the admin service health bar (issue #980).

export const HEALTH_PROVIDER_ORDER = [
  { id: 'supabase', name: 'Supabase' },
  { id: 'sentry', name: 'Sentry' },
  { id: 'drive', name: 'Google Drive' },
  { id: 'sunset', name: 'sunrise-sunset.org' },
  { id: 'deck', name: 'Production deck' },
  { id: 'netlify', name: 'Netlify' },
  { id: 'main_site', name: 'weselnyzabojad.pl' },
  { id: 'landing_banner', name: 'weselnyzabojad.pl/extra/banner' },
  { id: 'deck_site', name: 'deck.weselnyzabojad.pl' },
  { id: 'francuski_dj', name: 'francuskidj.pl' },
  { id: 'itunes', name: 'iTunes API' },
  { id: 'musicbrainz', name: 'MusicBrainz API' },
];

export const HEALTH_STATUSES = ['checking', 'ok', 'degraded', 'down'];

function normalizeProvider({ id, name }, provider) {
  const status = HEALTH_STATUSES.includes(provider?.status) ? provider.status : 'down';
  return {
    id,
    name,
    status: provider ? status : 'down',
    httpStatus: Number.isFinite(provider?.httpStatus) ? provider.httpStatus : null,
    statusText: typeof provider?.statusText === 'string' ? provider.statusText : null,
    latencyMs: Number.isFinite(provider?.latencyMs) ? provider.latencyMs : null,
    checkedAt: typeof provider?.checkedAt === 'string' ? provider.checkedAt : null,
    detail: provider ? (provider.detail ?? null) : 'No result returned for this provider.',
    url: typeof provider?.url === 'string' && provider.url ? provider.url : null,
  };
}

export function normalizeHealthProviders(payload) {
  const byId = new Map(
    (Array.isArray(payload?.providers) ? payload.providers : []).map((provider) => [
      provider?.id,
      provider,
    ]),
  );
  return HEALTH_PROVIDER_ORDER.map((meta) => normalizeProvider(meta, byId.get(meta.id)));
}

export function normalizeHealthProvider(provider) {
  const meta = HEALTH_PROVIDER_ORDER.find((entry) => entry.id === provider?.id);
  if (!meta) return null;
  return normalizeProvider(meta, provider);
}

export function healthErrorProviders(message) {
  return HEALTH_PROVIDER_ORDER.map(({ id, name }) => ({
    id,
    name,
    status: 'down',
    httpStatus: null,
    statusText: null,
    latencyMs: null,
    checkedAt: null,
    detail: message,
    url: null,
  }));
}

export function healthProviderFallback(id, message, checkedAt = null) {
  const meta = HEALTH_PROVIDER_ORDER.find((entry) => entry.id === id);
  if (!meta) return null;
  return {
    ...normalizeProvider(meta, null),
    checkedAt,
    detail: message,
  };
}

export function mergeHealthProvider(providers, next) {
  if (!next) return providers;
  return providers.map((provider) =>
    provider.id === next.id
      ? { ...provider, ...next, url: next.url ?? provider.url }
      : provider,
  );
}

export function failingProviderIds(providers) {
  return new Set(
    (Array.isArray(providers) ? providers : [])
      .filter((provider) => provider.status !== 'ok')
      .map((provider) => provider.id),
  );
}

// Returns failures that were not already failing on the previous check. The
// first check counts as a transition from unknown to failing.
export function newHealthFailures(previousFailing, providers) {
  const failing = failingProviderIds(providers);
  return (Array.isArray(providers) ? providers : []).filter(
    (provider) => failing.has(provider.id) && !previousFailing.has(provider.id),
  );
}

export function isHealthyProvider(provider) {
  return provider?.status === 'ok';
}

export function healthPillTone(provider, checking = false) {
  if (checking) return 'checking';
  return isHealthyProvider(provider) ? 'ok' : 'down';
}

export function healthPillCode(provider, checking = false) {
  if (checking) return '…';
  if (Number.isFinite(provider?.httpStatus)) return String(provider.httpStatus);
  return 'ERR';
}

export function healthOverallStatus(providers, checking = false) {
  if (checking) return 'checking';
  if ((providers ?? []).some((provider) => provider.status === 'down')) return 'down';
  if ((providers ?? []).some((provider) => provider.status === 'degraded')) return 'degraded';
  return 'ok';
}

export function healthSummaryLabel({ status, issues, offline = false, checking = false }) {
  if (offline) return 'Health check offline';
  if (checking || status === 'checking') return 'Checking services…';
  if (status === 'ok') return 'All systems OK';
  return `${issues} issue${issues === 1 ? '' : 's'}`;
}

export function healthStatusLabel(status) {
  switch (status) {
    case 'ok':
      return 'Healthy';
    case 'degraded':
      return 'Degraded';
    case 'down':
      return 'Down';
    default:
      return 'Checking';
  }
}

export const HEALTH_TONE_CLASSES = {
  checking: 'border-line bg-raised text-muted',
  ok: 'border-emerald-700 bg-emerald-950/50 text-emerald-200',
  degraded: 'border-amber-700 bg-amber-950/50 text-amber-200',
  down: 'border-red-700 bg-red-950/50 text-red-200',
};

export const HEALTH_STATUS_MARKERS = {
  checking: '…',
  ok: '●',
  degraded: '▲',
  down: '■',
};
