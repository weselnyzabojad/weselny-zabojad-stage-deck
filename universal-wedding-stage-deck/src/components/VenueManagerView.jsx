import { useEffect, useState } from 'react';
import logo from '../assets/img/logo.png';
import ChildrenExpectedBadge from './ChildrenExpectedBadge';
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
import useCompact from '../hooks/useCompact';

const STORAGE_PREFIX = 'wzsd:venue-manager:';

const DEFAULT_KITCHEN_COURSES = [
  { id: 'dinner', name: '', time: '', serviceMode: 'TABLE_SERVICE' },
  { id: 'supper_1', name: '', time: '', serviceMode: 'TABLE_SERVICE' },
  { id: 'supper_2', name: '', time: '', serviceMode: 'TABLE_SERVICE' },
  { id: 'supper_3', name: '', time: '', serviceMode: 'TABLE_SERVICE' },
];

const COURSE_LABEL_KEYS = {
  dinner: 'venueManager.course.dinner',
  supper_1: 'venueManager.course.firstSupper',
  supper_2: 'venueManager.course.secondSupper',
  supper_3: 'venueManager.course.thirdSupper',
};

function courseLabel(course, t) {
  if (course?.name) return course.name;
  const key = COURSE_LABEL_KEYS[course?.id];
  return key ? t(key) : course?.id ?? '';
}

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
    <label className="flex flex-col gap-0.5 text-[10px] uppercase tracking-wider text-muted">
      {label}
      <input
        type="time"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border border-line bg-card px-2 py-1 font-mono text-xs text-ink"
      />
    </label>
  );
}

function CourseCard({ label, value, mode, onTime, onMode }) {
  const { t } = useI18n();
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-line bg-page/60 p-2.5">
      <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-ink">
        {label}
      </h3>
      <TimeField label={t('venueManager.time')} value={value} onChange={onTime} />
      <label className="flex flex-col gap-0.5 text-[10px] uppercase tracking-wider text-muted">
        {t('venueManager.serviceModeLabel')}
        <select
          value={mode ?? 'TABLE_SERVICE'}
          onChange={(event) => onMode(event.target.value)}
          className="rounded border border-line bg-card px-2 py-1 text-xs text-ink"
        >
          <option value="TABLE_SERVICE">{t('mandatory.serviceMode.TABLE_SERVICE')}</option>
          <option value="BUFFET">{t('mandatory.serviceMode.BUFFET')}</option>
        </select>
      </label>
    </div>
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

  const courses = Array.isArray(settings.kitchenServices)
    ? settings.kitchenServices
    : DEFAULT_KITCHEN_COURSES;
  const activeIndex = timeline.findIndex((entry) => entry.isActive);

  const updateCourse = (index, patch) => {
    const next = courses.map((course, i) => (i === index ? { ...course, ...patch } : course));
    update({ ...settings, kitchenServices: next });
  };

  const addCourse = () => {
    const next = [
      ...courses,
      {
        id: `supper_${courses.length + 1}`,
        name: '',
        time: '',
        serviceMode: 'TABLE_SERVICE',
      },
    ];
    update({ ...settings, kitchenServices: next });
  };

  const removeCourse = (index) => {
    const next = courses.filter((_, i) => i !== index);
    update({ ...settings, kitchenServices: next });
  };

  const body = (
    <div id="main-content" tabIndex={-1} className="space-y-3 sm:space-y-4">
      <TimelineFocusStack entries={timeline} activeIndex={activeIndex} />

      <section className="rounded-xl border border-line bg-card p-3 shadow-lg sm:p-4">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-ink">
          {t('venueManager.mandatorySteps')}
        </h2>

        <div className="mt-2.5 grid gap-2.5 sm:mt-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {courses.map((course, index) => (
            <div key={course.id ?? index} className="relative">
              <CourseCard
                label={courseLabel(course, t)}
                value={course.time}
                mode={course.serviceMode}
                onTime={(time) => updateCourse(index, { time })}
                onMode={(mode) => updateCourse(index, { serviceMode: mode })}
              />
              <button
                type="button"
                onClick={() => removeCourse(index)}
                aria-label={t('venueManager.removeCourse')}
                title={t('venueManager.removeCourse')}
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-card text-xs text-muted transition hover:text-ink"
              >
                ×
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addCourse}
            className="flex min-h-16 items-center justify-center rounded-lg border border-dashed border-line text-xs text-muted transition hover:border-line-strong hover:text-ink"
          >
            + {t('venueManager.addCourse')}
          </button>

          <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-line bg-page/60 p-2.5 sm:col-span-2 lg:col-span-1">
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-ink">
              {t('venueManager.cakeService')}
            </h3>
            <label className="flex flex-col gap-0.5 text-[10px] uppercase tracking-wider text-muted">
              {t('venueManager.cakeService')}
              <select
                value={settings.cakeServiceMode ?? 'KITCHEN_RETURN'}
                onChange={(event) =>
                  update({ ...settings, cakeServiceMode: event.target.value })
                }
                className="rounded border border-line bg-card px-2 py-1 text-xs text-ink"
              >
                <option value="KITCHEN_RETURN">{t('venueManager.cake.KITCHEN_RETURN')}</option>
                <option value="CUT_IN_PLACE">{t('venueManager.cake.CUT_IN_PLACE')}</option>
              </select>
            </label>
          </div>

          <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-line bg-page/60 p-2.5 sm:col-span-2 lg:col-span-1">
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-ink">
              {t('venueManager.closure')}
            </h3>
            <TimeField
              label={t('venueManager.time')}
              value={settings.closureTime}
              onChange={(time) => update({ ...settings, closureTime: time })}
            />
            <label className="flex min-h-11 items-center gap-2 rounded border border-line bg-card px-2 py-1 text-[10px] uppercase tracking-wider text-muted">
              <input
                type="checkbox"
                className="h-6 w-6"
                checked={settings.closureExtensionAllowed === true}
                onChange={(event) => {
                  const allowed = event.target.checked;
                  update({
                    ...settings,
                    closureExtensionAllowed: allowed,
                    closureExtensionUntil: allowed
                      ? settings.closureExtensionUntil ?? null
                      : null,
                  });
                }}
              />
              {t('venueManager.extensionPossible')}
            </label>
            {settings.closureExtensionAllowed === true ? (
              <TimeField
                label={t('venueManager.extensionUntil')}
                value={settings.closureExtensionUntil}
                onChange={(time) =>
                  update({ ...settings, closureExtensionUntil: time })
                }
              />
            ) : null}
          </div>
        </div>

        <p className="mt-2 text-[10px] text-muted">
          {t('venueManager.prestationHelper')}
          {saved ? <span className="ml-2 text-emerald-300">{saved}</span> : null}
        </p>
      </section>
    </div>
  );

  const compact = useCompact();

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
    <div className="flex min-h-dvh flex-col bg-page text-ink antialiased">
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
        center={(
          <ChildrenExpectedBadge wedding={wedding} inline />
        )}
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
