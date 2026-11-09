import logo from '../assets/img/logo.png';
import ChildrenExpectedBadge from './ChildrenExpectedBadge';
import CulturalRulesBar from './CulturalRulesBar';
import GroupPhotoChecklist from './GroupPhotoChecklist';
import MiniSessionTwinTask from './MiniSessionTwinTask';
import useCompact from '../hooks/useCompact';
import OczepinyCueCard from './OczepinyCueCard';
import RoleShell from './RoleShell';
import SecondaryControlBar from './SecondaryControlBar';
import SpeechesChip from './SpeechesChip';
import SyncStatusBadge from './SyncStatusBadge';
import TimelineFocusStack from './TimelineFocusStack';
import TopBarCenterIdentity from './TopBarCenterIdentity';
import TopBarClock from './TopBarClock';
import TopBarRoleIdentity from './TopBarRoleIdentity';
import TopBarShell from './TopBarShell';
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
  resolveMiniSessionTwinStepId,
  resolvePhotoPlan,
  resolvePhotoVisibility,
  resolveSunset,
} from '../lib/photoPlan.js';

const SUNSET_STATUS = {
  LIVE: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
  STALE: 'border-amber-700 bg-amber-950/60 text-amber-200',
  UNAVAILABLE: 'border-[#ED2939]/60 bg-[#ED2939]/20 text-[#ff808a]',
};

function isEventDay(date, eventDateISO, timeZone) {
  if (!eventDateISO) return false;
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date) === eventDateISO;
  } catch {
    return false;
  }
}

// A mini session is complete only when its real window ended on the event day.
// A stale/old event date must not hide the sunset card.
function miniSessionCompleted(now, end, eventDateISO, timeZone) {
  return Boolean(
    end &&
      now.getTime() > end.getTime() &&
      isEventDay(now, eventDateISO, timeZone),
  );
}

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

function Row({ label, value, tone = 'text-ink' }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[11px]">
      <span className="shrink-0 uppercase tracking-wider text-muted">{label}</span>
      <span className={`text-right font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

function DeferredBadge({ children }) {
  return (
    <span className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[9px] text-muted">
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
            <Row label="Groups" value={data.groups?.length ?? 0} />
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
            {data.description ? <p className="text-ink">{data.description}</p> : null}
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
              <p className="text-muted">{data.description}</p>
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
      className="mx-auto mt-2 flex max-w-xl flex-wrap items-center justify-center gap-2 rounded-lg border border-line bg-page p-2 text-center"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const time = String(form.get('miniTime') ?? '').trim();
        if (time) onSave?.(time);
      }}
    >
      <label className="text-[10px] uppercase tracking-wider text-muted">
        Chosen mini-session hour
        <input
          type="time"
          name="miniTime"
          defaultValue={value ?? ''}
          className="mt-0.5 block rounded border border-line bg-card px-2 py-1 font-mono text-xs text-ink"
        />
      </label>
      <button
        type="submit"
        className="rounded border border-brand-strong bg-brand/40 px-2 py-1 text-[10px] font-semibold text-ink"
      >
        Save for all media
      </button>
      {value ? (
        <span className="font-mono text-[10px] text-emerald-300">
          Shared override: {value}
        </span>
      ) : (
        <p className="w-full text-[10px] text-amber-300">
          Unscheduled — choose the hour to place the mini session on the timeline.
        </p>
      )}
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
  pin = null,
  roomCode = null,
  culturalRules = null,
  oczepinyStatus = null,
  speeches = [],
  speechMode = 'OFF',
  activeSpeechId = null,
  authControl = null,
  mediaOverrides = {},
  onMiniSessionOverride,
  checkedSubtasks = {},
  onToggleSubtask,
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
  const miniSessionDone = miniSessionCompleted(now, miniSessionEnd, eventDateISO, timeZone);
  const miniTwinStepId = resolveMiniSessionTwinStepId(timeline, miniSessionOverride);
  const planByStep = mapPhotoPlanToSteps(plan, timeline);
  const planBodies = Object.fromEntries(
    Object.entries(planByStep).map(([stepId, entries]) => {
      const groupEntry = entries.find((entry) => entry.type === 'groupPhotos');
      const otherEntries = entries.filter(
        (entry) => entry.type !== 'groupPhotos' && entry.type !== 'miniSession',
      );
      return [
        stepId,
        <div key={stepId} className="space-y-2">
          {groupEntry ? (
            <GroupPhotoChecklist
              groups={groupEntry.data.groups}
              location={groupEntry.data.location}
              mediaTeam={wedding?.mediaTeam}
              checked={checkedSubtasks}
              onToggle={onToggleSubtask}
            />
          ) : null}
          {otherEntries.length > 0 ? <PhotoPlanDetails entries={otherEntries} /> : null}
        </div>,
      ];
    }),
  );
  const oczepinyStep = timeline.find(
    (entry) =>
      entry?.step?.optionalFlag === 'oczepiny' || /oczepiny/i.test(entry?.step?.title ?? ''),
  );
  const cueBodies = { ...planBodies };
  if (miniTwinStepId && plan?.miniSession) {
    const twinTask = (
      <MiniSessionTwinTask
        time={miniSessionOverride}
        durationMin={miniSessionDuration}
        location={plan.miniSession.location}
        backupLocation={plan.miniSession.backupLocation}
      />
    );
    cueBodies[miniTwinStepId] = (
      <div className="space-y-2">
        {twinTask}
        {cueBodies[miniTwinStepId] ?? null}
      </div>
    );
  }
  if (oczepinyStep?.step?.id) {
    cueBodies[oczepinyStep.step.id] = (
      <div className="space-y-2">
        {planBodies[oczepinyStep.step.id] ?? null}
        <OczepinyCueCard wedding={wedding} audience="photo" />
      </div>
    );
  }

  const activeIndex = timeline.findIndex((entry) => entry.isActive);

  const sunsetSeconds = secondsUntil(countdowns.sunsetAt, now);
  const goldenSeconds = secondsUntil(countdowns.goldenHourAt, now);
  const latestStartSeconds = secondsUntil(countdowns.latestMiniStartAt, now);

  const isCompact = useCompact();

  // Compact (phone) read-only content: step timeline and light windows.
  const compactContent = (
    <div id="main-content" tabIndex={-1} className="space-y-4">
      <SkipLink />
      <TimelineFocusStack
        compact
        entries={timeline}
        activeIndex={activeIndex}
        entryBodies={cueBodies}
      />

      {visibility.sunset && !miniSessionDone ? (
        <Card title="Light windows" icon="🌅">
          {!sunset?.usable ? (
            <div className="rounded-lg border border-[#ED2939]/50 bg-[#ED2939]/10 p-3 text-sm text-alert-tint">
              <p className="font-semibold">Sunset unavailable — check connection.</p>
              <p className="mt-1 text-[11px] text-muted">
                The card stays visible; refresh the cartridge after the online lookup succeeds.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-line bg-page p-2.5">
                  <div className="text-[9px] uppercase tracking-wider text-muted">Sunset</div>
                  <div className="font-mono text-xl font-bold text-ink">{sunset.sunsetTime ?? '—'}</div>
                  <div className="font-mono text-[10px] text-muted">{countdownText(sunsetSeconds) ?? '—'}</div>
                </div>
                <div className="rounded-lg border border-line bg-page p-2.5">
                  <div className="text-[9px] uppercase tracking-wider text-muted">Golden hour</div>
                  <div className="font-mono text-xl font-bold text-ink">{sunset.goldenHourStart ?? '—'}</div>
                  <div className="font-mono text-[10px] text-muted">{countdownText(goldenSeconds) ?? '—'}</div>
                </div>
                <div className="rounded-lg border border-line bg-page p-2.5">
                  <div className="text-[9px] uppercase tracking-wider text-muted">Civil twilight</div>
                  <div className="font-mono text-xl font-bold text-ink">{sunset.civilTwilightEnd ?? '—'}</div>
                </div>
                <div className="rounded-lg border border-line bg-page p-2.5">
                  <div className="text-[9px] uppercase tracking-wider text-muted">Mini latest start</div>
                  <div className="font-mono text-xl font-bold text-ink">
                    {countdowns.latestMiniStartAt ? formatTimeOfDay(countdowns.latestMiniStartAt, timeZone) : '—'}
                  </div>
                  <div className="font-mono text-[10px] text-muted">{countdownText(latestStartSeconds) ?? '—'}</div>
                </div>
              </div>
              <MiniSessionOverride
                value={miniSessionOverride}
                onSave={onMiniSessionOverride}
              />
            </>
          )}
        </Card>
      ) : null}


    </div>
  );

  const wideContent = (
    <div className="flex min-h-screen flex-col bg-page text-ink antialiased select-none">
      <SkipLink />
      <TopBarShell
        left={(
          <>
            <div className="flex items-center justify-center rounded-lg bg-white px-2 py-1 shadow-md">
              <img src={logo} alt="Weselny Żabojad" className="h-12 w-auto object-contain" />
            </div>
            <TopBarClock clock={clock} />
            <TopBarRoleIdentity role={role} />
          </>
        )}
        center={<TopBarCenterIdentity wedding={wedding} />}
        right={(
          <>
            {culturalRules ? (
              <CulturalRulesBar rules={culturalRules} oczepinyStatus={oczepinyStatus} />
            ) : null}
            <SpeechesChip
              mode={speechMode}
              speeches={speeches}
              activeSpeechId={activeSpeechId}
            />
          </>
        )}
      />

      <SecondaryControlBar
        left={(
          <>
            <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} outbox={outbox} />
            {authControl}
          </>
        )}
        center={(
          <ChildrenExpectedBadge wedding={wedding} role={role} inline />
        )}
        right={(
          <>
            <OpenOnPhoneButton role={role} roomCode={roomCode} />
            <LanguageToggle />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
          </>
        )}
      />

      <main id="main-content" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="w-full space-y-4">
          <TimelineFocusStack
            entries={timeline}
            activeIndex={activeIndex}
            entryBodies={cueBodies}
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
                  <p className="mt-1 text-[11px] text-muted">
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
                      <div className="text-[9px] uppercase tracking-wider text-muted">Sunset</div>
                      <div className="font-mono text-xl font-bold text-ink">
                        {sunset.sunsetTime ?? '—'}
                      </div>
                      <div className="font-mono text-[10px] text-muted">
                        {countdownText(sunsetSeconds) ?? '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-line bg-page p-2.5">
                      <div className="text-[9px] uppercase tracking-wider text-muted">
                        Golden hour
                      </div>
                      <div className="font-mono text-xl font-bold text-ink">
                        {sunset.goldenHourStart ?? '—'}
                      </div>
                      <div className="font-mono text-[10px] text-muted">
                        {countdownText(goldenSeconds) ?? '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-line bg-page p-2.5">
                      <div className="text-[9px] uppercase tracking-wider text-muted">
                        Civil twilight
                      </div>
                      <div className="font-mono text-xl font-bold text-ink">
                        {sunset.civilTwilightEnd ?? '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-line bg-page p-2.5">
                      <div className="text-[9px] uppercase tracking-wider text-muted">
                        Mini session latest start
                      </div>
                      <div className="font-mono text-xl font-bold text-ink">
                        {countdowns.latestMiniStartAt
                          ? formatTimeOfDay(countdowns.latestMiniStartAt, timeZone)
                          : '—'}
                      </div>
                      <div className="font-mono text-[10px] text-muted">
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
                  <p className="mt-2 text-[10px] text-muted">
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

      <footer className="border-t border-line bg-card px-4 py-2 text-center font-mono text-[11px] text-muted">
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
      clock={clock}
      pin={pin}
      wedding={wedding}
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
      childrenExpected={wedding?.childrenExpected === true}
      childrenRole={role}
      authControl={authControl}
    >
      {compactContent}
    </RoleShell>
  );
}
