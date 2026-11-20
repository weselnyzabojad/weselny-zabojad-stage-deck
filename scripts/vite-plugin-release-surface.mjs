import { copyFile, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Public release surfaces (issues #1152 and #1298).
//
// The full deck keeps its existing `index.html` -> `/src/main.jsx` entry and
// Netlify SPA redirects. A release surface uses its own HTML entry with the same
// head and a smaller module graph; this plugin then:
// 1. renames the emitted surface HTML entry to `index.html`;
// 2. copies the branded 404 page and its stylesheet into the artifact;
// 3. overwrites `_redirects` with the surface's allowlist, returning a real 404
//    for every other route.
//
// Swapping the script inside one HTML file at `transformIndexHtml` time does not
// work: Vite resolves HTML entries before that hook receives the final markup.
// Separate entry files with identical heads are the build-time equivalent.
const ROOT = fileURLToPath(new URL('..', import.meta.url))

export const LANDING_ENTRY_FILE = 'index.landing.html'
export const LANDING_ENTRY_SCRIPT = '/src/landing-main.jsx'
export const PUBLIC_ENTRY_FILE = 'index.public.html'
export const PUBLIC_ENTRY_SCRIPT = '/src/public-main.jsx'

const LANDING_404_HTML = path.join(ROOT, 'release/landing/404.html')
const LANDING_404_CSS = path.join(ROOT, 'release/landing/404.css')

export const LANDING_REDIRECTS = `# Landing-only release (RELEASE_SURFACE=landing).
# Existing files (hashed assets, 404.css, favicon) are served before these
# rules; every other route is a branded 404 with a real 404 status.
/index.html  /index.html  200
/            /index.html  200
/extra/banner  /index.html  200
/*           /404.html    404
`

export const PUBLIC_REDIRECTS = `# Public under-construction release (RELEASE_SURFACE=public).
# Only the placeholder and the season stats embed are public. Missing assets
# and every other route return the branded 404 with a real 404 status.
/assets/*                 /404.html    404
/index.html               /index.html  200
/                         /index.html  200
/embed/season-stats       /index.html  200
/embed/season-stats/      /index.html  200
/*                        /404.html    404
`

export function landingSurfacePlugin({
  landing = false,
  publicSurface = false,
} = {}) {
  let outDir = path.join(ROOT, 'dist')

  return {
    name: 'stage-deck-release-surface',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(ROOT, config.build.outDir)
    },
    async closeBundle() {
      if (!landing && !publicSurface) return
      const entryFile = publicSurface ? PUBLIC_ENTRY_FILE : LANDING_ENTRY_FILE
      const redirects = publicSurface ? PUBLIC_REDIRECTS : LANDING_REDIRECTS
      await mkdir(outDir, { recursive: true })
      await rename(
        path.join(outDir, entryFile),
        path.join(outDir, 'index.html'),
      )
      await Promise.all([
        copyFile(LANDING_404_HTML, path.join(outDir, '404.html')),
        copyFile(LANDING_404_CSS, path.join(outDir, '404.css')),
        writeFile(path.join(outDir, '_redirects'), redirects, 'utf8'),
        // Issue #1288: the Wedding Monitor PWA belongs to the full deck only.
        rm(path.join(outDir, 'status'), { recursive: true, force: true }),
        rm(path.join(outDir, 'status-bootstrap.js'), { force: true }),
      ])
    },
  }
}
