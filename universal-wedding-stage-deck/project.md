# Universal Wedding Stage Deck — Project Status & Roadmap

**Last aligned:** 2026-11-07

**Aligned with:** `master` @ `c648b2c` (QR phone handoff decision)

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

Primary deployment path is `/deck/`; the owner surface is `/deck/admin`.

---

## 2. Current status

### Delivered

| Area | Status |
| --- | --- |
| Stage deck views (MC/DJ/Photo/Speaker) | Complete |
| Responsive phone layouts for every role | Complete (#109–#114) |
| Drift engine, flexible schedule, hard-anchor radar | Complete |
| Cake, speeches, key songs, music policy, contacts, photo plan | Complete |
| Offline-first localStorage + optional Supabase sync/outbox | Complete |
| Production per-role PIN join (`join_room` + role JWT) | Complete |
| Deferred PWA update flow (#81) | Complete |
| PWA icons + favicon (#74) | Complete |
| Per-device i18n EN/FR/PL (#78) | Complete |
| Deprecated-feature cleanup (#75) | Complete |
| Owner admin panel `/deck/admin` (#76) | Complete in code; live Supabase smoke test still required |

### Open roadmap issues

| Issue | Item |
| --- | --- |
| [#77](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/77) | WeddingSchema v1.2 freeze and implementation |
| [#79](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/79) | Multi-wedding library and importer safety |
| [#80](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/80) | Cartridge-driven MC cues (remove hardcoded demo cues) |
| [#82](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/82) | Google Docs-first import (remove the AI-prompt path) |
| [#165](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/165) | Server-published cartridge revisions as the only source of truth |
| [#166](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/166) | Remove all non-admin cartridge import, activation and reset paths |
| [#167](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/167) | Propagate cartridge revisions live to every role and on reconnect |
| [#168](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/168) | Admin-only server-side Google Drive REST API connector |
| [#169](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/169) | Browse, read and preview shared Drive cartridge sources in admin |
| [#170](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/170) | Validate, diff and publish Drive cartridge revisions from admin |
| [#186](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/186) | Top bar: enlarge the clock |
| [#187](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/187) | Top bar: center the couple identity and languages |
| [#188](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/188) | Top bar: remove the role switcher and show a static role element |
| [#189](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/189) | Top bar: move cultural chips and utility controls into a right-hand two-row stack |
| [#190](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/190) | Hard-anchor banner: host PIN and Sync and use white detail text |
| [#191](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/191) | Pocket header: mini cultural chips and trimmed drift label |
| [#198](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/198) | MC top bar: Speeches status chip |
| [#199](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/199) | MC current step: remove DJ / Audio cues |
| [#200](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/200) | MC current step: rename Sub-tasks and order unchecked first |
| [#201](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/201) | MC: Speeches as the only card below the timeline |
| [#202](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/202) | MC: remove summary cards and move Cake into its active step |
| [#203](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/203) | MC: hide the Speeches card when there are no speeches |
| [#210](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/210) | MC Master: switch to the DJ view (production, view-only) |
| [#211](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/211) | Development-only all-role view switcher |
| [#214](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/214) | MC: make the Speeches card full width |
| [#215](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/215) | DJ top bar: remove duplicate role label and add selected MC VIP controls |
| [#216](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/216) | DJ timeline: align step presentation with MC Master |
| [#217](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/217) | DJ: remove unselected sections and fix scrolling |
| [#218](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/218) | DJ VIP: add a guest song-request bar below the top bar |
| [#219](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/219) | DJ view: enforce Standard vs VIP restrictions |
| [#226](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/226) | Photographer: read-only MC-style step timeline |
| [#227](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/227) | Photographer: remove selected sections and keep approved UI |
| [#228](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/228) | Photographer: move photo-plan details into step cards |
| [#229](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/229) | Photographer: sunset lifecycle and shared mini-session override |
| [#230](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/230) | Photographer/MC: group-photo step rework TODO |
| [#231](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/231) | Media roles: Photographer 1, Photographer 2 and Cameraman |
| [#232](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/232) | Photographer: DJ VIP parity and feature gates |
| [#233](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/233) | Media team: future rework TODO |
| [#234](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/234) | DJ: remove Reel Clock from Standard and VIP |
| [#242](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/242) | Photographer/Cameraman: full-page step layout |
| [#243](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/243) | Speaker: remove the timeline UI element |
| [#244](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/244) | Speaker: reduce Now speaking card |
| [#245](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/245) | Speaker: dedicated speech cartridge TODO |
| [#246](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/246) | DJ: remove ZAIKS/licensing from Music Policy |
| [#247](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/247) | Media/Speaker: remove duplicate top-left role label |
| [#253](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/253) | Top bar: shared layout, clock size and spacing |
| [#254](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/254) | Top bar center: ring logo, language and date rows |
| [#255](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/255) | Top bar center: localized weekday |
| [#256](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/256) | DJ Standard: laptop-only view |
| [#257](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/257) | Top bar: enlarge the center ring logo |
| [#258](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/258) | Dev switcher: DJ Standard preview |
| [#259](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/259) | DJ current step: remove generic track chips, add main songs |
| [#260](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/260) | Schema: add isMainSongRequired step flag |
| [#261](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/261) | Predefined steps: rename catalogue, delete Buffets |
| [#262](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/262) | Predefined steps: add Thank-You, Wishes, Oczepiny, Games, First Dance |
| [#263](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/263) | TODO: rework and define each predefined step |
| [#264](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/264) | Predefined steps: repeated-concept audit |
| [#273](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/273) | Mandatory steps: first arrival, prep-ready and kitchen service hours |
| [#274](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/274) | Venue Manager role and editable mandatory panel |
| [#275](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/275) | Venue Manager overrides and persistent update popup |
| [#276](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/276) | Cake service mode on MC/Venue Manager |
| [#277](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/277) | Children expected boolean and global badge |
| [#283](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/283) | First guests arrival as customer-confirmed first step |
| [#284](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/284) | Time-derived timeline position in all views |
| [#285](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/285) | Wedding closure step, extension and last song |
| [#286](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/286) | MC: children reminder in Hard Anchor Collision banner |
| [#287](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/287) | Oczepiny Early/Midnight schema and Google Doc parsing |
| [#288](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/288) | Oczepiny variant-aware MC, Photographer and DJ VIP cues |
| [#295](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/295) | Current Step card: subtle stable 3D tilt and elevation |
| [#297](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/297) | MC: center the children expected reminder in the banner |
| [#298](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/298) | DJ Standard: disable the Music Policy UI |
| [#299](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/299) | Top bar: distinguish couple languages from UI language switch |
| [#300](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/300) | Music Policy: list every main song from flagged steps |
| [#301](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/301) | Predefined timeline data contract; remove first arrival/closure |
| [#302](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/302) | Mandatory constraints, visibility and kitchen service mode |
| [#303](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/303) | Ceremony variants and MC visibility |
| [#304](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/304) | Grand Entrance guest order |
| [#305](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/305) | First Dance variants and DJ VIP timing |
| [#306](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/306) | Games question-list Docs |
| [#307](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/307) | Photographer children text: only "Children expected" |
| [#308](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/308) | Step types: remove BUFFER, use FLEXIBLE/HARD_ANCHOR |
| [#309](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/309) | Auto-calculate step durations from next-step times |
| [#310](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/310) | Step cards: remove the "Step N" label |
| [#311](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/311) | Photographer/Cameraman: restore sunset UI |
| [#327](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/327) | Mandatory update popup: enforce role visibility and service modes |
| [#328](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/328) | Post-#308 cleanup: remove dead BUFFER/ELASTIC code and fixtures |
| [#329](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/329) | Localize mandatory, ceremony, games and entrance cues |
| [#330](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/330) | Refresh README and active technical docs |
| [#331](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/331) | Mobile: shared compact top bar for every role view |
| [#332](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/332) | Mobile: dev switcher and secondary configuration density |
| [#333](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/333) | Mobile: consistent cultural and speech pill grid |
| [#334](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/334) | Mobile: harden drawers, modals and floating panels |
| [#335](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/335) | Mobile: 3D current-step card across all role views |
| [#336](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/336) | Mobile 3D parity: dev previews and regression coverage |
| [#337](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/337) | Admin panel: restrict access to laptops/desktops only |
| [#349](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/349) | Speaker view: localize UI text, keep speech text verbatim |
| [#350](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/350) | Google Doc to cartridge: complete section mapping |
| [#351](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/351) | Admin Drive: publish mapped Google Doc cartridges |
| [#352](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/352) | QR phone handoff: always require the role PIN |
| [#353](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/353) | Localize the QR and PIN handoff flow |

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
7. **Top-bar relocation TODO.** The MC top bar no longer exposes VIP Radar or
   vendor Contacts. Keep their functionality intact and ask the owner in a
   future pass where these controls should be surfaced. Cartridge import is
   admin-only through `/deck/admin` and is not part of this relocation.

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
   the cumulative late time across the event.
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
- VIP Radar, the empty placeholder button and Contacts are removed from the MC
  top bar only. Their components and functionality stay intact. **TODO:** ask
  the owner where VIP Radar and Contacts should be relocated in a future pass.

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
model for a future rework. Add project TODOs for the Media team and the
group-photo step.
([#227](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/227),
[#233](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/233))

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
value and timestamp so it can be traced later.
([#229](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/229))

**Group photo TODO.** The group-photo step is critical for the MC and
Photographer and needs a dedicated design pass before implementation: sequencing,
MC controls, Photographer view, group order, location, timing, minimum group
size and multi-media assignments. This is tracked as a planning TODO.
([#230](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/230))

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
| Media team card | Removed for now; TODO | Data model retained |
| Photo plan card | Removed; details move into step cards | Cartridge data unchanged |
| Sunset & Golden Hour | Kept with expiry + shared override | n/a |
| Footer | Kept | n/a |
| Media roles | Photo 1, Photo 2, Cameraman | MC/DJ back-office role management updated |

Implementation issues:
- [#226](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/226) — read-only MC-style step timeline;
- [#227](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/227) — remove selected sections;
- [#228](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/228) — photo plan into step cards;
- [#229](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/229) — sunset lifecycle and mini-session override;
- [#230](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/230) — group-photo TODO;
- [#231](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/231) — separate media roles;
- [#232](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/232) — VIP parity;
- [#233](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/233) — Media team TODO;
- [#234](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/234) — remove DJ Reel Clock.

### Media/Speaker/DJ refinements (decision, 2026-11-07)

**Full-width media layout.** The Photographer 1, Photographer 2 and Cameraman
step layout may use the entire page width; remove the centered `max-w-5xl` /
`max-w-3xl` caps while keeping responsive padding and avoiding horizontal
overflow.
([#242](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/242))

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

**Speech cartridge TODO.** The speech-display UI content will in future be
retrieved from a dedicated cartridge produced from a Google Doc through a JSON
parser. Record the schema, validation, revision/publication and offline-cache
work as a follow-up; do not hardcode speech text or scrape the Doc at runtime.
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
- [#245](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/245) — dedicated speech cartridge TODO;
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
- **Games** — optional by cartridge flag.
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
| Games | Yes, optional | Game content/teleprompter today. |
| First Dance | Yes, mandatory for now | Important song/deliverable today, not a step. |
| Buffets Open & Dance Floor | No | Delete step_04. |

Each concept should have exactly one timeline representation; remove duplicate
anchor/subtask-only representations where the step now owns the moment. Any
remaining ambiguity goes to the step-rework TODO.
([#264](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/264))

**Rework TODO.** Every predefined step needs a precise definition before
implementation: purpose/trigger, duration/type, location, MC/speaker cues,
subtasks, main song/playlist/cutoff, photo/video cues, hard-anchor links,
dependencies and optional/mandatory rules.
([#263](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/263))

Implementation issues:
- [#261](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/261) — renames and Buffets deletion;
- [#262](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/262) — new predefined steps;
- [#263](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/263) — precise step-rework TODO;
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
align the communication with the MC pattern. MC keeps its hard-anchor-banner
placement; no bottom-right MC badge returns.
([#307](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/307))

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
and derived.
([#302](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/302))

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
- speeches, cake, games/question lists, contacts, kitchen, VIP alerts,
  pre-wedding todos, privacy and extensions;
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

### Top bar couple-language indicator (decision, 2026-11-07)

The couple/shared-language indicator in the top-bar center looks too similar to
the EN/FR/PL UI language toggle. Redesign it so users understand these are the
languages used to discuss with the customer/newlyweds:

- use a conversational icon/logo (for example 🗣️/💬) and an explicit localized
  label such as "Couple languages";
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

**Overlays and floating controls.** Drawers, modals, QR/contacts/VIP panels,
mandatory-update popups, banners, bottom actions and the dev switcher use
\`100dvh\`-safe sizing, internal scrolling, safe-area padding and 44px touch
targets. Floating panels must not overlap each other or the bottom navigation on
narrow screens.
([#334](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/334))

### Admin laptop-only access (decision, 2026-11-07)

The owner admin panel (\`/deck/admin\`) is a laptop/desktop-only surface. It must
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

Not planned: Next Key Moment Cue, Advanced Mix Cues, Music Policy Guard,
Must-play Coverage Tracker and Venue & Soundcheck Checklist.

### Server-only cartridges and Google Drive (decision, 2026-11-06)

**Decision:** a cartridge is an immutable, server-published snapshot for every
stage role. Only the owner at `/deck/admin` may create, import, select, replace
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

## 3. Architecture

- **Client:** React 19 + Vite 8 + Tailwind 4, single-page PWA.
- **Offline store:** `localStorage` (`wzsd:v1:*`) for live state, role, theme,
  locale, pending update state and the sync outbox.
- **Cloud (optional):** Supabase Postgres + Realtime + Edge Functions.
- **Auth:**
  - local/demo mode: 4-digit DDMM display PIN and local pairing;
  - production mode: 6-digit per-role PIN validated by `join_room`, returning a
    role-scoped JWT with `wedding_id`, `room_id`, `app_role` and session `jti`;
  - `/deck/admin`: Supabase Auth email/password + TOTP MFA, allowlisted through
    `app_admins`.
- **Routing:** no router library. `main.jsx` selects `/deck/admin` vs the stage
  deck from `window.location.pathname`.
- **Data flow:** cartridge → normalized live state → local persistence →
  optional outbox/Realtime sync. Sensitive notes stay encrypted; only ciphertext
  is synced.

### Main directories

```text
src/
  admin/            owner admin panel, Auth/MFA client, pure admin helpers
  components/       stage UI cards, modals, status and overlay components
  content/games/    prepared optional-game content (not wired into schema yet)
  demo/             demo wedding cartridge
  hooks/            live state, role, theme, pairing, sensitive notes
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
| `mc` | MC Master | Full deck, drift controls, scripts, VIP radar, stage pings |
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
(`/deck/admin`) is laptop/desktop-only and must show a blocked-screen fallback on
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
- content: `cake`, `speeches`, `musicPolicy`, `tact_and_vip_alerts`,
  `preWeddingTodos`, `contacts`, `mediaTeam`, `photoPlan`, `oczepiny`;
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
  buffer accordion, pre-wedding checklist, speeches, radar, stage pings;
  the **Stage Rail** (current-step hero with done/upcoming accordions) is
  planned in #118–#121;
- DJ Booth: read-only timeline, key songs and cutoffs;
- Photographer: shot lists, sunset/golden-hour, Oczepiny cues, media team,
  venue access;
- Speaker: assigned-speech teleprompter with cached fallback.

### Content publishing

- admin-only JSON publishing through `/deck/admin` with Ajv + semantic
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

### Owner admin (`/deck/admin`)

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
- sensitive notes encrypted client-side, MC-only ciphertext sync;
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

---

## 8. Deployment and operations

### Client

```bash
npm ci
npm run dev
npm run build
```

Required public variables:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_DECK_MODE=production   # optional; local mode is the default
```

Never ship the service-role key.

### Supabase

1. Apply [`supabase/schema.sql`](supabase/schema.sql).
2. Apply [`supabase/migrations/202611060001_owner_admin.sql`](supabase/migrations/202611060001_owner_admin.sql).
3. Apply [`supabase/migrations/202611060003_cartridge_revisions.sql`](supabase/migrations/202611060003_cartridge_revisions.sql)
   and [`supabase/migrations/202611060004_drive_publication.sql`](supabase/migrations/202611060004_drive_publication.sql).
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

5. Set secrets: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`,
   `PUBLIC_DECK_URL`, optional `ALLOWED_ORIGIN`.
6. Add the owner account to `app_admins` and disable Auth self-signup.
7. Build with `VITE_DECK_MODE=production`.

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
  First run should cover sign-in → TOTP enrollment → publish → QR join → revoke.
- Admin destructive confirmations and TOTP re-auth currently use native
  `window.prompt` / `window.confirm` dialogs; a proper modal flow is a UI
  improvement candidate.
- i18n covers UI chrome, roles, drift/status labels, errors, PWA, join and
  admin-adjacent components. Cartridge content remains in its authored
  language; some role-view domain strings are still English.
- Optional games content exists but is not in the schema or UI (deferred).
- Google Docs-first import (#82) has deterministic API-to-template parsing and
  AI-prompt cleanup; Drive transport/admin placement is tracked in #168–#170.
  Admin JSON publishing remains, but role devices no longer import cartridges.
- The Pocket role removal and per-role phone layouts shipped in #109–#114.
- The MC Stage Rail (current-step hero with done/upcoming accordions) is planned
  in #118–#121; see `docs/mc-stage-rail-plan.md`.
- v1.2 schema freeze (#77), multi-wedding library (#79) and MC cue cleanup
  (#80) remain open.
- `/deck/` static hosting still needs an Apache/SPA rewrite for deep links such
  as `/deck/8f3k2q/mc` and `/deck/admin` (TODO 19).
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
