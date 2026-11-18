/* eslint-disable react/only-export-components -- entry module: it renders the root and is not a hot-reload boundary */
import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import { loadLocale, setLocale } from './i18n/index.js'
import { initSentry } from './lib/sentry.js'
import { detectBannerLocale, isBannerPath } from './lib/bannerRoute.js'

// Landing-only release entry (RELEASE_SURFACE=landing, issue #1152).
//
// This module is the only entry point in that build: it must never import the
// deck, owner admin, song request, recap or PWA-update modules, so their chunks
// are absent from the artifact. The landing is Polish-first; an existing device
// choice still wins, matching the full app entry. The WordPress iframe at
// `/extra/banner` follows the browser language with a French fallback (issue
// #1239).
initSentry()

const LandingPage = lazy(() => import('./components/LandingPage.jsx'))

if (!loadLocale()) {
  const banner =
    typeof window !== 'undefined' &&
    isBannerPath(window.location.pathname, import.meta.env.BASE_URL)
  setLocale(
    banner
      ? detectBannerLocale(
          typeof navigator === 'undefined' ? [] : navigator.languages,
        )
      : 'pl',
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
        <LandingPage />
      </Suspense>
    </AppErrorBoundary>
  </StrictMode>,
)
