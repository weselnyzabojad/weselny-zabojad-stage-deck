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
  formatDuration,
  formatTimeOfDay,
  resolveEventDateISO,
  resolveVenueTimeZone,
} from '../lib/eventTime.js';
import {
  buildSunsetCountdowns,
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
}) {
  const now = clock?.now instanceof Date ? clock.now : FALLBACK_NOW;
  const eventDateISO = resolveEventDateISO(wedding);
  const timeZone = resolveVenueTimeZone(wedding);
  const visibility = resolvePhotoVisibility(wedding);
  const sunset = resolveSunset(wedding);
  const countdowns = buildSunsetCountdowns(sunset, { now, eventDateISO, timeZone });
  const plan = resolvePhotoPlan(wedding);

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
      <TimelineFocusStack compact entries={timeline} activeIndex={activeIndex} />

      {visibility.sunset && sunset?.usable ? (
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
        <div className="mx-auto max-w-5xl space-y-4">
          <TimelineFocusStack entries={timeline} activeIndex={activeIndex} />

          {visibility.sunset ? (
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
                </>
              )}
            </Card>
          ) : null}

          {visibility.photoPlan && plan ? (
            <Card title="Photo plan" icon="🗂️">
              <div className="grid gap-3 lg:grid-cols-2">
                {plan.miniSession ? (
                  <div className="rounded-lg border border-line bg-page p-3">
                    <h3 className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
                      Mini session
                    </h3>
                    <div className="mt-1 space-y-1 text-[11px]">
                      <Row label="Duration" value={`${plan.miniSession.durationMin ?? '—'} min`} />
                      <Row label="Location" value={plan.miniSession.location ?? '—'} />
                      <Row label="Backup" value={plan.miniSession.backupLocation ?? '—'} />
                      <Row
                        label="Latest start"
                        value={
                          plan.miniSession.latestStartMinutesBeforeSunset != null
                            ? `${plan.miniSession.latestStartMinutesBeforeSunset} min before sunset`
                            : '—'
                        }
                      />
                    </div>
                  </div>
                ) : null}

                {plan.groupPhotos ? (
                  <div className="rounded-lg border border-line bg-page p-3">
                    <h3 className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
                      Group photos
                    </h3>
                    <div className="mt-1 space-y-1 text-[11px]">
                      <Row label="Location" value={plan.groupPhotos.location ?? '—'} />
                      <Row
                        label="Duration"
                        value={`${plan.groupPhotos.durationMin ?? '—'} min`}
                      />
                      <Row
                        label="Min group size"
                        value={plan.groupPhotos.minGroupSize ?? '—'}
                      />
                    </div>
                    {plan.groupPhotos.groups.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {plan.groupPhotos.groups.map((group) => (
                          <span
                            key={group.id}
                            className="rounded border border-line bg-raised px-1.5 py-0.5 text-[10px] text-slate-300"
                          >
                            {group.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {plan.speedFoto ? (
                  <div className="rounded-lg border border-line bg-page p-3">
                    <h3 className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
                      Speed foto {plan.speedFoto.enabled ? '' : '· off'}
                    </h3>
                    {plan.speedFoto.description ? (
                      <p className="mt-1 text-[11px] text-slate-300">{plan.speedFoto.description}</p>
                    ) : null}
                    <div className="mt-1 space-y-1 text-[11px]">
                      <Row label="Duration" value={`${plan.speedFoto.durationMin ?? '—'} min`} />
                      <Row label="Music" value={plan.speedFoto.music ?? '—'} />
                    </div>
                  </div>
                ) : null}

                {plan.specialEffects ? (
                  <div className="rounded-lg border border-line bg-page p-3">
                    <h3 className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
                      Special effects
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                      {plan.specialEffects.sparklers ? <DeferredBadge>✨ Sparklers</DeferredBadge> : null}
                      {plan.specialEffects.fire ? <DeferredBadge>🔥 Fire</DeferredBadge> : null}
                      {plan.specialEffects.heavySmoke ? <DeferredBadge>💨 Smoke</DeferredBadge> : null}
                      {plan.specialEffects.other ? (
                        <DeferredBadge>{plan.specialEffects.other}</DeferredBadge>
                      ) : null}
                    </div>
                    <div className="mt-1.5 space-y-1 text-[11px]">
                      <Row
                        label="Permit"
                        value={plan.specialEffects.permitRequired ? 'Required' : 'Not required'}
                      />
                      <Row
                        label="Venue approved"
                        value={plan.specialEffects.venueApproved ? 'Yes' : 'No'}
                        tone={plan.specialEffects.venueApproved ? 'text-emerald-300' : 'text-amber-200'}
                      />
                      <Row
                        label="Safety briefing"
                        value={plan.specialEffects.safetyBriefing ?? '—'}
                      />
                    </div>
                  </div>
                ) : null}

                {plan.guestCoverage ? (
                  <div className="rounded-lg border border-line bg-page p-3 lg:col-span-2">
                    <h3 className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
                      Guest coverage
                    </h3>
                    <div className="mt-1 space-y-1 text-[11px]">
                      <Row
                        label="Coverage"
                        value={
                          plan.guestCoverage.allGuests
                            ? 'All guests'
                            : plan.guestCoverage.selectedGuests != null
                              ? `${plan.guestCoverage.selectedGuests} selected guests`
                              : '—'
                        }
                      />
                      <Row
                        label="Consent"
                        value={plan.guestCoverage.consent ?? '—'}
                      />
                    </div>
                    {plan.guestCoverage.description ? (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {plan.guestCoverage.description}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
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
