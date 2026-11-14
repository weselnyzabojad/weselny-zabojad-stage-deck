// Shared CORS policy for the Edge Functions.
//
// `ALLOWED_ORIGIN` is a comma-separated list of exact origins, for example:
//   https://deck.weselnyzabojad.pl,http://localhost:5173
// An empty list keeps the historical behaviour: browser requests without an
// Origin header are allowed, but no browser origin is.
//
// Responses must echo the matched request origin rather than the configured
// value, otherwise multi-origin allowlists cannot work.

export function parseAllowedOrigins(value) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

// Returns:
// - '' when the request has no Origin (same-origin or non-browser caller),
// - the matched origin when it is allowed,
// - null when an Origin is present but not allowed.
export function matchingOrigin(req, configured) {
  const origin = req.headers.get('origin') ?? '';
  if (!origin) return '';
  return parseAllowedOrigins(configured).includes(origin) ? origin : null;
}

export function isOriginAllowed(req, configured = readEnv('ALLOWED_ORIGIN')) {
  return matchingOrigin(req, configured) !== null;
}

// Adds the CORS headers to a response after the function has produced it. This
// keeps every existing `json(...)` call site unchanged while still allowing the
// configured list to contain several origins.
export function withCors(req, response, configured = readEnv('ALLOWED_ORIGIN')) {
  const origin = matchingOrigin(req, configured);
  const headers = new Headers(response.headers);
  headers.set('Vary', 'Origin');
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set(
      'Access-Control-Allow-Headers',
      'authorization, x-client-info, apikey, content-type',
    );
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function readEnv(name) {
  try {
    return Deno.env.get(name) ?? '';
  } catch {
    return '';
  }
}
