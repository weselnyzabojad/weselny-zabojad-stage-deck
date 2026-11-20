# Admin live Supabase smoke test (#533)

Status: **passed**
Date: 2026-11-13
Repository: `development` @ `344173b`
Supabase project: `qdcuxefperykmjlirufe`
Environment: production Supabase project, production Edge Function secrets

## Method

A temporary Supabase Auth admin was created with a temporary TOTP factor,
added to `app_admins`, and used for the AAL2 checks. The temporary user and all
test rows were deleted afterwards. No password, TOTP secret, PIN, service-role
key or private URL is recorded here.

Deployed functions under test:

| Function | Version | Verify JWT |
| --- | --- | --- |
| `admin_api` | 9 | yes |
| `admin_drive` | 7 | yes |
| `join_room` | 9 | yes |
| `submit_song_request` | 7 | yes |
| `get_song_request_status` | 7 | yes |
| `reveal_speech_key` | 10 | no (function verifies the role JWT itself) |

## Results

| # | Step | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Sign in at `/admin` | PASS | Password sign-in returned 200 |
| 2 | MFA state + TOTP challenge | PASS | TOTP enrollment, challenge and verify returned 200; AAL2 session issued |
| 3 | Load wedding library/open one wedding | PASS | `admin_api` `list` returned 200; test wedding loaded |
| 4 | Publish a cartridge revision | PASS | `admin_api` `publish` returned revision 1 |
| 5 | Confirm audit entry and revision | PASS | Audit contained the publish and rotation entries; revision number 1 |
| 6 | QR cards + join with 6-digit PIN | PASS | QR data URL generated for a role link; `join_room` returned a role token for the rotated PIN |
| 7 | Correct view + live-state sync | PASS | Role token read/write to `live_sync_state` passed RLS; correct `wzsd:` room key |
| 8 | Rotate PIN; old PIN fails | PASS | Old PIN 401, new PIN 200 |
| 9 | Revoke device session + presence | PASS | `revoke_session` 200; revoked speaker token 401; presence `offline` and session cleared |
| 10 | Archive test wedding; non-joinable | PASS | `archive` 200; join returned 410 |
| 11 | Deactivate provider; revoke access | PASS | `deactivate_provider` 200; linked DJ PIN returned 401 |
| 12 | Browser console and Edge Function logs | PASS (server) | No function error/exception entries in the live log query; browser visual check is in the production release checklist |

Additional checks:

- `admin_drive` CORS preflight: 200.
- `admin_drive` AAL2 `status`: `ok: true`, `configured: true`.
- `admin_drive` AAL2 `list`: 10 shared source files.
- `admin_drive` AAL2 `check` on the first Google Doc: 200.
- `reveal_speech_key`: returned a derived key.
- `PUBLIC_DECK_URL`: `https://deck.weselnyzabojad.pl`.

## Defects found and fixed

1. Role tokens were rejected by PostgREST after the project migrated to JWT
   Signing Keys. Fixed by importing/rotating an HS256 shared-secret signing key
   and adding its `kid` to `join_room` tokens (#843).
2. `reveal_speech_key` was deployed with platform JWT verification enabled; it
   already verifies the role JWT itself. Fixed by deploying with
   `--no-verify-jwt` and documenting it (#842).
3. Google Drive API was disabled in project `deck-513921`; enabling it restored
   `admin_drive` list/check (#736).

## Cleanup

All temporary test users, weddings, roles, sessions, presence rows, live-state
rows, join attempts and audit entries were deleted. Post-test counts were zero.

## Residual check

The production release checklist still includes a final visual pass of the
admin QR cards and browser console on the deployed production URL.
