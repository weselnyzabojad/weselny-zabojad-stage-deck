import { useMemo, useState } from 'react';
import { getSyncConfig } from '../lib/sync/syncConfig.js';
import { searchSongMetadata } from '../lib/songRequests.js';
import { useI18n } from '../i18n/useI18n.js';

export default function MusicianSuggestionForm({
  suggestions = [],
  timeline = [],
  loading = false,
  error = null,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const { t } = useI18n();
  const config = useMemo(() => getSyncConfig(), []);
  const [song, setSong] = useState('');
  const [artist, setArtist] = useState('');
  const [note, setNote] = useState('');
  const [stepId, setStepId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [lookup, setLookup] = useState({ state: 'idle', suggestions: [] });

  const pending = suggestions.filter((item) => item.status !== 'played');
  const played = suggestions.filter((item) => item.status === 'played');

  const reset = () => {
    setSong('');
    setArtist('');
    setNote('');
    setStepId('');
    setEditingId(null);
    setFormError('');
    setLookup({ state: 'idle', suggestions: [] });
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setSong(item.song ?? '');
    setArtist(item.artist ?? '');
    setNote(item.note ?? '');
    setStepId(item.step_id ?? '');
    setFormError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!song.trim() || !artist.trim()) {
      setFormError(t('musician.form.required'));
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const fields = { song, artist, note, stepId };
      if (editingId) await onUpdate?.(editingId, fields);
      else await onCreate?.(fields);
      reset();
    } catch (cause) {
      setFormError(cause?.message ?? t('musician.form.error'));
    } finally {
      setSaving(false);
    }
  };

  const findMetadata = async () => {
    setLookup({ state: 'searching', suggestions: [] });
    const result = await searchSongMetadata({ config, song, artist });
    setLookup({
      state: result.unavailable ? 'unavailable' : 'done',
      suggestions: result.suggestions ?? [],
    });
  };

  return (
    <section aria-labelledby="musician-form-title" className="rounded-xl border border-line bg-card p-4 shadow-lg">
      <h2 id="musician-form-title" className="font-heading text-xs font-bold uppercase tracking-widest text-ink">
        {t('musician.form.title')}
      </h2>
      <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={submit}>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-muted">
          {t('musician.form.song')}
          <input
            value={song}
            onChange={(event) => setSong(event.target.value)}
            required
            maxLength={120}
            className="rounded-lg border border-line bg-page px-2.5 py-2 text-xs text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-muted">
          {t('musician.form.artist')}
          <input
            value={artist}
            onChange={(event) => setArtist(event.target.value)}
            required
            maxLength={120}
            className="rounded-lg border border-line bg-page px-2.5 py-2 text-xs text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-muted">
          {t('musician.form.step')}
          <select
            value={stepId}
            onChange={(event) => setStepId(event.target.value)}
            className="rounded-lg border border-line bg-page px-2.5 py-2 text-xs text-ink"
          >
            <option value="">{t('musician.form.anyStep')}</option>
            {timeline.map((entry) => (
              <option key={entry.step.id} value={entry.step.id}>
                {entry.step.time} · {entry.step.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-muted">
          {t('musician.form.note')}
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            className="rounded-lg border border-line bg-page px-2.5 py-2 text-xs text-ink"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <button
            type="button"
            onClick={() => void findMetadata()}
            className="min-h-11 rounded-lg border border-line bg-raised px-3 py-2 text-[11px] font-semibold text-ink"
          >
            {t('musician.form.lookup')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-lg border border-brand-strong bg-brand px-3 py-2 text-[11px] font-bold text-on-accent disabled:opacity-60"
          >
            {editingId ? t('musician.form.save') : t('musician.form.add')}
          </button>
          {editingId ? (
            <button type="button" onClick={reset} className="min-h-11 rounded-lg border border-line px-3 py-2 text-[11px] text-ink">
              {t('musician.form.cancel')}
            </button>
          ) : null}
          {lookup.state === 'unavailable' ? (
            <span className="text-[10px] text-muted">{t('musician.form.lookupUnavailable')}</span>
          ) : null}
        </div>
        {lookup.suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 sm:col-span-2">
            {lookup.suggestions.map((suggestion) => (
              <button
                key={`${suggestion.title}-${suggestion.artist}`}
                type="button"
                onClick={() => {
                  setSong(suggestion.title ?? '');
                  setArtist(suggestion.artist ?? '');
                  setLookup({ state: 'done', suggestions: [] });
                }}
                className="rounded-full border border-line bg-page px-2.5 py-1 text-[10px] text-ink"
              >
                {suggestion.title} — {suggestion.artist}
              </button>
            ))}
          </div>
        ) : null}
        {formError ? (
          <p role="alert" className="text-[11px] text-alert-soft sm:col-span-2">
            {formError}
          </p>
        ) : null}
      </form>

      {loading ? <p className="mt-3 text-[11px] text-muted">{t('musician.preferred.loading')}</p> : null}
      {error ? (
        <p role="alert" className="mt-3 text-[11px] text-alert-soft">
          {t('musician.preferred.error')}
        </p>
      ) : null}

      {pending.length > 0 ? (
        <ul className="mt-3 grid gap-1.5">
          {pending.map((item) => (
            <li key={item.id} className="rounded-lg border border-line/70 bg-page/50 p-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink">
                    {item.song}
                    {item.artist ? <span className="font-normal text-muted"> — {item.artist}</span> : null}
                  </p>
                  {item.note ? <p className="text-[10px] text-muted">{item.note}</p> : null}
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => startEdit(item)} className="min-h-11 rounded-lg border border-line px-2.5 py-1 text-[10px] text-ink">
                    {t('musician.form.edit')}
                  </button>
                  <button type="button" onClick={() => void onDelete?.(item.id)} className="min-h-11 rounded-lg border border-alert/50 px-2.5 py-1 text-[10px] text-alert-soft">
                    {t('musician.form.delete')}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {played.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-muted">
            {t('musician.preferred.played', { count: played.length })}
          </summary>
          <ul className="mt-1.5 grid gap-1.5">
            {played.map((item) => (
              <li key={item.id} className="rounded-lg border border-line/70 bg-page/50 p-2.5 text-xs text-muted">
                {item.song} — {item.artist}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
