// Pure helpers for the admin service health bar (issue #980).

export const HEALTH_PROVIDER_ORDER = [
  { id: 'supabase', name: 'Supabase' },
  { id: 'sentry', name: 'Sentry' },
  { id: 'drive', name: 'Google Drive' },
  { id: 'sunset', name: 'sunrise-sunset.org' },
  { id: 'deck', name: 'Production deck' },
  { id: 'netlify', name: 'Netlify' },
];

export const HEALTH_STATUSES = ['checking', 'ok', 'degraded', 'down'];

export function normalizeHealthProviders(payload) {
  const byId = new Map(
    (Array.isArray(payload?.providers) ? payload.providers : []).map((provider) => [
      provider?.id,
      provider,
    ]),
  );
  return HEALTH_PROVIDER_ORDER.map(({ id, name }) => {
    const provider = byId.get(id);
    const status = HEALTH_STATUSES.includes(provider?.status) ? provider.status : 'down';
    return {
      id,
      name,
      status: provider ? status : 'down',
      httpStatus: Number.isFinite(provider?.httpStatus) ? provider.httpStatus : null,
      latencyMs: Number.isFinite(provider?.latencyMs) ? provider.latencyMs : null,
      checkedAt: typeof provider?.checkedAt === 'string' ? provider.checkedAt : null,
      detail: provider ? (provider.detail ?? null) : 'No result returned for this provider.',
    };
  });
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

export function healthErrorProviders(message) {
  return HEALTH_PROVIDER_ORDER.map(({ id, name }) => ({
    id,
    name,
    status: 'down',
    httpStatus: null,
    latencyMs: null,
    checkedAt: null,
    detail: message,
  }));
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
