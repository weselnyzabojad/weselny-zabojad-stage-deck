import { useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import {
  buildSocialCaption,
  exportStoryPng,
  templatesForSurface,
} from '../lib/socialStory.js';
import {
  buildDayMinusOneModel,
  dayMinusOneCaptionLines,
} from '../lib/socialDayMinusOne.js';
import {
  buildDayPlusOneModel,
  dayPlusOneCaptionLines,
} from '../lib/socialDayPlusOne.js';
import { buildSeasonModel, seasonCaptionLines } from '../lib/socialSeason.js';
import StoryFrame from './social/StoryFrame.jsx';
import DayMinusOneStory from './social/DayMinusOneStory.jsx';
import DayPlusOneStory from './social/DayPlusOneStory.jsx';
import SeasonStory from './social/SeasonStory.jsx';

const PREVIEW_WIDTH = 270;
const PREVIEW_SCALE = PREVIEW_WIDTH / 1080;

const TEMPLATE_LABEL_KEYS = {
  dayMinusOne: 'social.template.dayMinusOne',
  dayPlusOne: 'social.template.dayPlusOne',
  season: 'social.template.season',
};

function TemplatePlaceholder({ template, t }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-6 px-16 text-center">
      <p className="font-mono text-[28px] uppercase tracking-[0.28em] text-amber-300/80">
        Stage Deck
      </p>
      <h3 className="font-heading text-[64px] leading-tight font-bold">
        {t(TEMPLATE_LABEL_KEYS[template.id] ?? 'social.template.dayMinusOne')}
      </h3>
      <p className="text-[32px] leading-snug text-[#CBD5E1]">{t('social.placeholder')}</p>
    </div>
  );
}

export default function SocialExportStudio({
  surface = 'mc',
  wedding = null,
  liveState = null,
  recap = null,
  requests = [],
  templates = {},
  captionLinesByTemplate = {},
  seasonData = null,
  seasonYear = null,
  seasonYears = [],
  onSeasonYear = null,
  seasonLoading = false,
  seasonError = '',
  dataLoading = false,
  dataError = '',
  onRetry = null,
  onClose = null,
}) {
  const { t } = useI18n();
  const available = useMemo(() => templatesForSurface(surface), [surface]);
  const availableTemplates = useMemo(
    () => ({
      dayMinusOne: DayMinusOneStory,
      dayPlusOne: DayPlusOneStory,
      season: SeasonStory,
      ...templates,
    }),
    [templates],
  );
  const [templateId, setTemplateId] = useState(available[0]?.id ?? 'dayMinusOne');
  const [mode, setMode] = useState('dark');
  const [safeZones, setSafeZones] = useState(false);
  const [status, setStatus] = useState('');
  const nodeRef = useRef(null);

  const template =
    available.find((entry) => entry.id === templateId) ?? available[0] ?? null;
  const Template = template ? availableTemplates[template.id] : null;
  const dateISO = wedding?.dateISO ?? wedding?.date ?? '';
  const fallbackCaptions = useMemo(() => {
    if (template?.id === 'dayMinusOne') {
      const model = buildDayMinusOneModel({ wedding, liveState });
      return {
        fr: dayMinusOneCaptionLines(model, 'fr'),
        pl: dayMinusOneCaptionLines(model, 'pl'),
      };
    }
    if (template?.id === 'dayPlusOne') {
      const model = buildDayPlusOneModel({ wedding, liveState, recap });
      return {
        fr: dayPlusOneCaptionLines(model, 'fr'),
        pl: dayPlusOneCaptionLines(model, 'pl'),
      };
    }
    if (template?.id === 'season') {
      const model = buildSeasonModel(seasonData);
      return {
        fr: seasonCaptionLines(model, 'fr'),
        pl: seasonCaptionLines(model, 'pl'),
      };
    }
    return { fr: [], pl: [] };
  }, [template?.id, wedding, liveState, recap, seasonData]);
  const captions = captionLinesByTemplate[template?.id] ?? fallbackCaptions;

  const captionFor = (locale) =>
    buildSocialCaption({ locale, lines: captions[locale] ?? [] });

  const copyCaption = async (locale) => {
    const text = captionFor(locale);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setStatus(t('social.copied'));
    } catch {
      setStatus(t('social.copyError'));
    }
  };

  const download = async () => {
    if (!nodeRef.current || !template) return;
    setStatus(t('social.exporting'));
    try {
      await exportStoryPng(nodeRef.current, {
        templateId: template.id,
        dateISO,
        mode: template.supportsBackground ? mode : 'dark',
      });
      setStatus(t('social.downloaded'));
    } catch {
      setStatus(t('social.downloadError'));
    }
  };

  return (
    <section
      aria-labelledby="social-export-title"
      data-surface={surface}
      className="rounded-xl border border-line bg-card p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="social-export-title" className="font-heading text-sm font-bold text-ink">
            {t('social.title')}
          </h3>
          <p className="mt-1 text-[11px] text-muted">{t('social.subtitle')}</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-line bg-raised px-2.5 py-1 text-[11px] font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-strong"
          >
            {t('social.close')}
          </button>
        ) : null}
      </div>

      {dataLoading ? (
        <p role="status" className="mt-2 text-[10px] text-muted">
          {t('social.loading')}
        </p>
      ) : null}
      {dataError ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-alert-soft">
          <span role="alert">{dataError}</span>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded border border-line bg-raised px-2 py-0.5 font-semibold text-ink"
            >
              {t('social.retry')}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label={t('social.templates')}>
        {available.map((entry) => {
          const active = entry.id === template?.id;
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setTemplateId(entry.id);
                setStatus('');
              }}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-strong ${
                active
                  ? 'border-brand-strong bg-brand/15 text-ink'
                  : 'border-line bg-raised text-muted'
              }`}
            >
              {t(TEMPLATE_LABEL_KEYS[entry.id] ?? 'social.template.dayMinusOne')}
            </button>
          );
        })}
      </div>

      {template?.id === 'season' && onSeasonYear ? (
        <label className="mt-3 block max-w-[12rem] text-[10px] font-semibold uppercase tracking-widest text-muted">
          {t('social.seasonYear')}
          <select
            value={seasonYear ?? ''}
            onChange={(event) => onSeasonYear(Number(event.target.value))}
            className="mt-1 block w-full rounded border border-line bg-page px-2.5 py-2 text-xs text-ink"
          >
            {seasonYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>
      ) : null}
      {template?.id === 'season' && seasonLoading ? (
        <p role="status" className="mt-2 text-[10px] text-muted">{t('social.seasonLoading')}</p>
      ) : null}
      {template?.id === 'season' && seasonError ? (
        <p role="alert" className="mt-2 text-[10px] text-alert-soft">{seasonError}</p>
      ) : null}

      <div className="mt-3 grid gap-4 lg:grid-cols-[auto_1fr]">
        <div
          className="overflow-hidden rounded-lg border border-line bg-page"
          style={{ width: `${PREVIEW_WIDTH}px`, height: `${PREVIEW_WIDTH * (1920 / 1080)}px` }}
        >
          <div
            style={{
              width: '1080px',
              height: '1920px',
              transform: `scale(${PREVIEW_SCALE})`,
              transformOrigin: 'top left',
            }}
          >
            <StoryFrame
              mode={template?.supportsBackground ? mode : 'dark'}
              safeZones={safeZones}
              label={t(TEMPLATE_LABEL_KEYS[template?.id] ?? 'social.template.dayMinusOne')}
            >
              {Template ? (
                <Template wedding={wedding} liveState={liveState} recap={recap} requests={requests} seasonData={seasonData} seasonYear={seasonYear} mode={mode} />
              ) : (
                <TemplatePlaceholder template={template ?? { id: 'dayMinusOne' }} t={t} />
              )}
            </StoryFrame>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {template?.supportsBackground ? (
              <div role="group" aria-label={t('social.background')} className="inline-flex rounded-full border border-line bg-raised p-0.5">
                {['dark', 'hud'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    onClick={() => setMode(value)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      mode === value ? 'bg-brand/20 text-ink' : 'text-muted'
                    }`}
                  >
                    {t(`social.background.${value}`)}
                  </button>
                ))}
              </div>
            ) : null}
            <label className="inline-flex items-center gap-1.5 text-[10px] text-muted">
              <input
                type="checkbox"
                checked={safeZones}
                onChange={(event) => setSafeZones(event.target.checked)}
              />
              {t('social.safeZones')}
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={download}
              className="rounded-full bg-brand px-3.5 py-1.5 text-[11px] font-bold text-on-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-strong"
            >
              {t('social.download')}
            </button>
            <button
              type="button"
              onClick={() => copyCaption('fr')}
              className="rounded-full border border-line bg-raised px-3 py-1.5 text-[11px] font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-strong"
            >
              {t('social.copyFr')}
            </button>
            <button
              type="button"
              onClick={() => copyCaption('pl')}
              className="rounded-full border border-line bg-raised px-3 py-1.5 text-[11px] font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-strong"
            >
              {t('social.copyPl')}
            </button>
          </div>

          <p role="status" className="min-h-4 text-[10px] text-muted">{status}</p>
          <p className="text-[10px] text-muted">{t('social.privacy')}</p>
          <p className="text-[10px] text-muted">{t('social.sizeHint')}</p>
        </div>
      </div>

      <div ref={nodeRef} aria-hidden="true" className="pointer-events-none fixed -left-[9999px] top-0">
        <StoryFrame
          mode={template?.supportsBackground ? mode : 'dark'}
          safeZones={false}
          label={t(TEMPLATE_LABEL_KEYS[template?.id] ?? 'social.template.dayMinusOne')}
        >
          {Template ? (
            <Template wedding={wedding} liveState={liveState} recap={recap} requests={requests} seasonData={seasonData} seasonYear={seasonYear} mode={mode} />
          ) : (
            <TemplatePlaceholder template={template ?? { id: 'dayMinusOne' }} t={t} />
          )}
        </StoryFrame>
      </div>
    </section>
  );
}
