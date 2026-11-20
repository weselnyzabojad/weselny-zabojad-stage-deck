# Landing Security claims — evidence map

Issue #1007. Every statement published in the landing Security section must map
to shipped code or configuration. Planned/unmerged work is not claimable.

## Verified claims

| Claim (public wording topic) | Evidence | Status |
| --- | --- | --- |
| Encrypted HTTPS/TLS transport | `netlify.toml` security headers; Netlify-managed TLS; `Strict-Transport-Security` | verified |
| HSTS with preload | `netlify.toml`: `max-age=63072000; includeSubDomains; preload` | verified |
| CSP and security headers | `netlify.toml`: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`, `Referrer-Policy`, COOP/CORP | verified |
| ES256 (ECDSA P-256) role JWTs | `supabase/functions/join_room/index.ts` — `importJWK(jwk, 'ES256')`, `signingAlg = 'ES256'`; no HS256 fallback | verified |
| PINs stored as bcrypt hashes | `supabase/functions/join_room/index.ts` — `bcrypt.compareSync(pin, …pin_hash)`; admin provisioning hashes PINs with bcrypt | verified |
| Failed-join throttling | `join_room/index.ts` — 5 failures per room/role/IP in a 15-minute window | verified |
| 24-hour role tokens | `join_room/index.ts` — `TOKEN_TTL_SECONDS = 24 * 60 * 60` | verified |
| TOTP/AAL2 admin | `supabase/functions/_shared/adminAuth.js` — requires `claims.aal === 'aal2'`; `admin_api` allowlist check | verified |
| Admin audit log | `admin_api` `admin_audit_log` inserts; migration `202611060001_owner_admin.sql` | verified |
| Postgres row-level security | `supabase/schema.sql` and `supabase/migrations/*` RLS policies; role/wedding scoping | verified |
| AES-256-GCM speech/game secrets | `supabase/functions/_shared/bundleCrypto.js`, `supabase/functions/_shared/speechSecrets.js`, `supabase/functions/_shared/speechBundle.js` | verified |
| HKDF-derived per-speech keys | `supabase/functions/_shared/bundleCrypto.js` — HKDF with per-bundle info; `speechBundle.js` | verified |
| Sentry PII disabled + masked text | `src/lib/sentry.js` — `sendDefaultPii: false`, `maskAllText`, `blockAllMedia` | verified |
| Error-only session replay | `src/lib/sentry.js` — `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1.0` | verified |
| Wedding TTL + scheduled purge | `schema.sql` / migrations — `expires_at` default 30 days, `stage_deck_purge_expired()`; daily schedule via `pg_cron` when available | verified with deployment caveat |
| Private wedding data not public | Role JWTs + RLS + service-role-only admin data; no public storage bucket for wedding content | verified (architecture; deployment configuration must stay correct) |
| Landing privacy card and FAQ | Role-scoped JWTs + RLS; retention schedule via `expires_at` and `stage_deck_purge_expired()`; see deployment caveat above | verified with deployment caveat |
| Weselny Żabojad standards + wedding-sector provider consultation | Owner process statement; not inferable from source code | process statement (owner-confirmed) |

## Deployment caveat

The purge function exists and defaults to a 30-day expiry. The daily `pg_cron`
schedule is documented in `schema.sql` but must be enabled in the deployed
project. The landing copy may say data is removed on a schedule, not that every
environment is guaranteed to have the scheduler active.

## Do not publish

- “Certified”, “GDPR/RODO compliant”, “audited” or any certification claim.
- “Unhackable”, “zero risk”, “100% secure” or absolute guarantees.
- Claims about open issues or unmerged features.
- Vendor implementation deep-dives beyond the protocol names used on the page.

## Review rule

When landing Security copy changes, update this table in the same PR. A claim
with no evidence row must be removed or softened before merge.
