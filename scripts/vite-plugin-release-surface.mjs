import { copyFile, mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Landing-only release surface (issue #1152).
//
// The full deck keeps its existing `index.html` -> `/src/main.jsx` entry and
// Netlify SPA redirects. In landing mode the build uses a second HTML entry
// (`index.landing.html`, same head, landing entry) so Vite itself resolves the
// landing module graph; this plugin then:
// 1. renames the emitted `index.landing.html` to `index.html`;
// 2. copies the branded 404 page and its stylesheet into the artifact;
// 3. overwrites `_redirects` so only `/` and `/index.html` serve the landing
//    document and every other route returns that 404 page with HTTP 404.
//
// Swapping the script inside one HTML file at `transformIndexHtml` time does not
// work: Vite resolves HTML entries before that hook receives the final markup.
// Two entry files with identical heads are the build-time equivalent.
const ROOT = fileURLToPath(new URL('..', import.meta.url))

export const LANDING_ENTRY_FILE = 'index.landing.html'
export const LANDING_ENTRY_SCRIPT = '/src/landing-main.jsx'

const LANDING_404_HTML = path.join(ROOT, 'release/landing/404.html')
const LANDING_404_CSS = path.join(ROOT, 'release/landing/404.css')

export const LANDING_REDIRECTS = `# Landing-only release (RELEASE_SURFACE=landing).
# Existing files (hashed assets, 404.css, favicon) are served before these
# rules; every other route is a branded 404 with a real 404 status.
/index.html  /index.html  200
/            /index.html  200
/*           /404.html    404
`

export function landingSurfacePlugin({ landing = false } = {}) {
  let outDir = path.join(ROOT, 'dist')

  return {
    name: 'stage-deck-release-surface',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(ROOT, config.build.outDir)
    },
    async closeBundle() {
      if (!landing) return
      await mkdir(outDir, { recursive: true })
      await rename(
        path.join(outDir, LANDING_ENTRY_FILE),
        path.join(outDir, 'index.html'),
      )
      await Promise.all([
        copyFile(LANDING_404_HTML, path.join(outDir, '404.html')),
        copyFile(LANDING_404_CSS, path.join(outDir, '404.css')),
        writeFile(path.join(outDir, '_redirects'), LANDING_REDIRECTS, 'utf8'),
      ])
    },
  }
}
