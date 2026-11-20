import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

// Artifact check for the public under-construction release (issue #1298).
//
// Run after `RELEASE_SURFACE=public npm run build`. It fails when a deck, admin,
// landing, recap, request or PWA chunk survived, when a service worker or
// manifest was emitted, or when the public route allowlist is missing.
const ROOT = process.cwd()
const DIST = path.join(ROOT, 'dist')

const FORBIDDEN_CHUNKS = [
  /(^|-)App-[^/]+\.js$/i,
  /AdminApp/i,
  /SongRequestApp/i,
  /WeddingRecapPage/i,
  /PwaUpdatePrompt/i,
  /LandingPage/i,
]

const FORBIDDEN_FILES = ['sw.js', 'manifest.webmanifest', 'registerSW.js']

const REQUIRED_FILES = [
  'index.html',
  '404.html',
  '404.css',
  '_redirects',
  'embed/season-stats.html',
]

async function listFiles(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...(await listFiles(path.join(dir, entry.name), rel)))
    else files.push(rel)
  }
  return files
}

const files = await listFiles(DIST)
const errors = []

for (const file of files) {
  const base = path.basename(file)
  if (FORBIDDEN_FILES.includes(base)) errors.push(`PWA artifact emitted: ${file}`)
  if (base === 'status-bootstrap.js' || file.startsWith('status/')) {
    errors.push(`Monitor PWA artifact emitted: ${file}`)
  }
  if (FORBIDDEN_CHUNKS.some((pattern) => pattern.test(base))) {
    errors.push(`Deck/admin/landing/request/recap chunk emitted: ${file}`)
  }
}

for (const required of REQUIRED_FILES) {
  try {
    await stat(path.join(DIST, required))
  } catch {
    errors.push(`Missing public artifact: ${required}`)
  }
}

const html = await readFile(path.join(DIST, 'index.html'), 'utf8').catch(() => '')
if (html.includes('/src/main.jsx') || html.includes('/src/landing-main.jsx') || html.includes('/src/public-main.jsx')) {
  errors.push('index.html still references a source entry instead of the built bundle')
}
if (!html.includes('assets/')) errors.push('index.html does not reference built assets')

const redirects = await readFile(path.join(DIST, '_redirects'), 'utf8').catch(() => '')
if (!redirects.includes('/embed/season-stats             /embed/season-stats.html  200')) {
  errors.push('Season stats route is missing from _redirects')
}
if (!redirects.includes('/embed/season-stats/            /embed/season-stats.html  200')) {
  errors.push('Season stats trailing-slash route is missing from _redirects')
}
if (redirects.includes('/extra/banner')) {
  errors.push('/extra/banner must not be public in this surface')
}
if (redirects.includes('/*    /index.html    200')) {
  errors.push('SPA catch-all redirect survived in the public artifact')
}
if (!redirects.includes('/*                              /404.html                    404')) {
  errors.push('Public 404 catch-all is missing from _redirects')
}

if (errors.length > 0) {
  console.error('Public artifact check failed:\n' + errors.map((e) => `- ${e}`).join('\n'))
  process.exit(1)
}

console.log(`Public artifact OK (${files.length} files, no deck/admin/landing/PWA chunks).`)
