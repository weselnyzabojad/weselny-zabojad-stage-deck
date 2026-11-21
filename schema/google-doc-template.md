# Wedding harmonogram - Google Doc template (v1.1)

> **Status: current.** This is the v1.1 customer template shipped with the first
> release. `schema/wedding-schema-v1.1.json` is the canonical contract.
>
> **How to use:** copy this file into a Google Doc, keep every `## SECTION`
> marker exactly as written, and replace the example values. Do not rename,
> reorder or duplicate markers, and do not add a second section with the same
> marker. Delete repeating example rows you do not need.
>
> The importer reads stable `## SECTION` markers and fixed table headers. Every
> fixed field uses `Field | Your value | Example`; the `Example` column is
> reference-only and is never imported. `###` headings are sub-headings inside a
> section and may be renamed freely.
>
> Full conventions and the field map live in
> `docs/google-doc-template-conventions.md`.

## EVENT

**How to fill:** replace each example with your event details.

| Field | Your value | Example |
| --- | --- | --- |
| Date | 20.08.2026 | DD.MM.YYYY |
| Children expected | yes | yes or no |
| Ceremony type | RELIGIOUS | CIVIL or RELIGIOUS |
| Ceremony MC support | yes | yes or no |
| Ceremony location | St. Mary Church | Venue or church name |
| Ceremony notes | Full mass; MC introduces the couple at the church door. | Short note |

## COUPLE IDENTITY

**How to fill:** replace the example names, nationalities and shared languages.

| Field | Your value | Example |
| --- | --- | --- |
| Bride first name | Jennifer | First name |
| Bride nationality | FR | ISO 3166-1 code, e.g. FR |
| Groom first name | Guillaume | First name |
| Groom nationality | FR | ISO 3166-1 code, e.g. FR |
| Shared languages | FR, PL, EN | ISO 639-1 codes, comma separated |

## LANGUAGES

**How to fill:** replace the example languages; keep `Supported` ordered.

| Field | Your value | Example |
| --- | --- | --- |
| Default content | PL | One supported code |
| Supported | PL, FR, EN | Ordered ISO 639-1 codes |
| Notes | Couple speaks FR/PL; most guests understand EN. | Short note |

## DEMOGRAPHICS

**How to fill:** replace the example counts; leave an unknown count blank.

| Field | Your value | Example |
| --- | --- | --- |
| Guests total | 96 | Non-negative whole number |
| Guests PL | 64 | Non-negative whole number |
| Guests FR | 24 | Non-negative whole number |
| Guests other | 8 | Non-negative whole number |
| Notes | 12 children; two guests need vegetarian meals. | Short note |

## CULTURAL RULES

**How to fill:** replace the example rows and keep the `Rule` names unchanged; Sto Lat accepts only `YES`, `ON_REQUEST` or `NO`.

| Rule | Status | Note |
| --- | --- | --- |
| stoLat | ON_REQUEST | Explain the symbolism in FR when guests ask. |
| gorzko | IF_GUESTS_START | Only during cake. |
| breadSalt | YES | Vodka vs water shot; break glasses. |

A wedding counts for the Sto Lat KPI when the normalized status is `YES` or
`ON_REQUEST`.

## OCZEPINY

**How to fill:** replace each example with your Oczepiny choices.

| Field | Your value | Example |
| --- | --- | --- |
| Oczepiny variant | MIDNIGHT | MIDNIGHT, AFTER_CAKE or CUSTOM |
| Throwings | veil=yes, bouquet=yes, bow tie=yes, cravat=no | Four comma-separated yes/no flags |
| Game enabled | yes | yes or no |
| Countdown mode | MC | MC or DJ |
| Winners only photo | yes | yes or no |
| Winners + couple photo | yes | yes or no |
| Enabled | true | true or false |
| Order | MIDNIGHT | MIDNIGHT, AFTER_CAKE or CUSTOM |
| Toss | VEIL | VEIL, BOUQUET or BOW_TIE |
| Ties | BOW_TIE | BOW_TIE or CRAVAT |
| Winner photo enabled | true | true or false |
| Music enabled | true | true or false |
| Music track | Oczepiny mix | Track name |
| Music playlist | Midnight, Party | Comma-separated playlist names |

## TIMELINE

**How to fill:** replace the example hours and delete rows you do not need; use the canonical Step names exactly as written.

| Hour | Step name | Example values |
| --- | --- | --- |
| 16:00 | Vin d'honneur / Cocktail | Location, arrival note |
| 17:00 | Ceremony | Ceremony type, location, MC support |
| 18:00 | Grand Entrance | Guest order, entrance music |
| 18:30 | Bread & Salt | Location, custom note |
| 19:00 | Dinner | Location, menu note |
| 20:00 | Wishes | Location, speaker note |
| 20:30 | Wedding Cake | Cake time, serve mode, music cue |
| 21:00 | Wedding Thank-You | Location, thank-you note |
| 21:15 | First Dance | Mode, start/stop, song |
| 21:45 | Dance with Bride and Groom | Song, floor note |
| 22:00 | Musical Set | Playlist, start, end |
| 23:00 | Supper I | Service mode, dietary notes |
| 23:30 | Supper II | Service mode, dietary notes |
| 23:50 | Supper III | Service mode, dietary notes |
| 00:00 | Oczepiny | Toss, ties, winner photo, music |
| 01:00 | Test Wiedzy | Languages, request, photographer |
| 01:30 | Speed Foto | Guest order, photo note |
| 01:45 | Test Zgodności | Languages, request, photographer |
| 01:50 | Last Dance | Song, closing note |

The timeline is a fixed catalog. Change only the Hour, move rows to suit the
evening, or delete a row to exclude that step. Row order is presentation-only;
the parsed order is by Hour. Deleting a row creates no step, cue, subtask, game
or anchor. Every remaining row needs a valid `HH:MM` Hour; a blank or invalid
Hour is an import error. The `Example values` column is reference-only guidance
and is never parsed; use `DJ CUES`, `NOTES`, `SUBTASKS` and `MC CUES` for
details. First guests arrival and Wedding closure stay in
`## MANDATORY STEPS`.

## DJ CUES

**How to fill:** replace the example rows and use the canonical `Step name`; one row per cue.

| Step name | Playlist | Track | Cutoff | Note |
| --- | --- | --- | --- | --- |
| Ceremony | Ceremony Procession | Canon in D - Pachelbel | 18:20 |  |
| Grand Entrance | Dinner Jazz | Fly Me to the Moon - Frank Sinatra | 20:15 |  |

## NOTES

**How to fill:** replace the example rows and use the canonical `Step name`; keep one note per step.

| Step name | Notes |
| --- | --- |
| Vin d'honneur / Cocktail | Guests gather in the garden for the aperitif. |
| Grand Entrance | Keep the newlyweds by the door until the MC announces them. Guest order: newlyweds first. |
| First Dance | Mode NORMAL; start at 12s; stop after 4m 30s. |

## SUBTASKS

**How to fill:** replace the example rows and use the canonical `Step name`; keep stable `Subtask ID` values.

| Step name | Subtask ID | Label | Done |
| --- | --- | --- | --- |
| Grand Entrance | step_03_speech_mic | Confirm the speech mic is on | false |
| Grand Entrance | step_03_rosol | Rosół + Tartare with Vodka shot | false |

## VENUE LOGISTICS

**How to fill:** replace each example with your venue contact and logistics details.

| Field | Your value | Example |
| --- | --- | --- |
| Venue | Dwór X, ul. Przykładowa 1, 59-400 Jawor | Full venue name and address |
| Address | Dwór X, ul. Przykładowa 1, 59-400 Jawor | Street, postal code and city |
| Manager name | Anna Kowalska | Venue manager |
| Manager phone | +48 600 000 000 | International phone number |
| Manager email | anna@venue.example | Email address |
| Noise curfew | 01:00 | HH:MM |

## VIEW VISIBILITY

**How to fill:** replace the example rows only when you need to override a default; omit the whole section to keep defaults.

| Role | Section | Visible |
| --- | --- | --- |
| photo | music | false |
| mc | venueAccommodation | true |

## MEDIA TEAM

**How to fill:** replace the example rows with one row per crew member; delete rows for crew you do not have.

| Team ID | Role | Name | Phone | Start | End | Deliverables | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| photo_main | PHOTO | Marek | +48 600 222 222 | 14:00 | 23:30 | Ceremony; Group photos; First dance; Oczepiny | Leaves after the winner photo. |
| video_main | VIDEO | Ola | +48 600 333 333 | 14:30 | 00:30 | Highlight film | Needs a clean feed from the DJ booth. |

## MUSICIANS

**How to fill:** replace the example with `true` or `false`; musician details are managed in `/admin`.

| Field | Your value | Example |
| --- | --- | --- |
| Musician expected | false | true or false |

## PHOTO PLAN

**How to fill:** replace each example with your photo-plan choices, then replace the example group rows.

| Field | Your value | Example |
| --- | --- | --- |
| Mini session enabled | true | true or false |
| Mini session location | Garden | Location |
| Mini session backup location | Ballroom window | Location |
| Group photos location | OUTDOOR | INDOOR or OUTDOOR |
| Group photos description | Formal photos with immediate family and witnesses only. | Short note |

### Group Photos

**How to fill:** replace the example rows and keep `Group ID` and `Label` in every row.

| Group ID | Label |
| --- | --- |
| bride_family | Bride's family |
| groom_family | Groom's family |
| friends | Friends |

## IMPORTANT SONGS

**How to fill:** replace the example rows; one row per important moment and keep `Moment ID` stable.

| Moment ID | Moment | Title | Artist | Version | Source type | File / Link | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| grand_entrance | GRAND_ENTRANCE | Marry You | Bruno Mars | Album version | CUSTOMER_FILE | assets/audio/marry-you-bruno-mars.mp3 |  |
| first_dance | FIRST_DANCE | Perfect | Ed Sheeran | Album version | STREAMING |  | Duet version if available. |
| cake_cutting | CAKE_CUTTING | Cake | The Coup | Album version | STREAMING |  |  |

## MUSIC POLICY

**How to fill:** replace the example policy, then replace the example must-play and do-not-play rows.

| Field | Your value | Example |
| --- | --- | --- |
| Disco Polo policy | No | Yes or No |

### Must Play

**How to fill:** replace the example rows; keep `Song ID` stable.

| Song ID | Track | Note |
| --- | --- | --- |
| first_dance | Perfect — Ed Sheeran | First dance. |
| last_song | Wonderful Tonight — Eric Clapton | Last song of the night. |

### Do Not Play

**How to fill:** replace the example rows; one track per row.

| Track |
| --- |
| Macarena - Los del Río |

## GUEST REQUESTS

**How to fill:** replace the example with your request rules.

| Field | Your value | Example |
| --- | --- | --- |
| Rules | One request per guest; the DJ decides the order. | Short rule |

## SPEECHES

**How to fill:** replace the example speech mode and rows; keep scripts in the fenced blocks below.

| Field | Your value | Example |
| --- | --- | --- |
| Speech mode | COMPLEX | OFF, LIGHT or COMPLEX |

`Speech mode` is the wedding-level authorization for speech Doc creation and
accepts exactly `OFF`, `LIGHT` or `COMPLEX`. Only `COMPLEX` authorizes creating
speech Docs and folders. A missing or invalid value warns and leaves the mode
unset; there is no silent `OFF` default. The rows below are documentation only;
speech records and scripts live in the encrypted speech bundle.

**How to fill:** replace the example rows; one row per speech.

| Speech ID | Order | Speaker | Relationship |
| --- | --- | --- | --- |
| speech_witness | 1 | Bartek | Best man |

### Speech Script speech_witness

**How to fill:** replace the example script with the verbatim speech, using one fenced block per language.

```text
Drodzy Państwo, chciałbym powiedzieć kilka słów o Jennifer i Guillaume.
```

## CAKE

**How to fill:** replace each example with your cake plan.

| Field | Your value | Example |
| --- | --- | --- |
| Time | 20:30 | HH:MM |
| Cutting song | Cake — The Coup | Track — Artist |
| Sparklers | true | true or false |

## GAMES

**How to fill:** replace the example rows; answer `YES`, `NO` or `UNDECIDED` in `Requested`.

| Game | Requested | Requested by | Languages | Existing questions | Requires photographer | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Test Wiedzy | UNDECIDED |  | PL, FR, EN | Yes | no | Question list Doc: gdoc_test_wiedzy |
| Test Zgodności | UNDECIDED |  | PL, FR, EN | No | no | Question list Doc: gdoc_test_zgodnosci; link to Oczepiny? |
| Speed Foto | YES |  |  | No | yes | Guests run in, pose, clear. |

Only `YES` authorizes creating that game's question Doc and folder. `NO` and
`UNDECIDED` never do. Each row maps its `Requested` value to its own predefined
timeline step, so `YES` for Test Wiedzy never authorizes Test Zgodności (and
vice versa). Missing or invalid values warn and leave the step's `requested`
unset; consent is never inferred from another mention. `enabled` keeps its
display/runtime meaning (`YES` and `UNDECIDED` enabled, `NO` disabled) and is
not creation authorization.

## KITCHEN

**How to fill:** replace the example courses, counts, vendor meals and anchors; delete rows you do not need.

### Courses

**How to fill:** replace the example rows; one row per kitchen course and keep `Course ID` stable.

| Course ID | Name | Time | Service Mode | Dietary notes |
| --- | --- | --- | --- | --- |
| step_04 | Dinner | 19:00 | TABLE_SERVICE | 1 vegan |
| step_15 | Supper I | 23:00 | TABLE_SERVICE | 2 vegetarian, 1 gluten-free |
| step_16 | Supper II | 23:30 | BUFFET |  |

### Dietary Counts

**How to fill:** replace the example counts with whole numbers.

| Field | Your value | Example |
| --- | --- | --- |
| Vegetarian | 2 | Non-negative whole number |
| Vegan | 1 | Non-negative whole number |
| Gluten free | 1 | Non-negative whole number |

### Vendor Meals

**How to fill:** replace the example rows; one row per vendor meal.

| Vendor | Count | Time | Notes |
| --- | --- | --- | --- |
| Photo | 2 | 17:30 | Vegetarian |

### Service Anchors

**How to fill:** replace the example rows; one row per service anchor.

| Anchor ID | Time | Label |
| --- | --- | --- |
| cake_service | 21:30 | Cake service |

## MANDATORY STEPS

**How to fill:** replace each example time and flag; do not delete these fields.

| Field | Your value | Example |
| --- | --- | --- |
| First guests arrival | 15:30 | HH:MM |
| Wedding closure | 02:00 | HH:MM |
| Closure extension allowed | true | true or false |
| Closure extension until | 03:00 | HH:MM |
| Cake service mode | KITCHEN_RETURN | KITCHEN_RETURN or CUT_IN_PLACE |
| Last song | Perfect — Ed Sheeran | Track — Artist |

## ATTRACTIONS

**How to fill:** replace the example rows; every row you keep is active, so delete attractions you do not want.

| Attraction ID | Type | Name | Start | End | Location | Provider | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| photobooth | PHOTO_BOOTH | Fotobudka | 20:00 | 23:30 | Garden | Foto Fun | Unlimited prints |
| guestbook | GUEST_BOOK | Guest book | 18:00 | 23:30 | Hall foyer |  | Signing pens on the table |
| polaroids | POLAROIDS | Polaroids / Instax | 19:00 | 23:00 | Garden |  | One photo per guest |

## CEREMONY SCRIPT

**How to fill:** replace the example `Step ID`, then replace each fenced block with the verbatim script line for that language.

| Field | Your value | Example |
| --- | --- | --- |
| Step ID | step_02 | Canonical ceremony step ID |

Optional verbatim ceremony script, attached to the Ceremony step by `Step ID`.
Each `###` heading is one ceremony part; its fenced blocks are the per-language
lines (the fence language is `pl`, `fr` or `en`). Copy the script **verbatim** -
never summarize or translate it.

### Welcome and Introduction

```pl
Drodzy goście, witamy was bardzo serdecznie w tym wyjątkowym dniu.
```
```fr
Chère famille, chers amis, soyez les bienvenus en ce jour si spécial.
```
```en
Welcome, family and friends - we are gathered here to celebrate this couple.
```

### The Pronouncement

```pl
Ogłaszam, że jesteście małżeństwem!
```
```fr
Je vous déclare officiellement mari et femme !
```
```en
I now pronounce you married!
```

## CEREMONY SUBSTEPS

**How to fill:** replace the example rows; one row per ceremony moment and keep `Sub-step ID` stable.

| Step ID | Sub-step ID | Time | Title | Notes | Music cue | Responsible role |
| --- | --- | --- | --- | --- | --- | --- |
| step_02 | ceremony_entrance | 17:00 | Bridal entrance | Doors open; guests stand. | Canon in D | Musician |
| step_02 | ceremony_vows | 17:15 | Vows | Microphones for the couple. |  | MC |
| step_02 | ceremony_rings | 17:25 | Ring exchange | Photographer moves to the altar. |  | Musician |

## WITNESSES

**How to fill:** replace the example rows; one row per witness and keep contact details current.

| Witness ID | Name | Language | Phone | Email |
| --- | --- | --- | --- | --- |
| witness_bartek | Bartek | PL | +48 600 222 333 | bartek@example.com |
| witness_valentin | Valentin | FR |  |  |
