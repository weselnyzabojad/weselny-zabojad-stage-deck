# Build-time dependency risk: PWA toolchain

Status: **accepted, documented** (2026-11-13). Tracking issue:
[#854](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/854).

## Finding

`npm audit` reports:

```text
2 low, 4 moderate, 0 high, 0 critical
```

The findings are in the PWA build chain:

- `vite-plugin-pwa@2.0.0`
- `workbox-build@7.4.1`
- `glob@11.1.0`
- `minimatch@10.2.6`
- `deepmerge@4.3.1` via `@rollup/plugin-node-resolve`

## Why it is accepted for this release

- These packages run during the build to generate the service worker and
  precache manifest; they are not shipped to the browser.
- The reported issues are build-time prototype poisoning or denial-of-service
  classes, not remote runtime code execution in the deck.
- `vite-plugin-pwa@2.0.0` is the current published version. `npm audit`'s
  suggested fix (`1.1.0`) is a downgrade and is not compatible with the
  current Vite 8 setup.

## Review trigger

Re-run `npm audit` and upgrade when a fixed `vite-plugin-pwa` / Workbox release
is available. Do not downgrade to `1.1.0`. Re-check the generated `sw.js` and
offline precache after any upgrade.

## Validation expected with the upgrade

```sh
npm ci
npm audit
npm test
npm run build
```

Confirm the PWA install, precache and deferred update flow still work.
