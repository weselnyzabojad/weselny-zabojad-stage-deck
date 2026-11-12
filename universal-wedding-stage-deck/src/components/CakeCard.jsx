import { useI18n } from '../i18n/useI18n.js';
import { desktopTone } from '../lib/topBarStyles.js';

const STATE_CHIPS = {
  done: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
  next: 'border-amber-800 bg-amber-950/60 text-amber-200',
  planned: 'border-line-strong bg-raised text-muted',
};

const STATE_LABELS = {
  done: 'DONE',
  next: 'NEXT',
  planned: 'PLANNED',
};

function SparklersChip({ sparklers }) {
  if (sparklers !== true) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-heading text-[11px] font-bold uppercase tracking-wide ${desktopTone('positive')}`}
    >
      <span aria-hidden="true">✨</span>
      <span>Sparklers ON</span>
    </span>
  );
}

function SyncNote({ cake, compact }) {
  if (cake.songConflict) {
    return (
      <p
        className={`rounded border border-amber-800 bg-amber-950/60 px-1.5 py-1 text-amber-200 ${
          compact ? 'mt-1 text-[9px]' : 'mt-1 text-[10px]'
        }`}
      >
        `cake.cuttingSong` differs from the Key Songs entry — using the Key Songs song.
      </p>
    );
  }

  if (cake.songSource === 'importantSongs') {
    return (
      <p className={compact ? 'text-[9px] text-muted' : 'text-[10px] text-muted'}>
        🔗 Synced with the DJ Key Songs card
      </p>
    );
  }

  return null;
}

// Cake protocol card (TODO 6). Shared by the MC dashboard and Pocket Remote.
// `cake` comes from `resolveCakeProtocol`, which prefers the CAKE entry in
// `musicPolicy.importantSongs[]` so this card and the Key Songs card agree.
export default function CakeCard({ cake, compact = false, cakeServiceMode = 'KITCHEN_RETURN' }) {
  const { t } = useI18n();
  if (!cake?.hasData) return null;

  const song = cake.song || 'Song TBC';
  const serviceModeLabel = t(`mandatory.cakeMode.${cakeServiceMode}`);
  const hasState = Boolean(cake.stepId);
  const showState = hasState && Boolean(STATE_LABELS[cake.state]);

  if (compact) {
    return (
      <section
        aria-label="Cake protocol"
        className="rounded-xl border border-amber-700/50 bg-card p-3 shadow-lg"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-heading text-[10px] font-semibold uppercase tracking-widest text-amber-200">
            🎂 Cake
          </span>
        </div>
        <div className="mt-1 font-heading text-sm font-semibold leading-tight text-ink">
          {song}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="rounded border border-line-strong bg-raised px-2 py-1 text-xs font-semibold text-ink">
            {t('mandatory.cake')}: <strong className="text-ink">{serviceModeLabel}</strong>
          </span>
          <SparklersChip sparklers={cake.sparklers} />
          {showState ? (
            <span
              className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${STATE_CHIPS[cake.state]}`}
            >
              {STATE_LABELS[cake.state]}
            </span>
          ) : null}
        </div>
        <SyncNote cake={cake} compact />
      </section>
    );
  }

  return (
    <section
      aria-labelledby="cake-protocol-title"
      className="rounded-xl border border-amber-700/50 bg-card p-4 shadow-lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="cake-protocol-title"
          className="font-heading text-xs font-bold uppercase tracking-widest text-amber-200"
        >
          🎂 Cake protocol
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {showState ? (
            <span
              className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${STATE_CHIPS[cake.state]}`}
            >
              {STATE_LABELS[cake.state]}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2 font-heading text-sm font-semibold leading-tight text-ink">
        {song}
      </div>
      <SyncNote cake={cake} />

      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
        <span className="rounded border border-line-strong bg-raised px-2 py-1 text-xs font-semibold text-ink">
          {t('mandatory.cake')}: <strong className="text-ink">{serviceModeLabel}</strong>
        </span>
        <SparklersChip sparklers={cake.sparklers} />
      </div>
    </section>
  );
}
