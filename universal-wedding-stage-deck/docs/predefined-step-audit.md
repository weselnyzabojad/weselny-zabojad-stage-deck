# Predefined step audit

Audit of repeated step concepts across the demo cartridge, schema
example/real fixture, Google Doc template, hard anchors, speeches, games content
and application features.

| Concept | Source locations | Predefined step | Inclusion |
| --- | --- | --- | --- |
| Cocktail / Vin d'honneur | demo `step_01`, schema example, Google Doc TIMELINE | Yes | Mandatory |
| Ceremony | demo `step_02`, `ceremony_start` hard anchor, Google Doc TIMELINE/HARD ANCHORS | Yes | Mandatory |
| Grand Entrance | demo `step_03`, MC cues, `GRAND_ENTRANCE` important song | Yes | Mandatory |
| Wedding Thank-You | demo `step_06`, parents' thank-you subtask/speeches | Yes | Mandatory |
| Wishes | demo `step_07`, guestbook/Instax/wish-bottle references | Yes | Optional (`wishes.enabled`) |
| Wedding cake | demo `step_05`, cake protocol, `cake_midnight` hard anchor, `CAKE` important song | Yes | Mandatory |
| First Dance | demo `step_08`, `FIRST_DANCE` important song/deliverable | Yes | Mandatory for now |
| Oczepiny | demo `step_09`, `oczepiny` object, `ocsepiny` hard anchor, cultural indicator | Yes | Optional (`oczepiny.enabled`) |
| Games | demo `step_10`, games content and test-game teleprompter | Yes | Optional (`games.enabled`) |
| Buffets Open & Dance Floor | former `step_04` | No | Deleted |

## Notes

- Hard anchors remain scheduling constraints even when the matching concept is a
  step. They are not duplicate timeline entries.
- Optional steps are filtered by `filterEnabledSteps` before the live state is
  built, so disabled features never appear in the timeline.
- Step IDs are stable: `step_04` is retired and new steps use `step_06`–`step_10`.
- Remaining ambiguities and precise step definitions are tracked by the step
  rework TODO (#263).
