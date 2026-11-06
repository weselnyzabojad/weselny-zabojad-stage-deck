import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import PwaUpdatePrompt from './components/PwaUpdatePrompt.jsx'
import { isAdminPath } from './admin/adminUtils.js'
import { parseSongRequestPath } from './lib/songRequests.js'

// `/deck/admin` is the owner-only surface. Keep it in its own chunk so the
// stage deck bundle stays lean.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const SongRequestApp = lazy(() => import('./components/SongRequestApp.jsx'))
const IS_ADMIN = typeof window !== 'undefined' && isAdminPath(window.location.pathname)
const SONG_REQUEST_ROUTE =
  typeof window !== 'undefined'
    ? parseSongRequestPath(window.location.pathname, window.location.search, import.meta.env.BASE_URL)
    : null

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary scope="app">
      {SONG_REQUEST_ROUTE ? (
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
