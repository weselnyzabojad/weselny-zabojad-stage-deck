# Accessibility audit (TODO 26 / issue #68)

Scope: keyboard operation, dialog focus management, live announcements,
contrast and reduced motion. This pass is intentionally small and surgical; it
does not redesign the views.

## 1. Subtasks are real checkboxes

Active-step subtasks and the pre-wedding checklist now use native
`<input type="checkbox">` inside a `<label>`:

- **Keyboard:** `Tab` focuses the checkbox, `Space` toggles it. The old row
  `<div onClick>` / no-op `onChange` pattern is gone.
- **Pointer:** clicking the label text toggles the same checkbox.
- **Screen readers:** the label text is the accessible name; `checked` exposes
  the state without a custom `aria-pressed`.
- **Focus:** `focus-within` adds a visible ring to the whole row; the global
  `:focus-visible` rule adds a 3px theme-aware outline to the input.
- **Theme:** `accent-color: var(--brand-strong)` keeps the native checkmark
  readable in Night and Daylight themes.

Files: `src/views/McMasterView.jsx`,
`src/components/PreWeddingChecklistCard.jsx`, `src/index.css`.

## 2. Modal focus trap, Escape and focus restore

`src/components/ModalShell.jsx` is shared by the teleprompter, game clicker,
VIP alerts, contacts and cartridge importer. It now:

1. Moves focus to the close button when the dialog opens.
2. Traps `Tab` / `Shift+Tab` inside the dialog, cycling through visible,
   enabled focusable elements.
3. Handles an empty dialog by focusing the dialog container (`tabIndex={-1}`).
4. Closes on `Escape` through a ref, so a changing `onClose` prop never leaks a
   stale handler.
5. Restores focus to the element that opened the dialog on unmount.
6. Keeps the backdrop-click close and `role="dialog"` / `aria-modal` /
   `aria-labelledby` contract.

The game overlay's arrow/space shortcuts remain separate and still work.

## 3. Live announcements for ping and drift banners

| Element | Announcement |
| --- | --- |
| `StagePingBanner` | `role="status"`, `aria-live="assertive"`, `aria-atomic="true"` |
| `HardAnchorAlertBanner` | `role="alert"`, `aria-live="assertive"`, `aria-atomic="true"` |
| `HardAnchorRadar` primary warning | `role="alert"`, `aria-live="assertive"`, `aria-atomic="true"` |
| `DriftPill` (MC/DJ headers) | `role="status"`, `aria-live="polite"`, `aria-atomic="true"` |
| Pocket drift strip | `role="status"`, `aria-live="polite"`, `aria-atomic="true"` |

Drift is polite because it changes as the schedule moves; hard anchors and
stage pings are assertive because they demand immediate action. `aria-atomic`
ensures the full sentence is re-read instead of only the changed number.

## 4. Contrast audit

The Night theme's default `slate-500`/`slate-600` utilities were below WCAG AA
for small text on the dark card. Only those two steps were raised; brand and
alert accents were already comfortably above AA.

Measured contrast ratios (WCAG 2.1, normal text needs 4.5:1):

| Pair | Ratio | Result |
| --- | --- | --- |
| Night `slate-500` #8b9bb0 on card #0b132b | 6.49:1 | AA / AAA |
| Night `slate-500` on page #070b19 | 6.92:1 | AA / AAA |
| Night `slate-600` #7c8ba1 on card | 5.31:1 | AA |
| Night `slate-400` #94a3b8 on card | 7.17:1 | AA / AAA |
| Night `brand-soft` #849dff on card | 7.22:1 | AA / AAA |
| Night `alert-soft` #ff808a on card | 7.62:1 | AA / AAA |
| Day `slate-500` #64748b on white | 4.76:1 | AA |
| Day `slate-600` #5b6b80 on white | 5.44:1 | AA |
| Day `slate-400` #475569 on white | 7.58:1 | AA / AAA |
| Day `brand-soft` #002395 on white | 12.54:1 | AAA |
| Stage-ping white on red #b91c1c | 6.47:1 | AA / AAA |
| White on amber banner #92400e | 7.09:1 | AA / AAA |

Rules and exceptions:

- Disabled controls may stay below 4.5:1, but they are also marked
  `disabled` / `cursor-not-allowed` and never carry essential information.
- Decorative icons and separators (`aria-hidden`) are exempt.
- Status is never conveyed by colour alone: drift, ping and anchor states keep
  text labels plus icons.
- The white logo chip is intentionally unchanged in both themes.

## 5. Reduced motion

`src/index.css` now honours `prefers-reduced-motion: reduce` globally:

- all animations and transitions are reduced to `0.01ms` with a single
  iteration,
- `scroll-behavior` becomes `auto`,
- `.pin-shake`, `.stage-ping-flash` and `.undo-toast-progress` are explicitly
  disabled (the ping keeps its solid red background),
- Tailwind's `animate-ping` / `animate-pulse` decorations stop automatically.

## 6. Manual verification checklist

Keyboard only (no mouse):

- [ ] `Tab` reaches each subtask checkbox; `Space` toggles it; the row shows a
      focus ring.
- [ ] Pre-wedding checklist rows toggle with `Space` and expose checked state.
- [ ] In every modal, `Tab` and `Shift+Tab` cycle only inside the dialog.
- [ ] `Escape` closes the modal; focus returns to the trigger button.
- [ ] Game clicker arrow keys and space still work inside its dialog.
- [ ] A new stage ping is announced while focus is elsewhere.
- [ ] A drift change updates the polite live region without stealing focus.
- [ ] With OS reduced motion enabled, ping/pulse/shake animations are still.
- [ ] Night and Daylight themes both show visible focus outlines and readable
      muted labels.

## 7. Follow-ups (not in this pass)

- Full component-by-component colour token migration (TODO 27) and a
  screenshot-based contrast regression suite.
- Automated axe/Playwright checks in CI.
- Focus management for the full-screen MC view after a role switch.
