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

// Desktop control bars (issue #707). These tokens are separate from the pocket
// `topBarControl` palette so the #705 compact header stays untouched.
export const DESKTOP_SURFACE =
  'rounded-xl border border-panel-border bg-panel/80 shadow-sm backdrop-blur-md';
export const DESKTOP_SURFACE_HOVER =
  'transition hover:border-line-strong hover:bg-panel hover:shadow-md';
export const DESKTOP_PILL = 'rounded-2xl border shadow-sm backdrop-blur-sm';

// Shared desktop brand-mark frame (issue #749). Primary and partner logos use
// the same height, padding, border radius, surface and depth so the left and
// right branding read as one family.
export const BRAND_FRAME =
  'flex h-16 min-w-0 max-w-full items-center justify-center rounded-2xl border border-white/50 bg-white/90 px-3 py-1.5 shadow-sm';

const DESKTOP_TONES = {
  neutral: 'border-line bg-raised/45 text-ink',
  positive:
    'border-tone-positive-border bg-tone-positive-bg text-tone-positive-text shadow-[0_0_18px_-8px_var(--tone-positive-glow)]',
  warning:
    'border-tone-warning-border bg-tone-warning-bg text-tone-warning-text shadow-[0_0_18px_-8px_var(--tone-warning-glow)]',
  negative:
    'border-tone-negative-border bg-tone-negative-bg text-tone-negative-text shadow-[0_0_18px_-8px_var(--tone-negative-glow)]',
};

export function desktopTone(tone = 'neutral') {
  return DESKTOP_TONES[tone] ?? DESKTOP_TONES.neutral;
}
