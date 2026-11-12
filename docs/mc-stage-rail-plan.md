# MC Stage Rail — current-step hero with done / upcoming accordions

> **Superseded (2026-11-07):** The “Universal timeline focus stacks” decision in
> `project.md` replaces the MC-only previous/current/next guidance and the
> three-cards-per-rail idea below wherever they conflict. The shared
> implementation now lives in `src/lib/focusStack.js` and
> `src/components/TimelineFocusStack.jsx`; `src/components/StageRail.jsx` is a
> backwards-compatible adapter.

**Created:** 2026-11-06
**Baseline:** `master` @ `1ad7de9`
**Scope:** MC Master desktop presentation only. No schema, sync, drift-engine or
auth changes. DJ / Photographer / Speaker views and the phone bottom nav are
untouched.

---

## 1. The idea

Today the MC main dashboard is a 70/30 split: a dense active-step card on the
left and a stacked sidebar on the right. The step sequence is invisible except
for a small “PEEK NEXT” box, so the MC cannot *feel* where they are in the night.

The **Stage Rail** turns the timeline into the primary object:

```text
        DONE (past)                NOW (hero)                 UPCOMING (next)
  ┌───────────────────┐   ┌─────────────────────────┐   ┌───────────────────┐
  │ ✓ step 03  ▸      │   │  ●  FLEXIBLE STEP       │   │  step 05      ▸   │
  │   step 02  ▸      │───│  Cocktail /             │───│  step 06      ▸   │
  │   step 01  ▸      │   │  Vin d’honneur          │   │  step 07      ▸   │
  └───────────────────┘   │  📍 Ballroom            │   └───────────────────┘
      accordion           │  19:42 → 20:30          │       accordion
      (collapsed)         │  [ MC cues / subtasks ] │       (collapsed)
                          └─────────────────────────┘
                                   elevated
```

- **Center** — the current step is a large, elevated *hero card*.
- **Left** — completed steps as collapsed accordion cards, most recent nearest
  the hero. Expanding one reveals its time/location and what was completed.
- **Right** — upcoming steps as collapsed accordion cards, the immediate next
  step nearest the hero. Expanding one reveals projected start/end and drift.
- A thin **timeline spine** with status dots connects all three zones and fades
  out at the rail edges, so the eye reads left → center → right as past → now →
  future.

Everything else (sidebar cards, footer controls, overlays) stays where it is;
the Stage Rail replaces only the top of the main dashboard.

---

## 2. Design principles

1. **One focal point.** The current step must be the unmistakable hero: larger
   type, a brand-tinted ring and shadow, while past cards recede (slightly muted)
   and future cards stay neutral.
2. **Progressive disclosure.** Rails are collapsed by default — a single line of
   title + monospace time. Expanding is deliberate, on tap/click/Enter.
3. **Calm, not busy.** Max ~3 visible cards per rail with a soft gradient fade;
   the rest scrolls inside the rail. No horizontal page scroll.
4. **Direction is meaning.** Past = left, now = center, future = right. This
   holds in every theme and at every breakpoint (stacked on phone, but the order
   is preserved).
5. **Status is colour + label, never colour alone.** `DONE` / `ON AIR` / `NEXT` /
   `PLANNED` chips carry text.
6. **Keyboard and screen-reader first.** Accordions are real disclosure widgets
   (`aria-expanded`, `aria-controls`, focus-visible ring). Arrow keys move within
   a rail; Home/End jump to ends; Escape collapses.
7. **Motion is a garnish.** Respect `prefers-reduced-motion`; transitions are
   ≤180ms and only opacity/transform.

---

## 3. Layout by breakpoint

| Breakpoint | Layout |
| --- | --- |
| `≥1280px` | 3-zone grid: `done (minmax 220px, 1fr) · hero (minmax 380px, 1.6fr) · upcoming (minmax 220px, 1fr)`. Rails show up to 3 cards each with edge fades. |
| `1024–1279px` | 3-zone grid, narrower rails (2 cards visible), hero slightly reduced type. |
| `768–1023px` | Hero full width on top; a single horizontal “rail strip” below with segmented `Done · Now · Upcoming` chips that scroll to a card. |
| `<768px` (matches the phone shell) | Single column: hero first, then two collapsible groups (“Done”, “Upcoming”) rendered as stacked accordions. No 3-column squeeze. |

The phone view keeps the existing `RoleShell` + `BottomNav` chrome; only the body
inside the shell changes.

---

## 4. Data contract

The rails are derived from the existing drift entries — no new state:

```js
buildStageRail(entries, activeIndex) → {
  done:     entries.slice(0, activeIndex).reverse(), // most recent first
  current:  entries[activeIndex] ?? null,
  upcoming: entries.slice(activeIndex + 1),          // next first
}
```

Each entry already provides: `index`, `step` (`title`, `location`, `type`,
`durationMin`, `dj`, …), `isActive`, `isDone`, `projectedStart`,
`projectedEnd`, `projectedDriftMinutes`, `driftLabel`.

- Read from `driftReport.entries` in `McMasterView` (already in `mcModel` via
  `driftReport`); no change to `App.jsx` is required for the read path.
- Nothing here is persisted or synced.

---

## 5. Visual tokens

| Element | Night Stage | Daylight |
| --- | --- | --- |
| Hero ring | `ring-2 ring-brand-strong`, `shadow-2xl shadow-blue-950/50` | `ring-2 ring-brand`, `shadow-xl shadow-slate-900/10` |
| Done card | `border-emerald-800/60 bg-emerald-950/30`, text `slate-400`, `opacity-90` | `border-emerald-300 bg-emerald-50`, text `slate-600` |
| Next card | `border-amber-800/60 bg-amber-950/30` | `border-amber-300 bg-amber-50` |
| Later card | `border-line bg-card/70` | same tokens, light values |
| Spine | 1px gradient `emerald-700 → brand → amber-700` | `emerald-400 → brand → amber-400` |
| Edge fade | `mask-image: linear-gradient(...)` | same |

Use existing Tailwind tokens (`bg-card`, `border-line`, `text-ink`, `bg-brand`,
`text-brand-tint`, `bg-raised`, `text-slate-*`, `bg-alert`) — no new CSS
variables unless a token is genuinely missing.

---

## 6. Interaction spec

- **Expand / collapse:** header button toggles a body region. One card per rail
  may be open at a time; opening a second closes the first.
- **Current step:** always expanded; cannot be collapsed. Its body contains the
  existing MC cues, catering sub-tasks and script/game launcher.
- **Next step:** header always shows projected start; body adds duration and
  drift.
- **Done step:** header shows the title and start time; body shows location,
  duration and a “completed” line. No controls to edit history.
- **Keyboard:** `ArrowUp/ArrowDown` move between cards in a rail; `Home/End`
  first/last; `Enter/Space` toggle; `Escape` closes an open card. Focus is never
  trapped.
- **Screen reader:** rail regions are labelled (“Completed steps
  (N)”, “Upcoming steps (N)”); the hero is `<section aria-labelledby>` with the
  step title as the label. Status chips include the word.
- **Reduced motion:** no spine “draw-in” animation; instant expand.

---

## 7. What stays the same

- MC cues, catering sub-tasks, teleprompter and game launchers remain inside the
  hero body.
- Sidebar cards (ReelClock, Cake, Music policy, Pre-wedding checklist, Event
  admin, Speeches, Hard-anchor radar, Stage pings) remain in the right column
  beneath the rail on wide screens. The buffer accordion was removed with the
  legacy step types.
- Footer drift controls, undo toast and hold-to-advance are unchanged.
- The **PEEK NEXT** sidebar card is removed once the upcoming rail ships, to
  avoid duplicating the next step.
- DJ, Photographer and Speaker views are untouched.
- `/deck/admin` is laptop/desktop-only (mobile access restriction tracked in
  [#337](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/337)).

---

## 8. Implementation items

Suggested branch names: `sr-01-stage-rail-helper`, `sr-02-mc-rail-integration`,
`sr-03-rail-accordion-a11y`, `sr-04-rail-responsive-polish`.

---

## SR-01 — Stage rail data helper and presentational component

**Problem:** there is no component that arranges the timeline as past / now /
future; the active step and “peek next” are rendered ad hoc.

**Files**

- `src/lib/stageRail.js` (new): `buildStageRail(entries, activeIndex)` and
  `stageRailSummary(entry)` helpers.
- `src/components/StageRail.jsx` (new): presentational 3-zone shell
  (`done`, `current`, `upcoming` slots) built from the helper.
- `src/components/StageStepCard.jsx` (new): a single step card with variants
  `done | current | next | later`.
- `tests/stage-rail.test.js` (new).

**Steps**

1. Implement `buildStageRail` as a pure function with guards for empty entries,
   no active entry and single-step events.
2. Implement `StageStepCard` with a `variant` prop driving the visual tokens
   from §5; render title, location, monospace projected time, status chip and
   drift chip when present.
3. Implement `StageRail` as a layout-only component that accepts the three
   collections and resolves breakpoints with CSS (`grid` classes), not JS.
4. Keep it presentational and dependency-free: no model access, no hooks beyond
   local open/closed state (introduced in SR-03).
5. Unit-test ordering (done reversed, next first), empty/complete cases and the
   summary text.

**Acceptance**

- Helper returns the exact shapes in §4 for edge cases (0 steps, 1 step, last
  step active, all done).
- `StageRail` renders without `driftReport` semantics and is covered by a render
  smoke test.
- No change to `App.jsx` or `McMasterView.jsx` yet.

---

## SR-02 — Integrate the rail into the MC desktop dashboard

**Problem:** the main dashboard leads with a dense card and hides the sequence;
“PEEK NEXT” is the only forward context.

**Files**

- `src/views/McMasterView.jsx`
- `src/components/StageRail.jsx` (from SR-01)
- `tests/phone-layout.test.js` (extend) / `tests/stage-rail.test.js`

**Steps**

1. In the MC wide layout, derive `{ done, current, upcoming }` from
   `driftReport.entries` and render `<StageRail>` across the top of `<main>`.
2. Move the existing MC cues, catering sub-tasks and the script/game launcher
   into the hero body (`current` slot), preserving their markup and handlers.
3. Keep hard-anchor banner above the rail; keep the sidebar beneath/beside it.
4. Remove the now-redundant **PEEK NEXT** sidebar card.
5. Ensure the footer drift controls and hold-to-advance still target the same
   handlers.
6. Confirm no regression in the phone layout (compact content unchanged).

**Acceptance**

- Desktop MC shows done-left / hero-center / upcoming-right in one glance.
- Every existing control (swap, undo, advance, teleprompter, subtasks, pings,
  overlays) still works.
- No duplicated next-step display remains.
- Phone layout and other roles unchanged.

---

## SR-03 — Accordion interaction, keyboard and i18n

**Problem:** rails need deliberate expand/collapse that is accessible and
localised.

**Files**

- `src/components/StageStepCard.jsx`
- `src/components/StageRail.jsx`
- `src/i18n/{en,fr,pl}.js`
- `src/index.css` (reduced-motion + focus ring if needed)
- `tests/stage-rail.test.js`, `tests/i18n.test.js`

**Steps**

1. Add a disclosure header button with `aria-expanded`, `aria-controls` and a
   rotating chevron; body rendered in a labelled region.
2. Enforce one-open-per-rail; the current card is always open and not
   collapsible.
3. Add roving focus: `ArrowUp/Down`, `Home/End`, `Escape` per §6.
4. Add i18n keys: `mc.rail.done`, `mc.rail.upcoming`, `mc.rail.now`,
   `mc.rail.status.done/active/next/planned`, `mc.rail.completed`,
   `mc.rail.noSteps`, `mc.rail.expand`, `mc.rail.collapse` in EN/FR/PL.
5. Respect `prefers-reduced-motion` for the expand transition and chevron.
6. Extend tests: keyboard toggling, single-open behaviour, and i18n render in
   FR/PL.

**Acceptance**

- Keyboard-only user can traverse and toggle every rail card.
- Screen readers announce region labels and expanded state.
- No hardcoded English remains in the rail; `validate:i18n` passes.

---

## SR-04 — Responsive rail, themes and final polish

**Problem:** the 3-zone rail must degrade gracefully to tablet and the existing
phone shell, and look intentional in both themes.

**Files**

- `src/components/StageRail.jsx`
- `src/components/StageStepCard.jsx`
- `src/views/McMasterView.jsx`
- `docs/phone-layout-plan.md` (cross-reference)
- `docs/accessibility-audit.md` (update follow-ups)

**Steps**

1. Apply the breakpoint table in §3: 3-zone grid ≥1024px, hero + rail strip on
   tablet, stacked collapsible groups in the compact/phone body.
2. Add edge-fade masks and independent rail scrolling with visible-but-subtle
   scrollbars; no page-level horizontal scroll.
3. Tune Night Stage and Daylight tokens; verify contrast for chips and muted
   text (target ≥4.5:1 for body, ≥3:1 for large text/chips).
4. Verify hero elevation and rail fade on both themes and at 200% zoom.
5. Update `docs/accessibility-audit.md` and the phone-layout plan cross-link.
6. Add a visual regression checklist to the PR (screenshots at 375, 768, 1024,
   1440).

**Acceptance**

- No horizontal overflow at 320px width.
- Phone body keeps the RoleShell bottom nav and advance/undo.
- Both themes pass the contrast check; reduced motion is honoured.
- Docs reference the shipped rail.

---

## 9. Validation

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

Manual checks for SR-02/SR-04:

- 375 / 768 / 1024 / 1440 widths, both themes.
- Advance and undo move the hero smoothly; done/upcoming rails update.
- Keyboard-only traverse of both rails.
- Reduced-motion preference disables transitions.

## 10. Definition of done

- Each item is a separate merged PR with `Closes` for its tracking issue.
- The MC desktop shows done-left / hero-center / upcoming-right.
- Phone layout, other roles, drift engine and sync behaviour are unchanged.
- EN/FR/PL keys are complete and `validate:i18n` passes.
- `project.md` and `README.md` mention the Stage Rail if behaviour is documented.
