import logo from '../assets/img/logo.png';
import CoupleIdentity from './CoupleIdentity';
import SyncStatusBadge from './SyncStatusBadge';
import ThemeToggle from './ThemeToggle';
import {
  formatDuration,
  resolveEventDateISO,
  resolveVenueTimeZone,
} from '../lib/eventTime.js';
import { speechTiming } from '../lib/speeches.js';

function TimerChip({ value, tone }) {
  return (
    <span
      className={`rounded border px-2 py-1 font-mono text-xs font-semibold ${tone}`}
    >
      {value}
    </span>
  );
}

const FALLBACK_NOW = new Date(0);

// Dedicated "Speech text - script" view (TODO 8). Read-only, high-contrast and
// large-text; it shows only the speech the MC has made live, never the timeline
// controls, VIP alerts or other speeches.
export default function SpeakerView({
  wedding,
  clock,
  speechMode = 'OFF',
  speechCount = 0,
  activeSpeech,
  syncStatus,
  syncError,
  remoteUpdatedAt,
  theme = 'night',
  onToggleTheme,
  onExit,
  canExit = false,
}) {
  const now = clock?.now instanceof Date ? clock.now : FALLBACK_NOW;
  const eventDateISO = resolveEventDateISO(wedding);
  const timeZone = resolveVenueTimeZone(wedding);
  const timing = activeSpeech
    ? speechTiming(activeSpeech, { now, eventDateISO, timeZone })
    : null;

  const started = timing?.startsInSec != null && timing.startsInSec <= 0;
  const overrun = timing?.remainingSec != null && timing.remainingSec < 0;

  return (
    <div className="flex min-h-screen flex-col bg-page text-slate-100 antialiased select-none">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg bg-white px-2 py-1 shadow-md">
            <img src={logo} alt="Weselny Żabojad" className="h-10 w-auto object-contain" />
          </div>
          <div>
            <div className="font-heading text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-soft">
              🗣️ Speaker · Speech text — script
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CoupleIdentity wedding={wedding} className="text-sm" />
              <span className="font-body text-xs font-normal text-slate-400">{wedding.date}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} />
          {canExit ? (
            <button
              type="button"
              onClick={onExit}
              className="rounded border border-line bg-raised px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:border-line-strong"
            >
              Exit
            </button>
          ) : null}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-5">
        {speechMode === 'OFF' ? (
          <section className="rounded-2xl border border-line bg-card p-6 text-center">
            <div className="text-4xl" aria-hidden="true">
              🔇
            </div>
            <h1 className="mt-2 font-heading text-xl font-bold text-ink">Speeches are off</h1>
            <p className="mt-1 text-sm text-slate-400">
              This wedding cartridge has <span className="font-mono">speechMode: OFF</span>.
            </p>
          </section>
        ) : speechCount === 0 ? (
          <section className="rounded-2xl border border-line bg-card p-6 text-center">
            <div className="text-4xl" aria-hidden="true">
              📝
            </div>
            <h1 className="mt-2 font-heading text-xl font-bold text-ink">No speeches yet</h1>
            <p className="mt-1 text-sm text-slate-400">
              The cartridge does not contain any speech scripts.
            </p>
          </section>
        ) : !activeSpeech ? (
          <section className="rounded-2xl border border-line bg-card p-6 text-center">
            <div className="text-4xl" aria-hidden="true">
              ⏳
            </div>
            <h1 className="mt-2 font-heading text-xl font-bold text-ink">
              Waiting for the MC
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Your speech will appear here when the MC makes it live. Only the assigned script is
              shown on this device.
            </p>
          </section>
        ) : !activeSpeech.speakerVisible ? (
          <section className="rounded-2xl border border-line bg-card p-6 text-center">
            <div className="text-4xl" aria-hidden="true">
              🔒
            </div>
            <h1 className="mt-2 font-heading text-xl font-bold text-ink">
              Script not shared
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              This speech is not visible to the speaker role. Ask the MC to share it with
              <span className="font-mono"> speaker</span>.
            </p>
          </section>
        ) : (
          <div className="space-y-4">
            <section className="rounded-2xl border border-brand-strong/50 bg-card p-4 shadow-lg">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-brand-soft">
                    Now speaking
                  </div>
                  <h1 className="mt-0.5 font-heading text-2xl font-bold text-ink">
                    {activeSpeech.speaker.name}
                  </h1>
                  {activeSpeech.speaker.relationship ? (
                    <div className="text-xs text-slate-400">{activeSpeech.speaker.relationship}</div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {!started ? (
                    <TimerChip
                      value={`Starts in ${formatDuration(timing?.startsInSec ?? 0)}`}
                      tone="border-cyan-800 bg-cyan-950/60 text-cyan-200"
                    />
                  ) : overrun ? (
                    <TimerChip
                      value={`Over ${formatDuration(timing.remainingSec)}`}
                      tone="border-alert/60 bg-alert/20 text-alert-tint"
                    />
                  ) : timing?.remainingSec != null ? (
                    <TimerChip
                      value={`${formatDuration(timing.remainingSec)} left`}
                      tone="border-emerald-800 bg-emerald-950/60 text-emerald-300"
                    />
                  ) : activeSpeech.durationMin != null ? (
                    <TimerChip
                      value={`${activeSpeech.durationMin} min`}
                      tone="border-line-strong bg-raised text-slate-300"
                    />
                  ) : null}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                {activeSpeech.time ? (
                  <span className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-slate-300">
                    🕒 {activeSpeech.time}
                  </span>
                ) : null}
                {activeSpeech.cue ? (
                  <span className="rounded border border-brand-strong bg-brand/30 px-1.5 py-0.5 text-brand-tint">
                    Cue: {activeSpeech.cue}
                  </span>
                ) : null}
                {activeSpeech.mic ? (
                  <span className="rounded border border-line bg-raised px-1.5 py-0.5 text-slate-300">
                    🎙 {activeSpeech.mic}
                  </span>
                ) : null}
                {activeSpeech.language ? (
                  <span className="rounded border border-line bg-raised px-1.5 py-0.5 text-slate-300">
                    {activeSpeech.language}
                  </span>
                ) : null}
                {activeSpeech.delivery ? (
                  <span className="rounded border border-line bg-raised px-1.5 py-0.5 text-slate-300">
                    {activeSpeech.delivery}
                  </span>
                ) : null}
                {activeSpeech.mcIntro ? (
                  <span className="rounded border border-line bg-raised px-1.5 py-0.5 text-slate-300">
                    MC introduces
                  </span>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-card p-4 shadow-lg sm:p-6">
              {activeSpeech.script.text ? (
                <div className="whitespace-pre-wrap font-body text-lg leading-relaxed text-ink sm:text-xl sm:leading-relaxed">
                  {activeSpeech.script.text}
                </div>
              ) : (
                <div className="rounded-xl border border-amber-800 bg-amber-950/40 p-4 text-center">
                  <p className="font-heading text-sm font-semibold text-amber-200">
                    Script not provided yet
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Check with the MC; the text can still be added to the cartridge.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="border-t border-line bg-card px-4 py-2 text-center font-mono text-[10px] text-slate-500">
        Read-only script · only the assigned speech is shown · no timeline controls
      </footer>
    </div>
  );
}
