# Landing pre-release 1 — public under-construction page and season statistics embed

Released: 2026-11-20

## Production

| Item | Value |
| --- | --- |
| Public URL | `https://deck.weselnyzabojad.pl/` |
| Production deploy | `6b0092bb901bfc8402e2e88c` |
| Production commit | `0b185c0cb13420941238813e6021174b1745d854` |
| Release surface | `RELEASE_SURFACE=public` |
| Access | Public production; Deploy Previews and branch deploys remain behind SSO |

## Shipped routes

| Route | Content |
| --- | --- |
| `/`, `/index.html` | “Bientôt disponible” page with shared public header and localized main-site CTA |
| `/embed/season-stats` | Public season statistics widget, PL/FR/EN, 240 px mobile / 160 px desktop |
| Every other route | Branded 404 (`/404.html`, HTTP 404) |

Not published: `/extra/banner`, the full landing, deck, admin, join, recap, song request, status and PWA.

## Season widget

- Production URL: `https://deck.weselnyzabojad.pl/embed/season-stats?lang=pl|fr`
- Empty state until the first wedding recap is published.
- CSP allows framing only from `https://www.weselnyzabojad.pl` and `https://weselnyzabojad.pl`.
- `/` keeps `frame-ancestors 'none'`.

## Database

Applied before deployment:

1. `202611160003_wedding_recaps`
2. `202611180001_wedding_venue_location`
3. `202611180002_season_event_facts`
4. `202611180003_season_plan_rpc`

`202611180004_season_compatibility` was intentionally not applied. `get_public_season_stats` returns HTTP 200 with the empty-season state.

## Validation

- `RELEASE_SURFACE=public npm run build`
- `npm run verify:public-build` — 16 files, no deck/admin/landing/PWA chunks
- `npm test` — 524 files / 2471 tests
- `npm run lint`
- Production smoke: `/` 200, `/embed/season-stats?lang=pl|fr` 200, `/extra/banner` 404
- CSP verified on `/embed/*` and `/`

## Webmaster follow-ups

- #1279 — season statistics iframe handoff sent; awaiting webmaster validation.
- #1276 — `/extra/banner` will not be embedded; closed as not planned.
- #1277 — `?lang` task superseded; the season embed carries `?lang`, and future deck links must do the same.

## Rollback

- Netlify: previous deploy `6af60cd14998c3e401f8923e` / `b74bfe8`; remove `RELEASE_SURFACE`.
- Access: restore SSO for all projects.
- Database: no automatic rollback; use the inverse schema plan for the four migrations after impact review.
- Webmaster: remove the season iframe if it was already inserted.
