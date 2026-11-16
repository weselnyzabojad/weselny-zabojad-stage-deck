import { instrumentLabel } from '../lib/instruments.js';
import { useI18n } from '../i18n/useI18n.js';

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function isMainSongDuplicate(suggestion, mainSongs) {
  const song = normalize(suggestion.song);
  const artist = normalize(suggestion.artist);
  return (mainSongs ?? []).some(
    (item) => normalize(item.title) === song && normalize(item.artist) === artist,
  );
}

export default function MusicianPreferredMusic({
  suggestions = [],
  musicians = [],
  mainSongs = [],
  timeline = [],
  loading = false,
  error = null,
  onMarkPlayed = null,
}) {
  const { t, locale } = useI18n();
  const byId = new Map((musicians ?? []).map((musician) => [musician.id, musician]));
  const stepTitle = new Map(
    (timeline ?? []).map((entry) => [entry?.step?.id, entry?.step?.title]),
  );
  const pending = suggestions.filter((item) => item.status !== 'played');
  const played = suggestions.filter((item) => item.status === 'played');

  const renderRow = (item, playedRow = false) => {
    const musician = byId.get(item.musician_id);
    const name = musician?.name ?? t('musician.preferred.unknownAuthor');
    const instrument = musician?.instrument
      ? instrumentLabel(musician.instrument, locale)
      : null;
    const duplicate = !playedRow && isMainSongDuplicate(item, mainSongs);
    return (
      <li
        key={item.id}
        className="flex flex-col gap-1 rounded-lg border border-line/70 bg-page/50 p-2.5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            <p className="break-words text-xs font-semibold text-ink">
              {item.song}
              {item.artist ? <span className="font-normal text-muted"> — {item.artist}</span> : null}
            </p>
            <p className="text-[10px] text-muted">
              {name}
              {instrument ? ` · ${instrument}` : ''}
              {item.step_id && stepTitle.get(item.step_id)
                ? ` · ${stepTitle.get(item.step_id)}`
                : ''}
            </p>
          </div>
          {!playedRow && onMarkPlayed ? (
            <button
              type="button"
              onClick={() => void onMarkPlayed(item.id)}
              className="min-h-11 shrink-0 rounded-lg border border-line-strong bg-raised px-2.5 py-1.5 text-[10px] font-bold text-ink transition hover:bg-line"
            >
              {t('musician.preferred.markPlayed')}
            </button>
          ) : null}
        </div>
        {item.note ? <p className="break-words text-[10px] text-muted">{item.note}</p> : null}
        {duplicate ? (
          <p className="text-[10px] font-semibold text-amber-300">
            {t('musician.preferred.duplicate')}
          </p>
        ) : null}
      </li>
    );
  };

  return (
    <section
      aria-labelledby="musician-preferred-title"
      className="rounded-xl border border-line bg-card/95 p-3 shadow-lg"
    >
      <h2
        id="musician-preferred-title"
        className="font-heading text-[10px] font-semibold uppercase tracking-widest text-emerald-300"
      >
        {t('musician.preferred.title', { count: pending.length })}
      </h2>
      {loading ? <p className="mt-2 text-[11px] text-muted">{t('musician.preferred.loading')}</p> : null}
      {error ? (
        <p role="alert" className="mt-2 text-[11px] text-alert-soft">
          {t('musician.preferred.error')}
        </p>
      ) : null}
      {!loading && !error && suggestions.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted">{t('musician.preferred.empty')}</p>
      ) : null}
      {pending.length > 0 ? (
        <ul className="mt-2 grid gap-1.5">{pending.map((item) => renderRow(item))}</ul>
      ) : null}
      {played.length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-muted">
            {t('musician.preferred.played', { count: played.length })}
          </summary>
          <ul className="mt-1.5 grid gap-1.5">{played.map((item) => renderRow(item, true))}</ul>
        </details>
      ) : null}
    </section>
  );
}
