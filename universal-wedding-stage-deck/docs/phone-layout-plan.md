# Phone / Pocket Layout Plan

**Created:** 2026-11-06  
**Decision:** remove the separate **Pocket** role and give every role a classy,
phone-first layout on small screens. Laptop/tablet keeps the full layout.
MC's phone layout allows **advance, undo and drift check**; DJ, Photographer
and Speaker stay read-only. `/deck/admin` is laptop/desktop-only (mobile restriction tracked in #337).

Each `P-NN` section below maps to one GitHub issue. Suggested branch names:
`p-01-remove-pocket-role`, `p-02-responsive-role-shell`, `p-03-mc-phone-layout`,
`p-04-dj-phone-layout`, `p-05-photo-phone-layout`, `p-06-speaker-phone-polish`.

> Desktop MC uses the shared **Stage Rail** (completed / current hero / upcoming)
> described in [`mc-stage-rail-plan.md`](mc-stage-rail-plan.md). The phone layouts
> below reuse the same `RoleShell` and bottom navigation, and the rail collapses
> to a single hero-first column on phones.

---

## P-01 — Remove the Pocket role entirely

**Problem:** the Pocket role is replaced by per-role phone layouts. Keeping it
as a joinable role leaves a stale, non-classy duplicate view and duplicates the
MC handheld experience.

**Files**

- `src/lib/roles.js`
- `src/components/RoleJoinScreen.jsx`
- `src/components/RoleSwitcher.jsx`
- `src/App.jsx`
- `src/components/PocketRemoteView.jsx`
- `src/admin/adminUtils.js`, `src/admin/AdminApp.jsx` (QR cards, filters)
- `src/lib/sync/roleSession.js`
- `src/lib/sync/joinRoom.js`
- `supabase/functions/join_room/index.ts`
- `supabase/schema.sql` / `supabase/migrations/`
- `src/i18n/{en,fr,pl}.js`
- `README.md`, `schema/README.md`, `project.md`
- `tests/`

**Steps**

1. Remove `pocket` from `ROLES`, `ROLE_ORDER`, `availableRoleIds`, join roles,
   role session normalization, admin QR cards, role filters and i18n labels.
2. Remove `PocketRemoteView` from `App.jsx` and delete the component.
3. Reject `pocket` joins server-side; leave existing `role_sessions` rows in
   place (they expire/revoke normally) but block new joins.
4. Remove the Pocket role from schema role enums, RLS role lists and validation.
5. Update docs and fixtures so the four remaining roles are the only joinable
   roles.
6. Migrate existing localStorage `role: pocket` to `mc` on load (one-time
   normalization) so a paired device is not stranded.
7. Remove Pocket-only tests and add a regression test that `pocket` is rejected.

**Acceptance**

- No code path references the Pocket role except migration notes.
- Join screen offers MC/DJ/Photo/Speaker only.
- A stored `pocket` role loads as MC locally.
- Old pocket sessions cannot rejoin and expire naturally.
- `npm run validate:schema`, fixtures, template and i18n all pass.

---

## P-02 — Shared responsive role shell and phone navigation

**Problem:** each role currently owns its full-screen layout. A shared shell is
needed so every role gets the same classy phone treatment: fewer panels,
bigger touch targets, a bottom navigation bar and consistent focus behaviour.

**Files**

- `src/components/RoleShell.jsx` (new)
- `src/components/BottomNav.jsx` (new)
- `src/views/McMasterView.jsx`
- `src/components/DjBoothView.jsx`
- `src/components/PhotographerView.jsx`
- `src/components/SpeakerView.jsx`
- `src/index.css`
- `tests/accessibility.test.js`

**Steps**

1. Add a `RoleShell` wrapper: header (logo, role, identity, status),
   scrollable content region and a bottom navigation bar on `max-width: 640px`.
2. The bottom bar shows the current role, sync status and the phone actions
   allowed for that role (MC: advance/undo/drift; others: read-only).
3. Provide `compact` / `wide` layout slots so each view can declare its phone
   and desktop content without duplicating chrome.
4. Use a media query hook or CSS container to choose the layout; avoid JS
   breakpoint flicker.
5. Keep the skip link, landmarks and focus restoration from UI-10.
6. Add tests for the shell contract (landmarks, bottom bar on compact).

**Acceptance**

- All four role views render through the shared shell.
- Phone layout hides non-essential side panels; actions stay reachable in one
  thumb reach.
- No layout jump when switching between phone and laptop widths.
- Classy, modern spacing with no cramped controls.

---

## P-03 — MC phone layout: advance, undo and drift check

**Problem:** after Pocket is removed, the MC still needs a phone workflow for
walking segments (aperitif, garden, terrace). The full MC view is too dense for
a phone.

**Files**

- `src/views/McMasterView.jsx`
- `src/components/RoleShell.jsx`
- `src/components/BottomNav.jsx`
- `src/components/DriftPill.jsx`
- `src/components/HoldToConfirmButton.jsx`
- `src/components/TeleprompterOverlay.jsx`
- `src/components/UndoToast.jsx`
- `src/i18n/{en,fr,pl}.js`

**Steps**

1. In the MC phone layout, show: reel clock, canonical drift pill, current step,
   real start/estimated end, next step peek, cake and music policy summary.
2. Phone actions: **Hold to advance**, **Undo**, drift check and optional
   script/teleprompter launcher. No stage pings, importer or admin.
3. Keep hard-anchor collision banner; it is safety-critical.
4. Use `HoldToConfirmButton` with localized labels.
5. Reuse the shared bottom nav from P-02; do not resurrect the Pocket role.
6. Add tests for the allowed phone actions and labels.

**Acceptance**

- MC phone layout can advance, undo and check drift only.
- No stage pings or admin actions on the phone layout.
- Same live state as the laptop MC view; syncs in production.
- i18n covers the phone labels in EN/FR/PL.

---

## P-04 — DJ phone layout

**Problem:** the DJ needs a phone view that is readable from across a table,
without the laptop timeline grid.

**Files**

- `src/components/DjBoothView.jsx`
- `src/components/RoleShell.jsx`
- `src/components/BottomNav.jsx`
- `src/components/ReelClock.jsx`
- `src/components/StagePingBanner.jsx`
- `src/components/CutoffStopwatchCard.jsx`
- `src/components/KeySongsCard.jsx`
- `src/i18n/{en,fr,pl}.js`

**Steps**

1. Phone layout shows: reel clock, current track/step, projected end, cutoff
   stopwatch, key songs and stage pings.
2. Keep it read-only; no step controls, no role switcher complexity.
3. Prioritize cutoff visibility and large type for noisy venues.
4. Keep VIP key songs only when the package is VIP.
5. Add tests for the phone cutoff display.

**Acceptance**

- DJ phone layout is read-only and readable at arm's length.
- Cutoff stopwatch and stage pings stay prominent.
- No MC controls appear.

---

## P-05 — Photographer phone layout

**Problem:** the photographer needs a quick phone checklist for shots, sunset
windows and Oczepiny cues without the laptop dashboard.

**Files**

- `src/components/PhotographerView.jsx`
- `src/components/RoleShell.jsx`
- `src/components/BottomNav.jsx`
- `src/components/ReelClock.jsx`
- `src/i18n/{en,fr,pl}.js`

**Steps**

1. Phone layout shows: current step, sunset/golden-hour countdowns, Oczepiny
   countdown, shot checklist, media team call links and venue access.
2. Keep it read-only; tap-to-call and map links stay prominent.
3. Collapse media team and venue details into phone-friendly accordions.
4. Show the mini-session latest-start timer first when it is active.
5. Add tests for the phone checklist and call links.

**Acceptance**

- Photographer phone layout is read-only.
- Sunset/Oczepiny cues and call links are reachable with one hand.
- No MC or DJ controls appear.

---

## P-06 — Speaker phone layout polish

**Problem:** the Speaker view is already single-column, but the phone treatment
needs larger script type, fewer chrome elements and a focus-friendly reading
flow.

**Files**

- `src/components/SpeakerView.jsx`
- `src/components/RoleShell.jsx`
- `src/components/BottomNav.jsx`
- `src/index.css`
- `src/i18n/{en,fr,pl}.js`

**Steps**

1. Wrap the Speaker view in the shared shell and hide non-essential chrome on
   phones.
2. Increase script line height and font scale controls for outdoor reading.
3. Keep the assigned-speech contract and cached fallback unchanged.
4. Keep read-only; no step controls.
5. Add tests for the phone script presentation.

**Acceptance**

- Speaker phone layout is readable in bright light and with one hand.
- No MC/DJ controls appear.
- Assigned-speech caching still works offline.

---

## Validation for each P item

```bash
npm run lint
npm test
npm run build
npm run validate:schema
npm run validate:fixtures
npm run validate:template
npm run validate:i18n
```

Manual checks:

- Phone layout at 360–430px width is one-hand usable.
- Laptop layout at ≥1024px is unchanged.
- No Pocket role in join, QR cards, admin filters or i18n.
- Production join still enforces per-role PIN and session revocation.
- Skip link, focus restoration and reduced motion still work.

---

## Mobile 3D current-step QA

Check at 320×568 and 375×667:

- MC, DJ Standard/VIP, Photographer 1/2, Cameraman, Speaker and Venue Manager
  show the same subtle current-step tilt.
- Scrolling does not jitter or change the tilt continuously.
- Pressing/advancing the step gives a short settle animation without layout
  shift or clipped text.
- Desktop pointer tracking at ≥1024px is unchanged.
- `prefers-reduced-motion` renders the card flat while retaining elevation.
- Dev role previews inherit the effect; blocked mobile admin and non-step admin
  cards stay flat.

