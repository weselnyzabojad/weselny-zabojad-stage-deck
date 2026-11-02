import { formatClock } from '../lib/liveStageState';
import { STAGE_PINGS, STAGE_PING_ORDER } from '../lib/stagePings';

const BUTTON_STYLES = {
  drop_track:
    'border-[#3b5bdb] bg-[#002395]/40 text-white shadow hover:bg-[#002395]/70 active:bg-[#00186b]',
  fade_music:
    'border-[#2b3d73] bg-[#111d3b] text-slate-200 hover:bg-[#1c2a52] active:bg-[#0b132b]',
  hold_2m:
    'border-amber-700 bg-amber-950/50 text-amber-200 hover:bg-amber-900/60 active:bg-amber-950',
  ready:
    'border-emerald-700 bg-emerald-950/50 text-emerald-200 hover:bg-emerald-900/60 active:bg-emerald-950',
};

function deliveryHint(status) {
  switch (status) {
    case 'connected':
      return { text: 'Cloud synced · the DJ Booth will flash this cue.', tone: 'text-emerald-300' };
    case 'connecting':
      return { text: 'Connecting · the cue is saved and will sync shortly.', tone: 'text-amber-300' };
    case 'disabled':
      return {
        text: 'Local only · cloud sync is needed to reach the DJ device.',
        tone: 'text-slate-500',
      };
    default:
      return {
        text: 'Saved locally · will sync when the room reconnects.',
        tone: 'text-amber-300',
      };
  }
}

// One-tap silent MC cues. The parent only renders this when the wedding is in
// HOST_AND_DJ mode, so HOST_ONLY keeps the dashboard free of DJ controls.
export default function StagePingControls({ onSend, lastPing, syncStatus }) {
  const meta = lastPing ? STAGE_PINGS[lastPing.type] : null;
  const sentAt = lastPing ? new Date(lastPing.sent_at) : null;
  const sentClock = sentAt && Number.isFinite(sentAt.getTime()) ? formatClock(sentAt) : null;
  const hint = deliveryHint(syncStatus);

  return (
    <div className="flex-1 rounded-xl border border-[#1c2a52] bg-[#0b132b]/95 p-4 shadow-lg">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-white">
          📡 Silent Stage Pings
        </h3>
        <span className="rounded border border-[#2b3d73] bg-[#111d3b] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-slate-400">
          1-tap · silent
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {STAGE_PING_ORDER.map((type) => {
          const ping = STAGE_PINGS[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => onSend(type)}
              title={ping.hint}
              aria-label={`Send ${ping.label} ping to the DJ`}
              className={`flex items-center justify-center gap-1.5 rounded border p-2 text-center text-xs font-semibold transition active:scale-95 ${BUTTON_STYLES[type]}`}
            >
              <span aria-hidden="true">{ping.icon}</span>
              <span>{ping.label}</span>
            </button>
          );
        })}
      </div>

      <div role="status" aria-live="polite" className="mt-2 text-[11px] leading-snug">
        {meta && sentClock ? (
          <>
            <span className="text-slate-400">Last ping:</span>{' '}
            <strong className="text-white">
              {meta.icon} {meta.label}
            </strong>{' '}
            <span className="font-mono text-slate-500">· {sentClock}</span>
            <div className={`mt-0.5 ${hint.tone}`}>{hint.text}</div>
          </>
        ) : (
          <span className="text-slate-500">Tap a cue to flash it on the DJ Booth screen.</span>
        )}
      </div>
    </div>
  );
}
