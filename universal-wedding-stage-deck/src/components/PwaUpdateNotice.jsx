import { useI18n } from '../i18n/useI18n';

// Presentational PWA update notice (issue #81). The stateful container lives in
// PwaUpdatePrompt.jsx; keeping the view separate makes the prompt testable.
export default function PwaUpdateNotice({
  needRefresh = false,
  blockedReason = null,
  checking = false,
  onReload,
  onLater,
  onCheck,
}) {
  const { t } = useI18n();

  if (needRefresh) {
    const blocked = Boolean(blockedReason);
    return (
      <div
        role="alertdialog"
        aria-live="assertive"
        aria-label={t('pwa.title')}
        className="fixed bottom-4 left-1/2 z-toast w-[min(92vw,30rem)] -translate-x-1/2 rounded-xl border border-brand-strong bg-card p-4 text-ink shadow-2xl"
      >
        <div className="flex items-start gap-1.5">
          <span aria-hidden="true" className="text-lg leading-none">
            ⬆️
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-sm font-bold text-ink">{t('pwa.title')}</h2>
            <p className="mt-1 text-xs text-muted">{t('pwa.body')}</p>
            {blocked ? (
              <p role="status" className="mt-2 rounded border border-amber-800 bg-amber-950/70 px-2 py-1 text-[11px] text-amber-200">
                {blockedReason}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onLater}
            className="rounded border border-line-strong bg-raised px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-line"
          >
            {t('pwa.later')}
          </button>
          <button
            type="button"
            onClick={onReload}
            disabled={blocked}
            className="rounded border border-brand-strong bg-brand/40 px-3 py-1.5 text-xs font-semibold text-brand-tint transition hover:bg-brand/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('pwa.reload')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onCheck}
      title={t('pwa.check')}
      aria-label={checking ? t('pwa.checking') : t('pwa.check')}
      className="fixed bottom-3 right-3 z-toast rounded-full border border-line-strong bg-card/90 px-2.5 py-1.5 text-[10px] font-semibold text-ink shadow-lg backdrop-blur transition hover:bg-raised hover:text-ink"
    >
      <span aria-hidden="true">↻</span>{' '}
      <span className="hidden sm:inline">{checking ? t('pwa.checking') : t('pwa.check')}</span>
    </button>
  );
}
