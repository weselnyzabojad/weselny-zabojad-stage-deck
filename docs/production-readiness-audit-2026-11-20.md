# Production and webmaster readiness audit (2026-11-20)

Scope: the landing pre-release and the five main-site handoff issues (#892,
#1276, #1277, #1278, #1279). This audit separates **code readiness** from
**production state** and records what must be true before the webmaster starts.

## Snapshot

| Item | Value |
| --- | --- |
| `origin/development` | `f742cc3` |
| Netlify site | `universal-wedding-stage-deck` (`7e0ee50d-8f12-426e-ac79-51141fb34aed`) |
| Production URL | `https://deck.weselnyzabojad.pl` |
| Current production deploy | `6af60cd14998c3e401f8923e` — commit `b74bfe8`, branch `master`, 2026-11-12 |
| Netlify access control | SSO team login required for **all projects** → public URL returns **401** |
| `RELEASE_SURFACE` | not set → full app build (landing, deck, admin, embeds) |
| Supabase project | `qdcuxefperykmjlirufe` |
| Production DB migrations | 17 applied, last `fixed_search_path` |
| Production Edge Functions | 7 active; 5 expected functions missing |

## Code readiness

| Contract | Status | Evidence |
| --- | --- | --- |
| `/` accepts `?lang=pl|fr|en` | Ready | `resolveEntryLocale` + `main.jsx` |
| `/extra/banner` accepts `?lang` and browser fallback | Ready | `landing-main.jsx`, `bannerRoute.js` |
| `/embed/season-stats` accepts `?lang`, `theme`, fixed heights | Ready in code | `parseSeasonStatsEmbed`, `PublicSeasonStatsWidget` |
| `?lang` wins over stored locale, per-request on embeds | Ready | `localeContinuity.js`, widget route effect |
| Landing contact CTA preserves `prefill` and `#kontakt` | Ready | `buildContactHref` |
| CSP allows framing only by the two WordPress origins | Ready | `netlify.toml` `/extra/banner*`, `/embed/*` |
| CSP covers the trailing-slash banner route | **Fixed in this change** | `/extra/banner*` instead of exact path |
| Landing-banner health probe targets the deck host | **Fixed in this change** | `HEALTH_ENDPOINTS.landingBanner` |
| SPA fallback for `/extra/banner`, `/embed/*` | Ready | `public/_redirects` |
| PWA prompt suppressed on landing/banner/embed routes | Ready | `main.jsx` route guard |

## Production blockers (require owner GO)

1. **Netlify production deploy is stale.** Production is commit `b74bfe8`
   (2026-11-12, branch `master`), far behind `development` `f742cc3`.
2. **The deck is not public.** SSO team login is required for all projects, so
   `https://deck.weselnyzabojad.pl/` and every embed return **401**. The
   webmaster cannot validate anything until this is removed for production.
3. **Supabase DB is 21 migrations behind.** Missing from production:
   `remove_legacy_photo_role`, `dj_mc_role`, `admin_role_provisioning`,
   `vip_dj_registry`, `speech_bundle_backend`, `game_question_bundles`,
   `game_question_docs`, `speech_doc_folder_id`, `wedding_musicians`,
   `musician_role`, `retention_schedule`, `atomic_revisions`, `zaremba_vip`,
   `live_state_writes`, `musician_song_suggestions`, `wedding_recaps`,
   `stage_step_receipts`, `wedding_venue_location`, `season_event_facts`,
   `season_plan_rpc`, `season_compatibility`.
   Direct consequence: `get_public_season_stats` returns **404** and the season
   widget cannot load; `vip_djs` does not exist.
4. **Edge Functions are missing.** Not deployed: `game_bundle`,
   `public_vip_djs`, `recap`, `service_health`, `speech_bundle`. The seven
   deployed functions were last updated before the latest development work and
   must be redeployed from the release commit as well.
5. **Release packaging is not done.** `#1243` (landing notes and
   `landing-release-1` tag) is still open; the logo/KPI blockers recorded in
   `project.md` 17.127 must be confirmed as resolved.
6. **`ALLOWED_ORIGIN` for `public_vip_djs` cannot be verified from the repo.**
   The function rejects browser requests unless it matches the deck origin. It
   must be set before the partner strip can use the API instead of the bundled
   fallback.

## Webmaster issue readiness

| Issue | Deck side | Main-site side | Ready to send? |
| --- | --- | --- | --- |
| #1277 `?lang` | Ready | Every deck link/iframe must carry the active language | **Yes**, after production is public |
| #1279 season stats iframe | Code ready; DB/RPC missing | Insert at agreed page/section | **No**, until blocker 3 is fixed |
| #1276 landing iframe | Route ready; **height undefined** | Page, section and height not decided | **No** |
| #892 contact prefill | URL contract ready | Selector verified live: `#avia_6_1` / `textarea[name="avia_6_1"]`; no prefill script on www yet | **Yes**, after production is public |
| #1278 roles preview | Blocked by #1274 and #1275 | Services page embed | **No**, Release 1.2 only |

## Landing iframe height — decision required

`/extra/banner` renders the **full landing page**, not a compact banner. Measured
content heights (headless Chrome, PL, 2026-11-20):

| Viewport width | Landing content height |
| --- | --- |
| 1440 px | 4501 px |
| 1024 px | 4635 px |
| 768 px | 5271 px |
| 375 px | 6808 px |

A fixed-height iframe must therefore either be very tall or scroll internally.
No height is documented in the repository, and #1276 explicitly forbids
guessing. Before sending the landing-iframe task, the owner must choose:

- **Option A:** embed the full landing in a tall iframe and accept internal
  scrolling (needs an agreed viewport height, for example `100vh`).
- **Option B:** build a compact `/extra/banner` variant that fits a defined
  height (new deck-side work; current route is the full landing).
- **Option C:** do not embed the landing; link to the deck instead and keep only
  the season stats and contact prefill integrations.

## Preflight commands (run on the release commit)

```sh
git fetch origin --prune
git switch development
git pull --ff-only origin development
npm ci
npm run validate:env -- --allow-missing
npm run validate:i18n
npm run lint
npm test
npm run build
```

## Production preflight after GO

1. Apply the 21 missing migrations in repository order.
2. Redeploy all Edge Functions from the release commit; confirm
   `ALLOWED_ORIGIN=https://deck.weselnyzabojad.pl` for `public_vip_djs`.
3. Open a production PR from `development` to `master`, wait for CI, merge.
4. Confirm the Netlify production deploy succeeded.
5. Remove the SSO team-login requirement for production only.
6. Verify `https://deck.weselnyzabojad.pl/` and the three embed URLs return 200:
   - `/extra/banner?lang=pl`
   - `/embed/season-stats?lang=pl`
   - `/embed/season-stats?lang=fr`
7. Confirm `get_public_season_stats` returns JSON with the anon key.
8. Send the webmaster email only after steps 1–7 pass.
