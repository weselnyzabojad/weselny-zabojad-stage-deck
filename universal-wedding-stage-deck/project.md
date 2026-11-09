# Universal Wedding Stage Deck — Project Status & Roadmap

**Last aligned:** 2026-11-09

**Aligned with:** `master` @ `defbbe6` (issue #543 review follow-ups)

**Canonical sources:** this file, [`README.md`](README.md), [`schema/README.md`](schema/README.md), and [`docs/`](docs/).

> This file replaces the previous 14,493-line raw roadmap archive. That archive
> contained duplicated, escaped and partly obsolete blocks (for example the
> Joker Drawer and Kitchen +15m features removed in issue #75). It remains
> available in git history at commit `743eeef`; it is **not** maintained.

---

## 1. Product

An offline-first, multi-device stage deck for a wedding MC and crew:

- one cartridge-driven timeline, shared by the MC tablet, DJ booth, pocket phone,
  photographer and speaker;
- a drift scheduling engine with hard anchors and flexible steps;
- production room access through per-role 6-digit PINs;
- an owner-only admin surface for the wedding library, PINs, QR cards, presence
  and audit;
- installable PWA with a deferred update prompt (never reloads a live stage
  silently).

Primary deployment path is `/deck/`; the owner surface is `/admin`.

---

## 2. Current status

### Delivered

| Area | Status |
| --- | --- |
| Stage deck views (MC/DJ/Photo/Speaker) | Complete |
| Responsive phone layouts for every role | Complete (#109–#114) |
| Drift engine, flexible schedule, hard-anchor radar | Complete |
| Cake, speeches, key songs, music policy, photo plan | Complete |
| Group-photo step and shared MC/Photographer checklist | Complete (#378, #379) |
| Mandatory constraints embedded in timeline steps | Complete (#384) |
| Shared secondary control bar across role views | Complete (#385) |
| Sunset/mini-session kept out of planning | Complete (#390) |
| Full-width secondary bar | Complete (#391) |
| Hard-anchor banner children notice removed | Complete (#392) |
| Couple common languages label | Complete (#394) |
| Full-width DJ layout | Complete (#396) |
| Game Clicker scoped to games step | Complete (#398) |
| Cake Protocol consolidation | Complete (#399) |
| Mini-session timeline twin task | Complete (#401) |
| Centered mini-session hour control | Complete (#402) |
| One timeline step per game | Complete (#414) |
| LATE stable across Undo | Complete (#416) |
| Offline-first localStorage + optional Supabase sync/outbox | Complete |
| Production per-role PIN join (`join_room` + role JWT) | Complete |
| Deferred PWA update flow (#81) | Complete |
| PWA icons + favicon (#74) | Complete |
| Per-device i18n EN/FR/PL (#78) | Complete |
| Deprecated-feature cleanup (#75) | Complete |
| Owner admin panel `/admin` (#76) | Complete in code; live Supabase smoke test tracked by #533 |

### Open roadmap issues

Only genuinely open issues are listed here; completed work stays in the
sections below and in git history.

| Issue | Item | Type |
| --- | --- | --- |
| [#80](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/80) | Cartridge-driven MC cues (remove hardcoded demo cues) | Implementation |
| [#245](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/245) | Speaker dedicated speech cartridge | Planning TODO |
| [#459](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/459) | Optional free song metadata validation | Planning TODO; owner approval required |
| [#533](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/533) | Admin: live Supabase smoke test | Release validation |
| [#539](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/539) | MC: remove More/swap on Test Wiedzy/Test Zgodności steps | Implementation |
| [#541](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/541) | App-wide: stop frequent full-page reloads/white flashes | Bug fix / stability |
| [#547](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/547) | Google Doc template blueprint: canonical step vocabulary + Plan-of-the-day mapping | Planning / template |
| [#548](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/548) | Kitchen courses: variable-length mandatory course list on the timeline | Implementation |
| [#549](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/549) | Add Bread and Salt and Dance-with-the-couple timeline steps | Implementation |
| [#550](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/550) | Surface per-step MC cues in the MC view | Implementation |
| [#551](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/551) | Capture the ceremony script as the Ceremony step teleprompter | Implementation |
| [#552](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/552) | Parser-mapper uniform edge-case rules | Implementation |
| [#553](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/553) | Witnesses (świadkowie/témoins) as key persons | Planning TODO |

The follow-ups from the 2026-11-08 UI review, re-review and mobile 375px audit
are catalogued in [UI review fixes 2026-11-08](#ui-review-fixes-2026-11-08).
The owner's later i18n and Venue Manager rework request is catalogued in
[i18n completion and venue mandatory-step rework](#i18n-completion-and-venue-mandatory-step-rework-decision-2026-11-08).
The pocket-header and Speaker focus decisions are catalogued in
[compact pocket header and Speaker focus](#compact-pocket-header-and-speaker-focus-decision-2026-11-08).
The permanent red/green Children expected indicator is catalogued in
[Children expected state indicator](#children-expected-state-indicator-decision-2026-11-08).
Its Google Doc/cartridge boolean source is covered by
[children expected data source](#children-expected-data-source-decision-2026-11-08).
The top-bar icon-size adjustment is catalogued in
[top-bar icon sizing](#top-bar-icon-sizing-decision-2026-11-08).
The DJ Standard role-label correction is catalogued in
[DJ Standard role label](#dj-standard-role-label-decision-2026-11-08).
The guest song request v2 decision is catalogued in
[guest song request v2](#guest-song-request-v2-decision-2026-11-08).
The guest QR launcher is catalogued in
[song request QR launcher](#song-request-qr-launcher-decision-2026-11-08).
The DJ VIP Disco Polo policy is catalogued in
[Disco Polo policy](#disco-polo-policy-decision-2026-11-08).
The parallel attraction reminder is catalogued in
[parallel attractions](#parallel-attractions-photobooth-decision-2026-11-08).
The admin provider registry and DJ access model are catalogued in
[service providers and DJ access](#service-providers-and-dj-access-decision-2026-11-08).
The game concept rework is catalogued in
[game concept rework](#game-concept-rework-decision-2026-11-08).
The 2026-11-09 Speaker/LATE/MC Cues corrections are catalogued in
[Speaker, LATE and game-step Cues](#speaker-late-and-game-step-cues-decision-2026-11-09).
The MC game-card heading correction is catalogued in
[MC game card heading](#mc-game-card-heading-decision-2026-11-09).
The operational, admin-dialog and i18n/data-boundary follow-ups are catalogued in
[admin and i18n follow-ups](#admin-and-i18n-follow-ups-decision-2026-11-09).
The MC game-step overflow removal is catalogued in
[MC game-step overflow](#mc-game-step-overflow-decision-2026-11-09).
The app-wide reload/white-flash stability issue is catalogued in
[app-wide reload stability](#app-wide-reload-stability-decision-2026-11-09).
The Google Doc "Plan of the day" mapping for `example.pdf` is catalogued in
[Google Doc plan-of-the-day mapping](#google-doc-plan-of-the-day-mapping-decision-2026-11-09).
Both registers keep #80, #245 and #459 open.

### Planning TODO register

Planning TODOs are product/design decisions, not implementation commitments.
They must not be implemented until the owner approves the behaviour and a
follow-up implementation issue exists.

| Item | Tracking | Status |
| --- | --- | --- |
| Dedicated Speaker speech cartridge | [#245](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/245) | Open; needs schema, validation, revision/publication and offline-cache contract |
| Media-team visibility and restrictions | [#233](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/233) | Closed; the Media team card stays removed and its data remains in the model |
| Precise predefined-step definitions | [#263](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/263) | Closed; see [`docs/predefined-step-audit.md`](docs/predefined-step-audit.md) for the current concept audit |
| Optional free song metadata validation | [#459](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/459) | Open; iTunes Search/MusicBrainz research, owner approval required before implementation |

There are no open TODO entries for schema, MC cues, group photos or
predefined-step work: group photos were implemented in #378 and #379; #77 and
#80 are implementation issues, and #263 is closed.

### Responsive phone / pocket plan

Decision (2026-11-06, confirmed with the owner): remove the separate **Pocket**
role and give every role a classy, phone-first layout on small screens. The full
view remains on laptop/tablet. **Shipped** (#109–#114):

- **P-01 / #109** Remove the Pocket role entirely.
- **P-02 / #110** Shared responsive role shell + phone bottom navigation pattern.
- **P-03 / #111** MC phone layout: advance, undo and drift check.
- **P-04 / #112** DJ phone layout (read-only, large cutoff display).
- **P-05 / #113** Photographer phone layout (read-only, shot list).
- **P-06 / #114** Speaker phone layout (teleprompter, single column).

### MC Stage Rail (current-step hero)

UX decision (2026-11-06): the MC main dashboard should lead with the timeline
itself — the **current step as a large hero card in the centre**, **completed
steps as collapsed accordions on the left**, and **upcoming steps as collapsed
accordions on the right**, joined by a connective timeline spine. This replaces
the current active-step card and the small “PEEK NEXT” box. The phone layout,
other roles, the drift engine and sync are unchanged.

Design and implementation plan: [`docs/mc-stage-rail-plan.md`](docs/mc-stage-rail-plan.md).

- **SR-01 / [#118](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/118)**
  Stage rail data helper and presentational component.
- **SR-02 / [#119](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/119)**
  Integrate the rail into the MC desktop dashboard.
- **SR-03 / [#120](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/120)**
  Accordion interaction, keyboard support and i18n.
- **SR-04 / [#121](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/121)**
  Responsive rail, themes and final polish.

### MC top bar and Stage Rail refinements (decision, 2026-11-06)

Planned refinements to the MC Master experience. These are documented decisions
only; no implementation has been scheduled yet and no tracking issues were
created at this time. Item 5 supersedes the "up to 3 visible cards per rail"
guidance in [`docs/mc-stage-rail-plan.md`](docs/mc-stage-rail-plan.md).

1. **Cultural chips keep only icon, label and status.** The top-bar **Sto Lat**,
   **Gorzko** and **Oczepiny** chips no longer show descriptive note text. Remove
   the notes "Inform guests: NO Sto Lat tonight", "No gorzko" and "Scheduled for
   the midnight block"; everything else on those chips stays.
2. **Live clock in the top bar.** Remove the "REEL CLOCK" label and its small
   clock icon from the ReelClock card. The live clock (the current time of day,
   `clock.nowClock`) moves into the top bar, in place of the current fixed
   real-start chip. The header groups get consistent spacing between all
   elements (the current top-bar layout is too cramped).
3. **Every UI element is FR/PL/EN switchable.** All pages and views (MC, DJ,
   Photographer, Speaker, join screen, admin and the Stage Rail) must be fully
   localisable. Only cartridge content is exempt (it keeps its authored
   language).
4. **No Import button in the header.** Remove the Import button from the MC top
   bar.
5. **Rail shows only the immediate neighbours.** The Stage Rail displays at
   most three cards: the previous step on the left, the current step in the
   centre and the next step on the right. Older completed steps and later
   upcoming steps are not shown.
6. **QR to open on a phone.** When the view is a laptop/desktop width, display
   a QR code that opens the same view on a phone (scan to open the deck URL on
   the device).
7. **VIP Radar and Contacts are removed.** Both features, their modals, data
   fields, Google Doc sections and encrypted sensitive-note path are deleted.
   They must not be reintroduced. Cartridge import remains admin-only through
   `/admin`.

### Universal timeline focus stacks (decision, 2026-11-07)

The timeline workflow uses one shared depth model in **every role view** (MC,
DJ, Photographer and Speaker) and on **every viewport** (desktop, laptop,
tablet and compact phone/pocket layouts). The goal is one unmistakable focal
point — the active step — with only the immediate history and the immediate
future shown around it.

1. **Current step floats above everything.** The active step card is always the
   visual centre: elevated, floating and slightly 3D. Use layered depth
   (soft multi-layer drop shadows), a subtle perspective/tilt treatment and a
   stronger border/glow than any history or future card. It must remain the
   dominant element on a full desktop layout and on the smallest phone layout,
   for every role, even when the role view is read-only or shows a reduced
   subset of timeline data.
2. **Completed steps stack behind the current card.** Only the **last** done
   step and the **second-to-last** done step may be rendered:
   - the most recent completed step (immediately before the active step) is
     fully readable and prominent;
   - the second-to-last completed step sits underneath/behind it with reduced
     opacity and scale;
   - every older completed step is hidden from the timeline (not merely dimmed;
     keep it out of the stack and out of assistive reading order unless a
     dedicated “show all completed” control is provided).
3. **Future steps mirror the same horizon.** Only the **next** step and the
   **second-next** planned step may be rendered in the immediate horizon:
   - the immediate next step is the most visible future card;
   - the second-next planned step layers behind/fades in the same way as the
     second-to-last completed step;
   - anything farther into the future is hidden by default and only reachable
     through an explicit “show full timeline”/expand interaction.
4. **Responsive layout, identical rules.** Desktop/laptop uses a horizontal
   trailing stack (past — current — future). Phone/pocket may use a compact
   vertical or horizontal sliding depth stack, but it must keep the same
   visibility counts: one floating current card, at most two history cards and
   at most two future cards visible at once. Breakpoints may change card size,
   spacing, overlap, offset and the placement of controls; they may not change
   the depth rules.
5. **Shared rendering contract.** All role views use the same focus-stack
   component/helper fed by the same drift/timeline entries and live state.
   MC-specific controls (advance, undo, swap) may be hidden on non-MC roles,
   but card hierarchy, stacking order, opacity/scale tiers and visibility
   counts stay identical across roles and devices.
6. **Supersession and rollout.** This universal stack supersedes the
   MC-only “previous/current/next” card guidance above and the three-cards-per-rail
   idea in `docs/mc-stage-rail-plan.md` wherever they conflict. Implementation
   should introduce the shared focus-stack helper first, then port each role
   (desktop and pocket) to it, with visual regression or screenshot checks on a
   large desktop viewport and a compact phone viewport.

8. **Clock displays only the current time.** The desktop top-bar clock shows
   only `HH:MM:SS` from the corrected clock (`clock.nowClock`) and nothing else —
   no step number, no duration and no hidden data. Pocket headers do not show the
   clock.
9. **LATE unreel data button.** A button displaying unreel LATE data in the
   format `109709m` (minutes late) should be added to the top bar. This shows
   the cumulative late time across the event. Pressing **Undo** reverts the step
   state but must not change the displayed LATE value; normal schedule progress
   can still update it.
10. **Open on phone button.** The desktop button opens a closeable QR popup for
    the same role's pocket view. It is available for MC, DJ VIP, Photographer and
    Speaker, but not for DJ Standard or pocket. The popup closes with an X button,
    backdrop click and Escape.
11. **Sync button.** The sync badge displays only the text "Sync". Green means
    connected, orange means pending or connecting, and red means disabled,
    local-only, offline, disconnected or sync error. Detailed status remains in
    the tooltip.

### Top bar rework (decision, 2026-11-06)

Desktop top-left:

- logo;
- current time only, formatted as `HH:MM:SS`;
- static role label;
- DJ label includes the service tier: **DJ Standard** or **DJ VIP**;
- couple name/date only for **MC** and **DJ VIP**.

Desktop top-right:

- **MC:** cultural chips, PIN/sign-out, Sync, role switcher, Open on phone,
  language, icon-only theme and drift (MC only);
- **DJ Standard:** Sync, language and icon-only theme only;
- **DJ VIP:** Sync, Open on phone, language and icon-only theme;
- **Photographer:** Sync, Open on phone, language and icon-only theme;
- **Speaker:** Sync, Open on phone, language and icon-only theme; the local
  Speaker Exit button is removed.

Shared controls:

- Sync visible text is only "Sync"; details stay in the tooltip.
- Theme is icon-only everywhere.
- Language stays on desktop and pocket.
- Only MC desktop gets the role switcher. Non-MC roles and pocket views have no
  role-switching control.
- VIP Radar, the empty placeholder button and Contacts are removed from the app
  entirely. Both features, their modals, data fields and import paths must not
  be reintroduced.

Pocket header:

- logo/role badge, Sync, language and icon-only theme;
- no clock, no Open on phone and no role switcher.

Implementation issues:

- [#155](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/155) — shared clock, sync and theme controls;
- [#156](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/156) — Open on phone QR popup;
- [#157](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/157) — MC top-bar layout and removed VIP/contact controls;
- [#158](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/158) — non-MC role and DJ tier top bars;
- [#159](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/159) — shared pocket header.

### Top bar reorganization v2 (decision, 2026-11-07)

This supersedes the desktop and pocket arrangements above where they conflict.
It applies to every role and viewport; role-specific controls remain role-gated
as described.

**Clock.** The desktop current-time clock becomes visibly larger and remains the
dominant left-side element. It still shows only `HH:MM:SS` from `clock.nowClock`
— no step number, duration or hidden data. Pocket headers keep no clock.
([#186](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/186))

**Role element.** The "Maître de cérémonie" role-switching control is removed
entirely. It is replaced by the existing single **Role: MC** element:

- MC keeps the current click action on it (sign out in production, forget the
  room PIN in local/demo mode);
- DJ Standard, DJ VIP, Photographer and Speaker show the same element but
  non-clickable;
- no role switching is available anywhere, including pocket.

([#188](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/188))

**Couple identity.** The cartridge-driven couple block is horizontally centered
in the desktop top bar for the roles that already show it (MC and DJ VIP). It
shows each first name with their nationality flag (for example Jennifer + flag,
Guillaume + flag) plus the shared-language chips, fully localised. The DJ VIP
event date remains with the identity. The left side keeps logo, clock and static
role; the right side carries the controls below.
([#187](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/187))

**Right-hand two-row stack.** On desktop the right side of the top bar is one
aligned stack:

1. top row — **Sto Lat**, **Gorzko** and **Oczepiny** cultural chips (MC only);
2. bottom row — **Open on phone** (eligible roles), UI **language** switcher and
   icon-only **light/dark** theme toggle.

The previous inline placement is removed. DJ Standard still has no Open on
phone; Open on phone remains desktop-only; non-MC roles have no cultural chips.
The stack must wrap readably at tablet widths without colliding with the
centered couple block.
([#189](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/189))

**PIN and Sync move into the hard-anchor banner.** While the "Collision avec un
repère fixe" / "Compression contre un repère fixe" banner is displayed, the
PIN/role sign-out element and the Sync badge move to the right side of that
banner. When no warning banner is present, both return to the top bar as a
fallback so they are never lost. This hosting applies to MC, the only role that
renders the banner; other roles keep their normal top-bar Sync. The banner's
right-side detail text — for example "Photo / Video leaves · 20:30 · 5 min de
marge" — becomes white with sufficient contrast in both collision and
compression tones.
([#190](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/190))

**Pocket header.** Add mini Sto Lat, Gorzko and Oczepiny chips (icon + label +
the same colour tone/dot as desktop) to the pocket header where the data is
available. Mini chips hide all visible status text, including STRICT NO; the
full status remains in the accessible label/tooltip. The pocket drift pill drops
the "de retard" wording: a late drift shows only the magnitude, for example
`+25 min`, while keeping its tone, icon and explanatory tooltip. Language and
theme remain in the pocket header; Open on phone remains absent.
([#191](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/191))

Implementation issues:
- [#186](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/186) — larger clock;
- [#187](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/187) — centered couple identity;
- [#188](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/188) — remove role switcher, static role element;
- [#189](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/189) — right-hand cultural/utility stack;
- [#190](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/190) — PIN/Sync in the hard-anchor banner;
- [#191](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/191) — pocket mini chips and trimmed drift label.

### MC Master simplification (decision, 2026-11-07)

These changes apply to the **MC Master view only**. Cross-view decisions below
were confirmed with the owner.

**Current-step content.**

- Remove the **DJ / Audio Cues** block from the MC current-step body. The
  **MC Cues** block stays, as do script and game launchers.
- Rename **Catering & Sub-Tasks** to **Sub-tasks**.
- Keep checked and unchecked subtasks visible, but sort unchecked tasks first
  and checked tasks last. Checked tasks must be clearly distinguished from
  unchecked ones (done styling/marker, muted colour, line-through) without
  mutating the cartridge order or persisted state.

([#199](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/199),
[#200](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/200))

**Duplicate current-step title.** The same step title currently appears in the
current-step card and in the wide Reel Clock card. The current-step card is the
one that stays; the **entire Reel Clock card is removed from the MC view**,
including its active-step title and metrics. Reel Clock remains in DJ Booth,
Photographer and their pocket layouts.

**Speeches is the only card below the timeline.** Remove from the MC
below-timeline area:

- Reel Clock;
- Buffer Accordion;
- Hard Anchor Radar card;
- Stage Pings controls;
- standalone Cake protocol card;
- Music Policy card;
- Pre-wedding Checklist card.

The top hard-anchor warning banner stays. The timeline, drift engine and the
receiving Stage Ping banner in other roles stay. Remove MC-only components and
related tests/imports once nothing references them.
([#201](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/201))

> **Exception (2026-11-08):** the MC-only parallel attraction strip (photobooth
> and similar) lives inside/above the timeline area, not as a standalone card
> below the timeline. It does not change this rule. See
> [parallel attractions](#parallel-attractions-photobooth-decision-2026-11-08).

**Cross-view disposition.**

| Element | MC Master | Other views |
| --- | --- | --- |
| DJ / Audio cues | Removed | Not present |
| Sub-tasks | Kept; renamed and reordered | Not present |
| Reel Clock | Removed | Kept in DJ, Photographer and pocket |
| Cake protocol | Moved into the active cake step | Not present |
| Music Policy | Removed | Kept in DJ Booth desktop and pocket |
| Pre-wedding Checklist | Removed | Not present |
| Buffer Accordion | Removed | Not present |
| Hard Anchor Radar card | Removed; top warning banner stays | Not present |
| Stage Pings controls | Removed | Receiving banner stays in other roles |
| Speeches card | Kept when speeches exist | Speaker view is unchanged |

**Cake protocol inside the timeline.** The standalone Cake card is deleted and
its protocol is rendered inside the current-step card only while
`cakeProtocol.stepId` matches the current step. It keeps the song, cutting and
serve times, sparklers, photographer cue, state and Key Songs sync note, and is
not shown on other steps or collapsed history/future cards.
([#202](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/202))

**Speeches top-bar chip.** Add a **Speeches** chip to the same right-hand
cultural row as Sto Lat, Gorzko and Oczepiny, on MC desktop and in the MC pocket
compact row. It is always visible, including when the wedding has no speeches or
`speechMode: OFF`, with these colours:

- `OFF` or no speeches — red;
- `LIGHT` — orange;
- `COMPLEX` — green;
- active live speech — highlighted brand.

The chip keeps count/active-speaker detail in its tooltip/accessible name. It is
not added to DJ, Photographer or Speaker.
([#198](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/198))

**Speeches card visibility.** Render the MC Speeches card only when the cartridge
contains at least one speech. With zero speeches the chip stays visible but the
card is absent; do not show the old "No speeches captured" placeholder. When
speeches exist, the card keeps the existing Go live / Stop live behaviour and is
the only card below the timeline.
([#203](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/203))

Implementation issues:
- [#198](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/198) — Speeches top-bar chip;
- [#199](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/199) — remove DJ / Audio cues;
- [#200](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/200) — Sub-tasks rename and ordering;
- [#201](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/201) — Speeches as the only card below the timeline;
- [#202](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/202) — remove summary cards and embed Cake;
- [#203](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/203) — hide the Speeches card when empty.

### Role view switching (decision, 2026-11-07)

This decision distinguishes the **authenticated device role** from the
**rendered view**. A view switch is local navigation only: it never changes the
role token/JWT, PIN, sign-out target, persisted device role or synced state.
The earlier "no role switching anywhere" rule from #188 continues to apply to
real role/authentication changes.

**Production — MC to DJ view.** The MC Master device may open the DJ view on the
same device and return to MC:

- the control is available only when the wedding package includes a DJ
  (`availableRoleIds` includes `dj`); it is hidden for `HOST_ONLY`;
- the DJ view is always the cartridge-configured tier — Standard or VIP via
  `resolveServicePackage` / `djDetailTier`;
- the authenticated role remains MC, the MC token remains in use and the DJ view
  is read-only; no DJ credentials or additional data access are granted;
- auth/sign-out actions continue to target MC; view-dependent labels and
  read-only content use the effective view role;
- the view override is device-local UI state, is not synced and is cleared on
  sign-out/rejoin;
- production still does not offer Photographer or Speaker view switching from
  MC.
([#210](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/210))

**Development-only all-role switcher (temporary).** Development builds get a
clearly marked temporary control to preview every role view: MC, DJ,
Photographer and Speaker. DJ follows the cartridge-configured tier.

- Gate it through build-time development detection (for example
  `import.meta.env.DEV`) so production builds dead-code-eliminate it. Do not
  expose it through a URL, query parameter, localStorage flag or public runtime
  configuration.
- Label it explicitly as development-only, for example
  "DEV VIEW SWITCHER — not for production".
- It must not change the authenticated role, token, PIN, sign-out target, stored
  role or synced state, and must not perform cloud writes.
- The production bundle must contain neither the control nor its UI strings;
  automated tests must verify the production-disabled result.
- This is a temporary developer tool and must be removed before release; code
  comments and the removal expectation stay with the implementation.
([#211](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/211))

Implementation issues:
- [#210](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/210) — production MC → DJ view-only switch;
- [#211](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/211) — dev-only all-role view switcher, excluded from production.

### DJ view rework (decision, 2026-11-07)

The DJ view is reworked to match the MC step experience while remaining
read-only. Standard vs VIP boundaries stay explicit.

**MC Speeches width.** The Speeches card is the only card below the MC timeline
and must span the full page content width, with no leftover narrow grid column.
([#214](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/214))

**DJ top bar.**

- Remove the top-left headphone-icon role label showing the icon plus
  "DJ VIP". The existing **Role: DJ VIP** identity remains the single role
  label.
- DJ VIP adds these selected MC top-bar elements: Sto Lat / Gorzko / Oczepiny
  cultural chips, the Speeches status chip, and the authenticated role's
  PIN/role sign-out element.
- The Drift pill is not added.
- Existing clock, Sync, Open on phone, language, theme, couple identity (VIP)
  and the view-switch control stay.
- The PIN/sign-out control targets the authenticated role: MC when the MC is
  viewing DJ, DJ when a native DJ VIP is signed in.
- DJ Standard keeps its current minimal top bar and gains none of the VIP
  additions.
([#215](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/215))

**Timeline alignment.** DJ uses the same `TimelineFocusStack` structure as MC:
done/previous cards, the current step as the focal card, and next/upcoming
cards, with the same step ordering. The current-step body stays read-only and
DJ-specific. No MC advance, undo, swap or script controls are exposed.
([#216](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/216))

**DJ sections.** Keep only:

- current step / projected timeline focus stack;
- Reel Clock;
- Music Policy;
- Set notes;
- guest request queue — moved into the new dedicated second top bar.

Remove:

- Key Songs card;
- Cutoff stopwatch;
- VIP Set Health card;
- VIP booth cues card, including fullscreen/copy-set-list launchers;
- Export pack;
- Stage Ping banner;
- the guest request queue card in the page body once the top request bar exists.

**Scrolling.** Use a single vertical scroll container for the DJ page body,
remove nested scroll traps in the focus stack, keep the header and request bar
stable/non-overlapping, and prevent cards from resizing or jumping while
scrolling on desktop and tablet.
([#217](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/217))

**Guest song-request bar.** Add a full-width bar directly below the DJ top bar,
for **DJ VIP only**:

- reuse the existing `song_requests` queue and public guest request form; do not
  create a second wishes/notes data model;
- show the pending count, latest pending requests with accept/decline, refresh
  and the guest QR when available;
- keep it compact, with expansion for the full queue if needed;
- remove the old body queue card to avoid duplication;
- show a clear unavailable/loading state when cloud requests are not configured
  or cannot connect;
- DJ Standard, Photographer and Speaker never render the bar.
([#218](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/218))

**Tier restrictions.**

| Area | DJ Standard | DJ VIP |
| --- | --- | --- |
| Timeline focus stack | Yes | Yes |
| Reel Clock | Yes | Yes |
| Music Policy | Yes | Yes |
| Set notes | Yes | Yes |
| Guest request bar | No | Yes |
| Cultural / Speeches / PIN top-bar additions | No | Yes |
| VIP Set Health / booth cues / export pack | No | Removed from the reworked view |

The MC view-only navigation into DJ still renders the cartridge-configured
Standard or VIP tier without changing auth.
([#219](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/219))

Implementation issues:
- [#214](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/214) — full-width MC Speeches card;
- [#215](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/215) — DJ top-bar rework;
- [#216](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/216) — DJ timeline alignment;
- [#217](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/217) — section removal and scroll fix;
- [#218](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/218) — VIP guest request bar;
- [#219](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/219) — Standard/VIP restriction audit.

### Photographer / media view rework (decision, 2026-11-07)

The Photographer is treated as a **VIP companion role by default**: it gets the
selected DJ VIP top-bar additions and VIP feature gates where role-appropriate,
but not the DJ-specific guest request bar.

**Main timeline.** Remove the Reel Clock/summary card from Photographer desktop
and pocket. The MC-style step focus stack becomes the primary content:
done/previous, current focal step and next/upcoming cards, read-only. The
top-bar clock stays if present.
([#226](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/226))

**Approved UI.** Remove:

- Oczepini cues card;
- Venue access card;
- Stage ping banner;
- Media team card for now;
- the "Read-only timeline" card wrapper once the main step timeline is primary.

Keep the footer strip and Sunset & Golden Hour. Media-team data stays in the
model for a future rework. The media-team planning TODO (#233) is closed, so the
card stays removed until an approved follow-up exists. The group-photo step is
implemented in #378 and #379.
([#227](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/227),
[#233](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/233),
[#230](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/230))

**Photo plan into steps.** Delete the standalone Photo plan card and render each
plan element inside its mapped step card: mini session, group photos, speed
foto, special effects and guest coverage. Use an explicit `stepId` association
when available; otherwise use a documented deterministic title/keyword mapping.
([#228](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/228))

**Sunset & Golden Hour.** Keep the card in its current location. It disappears
automatically once the mini session is done. The photographer can overwrite the
chosen mini-session hour/time; the override is shared across all media
services/devices (both photographers and cameraman), does not mutate the
published cartridge, and writes an audit-log entry with actor, old value, new
value and timestamp so it can be traced later. These values are photographer
decision support only; they must not influence step planning.
([#229](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/229),
[#390](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/390))

**Group-photo step (implemented).** The group-photo moment is a normal
timeline step: it starts at its planned timeline time like every other step and
has no special duration or minimum-group-size gate. The sequence is:

1. **All guests + newlyweds** — at least one smiling group photo is mandatory;
   additional all-guest photos are optional.
2. **Configured groups** — invite each group from
   `photoPlan.groupPhotos.groups[]` in the exact Google Doc order (parents,
   witnesses, siblings, etc.), bound to the step through
   `photoPlan.groupPhotos.stepId`.
3. **Open invitation** — any guest who wants a photo can join.

MC and Photographer 1/2/Cameraman see the same ordered checklist and progress;
both views can act on the shared checklist, while only the MC advances/completes
the timeline step. The step is visible and actionable from the main timeline in
both views. Photographer/cameraman assignment uses the existing `mediaTeam`
data. `location` is optional; `minGroupSize` and `durationMin` must not gate
behaviour. Implemented in #378 (data/parser) and #379 (shared UI).
([#230](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/230),
[#378](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/378),
[#379](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/379))

**Media roles.** Support two photographers and a cameraman as separate media
roles with their own join PINs and views: Photographer 1, Photographer 2 and
Cameraman. All three use the same feature set; there is no photo/video
capability difference. Update role labels, join/QR cards, role tokens, presence
and admin PIN management. The legacy single Photographer join should map safely
to Photographer 1.
([#231](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/231))

**VIP parity.** Photographer gets the selected MC-derived top-bar additions:
cultural chips, Speeches chip and the authenticated PIN/sign-out control. VIP
feature gates treat media roles as VIP where relevant. The DJ guest request bar
is not added to Photographer unless explicitly requested later.
([#232](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/232))

**DJ Reel Clock removal.** Remove the Reel Clock summary card from both DJ
Standard and DJ VIP desktop and pocket. Keep the top-bar clock, timeline and
remaining approved DJ sections.
([#234](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/234))

**Cross-view disposition.**

| Element | Photographer | Other views |
| --- | --- | --- |
| Reel Clock summary | Removed | Also removed from both DJ tiers; kept where used by MC |
| Oczepini cues | Removed | Oczepiny remains in MC cultural/timeline data |
| Venue access | Removed | Not affected |
| Stage ping banner | Removed | Receiving banner stays in other roles |
| Media team card | Removed; #233 closed | Data model retained |
| Photo plan card | Removed; details move into step cards | Cartridge data unchanged |
| Sunset & Golden Hour | Kept with expiry + shared override | n/a |
| Footer | Kept | n/a |
| Media roles | Photo 1, Photo 2, Cameraman | MC/DJ back-office role management updated |

Implementation issues:
- [#226](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/226) — read-only MC-style step timeline;
- [#227](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/227) — remove selected sections;
- [#228](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/228) — photo plan into step cards;
- [#229](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/229) — sunset lifecycle and mini-session override;
- [#230](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/230) — group-photo step design (complete);
- [#378](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/378) — group-photo cartridge and Google Doc data alignment (complete);
- [#379](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/379) — MC/Photographer group-photo checklist (complete);
- [#231](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/231) — separate media roles;
- [#232](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/232) — VIP parity;
- [#233](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/233) — media-team planning TODO (closed);
- [#234](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/234) — remove DJ Reel Clock.

### Media/Speaker/DJ refinements (decision, 2026-11-07)

**Full-width media layout.** The Photographer 1, Photographer 2 and Cameraman
step layout may use the entire page width; remove the centered `max-w-5xl` /
`max-w-3xl` caps while keeping responsive padding and avoiding horizontal
overflow.
([#242](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/242))

**Full-width DJ layout.** DJ VIP and DJ Standard use the entire screen width,
matching MC Master. Remove the `mx-auto max-w-5xl` cap from the DJ main area,
keep the shared responsive horizontal padding and ensure compact layouts do not
overflow horizontally.
([#396](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/396))

**Speaker timeline removal.** Delete the Timeline UI element from the Speaker
view (desktop and pocket). Keep the assigned speech/script and the Now speaking
card.
([#243](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/243))

**Now speaking card.** Keep only:

- the "Now speaking" label;
- the speaker name (for example Bartek);
- the speaker relationship (for example Best man).

Remove timer chips, time, cue, mic, language, delivery, read-from, consent,
MC-intro and offline-copy badges from that card. The script/teleprompter card
stays separate and intact.
([#244](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/244))

**Speech cartridge TODO (open).** The speech-display UI content will in future
be retrieved from a dedicated cartridge produced from a Google Doc through a
JSON parser. Record the schema, validation, revision/publication and
offline-cache work as a follow-up; do not hardcode speech text or scrape the Doc
at runtime. This remains an open planning TODO; the current speech rendering
stays until the contract is approved.
([#245](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/245))

**Music Policy — ZAIKS.** Remove the ZAIKS/licensing UI element from the Music
Policy card. Keep must-play, do-not-play, clean versions and request
status/window. The shared card makes this apply to both DJ tiers; cartridge data
may remain.
([#246](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/246))

**Duplicate role labels.** Photographer 1/2, Cameraman and Speaker must follow
the MC Master pattern: remove the duplicate top-left role label/icon and keep a
single Role identity element (for example Role: Photo 1, Role: Camera, Role:
Speaker). Pocket role badges are unchanged.
([#247](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/247))

Implementation issues:
- [#242](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/242) — full-page media step layout;
- [#243](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/243) — Speaker timeline removal;
- [#244](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/244) — reduced Now speaking card;
- [#245](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/245) — dedicated speech cartridge planning TODO (open);
- [#246](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/246) — remove ZAIKS/licensing UI;
- [#247](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/247) — single role identity element.

### Unified top bar design (decision, 2026-11-07)

Every role view uses the same top-bar shell, spacing and centered identity
layout. Role-specific controls stay role-gated; the visual design must not drift
between roles or between desktop and pocket.

**Shared shell.**

- One shared three-zone structure: left (logo, clock, role), center (couple and
  date), right (role controls).
- The clock is visibly larger and the same size in every role.
- Increase spacing between elements and align vertical centering/padding.
- DJ Standard keeps its restricted controls (Sync, language, theme only) while
  using the same shell. DJ VIP, MC, Photographer 1/2 and Cameraman keep their
  approved matrices; Speaker keeps its approved controls.
([#253](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/253))

**Center identity layout.**

- Top row: person 1 first name + flag, **ring logo**, person 2 first name + flag.
- The ring logo replaces the current "&" separator.
- Bottom row: language information (couple/shared languages).
- Bottom row: event date data.
- The block stays horizontally centered and uses the cartridge event date.
([#254](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/254))

**Localized date.**

- The event date row includes the weekday: for example "Monday 7 November 2026".
- The weekday and date format follow the current UI locale through the existing
  i18n/`Intl.DateTimeFormat` path; no hardcoded English weekday names.
- EN, FR and PL must all render correctly.
([#255](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/255))

Implementation issues:
- [#253](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/253) — shared top-bar shell, clock and spacing;
- [#254](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/254) — center ring/language/date layout;
- [#255](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/255) — localized weekday.

### Secondary control bar and mandatory-data placement (implemented, 2026-11-07)

**Shared secondary bar.** Add a full-width control bar directly below the top
bar and above the timeline in MC Master, then reuse the same shell in every
impacted role view:

- left: Late/drift, PIN/sign-out and Sync;
- center: Children expected;
- right: night-stage/theme switch, language switch and Open on phone.

Remove these controls from the existing top bar so they are not duplicated.
Role gating stays: Open on phone only where supported, PIN only for
authenticated roles, and Late/Sync only where the role already has them.
Photographer 1/2, Cameraman and other impacted media views use the same bar;
the fixed bottom-right Children expected badge is removed there. Compact layouts
may wrap the bar into two rows but keep the left/center/right grouping.
Implemented in #385.
([#385](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/385))

**Mandatory constraints move into steps.** Remove the page-level
`Mandatory constraints` card from MC Master. Keep the underlying data and embed
it into the relevant timeline steps:

- Prestation ready and First guests arrival → the first relevant step
  (Cocktail / first timeline step) as pre-step milestones.
- Kitchen service times and table/buffet modes → the nearest meal step, or a
  dedicated meal step when present.
- Cake service mode → Wedding cake.
- Ceremony note → Ceremony.

DJ VIP keeps only the mandatory data it is allowed to see, embedded the same
way. The removed card must not be replaced by a duplicate page-level strip.
Implemented in #384.
([#384](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/384))

### Sunset decision-support and bar refinements (decision, 2026-11-07)

**Sunset data is decision support only.** Sunset, golden hour, civil twilight
and mini-session latest-start values must not infer, generate, move, constrain or
recalculate step planning, durations, hard anchors, drift or timeline order.
They remain informational in the Photographer/Cameraman Sunset & Golden Hour
card and the shared mini-session override. The chosen mini-session hour may add
a timeline twin task, but latest-start itself is never used as the task time or
as planning input.
([#390](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/390),
[#401](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/401))

**Hard-anchor banner children notice removed.** Delete the
`Children expected — keep them clear of key moments` element from the
collision/compression banner. The central Children expected element in the
secondary bar remains; step-specific children cues are unchanged.
([#392](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/392))

**Secondary bar uses full width.** The shared secondary control bar spans the
full viewport width with the same horizontal padding as the top bar. Left-side
controls sit flush left, right-side controls flush right, and the centre group
stays centred. Remove the `max-w-7xl` cap.
([#391](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/391))

### Mini-session timeline twin task (decision, 2026-11-07)

**Twin task, not a planned step.** The mini session is a parallel/twin task
inside the step whose time window contains the chosen mini-session hour. The
photographer(s) take the newlyweds outside for private pictures. It must not
create a new top-level step, change step order, durations or drift.

- Use the chosen `miniSessionTime` override; without a chosen hour show an
  unscheduled state instead of guessing.
- Show start time, duration, main location and backup location.
- Visible in Photographer 1, Photographer 2 and Cameraman views.
- The latest mini-session start remains decision support only, never the task
  time.
([#401](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/401))

**Centered hour control.** Center the `Chosen mini-session hour` label, time
input and save action in the light-window card for Photographer 1, Photographer 2
and Cameraman, on desktop and compact layouts.
([#402](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/402))

### DJ Standard laptop-only and top-bar ring size (decision, 2026-11-07)

**DJ Standard is laptop-only.** The Standard view has no pocket layout:

- render only the desktop/laptop layout for DJ Standard;
- do not render the compact pocket shell for Standard;
- on small screens, show a clear "DJ Standard requires a laptop/tablet" notice
  instead of the pocket UI;
- DJ VIP keeps its pocket layout unchanged;
- keep the existing Standard control restrictions and do not offer the Open on
  phone QR for Standard.
([#256](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/256))

**Ring logo size.** The center ring logo is too small: size it to match the
enlarged top-bar clock (`text-2xl` / equivalent height) in every role that uses
the shared center identity, while keeping it vertically aligned and decorative.
([#257](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/257))

### DJ step song info and dev switcher (decision, 2026-11-07)

**Dev switcher — DJ Standard.** The development view switcher gets a separate
"DJ Standard" entry that forces the Standard tier view even when the cartridge
is configured as VIP. The existing "DJ" entry keeps following the configured
tier. The forced preview must honor Standard restrictions, stay
laptop/desktop-only and remain absent from production bundles.
([#258](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/258))

**DJ current-step song info.**

- Remove the generic playlist and track chips from the current-step card
  (for example "Dinner Jazz", "Fly Me to the Moon").
- Keep the cutoff element.
- Add a main-song block only for steps flagged `isMainSongRequired`:
  Grand entrance, Wedding cake and First dance.
- Resolve the main song from the existing important-songs/step song data linked
  by step id; show title and artist and a missing-song state when absent.
- Keep the Projected timing block unchanged (confirmed with the owner). The
  projected block is the live forecast of the current step's realistic
  start/end and event finish; it is distinct from the planned schedule.
([#259](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/259))

**Step schema flag.** Add `isMainSongRequired` (boolean, default false) to the
step schema and predefined steps/template/import mapping. Mark Grand entrance,
Wedding cake and First dance as true in the relevant examples. Missing values
default to false for backward compatibility.
([#260](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/260))

Implementation issues:
- [#258](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/258) — dev DJ Standard preview;
- [#259](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/259) — DJ current-step song info;
- [#260](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/260) — isMainSongRequired schema flag.

### Predefined step catalogue (decision, 2026-11-07)

**Renames.**

| Current | New |
| --- | --- |
| Aperitif in Garden (`step_01`) | Cocktail / Vin d'honneur |
| Outdoor Civil Ceremony (`step_02`) | Ceremony |
| Hall Entrance, Toast & Dinner Start (`step_03`) | Grand Entrance |
| Cake & Sparklers (`step_05`) | Wedding cake |

**Delete.** Remove `step_04` "Buffets Open & Dance Floor" from every
source (demo, schema example/real fixture, Google Doc template, DJ cues,
subtasks/import mappings and docs).

**Add.** New predefined steps:

- **Wedding Thank-You** — couple thanks guests; mandatory.
- **Wishes** — guest wishes/guestbook moment; optional by cartridge flag.
- **Oczepiny** — optional by the existing Oczepiny enable flag.
- **Games** — one optional timeline step per configured game (for example Test
  Wiedzy and Test Zgodności); never a single combined Games step.
- **First Dance** — mandatory for now; detailed schema will be worked out later.

Optional steps are inserted only when their cartridge flag is enabled; mandatory
steps always appear. Existing step IDs stay stable; new steps get new IDs.
([#261](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/261),
[#262](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/262))

**Repeated-concept audit.** Across the demo cartridge, schema
example/real fixture, Google Doc template, hard anchors, speeches, games
content and app features:

| Concept | Predefined? | Notes |
| --- | --- | --- |
| Cocktail / Vin d'honneur | Yes | Renamed from Aperitif; repeated in step_01/template. |
| Ceremony | Yes | Step_02 plus ceremony hard anchor. |
| Grand Entrance | Yes | Step_03 plus MC cues/grand-entrance important song. |
| Wedding cake | Yes | Step_05 plus cake protocol, hard anchor and CAKE song. |
| Wedding Thank-You | Yes, mandatory | Parents' thank-you subtask/speeches today. |
| Wishes (guest wishes/guestbook) | Yes, optional | Guestbook/Instax/wish-bottle mentions today. |
| Oczepiny | Yes, optional | Hard anchor/object/photo/cultural indicator today. |
| Games | Yes, optional | One step per game; Test Wiedzy and Test Zgodności are separate. |
| First Dance | Yes, mandatory for now | Important song/deliverable today, not a step. |
| Buffets Open & Dance Floor | No | Delete step_04. |

Each concept should have exactly one timeline representation; remove duplicate
anchor/subtask-only representations where the step now owns the moment. The
former step-rework planning TODO (#263) is closed; this audit remains the
current concept reference.
([#264](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/264))

**Step definitions (closed planning TODO).** The definition checklist covering
purpose/trigger, duration/type, location, MC/speaker cues, subtasks, main
song/playlist/cutoff, photo/video cues, hard-anchor links, dependencies and
optional/mandatory rules was tracked by #263, which is closed. Any new
behaviour change needs a fresh issue rather than reopening the old checklist.
([#263](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/263))

Implementation issues:
- [#261](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/261) — renames and Buffets deletion;
- [#262](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/262) — new predefined steps;
- [#263](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/263) — precise step-rework planning TODO (closed);
- [#264](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/264) — repeated-concept audit.

### Mandatory steps, Venue Manager and children (decision, 2026-11-07)

**Mandatory steps.** Add mandatory milestones separate from regular and
predefined steps. These must fit exactly into the plan:

- **First guests arrival**.
- **Prestation ready hour** — derived as exactly 1 hour before first guests
  arrival.
- **Kitchen service hours** — obiad weselny, pierwsza kolacja, druga kolacja,
  and optional trzecia kolacja.

Initial values may come from the venue manager or customer through the parsed
Google Doc cartridge. They are exact-hour obligations, not elastic steps. Only
the Venue Manager role may change them at runtime.
([#273](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/273))

**Venue Manager role.** Add a new role with its own PIN and QR card, available
on **laptop and pocket**:

- shows the MC Master step timeline **read-only**;
- shows an editable mandatory panel for first arrival, derived prep-ready hour,
  the kitchen service times, third-supper enable/time and cake-service mode;
- only the Venue Manager can edit that panel;
- no MC advance/undo/script controls.
([#274](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/274))

**Venue Manager overrides.** Google Doc values are the initial source; Venue
Manager edits override them in shared/cartridge data so every user is aware.
Every override is audited (actor, field, old value, new value, timestamp). After
an override, every connected role **except Venue Manager** shows a popup
announcing the change. The popup does not auto-close; the user must acknowledge
it. Duplicate/replayed revisions must not spawn duplicate popups.
([#275](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/275))

**Wedding cake service mode.** Venue Manager chooses between:

- **Kitchen return** — service takes the cake to the kitchen and returns plated
  pieces;
- **Cut in place** — service cuts at the original cake spot and guests are asked
  to come there for a piece.

MC Master shows the current mode and an appropriate announcement cue.
([#276](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/276))

**Children expected.** Retrieve a boolean `childrenExpected` from the Google Doc
into the cartridge. If false, no action. If true, show a global persistent badge
on MC, Photographer 1, Photographer 2 and Cameraman views on laptop and pocket.
Per the confirmed decision, show only the global badge for now — no per-step
warnings yet.
([#277](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/277))

Implementation issues:
- [#273](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/273) — mandatory-step model;
- [#274](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/274) — Venue Manager role/view;
- [#275](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/275) — overrides, audit and persistent popup;
- [#276](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/276) — cake-service mode;
- [#277](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/277) — children expected badge.

### First arrival, time-based timeline and wedding closure (decision, 2026-11-07)

**First guests arrival is customer-confirmed.** It is not a Venue Manager
mandatory step:

- confirmed only by the customer/newlyweds;
- comes from the Google Doc and is parsed into the wedding cartridge JSON;
- is the first timeline step before the wedding starts;
- includes ceremony context, such as whether the ceremony is in a church or at
  the venue;
- removed from the Venue Manager editable mandatory panel;
- the derived prestation-ready hour stays tied to this customer-confirmed
  arrival.
([#283](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/283))

**Timeline position follows current time.** All role views derive
current/completed/upcoming from the current time and schedule:

- before the wedding starts, no Completed steps UI is shown;
- before the wedding starts, the Current step is First guests arrival;
- during and after the event, the three zones update by time;
- MC advance/undo must stay consistent with the derived timeline across roles.
([#284](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/284))

**Wedding closure is the final step.** The latest displayed step is the Wedding
closure hour:

- closure data comes from the Venue Manager;
- Venue Manager records whether the venue allows a one-hour extension;
- extension availability is shown on MC and DJ VIP views only;
- the customer may request a last song;
- the last song is shown/flagged on DJ VIP only.
([#285](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/285))

Implementation issues:
- [#283](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/283) — customer-confirmed first arrival step;
- [#284](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/284) — time-derived timeline;
- [#285](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/285) — wedding closure step.

### Step card labels and Photographer sunset (decision, 2026-11-07)

**No numeric step labels.** Remove "Step 1", "Step 2", etc. from all step cards.
Keep the step index in data/logic, but do not show the numeric position label in
current, completed or upcoming cards in any role or viewport.
([#310](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/310))

**Restore Photographer/Cameraman sunset UI.** The Sunset & Golden Hour card has
disappeared from Photographer/Cameraman views. Restore it and stabilize its
visibility:

- show the sunset, golden hour, civil twilight, mini-session latest-start and
  status/countdowns on desktop and pocket;
- show the unavailable/stale state instead of removing the card when data is
  missing or stale;
- investigate the hide conditions; do not hide it merely because mini-session
  data is absent;
- keep the prior lifecycle rule only when a real mini session is complete.
([#311](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/311))

### Step types, durations and children wording (decision, 2026-11-07)

**Photographer children text.** The Photographer/Cameraman children indicator
shows only **"Children expected"**. Remove the longer explanatory sentence and
align the communication with the MC pattern. The indicator now lives in the
shared secondary bar/compact header; the hard-anchor-banner notice is removed and
no bottom-right badge returns.
([#307](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/307),
[#392](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/392))

**Step type model.** This supersedes the earlier ELASTIC/BUFFER/HARD_ANCHOR
model:

- remove **BUFFER** entirely;
- rename **ELASTIC** to **FLEXIBLE**;
- mandatory steps/constraints use **HARD_ANCHOR**;
- all non-mandatory predefined steps use **FLEXIBLE**.

Remove buffer ranges/accordion logic where unused, migrate schema/demo/fixtures/
template values, and update engine/guards/tests/docs.
([#308](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/308))

**Automatic step durations.** Step durations are no longer manually authored.
Each duration is calculated from the hour of the next step in the Google Doc and
inserted into the cartridge:

- example: current 16:30, next 17:00 -> 30 minutes;
- midnight-crossing times must compute correctly;
- define the final/closure step duration rule;
- missing, duplicate or out-of-order times fail safely with validation errors;
- remove manual duration input from the template/parser where possible.
([#309](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/309))

### Predefined step data contract and mandatory constraints (decision, 2026-11-07)

This supersedes the earlier decisions that made First guests arrival and
Wedding closure ordinary predefined timeline steps.

**Predefined timeline steps.** Remove from the predefined timeline:

- First guests arrival;
- Wedding closure.

Remaining predefined steps and their source:

| Step | Source |
| --- | --- |
| Cocktail / Vin d'honneur | Google Doc |
| Ceremony | Google Doc + ceremony variant rules below |
| Grand Entrance | Google Doc + guest order below |
| Wedding cake | Google Doc |
| Wedding Thank-You | Google Doc |
| Wishes | Google Doc |
| First Dance | Google Doc + First Dance rules below |
| Oczepiny | Google Doc; no schema changes to current Oczepiny |
| Games | Google Doc + question-list Docs |

Keep stable IDs for retained steps; retire removed IDs safely.
([#301](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/301))

**Mandatory constraints.** These are exact obligations, not ordinary timeline
cards:

| Constraint | Source | Visibility |
| --- | --- | --- |
| First guests arrival | Google Doc | MC + DJ VIP only |
| Prestation ready | Automatically derived (1h before arrival) | MC |
| Obiad weselny | Venue Manager | MC |
| Pierwsza kolacja | Venue Manager | MC |
| Druga kolacja | Venue Manager | MC |
| Trzecia kolacja | Venue Manager (optional) | MC |
| Wedding closure | Google Doc and/or Venue Manager | MC + DJ VIP |
| Closure extension | Venue Manager | MC + DJ VIP |
| Cake service mode | Venue Manager | MC |
| Last song | Google Doc | DJ VIP |
| Children expected | Google Doc | MC + media |

Each kitchen service can be **table service** or **buffet**; this mode comes from
the Venue Manager and is displayed in MC view. Prestation ready stays read-only
and derived. The later decision "Secondary control bar and mandatory-data
placement" removes the page-level Mandatory constraints card and embeds these
values in their respective timeline steps.
([#302](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/302),
[#384](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/384))

**Ceremony variants.**

- RELIGIOUS: if the customer requests MC support, show ceremony details in MC.
  If not, only mention the religious ceremony as additional info in the First
  guests arrival constraint.
- CIVIL: read from Google Doc; MC may be asked for translation help.
- HUMANIST / LAÏQUE (ceremonia humanistyczna): visible in MC view.

Add fields for ceremony type, MC support requested and MC translation help
requested.
([#303](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/303))

**Grand Entrance order.** Read from Google Doc:

- guests first, newlyweds after;
- newlyweds first, guests after.

Show the order in the MC entrance cue.
([#304](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/304))

**First Dance.**

- FAKE: MC asks guests to come around the dancefloor; first songs are dedicated
  to the newlyweds and open the musical set.
- NORMAL: standard first dance with a key song for the DJ.
- Google Doc may provide start-at seconds and stop-after minutes/seconds.
- DJ VIP sees the start/stop timing; other roles do not.
([#305](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/305))

**Games.** Read game definitions from Google Doc and question lists from
separate Google Docs, with validated references in the cartridge.
([#306](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/306))

**One step per game.** Test Wiedzy and Test Zgodności are different games and
must not share one `Games` step. Each enabled game gets its own optional timeline
step with its own game id/type, title, question-list reference and teleprompter
payload. Timeline generation creates one step per enabled game; the Games cue
card and clicker show only the current step's game.
([#414](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/414))

> **Superseded in part on 2026-11-08:** the two games are now explicit
> predefined steps with questions parsed from separate Google Docs, a level/queue
> clicker flow and persisted game results. The generic teleprompter-game payload
> is replaced. See
> [game concept rework](#game-concept-rework-decision-2026-11-08).

### Music Policy key songs (decision, 2026-11-07)

Every step flagged `isMainSongRequired` contributes its main song to the Music
Policy UI element:

- collect all flagged steps and resolve their linked important song/step song;
- show title/artist with the step/moment context, ordered by timeline;
- show a missing-song state if the flagged step has no song;
- avoid duplicate entries;
- keep the existing must-play, do-not-play, clean-version and request sections;
- DJ VIP shows the list; DJ Standard has no Music Policy UI.
([#300](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/300))

### Children banner and Oczepiny variants (decision, 2026-11-07)

**Children reminder on MC.** The MC children-expected communication moves from
the bottom-right floating badge into the **Hard Anchor Collision** banner when
that banner is visible. Remove the MC bottom-right badge; keep other roles
unchanged. The reminder must be localized and must not duplicate.
([#286](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/286))

Within that banner, the children reminder is **horizontally centered** rather
than aligned with the right-side actions/detail group. It stays inside the MC
hard-anchor banner, never returns to a bottom-right MC badge, and the
Photographer/Cameraman floating badge remains unchanged.
([#297](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/297))

**Oczepiny variants.** Oczepiny supports two variants:

- **EARLY** — only throwings of veil/bouquet and bow tie/cravat.
- **MIDNIGHT** — generally surrounded by a game (often Test Zgodności), with
  veil/bouquet and bow-tie/cravat throwings, using music or an MC countdown.
  After these, if the photographer is still available, request a winner photo
  and a second photo of winners + newlyweds.

**Schema and Google Doc parsing.** Add explicit fields for:

- variant (`EARLY` / `MIDNIGHT`);
- anchor/time;
- throwings: veil, bouquet, bow tie, cravat;
- game: enabled/type/notes;
- music: enabled/track/playlist;
- countdown: MC or none;
- winner photo: enabled, winners-only, winners+couple, photographer available;
- ordered sub-events.

Update the OCZEPINY Google Doc section and parser, schema validation, fixtures,
demo cartridge and template validator. Keep backward compatibility with the
existing Oczepiny fields.
([#287](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/287))

**Role cues.** MC shows only the enabled variant components (game, throwings,
music/countdown, winner-photo cue). Photographer/Cameraman shows winner photo
and winners+couple photo only when the photographer is available. **DJ VIP only**
also shows the Oczepiny variant data: variant, enabled game, throwing
order/timing, music or MC countdown and winner-photo cue. DJ Standard must not
show this Oczepiny block. Do not show disabled fields; keep cartridge order and
localized labels.
([#288](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/288))

Implementation issues:
- [#286](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/286) — MC children banner placement;
- [#287](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/287) — Oczepiny schema/parser;
- [#288](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/288) — Oczepiny role cues for MC, Photographer/Cameraman and DJ VIP.

### Current Step 3D tilt (decision, 2026-11-07)

Give the shared Current Step card a subtle 3D tilt and elevation without
affecting layout stability:

- Analyze TimelineFocusStack, StageStepCard and the existing
  `timeline-focus-current` styles first.
- No `framer-motion` dependency is added; use lightweight CSS/vanilla pointer
  tracking with GPU-friendly transforms.
- Use a perspective container (~1000px) and a max 5–7° pointer tilt.
- Use Z-axis offsets so the header/status banner ("ON AIR / Step N") floats
  slightly above the card body for a pop-up-book depth effect.
- Keep the card stable during timer refreshes, live updates and state changes.
- Respect `prefers-reduced-motion` by rendering flat with no tilt.
- Do not overflow or clip the Completed/Upcoming columns.
([#295](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/295))

### Mobile 3D current-step card (decision, 2026-11-07)

The existing Current Step 3D treatment is pointer-driven and explicitly ignores
touch, so phone/pocket layouts render flat. Extend it to mobile without changing
the completed desktop implementation.

**Mobile behaviour.**

- The shared current-step wrapper activates a subtle 3D perspective/elevation on
  phone widths and touch devices.
- Do not use hover-style pointer tracking on touch. Use a controlled static or
  press/advance-state tilt that does not fight scrolling or cause jitter.
- Keep a short transform transition on step changes while preserving text
  crispness, contrast and touch-target size.
- Respect \`prefers-reduced-motion\`: flat transform, retained elevation.
- Keep the existing layered shadows, Z-axis header/body depth and card hierarchy.
- The effect must scale with the compact mobile top bar without horizontal
  overflow or clipping.

Apply the shared mobile wrapper to MC, DJ Standard, DJ VIP, Photographer 1,
Photographer 2/Cameraman, Speaker and Venue Manager.
([#335](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/335))

**Secondary surfaces.** Dev role previews inherit the shared mobile effect. Admin
is laptop/desktop-only and must not gain any mobile 3D preview ([#337](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/337)).
Admin library, presence and audit cards are not step cards and stay flat. Add
viewport regression coverage for 320×568 and 375×667, plus manual QA for touch
scrolling, advance and reduced motion.
([#336](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/336))

### Speaker view localization (decision, 2026-11-07)

All speaker-view UI copy must follow the per-device EN/FR/PL locale. This
includes visible labels, empty/unavailable states, tooltips, aria-labels, footer
text and the open-on-phone controls rendered in that view. Shared header controls
must not leak hardcoded English.

The speech script itself is an exception: it comes from the Google Doc/cartridge
and must be rendered verbatim, never translated or locale-transformed. Speaker
name, relationship and other cartridge data remain data, not UI copy. Speech
sourcing and cartridge work stays with #245; this decision covers only UI
localization.
([#349](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/349))

### Google Doc to cartridge mapping completeness (decision, 2026-11-07)

The current Google Docs import is incomplete: `googleDocToTemplateText` converts
the Drive API response into the canonical template, and the parser validates
section structure, but there is **no deterministic mapping from those sections
into a WeddingSchema cartridge**. Admin Google Doc preview is therefore
read-only and cannot be diffed or published.

Every field the application displays must be mapped from the Doc into the
cartridge:

- EVENT, couple identity, languages, cultural rules, Oczepiny and timeline;
- DJ/MC cues, subtasks, hard anchors, mandatory constraints and view visibility;
- venue logistics, media team, photo plan, songs/music policy and guest requests;
- speeches, cake, games/question lists, kitchen, privacy and extensions;
- live sync state only when explicitly supplied as a seed.

Mapping is validation-first and deterministic. Missing required data must fail
with a section/row error; derived values such as durations and prestation ready
are calculated after mapping. Speech text stays verbatim and is never translated.
Keep schema v1.1 until #77 freezes v1.2, and coordinate speech-source work with
#245.
([#350](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/350))

The admin Drive flow must then produce a cartridge draft, run schema/semantic/
completeness validation, show a revision diff and publish through the existing
fresh-MFA source-bound path. Any displayed field that failed to map blocks
publication. Round-trip and completeness tests are required.
([#351](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/351))

### QR phone handoff security (decision, 2026-11-07)

The laptop "Open on phone" QR must always lead to a PIN challenge. A stored
production role session or local pairing alone must not bypass the QR-initiated
gate.

- Production requires the per-role 6-digit PIN through `RoleJoinScreen`.
- Local/demo requires the display PIN through `PairingScreen`.
- The PIN is never encoded in the QR URL. It is shown on the laptop top-right
  (and in the compact phone header when paired).
- The deck opens only for the room/role carried by the QR after a successful PIN
  check.
- Non-QR reload behavior stays unchanged.
([#352](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/352))

Every step in this handoff must be localized: the open-on-phone dialog, join
screen, local pairing screen, QR-context hint, PIN errors and status text. PINs,
room codes, role ids and cartridge content remain untranslated.
([#353](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/353))

### MC Cues children warnings and cake protocol cleanup (decision, 2026-11-07)

When \`childrenExpected\` is true, MC Cues adds one step-specific warning for:

- **Wedding cake** — keep children clear of the cake table and cutting area.
- **Grand Entrance** — keep children out of the entrance aisle.
- **First Dance** — keep children clear of the dancefloor.

The warning appears only while that step is current and only when children are
expected. The global hard-anchor children reminder stays unchanged. The MC Cues
heading drops the \`(FR / PL / EN)\` suffix, and cue lines drop the \`[FR]\`,
\`[PL]\`, \`[EN]\`, \`[ALL]\` and combined language tags. Cue text itself remains.
([#355](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/355))

The cake protocol UI no longer displays cutting time or serve time. Remove the
desktop grid and the compact \`time → serveTime\` header readout. Keep the cake
song, sparklers, photographer cue, sync note and step state. The cartridge
fields and schedule logic remain intact.
([#356](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/356))

### Cake step consolidation and Game Clicker scope (decision, 2026-11-07)

**Cake Protocol is the single cake element.** On the Wedding cake step, delete
the separate `Cake service` box and the generic Mandatory constraints block.
Fold the cake service mode into Cake Protocol together with the song, sparklers,
photographer cue, sync note and state. Do not duplicate the cake service mode
elsewhere on that step; other mandatory data stays on its own step.
([#399](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/399))

**Game Clicker only on the games step.** The Game Clicker button and overlay
render only when the current step is the games step. Remove the leftover
`GAME_QUESTIONS` payload from Wedding cake so the clicker cannot appear there.
([#398](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/398))

### VIP Radar and Contacts removal (decision, 2026-11-07)

VIP Radar and vendor Contacts are deleted, not relocated. Remove:

- `VipAlertsModal`, `ContactsModal`, the MC overlay/button wiring and the
  contacts helper library;
- every `contacts`, `vipAlerts`, `tact_and_vip_alerts` and `vipRadarCount`
  schema field and fixture;
- the Google Doc `VENDOR CONTACTS` and `VIP ALERTS` sections and their parser,
  template and documentation references;
- the encrypted `sensitive_notes` payload, client hook, Edge sync methods and
  database table, because they existed only for these two features.

Old cartridges that still contain the removed fields must drop them before
publication. The features must not be reintroduced without a new approved
decision.

### Drive-only admin wedding library (decision, 2026-11-07)

The owner admin must not create weddings manually. Remove the **New wedding**
button, empty-state create CTA, inline create form and manual create path. Any
server/API route that can create a wedding from an arbitrary admin payload must
be removed or gated so it cannot bypass Drive discovery.

New weddings enter the system only by discovering a valid Drive wedding folder
under the root/year/month hierarchy. Existing weddings can still be edited,
published, archived, restored, re-PINed and deleted. Manual duplicate/create
actions are not a wedding source unless explicitly reapproved.
([#370](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/370))

### Admin Drive folder library and /admin route (decision, 2026-11-07)

The owner admin panel moves from \`/deck/admin\` to \`/admin\`. The old route may
redirect or show a moved notice but must not serve the admin UI. The admin remains
laptop/desktop-only and keeps its auth/MFA gates.
([#362](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/362))

The admin wedding library is sourced from the Google Drive folder tree, starting
at folder \`1Q7IVT0GNiLztKQE8l4eCDCRw-px1qheh\`.

- The root contains year folders such as \`2026\`, \`2027\`, \`2028\`; the UI shows
  one tab per discovered year.
- Each year contains English month folders.
- Each month contains wedding folders named like \`UM-2027-09-001\`; this folder
  name is used as the generated cartridge name/source identifier.
- Each month also contains a \`secrets\` folder with per-wedding folders holding
  the speech Doc and Test zgodności question Doc. Missing Docs must produce a
  safe empty state.
- Discovery resolves folders by parent/name rather than hardcoding every year ID,
  while the supplied 2027/2028 folder IDs may be used as fallback.
([#363](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/363),
[#364](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/364))

Opening the admin page always re-runs the Drive hierarchy scan. A manifest hash
of folder IDs, names, versions and modified times decides whether parsing can be
reused. New or changed folders are processed; unchanged folders are skipped; a
scan failure keeps the last known-good library. Discovery stays admin-only and
never auto-publishes into a live event.
([#365](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/365))

### Setup, environment and server secrets (decision, 2026-11-07)

Configuration is split into two layers and must stay that way:

- **Browser-safe client values** live in `.env.local` and may use the `VITE_`
  prefix: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and the optional
  `VITE_DECK_MODE`, `VITE_SUPABASE_SYNC_TABLE`, `VITE_SUPABASE_ROOM_PREFIX`,
  `VITE_ADMIN_DEMO` and `VITE_VIEW`.
- **Server secrets** are set only with `supabase secrets set`: `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `PUBLIC_DECK_URL`,
  `ALLOWED_ORIGIN`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
  `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` and optional
  `GOOGLE_DRIVE_TEST_FILE_ID`.

The service-role key, JWT secret and Google private key must never appear in a
`VITE_*` variable, an `.env*` file committed to git, an issue or a PR.
`npm run validate:env` checks the client layer, rejects missing/malformed values
and fails when a server secret is exposed through `VITE_*`, without printing
values. `docs/admin-setup-and-secrets.md` is the canonical clone-to-working-admin
guide; `README.md`, `.env.example` and `project.md` link to it.
([#374](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/374))

### Top bar couple-language indicator (decision, 2026-11-07)

The couple/shared-language indicator in the top-bar center looks too similar to
the EN/FR/PL UI language toggle. Redesign it so users understand these are the
languages used to discuss with the customer/newlyweds:

- use a conversational icon/logo (for example 🗣️/💬) and an explicit localized
  label such as "Couple common languages";
- use a clearly different visual treatment from the segmented UI language
  switch, e.g. label + language names/pills, not a toggle;
- keep it in the center identity block below the names and above the date row;
- leave the UI language switch unchanged;
- hide this couple-language indicator in **DJ Standard** only;
- keep it on DJ VIP, MC, Photographer 1/2, Cameraman and Speaker as appropriate.
([#299](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/299))

### DJ Standard Music Policy removal (decision, 2026-11-07)

DJ Standard must not display the Music Policy UI element. DJ VIP keeps the
Music Policy card unchanged. The shared component, cartridge data and policy
logic remain intact; only the Standard view hides the card, with no empty grid
column or layout gap left behind.
([#298](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/298))

### Operational visibility, cleanup and localization (decision, 2026-11-07)

Post-batch review of the #297–#311 implementation identified four follow-up
areas.

**Mandatory update popup visibility.** The popup must enforce the same role
matrix as the stage banners:

- First guests arrival: MC + DJ VIP only;
- prestation, kitchen services and cake mode: MC only;
- closure, extension and last song: MC + DJ VIP.

Photographer, Cameraman and Speaker must not receive restricted mandatory data
through the popup. The popup must include each kitchen service's Table
service / Buffet mode, and it must not render at all when the current role has no
permitted content left.
([#327](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/327))

**Post-#308 cleanup.** Remove the dead buffer-accordion module and drift-engine
accordion fields, replace `isElastic`/`isBuffer` with `FLEXIBLE` terminology
where a flag is still needed, rename stale buffer fixtures, and remove obsolete
ELASTIC/BUFFER comments from active code. Legacy type names may remain only in
explicit rejection tests and historical decision records.
([#328](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/328))

**Localization of new operational surfaces.** The mandatory constraints,
ceremony briefing, games, Grand Entrance, First Dance, mandatory-update popup
and Venue Manager kitchen-mode labels must use the EN/FR/PL dictionaries rather
than hardcoded English. Keep domain values untranslated and preserve role
visibility.
([#329](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/329))

**Documentation refresh.** Replace the default Vite README with project-specific
setup, commands, routes, roles, architecture and validation guidance; correct
the Supabase/RLS security description; and update active docs that still teach
ELASTIC/BUFFER or anon read/write access. Historical plans stay clearly marked
as historical.
([#330](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/330))

### Unified mobile layout (decision, 2026-11-07)

This supersedes earlier pocket-header rules where they conflict, including the
previous no-clock pocket header.

> **Superseded on 2026-11-08:** the pocket logo, clock and PIN are removed, Sync
> becomes icon-only and Children expected becomes a baby icon only. See
> [compact pocket header and Speaker focus](#compact-pocket-header-and-speaker-focus-decision-2026-11-08).
> Desktop headers keep this layout.

**One compact mobile header for every stage role.** MC, DJ Standard, DJ VIP,
Photographer 1, Photographer 2/Cameraman, Speaker and Venue Manager use the same
phone header primitive. The utility row carries the brand logo, role short label,
digital clock, paired PIN when available, Sync status, language selector and
theme control in a compact balanced layout. Sync/language/theme must not be
duplicated between the header and the bottom navigation.

The phone header stays at most two utility rows plus the status-pill grid. Couple
identity is condensed or hidden before any control is allowed to overflow. Wide
desktop layouts remain unchanged.
([#331](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/331))

**Dev and secondary surfaces.** The development view switcher, Venue Manager
configuration and other non-admin secondary panels reuse the same mobile
spacing, type scale, radius and touch-target contract without forcing stage-only
clock/PIN data into non-stage screens. Admin is explicitly excluded from mobile
support and is laptop/desktop-only.
([#332](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/332))

**Status pills.** STO LAT, GORZKO, OCZEPINY and DISCOURS use a stable 2-column
grid on phone widths. Cells keep equal height, truncate secondary text, preserve
full accessible labels, and never overflow or push the timeline down
unpredictably.
([#333](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/333))

**Overlays and floating controls.** Drawers, modals, QR panels,
mandatory-update popups, banners, bottom actions and the dev switcher use
\`100dvh\`-safe sizing, internal scrolling, safe-area padding and 44px touch
targets. Floating panels must not overlap each other or the bottom navigation on
narrow screens.
([#334](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/334))

### Admin laptop-only access (decision, 2026-11-07)

The owner admin panel (\`/admin\`) is a laptop/desktop-only surface. It must
not be accessible or operable on mobile or narrow-tablet viewports.

- Show a clear accessible "laptop/desktop required" fallback instead of the
  admin login, tabs or data.
- Do not start admin auth, MFA or API calls while the viewport is blocked.
- Use an explicit desktop viewport capability rather than fragile user-agent
  sniffing.
- Treat this as a UX access restriction; server-side auth/MFA remains the real
  security boundary.
- Keep every stage role view fully mobile-capable.
([#337](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/337))

### DJ Standard vs DJ VIP (decision, 2026-11-06)

DJ Standard remains minimal: title/artist, planned track, projected timeline,
cutoffs and music policy. DJ VIP adds these approved features:

- **Offline Set Health ([#145](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/145))**:
  full readiness dashboard on desktop; overall readiness and critical warnings
  only on pocket.
- **Fullscreen Now Playing ([#146](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/146))**:
  low-distraction active/next display on desktop and pocket, with optional Wake
  Lock support.
- **Export & Print Pack ([#147](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/147))**:
  desktop-only planned cue sheet, CSV export and source/backup checklist. No
  actual-set report or audio-recognition integration.
- **Song requests ([#148](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/148),
  [#149](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/149))**:
  a room-scoped public QR form collecting only song and artist, with server-side
  rate limiting and only a "received" confirmation for guests. VIP desktop
  provides accept/decline triage; pocket has no request-queue UI.

> **Superseded in part on 2026-11-08:** the guest form becomes an online-only
> phone view with persistent device identity, per-device 10-minute cooldown,
> realtime accepted/denied/played feedback, and DJ VIP Played handling. The QR,
> room scoping, no-personal-data rule and no-pocket-moderation-queue rule stay;
> DJ VIP pocket gets the QR launcher only (#460). See
> [guest song request v2](#guest-song-request-v2-decision-2026-11-08).

> **Superseded in part on 2026-11-08:** DJ VIP is no longer decided by the
> service package alone. Only DJ Mark and DJ Szymoniak resolve to VIP; every
> other DJ resolves to Standard even when the package says VIP. Standard's
> restrictions are UI/feature gating only. See
> [service providers and DJ access](#service-providers-and-dj-access-decision-2026-11-08).

Not planned: Next Key Moment Cue, Advanced Mix Cues, Music Policy Guard,
Must-play Coverage Tracker and Venue & Soundcheck Checklist.

### Server-only cartridges and Google Drive (decision, 2026-11-06)

**Decision:** a cartridge is an immutable, server-published snapshot for every
stage role. Only the owner at `/admin` may create, import, select, replace
or publish one. MC, DJ Standard/VIP, Photographer and Speaker devices never
activate a cartridge from local JSON, a file, the built-in demo, a publish
secret or another role device.

The last downloaded snapshot may remain on a joined device for **offline,
read-only continuity**, keyed by wedding and revision. It is a cache, not a
second source of truth: it cannot be edited, published, reset or used for a
different wedding. Production must show an error/retry state rather than silently
substitute demo or wrong-wedding data when no valid server snapshot is available.

Only `admin_api` may publish, using the allowlisted admin JWT + AAL2, server-side
schema/semantic validation and an atomic monotonically increasing revision. A
content-only publication preserves the room code, role PINs/sessions and live
state. The legacy `publish_room` / `DECK_PUBLISH_SECRET` path is removed.

Target flow:

```text
Admin JSON or Google Drive source shared with the service account
  -> admin-only parse, validation and diff preview
  -> fresh-MFA confirmation with expectedRevision
  -> admin_api server validation + atomic cartridge_revision increment
  -> weddings row (single published source of truth + audit + backup)
  -> realtime notification plus authoritative fetch on subscribe/reconnect
  -> reactive cartridge provider in every role, desktop and pocket
  -> validated read-only offline cache and cartridge-dependent UI refresh
```

`live_sync_state` remains separate from cartridge content. Cartridge replacement
must not replay the outbox or reset progress. Current step/speech ids are
preserved when still present; removed ids follow a tested, visible safe fallback.
Realtime payloads are only hints: clients always fetch the authoritative revision
after subscribing and after reconnecting, ignore older/duplicate revisions, and
do not report fully synced until both cartridge and live-state catch-up finish.

Current gaps to remove: the MC/pairing `CartridgeImporter`, local activation and
reset, module-level `STORED_CARTRIDGE ?? DEFAULT_WEDDING`, one-time server fetch
followed by `window.location.reload()`, missing cartridge revisions, and the
legacy secret-based publish function.

#### Implementation order

| Step | Issue | Deliverable | Depends on |
| --- | --- | --- | --- |
| 1 | [#165](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/165) | Revisioned server-only publication, server validation, RLS, optimistic concurrency, audit, and removal of `publish_room`. | — |
| 2 | [#166](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/166) | Delete all non-admin import/activation/reset paths while retaining a server-fed read-only cache and admin JSON publishing. | #165 |
| 3 | [#167](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/167) | In-place revision delivery for all roles, offline catch-up, monotonic conflict handling and safe active-id reconciliation. | #165, #166 |
| 4 | [#168](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/168) | Server-only Google Drive REST v3 service-account connector with read-only scope, secret handling, timeouts/retries and a connectivity check. | Can run in parallel with #165–#167 |
| 5 | [#169](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/169) | Admin Drive search/list, JSON download, Google Doc `files.export`, metadata capture and non-destructive parse/validation preview. | #168 |
| 6 | [#170](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/170) | Fresh-MFA Drive publication with exact-source binding, diff, backup/restore, provenance, audit and multi-role rollout verification. | #165, #167, #169 |

Google auth follows the existing #82 direction: a service account whose email is
explicitly shared with each source file/folder. Google credentials and access
tokens stay in Supabase Edge Function secrets/memory, never in `VITE_*` values,
the browser bundle, logs or git. Initial scope is Drive REST v3 read-only access
to shared files. Domain-wide delegation, Drive writes, public-link scraping,
background watchers and automatic Drive-to-stage publication are not planned.
Drive changes require an explicit admin check, preview and publish action.

#### Migration, rollout and verification checklist

1. Back up production `weddings` rows and test the revision migration/backfill,
   rollback and stale-`expectedRevision` behavior on a staging project first.
2. Deploy the revised `admin_api` and compatible role clients before deleting
   the deployed legacy `publish_room` function and `DECK_PUBLISH_SECRET`; verify
   no caller or documentation still depends on them.
3. Confirm RLS with anonymous, MC, DJ, Photographer and Speaker tokens: each can
   read only its joined wedding and none can mutate cartridge rows.
4. Verify publication does not rotate PINs, revoke sessions, reset live progress
   or replay queued mutations. Test removed current-step and assigned-speech ids.
5. Exercise every role on desktop and pocket with online publication, duplicated
   and out-of-order notifications, missed realtime events, offline stale cache,
   reconnect catch-up and wedding/session switching.
6. In Google Cloud, enable Drive API, create a least-privilege service account,
   store its secret through Supabase CLI, share only a test file/folder, and test
   revoked sharing, key rotation and token redaction.
7. Run the Drive smoke flow: shared source → preview/diff → fresh-MFA publish →
   all online roles update → offline role catches up → restore creates another
   audited revision. No automatic publication may occur.
8. Update README/schema/deployment docs, remove obsolete importer translations
   and fixtures from production paths, and run the full CI suite plus a manual
   browser smoke test before release.

Relations: #82's Drive transport/admin placement is superseded by #168–#170 and
its role-side import removal by #166; #79 retains library-wide management, while
#170 reuses its diff/backup primitives if available. WeddingSchema v1.2 (#77) is
independent of this transport decision.

---

### UI review fixes 2026-11-08

Review register opened 2026-11-08. This section is historical: the tracked
items were delivered through PRs #473-#522 (except the optional #459). Do
**not** close #77 (schema v1.2), #80 (cartridge `mcCues`, P0) or #245 (speaker
cartridge TODO) while working through this list.

#### P0 - correctness

1. **Remove hardcoded MC cues in the hero body.** `McMasterView.jsx`
   `heroBody` still renders three hardcoded demo MC cue strings. They must come
   from the cartridge `mcCues` contract instead, with a translated "No MC cue"
   empty state. The cartridge contract stays in
   [#80](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/80);
   the view cleanup is tracked by
   [#426](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/426).
2. **One Advance CTA per view.** The compact current-step card and
   `BottomNav.jsx` both expose an Advance action. Keep a single Advance CTA in
   the current card; `BottomNav` must not carry step actions. Tracked by
   [#421](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/421).

#### P1 - PWA, motion, compact, i18n, theming and shell

3. **PWA orientation.** The `vite.config.js` manifest locks
   `orientation: 'landscape'`. Change it to `any` so phones can install and use
   the app in portrait and tablets rotate freely. Tracked by
   [#422](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/422).
4. **PWA zoom.** `index.html` sets `user-scalable=no` and
   `maximum-scale=1.0`. Remove both so pinch zoom works and WCAG 1.4.4 Resize
   Text passes; this closes the accessibility follow-up from the pocket plan
   (#109-#114). Tracked by
   [#423](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/423).
5. **Motion.** `CurrentStepTilt` may apply its 6-degree tilt only on devices
   matching `hover: hover` and `pointer: fine`; remove the tilt everywhere else.
   Hierarchy comes from border, ring and shadow instead. Also fix the
   transition comment in `src/index.css` that contradicts the implemented
   behaviour. Tracked by
   [#424](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/424).
6. **Compact focus stack.** Under 640px, remove the `-1rem` overlap and
   `scale(0.95)` from `[data-focus-depth="2"]` in both history and future
   zones. Render a plain list while keeping the same visible limits: 2 history
   + 1 current + 2 future. Tracked by
   [#425](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/425).
7. **Focus stack expander.** Add the missing "show full timeline" expander
   so hidden history and future steps can be revealed (spec items 2/3).
   Tracked by
   [#427](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/427).
8. **i18n MC.** `McMasterView.jsx` still hardcodes EN strings:
   `HOLD TO ADVANCE`, `Real start`, `Est. end` and `No script attached` (plus
   the MC cue strings in item 1). Route all of them through `t()` and add the
   EN/FR/PL keys. Tracked by
   [#428](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/428).
9. **i18n BottomNav and gate.** `BottomNav.jsx` hardcodes `Undo` and
   `EVENT COMPLETE`. Move them through `t()`. `scripts/check-i18n.mjs`
   currently checks dictionary completeness only, so propose a literal lint
   for hardcoded JSX strings. Tracked by
   [#429](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/429).
10. **Theme migration.** Migrate remaining `text-white` / `text-slate-*`
    utilities to the semantic `text-ink` / `text-muted` tokens, then delete the
    `[data-theme="day"] .text-white` bridge and its brand/alert exceptions in
    `src/index.css`. Tracked by
    [#430](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/430).
11. **Card title.** Replace `truncate` on the `StageStepCard.jsx` title with
    `line-clamp-2` so long Polish step titles stay readable. Tracked by
    [#431](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/431).
12. **Shell.** `TopBarShell.jsx` switches its three-column layout from `xl` to
    `lg`; add a shared `useCompact()` hook to replace the three repeated
    `matchMedia` checks; save `DjBoothView.jsx` as UTF-8 without BOM and fix
    its mojibake. Tracked by
    [#432](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/432).

#### Re-review 2026-11-08 (new)

These seven findings were verified by grep on 2026-11-08 after the first review
pass. They were tracked separately from #421-#432 and have since been delivered
through the #473-#522 PR batch.

13. **Theme fonts and offline fonts.** The `@theme` block in `src/index.css`
    (line 14) defines only color tokens; `--font-heading` and `--font-body` are
    never declared, so the `font-heading` / `font-body` utilities render
    nothing. Montserrat and Lora load from `fonts.googleapis.com` in
    `index.html` (lines 42-44), but the Workbox config in `vite.config.js`
    (line 26) has no runtime caching for googleapis/gstatic, so the offline PWA
    falls back to system fonts with layout shift. Tracked by
    [#433](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/433).
14. **Global `select-none`.** `index.html` line 46 puts `select-none` on
    `<body>` and every role root repeats it (`McMasterView.jsx:412`,
    `DjBoothView.jsx:174`, `PhotographerView.jsx:430`, `SpeakerView.jsx:190`,
    `PairingScreen.jsx:157`, `RoleJoinScreen.jsx:66`). This blocks copy/paste
    of speaker scripts, error IDs and admin values. Scope it to chrome and
    leave content selectable. Tracked by
    [#434](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/434).
15. **Viewport units.** `McMasterView.jsx:412` uses `h-screen` plus
    `overflow-hidden`, which clips the bottom bar behind the mobile URL bar; all
    role roots use `min-h-screen`. Move to `h-dvh` / `min-h-dvh` so the visible
    viewport wins. Tracked by
    [#435](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/435).
16. **i18n modal and toast holes.** Beyond #428 and #429,
    `ModalShell.jsx:104` hardcodes `aria-label="Close overlay"` and
    `UndoToast.jsx:27` hardcodes `Action applied` plus the Undo and Dismiss
    buttons. Route all of them through `t()`; the dictionary-only
    `check-i18n.mjs` gate does not see these literals. Tracked by
    [#436](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/436).
17. **z-index chaos.** `ModalShell` uses `z-50` while toasts and banners use
    `z-[60]` through `z-[120]` (`UndoToast` and `KeySongsCard` z-60,
    `DjNowPlayingOverlay` and `ChildrenExpectedBadge` z-80, `PwaUpdateNotice`
    z-90/100, `DevViewSwitcher` z-100, `MandatoryUpdatePopup` and AdminToast
    z-120). A modal can hide under a toast on stage. Define a `--z-*` token
    scale in `src/index.css` and put modals above non-blocking toasts. Tracked
    by [#437](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/437).
18. **Secondary control bar on phone.** `SecondaryControlBar.jsx` always uses
    `grid-cols-[1fr_auto_1fr]`, producing unreadable slivers at 360px. Add a
    compact stacked variant while keeping the wide three-column composition.
    Tracked by
    [#438](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/438).
19. **Hold button SR progress.** `HoldToConfirmButton.jsx` exposes only
    `aria-label`; the progress bar is `aria-hidden` and there is no
    `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` or
    `aria-describedby`. A blind operator gets no feedback during the 1.2s hold.
    Announce the hold hint and progress state. Tracked by
    [#439](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/439).

#### Mobile 375px audit (live)

Verified live in Vite dev at `127.0.0.1:5173`, PIN 2008, viewport 375x812,
across the MC, DJ, Photographer and Speaker roles. These findings are
mobile-only.

20. **Collapse the header under md.** The MC header consumes about three rows
    and roughly 300px before the current step. Keep only logo, clock, role and
    LATE visible; move COUPLE COMMON LANGUAGES, the date, SPEECHES LIVE and the
    cultural pills under a disclosure. This saves roughly 150px and brings
    CURRENT STEP above the fold at 375x812. Tracked by
    [#442](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/442).
21. **Secondary bar on phone.** `SecondaryControlBar.jsx` still puts roughly
    600px of content into a 375px viewport. Use a single `overflow-x-auto`
    nowrap row or an overflow menu for Open-on-phone, language and theme. This
    is the same compact-bar problem as the stacked variant in
    [#438](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/438);
    extend that issue rather than duplicating it.
22. **44px touch targets.** Measured at 375px: language EN/FR/PL is 24x23,
    theme 32px, PIN/Sync/Open-on-phone under 44px tall, Stop/Go live 25px, Swap
    34px, Undo 42px and checkboxes 16px. Raise every target to at least 44px,
    Undo to 48px, and give checkboxes a 24px visual with a 44px row hit area.
    Tracked by
    [#441](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/441).
23. **MC footer ergonomics.** Undo is 84x42 and only 8px from HOLD, while Swap
    sits at 34px in the footer. Use a 48px Undo, a 12px gap between Undo and
    HOLD, and move Swap into the current-step overflow. Keep the 1.2s hold.
    Tracked by
    [#443](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/443).
24. **DEV VIEW SWITCHER on phone.** The fixed bottom-left switcher covers
    HOLD, Undo and Go-live at 375px. Hide it below 640px or put it behind
    `?dev=1`, and keep it out of the production bundle. Tracked by
    [#440](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/440).
25. **Step title and time truncation.** `StageStepCard.jsx:81` uses `truncate`,
    so Cocktail, Vin d'honneur and time information ellipsize at 375px. The
    title change is already tracked by
    [#431](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/431);
    extend it with `line-clamp-2` and a full time row below the title on mobile
    instead of creating a duplicate.
26. **Mojibake headings.** DjBoothView SET NOTES and the Photographer SUNSET
    heading contain broken `a€` sequences, amplified by mobile truncation. The
    DJ encoding is already tracked by
    [#432](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/432);
    extend it to the Photographer heading and save UTF-8 without BOM.

Alignment for this mobile audit: last aligned 2026-11-08 against `master` @
`f1aa283`. Mobile roadmap rows are P0 for the dev switcher, touch targets and
MC footer, and P1 for the header collapse. #77, #80 and #245 stay open.

#### i18n completion and venue mandatory-step rework (decision, 2026-11-08)

Owner review after the mobile audit. Per-device UI language must switch every
listed element between EN, FR and PL; cartridge content stays in its authored
language. Broken leading glyphs/mojibake in the affected titles are removed
rather than translated. Generic file-encoding work remains in
[#432](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/432).

**MC view.** Localise the **MC Cues** element and its children, the **Game
Clicker** launcher and overlay, and the **Speeches** card/chip with all their
labels, empty states, controls, warnings and countdowns. Cartridge cue, speech
and game text remains authored content. This extends the existing MC i18n scope
in [#428](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/428)
without reopening #426 (hardcoded demo cues) or #80 (`mcCues`). Tracked by
[#444](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/444).

**DJ view.** Localise the **Music Policy** card and all its children in both
full and compact layouts, including the English request-status labels currently
produced by `resolveRequestStatus()`. Localise the **Set notes** title and
delete the broken characters before it. The Set notes body text is explicitly
exempt and stays as the owner-approved English guidance; track/artist/note
content is cartridge data. Tracked by
[#445](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/445).

**Photographer / media views.** Localise **SUNSET & GOLDEN HOUR** and all its
children on Photographer 1, Photographer 2 and Cameraman, including the compact
`Light windows` rendering and the mini-session override. Delete the broken
characters before the `SUNSET` title. The top-bar role element drops the
trailing number for Photo 1 and Photo 2 (`Role: Photo`), while the internal
`photo1`/`photo2` roles, auth, join/PIN and pocket badges stay unchanged.
Tracked by
[#446](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/446).

**Venue Manager — Mandatory steps layout.** Regroup the four courses so each
course time and its service mode are one unit: Obiad weselny, Pierwsza kolacja,
Druga kolacja and Trzecia kolacja. Render **Cake service** in its own separate
place and keep **Wedding closure** together with the extension control. All
labels become localisable while persisted keys stay unchanged. Tracked by
[#447](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/447).

**Venue Manager — closure extension hours.** Replace the single
`+1H EXTENSION ALLOWED` element with two elements:

1. **Hours extension possible** — checkbox;
2. **Up to which hour extension is possible** — hour picker, revealed only when
   the checkbox is ticked.

Add an optional `closureExtensionUntil` clock to `mandatorySteps` (schema,
example fixture, Google Doc mapping, normaliser, mandatory resolver and
mandatory-update popup), keep backward compatibility for cartridges without it,
and coordinate the schema wording with #77. Tracked by
[#448](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/448).

#### Compact pocket header and Speaker focus (decision, 2026-11-08)

Owner review after the i18n/venue pass. Scope confirmed with the owner: the
header changes apply to **compact pocket layouts only**; desktop and tablet
headers stay unchanged.

**Pocket header simplification.** Every compact stage header uses the shared
`RoleShell` and must drop the desktop-only chrome:

- remove the brand logo and its white badge;
- remove the live clock from the pocket header;
- remove the visible `PIN` element (auth, role token and sign-out are unchanged);
- replace the visible `Sync` text with a project-owned sync SVG icon as the only
  visible child, keeping the existing status tones, translated tooltip and
  `aria-label`; no visible count or status text;
- show the **Children expected** element as a baby SVG icon only, with the
  translated text kept in `aria-label`/`title`; the permanent red/green state
  and all-role visibility are defined by #451.

Applies to MC, DJ VIP, Photographer 1, Photographer 2, Cameraman, Venue Manager
and Speaker. DJ Standard has no pocket view (#256). Keep the role short badge,
language, theme, cultural/Speeches chips, view switch and role-specific auth
control. This supersedes the logo/clock part of the earlier pocket-header
decision (#331) and of [#442](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/442);
#442 now covers the role/LATE/disclosure layout only and must not re-add the
logo or clock. The icon-only Sync target still follows #441. Tracked by
[#449](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/449).

**Speaker focus.** The visible `Now speaking` / `Teraz mowi` card is reduced to a
single line with the speaker name and relationship, for example
`Bartek  Best man`; the label itself is removed. The Google Doc speech text
becomes the primary and most prominent element on desktop and pocket, preserving
paragraphs and never truncating or translating the script. Name/relationship and
script remain cartridge/Google Doc content; the dedicated speech cartridge plan
stays with #245. Tracked by
[#450](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/450).

#### Children expected state indicator (decision, 2026-11-08)

The Children expected element becomes a permanent red/green state indicator in
every stage role view, desktop and pocket:

- **red** + `Children expected` when `childrenExpected === true`;
- **green** + `Children not expected` when it is false or absent;
- no amber state remains.

It must appear for MC Master, DJ Standard, DJ VIP, Photographer 1, Photographer
2, Cameraman, Venue Manager and Speaker. Admin, join/pairing and other
non-stage surfaces are excluded. Desktop shows the text in the shared
secondary-bar centre; add it where the role does not render it yet without
duplicating or overflowing. Pocket keeps the baby-icon-only form from #449 with
the translated text in `aria-label`/`title`, now coloured red/green.

Implementation removes the `childrenExpected === true` early return and the
media/MC role gate from `ChildrenExpectedBadge`, and the conditional in
`RoleShell`/call sites, while keeping `wedding.childrenExpected` as the data
source. State changes must stay announced via `role="status"`. The hard-anchor
banner children notice removed by #392 stays removed. This supersedes the
“only roles that already show it” clause in #449. Tracked by
[#451](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/451).

#### Children expected data source (decision, 2026-11-08)

The indicator is cartridge-driven, never hardcoded in the UI:

- Google Doc `EVENT` row: `Children expected: yes` / `Children expected: no`;
- wedding cartridge root property: `"childrenExpected": true | false`;
- schema: boolean, optional for backward compatibility, absent means `false`;
- parser: `true`/`yes`/`y`/`1`/`on` → `true`, `false`/`no`/`n`/`0`/`off` →
  `false`, missing/unrecognised → `false`;
- every role view reads `wedding.childrenExpected`.

The original wiring exists from #277. This decision confirms the contract and
asks for end-to-end regression coverage of explicit true/false and missing
values through parse → validate → publish. UI display remains in #451. Keep the
property at the cartridge root when #77 freezes schema v1.2. Tracked by
[#452](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/452).

#### Top-bar icon sizing (decision, 2026-11-08)

The small decorative icons/glyphs in the top bar are slightly too small. Enlarge
them by roughly one type step without changing labels, colours, status logic or
header height:

| Element | Current | New |
| --- | --- | --- |
| Sto Lat / Gorzko / Oczepiny icons | 14px | 18px desktop, 16px pocket |
| Speeches icon | 14px | 18px desktop, 16px pocket |
| PIN / role sign-out glyph | 10px | 14px |
| Couple common languages glyph | 9px | 13px |
| MC Master / role identity icon | 12px | 16px |
| Role identity arrow | 10px | 14px |

This applies to the matching elements in MC, DJ Standard, DJ VIP, Photographer 1,
Photographer 2, Cameraman, Venue Manager and Speaker. Pocket follows #449, so no
removed logo/clock/PIN is reintroduced. Only sizes change here; glyph selection
and any remaining mojibake stay with #432. Tracked by
[#453](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/453).

#### DJ Standard role label (decision, 2026-11-08)

The DJ Standard top-left role element must show **`Role: DJ`**, localised through
the existing `roles.role` format. It must not show `Role: MC`, `MC Master`,
`Standard` or `DJ Standard`, including when the authenticated MC opens the
read-only DJ Standard view.

- `TopBarRoleIdentity` appends `VIP` only for the VIP tier; the Standard and Solo
  tiers render `DJ` alone.
- The element reflects the **rendered view role**, while PIN/sign-out and
  permissions keep targeting the authenticated role.
- DJ VIP keeps `Role: DJ VIP`; DJ Standard stays laptop-only (#256).
- Auth, session, view switching and Standard/VIP feature gates are unchanged.

This supersedes the earlier rule that the DJ role label includes the service
tier for the Standard case. Tracked by
[#454](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/454).

#### Guest song request v2 (decision, 2026-11-08)

The existing public guest form becomes a proper online-only phone view/role
with device identity, live status and a durable history. This is a **public
guest view** at `/request/:room`, not an authenticated stage role: no PIN, no
role token and no wedding data beyond the room code.

**Guest view/role.**

- Check internet availability before enabling the form; disable Send offline
  and recover automatically when the connection returns.
- Artist and song-title fields, then **Send**.
- Persistent `device_id` from `crypto.randomUUID()` (fallback supported),
  stored under `wedding_guest_device_id`; send it with every request.
- Pending confirmation asks the guest to keep the page open while the DJ
  decides, with a `beforeunload` confirmation.
- A second request inside the 10-minute cooldown receives `429` with the
  remaining minutes and shows that wait.
- Live **accepted** message confirms the DJ accepted the song while stating the
  exact play time cannot be confirmed. **Denied** gets a kind message. **Played**
  gets a final acknowledgement if the page is still open.
- Refresh/reopen restores the pending/status state for the same device.
- The guest sees only their own request. No names, emails, phone numbers or
  other guests' queue rows. Tracked by
  [#455](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/455).

**Backend and persistence.**

- Extend the existing `song_requests` table: add `device_id` and `played_at`
  (plus audit timestamps as needed). The requested `song_name` maps to the
  existing `song` column; keep `artist`, `wedding_id`, `status`, `source` and
  timestamps. Add cooldown/queue indexes.
- Enforce a 10-minute per-`wedding_id` + `device_id` cooldown server-side and
  return `429` with `retryAfterSeconds`/`retryAfterMinutes`. Keep the existing
  IP/room attempt limit as an abuse backstop.
- Persist pending, accepted, denied and played requests. Denied/played rows are
  never re-queued.
- Guest status transport must not grant anon read access to the queue. A
  per-device Realtime Broadcast channel or scoped status RPC is required;
  `postgres_changes` filtered by `device_id` is only acceptable with an
  RLS-safe guest read model. Tracked by
  [#456](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/456).

**DJ VIP queue.**

- Pending: **Accept** or **Deny**. Accept persists and moves the song to the
  accepted/up-next area; Deny persists and removes it from the DJ UI entirely.
- Accepted: show until the DJ presses **Played**. Played records `played_at`,
  removes it from the queue and keeps the database row for history.
- Remove the current “Recent outcomes”/declined list. Denied requests never
  appear in the DJ UI.
- Realtime refresh with the existing manual refresh and polling fallback.
  Accepted songs survive refresh/reconnect until played.
- DJ VIP only; DJ Standard, MC and other roles never get request controls.
  Pocket does not need the full moderation queue but does get the QR launcher
  from #460. Tracked by
  [#457](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/457).

**Development-only simulator.** A clearly marked, `import.meta.env.DEV`-gated
song-request simulator on DJ VIP can create fake pending requests, simulate
accept/deny/played, preview guest messages and exercise two device ids. It
performs no cloud writes, never changes auth/role/PIN state, and must be absent
from production bundles. Tracked by
[#458](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/458).

**Optional free metadata validation.** iTunes Search API (free, no key) is the
recommended first choice for song/artist suggestions and canonical spelling,
with MusicBrainz (free, no key, rate-limited) as fallback. Validation is
advisory only, runs through a server proxy/cache and never blocks submission.
Audio fingerprinting (for example AcoustID) is out of scope unless separately
approved. This remains a planning TODO tracked by
[#459](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/459).

**Supersession and retained rules.** This supersedes the “received-only”
confirmation and declined-outcomes UI from #148/#149. The room-scoped QR, no
personal data, no guest queue access and no pocket DJ **moderation** queue rules
remain; the DJ VIP pocket QR launcher is the exception (#460).

#### Song request QR launcher (decision, 2026-11-08)

The DJ VIP Guest requests bar gets a permanent **`Song's request QR`** button on
laptop and pocket. It is available in connected, loading and disconnected
states whenever a room code/request URL exists.

- Clicking opens a full-screen QR dialog with a large, scannable code
  (target about 80% of the shortest viewport dimension), white background and
  quiet zone.
- Close with the visible X/Close button, backdrop click or Escape; trap focus
  while open and restore focus to the button.
- Show the request URL (and room code if useful) below the QR.
- Disable the button with an explanatory tooltip if no room code is available.
- QR generation stays local through `QrCodeImage`; no external QR service.
- Pocket shows the QR launcher only; it does not need the full moderation queue.
- Keep the existing queue actions and disconnected message unchanged.

The button must fit the compact pocket bar without overflow and keep a 44px
touch target (#441). Tracked by
[#460](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/460).

#### Disco Polo policy (decision, 2026-11-08)

DJ VIP only. The newlyweds decide the Disco Polo policy; the value comes from the
Google Doc `MUSIC POLICY` section and is parsed into the cartridge — no Supabase
or live-state persistence.

**Cartridge contract.**

- Google Doc row: `Disco Polo policy: No` / `Yes` / `On request`.
- JSON path: `musicPolicy.discoPoloPolicy` with enum `NO`, `YES`, `ON_REQUEST`.
- Missing, blank or unrecognised values default to **`NO`** (fail closed).
- Parser aliases include `ON_REQUEST`, `on-request`, `request` and `by request`
  for `ON_REQUEST`; `true`/`false` map to `YES`/`NO`.
- Update the schema, Google Doc template/manifest, parser, resolver, example and
  demo fixtures. No migration, live-state field, outbox entry or realtime work.
  Tracked by
  [#461](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/461).

**UI.**

- **NO** — red — “Disco Polo: Strictly forbidden”.
- **YES** — green — “Disco Polo: Allowed”.
- **ON_REQUEST** — amber — “Disco Polo: Guest request only — one song”.

Show the same badge in:

1. the DJ VIP **Music Policy** card;
2. the top **Guest requests** bar, visible on laptop and pocket, including while
   the queue is disconnected or loading.

Do not rely on colour alone; keep the text label, tooltip and accessible
description, localised EN/FR/PL. The badge must not overflow the pocket request
bar. No MC, DJ Standard, media or Speaker rendering.

This iteration is display-only. The `ON_REQUEST` “one song” rule is guidance for
the DJ; automatic play-count enforcement and persistence are out of scope and
would need a separate approved issue. Tracked by
[#462](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/462).

#### Parallel attractions / photobooth (decision, 2026-11-08)

Newlyweds often book a parallel attraction such as a photobooth/Fotobudka. It is
customer-provided data from the Google Doc, parsed into the cartridge, and it
runs alongside the timeline rather than as a timeline step.

**Cartridge contract.**

- New optional root array `attractions[]` with:
  `id`, `type` (`PHOTO_BOOTH`, `GUEST_BOOK`, `POLAROIDS` or `OTHER`), `name`,
  `booked`, `startTime`, `endTime`, optional `location`, `provider`, `notes`.
- Google Doc `ATTRACTIONS` table row:
  `Attraction ID | Type | Name | Booked | Start | End | Location | Provider | Notes`.
- Supported parallel attractions include photobooth/Fotobudka, guest book and
  Polaroids/Instax. Type aliases: `fotobudka`/`photo booth` → `PHOTO_BOOTH`;
  `guestbook`/`księga gości` → `GUEST_BOOK`; `polaroid`/`polaroidy`/`instax`/
  `instant photos` → `POLAROIDS`; unknown → `OTHER`.
- `Booked: no` keeps the data but hides it from the MC UI; missing rows mean no
  attraction. Invalid/missing times warn and skip the row.
- Missing `booked` defaults to true when the row exists.
- These are parallel tasks: no timeline step, no duration, drift, hard-anchor or
  ordering impact. All attraction types share the same contract.
- No Supabase table/column/migration, live-state, outbox or realtime work.
  Tracked by
  [#463](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/463).

**MC Master reminder.**

- Applies identically to photobooth, guest book, Polaroids and other parallel
  attractions.
- The MC must announce each attraction **at the latest 15 minutes before** its
  start.
- Reminder states: `UPCOMING` (hidden/muted), `ANNOUNCE` from start − 15 min to
  start, `AVAILABLE` from start to end, `ENDED` after end.
- During `ANNOUNCE`, show “Announce now / starts in X min”; during `AVAILABLE`,
  show “Available now — remind guests” with the end/remaining time.
- Support multiple attractions. If the clock is unavailable, show the scheduled
  window without a countdown.
- Render a compact MC-only strip inside/above the timeline area; do not displace
  MC Cues, Sub-tasks, Speeches or the current-step controls and do not add a
  standalone card below the timeline.
- MC only. DJ, Photographer 1/2/Cameraman, Venue and Speaker are unchanged.
- No database/localStorage persistence; state is derived from the cartridge and
  shared event clock. Any dismissal is ephemeral.
- No automatic announcement, sound or notification. Tracked by
  [#464](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/464).

#### Service providers and DJ access (decision, 2026-11-08)

The owner manages external service providers per wedding directly in `/admin`.
This is admin-only data, not a Google Doc/cartridge section, and it does not
reintroduce the removed stage-level vendor/VIP-contact features.

**Provider registry.**

- New Supabase `wedding_service_providers` table, scoped to `wedding_id`.
- Fields: first name, last name, phone, email, address, Instagram, category,
  `function_label` for `other`, active flag and timestamps.
- Categories: `dj`, `photo1`, `photo2`, `video`, `venue_manager`, `other`.
- Role-bearing categories are unique per wedding; `other` can have many rows and
  requires a **Function** value (for example saxophonist, photobooth provider).
- Admin can add/edit/deactivate/delete, with validation, audit entries and
  read-only archived weddings. No new wedding is created here; weddings remain
  Drive-only submissions.
- Provider data never enters the cartridge or live state. Tracked by
  [#465](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/465).

**Role provisioning.** Adding an active role-bearing provider auto-creates the
matching role PIN and QR card: DJ → DJ view, Photo 1/Photo 2 → media views,
Camera → Camera view, Venue → Venue Manager view. Deactivating/removing revokes
sessions and the join PIN. `other` providers stay contact-only with no app
access. This requires expanding role checks/RLS for `photo1`, `photo2`, `video`
and `venue_manager`, which `join_room` already accepts. PINs stay bcrypt-hashed
and are shown once; unrelated PINs and live progress are untouched. Tracked by
[#466](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/466).

**DJ VIP identity.** VIP is limited to two hardcoded DJs: **DJ Mark** and
**DJ Szymoniak**, with name, phone and Instagram stored read-only in a
source-controlled registry and not editable in admin. Any wedding assigned one
of them resolves to DJ VIP; every other DJ resolves to DJ Standard even when the
package says VIP. DJ Mark is the default for the customer-booked MC+DJ offer.
Use stable ids, never name matching. Tracked by
[#467](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/467).

**DJ Standard restrictions.** Non-VIP DJs get UI/feature gating only (no auth/RLS
change in this pass). Standard must never render guest requests/queue/QR, Disco
Polo VIP policy, VIP Set Health/booth cues/export pack, cultural or Speeches
chips, VIP PIN/Open-on-phone controls, VIP overlays or pocket layout. Use one
shared `djCapabilities` helper and a test matrix for both tiers. Tracked by
[#468](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/468).

#### Game concept rework (decision, 2026-11-08)

The generic game implementation is replaced by two explicit predefined steps.
Both are normal optional timeline steps, one per game, with no new engine and no
impact outside MC.

**Predefined steps.**

| Step | `gameId` | Questions |
| --- | --- | --- |
| **Test Wiedzy** | `test_wiedzy` | separate Google Doc |
| **Test Zgodności** | `test_zgodnosci` | separate Google Doc |

- Each game has its own enabled flag (per question-list entry) with backward
  compatibility for the existing global `games.enabled`; disabled games are
  omitted from the timeline.
- Questions are fetched through the admin Drive/publish path and parsed into the
  cartridge. No runtime Doc scraping.
- Test Wiedzy question: id, localized prompt, level `EASY`/`MEDIUM`/`HARD`,
  answer `GROOM`/`BRIDE`; the displayed answer name comes from `coupleProfile`.
- Test Zgodności question: id and localized prompt only; the MC records match/no
  match at runtime.
- Keep normal time, duration, drift, hard-anchor and focus-stack behaviour.
  Tracked by
  [#469](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/469).

**MC Game Clicker.**

- Test Wiedzy default order is EASY → MEDIUM → HARD, Doc order within a level.
  Answers are revealed by the MC and already-answered questions never reappear.
- Test Zgodności uses Doc order. The MC presses **Match** or **No match** per
  question; Match adds one point. Record `isCompatible` true/false.
- MC may pick any unanswered question out of order (including another level);
  after it, the normal main queue resumes unchanged.
- Show total, current, answered and remaining counts; Zgodności also shows the
  running score. Completion and per-game reset states are required.
- MC only; other roles unchanged. Tracked by
  [#470](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/470).

**Results persistence.**

- Published cartridges are immutable and only admin may create a revision; the
  MC cannot mutate the cartridge during the event.
- Results therefore live in a schema-defined `liveSyncState.game_results` object:
  per-question answered/revealed data for Wiedzy, and
  `isCompatible`/score for Zgodności.
- This JSON persists through the existing live-state path (local localStorage,
  plus existing optional Supabase sync) — no new database table, migration or
  realtime channel. `isCompatible` is a runtime result, not a static question
  property in the cartridge.
- Undo/timeline changes must not erase results; per-game reset clears only that
  game. MC can export/download the results JSON for future reference.
- If a permanent cartridge archive is wanted later, the exported JSON can be
  attached to a new admin-published revision; that is a separate admin action.
  Tracked by
  [#471](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/471).

#### Roadmap rows

| Priority | Issue | Item | Status |
| --- | --- | --- | --- |
| P0 | [#426](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/426) | MC: remove hardcoded demo cues (follow-up to #80) | Shipped; blocks #80 view cleanup |
| P0 | [#421](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/421) | Phone: single Advance CTA (remove duplicate in BottomNav) | Shipped |
| P1 | [#422](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/422) | PWA: remove landscape orientation lock | Shipped |
| P1 | [#423](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/423) | PWA: allow pinch zoom (remove `user-scalable=no`) | Shipped |
| P1 | [#424](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/424) | Motion: restrict `CurrentStepTilt` to fine pointers | Shipped |
| P1 | [#425](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/425) | Compact: disable focus-stack overlap under 640px | Shipped |
| P1 | [#427](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/427) | Focus stack: add show-full-timeline expander | Shipped |
| P1 | [#428](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/428) | i18n: hardcoded EN strings in `McMasterView` | Shipped |
| P1 | [#429](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/429) | i18n: hardcoded strings in `BottomNav` + literal lint | Shipped |
| P1 | [#430](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/430) | Day theme: migrate to `text-ink` tokens, drop `.text-white` override | Shipped |
| P1 | [#431](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/431) | Card: `line-clamp-2` for `StageStepCard` title | Shipped; mobile time row added by audit |
| P1 | [#432](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/432) | Shell: TopBar `lg` breakpoint + `useCompact` hook + DJ encoding | Shipped; Photo SUNSET heading added by audit |
| P1 | [#433](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/433) | Fonts: wire theme fonts + offline self-host | Shipped |
| P1 | [#434](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/434) | Selection: scope `select-none` to chrome, allow content select | Shipped |
| P1 | [#435](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/435) | Viewport: `h-dvh`/`min-h-dvh` + no clipped MC root | Shipped |
| P1 | [#436](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/436) | i18n: hardcoded strings in Modal/Toast | Shipped |
| P1 | [#437](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/437) | Overlays: z-index token scale (modal above toasts) | Shipped |
| P1 | [#438](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/438) | Secondary bar: compact stacked variant | Shipped; confirms 375px audit |
| P1 | [#439](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/439) | Hold button: screen-reader progress | Shipped |
| P0 | [#440](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/440) | Mobile: hide DEV VIEW SWITCHER on small screens | Shipped |
| P0 | [#441](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/441) | Mobile: 44px touch targets | Shipped |
| P0 | [#443](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/443) | Mobile: MC footer HOLD/Undo/Swap ergonomics | Shipped |
| P1 | [#442](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/442) | Mobile: collapse header under md | Shipped |
| P1 | [#444](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/444) | i18n: MC Cues, Game Clicker and Speeches | Shipped; extends #428 |
| P1 | [#445](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/445) | i18n: DJ Music Policy + Set notes title | Shipped; note body exempt |
| P1 | [#446](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/446) | i18n: Photo Sunset & Golden Hour + number-free role label | Shipped |
| P1 | [#447](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/447) | Venue: grouped mandatory-step courses, cake and closure layout | Shipped |
| P1 | [#448](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/448) | Venue: extension checkbox + extension-until hour picker | Shipped; schema field, coordinate #77 |
| P1 | [#449](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/449) | Mobile: pocket header cleanup, icon-only Sync, baby icon | Shipped; supersedes #442 logo/clock |
| P1 | [#450](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/450) | Speaker: one-line name/relationship, script primary | Shipped |
| P1 | [#451](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/451) | Children expected: permanent red/green state in every role view | Shipped; supersedes #449 visibility clause |
| P1 | [#452](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/452) | Data: `childrenExpected` boolean from Google Doc to cartridge | Shipped; hardens #277 contract |
| P1 | [#453](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/453) | Top bar: enlarge small role/status icons | Shipped; size only, encoding stays #432 |
| P1 | [#454](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/454) | DJ Standard: top-bar role label is `DJ`, not MC/Standard | Shipped; VIP label unchanged |
| P1 | [#455](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/455) | Song request: guest phone view, online check, device id, live status | Shipped |
| P1 | [#456](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/456) | Song request backend: device id, 10-minute cooldown, realtime status | Shipped |
| P1 | [#457](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/457) | DJ VIP: accept/deny, accepted list, Played action | Shipped |
| P1 | [#458](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/458) | Dev-only song request simulator on DJ VIP | Shipped |
| Optional | [#459](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/459) | Planning TODO: free song metadata validation | Open; owner approval required |
| P1 | [#460](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/460) | DJ VIP: Song's request QR button and fullscreen QR (laptop + pocket) | Shipped; pocket QR launcher exception |
| P1 | [#461](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/461) | Data: `discoPoloPolicy` enum from Google Doc to cartridge | Shipped; no DB persistence |
| P1 | [#462](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/462) | DJ VIP: Disco Polo policy in Music Policy + Guest requests bar | Shipped; display only |
| P1 | [#463](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/463) | Data: parallel attractions from Google Doc to cartridge | Shipped; no DB persistence |
| P1 | [#464](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/464) | MC: parallel attraction announcement + availability reminders | Shipped; MC only |
| P1 | [#465](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/465) | Admin: per-wedding service provider registry | Shipped; admin-only Supabase data |
| P1 | [#466](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/466) | Roles: auto-provision provider app access and expand role checks/RLS | Shipped |
| P1 | [#467](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/467) | DJ VIP: hardcoded Mark/Szymoniak identity rule | Shipped; supersedes package-only tier |
| P1 | [#468](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/468) | DJ Standard: strict UI/feature restriction audit | Shipped; UI-only |
| P1 | [#469](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/469) | Games: predefined Test Wiedzy/Test Zgodności steps + Doc questions | Shipped |
| P1 | [#470](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/470) | MC Game Clicker: level queue, override, scoring | Shipped |
| P1 | [#471](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/471) | Games: persist results in live state + `isCompatible` export | Shipped |

Alignment for this review: last aligned 2026-11-08 against `master` @
`f1aa283`; roadmap rows above are classified P0/P1 unless marked optional.
#77, #80, #245 and #459 stay open. The status column in the historical review
table above is superseded: #421-#471 (except the optional #459) were delivered
through PRs #473-#522. #523-#525 were delivered through PRs #527-#529; #530 was
delivered through PR #532; #534/#535 through PRs #537/#538. #539 and #541 were
delivered through PRs #544/#545, and the #543 follow-ups (residual i18n strings,
stable step detection and this roadmap alignment) are delivered by the #543 PR.
#533 remains blocked on the owner's live Supabase/TOTP environment.

---

### Speaker, LATE and game-step Cues (decision, 2026-11-09)

**Speaker is exempt from the Children expected indicator.** Remove the
red/green Children expected element from the Speaker desktop secondary bar and
the pocket \`RoleShell\` header. The Speaker view shows only the assigned speech
content; no children badge, icon, text, live region, tooltip or empty centre
slot may remain. MC, DJ Standard/VIP, Photographer 1/2, Cameraman and Venue
Manager keep #451 unchanged. This supersedes #451 for Speaker only.
([#523](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/523))

**The MC LATE pill must show the real current lateness.** The current
canonical value is copied from the current step's start drift, so it can remain
stale while the live step overruns. Audit the full drift path and derive the
top-left LATE label, tone and tooltip from one corrected cumulative/live source.
A late start, a live overrun, an early start and missing clock data must each
behave correctly; the #416 undo freeze must keep the displayed value stable for
its existing window and then recompute from the corrected state. No second
competing number and no new data source.
([#524](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/524))

**Test Wiedzy and Test Zgodności steps do not show the MC Cues card.** Hide the
whole generic MC Cues block (heading, empty row, children warning and chrome)
when the current step's stable \`gameId\` is \`test_wiedzy\` or
\`test_zgodnosci\`. Keep the Games cue card, clicker launcher, subtasks, speeches
and MC controls; non-game steps keep MC Cues unchanged. Detection is by stable
ids, never by localized titles.
([#525](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/525))

### MC game card heading (decision, 2026-11-09)

The predefined game card must not render a generic **Games** heading with a
nested **Test Wiedzy** / **Test Zgodności** block. When \`GamesCueCard\` receives
a single stable \`gameId\`, the cartridge game title is the card heading and the
inner duplicate title is removed. Test Wiedzy therefore reads **Test Wiedzy**;
Test Zgodności reads **Test Zgodności**. Question count/status, question preview,
unavailable state and the Game Clicker launcher stay unchanged.

The generic \`games.title\` heading remains only for the no-\`gameId\` fallback
that shows multiple lists. No schema, data, parser, clicker, persistence or
timeline changes.
([#530](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/530))

### Admin and i18n follow-ups (decision, 2026-11-09)

**Live Supabase smoke test is a release gate.** The admin panel is complete in
code but has not been exercised against the live project. Run sign-in → TOTP →
library → publish → QR join → PIN rotation → session revoke → archive/provider
revocation against production, record pass/fail and fix or file any defect.
Never paste secrets, PINs or private URLs into the issue.
([#533](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/533))

**Admin destructive confirmations and TOTP re-auth use accessible dialogs.**
Most admin paths already use \`AdminConfirmDialog\`/\`AdminMfaDialog\`; replace the
remaining native \`window.confirm\` calls in the Drive publish and provider delete
paths. Preserve TOTP re-auth and audit logging. Keyboard, Escape/backdrop,
focus trap/restore, busy and error states are required.
([#534](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/534))

**Translate UI chrome, never cartridge content.** Finish the remaining
hardcoded English role-view domain labels through \`t()\` with EN/FR/PL keys.
Cartridge-sourced values — step titles/notes, MC cues, speeches/scripts, speaker
names, song metadata, venue/attraction/provider data, game questions and
answers — are authored content and must render verbatim. Do not wrap them in
\`t()\`, locale normalization or case conversion. Add a regression guard for both
directions.
([#535](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/535))

### MC game-step overflow (decision, 2026-11-09)

On the MC Test Wiedzy and Test Zgodności steps, remove the **More** disclosure
and its **Swap with next step** action entirely. This applies to the desktop
current-step hero and the pocket current-step card, with no leftover gap. Detect
the steps by stable \`gameId\`, not localized titles. Non-game steps keep the
More/swap control unchanged. No timeline, drift, cartridge or schema changes.
([#539](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/539))

### App-wide reload stability (decision, 2026-11-09)

Frequent full-document reloads and brief white flashes are unacceptable on the
live stage. Routine live-state sync, cartridge checks, polling, visibility/focus
catch-up and PWA update checks must not reload or remount the whole app. The
PWA update stays behind the existing explicit **Reload now** prompt. Cartridge
and live-state updates must preserve the current view, scroll, validated
overlays, active step/speech/game and local UI state. Only a user-initiated safe
reload may reload the document. Audit the PWA registration/update path, error
boundary, router redirects and StageDeck/role-view remount triggers before
changing behaviour.
([#541](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/541))

---

## 3. Architecture

- **Client:** React 19 + Vite 8 + Tailwind 4, single-page PWA.
- **Offline store:** `localStorage` (`wzsd:v1:*`) for live state, role, theme,
  locale, pending update state and the sync outbox.
- **Cloud (optional):** Supabase Postgres + Realtime + Edge Functions.
- **Auth:**
  - local/demo mode: 4-digit DDMM display PIN and local pairing;
  - production mode: 6-digit per-role PIN validated by `join_room`, returning a
    role-scoped JWT with `wedding_id`, `room_id`, `app_role` and session `jti`;
  - `/admin`: Supabase Auth email/password + TOTP MFA, allowlisted through
    `app_admins`.
- **Routing:** no router library. `main.jsx` selects `/admin` vs the stage
  deck from `window.location.pathname`.
- **Data flow:** cartridge → normalized live state → local persistence →
  optional outbox/Realtime sync. Cartridge content remains the only shared data.

### Main directories

```text
src/
  admin/            owner admin panel, Auth/MFA client, pure admin helpers
  components/       stage UI cards, modals, status and overlay components
  content/games/    prepared optional-game content (not wired into schema yet)
  demo/             demo wedding cartridge
  hooks/            live state, role, theme, pairing
  i18n/             en/fr/pl dictionaries, t()/tp(), locale persistence
  lib/              drift, clock, schema, import, sync, PWA and data helpers
  views/            MC master view
supabase/
  schema.sql        base tables, RLS, join/wipe/purge functions
  migrations/       owner-admin tables, presence, sessions, audit, RLS updates
  functions/        join_room, admin_api, admin_drive, submit_song_request
schema/             WeddingSchema v1.1, fixtures, validators, Google Doc template/parser
docs/               focused design/testing/accessibility notes
scripts/            validators and migration helpers
tests/              Vitest suites and smoke tests
```

---

## 4. Roles and access

| Role id | Label | Purpose |
| --- | --- | --- |
| `mc` | MC Master | Full deck, drift controls, scripts, stage pings, group-photo checklist |
| `dj` | DJ Booth | Read-only timeline, playlists, hard cutoffs |
| `photo` | Photographer | Shot lists, sunset windows, Oczepiny cues |
| `speaker` | Speaker | Read-only teleprompter for the assigned speech |

Role choice is per device and never part of the synced live state. In
production the role is fixed by the join token. `/deck/` never lists weddings;
devices join with a room code or a QR deep link, then enter the role PIN.

### Phone layouts (decision, 2026-11-06)

The separate **Pocket** role is removed. Each role keeps one responsive view:
- laptop/tablet shows the full layout;
- small/phone screens get a dedicated pocket layout optimized for one-handed,
  outdoor use (larger touch targets, fewer simultaneous panels, high contrast);
- the **MC phone layout** allows **advance, undo and drift check** only; DJ,
  Photographer and Speaker stay read-only;
- a shared bottom navigation bar keeps the current role and its phone controls
  consistent across views.

The unified mobile header, status-pill grid and overlay sizing rules are defined
in **Unified mobile layout (decision, 2026-11-07)** above. Owner admin
(`/admin`) is laptop/desktop-only and must show a blocked-screen fallback on
mobile ([#337](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/337)).
([#331](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/331),
[#332](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/332),
[#333](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/333),
[#334](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/334))

---

## 5. Data model

The current schema is **WeddingSchema v1.1**:
[`schema/wedding-schema-v1.1.json`](schema/wedding-schema-v1.1.json).

Core top-level groups:

- identity: `weddingId`, `couple`, `coupleProfile`, `date`, `dateISO`,
  `syncPin`, `role`, `hostingMode`;
- venue and cultural rules: `venue`, `venueLogistics`, `culturalRules`;
- schedule: `hardAnchors`, `steps` (`FLEXIBLE`, `HARD_ANCHOR`);
- content: `cake`, `speeches`, `musicPolicy`, `mediaTeam`, `photoPlan`,
  `oczepiny`;
- optional/forward-compatible: `demographics`, `viewVisibility`, `privacy`,
  `speeches`, `extensions`;
- live state: `liveSyncState` with `active_step_id`, `completed_step_ids`,
  `actual_timestamps`, `checked_subtasks`, `stage_ping`, `step_order`,
  `active_speech_id`, `mutation_log`.

Validation:

```bash
npm run validate:schema
npm run validate:fixtures
npm run validate:template
npm run validate:i18n
```

`WeddingSchema v1.2` is not frozen yet; tracking issue #77.

---

## 6. Implemented features

### Stage engine and controls

- day-aware drift math across midnight, with a single canonical drift pill;
- ELASTIC/BUFFER/HARD_ANCHOR classification;
- buffer accordion advice for late/ahead drift;
- hard-anchor radar and collision/compression banners;
- swap-with-next with hard-anchor protection and photographer-cue warning;
- undo stack, mutation log, safe advance and end-of-event wipe;
- reel clock, countdowns and cutoff stopwatches.

### Role views

- MC Master: header identity, drift, controls, timeline, cake, music policy,
  buffer accordion, speeches, radar, stage pings;
  the **Stage Rail** (current-step hero with done/upcoming accordions) is
  planned in #118–#121;
- DJ Booth: read-only timeline, key songs and cutoffs;
- Photographer: shot lists, sunset/golden-hour, Oczepiny cues, media team,
  venue access;
- Speaker: assigned-speech teleprompter with cached fallback.

### Content publishing

- admin-only JSON publishing through `/admin` with Ajv + semantic
  validation;
- read-only server-snapshot cache on role devices (no import, activation or
  reset path);
- Google Doc template conventions and validator;
- example cartridge, real wedding fixture and edge-case fixtures;
- prepared optional-game content in `src/content/games/` (schema/UI deferred).

### PWA and device UX

- installable PWA with `/deck/` scope;
- icons, favicon and Apple touch icon;
- prompt-based service worker update flow with “Reload now” / “Later”;
- reload guard while a step, speech or overlay is live;
- overlay/scroll restoration after an accepted reload;
- per-device EN/FR/PL UI, persisted locally, separate from cartridge content;
- Night Stage / Daylight themes.

### Owner admin (`/admin`)

- Supabase Auth + TOTP MFA; allowlisted `app_admins`; no self-signup;
- 30-minute idle / 8-hour absolute admin session;
- TOTP re-auth for destructive actions;
- multi-wedding library: publish/create, duplicate, archive, delete;
- per-role 6-digit PINs: auto-generate or owner-edited, bcrypt hashes only,
  shown once, rotate;
- printable QR cards with role deep link, role, room code and event identity —
  never the PIN;
- live presence (role, device, online/idle/offline, last seen, current view,
  token expiry);
- multiple sessions per role, revoke individually; revocation enforced by RLS
  through `current_session_active()`;
- `admin_audit_log`.

### Sync and security

- room key `wzsd:<weddingId>`, never the PIN;
- RLS scoped to the role JWT claims;
- optional outbox with retry;
- service-role key only in Edge Function secrets;
- TTL purge for expired rooms.

---

## 7. Removed features — do not reintroduce

Removed by issue #75:

- Joker games, `jokersCount`, `jokerGames`, the Joker Drawer defer/restore flow,
  step `deferable`, `deferred_step_ids`;
- kitchen/vendor `+15m` control and `manual_offset_minutes`;
- weather variants/branching (`weatherVariants`, step `weatherOption`);
- step `cateringNotes` and `propsAndFx`;
- related UI, schema fields, fixtures, template columns, Google Doc sections and
  docs.

The shared admin/server cartridge validator strips legacy copies of these
fields before validation instead of migrating them.

Removed in the VIP Radar / Contacts deletion pass:

- `VipAlertsModal` and `ContactsModal`;
- `contacts`, `vipAlerts`, `tact_and_vip_alerts`, `vipRadarCount`;
- the `VENDOR CONTACTS` and `VIP ALERTS` Google Doc sections;
- the encrypted `sensitive_notes` table, client hook, sync methods and payload.

Old cartridges must drop these fields; they are no longer accepted by the
schema.

---

## 8. Deployment and operations

### Client

```bash
npm ci
npm run dev
npm run build
```

Required public variables in `.env.local`:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_DECK_MODE=production   # optional; local mode is the default
```

Validate the configuration (never prints values):

```bash
npm run validate:env
```

Never ship the service-role key or any other server secret. The complete setup
and troubleshooting guide is
[`docs/admin-setup-and-secrets.md`](docs/admin-setup-and-secrets.md).

### Supabase

1. Apply [`supabase/schema.sql`](supabase/schema.sql).
2. Apply [`supabase/migrations/202611060001_owner_admin.sql`](supabase/migrations/202611060001_owner_admin.sql).
3. Apply the remaining migrations, including
   [`supabase/migrations/202611060003_cartridge_revisions.sql`](supabase/migrations/202611060003_cartridge_revisions.sql),
   [`supabase/migrations/202611060004_drive_publication.sql`](supabase/migrations/202611060004_drive_publication.sql)
   and [`supabase/migrations/202611070001_drop_vip_contacts.sql`](supabase/migrations/202611070001_drop_vip_contacts.sql).
4. Deploy functions:

```bash
supabase functions deploy join_room
supabase functions deploy admin_api
supabase functions deploy admin_drive
supabase functions deploy submit_song_request
```

If an older deployment still has the legacy secret-based function, remove it:
`supabase functions delete publish_room` and
`supabase secrets unset DECK_PUBLISH_SECRET`.

5. Set secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_JWT_SECRET`, `PUBLIC_DECK_URL`, `ALLOWED_ORIGIN`,
   `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` and
   optional `GOOGLE_DRIVE_TEST_FILE_ID`.
6. Add the owner account to `app_admins`, enable TOTP MFA and disable Auth
   self-signup.
7. Build with `VITE_DECK_MODE=production`.
8. Run `npm run validate:env` before building; missing configuration or a
   `VITE_*` server secret must fail the build pipeline.

`join_room` now writes `role_sessions` and `role_presence`; existing role tokens
issued before the owner-admin migration have no session row and must rejoin.

---

## 9. Validation

```bash
npm run lint
npm test
npm run build
npm run validate:schema
npm run validate:fixtures
npm run validate:template
npm run validate:i18n
```

CI runs the same checks on pushes and pull requests to `master`.

---

## 10. Known limitations and follow-ups

- Admin panel has not been smoke-tested against the live Supabase project yet.
  The release-gate checklist is tracked in
  [#533](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/533).
- Admin destructive actions and TOTP re-auth use accessible in-app dialogs;
  the remaining native confirms were removed in
  [#534](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/534).
- Role-view UI labels are localized EN/FR/PL. Cartridge content remains authored
  data and is never translated; regression coverage was added in
  [#535](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/535).
- Test Wiedzy and Test Zgodności are predefined game steps with parsed question
  Docs and runtime results in \`liveSyncState.game_results\` (#469-#471).
- Google Docs-first import (#82) has deterministic API-to-template parsing and
  AI-prompt cleanup; Drive transport/admin placement is tracked in #168–#170.
  Admin JSON publishing remains, but role devices no longer import cartridges.
- The Pocket role removal and per-role phone layouts shipped in #109–#114.
- The MC Stage Rail (current-step hero with done/upcoming accordions) is planned
  in #118–#121; see `docs/mc-stage-rail-plan.md`.
- v1.2 schema freeze (#77) and MC cue cleanup (#80) remain open. The
  multi-wedding library work (#79) is closed.
- `/deck/` static hosting still needs an Apache/SPA rewrite for deep links such
  as `/deck/8f3k2q/mc` and `/admin`. This is a known deployment limitation and
  has no tracking issue yet.
- No automated browser/axe E2E suite yet.

---

## 11. Source map

| Topic | File(s) |
| --- | --- |
| Product/status | `project.md`, `README.md` |
| Schema/validation | `schema/`, `schema/README.md` |
| Drift/schedule | `src/lib/driftEngine.js`, `src/lib/bufferAccordion.js`, `src/lib/clockMath.js` |
| Live state | `src/lib/liveStageState.js`, `src/hooks/useLiveStageState.js` |
| Role access | `src/lib/roles.js`, `src/lib/sync/roleSession.js`, `supabase/functions/join_room` |
| Owner admin | `src/admin/`, `supabase/functions/admin_api`, `supabase/migrations/` |
| i18n | `src/i18n/`, `scripts/check-i18n.mjs` |
| PWA | `vite.config.js`, `src/components/PwaUpdatePrompt.jsx`, `public/` |
| Admin cartridge publishing | `src/lib/cartridgeImporter.js` (shared validation), `src/admin/AdminApp.jsx` |
| Role cartridge cache | `src/lib/cartridgeStorage.js`, `src/App.jsx`, `src/StageDeck.jsx` |
| Google Doc template | `src/lib/googleDocTemplate.js`, `schema/google-doc-template.md` |
| Tests | `tests/`, `docs/testing.md` |
| Accessibility | `docs/accessibility-audit.md` |
| MC Stage Rail plan | `docs/mc-stage-rail-plan.md`, `scripts/create-stage-rail-issues.mjs` |

---

## 12. Global architecture & UI/UX review (2026-11-09)

A whole-codebase pass over the current `master` (`1cbbdcb`). This section is the
living architectural + UX reference; it supersedes any stale directory map in
section 3 where the two conflict.

### 12.1 Architecture overview

**Stack.** React 19 + Vite 8 + Tailwind CSS 4 (CSS-first config via
`@theme inline` / `@utility` in `src/index.css`; there is no
`tailwind.config.js`), `vite-plugin-pwa`, Supabase (optional cloud), Ajv for
cartridge validation, `qrcode` and `flag-icons`. Vitest + oxlint for tests and
lint.

**No router library.** `src/main.jsx` branches on `window.location.pathname` to
select three lazy-loaded surfaces — owner admin (`/admin`), guest song request
(`/request/:room`), and the stage deck (everything else). The legacy
`/deck/admin` path issues a hard redirect to `/admin` in `main.jsx`. Deck deep
links are parsed by `parseDeckIntent` in `lib/sync/roleSession.js` and carried
into `App.jsx`.

**Entry gating (`App.jsx`).** The single stage entry decides between production
role join (`RoleJoinScreen`, per-role PIN → JWT) and local/demo pairing
(`PairingScreen`, DDMM display PIN), then owns the cartridge loading/error
states before ever mounting the deck. Production never falls back to the demo
cartridge; the wrong-wedding guard nulls the cartridge instead.

**Controller (`StageDeck.jsx`).** The single orchestration layer: it derives the
event clock, drift report, time-aware timeline, cake protocol, music policy,
speeches, game clicker and swap/undo guards, holds all handlers
(advance/undo/swap/subtask/speech/game/media-override), and dispatches to the
role views (`DjBoothView`, `PhotographerView`, `VenueManagerView`,
`SpeakerView`, `McMasterView`). It is the largest client module (~680 lines) and
passes a ~40-key `model` object to `McMasterView`; functional but the densest
point of coupling.

**State management.** React hooks only — no external store. `useLiveStageState`
is the core: it normalises live state, persists to `localStorage`
(`wzsd:v1:*`), and drives the optional Supabase outbox/Realtime sync. Companion
hooks are `useRole`, `useTheme`, `usePairing`, `usePublishedCartridge`,
`useEventClock` and `useCompact`. Role, theme and locale are per-device and never
part of the synced live state.

**Modularity.** `src/lib/` holds ~64 pure, mostly testable helpers (drift engine,
cake, speeches, music policy, games, photo plan, focus stack, stage rail, PWA,
sync). `src/components/` holds presentational stage UI and the shared shells.
`src/admin/` is the lazily-loaded owner panel. `src/views/` currently holds only
`McMasterView`; the other role views still live in `src/components/` (a mild
inconsistency, see 12.4).

**i18n.** Custom `useI18n` with `en`/`fr`/`pl` dictionaries, `t()`/`tp()` and
`formatTime()`, persisted per device. Cartridge content is authored data and is
never translated. `scripts/check-i18n.mjs` checks dictionary parity only; a
hardcoded-literal lint is still only a proposal (`docs/i18n-literal-lint.md`).

**Theming.** CSS variables under `[data-theme="night"|"day"]` with a pre-paint
inline script in `index.html` that avoids theme flash; semantic colour tokens
(`bg-page/card/raised`, `border-line`, `text-ink/muted`, `brand`, `alert`) are
mapped in `@theme inline`.

### 12.2 Component layout status

**Laptop vs pocket.** The single shared breakpoint is `(max-width: 639px)` via
`useCompact()` (`src/hooks/useCompact.js`), so `RoleShell`, the view layout and
the bottom bar can never disagree at 639/640px. Every role view calls
`useCompact` and returns either its own full `wideContent` (TopBarShell +
SecondaryControlBar + timeline) or `<RoleShell compact>` + `compactContent`.
`RoleShell` is a pass-through above 640px; below it renders a compact header
(role badge, Children-expected icon, icon-only Sync, a Details disclosure, and
language/theme) plus the persistent `BottomNav`. Per #449 the pocket header drops
logo, clock and PIN; date, couple languages, cultural/speeches chips and auth
live behind the disclosure so the current step stays above the fold. DJ Standard
is laptop-only (#256).

**Top bar.** `TopBarShell` is the shared three-zone shell
(`lg:grid-cols-[1fr_auto_1fr]`). Desktop MC: left = logo + `TopBarClock`
(`text-2xl` monospace `HH:MM:SS`, `tabular-nums`) + role label; center =
`TopBarCenterIdentity` (first names + flags, ring separator, couple languages,
localised weekday date); right = cultural chips + Speeches chip + view switch.
`SecondaryControlBar` sits under the top bar: left = `DriftPill` (LATE) +
PIN/sign-out + `SyncStatusBadge`; center = `ChildrenExpectedBadge`; right =
Open-on-phone + language + theme. It uses a compact stacked variant below `sm`.

**Role identity.** Two related but distinct components:
`TopBarRoleLabel` (MC's "MC Master" chip) and `TopBarRoleIdentity`
(companion "Role: X" chip with lock, number-free media label). Both derive DJ
tier text (`DJ`/`DJ VIP`); see 12.4 for the consolidation note.

**Step handler components.** The universal `TimelineFocusStack` (2 history + 1
current + 2 future, `buildFocusStack` in `lib/focusStack.js`, "show more"
expander) is shared by every role/viewport. `StageStepCard` is the disclosure
card with done/current/next/later variants and roving keyboard focus.
`CurrentStepTilt` applies a 6° tilt only on fine hover pointers and honours
`prefers-reduced-motion`. `HoldToConfirmButton` is the 1.2s advance gate with
pointer + keyboard support and a screen-reader `role="progressbar"`.
`CurrentStepOverflow` owns the desktop More/swap action (removed on predefined
game steps per #539). `BottomNav` carries role identity only — the single
Advance CTA lives in the current-step card (#421).

### 12.3 UI/UX assessment summary

- **Responsiveness.** Strong: one shared breakpoint, a dedicated compact shell,
  and a compact stacked secondary bar keep 375px layouts usable. The focus stack
  drops desktop-only overlap/scale under 640px (#425) so compact lists stay
  clean.
- **Visual hierarchy.** The current step is the unmistakable focal point via
  ring, glow, elevation and (desktop-only) pointer tilt; completed/future cards
  recede behind it with opacity/scale tiers.
- **Styling consistency.** Semantic Tailwind tokens are the norm; night/day
  themes share one palette. The high-contrast, low-light stage design is
  appropriate for the venue context.
- **Typography.** Montserrat headings + Lora body, loaded from Google Fonts with
  Workbox runtime caching so the PWA keeps its intended type offline. (Not yet
  self-hosted — see 12.4.)
- **Accessibility.** Skip link, `:focus-visible` ring, reduced-motion guards,
  `role="status"`/`aria-live` on drift/sync/children indicators, disclosure
  semantics and roving focus in the rail, and SR progress on the hold button.
  Touch targets have been raised to ≥44px in the recent pass (#441).
- **Interaction flow.** Local pairing / production join → cartridge load →
  role-scoped deck, with a single advance CTA, hold-to-confirm against
  accidental taps, and an undo toast. Sign-out/forget are deliberately
  confirm-gated.

### 12.4 Technical debt & findings

1. **Residual hardcoded UI strings.** `StageDeck.jsx` still has native
   `window.confirm` copy and untranslated control notices ("Step marked done.",
   "Last action undone.", `Swapped ${…}`), and `McMasterView.jsx`/
   `RoleSignOutControl.jsx` keep hardcoded `title`/`aria` text and the
   "Saved locally" footer. #535 (translate UI chrome) is closed but these remain;
   the literal lint is still only a proposal.
2. **Fragile English-title step detection.** `childrenWarningFor()` in
   `McMasterView.jsx` matches step titles with English regexes (`wedding cake`,
   `grand entrance`, `first dance`). Authored step titles can be French/Polish,
   so the children warning silently fails; this contradicts the "stable ids, never
   localised titles" rule already applied to game steps (#525, #539). The cake
   warning already has a stable signal (`cakeProtocol.stepId`), and entrance/
   dance have flags (`grandEntranceOrder`, `firstDanceMode`). `isGameStep`
   retains a `/games/i` title-regex fallback alongside the stable
   `optionalFlag === 'games'`.
3. **Documentation drift.** `project.md`'s roadmap tables (12.1-era rows) still
   show "Open" for items the adjacent note says were delivered through PRs
   #473–#522 etc.; the "Last aligned" hash was one commit behind before this
   update. `## 3`'s directory map also predates `views/McMasterView.jsx` and
   `hooks/useCompact.js`.
4. **Role views split across folders.** `McMasterView` is in `src/views/` while
   `DjBoothView`, `PhotographerView`, `VenueManagerView` and `SpeakerView` live
   in `src/components/`.
5. **Overlapping role-label components.** `TopBarRoleLabel` and
   `TopBarRoleIdentity` duplicate DJ-tier derivation and role display logic.
6. **`StageDeck` is a dense controller.** ~680 lines with a ~40-key `model` bag
   into `McMasterView`; the highest-coupling module and a candidate for a later
   extraction pass.
7. **Minor token inconsistency.** `STEP_TYPE_STYLES.FLEXIBLE` still uses
   `text-white` rather than the semantic `text-on-accent` (readable today because
   `bg-brand` stays dark blue in both themes, but inconsistent).
8. **Fonts remain remote.** Self-hosting (#433) is incomplete: the families load
   from Google Fonts with runtime caching only, so a cold-cache offline launch
   still falls back to system fonts with a layout shift.
9. **No automated browser/a11y E2E.** The axe/E2E suite noted in §10 remains
   absent.

## 13. Google Doc "Plan of the day" mapping (decision, 2026-11-09)

`example.pdf` (dev-only, repo root) is a real wedding Google Doc export used to
define how the couple's free-form "Plan of the day" maps onto the app's timeline,
sub-tasks, MC cues and DJ songs. The end goal is a deterministic template read
through the Google Drive API.

### Convention

- Each **hour block** in "Plan of the day" is the planned start of one step.
- **Lettered bullets** (`a.`, `b.`, …) are one of:
  - **sub-tasks** (`step.subTasks`) — a checkable to-do;
  - **MC cues** (`step.mcCues`) — an instruction the MC announces or performs;
  - **a DJ song** (`step.dj.track`) — when the bullet begins with `Song -`.
- Authored step names are unified to the app's stable names
  (e.g. "Ilona and Adrien Enter the Room" → **Grand Entrance**), never matched
  by localized title.

### Confirmed mapping

| Time | Step | Kind / flag | Bullets |
| --- | --- | --- | --- |
| 14:30 | Ceremony | FLEXIBLE (`ceremonyType: VENUE`) | confetti → MC cue |
| 15:00 | Bread and Salt | FLEXIBLE (new step) | e/f → MC cues |
| 15:15 | Wishes | `optionalFlag: wishes` | g → MC cue |
| 15:30 | Cocktail / Vin d'honneur | FLEXIBLE | h–n → sub-tasks + attractions (instax, mirror, advice notes, photo challenge) |
| 16:00 | Grand Entrance | `grandEntranceOrder: GUESTS_FIRST` | o → 2 sub-tasks; p → DJ song (ABBA Gimme!); q/r/s/t/u → MC cues |
| 16:15 | Dinner | FLEXIBLE + `kitchenServices.dinner` | w → MC cue; x/y/z → speeches |
| 18:00 | First Dance | `firstDanceMode: NORMAL` | aa → cue; bb → DJ song (Ellie Goulding); cc → cue |
| 19:15 | Supper I | mandatory (kitchen course) | — |
| 20:30 | Wedding Cake | HARD_ANCHOR | — |
| 21:00 | Dance with Bride and Groom | new game step | dd → game; ee → cue |
| 22:30 | Supper II / Test Wiedzy | mandatory + `optionalFlag: games` | gg → game; hh → cue |
| 00:00 | Test Zgodności + Oczepiny | `games` + `oczepiny` | jj → sub-events |
| 01:00 | Supper III | mandatory (kitchen course) | — |
| 03:30 | Last Dance | FLEXIBLE | song = Les Lacs du Connemara |

Guest-flow moments (13:30 Arrival, 14:15 Move-to-Orangery, 16:15 Guests-take-seats)
are **venue notes, not timeline steps**.

### Songs

- Grand Entrance → ABBA — Gimme! Gimme! Gimme!
- First Dance → Ellie Goulding — Love Me Like You Do
- Last Dance → Michel Sardou — Les Lacs du Connemara

### Speeches (page 1 / dinner block)

- Zuzia (świadkowa) → PL · Valentin (témoin) → FR · Ilona → EN · Adrien → EN ·
  parents thank-you + gifts (x).

### Follow-ups

- [#547](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/547) — mapping convention + converter + fixture.
- [#548](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/548) — kitchen supper courses as mandatory steps.
- [#549](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/549) — Bread and Salt + Dance-with-the-couple steps.
- [#550](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/550) — surface per-step MC cues in the MC view.

## 14. Unified Google Doc template & parser-mapper (decision, 2026-11-09)

The six example wedding docs in `exs/` (harmonogram / roadmap / scenario, mixed
PL/FR/EN) are **reference material only**. The single input to the app is the
standardized Google Doc template (27 `## SECTION` markers); the couple/planner
fills it in, and a free-form harmonogram is transcribed into it by hand. There is
**one** generalized parser-mapper — `googleDocToTemplateText` →
`parseGoogleDocTemplate` → `validateGoogleDocTemplate` →
`googleDocTemplateToCartridge` — with no per-file logic.

### Canonical step vocabulary

Free-form step names are normalized to a fixed set; detection never matches
localized titles.

| Canonical step | Flag / type |
| --- | --- |
| Ceremony | `ceremonyType` |
| Vin d'honneur / Cocktail | FLEXIBLE |
| Bread & Salt | FLEXIBLE |
| Wishes | `optionalFlag: wishes` |
| Grand Entrance | `grandEntranceOrder` |
| Dinner | FLEXIBLE (speeches attach) + `kitchenServices.dinner` |
| First Dance | `firstDanceMode` |
| Wedding Cake | HARD_ANCHOR + `cake` |
| Dance with Bride and Groom | game step |
| Supper I / II / III… | mandatory kitchen course (variable-length list) |
| Test Wiedzy | `optionalFlag: games` |
| Test Zgodności | `optionalFlag: games` |
| Oczepiny | `optionalFlag: oczepiny` |
| Last Dance | FLEXIBLE |

Guest-flow moments (check-in, moving to the orangery, taking seats) are venue
notes, not steps.

### Decisions from this review

- The standardized template is the only input (no AI/LLM transcription step).
- Canonical step titles are enforced.
- DJ / photographer / cameraman contacts map to their existing role views and
  are **not** added to the template now. Witnesses (świadkowie/témoins) are key
  persons — tracked as a TODO.
- Weather-variant timelines (Ola&Eddy) are single timeline + notes.
- Kitchen courses become a variable-length ordered list (not the fixed 4 slots).
- The trilingual ceremony script is stored as the Ceremony step's teleprompter.
- Lettered bullets under a "Plan of the day" block map deterministically:
  sub-task / MC cue / DJ song.

### Follow-ups

- [#547](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/547) — template blueprint + canonical vocabulary + lettered-bullet mapping.
- [#548](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/548) — variable-length mandatory kitchen course list.
- [#549](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/549) — Bread & Salt + Dance-with-the-couple canonical steps.
- [#550](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/550) — surface per-step MC cues.
- [#551](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/551) — ceremony script as Ceremony-step teleprompter.
- [#552](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/552) — parser-mapper uniform edge-case rules.
- [#553](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/553) — witnesses as key persons (TODO).

## 15. Per-domain JSON schemas for Google Doc mapping (decision, 2026-11-09)

The Google Doc → JSON mapping is split into six focused **domain schemas**, each
in `schema/domains/<name>.json` and referenced by `$ref` from
`schema/wedding-schema-v1.1.json`. Each domain keeps a per-domain example; the
matching block is removed from `schema/wedding-cartridge.example.json` so the
cartridge example stays lean and every mapping unit is validated on its own.

| Domain | Schema file | Cartridge block | Example removed from main cartridge |
| --- | --- | --- | --- |
| first-dance | `schema/domains/first-dance.json` | `steps[].firstDance*` | First Dance step fields |
| attractions | `schema/domains/attractions.json` | `attractions` | `attractions` |
| oczepiny | `schema/domains/oczepiny.json` | `oczepiny` | `oczepiny` |
| couple-profile | `schema/domains/couple-profile.json` | `coupleProfile` | `coupleProfile` |
| cultural-rules | `schema/domains/cultural-rules.json` | `culturalRules` | `culturalRules` |
| photo-plan | `schema/domains/photo-plan.json` | `photoPlan` | `photoPlan` |

Decisions:

- Schemas live under `schema/domains/` and are `$ref`'d from the main schema; the
  browser and Edge validators must resolve the refs, and the byte-identical Edge
  schema copy is regenerated.
- The matching block is removed from `wedding-cartridge.example.json` and
  demonstrated in a per-domain example file.
- First dance stays a **timeline step**, but its fields become
  `firstDanceStartAt` / `firstDanceStopAt` (mm:ss strings) plus a
  `song` object; the integer `firstDanceStartAtSec` / `firstDanceStopAfterSec`
  fields are retired.
- The authored schemas use draft-07; adapt to the app's 2020-12 validator where
  required.

### Follow-ups

- [#561](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/561) — first-dance.
- [#562](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/562) — attractions.
- [#560](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/560) — oczepiny.
- [#564](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/564) — couple-profile.
- [#563](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/563) — cultural-rules.
- [#565](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/565) — photo-plan.

## 16. Photo-plan sub-domain schemas (decision, 2026-11-09)

The photo plan is decomposed into five focused sub-domain schemas, each in
`schema/domains/<name>.json` and `$ref`'d from `schema/domains/photo-plan.json`.
The cartridge shape stays nested (`photoPlan.<name>`); only the schema files are
extracted. These are the Google Doc → JSON mapping contracts for the photo-plan
sub-blocks.

| Sub-domain | Schema file | Cartridge path | Issue |
| --- | --- | --- | --- |
| miniSession | `schema/domains/mini-session.json` | `photoPlan.miniSession` | [#572](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/572) |
| groupPhotos | `schema/domains/group-photos.json` | `photoPlan.groupPhotos` | [#573](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/573) |
| guestCoverage | `schema/domains/guest-coverage.json` | `photoPlan.guestCoverage` | [#575](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/575) |
| specialEffects | `schema/domains/special-effects.json` | `photoPlan.specialEffects` | [#576](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/576) |

Notes:

- `photoPlan` itself was extracted in [#565](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/565);
  `wedding-cartridge.example.json` already omits it, so these five blocks are
  moved out of `schema/domains/photo-plan.example.json` into per-sub-domain
  examples rather than deleted from the cartridge example again.
- **`speedFoto` is a game, not a photo-plan sub-block.** It is modeled as a
  timeline game step (`optionalFlag: 'games'`, no question list) like Dance with
  Bride and Groom (#549); the photo plan references that step. Tracked by
  [#574](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/574).
- Each sub-schema uses draft 2020-12 and is registered with the browser, Node and
  Edge validators (mirrored to `supabase/functions/_shared/domains/`), with the
  byte-identical Edge schema copy regenerated.

## 17. Additional domain schemas & legacy-block assessment (decision, 2026-11-09)

### 17.1 `cake`, `musicPolicy`, `demographics`

Three more cartridge blocks are extracted into dedicated domain schemas under
`schema/domains/`, `$ref`'d from `schema/wedding-schema-v1.1.json`, with their
blocks removed from `wedding-cartridge.example.json` and mirrored to the Edge
validator. These are the Google Doc → JSON mapping contracts.

| Domain | Schema file | Issue |
| --- | --- | --- |
| cake | `schema/domains/cake.json` | [#582](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/582) |
| musicPolicy | `schema/domains/music-policy.json` | [#584](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/584) |
| demographics | `schema/domains/demographics.json` | [#585](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/585) |

### 17.2 Can we safely delete `mediaTeam`, `contentCreators`, `coHosts`, `preWeddingTodos`?

| Block | Safe to delete? | Why |
| --- | --- | --- |
| `coHosts` | **Yes** | Deprecated; dropped on load by `cartridgeStorage` → `dropDeprecatedCartridgeFields`; not rendered. |
| `contentCreators` | **Yes** | Same as `coHosts`. |
| `mediaTeam` | **No** | Actively used by `GroupPhotoChecklist`, `PhotographerView`, `resolveOczepiny` (winner-photo timing) and the Doc `MEDIA TEAM` mapping. |
| `preWeddingTodos` | **Yes — owner confirmed** | Imported and seeds `buildInitialLiveState.checked_subtasks`, but no UI renders it (the MC Pre-wedding Checklist card was removed in #202); removal also drops the Doc `## PRE-WEDDING TODOS` mapping. |

The removal shipped in
[#583](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/583):
`coHosts`, `contentCreators` and `preWeddingTodos` are gone from the schema,
example and fixture, importer/converter, demo and template, and both validators
drop the legacy team fields before validation. `mediaTeam` is explicitly kept
and still drives the group-photo checklist.

### 17.3 Construction schemas: `steps`, `speeches`

The timeline and speech blocks are the next Google Doc to JSON mapping contracts
to extract into dedicated domain schemas.

| Domain | Schema file | Cartridge path | Issue |
| --- | --- | --- | --- |
| steps | `schema/domains/steps.json` | `steps` | [#590](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/590) |
| speeches | `schema/domains/speeches.json` | `speeches` | [#591](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/591) |
| speechMode | `schema/domains/speeches.json` (shared file) | `speechMode` | [#593](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/593) |

Notes:

- `steps` is required (`minItems: 1`). The full step catalogue moves to
  `schema/domains/steps.example.json`; `wedding-cartridge.example.json` keeps
  only a minimal valid steps sample so it still passes `validate:schema`.
- `speeches` is optional and is removed from the cartridge example. Each
  speech may also carry `script.sourceDoc` (link + Drive metadata); see §17.6.
  Each speaker may carry an admin-managed `email`; see §17.7.
- `speechMode` stays a top-level cartridge field (sibling of `speeches`); only
  schema ownership moves into the speeches domain. [#593](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/593)
  is blocked by #591.
- Both domain schemas are self-contained and registered with the browser, Node
  and Edge validators, with the byte-identical Edge schema copy mirrored.

### 17.4 Can we safely delete `mediaTeam`, `speechMode`, `hardAnchors`?

| Block | Safe to delete? | Why |
| --- | --- | --- |
| `mediaTeam` | **No** | Drives `GroupPhotoChecklist`, the Photographer view, `resolveOczepiny` winner-photo timing, the Doc `MEDIA TEAM` mapping and both validators. |
| `speechMode` | **No** | `resolveSpeechMode` gates the Speaker view (`OFF`/`LIGHT`/`COMPLEX`); the value flows through `RoleShell`, MC, DJ and Photographer views and into the i18n messages. It stays in the cartridge but its schema ownership moves into the speeches domain (#593). |
| `hardAnchors` | **No** | Feeds the drift radar (`buildHardAnchorRadar`), the reel clock, the Oczepiny indicator, `resolveOczepiny` photo timing and semantic validation. It becomes a derived field in #595; the Doc `HARD ANCHORS` mapping is removed. |

None of the three is removable today. They stay in the cartridge and are
documented here so the question is not reopened without tracing these consumers.

### 17.5 Hard anchors derived from mandatory steps (decision, 2026-11-09)

Hard anchors are no longer authored in the Google Doc. `mandatorySteps` is the
single source of truth:

- `mandatorySteps.milestones[]` holds arbitrary admin-created milestones with
  `id`, `time`, `label`, `kind`, `alertBeforeMin` and `isHardAnchor`.
- `mandatorySteps.kitchenServices[]` gains `isHardAnchor`.
- Photo and camera are separate milestones (`kind: "PHOTO"` / `"CAMERA"`); they
  must never be collapsed into one object.
- Oczepiny is a game step, not a hard anchor, and is never synthesized as a
  milestone.
- `deriveHardAnchors(mandatorySteps)` returns the flagged milestones plus
  flagged kitchen courses (`kitchen_<id>`), and is used by the Google Doc
  importer, demo/fixtures and the live mandatory override path.
- `hardAnchors` remains an optional derived cartridge field so the radar, reel
  clock, photoPlan and Oczepiny consumers keep their current shape.
- Milestones are created on the admin/venue-manager surface, not in the Doc.

The Doc `## HARD ANCHORS` section is removed from the template, manifest,
validator and mapper. Implemented in
[#595](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/595):
`deriveHardAnchors(mandatorySteps)` feeds the radar from admin milestones and
flagged kitchen courses; the demo/fixtures use separate photo and camera
milestones and no Oczepiny anchor. The admin/venue-manager editor shipped in
[#596](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/596)
(separate photo/camera milestones, kind, alert window, hard-anchor toggle and
kitchen-course flags).

### 17.6 Speech text from Google Drive (decision, 2026-11-09)

A speaker's script may live in a Google Doc. The admin page links that Doc to a
speech, previews the exported text and imports it verbatim into the cartridge.
The Speaker role reads the cached `script.text` and never calls Google, so it
still works offline.

- Link field: `speech.script.sourceDoc` with `provider`, `fileId`, `url`, `name`,
  `mimeType`, `version`, `modifiedTime` and `retrievedAt`.
- API: Drive API v3 `files.export` with `mimeType=text/plain` for native Google
  Docs. Google caps exports at 10 MB; the existing connector enforces a stricter
  5 MB limit. Reuse `readSource()` from
  `supabase/functions/_shared/googleDrive.js`.
- Scope: `https://www.googleapis.com/auth/drive.readonly` (already configured).
- Auth: the browser calls the owner-only, AAL2 `admin_drive` function
  (`preview` action); Google credentials stay in Edge Function secrets.
- Change detection: `version` / `modifiedTime` (Google Docs have no
  `md5Checksum`). No polling and no automatic overwrite; the admin confirms a
  re-import.
- Photo/camera-style document sharing still applies: the Doc must be shared with
  the service-account email.
- Personal spans are redacted and encrypted during the same import; see §17.8.

Tracked by
[#598](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/598),
blocked by the `speeches` schema extraction
([#591](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/591)).

### 17.7 Speaker email is admin-managed (decision, 2026-11-09)

Each speech's `speaker` object may carry an optional `email`. It is contact
metadata for the admin surface:

- added and edited on the admin page;
- **never** mapped from the Google Doc and never overwritten by a Doc import or
  re-import;
- not rendered on stage role views;
- optional, so older cartridges without it still validate.

The schema field lives in the speeches domain. Tracked by
[#600](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/600),
blocked by #591.

### 17.8 Encrypted speech redactions (decision, 2026-11-09)

Speech text can contain personal data. The chosen model is **tokenized selective
encryption with a speaker-only unlock**:

- Doc authors mark sensitive spans with `{{secret}}...{{/secret}}`.
- The server import replaces each span with `{{secret:<id>}}` and stores the value
  only as AES-256-GCM ciphertext in `script.redactions[]`.
- Per-speech keys are derived with HKDF-SHA256 from a
  `SPEECH_SECRET_MASTER_KEY` Edge secret. The key never ships in the cartridge.
- A role-authorized Edge function returns the key only to a valid `speaker` role
  JWT for the matching wedding. The browser imports it as a non-exportable
  `CryptoKey` and caches it in IndexedDB, so reveal and offline decryption work
  after one online unlock.
- `SpeakerView` renders tokens as masked chips with Unlock / Reveal / Hide. MC
  and other roles always see masked tokens and never receive keys.
- The published cartridge, logs and speaker cache contain no plaintext secrets
  or key material.

This is not zero-knowledge: the Edge Function and admin owner (AAL2) are trusted.
A passphrase-based zero-knowledge variant can be added later on the same
redaction schema without changing the cartridge shape.

Tracked by
[#602](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/602),
blocked by #591 and #598.
