// Shared top-bar control palette.
//
// Every control in the header band (logo -> light/dark toggle) uses the same
// white surface with a black frame by default. Green and red are reserved for
// the explicit "wanted / refused" and "on time / late" states, so the bar keeps
// one visual language across roles while the status remains readable.
const PALETTE = {
  neutral: 'border-black bg-white text-black',
  positive: 'border-black bg-emerald-400 text-black',
  warning: 'border-black bg-amber-400 text-black',
  negative: 'border-black bg-red-500 text-black',
};

export function topBarControl(tone = 'neutral', extra = '') {
  const palette = PALETTE[tone] ?? PALETTE.neutral;
  return `border-2 ${palette}${extra ? ` ${extra}` : ''}`;
}

export const TOP_BAR_NEUTRAL_HOVER = 'hover:bg-slate-100';
