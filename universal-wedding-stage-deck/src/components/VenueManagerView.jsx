import { useEffect, useMemo, useState } from 'react';
import logo from '../assets/img/logo.png';
import RoleShell from './RoleShell';
import SecondaryControlBar from './SecondaryControlBar';
import SyncStatusBadge from './SyncStatusBadge';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import TopBarCenterIdentity from './TopBarCenterIdentity';
import TopBarClock from './TopBarClock';
import TopBarRoleIdentity from './TopBarRoleIdentity';
import TopBarShell from './TopBarShell';
import TimelineFocusStack from './TimelineFocusStack';
import SkipLink from './SkipLink';
import { useI18n } from '../i18n/useI18n';

const STORAGE_PREFIX = 'wzsd:venue-manager:';

const DEFAULT_KITCHEN = {
  dinner: '',
  firstSupper: '',
  secondSupper: '',
  thirdSupper: '',
};

const KITCHEN_MODE_FIELDS = [
  { key: 'dinner', course: 'Obiad weselny' },
  { key: 'firstSupper', course: 'Pierwsza kolacja' },
  { key: 'secondSupper', course: 'Druga kolacja' },
  { key: 'thirdSupper', course: 'Trzecia kolacja' },
];

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
  pin = null,
  onUpdateMandatory,
  mandatoryOverride = null,
}) {
  const { t } = useI18n();
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
    setSaved(t('venueManager.saved'));
    window.setTimeout(() => setSaved(''), 1500);
  };

  const kitchen = { ...DEFAULT_KITCHEN, ...(settings.kitchenServices ?? {}) };
  const kitchenModes = settings.kitchenServiceModes ?? {};
  const activeIndex = timeline.findIndex((entry) => entry.isActive);

  const body = (
    <div id="main-content" tabIndex={-1} className="space-y-3 sm:space-y-4">
      <TimelineFocusStack entries={timeline} activeIndex={activeIndex} />

      <section className="rounded-xl border border-line bg-card p-3 shadow-lg sm:p-4">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-white">
          {t('venueManager.mandatorySteps')}
        </h2>
        <div className="mt-2.5 grid gap-2.5 sm:mt-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
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
          {KITCHEN_MODE_FIELDS.map(({ key, course }) => (
            <label
              key={key}
              className="flex flex-col gap-0.5 text-[10px] uppercase tracking-wider text-slate-500"
            >
              {t('venueManager.serviceMode', { course })}
              <select
                value={kitchenModes[key] ?? 'TABLE_SERVICE'}
                onChange={(event) =>
                  update({
                    ...settings,
                    kitchenServiceModes: { ...kitchenModes, [key]: event.target.value },
                  })
                }
                className="rounded border border-line bg-card px-2 py-1 text-xs text-white"
              >
                <option value="TABLE_SERVICE">{t('mandatory.serviceMode.TABLE_SERVICE')}</option>
                <option value="BUFFET">{t('mandatory.serviceMode.BUFFET')}</option>
              </select>
            </label>
          ))}
          <TimeField
            label={t('venueManager.closure')}
            value={settings.closureTime}
            onChange={(time) => update({ ...settings, closureTime: time })}
          />
          <label className="flex items-center gap-2 rounded border border-line bg-card px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">
            <input
              type="checkbox"
              checked={settings.closureExtensionAllowed === true}
              onChange={(event) => update({ ...settings, closureExtensionAllowed: event.target.checked })}
            />
            {t('venueManager.extension')}
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] uppercase tracking-wider text-slate-500">
            {t('venueManager.cakeService')}
            <select
              value={settings.cakeServiceMode ?? 'KITCHEN_RETURN'}
              onChange={(event) => update({ ...settings, cakeServiceMode: event.target.value })}
              className="rounded border border-line bg-card px-2 py-1 text-xs text-white"
            >
              <option value="KITCHEN_RETURN">{t('venueManager.cake.KITCHEN_RETURN')}</option>
              <option value="CUT_IN_PLACE">{t('venueManager.cake.CUT_IN_PLACE')}</option>
            </select>
          </label>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          {t('venueManager.prestationHelper')}
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
        clock={clock}
        pin={pin}
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
        right={null}
      />

      <SecondaryControlBar
        left={<SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} outbox={outbox} />}
        right={(
          <>
            <LanguageToggle />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </>
        )}
      />

      <main className="flex-1 p-4">{body}</main>
    </div>
  );
}
