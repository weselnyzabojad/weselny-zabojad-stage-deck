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
    <details className="rounded-lg border border-line bg-card/70">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-ink">
        <span>{t('mc.step.more')}</span>
        <span aria-hidden="true">▾</span>
      </summary>
      <div className="border-t border-line p-2">
        <button
          type="button"
          onClick={onSwap}
          disabled={!nextEntry || Boolean(swapBlock)}
          title={title}
          className="min-h-11 w-full rounded-lg border border-line-strong bg-raised px-3 py-2 text-left text-xs font-semibold text-ink transition hover:bg-line disabled:cursor-not-allowed disabled:bg-card disabled:text-muted"
        >
          🔀 {t('mc.step.swapNext')}
        </button>
      </div>
    </details>
  );
}
