import { DEV_VIEW_ROLES } from '../lib/viewRoles';

// TEMPORARY development-only tool. This component is rendered only behind the
// build-time import.meta.env.DEV gate in StageDeck and must never ship in a
// production bundle. Remove with the dev view-switching capability before
// release.
const LABELS = {
  mc: 'MC',
  dj: 'DJ',
  dj_standard: 'DJ Std',
  dj_mark: 'DJ Mark',
  dj_szymoniak: 'DJ Szymoniak',
  photo1: 'Photo 1',
  photo2: 'Photo 2',
  video: 'Camera',
  venue_manager: 'Venue',
  speaker: 'Speaker',
  song_request: 'Song request',
};

export default function DevViewSwitcher({
  currentRole = 'mc',
  roles = DEV_VIEW_ROLES,
  onChange,
}) {
  return (
    <aside
      data-testid="dev-view-switcher"
      aria-label="Development view switcher — not for production"
      className="fixed bottom-3 left-3 z-toast hidden max-h-[45dvh] w-auto max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-xl border border-amber-500/70 bg-amber-950/95 p-2.5 text-amber-50 shadow-2xl sm:block"
    >
      <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-amber-300">
        DEV VIEW SWITCHER — not for production
      </div>
      <div role="group" aria-label="Development role view" className="mt-1.5 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
        {roles.map((role) => {
          const active = role === currentRole;
          return (
            <button
              key={role}
              type="button"
              aria-pressed={active}
              onClick={() => onChange?.(role)}
              className={`min-h-9 rounded border px-2 py-1 font-mono text-[10px] font-bold transition ${
                active
                  ? 'border-brand-strong bg-brand/50 text-ink'
                  : 'border-amber-500/50 bg-amber-900/60 text-amber-100 hover:bg-amber-800/70'
              }`}
            >
              {LABELS[role] ?? role}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
