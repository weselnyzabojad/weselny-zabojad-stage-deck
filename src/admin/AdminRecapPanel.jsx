import { useCallback, useEffect, useState } from 'react';
import {
  getRecapSource,
  listRecaps,
  publishRecap,
  revokeRecap,
} from './adminApi';
import { ADMIN_BUTTON } from './adminUi';
import { formatAdminTime } from './adminUtils';
import { buildWeddingRecap, recapPublicationStatus } from '../lib/weddingRecap.js';

function SummaryItem({ label, value }) {
  return (
    <div className="rounded border border-line bg-raised/60 px-2.5 py-2">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-ink">{value ?? '—'}</div>
    </div>
  );
}

function statusLabel(recap) {
  const status = recapPublicationStatus(recap);
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AdminRecapPanel({ wedding, readOnly = false, onChanged }) {
  const weddingId = wedding?.wedding_id ?? '';
  const [recap, setRecap] = useState(null);
  const [recaps, setRecaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [published, setPublished] = useState(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  const load = useCallback(async () => {
    if (!weddingId) return;
    setLoading(true);
    setError('');
    try {
      const [nextSource, nextRecaps] = await Promise.all([
        getRecapSource(weddingId),
        listRecaps(weddingId),
      ]);
      setRecaps(nextRecaps?.recaps ?? []);
      if (!nextSource?.wedding) {
        setRecap(null);
        return;
      }
      setRecap(
        buildWeddingRecap({
          wedding: nextSource.wedding,
          liveState: nextSource.liveState,
          songRequests: nextSource.songRequests ?? [],
        }),
      );
    } catch (cause) {
      setError(cause?.message ?? 'Could not load the recap preview.');
      setRecap(null);
    } finally {
      setLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- hydrates the preview after the admin session resolves
    void load();
  }, [load]);

  const hasPreview = Boolean(recap?.timeline?.length > 0 && recap?.wedding?.id);
  const summary = recap?.summary ?? {};

  const publish = async () => {
    if (!hasPreview || !weddingId || readOnly) return;
    setPublishing(true);
    setError('');
    try {
      const result = await publishRecap(weddingId, recap);
      setPublished(result?.recap ?? null);
      setConfirmPublish(false);
      await load();
      onChanged?.();
    } catch (cause) {
      setError(cause?.message ?? 'Could not publish the recap.');
    } finally {
      setPublishing(false);
    }
  };

  const revoke = async (recapId) => {
    if (!weddingId || readOnly) return;
    setRevokingId(recapId);
    setError('');
    try {
      await revokeRecap(weddingId, recapId);
      await load();
      onChanged?.();
    } catch (cause) {
      setError(cause?.message ?? 'Could not revoke the recap.');
    } finally {
      setRevokingId(null);
    }
  };

  const copyLink = async () => {
    if (!published?.url) return;
    try {
      await navigator.clipboard.writeText(published.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy the recap link.');
    }
  };

  return (
    <details
      className="mt-2 rounded border border-line bg-card/60 p-3"
      data-testid="admin-recap-panel"
    >
      <summary className="cursor-pointer text-xs font-bold text-ink">
        Wedding recap
      </summary>

      <div className="mt-3 space-y-3">
        <p className="text-[11px] leading-relaxed text-muted">
          Generate a private, read-only recap for the newlyweds. Preview first;
          publishing creates an immutable snapshot with a 90-day link.
        </p>

        {error ? (
          <p role="alert" className="rounded border border-alert/50 bg-alert/10 px-2 py-1.5 text-[11px] text-alert-tint">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-[11px] text-muted">Loading recap preview…</p>
        ) : !hasPreview ? (
          <p className="rounded border border-dashed border-line bg-raised/40 px-2.5 py-2 text-[11px] text-muted">
            Not enough recap data yet. Publish a cartridge and complete at least
            one timeline step before publishing a recap.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
              <SummaryItem label="Couple" value={recap.wedding.couple} />
              <SummaryItem label="Date" value={recap.wedding.date} />
              <SummaryItem label="Steps completed" value={`${summary.completedSteps}/${summary.totalSteps}`} />
              <SummaryItem label="Biggest delay" value={`${summary.biggestDelayMinutes ?? 0} min`} />
              <SummaryItem label="Schedule changes" value={summary.scheduleChangeCount} />
              <SummaryItem label="Song requests" value={summary.songRequestCount} />
              <SummaryItem label="Games" value={summary.gameCount} />
              <SummaryItem label="Ceremony parts" value={summary.ceremonyPartCount} />
            </div>

            <div>
              <h4 className="font-heading text-[10px] font-bold uppercase tracking-widest text-muted">
                Timeline preview
              </h4>
              <div className="mt-1 max-h-56 overflow-y-auto rounded border border-line">
                <table className="min-w-full text-left text-[10px]">
                  <thead className="sticky top-0 bg-raised text-muted">
                    <tr>
                      <th className="px-2 py-1">Step</th>
                      <th className="px-2 py-1">Planned</th>
                      <th className="px-2 py-1">Actual</th>
                      <th className="px-2 py-1">Drift</th>
                      <th className="px-2 py-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recap.timeline.map((entry) => (
                      <tr key={entry.id} className="border-t border-line/60">
                        <td className="px-2 py-1 text-ink">{entry.title}</td>
                        <td className="px-2 py-1 font-mono text-muted">{entry.plannedStart ?? '—'}</td>
                        <td className="px-2 py-1 font-mono text-muted">{entry.actualStart ?? '—'}</td>
                        <td className="px-2 py-1 font-mono text-muted">
                          {Number.isFinite(entry.driftMinutes) ? `${entry.driftMinutes} min` : '—'}
                        </td>
                        <td className="px-2 py-1 text-muted">{entry.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {recap.changes.length > 0 ? (
              <div>
                <h4 className="font-heading text-[10px] font-bold uppercase tracking-widest text-muted">
                  Schedule changes
                </h4>
                <ul className="mt-1 space-y-1 text-[10px] text-muted">
                  {recap.changes.map((change, index) => (
                    <li key={`${change.stepId}-${change.at}-${index}`}>
                      {change.stepTitle}: {change.from ?? '—'} → {change.to ?? '—'} ({change.authorRole ?? 'crew'})
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="grid gap-2 text-[10px] text-muted sm:grid-cols-2">
              <p>
                <strong className="text-ink">Music:</strong> {recap.music.mainSongs.length} main,{' '}
                {recap.music.mustPlay.length} must-play, {recap.music.doNotPlay.length} do-not-play,{' '}
                {recap.music.guestRequests.length} guest requests
              </p>
              <p>
                <strong className="text-ink">Ceremony:</strong> {recap.ceremony.length} parts
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!confirmPublish ? (
                <button
                  type="button"
                  onClick={() => setConfirmPublish(true)}
                  disabled={readOnly || publishing}
                  className={ADMIN_BUTTON.primary}
                >
                  Publish recap
                </button>
              ) : (
                <>
                  <span className="text-[11px] font-semibold text-ink">
                    Publish this immutable 90-day recap?
                  </span>
                  <button
                    type="button"
                    onClick={() => void publish()}
                    disabled={publishing}
                    className={ADMIN_BUTTON.primary}
                  >
                    {publishing ? 'Publishing…' : 'Confirm publish'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmPublish(false)}
                    disabled={publishing}
                    className={ADMIN_BUTTON.secondary}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {published?.url ? (
          <div className="rounded border border-emerald-700/50 bg-emerald-950/30 p-2.5">
            <p className="text-[11px] font-semibold text-emerald-200">
              Recap published. Copy this link now; it is shown only once.
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <code className="break-all rounded bg-page/60 px-2 py-1 text-[10px] text-ink">
                {published.url}
              </code>
              <button type="button" onClick={() => void copyLink()} className={ADMIN_BUTTON.secondary}>
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-muted">
              Expires {formatAdminTime(published.expiresAt)}.
            </p>
          </div>
        ) : null}

        <div>
          <h4 className="font-heading text-[10px] font-bold uppercase tracking-widest text-muted">
            Published recaps
          </h4>
          {recaps.length === 0 ? (
            <p className="mt-1 text-[11px] text-muted">No recap published yet.</p>
          ) : (
            <ul className="mt-1 space-y-1.5">
              {recaps.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-line bg-raised/40 px-2 py-1.5">
                  <span className="font-mono text-[10px] text-muted">
                    {item.id.slice(0, 8)} · {formatAdminTime(item.published_at)} · expires{' '}
                    {formatAdminTime(item.expires_at)} · <strong className="text-ink">{statusLabel(item)}</strong>
                  </span>
                  {!item.revoked_at && recapPublicationStatus(item) === 'active' && !readOnly ? (
                    revokingId === item.id ? (
                      <span className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => void revoke(item.id)}
                          className={ADMIN_BUTTON.danger}
                        >
                          Confirm revoke
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevokingId(null)}
                          className={ADMIN_BUTTON.secondary}
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRevokingId(item.id)}
                        className={ADMIN_BUTTON.secondary}
                      >
                        Revoke
                      </button>
                    )
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </details>
  );
}
