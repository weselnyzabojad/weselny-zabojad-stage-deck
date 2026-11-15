// Admin-only action hierarchy (issue #994).
//
// One solid primary action per view; outlined secondary actions; ghost for
// low-emphasis navigation; red only for destructive actions. Pair these classes
// with the shared `.admin-btn-*` component styles in index.css.

export const ADMIN_BUTTON = Object.freeze({
  primary: 'admin-btn admin-btn-primary',
  secondary: 'admin-btn admin-btn-secondary',
  ghost: 'admin-btn admin-btn-ghost',
  danger: 'admin-btn admin-btn-danger',
});

export const ADMIN_CARD = 'admin-card';
export const ADMIN_CARD_MUTED = 'admin-card admin-card-muted';
