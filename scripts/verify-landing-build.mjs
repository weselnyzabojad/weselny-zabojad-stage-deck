import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

// Artifact check for the landing-only release (issue #1152).
//
// Run after `RELEASE_SURFACE=landing npm run build`. It fails when a deck,
// admin, song-request, recap or PWA-update chunk survived, when a service worker
// or web manifest was emitted, or when the strict landing redirects/404 are
// missing. It does not run a build itself.
const ROOT = process.cwd()
const DIST = path.join(ROOT, 'dist')

const FORBIDDEN_CHUNKS = [
  /(^|-)App-[^/]+\.js$/i,
  /AdminApp/i,
  /SongRequestApp/i,
  /WeddingRecapPage/i,
  /PwaUpdatePrompt/i,
]

const FORBIDDEN_FILES = [
  'sw.js',
  'manifest.webmanifest',
  'registerSW.js',
]

const REQUIRED_FILES = ['index.html', '404.html', '404.css', '_redirects']

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
  if (FORBIDDEN_CHUNKS.some((pattern) => pattern.test(base))) {
    errors.push(`Deck/admin/request/recap chunk emitted: ${file}`)
  }
}

for (const required of REQUIRED_FILES) {
  try {
    await stat(path.join(DIST, required))
  } catch {
    errors.push(`Missing landing artifact: ${required}`)
  }
}

const html = await readFile(path.join(DIST, 'index.html'), 'utf8').catch(() => '')
if (html.includes('/src/main.jsx') || html.includes('/src/landing-main.jsx')) {
  errors.push('index.html still references a source entry instead of the built bundle')
}
if (!html.includes('assets/')) errors.push('index.html does not reference built assets')

const redirects = await readFile(path.join(DIST, '_redirects'), 'utf8').catch(() => '')
if (redirects.includes('/*    /index.html    200')) {
  errors.push('SPA catch-all redirect survived in the landing-only artifact')
}
if (!redirects.includes('/*           /404.html    404')) {
  errors.push('Landing-only 404 catch-all is missing from _redirects')
}

if (errors.length > 0) {
  console.error('Landing-only artifact check failed:\n' + errors.map((e) => `- ${e}`).join('\n'))
  process.exit(1)
}

console.log(`Landing-only artifact OK (${files.length} files, no deck/admin/PWA chunks).`)
