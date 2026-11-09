# Developer tools

## DEV VIEW SWITCHER

`src/components/DevViewSwitcher.jsx` is a development-only role preview.

- **Build gate:** `StageDeck.jsx` renders it only when `import.meta.env.DEV` is
  true. Vite replaces that with `false` in production, so the module is
  tree-shaken out of the production bundle.
- **Viewport gate:** the switcher is `hidden` below 640px and only appears from
  the `sm` breakpoint. On a phone it must never cover the HOLD, Undo or Go-live
  stage controls.
- **Workflow:** to preview a role on a phone-sized layout, use a desktop or
  tablet browser with responsive devtools (≥640px CSS width) and run the dev
  server. Production and installed PWA builds do not include the switcher.

If a future dev flow needs the switcher on a phone, add an explicit `?dev=1`
opt-in instead of showing it by default.
