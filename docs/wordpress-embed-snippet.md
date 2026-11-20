# WordPress season stats embed

The public season widget is the React iframe served by Stage Deck at
`https://deck.weselnyzabojad.pl/embed/season-stats`. WordPress only inserts the
iframe; it does not rebuild or duplicate any KPI logic. There is no wp-admin KPI
block, no separate KPI page and no plan to remove `/embed/season-stats`.

Copy this snippet into a **Custom HTML** block (Gutenberg) or an **HTML**
widget (Elementor) on the WordPress page where the season stats should appear.

## Responsive iframe

```html
<div class="wz-season-stats" style="position:relative;width:100%;max-width:1100px;margin:0 auto;">
  <iframe
    src="https://deck.weselnyzabojad.pl/embed/season-stats?lang=pl"
    title="Statistiques de saison — Weselny Żabojad"
    loading="lazy"
    referrerpolicy="strict-origin-when-cross-origin"
    style="display:block;width:100%;border:0;height:240px;"
  ></iframe>
</div>
<style>
  @media (min-width: 768px) {
    .wz-season-stats iframe { height: 160px; }
  }
</style>
```

The heights include the slim next-wedding strip. Without that strip, the widget
is shorter; keep the larger value unless you have verified the smaller one on
the target page.

| Layout | Recommended height | Without next-wedding strip |
| --- | --- | --- |
| Mobile (< 768px) | 240px | 200px |
| Desktop (≥ 768px) | 160px | 130px |

The widget itself is responsive: two KPI cards side by side on desktop and
stacked on mobile. Destination badges wrap inside the card. Do not set a fixed
pixel width on the wrapper. The strip and card labels change automatically
between before-season, live and after-season; no configuration is needed.

## What the card shows

| Element | Before season (`pre`) | Live (`live`) | After season (`post`) |
| --- | --- | --- | --- |
| Guests KPI | Planned guests for the season | Completed vs planned weddings, progress bar | Final guest total for the season |
| Destinations KPI | Planned countries | Completed/planned per country | Visited countries |
| Header strip | Next wedding city and month | Next wedding city and month | Next season, or a thank-you line |
| State badge | Season year | Pulsing live dot | Closed season year |

- Both KPIs are real aggregates; when no data exists yet the widget shows its
  calm empty state instead of fake zeros.
- Country flags are inline SVG and render offline; each badge carries its own
  per-country count.
- The next-wedding strip (city, country, month/year) is rendered **inside the
  iframe** from the RPC `nextWedding` field, not by WordPress.
- The data comes from the public `get_public_season_stats` RPC and its
  `seasonPlan` aggregate. It exposes only counts, country codes and the next
  wedding's city/country/month — never names, exact dates, addresses, venue
  names, contacts or raw event rows.

## Language

The default is Polish:

```text
https://deck.weselnyzabojad.pl/embed/season-stats?lang=pl
```

Use `?lang=fr` for French or `?lang=en` for English. Load priority is:

1. a valid `?lang=` query parameter;
2. the visitor's stored locale in the iframe origin;
3. Polish.

The widget also has an inline PL / FR / EN switcher. A switch made inside the
widget is persisted on the Stage Deck origin, exactly like the app's language
choice, so the next iframe load reuses it. The `?lang` parameter itself is not
written to the parent WordPress site.

## Contact CTAs

The two contact CTAs are unchanged and remain inside the iframe:

```text
https://www.weselnyzabojad.pl/?prefill=...#kontakt
```

They open in a new tab; WordPress does not need to add or intercept anything.
The `prefill` value is a localized sentence produced by Stage Deck.

## Transparent theme

The iframe is transparent by default, so it blends into the WordPress section.
`?theme=transparent` remains available as an explicit value. Use `?theme=cream`
for the very soft cream surface (`#FAF8F5`):

```text
https://deck.weselnyzabojad.pl/embed/season-stats?lang=fr&theme=cream
```

Keep the recommended heights with either theme.

## Troubleshooting

- **Blank or blocked iframe:** confirm the embed URL is
  `https://deck.weselnyzabojad.pl/embed/season-stats` and that the page is served
  from `https://www.weselnyzabojad.pl` or `https://weselnyzabojad.pl`.
- **Old layout after an update:** clear the WordPress/page cache and the browser
  cache; the iframe is cached like any other page.
- **Clipped cards:** increase the iframe height using the table above, especially
  on narrow phones.
- **No data yet:** the widget shows its calm empty state until the first recap is
  published. It never shows fake zeros.

## Preview mode is not a production feature

`?previewState=pre|live|post` exists only for development and visual recette. The
preview code is dropped from production builds unless
`VITE_EMBED_PREVIEW=1` is set at build time, and the parameter is ignored in
production. Do not use it in the WordPress snippet.

## Visual QA reference

The compact layout, measured heights and the PL/FR/EN switcher were visually
verified in [PR #1249](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/pull/1249).
Widget implementation references: #1245 (RPC `seasonPlan`), #1246 (two KPIs,
flags, states), #1248 (compact card and persisted switcher).

The landing header logo is a separate landing blocker; it does not block this
iframe or the WordPress handoff.

## Security note

Only `/embed/*` responses can be framed, and only by `https://www.weselnyzabojad.pl`
and `https://weselnyzabojad.pl`. Every other route keeps
`frame-ancestors 'none'`. The policy is enforced by the Netlify
`Content-Security-Policy` header; there is no global `X-Frame-Options` header to
override. Do not add other domains or wildcards to the allowlist.

The embed exposes only the season aggregates and the next wedding's city,
country and month/year. It never returns couple names, the exact wedding day,
addresses, venue names, contacts or raw event data.
