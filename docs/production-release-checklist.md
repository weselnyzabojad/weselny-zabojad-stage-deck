# Production release checklist

Status: **prepared only — do not execute until the owner gives an explicit GO.**
Prepared 2026-11-13 against `development` at `fbaaa09`.

## 1. Release decision gates

| Gate | Owner | Current state | Required before GO |
| --- | --- | --- | --- |
| #80 P0 MC cues | Product/owner | Resolution needed: later Notes decision (#774/#776) supersedes legacy `mcCues` rendering | Close as superseded or re-scope |
| #533 live admin smoke test | Owner | Not executed; needs owner TOTP/session | 12-step pass/fail recorded |
| #736 `admin_drive` verify | Owner | Function ACTIVE v2; AAL2/Drive check pending | `configured: true` + Drive panel check |
| #760 Supabase secrets | Owner | Names not confirmed | All required names set and verified |
| #792 zero-warning gate | Owner | 36 pre-existing lint warnings; build chunk advisory | Hard gate decision: fix now or defer |
| Netlify public access | Owner | `deck.weselnyzabojad.pl` returns **401 Edge Access** | Project visibility set to Public |
| `search_song_metadata` deploy | Owner | Code merged, function not deployed | Deploy + live lookup smoke |
| PR #815 Sentry DSN | Owner | Open, CI green | Merge or defer |

## 2. Freeze and pre-flight

Do not merge unrelated changes during the release window.

```sh
git fetch origin --prune
git switch development
git pull --ff-only origin development
npm ci
npm run validate:env -- --allow-missing
npm run lint
npm test
npm run build
```

Also confirm the latest `development` CI run is green.

## 3. Netlify configuration

Verify in the Netlify dashboard (or authenticated Netlify MCP):

- [ ] Production branch is confirmed.
- [ ] **Project visibility is Public** (or production is excluded from preview-only protection).
- [ ] `VITE_SUPABASE_URL` is set.
- [ ] `VITE_SUPABASE_ANON_KEY` is set (public anon/publishable key only).
- [ ] `VITE_DECK_MODE=production`.
- [ ] Optional Sentry build variables are set only if sourcemap upload is wanted:
      `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
- [ ] No server secret is stored behind a `VITE_*` name.
- [ ] `https://deck.weselnyzabojad.pl/` returns 200, not a Netlify login redirect.
- [ ] A deploy preview loads `/`, `/join`, `/admin` and `/request/:code` without console errors.

## 4. Supabase configuration

Verify names only; never paste values into GitHub.

- [ ] Migrations are applied.
- [ ] Active functions include `admin_api`, `admin_drive`, `join_room`,
      `submit_song_request`, `get_song_request_status`, `reveal_speech_key`
      and `search_song_metadata`.
- [ ] Secrets exist:
      `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
      `DECK_SUPABASE_JWT_SECRET`, `PUBLIC_DECK_URL`, `ALLOWED_ORIGIN`,
      `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`,
      `SPEECH_SECRET_MASTER_KEY`.
- [ ] `PUBLIC_DECK_URL=https://deck.weselnyzabojad.pl`.
- [ ] `ALLOWED_ORIGIN` matches the confirmed admin origin.
- [ ] Owner account exists in `app_admins`, has TOTP enabled and self-signup is disabled.
- [ ] `join_room` issues a role token.
- [ ] `admin_drive` AAL2 `status` returns `configured: true`.
- [ ] Speech-secret access works.
- [ ] `search_song_metadata` returns advisory suggestions and fails open.

## 5. Release sequence (only after GO)

1. Freeze merges and record the release commit.
2. Open/approve the production PR from `development` to the confirmed production branch.
3. Wait for CI green.
4. Merge the production PR.
5. Confirm the Netlify production deploy succeeds and is public.
6. Verify `/`, `/join`, `/admin` and `/request/:code`.
7. Run the #533 owner smoke test against production.
8. Verify PWA install/update, offline load and service worker precache.
9. Record the deploy ID, commit SHA, date and pass/fail per check.

## 6. Production smoke checks

- [ ] Landing page loads over HTTPS without the Netlify access gate.
- [ ] Landing CTA reaches `https://www.weselnyzabojad.pl/#kontakt`.
- [ ] `/join` reaches the crew entry.
- [ ] A QR role link opens the expected view.
- [ ] Admin sign-in + TOTP works.
- [ ] Drive source list, preview and publication work.
- [ ] PIN rotation invalidates the old PIN.
- [ ] Device revoke updates presence.
- [ ] Wedding archive blocks joining; test data is cleaned up.
- [ ] Guest song request submits, and advisory suggestions never block send.
- [ ] Browser console and Supabase function logs show no errors or leaked secrets.
- [ ] No `.map` files are served from production.
- [ ] PWA offline reload works after the first successful load.

## 7. Rollback

- **Netlify:** roll back to the previous successful production deploy.
- **Supabase functions:** redeploy the previous known-good commit.
- **Database:** do not roll back automatically; restore from a verified snapshot only after impact review.
- **Release PR:** revert the production merge if the app must return to the previous commit.
- Record the rollback reason and the restored deploy/commit.

## 8. Sign-off

| Item | Value |
| --- | --- |
| Release commit | |
| Production branch | |
| Netlify deploy ID | |
| Supabase project | `qdcuxefperykmjlirufe` |
| Owner GO | ☐ |
| Smoke test owner | |
| Date | |

**Do not execute sections 5–6 until every gate in section 1 is closed and the owner records GO here.**
