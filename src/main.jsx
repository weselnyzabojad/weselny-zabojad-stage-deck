/* eslint-disable react/only-export-components -- entry module: it renders the root and is not a hot-reload boundary */
import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import PwaUpdatePrompt from './components/PwaUpdatePrompt.jsx'
import { ADMIN_PATH, isAdminPath, isLegacyAdminPath } from './admin/adminUtils.js'
import { isStatusPath } from './lib/monitorPwa.js'
import { parseSongRequestPath } from './lib/songRequests.js'
import {
  detectBannerLocale,
  isBannerPath,
  isLandingPath,
  parseRecapToken,
  parseSeasonStatsEmbed,
} from './lib/publicRoutes.js'
import { loadLocale, setLocale } from './i18n/index.js'
import { initSentry } from './lib/sentry.js'
import { resolveEntryLocale } from './lib/localeContinuity.js'

initSentry()

// `/admin` is the owner-only surface. The legacy `/deck/admin` path redirects.
const App = lazy(() => import('./App.jsx'))
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const SongRequestApp = lazy(() => import('./components/SongRequestApp.jsx'))
const WeddingRecapPage = lazy(() => import('./components/WeddingRecapPage.jsx'))
// Public marketing landing; kept in its own chunk so the deck entry stays lean.
const LandingPage = lazy(() => import('./components/LandingPage.jsx'))
const PublicSeasonStatsWidget = lazy(() =>
  import('./components/PublicSeasonStatsWidget.jsx'),
)
const IS_LANDING =
  typeof window !== 'undefined' && isLandingPath(window.location.pathname)
// WordPress may embed the landing at `/extra/banner` (issue #1239).
const IS_BANNER =
  typeof window !== 'undefined' &&
  isBannerPath(window.location.pathname, import.meta.env.BASE_URL)
const LOCALE_SEARCH =
  typeof window !== 'undefined' ? window.location.search : ''
const STORED_LOCALE = loadLocale()
// The landing and the WordPress banner accept `?lang=fr|pl|en`; the URL wins
// over the stored choice. The landing defaults to Polish, the banner keeps its
// browser-language detection with a French fallback.
if (IS_LANDING) {
  setLocale(
    resolveEntryLocale({
      search: LOCALE_SEARCH,
      stored: STORED_LOCALE,
      fallback: 'pl',
    }),
  )
}
if (IS_BANNER) {
  setLocale(
    resolveEntryLocale({
      search: LOCALE_SEARCH,
      stored: STORED_LOCALE,
      fallback: detectBannerLocale(
        typeof navigator === 'undefined' ? [] : navigator.languages,
      ),
    }),
  )
}
// The embed owns its language per request and must never persist it.
const EMBED_ROUTE =
  typeof window !== 'undefined'
    ? parseSeasonStatsEmbed(
        window.location.pathname,
        window.location.search,
        import.meta.env.BASE_URL,
      )
    : null
if (EMBED_ROUTE) {
  setLocale(
    resolveEntryLocale({
      search: LOCALE_SEARCH,
      stored: STORED_LOCALE,
      fallback: 'pl',
    }),
    { persist: false },
  )
}
const LEGACY_ADMIN =
  typeof window !== 'undefined' && isLegacyAdminPath(window.location.pathname)
if (LEGACY_ADMIN) {
  window.location.replace(
    `${ADMIN_PATH}${window.location.search}${window.location.hash}`,
  )
}
const IS_ADMIN =
  typeof window !== 'undefined' && isAdminPath(window.location.pathname)
// `/status` is the installable Wedding Monitor PWA (issue #1288). It reuses the
// owner auth/MFA gate and monitoring strip but never renders the admin tabs.
const IS_STATUS =
  typeof window !== 'undefined' && isStatusPath(window.location.pathname)
const SONG_REQUEST_ROUTE =
  typeof window !== 'undefined'
    ? parseSongRequestPath(window.location.pathname, window.location.search, import.meta.env.BASE_URL)
    : null
const RECAP_TOKEN =
  typeof window !== 'undefined'
    ? parseRecapToken(window.location.pathname, import.meta.env.BASE_URL)
    : null

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary scope="app">
      {LEGACY_ADMIN ? (
        <div className="flex min-h-screen items-center justify-center bg-page px-4 text-center text-ink">
          <div className="max-w-md rounded-2xl border border-line bg-card p-6">
            <h1 className="font-heading text-lg font-bold text-ink">Admin moved</h1>
            <p className="mt-2 text-sm text-muted">
              The owner admin panel is now available at <strong className="text-ink">/admin</strong>.
            </p>
          </div>
        </div>
      ) : EMBED_ROUTE ? (
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-50/60">
              Loading season statistics…
            </div>
          }
        >
          <PublicSeasonStatsWidget route={EMBED_ROUTE} />
        </Suspense>
      ) : IS_LANDING || IS_BANNER ? (
        <Suspense
          fallback={
            <div
              className="flex min-h-screen items-center justify-center bg-page text-sm text-muted"
              aria-busy="true"
            >
              Loading…
            </div>
          }
        >
          <LandingPage />
        </Suspense>
      ) : SONG_REQUEST_ROUTE ? (
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-page text-sm text-muted">
              Loading song request…
            </div>
          }
        >
          <SongRequestApp roomCode={SONG_REQUEST_ROUTE.roomCode} />
        </Suspense>
      ) : RECAP_TOKEN ? (
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-page text-sm text-muted">
              Loading recap…
            </div>
          }
        >
          <WeddingRecapPage token={RECAP_TOKEN} />
        </Suspense>
      ) : IS_ADMIN || IS_STATUS ? (
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-page text-sm text-muted">
              Loading owner admin…
            </div>
          }
        >
          <AdminApp statusMode={IS_STATUS} />
        </Suspense>
      ) : (
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-page text-sm text-muted">
              Loading stage deck…
            </div>
          }
        >
          <App />
        </Suspense>
      )}
    </AppErrorBoundary>
    {IS_LANDING || IS_BANNER || RECAP_TOKEN || EMBED_ROUTE || IS_STATUS ? null : <PwaUpdatePrompt />}
  </StrictMode>,
)
