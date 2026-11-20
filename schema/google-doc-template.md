# Wedding harmonogram — Google Doc template (v1.1)

> **Status: current.** This is the v1.1 customer template shipped with the first
> release. `schema/wedding-schema-v1.1.json` is the canonical contract.
>
> **How to use:** copy this file into a Google Doc, keep every `## SECTION`
> marker exactly as written, replace the example values, and delete rows you do
> not need. Do not rename, reorder or duplicate markers. Never add a second
> section with the same marker.
>
> The importer reads only stable `## SECTION` markers and fixed table headers.
> `###` headings are sub-headings inside a section and may be renamed freely.
> Full conventions and the field map live in
> `docs/google-doc-template-conventions.md`.

## EVENT

Date: 20.08.2026
Children expected: yes
Ceremony type: RELIGIOUS
Ceremony MC support: yes
Ceremony location: St. Mary Church
Ceremony notes: Full mass; MC introduces the couple at the church door.

## COUPLE IDENTITY

Bride first name, Bride nationality, Groom first name, Groom nationality and
Shared languages are required.

Bride first name: Jennifer
Bride nationality: FR
Groom first name: Guillaume
Groom nationality: FR
Shared languages: FR, PL, EN

## LANGUAGES

`Supported` is the required ordered list of ISO 639-1 codes; its order is the
content-column and MC display order. Any two-letter code is accepted and stored
uppercase. Missing or empty `Supported` blocks publication.

Default content: PL
Supported: PL, FR, EN
Notes: Couple speaks FR/PL; most guests understand EN.

## DEMOGRAPHICS

Optional guest counts. Enter non-negative whole numbers only; leave a line
blank when the count is unknown. Missing counts stay empty and are never
replaced with zero. `Notes` is a short free-text line, not a contact list.

Guests total: 96
Guests PL: 64
Guests FR: 24
Guests other: 8
Notes: 12 children; two guests need vegetarian meals.

## CULTURAL RULES

Sto Lat, Gorzko and Bread & Salt statuses are required. Sto Lat accepts
`YES`, `ON_REQUEST` or `NO`; a wedding counts for the Sto Lat KPI when the
normalized status is `YES` or `ON_REQUEST`. The Bread & Salt note is optional.

| Rule | Status | Note |
| --- | --- | --- |
| stoLat | ON_REQUEST | Explain the symbolism in FR when guests ask. |
| gorzko | IF_GUESTS_START | Only during cake. |
| breadSalt | YES | Vodka vs water shot; break glasses. |

## OCZEPINY

Oczepiny variant: MIDNIGHT
Throwings: veil=yes, bouquet=yes, bow tie=yes, cravat=no
Game enabled: yes
Countdown mode: MC
Winners only photo: yes
Winners + couple photo: yes

Enabled: true
Order: MIDNIGHT
Toss: VEIL
Ties: BOW_TIE
Winner photo enabled: true
Music enabled: true
Music track: Oczepiny mix
Music playlist: Midnight, Party

## TIMELINE

The timeline is a fixed catalog. Keep the canonical Step names exactly as
written; the importer never reads a title or row position to invent a step.
Change only the Hour, move rows to suit the evening, or delete a row to exclude
that step. Row order is presentation-only; the parsed order is by Hour. Deleting
a row creates no step, cue, subtask, game or anchor. Every remaining row needs a
valid `HH:MM` Hour; a blank or invalid Hour is an import error.

The Example values column is reference-only guidance. It is never parsed and
never sets a field. Use `DJ CUES`, `NOTES`, `SUBTASKS` and `MC CUES` for details.
First guests arrival and Wedding closure stay in `## MANDATORY STEPS`.

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

## DJ CUES

| Step name | Playlist | Track | Cutoff | Note |
| --- | --- | --- | --- | --- |
| Ceremony | Ceremony Procession | Canon in D - Pachelbel | 18:20 |  |
| Grand Entrance | Dinner Jazz | Fly Me to the Moon - Frank Sinatra | 20:15 |  |

## NOTES

| Step name | Notes |
| --- | --- |
| Vin d'honneur / Cocktail | Guests gather in the garden for the aperitif. |
| Grand Entrance | Keep the newlyweds by the door until the MC announces them. Guest order: newlyweds first. |
| First Dance | Mode NORMAL; start at 12s; stop after 4m 30s. |

## SUBTASKS

| Step name | Subtask ID | Label | Done |
| --- | --- | --- | --- |
| Grand Entrance | step_03_speech_mic | Confirm the speech mic is on | false |
| Grand Entrance | step_03_rosol | Rosół + Tartare with Vodka shot | false |

## VENUE LOGISTICS

Venue: Dwór X, ul. Przykładowa 1, 59-400 Jawor
Address: Dwór X, ul. Przykładowa 1, 59-400 Jawor
Manager name: Anna Kowalska
Manager phone: +48 600 000 000
Manager email: anna@venue.example
Noise curfew: 01:00

## VIEW VISIBILITY

List a row only to override the D1 default matrix. Omit this table to keep the
defaults. Every role defaults to its `viewVisibility` preset.

| Role | Section | Visible |
| --- | --- | --- |
| photo | music | false |
| mc | venueAccommodation | true |

## MEDIA TEAM

| Team ID | Role | Name | Phone | Start | End | Deliverables | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| photo_main | PHOTO | Marek | +48 600 222 222 | 14:00 | 23:30 | Ceremony; Group photos; First dance; Oczepiny | Leaves after the winner photo. |
| video_main | VIDEO | Ola | +48 600 333 333 | 14:30 | 00:30 | Highlight film | Needs a clean feed from the DJ booth. |

## MUSICIANS

Musician expected: false

Set this to `true` or `false` only. Names, instruments, availability and ceremony
requirements are managed in `/admin`, never in this Doc.

## PHOTO PLAN

Mini session enabled: true
Mini session location: Garden
Mini session backup location: Ballroom window
Group photos location: OUTDOOR
Group photos description: Formal photos with immediate family and witnesses only.

### Group Photos

Group ID and Label are required in every row.

| Group ID | Label |
| --- | --- |
| bride_family | Bride's family |
| groom_family | Groom's family |
| friends | Friends |

## IMPORTANT SONGS

| Moment ID | Moment | Title | Artist | Version | Source type | File / Link | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| grand_entrance | GRAND_ENTRANCE | Marry You | Bruno Mars | Album version | CUSTOMER_FILE | assets/audio/marry-you-bruno-mars.mp3 |  |
| first_dance | FIRST_DANCE | Perfect | Ed Sheeran | Album version | STREAMING |  | Duet version if available. |
| cake_cutting | CAKE_CUTTING | Cake | The Coup | Album version | STREAMING |  |  |

## MUSIC POLICY

Disco Polo policy: No

### Must Play

| Song ID | Track | Note |
| --- | --- | --- |
| first_dance | Perfect — Ed Sheeran | First dance. |
| last_song | Wonderful Tonight — Eric Clapton | Last song of the night. |

### Do Not Play

| Track |
| --- |
| Macarena - Los del Río |

## GUEST REQUESTS

Rules: One request per guest; the DJ decides the order.

## SPEECHES

Speech mode: COMPLEX

`Speech mode` is the wedding-level authorization for speech Doc creation and
accepts exactly `OFF`, `LIGHT` or `COMPLEX`. Only `COMPLEX` authorizes creating
speech Docs and folders. A missing or invalid value warns and leaves the mode
unset; there is no silent `OFF` default. The rows below are documentation only;
speech records and scripts live in the encrypted speech bundle.

| Speech ID | Order | Speaker | Relationship |
| --- | --- | --- | --- |
| speech_witness | 1 | Bartek | Best man |

### Speech Script speech_witness

```text
Drodzy Państwo, chciałbym powiedzieć kilka słów o Jennifer i Guillaume…
```

## CAKE

Time: 20:30
Cutting song: Cake — The Coup
Sparklers: true

## GAMES

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

### Courses

| Course ID | Name | Time | Dietary notes |
| --- | --- | --- | --- |
| soup | Soup | 17:00 | 1 vegan |
| main | Main | 18:00 | 2 vegetarian, 1 gluten-free |

### Dietary Counts

Vegetarian: 2
Vegan: 1
Gluten free: 1

### Vendor Meals

| Vendor | Count | Time | Notes |
| --- | --- | --- | --- |
| Photo | 2 | 17:30 | Vegetarian |

### Service Anchors

| Anchor ID | Time | Label |
| --- | --- | --- |
| cake_service | 21:30 | Cake service |

## MANDATORY STEPS

| Field | Time |
| --- | --- |
| First guests arrival | 15:30 |
| Wedding closure | 02:00 |
| Closure extension allowed | true |
| Closure extension until | 03:00 |
| Cake service mode | KITCHEN_RETURN |
| Last song | Perfect - Ed Sheeran |

### Kitchen Services

One row per meal course, in serving order. The number of courses is not fixed —
add or remove rows as needed. Each course is an exact-hour mandatory milestone.

| Course ID | Name | Time | Service Mode |
| --- | --- | --- | --- |
| step_04 | Dinner | 19:00 | TABLE_SERVICE |
| step_15 | Supper I | 23:00 | TABLE_SERVICE |
| step_16 | Supper II | 23:30 | BUFFET |

## ATTRACTIONS

Optional parallel attractions. They never create timeline steps. Delete rows you
do not need; every row present in the table is active. Attraction ID, Type, Name,
Start, End and Location are required in every row; Provider and Notes are
optional.

| Attraction ID | Type | Name | Start | End | Location | Provider | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| photobooth | PHOTO_BOOTH | Fotobudka | 20:00 | 23:30 | Garden | Foto Fun | Unlimited prints |
| guestbook | GUEST_BOOK | Guest book | 18:00 | 23:30 | Hall foyer |  | Signing pens on the table |
| polaroids | POLAROIDS | Polaroids / Instax | 19:00 | 23:00 | Garden |  | One photo per guest |

## CEREMONY SCRIPT

Optional verbatim ceremony script, attached to the Ceremony step by `Step ID`.
Each `###` heading is one ceremony part; its fenced blocks are the per-language
lines (the fence language is `pl`, `fr` or `en`). Copy the script **verbatim** —
never summarize or translate it.

Step ID: step_02

### Welcome and Introduction

```pl
Drodzy goście, witamy was bardzo serdecznie w tym wyjątkowym dniu.
```
```fr
Chère famille, chers amis, soyez les bienvenus en ce jour si spécial.
```
```en
Welcome, family and friends — we are gathered here to celebrate this couple.
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

Optional informational moments inside the Ceremony step. They never become
timeline steps, do not affect durations, drift or anchors, and are displayed
nested under the Ceremony card. `Step ID` must reference a step that owns a
ceremony object. `Time`, `Notes`, `Music cue` and `Responsible role` are
optional; `Responsible role` accepts MC, DJ, Musician, Speaker or Venue.

| Step ID | Sub-step ID | Time | Title | Notes | Music cue | Responsible role |
| --- | --- | --- | --- | --- | --- | --- |
| step_02 | ceremony_entrance | 17:00 | Bridal entrance | Doors open; guests stand. | Canon in D | Musician |
| step_02 | ceremony_vows | 17:15 | Vows | Microphones for the couple. |  | MC |
| step_02 | ceremony_rings | 17:25 | Ring exchange | Photographer moves to the altar. |  | Musician |

## WITNESSES

Witnesses are key persons, not guests or media crew. Contact details are
admin-only and must never be rendered on a stage role view.

| Witness ID | Name | Language | Phone | Email |
| --- | --- | --- | --- | --- |
| witness_bartek | Bartek | PL | +48 600 222 333 | bartek@example.com |
| witness_valentin | Valentin | FR |  |  |
