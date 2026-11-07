import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import PwaUpdatePrompt from './components/PwaUpdatePrompt.jsx'
import { ADMIN_PATH, isAdminPath, isLegacyAdminPath } from './admin/adminUtils.js'
import { parseSongRequestPath } from './lib/songRequests.js'

// `/admin` is the owner-only surface. The legacy `/deck/admin` path redirects.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const SongRequestApp = lazy(() => import('./components/SongRequestApp.jsx'))
const LEGACY_ADMIN =
  typeof window !== 'undefined' && isLegacyAdminPath(window.location.pathname)
if (LEGACY_ADMIN) {
  window.location.replace(
    `${ADMIN_PATH}${window.location.search}${window.location.hash}`,
  )
}
const IS_ADMIN =
  typeof window !== 'undefined' && isAdminPath(window.location.pathname)
const SONG_REQUEST_ROUTE =
  typeof window !== 'undefined'
    ? parseSongRequestPath(window.location.pathname, window.location.search, import.meta.env.BASE_URL)
    : null

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary scope="app">
      {LEGACY_ADMIN ? (
        <div className="flex min-h-screen items-center justify-center bg-page px-4 text-center text-slate-200">
          <div className="max-w-md rounded-2xl border border-line bg-card p-6">
            <h1 className="font-heading text-lg font-bold text-white">Admin moved</h1>
            <p className="mt-2 text-sm text-slate-400">
              The owner admin panel is now available at <strong className="text-white">/admin</strong>.
            </p>
          </div>
        </div>
      ) : SONG_REQUEST_ROUTE ? (
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-page text-sm text-slate-400">
              Loading song request…
            </div>
          }
        >
          <SongRequestApp roomCode={SONG_REQUEST_ROUTE.roomCode} />
        </Suspense>
      ) : IS_ADMIN ? (
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-page text-sm text-slate-400">
              Loading owner admin…
            </div>
          }
        >
          <AdminApp />
        </Suspense>
      ) : (
        <>
          <App />
          <PwaUpdatePrompt />
        </>
      )}
    </AppErrorBoundary>
  </StrictMode>,
)
