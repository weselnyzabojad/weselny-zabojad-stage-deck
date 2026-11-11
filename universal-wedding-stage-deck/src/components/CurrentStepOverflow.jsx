import { useI18n } from '../i18n/useI18n';

/**
 * Secondary current-step actions that must not compete with HOLD/Undo on the
 * phone card. Native <details> keeps it keyboard accessible without extra JS.
 */
export default function CurrentStepOverflow({ onSwap, swapBlock, nextEntry, currentStep }) {
  const { t } = useI18n();
  const title = swapBlock
    ?? (nextEntry
      ? t('mc.step.swapWith', {
          current: currentStep?.title ?? '',
          next: nextEntry.step.title,
        })
      : t('mc.step.noNext'));

  return (
    <details className="rounded-xl border border-panel-border bg-panel/40 shadow-sm backdrop-blur-sm">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-semibold text-ink transition hover:bg-panel/60">
        <span>{t('mc.step.more')}</span>
        <span aria-hidden="true">▾</span>
      </summary>
      <div className="border-t border-panel-border/70 p-2.5">
        <button
          type="button"
          onClick={onSwap}
          disabled={!nextEntry || Boolean(swapBlock)}
          title={title}
          className="min-h-11 w-full rounded-xl border border-panel-border bg-panel/60 px-3 py-2 text-left text-xs font-semibold text-ink shadow-sm transition hover:border-line-strong hover:bg-panel hover:shadow-md disabled:cursor-not-allowed disabled:bg-card disabled:text-muted disabled:shadow-none"
        >
          🔀 {t('mc.step.swapNext')}
        </button>
      </div>
    </details>
  );
}
