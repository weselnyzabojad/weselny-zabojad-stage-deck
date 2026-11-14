# UI Improvements Implementation Script (max 10)

**Created:** 2026-11-06  
**Baseline:** `master` @ `1ad2448` (after issue #76)  
**Scope:** UI/UX gaps only. No schema, sync or auth behaviour changes unless a
task explicitly says so.

This is an ordered implementation script, not a blind patch. Each item is sized
to be one branch/PR and can be stopped independently. Run the validation block
after every item.

> Prerequisite: `project.md` was rewritten on 2026-11-06 to match this baseline.
> The old raw archive is preserved in git history at `743eeef`.

---

## Execution order

| Order | ID | Item | Size | Depends on |
| --- | --- | --- | --- | --- |
| 1 | UI-01 | Accessible admin dialogs (replace `window.prompt` / `window.confirm`) | M | — |
| 2 | UI-06 | Admin toast/notification feedback | S | UI-01 |
| 3 | UI-05 | Admin idle-timeout warning | S | UI-01 |
| 4 | UI-02 | Live presence auto-refresh | S | — |
| 5 | UI-03 | Wedding library search/filter/copy | M | UI-06 |
| 6 | UI-04 | PIN/QR modal completion | M | UI-06 |
| 7 | UI-07 | Empty states and loading skeletons | S | UI-06 |
| 8 | UI-08 | Join-screen PIN UX | S | — |
| 9 | UI-09 | Close remaining role-view i18n gaps | L | — |
| 10 | UI-10 | Skip link and focus restoration | M | — |

Suggested branch names: `ui-01-admin-dialogs`, `ui-06-admin-toasts`, etc.

---

## UI-01 — Replace native admin dialogs with accessible modals

**Problem:** `src/admin/AdminApp.jsx` uses `window.prompt` for TOTP re-auth,
custom PIN entry, duplicate IDs, delete confirmation and session revocation.
Native prompts cannot show validation, are not theme-aware, and break the
existing modal/focus conventions.

**Files**

- `src/admin/AdminApp.jsx`
- `src/admin/AdminDialogs.jsx` (new)
- `src/components/ModalShell.jsx` (reuse)
- `tests/admin.test.js`

**Steps**

1. Create `AdminConfirmDialog` on top of `ModalShell` with props:
   `open`, `title`, `description`, `confirmLabel`, `tone` (`danger` | `primary`),
   `requireText` (optional expected string), `onConfirm`, `onCancel`,
   `children`.
2. Create `AdminMfaDialog` that renders a 6-digit code input, calls
   `challengeExistingFactor(code)`, shows inline errors and a busy state, and
   calls `onVerified` only on success.
3. Replace `requireReauth()` with a state machine:
   `idle → confirm (optional) → mfa → working → done`.
4. Convert these flows:
   - `handleRotate`: show a custom-PIN form (`role=6digits` rows) instead of
     `window.prompt`; blank means auto-generate.
   - `handleDuplicate`: modal with new wedding id, couple and date.
   - `handleArchive`: confirmation dialog with the wedding name.
   - `handleDelete`: typed-wedding-id confirmation plus MFA.
   - `handleRevoke`: confirmation plus MFA.
5. Keep the existing server-side MFA-freshness enforcement; the dialog is a UX
   layer only.
6. Add tests for the pure dialog state reducer if one is extracted; otherwise
   add a render smoke test for the MFA dialog.

**Acceptance**

- `rg "window\.(prompt|confirm)" src/admin` returns nothing.
- `Tab`/`Shift+Tab` stay inside the dialog; `Escape` cancels.
- TOTP errors appear inline and the confirm button is disabled while busy.
- Delete still requires typing the full wedding id.

---

## UI-02 — Live presence auto-refresh

**Problem:** the presence table only refreshes on mount or manual Refresh.
`presenceStatus()` is evaluated at render time, so “online” labels go stale
without a new render.

**Files**

- `src/admin/AdminApp.jsx`
- `src/admin/adminUtils.js`
- `tests/admin.test.js`

**Steps**

1. Add a `nowTick` state updated every 15–30 seconds while `tab === 'presence'`
   and the admin session is aal2.
2. Call `load()` on that tick, or refresh only the presence slice if `list`
   becomes expensive; pause when `document.visibilityState !== 'visible'`.
3. Show a small “Live · updated 12s ago” indicator in the presence header.
4. Compute `presenceStatus({ ..., now: nowTick })` so idle/offline transitions
   happen without new server data.
5. Add a unit test for the tick-driven status transition (already covered by
   `presenceStatus`; extend it with a 2-minute/10-minute boundary case).

**Acceptance**

- Presence updates without pressing Refresh.
- Polling stops when the tab is hidden and resumes on focus.
- No overlapping requests: skip a tick while a previous load is in flight.

---

## UI-03 — Wedding library search, filter and copy

**Problem:** the weddings tab renders every row in insertion order. There is no
search, no archived switch and no quick way to copy a room code for a human.

**Files**

- `src/admin/AdminApp.jsx`
- `src/admin/adminUtils.js`
- `tests/admin.test.js`

**Steps**

1. Add a controlled search field matching couple, wedding id and room code
   (case-insensitive).
2. Add a segmented filter: `Active`, `Archived`, `All` (default `Active`).
3. Add a role filter (MC/DJ/Pocket/Photo/Speaker) that matches weddings
   containing that role.
4. Add a “Copy” button next to the room code using `navigator.clipboard`, with
   a toast/confirmation.
5. Extract `filterWeddings(rows, { query, status, role })` into `adminUtils.js`
   and unit test it.
6. Keep the result count visible (`N of M weddings`).

**Acceptance**

- Search is instant and trims/lowercases input.
- Archived rows are hidden by default.
- Copy works over HTTPS/localhost and fails gracefully otherwise.
- Empty filtered result shows the UI-07 empty state.

---

## UI-04 — Complete the PIN / QR result modal

**Problem:** the PIN modal shows raw values and QR cards, but has no copy
actions, no reveal/hide control, and the create flow does not pass couple/date/
venue into the QR cards (so newly created cards are sparse).

**Files**

- `src/admin/AdminApp.jsx`
- `src/admin/AdminQrCards.jsx`
- `tests/admin.test.js`

**Steps**

1. Add per-PIN “Copy” buttons and a “Copy all PINs” action.
2. Add a reveal/hide toggle (default hidden after the first render, with a
   clear “shown once” warning).
3. When create/publish returns PINs, pass the full wedding draft
   (`couple`, `date`, `venue`) into `pinWedding` so QR cards show event identity.
4. Add a “Print QR cards” button next to Close; ensure printing hides the PIN
   grid (the print CSS already hides everything except `.admin-print-grid`).
5. Add a line explaining that re-publishing rotates PINs and invalidates old
   cards.
6. Keep the QR payload assertion: PINs are never encoded.

**Acceptance**

- QR cards include role, room code, couple/date/venue and deep link.
- PINs are copyable but never printed.
- Create flow shows complete cards without needing a page refresh.

---

## UI-05 — Admin idle-timeout warning

**Problem:** the admin session silently signs out at 30 minutes idle / 8 hours
absolute. The header shows remaining time, but there is no last-chance warning.

**Files**

- `src/admin/AdminApp.jsx`
- `src/admin/AdminDialogs.jsx` (from UI-01)
- `src/admin/adminUtils.js`

**Steps**

1. Add `ADMIN_WARNING_MS = 5 * 60 * 1000` and a pure `shouldWarnAdminSession()`
   helper in `adminUtils.js`.
2. When idle remaining ≤ 5 minutes, show a non-blocking banner/dialog:
   “Signing out in 4:59” with **Stay signed in** and **Sign out now**.
3. “Stay signed in” calls `touchAdminSession` and dismisses the warning.
4. Do not warn when the absolute session is already expired; sign out
   immediately in that case.
5. Add unit tests for the warning boundary and absolute expiry precedence.

**Acceptance**

- Warning appears once per idle window, not on every tick.
- Staying signed in resets the idle clock.
- Absolute expiry always wins over extending.

---

## UI-06 — Admin success/error toasts

**Problem:** `AdminApp` has one inline error banner. Successful actions
(archive, delete, revoke, rotate) give no confirmation, and errors can be pushed
out of view.

**Files**

- `src/admin/AdminApp.jsx`
- `src/admin/AdminToast.jsx` (new)
- `src/index.css` (toast animation, reduced-motion safe)

**Steps**

1. Add a small toast queue: `{ id, tone: 'success' | 'error' | 'info', message }`.
2. Auto-dismiss success/info after ~4s; keep errors until dismissed or replaced.
3. Add `role="status"` for success and `role="alert"` for errors.
4. Emit toasts from publish, rotate, duplicate, archive, delete, revoke, copy
   and refresh.
5. Keep the auth/config error as a persistent banner; toasts are supplemental.
6. Respect `prefers-reduced-motion`.

**Acceptance**

- Successful destructive actions show a confirmation.
- Errors include the server message.
- Multiple errors do not overwrite each other silently.

---

## UI-07 — Empty states and loading skeletons

**Problem:** empty tabs render blank tables/cards; slow `list` calls only show a
single “Loading…” line.

**Files**

- `src/admin/AdminApp.jsx`
- `docs/` (screenshots optional)

**Steps**

1. Add empty states:
   - weddings: “No weddings in this filter. Create one or switch to All.”
   - presence: “No devices have joined yet. Share a QR card or room code.”
   - audit: “No admin actions recorded on this deployment.”
2. Add skeleton rows/cards for the initial load and for refreshes longer than
   300ms.
3. Disable Refresh while loading and show a spinner/label.
4. Keep the empty state actionable (button to create/filter/copy).

**Acceptance**

- No blank panels on a fresh deployment.
- Skeleton disappears on success/error.
- Empty state text is specific to the active filter.

---

## UI-08 — Join-screen PIN UX

**Problem:** `RoleJoinScreen` has no show/hide control, no Caps Lock warning and
no explicit hint that a QR deep link pre-fills the room/role.

**Files**

- `src/components/RoleJoinScreen.jsx`
- `src/i18n/{en,fr,pl}.js` if new labels are added
- `tests/` (render smoke test optional)

**Steps**

1. Add a show/hide PIN toggle with `aria-pressed` and a 44px touch target.
2. Add a Caps Lock warning on `keydown`/`keyup` when the PIN field is focused.
3. Autofocus the room-code field when no intent is present; focus the PIN field
   when the room/role came from a QR deep link.
4. Add a hint: “Opened from a QR link? The room and role are already filled in.”
5. Keep the existing numeric-only input and 6-digit validation.
6. Ensure all new labels exist in EN/FR/PL and pass `validate:i18n`.

**Acceptance**

- PIN can be revealed/hidden without losing focus.
- Caps Lock warning appears/disappears correctly.
- QR deep links focus the PIN field and leave the room/role prefilled.

---

## UI-09 — Close remaining role-view i18n gaps

**Problem:** the i18n layer exists, but several role-view and card strings are
still hardcoded English (DJ Booth, Pocket Remote, Photographer, Speaker and
some MC cards). `npm run validate:i18n` only checks parity, not usage.

**Files**

- `src/components/DjBoothView.jsx`
- `src/components/PocketRemoteView.jsx`
- `src/components/PhotographerView.jsx`
- `src/components/SpeakerView.jsx`
- `src/views/McMasterView.jsx`
- `src/components/*Card.jsx` as needed
- `src/i18n/{en,fr,pl}.js`
- `tests/i18n.test.js`

**Steps**

1. Inventory visible UI strings in those views (headings, buttons, empty
   states, status labels, time labels).
2. Add flat keys with a stable prefix per area, e.g.
   `dj.title`, `pocket.allComplete`, `photo.sunsetUnavailable`,
   `speaker.scriptMissing`, `mc.radarEmpty`.
3. Replace literals with `useI18n().t(...)`; do not translate cartridge content
   (step titles, speech text, couple names).
4. Add plural keys where a count is shown (`tp`).
5. Extend `tests/i18n.test.js` with one render assertion per role view in FR
   and PL.
6. Run `npm run validate:i18n` to catch missing keys/placeholders.

**Acceptance**

- No hardcoded English UI labels remain in the listed views except domain/
  cartridge content.
- EN/FR/PL key sets stay complete.
- Role views render without missing-key fallbacks (`key` strings).

---

## UI-10 — Skip link and focus restoration

**Problem:** full-screen role views lack a skip link; after a role switch or
admin tab change, keyboard focus can be lost or remain on a removed control.
`docs/accessibility-audit.md` lists full-screen focus management as a follow-up.

**Files**

- `src/views/McMasterView.jsx`
- `src/components/DjBoothView.jsx`
- `src/components/PocketRemoteView.jsx`
- `src/components/PhotographerView.jsx`
- `src/components/SpeakerView.jsx`
- `src/admin/AdminApp.jsx`
- `src/index.css`

**Steps**

1. Add a visually-hidden-until-focused skip link as the first focusable element
   in each full-screen view: “Skip to timeline” → `#main-content`.
2. Add `id="main-content"` and a landmark (`<main>`) to each view.
3. On role change, move focus to the new view’s `main`/heading and announce it
   with `role="status"`.
4. On admin tab change, move focus to the active tab panel heading.
5. Add a `focus-ring` check in both themes.
6. Add a small test for the focus target IDs/landmarks if feasible.

**Acceptance**

- First `Tab` reveals the skip link; Enter moves focus to the main content.
- Role switch and admin tab changes leave focus in the new panel.
- No visible layout shift when the skip link is unfocused.

---

## Per-item validation

Run after every item:

```bash
npm run lint
npm test
npm run build
npm run validate:schema
npm run validate:fixtures
npm run validate:template
npm run validate:i18n
```

Add these manual checks for the affected item:

- **UI-01/05/06:** keyboard-only dialog flow, Escape cancels, focus returns.
- **UI-02/03/07:** empty deployment, archived filter, hidden-tab polling.
- **UI-04:** print preview contains QR cards only.
- **UI-08:** reveal PIN, Caps Lock warning, QR deep link focus.
- **UI-09:** switch EN → FR → PL in every role view.
- **UI-10:** first Tab, role switch, admin tab switch.

## Definition of done

- Each item is a separate merged PR with `Closes`/reference to its tracking
  issue if one exists.
- No native `window.prompt`/`window.confirm` remains in `src/admin`.
- No regression in offline mode, PWA update flow or role PIN join.
- New UI strings exist in all three locales.
- `project.md` and `README.md` are updated if an item changes documented
  behaviour.
