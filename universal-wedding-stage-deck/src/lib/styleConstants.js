// Shared UI style constants (project.md TODO 22).
//
// Centralised so the routed shell, MC view and future extracted views use one
// definition. Pure refactor: the class strings are unchanged.

export const STEP_TYPE_STYLES = {
  ELASTIC: 'text-white bg-brand border-brand-strong',
  BUFFER: 'text-cyan-200 bg-cyan-950/70 border-cyan-800',
  HARD_ANCHOR: 'text-alert-tint bg-alert/20 border-alert/60',
};

// Shared drift-control button base/disabled classes used by the MC footer.
export const CONTROL_BUTTON_BASE =
  'px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap shadow border';
export const CONTROL_BUTTON_DISABLED = 'bg-card text-slate-600 border-line cursor-not-allowed';
