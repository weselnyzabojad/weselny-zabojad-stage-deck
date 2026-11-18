import { useCallback, useEffect, useState } from 'react';
import LanguageToggle from './LanguageToggle';
import { useI18n } from '../i18n/useI18n.js';
import { getSyncConfig } from '../lib/sync/syncConfig.js';
import { timingStatus } from '../lib/timingAnalytics.js';

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="font-heading text-lg font-bold text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-card/70 px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-ink">{value ?? '—'}</div>
    </div>
  );
}

function EmptyState({ title, body, onRetry = null, retryLabel = '' }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-5 text-center">
      <div aria-hidden="true" className="text-4xl">
        ✦
      </div>
      <h1 className="mt-4 font-heading text-2xl font-bold text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 min-h-11 rounded-full border border-brand-strong bg-brand px-5 py-2 text-sm font-bold text-on-accent print:hidden"
        >
          {retryLabel}
        </button>
      ) : null}
    </main>
  );
}

export default function WeddingRecapPage({ token }) {
  const { t } = useI18n();
  const [status, setStatus] = useState('loading');
  const [recap, setRecap] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    const config = getSyncConfig();
    if (!config.enabled) {
      setStatus('error');
      return;
    }
    try {
      const response = await fetch(`${config.functionsUrl}/recap`, {
        method: 'POST',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      if (response.status === 404 || response.status === 410) {
        setStatus('unavailable');
        return;
      }
      if (!response.ok) throw new Error(`Recap request failed (${response.status})`);
      const data = await response.json();
      if (!data?.recap) {
        setStatus('unavailable');
        return;
      }
      setRecap(data.recap);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- loads the private token payload
    void load();
  }, [load]);

  useEffect(() => {
    const previous = document.title;
    document.title = t('recap.title');
    let meta = document.head.querySelector('meta[name="robots"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, nofollow');
    return () => {
      document.title = previous;
      if (created) meta?.remove();
    };
  }, [t]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-5 text-sm text-muted">
        {t('recap.loading')}
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className="min-h-screen bg-page text-ink">
        <EmptyState
          title={t('recap.unavailable.title')}
          body={t('recap.unavailable.body')}
        />
      </div>
    );
  }

  if (status === 'error' || !recap) {
    return (
      <div className="min-h-screen bg-page text-ink">
        <EmptyState
          title={t('recap.error.title')}
          body={t('recap.error.body')}
          onRetry={() => void load()}
          retryLabel={t('recap.retry')}
        />
      </div>
    );
  }

  const summary = recap.summary ?? {};
  const music = recap.music ?? {};
  const mainSongs = Array.isArray(music.mainSongs) ? music.mainSongs : [];
  const mustPlay = Array.isArray(music.mustPlay) ? music.mustPlay : [];
  const doNotPlay = Array.isArray(music.doNotPlay) ? music.doNotPlay : [];
  const guestRequests = Array.isArray(music.guestRequests) ? music.guestRequests : [];
  const games = Array.isArray(recap.games) ? recap.games : [];
  const ceremony = Array.isArray(recap.ceremony) ? recap.ceremony : [];
  const mediaTeam = Array.isArray(recap.vendors?.mediaTeam) ? recap.vendors.mediaTeam : [];
  const musicians = Array.isArray(recap.vendors?.musicians) ? recap.vendors.musicians : [];
  const hasMusic = mainSongs.length + mustPlay.length + doNotPlay.length + guestRequests.length > 0;

  return (
    <div className="min-h-screen bg-page text-ink print:bg-white print:text-black">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-5 pb-4 pt-6 print:hidden">
        <span className="font-heading text-xs font-bold uppercase tracking-widest text-muted">
          Stage Deck
        </span>
        <div className="flex items-center gap-2">
          <LanguageToggle variant="desktop" />
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-10 rounded-full border border-line-strong bg-card px-4 py-2 text-xs font-bold text-ink"
          >
            {t('recap.print')}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-5 pb-12 print:max-w-none print:px-0">
        <section className="rounded-3xl border border-line bg-card/80 p-6 shadow-xl print:border-0 print:bg-white print:p-0 print:shadow-none sm:p-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            {t('recap.eyebrow')}
          </p>
          <h1 className="mt-3 font-heading text-3xl font-bold leading-tight text-ink sm:text-5xl">
            {recap.wedding?.couple ?? t('recap.title')}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {[recap.wedding?.date, recap.wedding?.venue].filter(Boolean).join(' · ')}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            {t('recap.subtitle')}
          </p>
        </section>

        <Section title={t('recap.numbers.title')}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat
              label={t('recap.numbers.completed')}
              value={t('recap.numbers.completed', {
                done: summary.completedSteps ?? 0,
                total: summary.totalSteps ?? 0,
              })}
            />
            <Stat label={t('recap.numbers.first')} value={summary.firstActualStart} />
            <Stat label={t('recap.numbers.last')} value={summary.lastActualStart} />
            <Stat
              label={t('recap.numbers.delay')}
              value={`${summary.biggestDelayMinutes ?? 0} min`}
            />
            <Stat label={t('recap.numbers.changes')} value={summary.scheduleChangeCount ?? 0} />
            <Stat label={t('recap.numbers.songs')} value={summary.songRequestCount ?? 0} />
            <Stat label={t('recap.numbers.games')} value={summary.gameCount ?? 0} />
            <Stat label={t('recap.numbers.ceremony')} value={summary.ceremonyPartCount ?? 0} />
          </div>
        </Section>

        {Array.isArray(recap.timeline) && recap.timeline.length > 0 ? (
          <Section title={t('recap.timeline.title')}>
            <div className="overflow-x-auto rounded-2xl border border-line bg-card/60 print:border-0">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-raised/70 text-[10px] uppercase tracking-wider text-muted print:bg-white">
                  <tr>
                    <th className="px-3 py-2">{t('recap.timeline.title')}</th>
                    <th className="px-3 py-2">{t('recap.timeline.planned')}</th>
                    <th className="px-3 py-2">{t('recap.timeline.actual')}</th>
                    <th className="px-3 py-2">{t('recap.timeline.drift')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recap.timeline.map((entry) => {
                    const timing = timingStatus(
                      entry.driftMinutes,
                      Boolean(entry.actualStart),
                    );
                    const tone =
                      timing === 'late'
                        ? 'text-red-300'
                        : timing === 'early'
                          ? 'text-sky-300'
                          : timing === 'on-time'
                            ? 'text-emerald-300'
                            : 'text-muted';
                    return (
                      <tr key={entry.id} className="border-t border-line/60">
                        <td className="px-3 py-2">
                          <div className="font-semibold text-ink">{entry.title}</div>
                          <div className="text-[10px] text-muted">
                            {t(`recap.timeline.status.${entry.status}`)}
                            {entry.location ? ` · ${entry.location}` : ''}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-muted">{entry.plannedStart ?? '—'}</td>
                        <td className="px-3 py-2 font-mono text-ink">{entry.actualStart ?? '—'}</td>
                        <td
                          data-timing-status={timing}
                          className={`px-3 py-2 font-mono ${tone}`}
                        >
                          {Number.isFinite(entry.driftMinutes) ? `${entry.driftMinutes} min` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        ) : null}

        {Array.isArray(recap.changes) && recap.changes.length > 0 ? (
          <Section title={t('recap.changes.title')}>
            <ul className="space-y-2">
              {recap.changes.map((change, index) => (
                <li
                  key={`${change.stepId}-${change.at}-${index}`}
                  className="rounded-xl border border-line bg-card/60 px-3 py-2 text-sm text-muted"
                >
                  {t('recap.changes.line', {
                    step: change.stepTitle,
                    from: change.from ?? '—',
                    to: change.to ?? '—',
                    author: change.authorRole ?? 'crew',
                  })}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {hasMusic ? (
          <Section title={t('recap.music.title')}>
            <div className="grid gap-3 sm:grid-cols-2">
              {mainSongs.length > 0 ? (
                <div className="rounded-xl border border-line bg-card/60 p-3">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-muted">
                    {t('recap.music.main')}
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-ink">
                    {mainSongs.map((song, index) => (
                      <li key={`${song.stepTitle}-${index}`}>
                        {song.stepTitle}: {song.missing ? '—' : [song.title, song.artist].filter(Boolean).join(' — ')}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {mustPlay.length > 0 ? (
                <div className="rounded-xl border border-line bg-card/60 p-3">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-muted">
                    {t('recap.music.must')}
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-ink">
                    {mustPlay.map((song, index) => (
                      <li key={`${song.track}-${index}`}>{song.track}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {doNotPlay.length > 0 ? (
                <div className="rounded-xl border border-line bg-card/60 p-3">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-muted">
                    {t('recap.music.doNot')}
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-ink">
                    {doNotPlay.map((song, index) => (
                      <li key={`${song.track}-${index}`}>{song.track}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {guestRequests.length > 0 ? (
                <div className="rounded-xl border border-line bg-card/60 p-3">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-muted">
                    {t('recap.music.requests')}
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-ink">
                    {guestRequests.map((request, index) => (
                      <li key={`${request.song}-${request.artist}-${index}`}>
                        {[request.song, request.artist].filter(Boolean).join(' — ')}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </Section>
        ) : null}

        {games.length > 0 ? (
          <Section title={t('recap.games.title')}>
            <ul className="space-y-2">
              {games.map((game) => (
                <li key={game.gameId} className="rounded-xl border border-line bg-card/60 px-3 py-2 text-sm">
                  <div className="font-semibold text-ink">{game.title}</div>
                  <div className="mt-1 text-muted">
                    {Number.isFinite(game.score) ? `${t('recap.games.score', { score: game.score })} · ` : ''}
                    {t('recap.games.answered', {
                      answered: game.answeredCount ?? 0,
                      total: game.totalQuestions ?? 0,
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {ceremony.length > 0 ? (
          <Section title={t('recap.ceremony.title')}>
            <ol className="space-y-2">
              {ceremony.map((part) => (
                <li key={`${part.stepId}-${part.id}`} className="rounded-xl border border-line bg-card/60 px-3 py-2 text-sm">
                  <div className="font-semibold text-ink">
                    {part.time ? <span className="mr-2 font-mono text-muted">{part.time}</span> : null}
                    {part.title}
                  </div>
                  {part.musicCue ? (
                    <div className="mt-1 text-muted">{t('recap.ceremony.music', { cue: part.musicCue })}</div>
                  ) : null}
                  {part.responsibleRole ? (
                    <div className="text-muted">{t('recap.ceremony.role', { role: part.responsibleRole })}</div>
                  ) : null}
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        {mediaTeam.length + musicians.length > 0 ? (
          <Section title={t('recap.vendors.title')}>
            <div className="grid gap-3 sm:grid-cols-2">
              {mediaTeam.length > 0 ? (
                <div className="rounded-xl border border-line bg-card/60 p-3">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-muted">
                    {t('recap.vendors.media')}
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-ink">
                    {mediaTeam.map((member, index) => (
                      <li key={`${member.role}-${member.name}-${index}`}>
                        <span className="font-semibold">{member.name ?? member.role}</span>
                        {member.startTime || member.endTime ? (
                          <span className="text-muted">
                            {' · '}
                            {t('recap.vendors.hours', {
                              start: member.startTime ?? '—',
                              end: member.endTime ?? '—',
                            })}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {musicians.length > 0 ? (
                <div className="rounded-xl border border-line bg-card/60 p-3">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-muted">
                    {t('recap.vendors.musicians')}
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-ink">
                    {musicians.map((musician, index) => (
                      <li key={`${musician.name}-${index}`}>
                        <span className="font-semibold">{musician.name}</span>
                        {musician.instrument ? <span className="text-muted"> · {musician.instrument}</span> : null}
                        {musician.startTime || musician.endTime ? (
                          <span className="text-muted">
                            {' · '}
                            {t('recap.vendors.hours', {
                              start: musician.startTime ?? '—',
                              end: musician.endTime ?? '—',
                            })}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </Section>
        ) : null}
      </main>

      <footer className="border-t border-line px-5 py-6 text-center text-[10px] text-muted print:border-0">
        {t('recap.footer')}
      </footer>
    </div>
  );
}
