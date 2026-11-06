import { useEffect, useState } from 'react';
import logo from '../assets/img/logo.png';
import CoupleIdentity from './CoupleIdentity';
import ReelClock from './ReelClock';
import RoleShell from './RoleShell';
import RoleSwitcher from './RoleSwitcher';
import StagePingBanner from './StagePingBanner';
import SyncStatusBadge from './SyncStatusBadge';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import SkipLink from './SkipLink';
import {
  clockToEventDate,
  formatCountdown,
  formatDuration,
  formatTimeOfDay,
  resolveEventDateISO,
  resolveVenueTimeZone,
} from '../lib/eventTime.js';
import {
  buildSunsetCountdowns,
  resolveMediaTeam,
  resolveOczepiny,
  resolvePhotoPlan,
  resolvePhotoVisibility,
  resolveSunset,
  resolveVenueAccess,
} from '../lib/photoPlan.js';

const SUNSET_STATUS = {
  LIVE: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
  STALE: 'border-amber-700 bg-amber-950/60 text-amber-200',
  UNAVAILABLE: 'border-[#ED2939]/60 bg-[#ED2939]/20 text-[#ff808a]',
};

const MEDIA_ROLE_META = {
  PHOTO: { label: 'Photo', icon: '📷' },
  VIDEO: { label: 'Video', icon: '🎥' },
  DRONE: { label: 'Drone', icon: '🚁' },
};

const STEP_STATUS = {
  done: { label: 'DONE', chip: 'border-emerald-800 bg-emerald-950/60 text-emerald-300' },
  active: { label: 'ON AIR', chip: 'border-brand-strong bg-brand/40 text-brand-tint animate-pulse' },
  next: { label: 'NEXT', chip: 'border-amber-800 bg-amber-950/60 text-amber-200' },
  planned: { label: 'PLANNED', chip: 'border-line bg-raised text-slate-400' },
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
  stagePing,
  hardAnchors = [],
  syncStatus,
  syncError,
  remoteUpdatedAt,
  outbox = null,
  role,
  roles,
  onRoleChange,
  theme = 'night',
  onToggleTheme,
}) {
  const now = clock?.now instanceof Date ? clock.now : FALLBACK_NOW;
  const eventDateISO = resolveEventDateISO(wedding);
  const timeZone = resolveVenueTimeZone(wedding);
  const visibility = resolvePhotoVisibility(wedding);
  const mediaTeam = resolveMediaTeam(wedding);
  const sunset = resolveSunset(wedding);
  const countdowns = buildSunsetCountdowns(sunset, { now, eventDateISO, timeZone });
  const plan = resolvePhotoPlan(wedding);
  const oczepiny = resolveOczepiny(wedding, hardAnchors, mediaTeam);
  const venue = resolveVenueAccess(wedding);

  const activeIndex = timeline.findIndex((entry) => entry.isActive);
  const activeEntry = activeIndex >= 0 ? timeline[activeIndex] : null;
  const pingStep =
    timeline.find((entry) => entry.step.id === stagePing?.step_id)?.step ?? activeEntry?.step ?? null;

  const anchorAt =
    oczepiny?.anchor?.time
      ? clockToEventDate({ clock: oczepiny.anchor.time, eventDateISO, timeZone, after: now })
      : null;
  const anchorSeconds = secondsUntil(anchorAt, now);

  const showVenue =
    visibility.venueAddress ||
    visibility.venueMaps ||
    visibility.venueManager ||
    visibility.venueInstallation ||
    visibility.venueParking;

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

  // Compact (phone) read-only content: light windows, Oczepini cue, contacts.
  const compactContent = (
    <div id="main-content" tabIndex={-1} className="space-y-4">
      <SkipLink />
      <StagePingBanner key={stagePing?.id ?? 'no-ping'} ping={stagePing} step={pingStep} />
      <ReelClock clock={clock} compact />

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

      {oczepiny ? (
        <Card
          title="Oczepini cue"
          icon="💃"
          aside={
            anchorSeconds != null ? (
              <span className="font-mono text-[10px] text-brand-soft">{formatCountdown(anchorSeconds)}</span>
            ) : null
          }
        >
          {oczepiny.winnerPhotoWarning ? (
            <p role="alert" className="mb-2 rounded border border-[#ED2939]/60 bg-[#ED2939]/20 px-2 py-1.5 text-[11px] text-alert-tint">
              ⚠ Media team leaves before the Oczepini anchor — they would miss the winner photo.
            </p>
          ) : null}
          <div className="grid gap-1.5 text-[11px]">
            <Row label="Anchor" value={oczepiny.anchor ? `${oczepiny.anchor.label} · ${oczepiny.anchor.time ?? '—'}` : 'No anchor'} />
            <Row
              label="Briefed"
              value={oczepiny.photographerBriefed?.confirmed ? 'Confirmed' : 'Not confirmed'}
              tone={oczepiny.photographerBriefed?.confirmed ? 'text-emerald-300' : 'text-amber-200'}
            />
          </div>
          {oczepiny.winnerPhoto.enabled && oczepiny.winnerPhoto.photographerCue ? (
            <p className="mt-2 text-xs text-slate-300">📷 {oczepiny.winnerPhoto.photographerCue}</p>
          ) : null}
        </Card>
      ) : null}

      {mediaTeam.length > 0 ? (
        <Card title="Media team" icon="🎥">
          <div className="space-y-2">
            {mediaTeam.map((member) => {
              const meta = MEDIA_ROLE_META[member.role] ?? MEDIA_ROLE_META.PHOTO;
              return (
                <div key={member.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-page p-2.5">
                  <div className="min-w-0">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-brand-soft">{meta.icon} {meta.label}</div>
                    <div className="truncate font-heading text-sm font-semibold text-ink">{member.name}</div>
                  </div>
                  {member.phoneHref ? (
                    <a href={member.phoneHref} className="shrink-0 rounded border border-brand-strong bg-brand/30 px-2 py-1 text-[10px] font-semibold text-brand-tint">
                      📞 Call
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {showVenue && venue ? (
        <Card title="Venue access" icon="📍">
          <div className="space-y-1.5 text-[11px]">
            {visibility.venueAddress && venue.address ? <Row label="Address" value={venue.address} /> : null}
            {visibility.venueManager && venue.manager?.name ? <Row label="Manager" value={venue.manager.name} /> : null}
            {visibility.venueParking && venue.installation?.parking ? <Row label="Parking" value={venue.installation.parking} /> : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {visibility.venueMaps && venue.mapsUrl ? (
              <a href={venue.mapsUrl} target="_blank" rel="noreferrer noopener" className="rounded border border-brand-strong bg-brand/30 px-2 py-1 text-[10px] font-semibold text-brand-tint">
                Open in Maps
              </a>
            ) : null}
            {visibility.venueManager && venue.manager?.phoneHref ? (
              <a href={venue.manager.phoneHref} className="rounded border border-brand-strong bg-brand/30 px-2 py-1 text-[10px] font-semibold text-brand-tint">
                📞 Call venue
              </a>
            ) : null}
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
          <div>
            <div className="font-heading text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-soft">
              📷 Photographer · read-only
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CoupleIdentity wedding={wedding} className="text-sm" />
              <span className="font-body text-xs font-normal text-slate-400">{wedding.date}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} outbox={outbox} />
          {roles.length > 1 ? (
            <RoleSwitcher role={role} roles={roles} onChange={onRoleChange} />
          ) : null}
          <LanguageToggle />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
        </div>
      </header>

      <StagePingBanner key={stagePing?.id ?? 'no-ping'} ping={stagePing} step={pingStep} />

      <main id="main-content" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-5xl space-y-4">
          <ReelClock clock={clock} compact />

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

          {oczepiny ? (
            <Card
              title="Oczepini cues"
              icon="💃"
              aside={
                <div className="flex flex-wrap items-center gap-1.5">
                  <DeferredBadge>{oczepiny.order.replaceAll('_', ' ')}</DeferredBadge>
                  {anchorSeconds != null ? (
                    <span className="font-mono text-[10px] text-brand-soft">
                      {formatCountdown(anchorSeconds)}
                    </span>
                  ) : null}
                </div>
              }
            >
              {oczepiny.winnerPhotoWarning ? (
                <p
                  role="alert"
                  className="mb-2 rounded border border-[#ED2939]/60 bg-[#ED2939]/20 px-2 py-1.5 text-[11px] text-alert-tint"
                >
                  ⚠ Every media-team member leaves before the Oczepini anchor — they would miss the
                  winner photo. Extend a departure or brief the team.
                </p>
              ) : null}

              <div className="grid gap-2 text-[11px] sm:grid-cols-2">
                <Row label="Toss" value={oczepiny.toss ?? '—'} />
                <Row label="Ties" value={oczepiny.ties ?? '—'} />
                <Row
                  label="Anchor"
                  value={
                    oczepiny.anchor
                      ? `${oczepiny.anchor.label} · ${oczepiny.anchor.time ?? '—'}`
                      : 'No anchor linked'
                  }
                />
                <Row
                  label="Photographer briefed"
                  value={
                    oczepiny.photographerBriefed?.confirmed
                      ? `Confirmed${oczepiny.photographerBriefed.confirmedBy ? ` by ${oczepiny.photographerBriefed.confirmedBy}` : ''}`
                      : 'Not confirmed'
                  }
                  tone={oczepiny.photographerBriefed?.confirmed ? 'text-emerald-300' : 'text-amber-200'}
                />
              </div>

              {oczepiny.winnerPhoto.enabled ? (
                <div className="mt-2 rounded-lg border border-line bg-page p-2.5">
                  <div className="font-heading text-[10px] font-semibold uppercase tracking-widest text-brand-soft">
                    Winner photo
                  </div>
                  {oczepiny.winnerPhoto.photographerCue ? (
                    <p className="mt-0.5 text-xs text-slate-300">
                      📷 {oczepiny.winnerPhoto.photographerCue}
                    </p>
                  ) : null}
                  {oczepiny.winnerPhoto.replacesWinnersDance ? (
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      Replaces the winners&apos; dance.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {oczepiny.subEvents.length > 0 ? (
                <ol className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {oczepiny.subEvents.map((event, index) => (
                    <li
                      key={event.id}
                      className="flex items-center justify-between gap-2 rounded border border-line bg-page px-2 py-1.5 text-[11px]"
                    >
                      <span className="min-w-0 truncate text-slate-300">
                        {index + 1}. {event.title}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-slate-500">
                        {event.durationMin != null ? `${event.durationMin} min` : '—'}
                        {event.skippable ? ' · skippable' : ''}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}

              {oczepiny.props.length > 0 || oczepiny.music ? (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  {oczepiny.props.map((prop) => (
                    <span
                      key={prop}
                      className="rounded border border-line bg-raised px-1.5 py-0.5 text-slate-300"
                    >
                      🎒 {prop}
                    </span>
                  ))}
                  {oczepiny.music?.track || oczepiny.music?.playlist ? (
                    <span className="rounded border border-line bg-raised px-1.5 py-0.5 text-slate-300">
                      🎵 {oczepiny.music.track ?? oczepiny.music.playlist}
                    </span>
                  ) : null}
                </div>
              ) : null}
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

          {mediaTeam.length > 0 ? (
            <Card title="Media team" icon="🎥" aside={<DeferredBadge>{mediaTeam.length} crew</DeferredBadge>}>
              <div className="grid gap-2 sm:grid-cols-2">
                {mediaTeam.map((member) => {
                  const meta = MEDIA_ROLE_META[member.role] ?? MEDIA_ROLE_META.PHOTO;
                  const endsAt = member.endTime
                    ? clockToEventDate({ clock: member.endTime, eventDateISO, timeZone, after: now })
                    : null;
                  const endSeconds = secondsUntil(endsAt, now);
                  return (
                    <div key={member.id} className="rounded-lg border border-line bg-page p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-mono text-[9px] uppercase tracking-widest text-brand-soft">
                            {meta.icon} {meta.label}
                          </div>
                          <div className="font-heading text-sm font-semibold text-ink">
                            {member.name}
                          </div>
                        </div>
                        {member.endTime ? (
                          <div className="shrink-0 text-right font-mono text-[10px]">
                            <div className="text-slate-400">leaves {member.endTime}</div>
                            <div
                              className={
                                endSeconds != null && endSeconds < 0
                                  ? 'text-alert-soft'
                                  : 'text-slate-500'
                              }
                            >
                              {countdownText(endSeconds) ?? ''}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                        {member.phoneHref ? (
                          <a
                            href={member.phoneHref}
                            className="rounded border border-brand-strong bg-brand/30 px-1.5 py-0.5 font-semibold text-brand-tint"
                          >
                            📞 {member.phone}
                          </a>
                        ) : null}
                        {member.startTime ? (
                          <span className="rounded border border-line bg-raised px-1.5 py-0.5 text-slate-400">
                            from {member.startTime}
                          </span>
                        ) : null}
                      </div>
                      {member.deliverables.length > 0 ? (
                        <p className="mt-1 text-[10px] text-slate-400">
                          {member.deliverables.join(' · ')}
                        </p>
                      ) : null}
                      {member.notes ? (
                        <p className="mt-0.5 text-[10px] text-slate-500">{member.notes}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}

          {showVenue && venue ? (
            <Card title="Venue access" icon="📍">
              <div className="grid gap-2 text-[11px] sm:grid-cols-2">
                {visibility.venueAddress && venue.address ? (
                  <div className="sm:col-span-2">
                    <Row label="Address" value={venue.address} />
                  </div>
                ) : null}
                {visibility.venueMaps && venue.mapsUrl ? (
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="uppercase tracking-wider text-slate-500">Maps</span>
                    <a
                      href={venue.mapsUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded border border-brand-strong bg-brand/30 px-2 py-1 font-semibold text-brand-tint"
                    >
                      Open in Maps
                    </a>
                  </div>
                ) : null}
                {visibility.venueManager && venue.manager?.name ? (
                  <Row
                    label="Manager"
                    value={
                      venue.manager.phoneHref
                        ? `${venue.manager.name} · ${venue.manager.phone}`
                        : venue.manager.name
                    }
                  />
                ) : null}
                {visibility.venueInstallation && venue.installation ? (
                  <>
                    <Row
                      label="Access window"
                      value={
                        venue.installation.windowStart || venue.installation.windowEnd
                          ? `${venue.installation.windowStart ?? '—'}–${venue.installation.windowEnd ?? '—'}`
                          : '—'
                      }
                    />
                    <Row
                      label="Load-in"
                      value={
                        venue.installation.loadInMinutes != null
                          ? `${venue.installation.loadInMinutes} min`
                          : '—'
                      }
                    />
                    {venue.installation.accessNotes ? (
                      <div className="sm:col-span-2">
                        <Row label="Access" value={venue.installation.accessNotes} />
                      </div>
                    ) : null}
                  </>
                ) : null}
                {visibility.venueParking && venue.installation?.parking ? (
                  <div className="sm:col-span-2">
                    <Row label="Parking" value={venue.installation.parking} />
                  </div>
                ) : null}
                {visibility.notes && venue.notes ? (
                  <div className="sm:col-span-2">
                    <Row label="Notes" value={venue.notes} />
                  </div>
                ) : null}
              </div>
              {visibility.venueManager && venue.manager?.phoneHref ? (
                <a
                  href={venue.manager.phoneHref}
                  className="mt-2 inline-flex items-center gap-1 rounded border border-brand-strong bg-brand/30 px-2 py-1 text-[10px] font-semibold text-brand-tint"
                >
                  📞 Call venue manager
                </a>
              ) : null}
            </Card>
          ) : null}

          {visibility.timeline ? (
            <Card title="Read-only timeline" icon="📋">
              {timeline.length === 0 ? (
                <p className="text-xs text-slate-400">No steps in this cartridge.</p>
              ) : (
                <ol className="space-y-1.5">
                  {timeline.map((entry) => {
                    const status = entry.isDone
                      ? 'done'
                      : entry.isActive
                        ? 'active'
                        : entry.index === activeIndex + 1
                          ? 'next'
                          : 'planned';
                    const meta = STEP_STATUS[status];
                    return (
                      <li
                        key={entry.step.id}
                        className={`flex flex-wrap items-center justify-between gap-2 rounded border px-2.5 py-2 ${
                          entry.isActive ? 'border-brand-strong bg-brand/20' : 'border-line bg-page'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-heading text-xs font-semibold text-ink">
                            {entry.step.title}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">
                            📍 {entry.step.location} · {entry.step.durationMin} min
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 font-mono text-[10px]">
                          <span className="text-slate-300">
                            {entry.projectedStart ?? '—'}–{entry.projectedEnd ?? '—'}
                          </span>
                          <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${meta.chip}`}>
                            {meta.label}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-line bg-card px-4 py-2 text-center font-mono text-[11px] text-slate-500">
        Read-only photographer view · shot plans, light windows and Oczepini cues
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
    >
      {compactContent}
    </RoleShell>
  );
}
