# Optional Games: Test Wiedzy & Test Zgodności

> **Status: prepared content only (TODO 16).** The `YES` / `NO` / `UNDECIDED`
> capture, question banks, scoring, MC scripts and fallbacks are ready. The
> final `games` schema, validation, MC UI and Google Doc parser mapping are
> **deferred until the schema is approved**. Do **not** add `games` to the
> Google Doc template or the importer yet.

The two games are independent and both optional:

| Game | Kind | Format |
| --- | --- | --- |
| **Test Wiedzy** | Knowledge quiz about the couple | Two guest teams, 12 questions, MC-led |
| **Test Zgodności** | Compatibility test | Bride and groom answer separately, then reveal |

Prepared content lives in [`src/content/games/`](../src/content/games/):

- `testWiedzy.js` — bank, scoring, tie-breaker, MC script, fallbacks.
- `testZgodnosci.js` — bank, answer sheets, scoring bands, MC script, fallbacks.
- `index.js` — capture options (`YES` / `NO` / `UNDECIDED`) and game metadata.

---

## Google Doc `## GAMES` section (D8 template)

Add this stable section to the Google Doc template. One row per game, with an
**explicit** answer; never infer consent from a mention elsewhere.

```text
## GAMES

| Game          | Requested | Requested by | Language(s) | Existing questions? | Notes |
|---------------|-----------|--------------|-------------|---------------------|-------|
| Test Wiedzy   | UNDECIDED |              | PL, FR, EN  | No                  |       |
| Test Zgodności| UNDECIDED |              | PL, FR, EN  | No                  | Link to Oczepini? |
```

Allowed `Requested` values:

- `YES` — the couple wants the game; run the preparation checklist below.
- `NO` — do not prepare or schedule it.
- `UNDECIDED` — follow up before the event; do not assume either way.

Capture rules:

1. Use only `YES`, `NO` or `UNDECIDED`. Anything else is invalid.
2. Record who requested it (couple, witness, family, MC suggestion).
3. Record the preferred language(s); the prepared banks are PL/FR/EN.
4. Copy any existing question ideas verbatim; otherwise mark “to prepare”.
5. Never infer consent from an unrelated mention in the document.
6. Sensitive topics (family, exes, money, health) are **not allowed by
   default**; the couple must approve any exception explicitly.
7. A standalone Test Zgodności must be linked to the `oczepiny` anchor or a
   `steps[]` block — never duplicate the same time in both places.
8. Record a paper/offline fallback for every `YES` game.

Preparation checklist when `YES`:

- **Test Wiedzy:** question bank, correct answers, scoring, tie-breaker, prize,
  MC script, printed answer key.
- **Test Zgodności:** question bank, separate bride/groom answer sheets, reveal
  format, scoring bands, MC script, printed pack.
- Agree the final answers with the couple; keep the tone warm and playful.
- Brief the MC on the game’s time budget and where it sits in the timeline.
- Test the paper fallback before the event.

---

## Test Wiedzy — prepared package

- **Bank:** 12 trilingual questions (`w01`–`w12`) about the example couple.
  Replace the demo answers with the couple’s real facts.
- **Scoring:** 1 point per correct answer, 12 max, two guest teams. A tie-breaker
  (“What time did the ceremony start?”) decides a draw. Prize: a bottle of
  champagne from the couple.
- **Score bands:** 0–4 warm-up, 5–8 good going, 9–12 couple experts.
- **MC script:** intro, ask, correct, wrong, tie-break and closing lines in
  PL/FR/EN; placeholders `{number}`, `{question}`, `{team}`, `{answer}`.
- **Props:** two buzzers/tables, MC answer key, scoreboard, prize bottle.
- **Fallbacks:**
  - No buzzers → hands or A/B cards.
  - Paper mode → printed questions + answer key; teams write answers.
  - Device failure → run entirely from the printed pack.

## Test Zgodności — prepared package

- **Bank:** 10 light questions (`z01`–`z10`), each with A = bride / B = groom.
  No family, exes, money or health topics.
- **Format:** the bride and groom answer the same questions separately; the MC
  reveals both answers and awards a point for every match.
- **Scoring:** 1 point per match, 10 max. Bands: 0–3 still learning, 4–6 solid
  duo, 7–8 great match, 9–10 telepathic, each with a ready MC line.
- **Answer sheets:** separate bride/groom sheets with A/B boxes and instructions
  in PL/FR/EN.
- **MC script:** intro, ask, reveal, match/mismatch, score and closing, with
  placeholders `{number}`, `{question}`, `{brideAnswer}`, `{groomAnswer}`,
  `{points}`, `{max}`, `{label}`, `{line}`.
- **Props:** printed sheets + pens, A/B reveal cards, scoreboard, MC question
  copy.
- **Fallbacks:** paper sheets; no A/B cards (write answers / MC raises hands);
  device failure (run from the printed pack).

### Oczepini relationship

The existing `oczepiny.testZgodnosci` is the midnight sub-event. A standalone
compatibility game must reuse that anchor or one `steps[]` block; do not
schedule the same moment twice. The prepared package sets
`relationship.anchorKind: "OCZEPINI"` and leaves `anchorId` for the cartridge.

---

## Open decisions (before schema approval)

- Is Test Wiedzy always MC-led, or can a guest host it?
- Are the two games fully independent, or does one replace the other?
- Do questions live in the cartridge, a fixture, or an encrypted private block?
- Device screens, printed cards, or both?
- Final `games` shape and validation; Google Doc parser mapping; MC UI.
- Wire the prepared banks into the cartridge/importer only after approval.

## Approval checklist

- [ ] Couple’s `YES` / `NO` / `UNDECIDED` captured in `## GAMES`.
- [ ] Language(s) and sensitive-topic consent confirmed.
- [ ] Final question bank and answers approved by the couple.
- [ ] Scoring, tie-breaker/bands and prize agreed.
- [ ] MC script reviewed and translated.
- [ ] Paper fallback printed and tested.
- [ ] Compatibility game linked to Oczepini or a timeline step.
- [ ] Schema approved, then add `games` to the schema, parser and importer.
