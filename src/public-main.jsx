/* eslint-disable react/only-export-components -- entry module: it renders the root and is not a hot-reload boundary */
import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import { loadLocale, setLocale } from './i18n/index.js'
import { initSentry } from './lib/sentry.js'
import { resolveEntryLocale } from './lib/localeContinuity.js'
import { resolvePublicRoute } from './lib/publicRelease.js'

// Public under-construction surface (issue #1298).
//
// Only two routes exist here: `/` renders the reusable placeholder, and
// `/embed/season-stats` renders the public seasonal widget. Netlify serves a
// real 404 for every other path, so this entry never imports the deck, admin,
// recap, song-request or PWA-update modules.
initSentry()

const ComingSoonPage = lazy(() => import('./components/ComingSoonPage.jsx'))
const PublicSeasonStatsWidget = lazy(() =>
  import('./components/PublicSeasonStatsWidget.jsx'),
)

const ROUTE =
  typeof window !== 'undefined'
    ? resolvePublicRoute(
        window.location.pathname,
        window.location.search,
        import.meta.env.BASE_URL,
      )
    : { kind: 'home' }

const isEmbed = ROUTE.kind === 'embed'

if (typeof window !== 'undefined') {
  setLocale(
    resolveEntryLocale({
      search: window.location.search,
      stored: loadLocale(),
      fallback: 'pl',
    }),
    isEmbed ? { persist: false } : undefined,
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary scope="app">
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
        {isEmbed ? (
          <PublicSeasonStatsWidget route={ROUTE.embed} />
        ) : ROUTE.kind === 'home' ? (
          <ComingSoonPage />
        ) : null}
      </Suspense>
    </AppErrorBoundary>
  </StrictMode>,
)
