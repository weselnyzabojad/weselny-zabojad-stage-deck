# Developer tools

## DEV VIEW SWITCHER

`src/components/DevViewSwitcher.jsx` is a development-only role preview.

- **Build gate:** `StageDeck.jsx` renders it only when `import.meta.env.DEV` is
  true. Vite replaces that with `false` in production, so the module is
  tree-shaken out of the production bundle.
- **Collapsed by default:** only a small `DEV` chip is visible on every viewport.
  Clicking it opens the role/step panel; clicking again, pressing Escape or
  clicking outside closes it and returns focus to the chip. The state is not
  persisted, so a reload starts collapsed again.
- **Viewport placement:** the chip sits at the top-left on phones and bottom-left
  from the `sm` breakpoint, so it does not cover the HOLD, Undo or Go-live
  controls. The open panel is capped at `45dvh` and scrolls internally.
- **Role coverage:** the switcher exposes every stage view, including MC, DJ
  Standard/VIP identities, DJ + MC, Photographer 1/2, Cameraman, Venue Manager,
  Musician, Speaker and the Song Request preview.
- **Workflow:** use a desktop, tablet or phone browser with `?dev=1` and run the
  dev server. Production and installed PWA builds do not include the switcher.

Opening the chip is an explicit `?dev=1` development action; there is no
production exposure.

## STEP PREVIEW (`?dev=1`)

`?dev=1` enables the temporary step inspector for local review:

- The switcher opens from the collapsed `DEV` chip, stays within `45dvh`, and
  scrolls internally when needed.
- The step section lists every enabled step in the current order. Use the
  picker or the previous/next buttons to jump directly to a step.
- The preview state is in memory only: it never creates a Supabase client, never
  publishes or subscribes, and never writes the persisted
  `wzsd:v1:<weddingId>:live_sync_state` entry. A reload discards the preview.
- The preview is dev-only and must be removed or disabled with the rest of the
  dev switcher before it can affect a production bundle.
