// Issue #1326: the four values required before a client template can be created.
// Shared by the admin editor and the Drive creation endpoint so the server and
// UI always report the same missing fields.

export const TEMPLATE_PREREQUISITES = Object.freeze([
  'bride_name',
  'groom_name',
  'venue_name',
  'venue_address',
]);

function present(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function templateReadiness(wedding = {}) {
  const missing = TEMPLATE_PREREQUISITES.filter((field) => !present(wedding?.[field]));
  return { ready: missing.length === 0, missing };
}
