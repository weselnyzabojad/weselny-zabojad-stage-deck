import { useEffect, useMemo, useState } from 'react';
import { fetchMusicEngagement } from '../admin/adminApi.js';
import { useI18n } from '../i18n/useI18n';
import {
  HEATMAP_END_MINUTES,
  HEATMAP_START_MINUTES,
  buildHeatmapModel,
} from '../lib/guestEngagement.js';

const WIDTH = 800;
const HEIGHT = 180;
const PLOT_TOP = 22;
const PLOT_HEIGHT = 112;

function clockLabel(minutes) {
  const total = ((Math.round(minutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function timeLabel(minutes) {
  return `${clockLabel(minutes).slice(0, 2)}:00`;
}

function blockTone(type) {
  if (type === 'HARD_ANCHOR') return 'fill-brand/25';
  if (type === 'FLEXIBLE') return 'fill-line/60';
  return 'fill-muted/20';
}

export function GuestEngagementChart({ model }) {
  const { t } = useI18n();
  if (!model || model.buckets.length === 0) {
    return <p className="text-xs text-muted">{t('admin.engagement.empty')}</p>;
  }
  const span = HEATMAP_END_MINUTES - HEATMAP_START_MINUTES;
  const bucketWidth = WIDTH / model.buckets.length;
  const x = (minutes) => ((minutes - HEATMAP_START_MINUTES) / span) * WIDTH;
  const summary = model.buckets
    .map((bucket) =>
      bucket.count > 0
        ? t('admin.engagement.bucketSummary', {
            start: clockLabel(bucket.startMinutes),
            end: clockLabel(bucket.endMinutes),
            count: bucket.count,
          })
        : null,
    )
    .filter(Boolean)
    .join('; ');

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t('admin.engagement.chartLabel')}
        className="h-auto w-full overflow-visible"
        data-testid="guest-engagement-chart"
      >
        <title>{t('admin.engagement.chartLabel')}</title>
        {model.blocks.map((block) => (
          <rect
            key={`block-${block.id ?? block.start}`}
            x={x(block.startMinutes)}
            y={PLOT_TOP}
            width={Math.max(1, x(block.endMinutes) - x(block.startMinutes))}
            height={PLOT_HEIGHT}
            rx="4"
            className={blockTone(block.type)}
          >
            <title>{`${block.title ?? ''} · ${block.start}-${block.end}`}</title>
          </rect>
        ))}

        {model.buckets.map((bucket, index) => {
          const height = model.max > 0 ? (bucket.count / model.max) * PLOT_HEIGHT : 0;
          return bucket.count > 0 ? (
            <rect
              key={`bar-${index}`}
              x={index * bucketWidth + 1}
              y={PLOT_TOP + PLOT_HEIGHT - height}
              width={Math.max(1, bucketWidth - 2)}
              height={Math.max(2, height)}
              rx="2"
              className="fill-emerald-400"
              style={{ filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.55))' }}
            >
              <title>
                {t('admin.engagement.bucketTooltip', {
                  start: clockLabel(bucket.startMinutes),
                  count: bucket.count,
                })}
              </title>
            </rect>
          ) : null;
        })}

        {[18, 20, 22, 24, 26, 28].map((hour) => {
          const minutes = hour * 60;
          return (
            <g key={hour}>
              <line
                x1={x(minutes)}
                x2={x(minutes)}
                y1={PLOT_TOP + PLOT_HEIGHT}
                y2={PLOT_TOP + PLOT_HEIGHT + 4}
                className="stroke-muted/60"
                strokeWidth="1"
              />
              <text
                x={x(minutes)}
                y={HEIGHT - 2}
                textAnchor={hour === 18 ? 'start' : hour === 28 ? 'end' : 'middle'}
                className="fill-muted font-mono"
                fontSize="10"
              >
                {timeLabel(minutes)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="sr-only">{summary || t('admin.engagement.empty')}</p>
      {model.excluded > 0 ? (
        <p className="text-[10px] text-muted">
          {t('admin.engagement.excluded', { count: model.excluded })}
        </p>
      ) : null}
    </div>
  );
}

export default function GuestEngagementHeatmap({ wedding, steps = [], readOnly = false }) {
  const { t } = useI18n();
  const [state, setState] = useState({ status: 'loading', model: null, error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const weddingId = wedding?.wedding_id ?? null;

  useEffect(() => {
    if (!weddingId) return undefined;
    let active = true;
    // eslint-disable-next-line react/set-state-in-effect -- reload starts with a visible loading state
    setState({ status: 'loading', model: null, error: '' });
    fetchMusicEngagement(weddingId)
      .then((result) => {
        if (!active) return;
        if (!result?.eventComplete) {
          setState({ status: 'idle', model: null, error: '' });
          return;
        }
        setState({
          status: 'ready',
          model: buildHeatmapModel({
            requests: result.requests ?? [],
            steps,
            eventComplete: true,
          }),
          error: '',
        });
      })
      .catch((error) => {
        if (active) setState({ status: 'error', model: null, error: error?.message ?? '' });
      });
    return () => {
      active = false;
    };
  }, [reloadKey, weddingId, steps]);

  const body = useMemo(() => {
    if (state.status === 'loading') {
      return <div className="h-28 animate-pulse rounded-lg bg-raised motion-reduce:animate-none" />;
    }
    if (state.status === 'error') {
      return (
        <div className="rounded-lg border border-alert/50 bg-alert/10 p-3 text-xs text-alert-tint">
          <p>{t('admin.engagement.error')}</p>
          {!readOnly ? (
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="mt-2 rounded border border-line-strong bg-raised px-2.5 py-1 text-[10px] font-semibold text-ink"
            >
              {t('admin.engagement.retry')}
            </button>
          ) : null}
        </div>
      );
    }
    if (state.status !== 'ready' || !state.model) return null;
    return <GuestEngagementChart model={state.model} />;
  }, [readOnly, state, t]);

  if (state.status === 'idle' || (!state.model && state.status !== 'loading' && state.status !== 'error')) {
    return null;
  }

  return (
    <details className="rounded border border-line bg-card/60 p-3" data-testid="guest-engagement-heatmap">
      <summary className="cursor-pointer text-xs font-bold text-ink">
        {t('admin.engagement.title')}
      </summary>
      <p className="mt-1 text-[11px] text-muted">{t('admin.engagement.subtitle')}</p>
      <div className="mt-3">{body}</div>
    </details>
  );
}
