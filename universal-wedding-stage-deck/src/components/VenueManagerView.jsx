import { useEffect, useMemo, useState } from 'react';
import logo from '../assets/img/logo.png';
import RoleShell from './RoleShell';
import SyncStatusBadge from './SyncStatusBadge';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import TopBarCenterIdentity from './TopBarCenterIdentity';
import TopBarClock from './TopBarClock';
import TopBarRoleIdentity from './TopBarRoleIdentity';
import TopBarShell from './TopBarShell';
import TimelineFocusStack from './TimelineFocusStack';
import SkipLink from './SkipLink';

const STORAGE_PREFIX = 'wzsd:venue-manager:';

const DEFAULT_KITCHEN = {
  dinner: '',
  firstSupper: '',
  secondSupper: '',
  thirdSupper: '',
};

function loadSettings(wedding) {
  if (typeof window === 'undefined') return wedding.mandatorySteps ?? {};
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${wedding.weddingId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore corrupt local settings
  }
  return wedding.mandatorySteps ?? {};
}

function saveSettings(wedding, settings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${wedding.weddingId}`, JSON.stringify(settings));
  } catch {
    // local-only persistence is best effort
  }
}

function TimeField({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-0.5 text-[10px] uppercase tracking-wider text-slate-500">
      {label}
      <input
        type="time"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border border-line bg-card px-2 py-1 font-mono text-xs text-white"
      />
    </label>
  );
}

export default function VenueManagerView({
  wedding,
  timeline = [],
  clock,
  syncStatus,
  syncError,
  remoteUpdatedAt,
  outbox = null,
  theme = 'night',
  onToggleTheme,
  onUpdateMandatory,
  mandatoryOverride = null,
}) {
  const [settings, setSettings] = useState(() =>
    mandatoryOverride?.value ?? loadSettings(wedding),
  );
  const [saved, setSaved] = useState('');

  useEffect(() => {
    setSettings(mandatoryOverride?.value ?? loadSettings(wedding));
  }, [wedding, mandatoryOverride]);

  const update = (patch) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      saveSettings(wedding, next);
      onUpdateMandatory?.(next);
      return next;
    });
    setSaved('Saved');
    window.setTimeout(() => setSaved(''), 1500);
  };

  const kitchen = { ...DEFAULT_KITCHEN, ...(settings.kitchenServices ?? {}) };
  const activeIndex = timeline.findIndex((entry) => entry.isActive);

  const body = (
    <div id="main-content" tabIndex={-1} className="space-y-4">
      <TimelineFocusStack entries={timeline} activeIndex={activeIndex} />

      <section className="rounded-xl border border-line bg-card p-4 shadow-lg">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-white">
          Mandatory steps
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TimeField
            label="Obiad weselny"
            value={kitchen.dinner}
            onChange={(time) => update({ ...settings, kitchenServices: { ...kitchen, dinner: time } })}
          />
          <TimeField
            label="Pierwsza kolacja"
            value={kitchen.firstSupper}
            onChange={(time) => update({ ...settings, kitchenServices: { ...kitchen, firstSupper: time } })}
          />
          <TimeField
            label="Druga kolacja"
            value={kitchen.secondSupper}
            onChange={(time) => update({ ...settings, kitchenServices: { ...kitchen, secondSupper: time } })}
          />
          <TimeField
            label="Trzecia kolacja"
            value={kitchen.thirdSupper}
            onChange={(time) => update({ ...settings, kitchenServices: { ...kitchen, thirdSupper: time } })}
          />
          <TimeField
            label="Wedding closure"
            value={settings.closureTime}
            onChange={(time) => update({ ...settings, closureTime: time })}
          />
          <label className="flex items-center gap-2 rounded border border-line bg-card px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">
            <input
              type="checkbox"
              checked={settings.closureExtensionAllowed === true}
              onChange={(event) => update({ ...settings, closureExtensionAllowed: event.target.checked })}
            />
            +1h extension allowed
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] uppercase tracking-wider text-slate-500">
            Cake service
            <select
              value={settings.cakeServiceMode ?? 'KITCHEN_RETURN'}
              onChange={(event) => update({ ...settings, cakeServiceMode: event.target.value })}
              className="rounded border border-line bg-card px-2 py-1 text-xs text-white"
            >
              <option value="KITCHEN_RETURN">Kitchen return / plated pieces</option>
              <option value="CUT_IN_PLACE">Cut in place / guests come</option>
            </select>
          </label>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          Prestation ready is derived automatically 1 hour before first guests arrival.
          {saved ? <span className="ml-2 text-emerald-300">{saved}</span> : null}
        </p>
      </section>
    </div>
  );

  const compact = useMemo(
    () =>
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(max-width: 639px)').matches
        : false,
    [],
  );

  if (compact) {
    return (
      <RoleShell
        compact
        role="venue_manager"
        wedding={wedding}
        syncStatus={syncStatus}
        syncError={syncError}
        remoteUpdatedAt={remoteUpdatedAt}
        outbox={outbox}
        onToggleTheme={onToggleTheme}
        theme={theme}
      >
        {body}
      </RoleShell>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-page text-slate-100 antialiased">
      <SkipLink />
      <TopBarShell
        left={(
          <>
            <div className="flex items-center justify-center rounded-lg bg-white px-2 py-1 shadow-md">
              <img src={logo} alt="Weselny Żabojad" className="h-12 w-auto object-contain" />
            </div>
            <TopBarClock clock={clock} />
            <TopBarRoleIdentity role="venue_manager" />
          </>
        )}
        center={<TopBarCenterIdentity wedding={wedding} />}
        right={(
          <>
            <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} outbox={outbox} />
            <LanguageToggle />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </>
        )}
      />
      <main className="flex-1 p-4">{body}</main>
    </div>
  );
}
