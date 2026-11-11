import babyIcon from '../assets/icons/baby.svg?raw';
import { useI18n } from '../i18n/useI18n';
import { topBarControl } from '../lib/topBarStyles.js';

// Permanent read-only state indicator for children at the wedding. Red means
// children are expected; green means they are not. Shown in every stage role.
export default function ChildrenExpectedBadge({
  wedding,
  inline = false,
  compact = false,
}) {
  const { t } = useI18n();
  const expected = wedding?.childrenExpected === true;
  const label = t(expected ? 'children.expectedBadge' : 'children.notExpectedBadge');
  const tone = topBarControl(expected ? 'negative' : 'positive');

  if (compact) {
    return (
      <span
        role="status"
        aria-label={label}
        title={label}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 ${tone}`}
      >
        <span
          aria-hidden="true"
          className="inline-flex [&>svg]:h-[18px] [&>svg]:w-[18px]"
          dangerouslySetInnerHTML={{ __html: babyIcon }}
        />
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-label={label}
      title={label}
      className={
        inline
          ? `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold ${tone}`
          : `fixed bottom-3 right-3 z-banner flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold shadow-2xl ${tone}`
      }
    >
      <span aria-hidden="true" className="text-base">🧒</span>
      <span>{label}</span>
    </div>
  );
}
