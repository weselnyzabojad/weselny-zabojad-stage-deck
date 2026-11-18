# WordPress season stats embed

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
    style="display:block;width:100%;border:0;height:520px;"
  ></iframe>
</div>
<style>
  @media (min-width: 768px) {
    .wz-season-stats iframe { height: 360px; }
  }
</style>
```

The heights include the slim next-wedding strip. Without that strip, the widget
is shorter; keep the larger value unless you have verified the smaller one on
the target page.

| Layout | Recommended height | Without next-wedding strip |
| --- | --- | --- |
| Mobile (< 768px) | 520px | 440px |
| Desktop (≥ 768px) | 360px | 300px |

The widget itself is responsive: two KPI cards side by side on desktop and
stacked on mobile. Destination badges wrap inside the card. Do not set a fixed
pixel width on the wrapper. The strip and card labels change automatically
between before-season, live and after-season; no configuration is needed.

## Language

The default is Polish:

```text
https://deck.weselnyzabojad.pl/embed/season-stats?lang=pl
```

Use `?lang=fr` for French or `?lang=en` for English. The parameter applies to
the iframe only; it does not change the visitor's saved language for the rest
of the site.

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

## Security note

Only `/embed/*` responses can be framed, and only by `https://www.weselnyzabojad.pl`
and `https://weselnyzabojad.pl`. Every other route keeps
`frame-ancestors 'none'`. The policy is enforced by the Netlify
`Content-Security-Policy` header; there is no global `X-Frame-Options` header to
override. Do not add other domains or wildcards to the allowlist.

The embed exposes only the season aggregates and the next wedding's city,
country and month/year. It never returns couple names, the exact wedding day,
addresses, venue names, contacts or raw event data.
