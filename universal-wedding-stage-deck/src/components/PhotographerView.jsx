import { useEffect, useState } from 'react';
import logo from '../assets/img/logo.png';
import CulturalRulesBar from './CulturalRulesBar';
import RoleShell from './RoleShell';
import SpeechesChip from './SpeechesChip';
import SyncStatusBadge from './SyncStatusBadge';
import TimelineFocusStack from './TimelineFocusStack';
import TopBarClock from './TopBarClock';
import TopBarRoleLabel from './TopBarRoleLabel';
import TopBarRoleIdentity from './TopBarRoleIdentity';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import OpenOnPhoneButton from './OpenOnPhoneButton';
import SkipLink from './SkipLink';
import {
  clockToEventDate,
  formatDuration,
  formatTimeOfDay,
  resolveEventDateISO,
  resolveVenueTimeZone,
} from '../lib/eventTime.js';
import {
  buildSunsetCountdowns,
  mapPhotoPlanToSteps,
  resolvePhotoPlan,
  resolvePhotoVisibility,
  resolveSunset,
} from '../lib/photoPlan.js';

const SUNSET_STATUS = {
  LIVE: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
  STALE: 'border-amber-700 bg-amber-950/60 text-amber-200',
  UNAVAILABLE: 'border-[#ED2939]/60 bg-[#ED2939]/20 text-[#ff808a]',
};

// Stable fallback so the component never calls `new Date()` during render; the
// parent always supplies the shared reel clock.
const FALLBACK_NOW = new Date(0);

function secondsUntil(date, now) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  return (date.getTime() - now.getTime()) / 1000;
}

function countdownText(seconds) {
  if (seconds == null) return null;
  return seconds < 0 ? `${formatDuration(seconds)} ago` : `in ${formatDuration(seconds)}`;
}

function Card({ title, icon, children, aside, className = '' }) {
  return (
    <section className={`rounded-xl border border-line bg-card p-4 shadow-lg ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-ink">
          {icon} {title}
        </h2>
        {aside}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Row({ label, value, tone = 'text-slate-300' }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[11px]">
      <span className="shrink-0 uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`text-right font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

function DeferredBadge({ children }) {
  return (
    <span className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
      {children}
    </span>
  );
}

function PhotoPlanBlock({ type, data }) {
  if (!data) return null;
  const title = {
    miniSession: 'Mini session',
    groupPhotos: 'Group photos',
    speedFoto: 'Speed foto',
    specialEffects: 'Special effects',
    guestCoverage: 'Guest coverage',
  }[type] ?? type;

  return (
    <div className="rounded-lg border border-line bg-page p-2.5">
      <h4 className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
        {title}
      </h4>
      <div className="mt-1 space-y-1 text-[11px]">
        {type === 'miniSession' ? (
          <>
            <Row label="Duration" value={`${data.durationMin ?? '—'} min`} />
            <Row label="Location" value={data.location ?? '—'} />
            <Row label="Backup" value={data.backupLocation ?? '—'} />
            <Row
              label="Latest start"
              value={
                data.latestStartMinutesBeforeSunset != null
                  ? `${data.latestStartMinutesBeforeSunset} min before sunset`
                  : '—'
              }
            />
          </>
        ) : null}
        {type === 'groupPhotos' ? (
          <>
            <Row label="Location" value={data.location ?? '—'} />
            <Row label="Duration" value={`${data.durationMin ?? '—'} min`} />
            <Row label="Min group size" value={data.minGroupSize ?? '—'} />
            {data.groups?.length ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {data.groups.map((group) => (
                  <DeferredBadge key={group.id}>{group.label}</DeferredBadge>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
        {type === 'speedFoto' ? (
          <>
            {data.description ? <p className="text-slate-300">{data.description}</p> : null}
            <Row label="Duration" value={`${data.durationMin ?? '—'} min`} />
            <Row label="Music" value={data.music ?? '—'} />
          </>
        ) : null}
        {type === 'specialEffects' ? (
          <>
            <div className="flex flex-wrap gap-1">
              {data.sparklers ? <DeferredBadge>✨ Sparklers</DeferredBadge> : null}
              {data.fire ? <DeferredBadge>🔥 Fire</DeferredBadge> : null}
              {data.heavySmoke ? <DeferredBadge>💨 Smoke</DeferredBadge> : null}
              {data.other ? <DeferredBadge>{data.other}</DeferredBadge> : null}
            </div>
            <Row label="Permit" value={data.permitRequired ? 'Required' : 'Not required'} />
            <Row
              label="Venue approved"
              value={data.venueApproved ? 'Yes' : 'No'}
              tone={data.venueApproved ? 'text-emerald-300' : 'text-amber-200'}
            />
            <Row label="Safety briefing" value={data.safetyBriefing ?? '—'} />
          </>
        ) : null}
        {type === 'guestCoverage' ? (
          <>
            <Row
              label="Coverage"
              value={
                data.allGuests
                  ? 'All guests'
                  : data.selectedGuests != null
                    ? `${data.selectedGuests} selected guests`
                    : '—'
              }
            />
            <Row label="Consent" value={data.consent ?? '—'} />
            {data.description ? (
              <p className="text-slate-400">{data.description}</p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function MiniSessionOverride({ value, onSave }) {
  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-line bg-page p-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const time = String(form.get('miniTime') ?? '').trim();
        if (time) onSave?.(time);
      }}
    >
      <label className="text-[10px] uppercase tracking-wider text-slate-500">
        Chosen mini-session hour
        <input
          type="time"
          name="miniTime"
          defaultValue={value ?? ''}
          className="mt-0.5 block rounded border border-line bg-card px-2 py-1 font-mono text-xs text-white"
        />
      </label>
      <button
        type="submit"
        className="rounded border border-brand-strong bg-brand/40 px-2 py-1 text-[10px] font-semibold text-white"
      >
        Save for all media
      </button>
      {value ? (
        <span className="font-mono text-[10px] text-emerald-300">
          Shared override: {value}
        </span>
      ) : null}
    </form>
  );
}

function PhotoPlanDetails({ entries = [] }) {
  if (entries.length === 0) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {entries.map(({ type, data }) => (
        <PhotoPlanBlock key={type} type={type} data={data} />
      ))}
    </div>
  );
}

export default function PhotographerView({
  wedding,
  timeline = [],
  clock,
  syncStatus,
  syncError,
  remoteUpdatedAt,
  outbox = null,
  role,
  roles,
  onRoleChange,
  theme = 'night',
  onToggleTheme,
  roomCode = null,
  culturalRules = null,
  oczepinyStatus = null,
  speeches = [],
  speechMode = 'OFF',
  activeSpeechId = null,
  authControl = null,
  mediaOverrides = {},
  onMiniSessionOverride,
}) {
  const now = clock?.now instanceof Date ? clock.now : FALLBACK_NOW;
  const eventDateISO = resolveEventDateISO(wedding);
  const timeZone = resolveVenueTimeZone(wedding);
  const visibility = resolvePhotoVisibility(wedding);
  const sunset = resolveSunset(wedding);
  const countdowns = buildSunsetCountdowns(sunset, { now, eventDateISO, timeZone });
  const plan = resolvePhotoPlan(wedding);
  const miniSessionOverride = mediaOverrides?.miniSessionTime?.value ?? null;
  const miniSessionDuration = plan?.miniSession?.durationMin ?? sunset?.miniSession?.durationMin ?? null;
  const miniSessionStart = miniSessionOverride
    ? clockToEventDate({ clock: miniSessionOverride, eventDateISO, timeZone, after: now })
    : countdowns.latestMiniStartAt;
  const miniSessionEnd =
    miniSessionStart && Number.isFinite(miniSessionDuration)
      ? new Date(miniSessionStart.getTime() + miniSessionDuration * 60000)
      : null;
  const miniSessionDone = Boolean(miniSessionEnd && now.getTime() > miniSessionEnd.getTime());
  const planByStep = mapPhotoPlanToSteps(plan, timeline);
  const planBodies = Object.fromEntries(
    Object.entries(planByStep).map(([stepId, entries]) => [
      stepId,
      <PhotoPlanDetails key={stepId} entries={entries} />,
    ]),
  );

  const activeIndex = timeline.findIndex((entry) => entry.isActive);

  const sunsetSeconds = secondsUntil(countdowns.sunsetAt, now);
  const goldenSeconds = secondsUntil(countdowns.goldenHourAt, now);
  const latestStartSeconds = secondsUntil(countdowns.latestMiniStartAt, now);

  const [isCompact, setIsCompact] = useState(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(max-width: 639px)').matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsCompact(mq.matches);
    const listener = () => setIsCompact(mq.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  // Compact (phone) read-only content: step timeline and light windows.
  const compactContent = (
    <div id="main-content" tabIndex={-1} className="space-y-4">
      <SkipLink />
      <TimelineFocusStack
        compact
        entries={timeline}
        activeIndex={activeIndex}
        entryBodies={planBodies}
      />

      {visibility.sunset && sunset?.usable && !miniSessionDone ? (
        <Card title="Light windows" icon="🌅">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-line bg-page p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-slate-500">Sunset</div>
              <div className="font-mono text-xl font-bold text-ink">{sunset.sunsetTime ?? '—'}</div>
              <div className="font-mono text-[10px] text-slate-400">{countdownText(sunsetSeconds) ?? '—'}</div>
            </div>
            <div className="rounded-lg border border-line bg-page p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-slate-500">Golden hour</div>
              <div className="font-mono text-xl font-bold text-ink">{sunset.goldenHourStart ?? '—'}</div>
              <div className="font-mono text-[10px] text-slate-400">{countdownText(goldenSeconds) ?? '—'}</div>
            </div>
            <div className="rounded-lg border border-line bg-page p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-slate-500">Civil twilight</div>
              <div className="font-mono text-xl font-bold text-ink">{sunset.civilTwilightEnd ?? '—'}</div>
            </div>
            <div className="rounded-lg border border-line bg-page p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-slate-500">Mini latest start</div>
              <div className="font-mono text-xl font-bold text-ink">
                {countdowns.latestMiniStartAt ? formatTimeOfDay(countdowns.latestMiniStartAt, timeZone) : '—'}
              </div>
              <div className="font-mono text-[10px] text-slate-400">{countdownText(latestStartSeconds) ?? '—'}</div>
            </div>
          </div>
          <MiniSessionOverride
            value={miniSessionOverride}
            onSave={onMiniSessionOverride}
          />
        </Card>
      ) : null}


    </div>
  );

  const wideContent = (
    <div className="flex min-h-screen flex-col bg-page text-slate-100 antialiased select-none">
      <SkipLink />
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg bg-white px-2 py-1 shadow-md">
            <img src={logo} alt="Weselny Żabojad" className="h-10 w-auto object-contain" />
          </div>
          <TopBarClock clock={clock} />
          <TopBarRoleLabel role={role} />
          <TopBarRoleIdentity role={role} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {culturalRules ? (
            <CulturalRulesBar rules={culturalRules} oczepinyStatus={oczepinyStatus} />
          ) : null}
          <SpeechesChip
            mode={speechMode}
            speeches={speeches}
            activeSpeechId={activeSpeechId}
          />
          <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} outbox={outbox} />
          <OpenOnPhoneButton role={role} roomCode={roomCode} />
          {authControl}
          <LanguageToggle />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="w-full space-y-4">
          <TimelineFocusStack
            entries={timeline}
            activeIndex={activeIndex}
            entryBodies={planBodies}
          />

          {visibility.sunset && !miniSessionDone ? (
            <Card
              title="Sunset & golden hour"
              icon="🌅"
              aside={
                sunset ? (
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider ${SUNSET_STATUS[sunset.status]}`}
                  >
                    {sunset.status}
                  </span>
                ) : null
              }
            >
              {!sunset || !sunset.usable ? (
                <div className="rounded-lg border border-[#ED2939]/50 bg-[#ED2939]/10 p-3 text-sm text-alert-tint">
                  <p className="font-semibold">Sunset unavailable — check connection.</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    D6: the app never estimates a sunset offline. Refresh the cartridge after the
                    online lookup succeeds.
                  </p>
                </div>
              ) : (
                <>
                  {sunset.status === 'STALE' ? (
                    <p className="mb-2 rounded border border-amber-700 bg-amber-950/60 px-2 py-1 text-[10px] text-amber-200">
                      Cached sunset data is stale
                      {sunset.lastFetchedAt ? ` · fetched ${sunset.lastFetchedAt}` : ''}. Treat the
                      window as approximate.
                    </p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg border border-line bg-page p-2.5">
                      <div className="text-[9px] uppercase tracking-wider text-slate-500">Sunset</div>
                      <div className="font-mono text-xl font-bold text-ink">
                        {sunset.sunsetTime ?? '—'}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {countdownText(sunsetSeconds) ?? '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-line bg-page p-2.5">
                      <div className="text-[9px] uppercase tracking-wider text-slate-500">
                        Golden hour
                      </div>
                      <div className="font-mono text-xl font-bold text-ink">
                        {sunset.goldenHourStart ?? '—'}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {countdownText(goldenSeconds) ?? '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-line bg-page p-2.5">
                      <div className="text-[9px] uppercase tracking-wider text-slate-500">
                        Civil twilight
                      </div>
                      <div className="font-mono text-xl font-bold text-ink">
                        {sunset.civilTwilightEnd ?? '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-line bg-page p-2.5">
                      <div className="text-[9px] uppercase tracking-wider text-slate-500">
                        Mini session latest start
                      </div>
                      <div className="font-mono text-xl font-bold text-ink">
                        {countdowns.latestMiniStartAt
                          ? formatTimeOfDay(countdowns.latestMiniStartAt, timeZone)
                          : '—'}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {countdownText(latestStartSeconds) ?? '—'}
                      </div>
                    </div>
                  </div>
                  {sunset.miniSession ? (
                    <div className="mt-2 grid gap-1.5 text-[11px] sm:grid-cols-2">
                      <Row
                        label="Mini session"
                        value={`${sunset.miniSession.durationMin ?? '—'} min · ${sunset.miniSession.location ?? 'location TBC'}`}
                      />
                      <Row
                        label="Backup location"
                        value={sunset.miniSession.backupLocation ?? '—'}
                      />
                    </div>
                  ) : null}
                  <p className="mt-2 text-[10px] text-slate-500">
                    Venue timezone {timeZone}
                    {sunset.provider ? ` · source ${sunset.provider}` : ''}
                  </p>
                  <MiniSessionOverride
                    value={miniSessionOverride}
                    onSave={onMiniSessionOverride}
                  />
                </>
              )}
            </Card>
          ) : null}


        </div>
      </main>

      <footer className="border-t border-line bg-card px-4 py-2 text-center font-mono text-[11px] text-slate-500">
        Read-only media view · step timeline, shot plan and light windows
      </footer>
    </div>
  );

  if (!isCompact) {
    return wideContent;
  }

  return (
    <RoleShell
      compact
      role={role}
      roles={roles}
      syncStatus={syncStatus}
      syncError={syncError}
      remoteUpdatedAt={remoteUpdatedAt}
      outbox={outbox}
      onToggleTheme={onToggleTheme}
      theme={theme}
      onRoleChange={onRoleChange}
      culturalRules={culturalRules}
      oczepinyStatus={oczepinyStatus}
      speeches={speeches}
      speechMode={speechMode}
      activeSpeechId={activeSpeechId}
      authControl={authControl}
    >
      {compactContent}
    </RoleShell>
  );
}
