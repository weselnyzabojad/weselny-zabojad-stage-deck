# Wedding harmonogram — Google Doc template (v1.2 proposal, D8)

> **Status: PROVISIONAL.** Generated from the v1.2 proposal, not from an
> approved schema yet. `schema/wedding-schema-v1.1.json` remains canonical.
> Regenerate this template when `schema/wedding-schema-v1.2.json` is frozen.
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

Wedding ID: 2026-08-20_jennifer_guillaume
Date: 20.08.2026
Date ISO: 2026-08-20
Sync PIN: 2008
Service package: HOST_AND_DJ_VIP
Children expected: yes
Venue: DwĂłr X, ul. PrzykĹ‚adowa 1, 59-400 Jawor
Ceremony type: RELIGIOUS
Ceremony MC support: yes
Ceremony MC translation help: no
Ceremony location: St. Mary Church
Ceremony notes: Full mass; MC introduces the couple at the church door.

## COUPLE IDENTITY

Bride first name: Jennifer
Bride nationality: FR
Groom first name: Guillaume
Groom nationality: FR
Shared languages: FR, PL, EN

## LANGUAGES

Default content: PL
Supported: PL, FR, EN
Notes: Couple speaks FR/PL; most guests understand EN.

## CULTURAL RULES

| Rule | Status | Note |
| --- | --- | --- |
| stoLat | YES_EXPLAIN | Explain the symbolism in FR. |
| gorzko | IF_GUESTS_START | Only during cake. |
| breadSalt | YES | Vodka vs water shot; break glasses. |

## OCZEPINY

Oczepiny variant: MIDNIGHT
Throwings: veil=yes, bouquet=yes, bow tie=yes, cravat=no
Game enabled: yes
Countdown mode: MC
Winners only photo: yes
Winners + couple photo: yes
Photographer available: yes

Enabled: true
Order: MIDNIGHT
Anchor ID: oczepiny_midnight
Toss: VEIL
Ties: BOW_TIE
Winner photo enabled: true
Winner photo cue: Winner photo with the couple, then clear the floor.
Photographer briefed notes: Briefed the photographer and cameraman.
Music enabled: true
Music track: Oczepiny mix
Music playlist: Midnight, Party
Props: Veil, Bow ties, Test cards

### Sub-events

| Sub-event ID | Title | Deferable | Skippable |
| --- | --- | --- | --- |
| toss | Veil toss | false | true |
| ties | Bow-tie game | true | true |
| test | Test ZgodnoĹ›ci | 15 | true | true |
| winner_photo | Winner photo | 5 | false | false |

## TIMELINE

First guests arrival, kitchen courses and Wedding closure are mandatory
constraints. The importer embeds them into timeline steps with a `mandatory`
metadata object; the step time is the only clock value. Duration (min) is
generated from the next step's time (and the closure time for the final step),
not authored here.

Use the canonical step titles (Ceremony, Vin d'honneur / Cocktail, Bread & Salt,
Wishes, Grand Entrance, Dinner, First Dance, Wedding Cake, Supper I/II/III,
Test Wiedzy, Test Zgodności, Oczepiny, Last Dance) — see
`docs/google-doc-template-conventions.md` §6. Detection reads the flags, never
the localized title.

| Step ID | Time | Duration (min) | Title | Type | Location | Anchor ID | Main Song Required | Optional Flag | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| step_01 | 16:30 | 30 | Cocktail / Vin d'honneur | FLEXIBLE | Garden |  | false |  |  |
| step_02 | 17:00 | 60 | Ceremony | FLEXIBLE | Garden Gazebo |  | false |  |  |
| step_03 | 18:00 | 150 | Grand Entrance | FLEXIBLE | Main Hall |  | true |  | Planned 18:00; actual start logged live. Guest order: newlyweds first, guests after. |
| step_05 | 20:30 | 30 | Wedding cake | HARD_ANCHOR | Terrace | cake_midnight | true |  |  |
| step_06 | 21:00 | 15 | Wedding Thank-You | FLEXIBLE | Main Hall |  | false |  |  |
| step_07 | 21:15 | 30 | Wishes | FLEXIBLE | Garden |  | false | wishes |  |
| step_08 | 21:45 | 135 | First Dance | FLEXIBLE | Main Hall |  | true |  | Mode NORMAL; start at 12s; stop after 4m 30s. |
| step_09 | 00:00 | 60 | Oczepiny | HARD_ANCHOR | Main Hall | oczepiny_midnight | false | oczepiny |  |
| step_10 | 01:00 | 30 | Test Wiedzy | FLEXIBLE | Main Hall |  | false | games |  |
| step_speed_foto | 01:30 | 15 | Speed Foto | FLEXIBLE | Dancefloor |  | false | games | Guests run in, pose, clear. |
| step_11 | 01:45 | 15 | Test Zgodności | FLEXIBLE | Main Hall |  | false | games |  |
| step_12 | 02:00 | 60 | DJ Set | FLEXIBLE | Main Hall |  | false | dj_set |  |

## DJ CUES

| Step ID | Playlist | Track | Cutoff | Note |
| --- | --- | --- | --- | --- |
| step_02 | Ceremony Procession | Canon in D — Pachelbel | 18:20 |  |
| step_03 | Dinner Jazz | Fly Me to the Moon — Frank Sinatra | 20:15 |  |

## MC CUES

| Step ID | Language | Timing | Text |
| --- | --- | --- | --- |
| step_03 | PL | AT_START | Prosimy o powstanie i powitanie Pary MĹ‚odej! |
| step_03 | FR | AT_START | Veuillez vous lever et accueillir les jeunes mariĂ©s ! |
| step_03 | EN | AT_START | Please stand and welcome the newlyweds! |

## SUBTASKS

| Step ID | Subtask ID | Label | Done |
| --- | --- | --- | --- |
| step_03 | step_03_speech_mic | Confirm the speech mic is on | false |
| step_03 | step_03_rosol | RosĂłĹ‚ + Tartare with Vodka shot | false |

## VENUE LOGISTICS

Venue: Dwór X, ul. Przykładowa 1, 59-400 Jawor
Address: DwĂłr X, ul. PrzykĹ‚adowa 1, 59-400 Jawor
Latitude: 51.05
Longitude: 16.19
Manager name: Anna Kowalska
Manager phone: +48 600 000 000
Manager email: anna@venue.example
Installation window start: 12:00
Installation window end: 16:00
Installation latest start: 12:00
Load-in minutes: 45
Setup minutes: 90
Load-out minutes: 45
Parking: Staff car park behind the building.
Power: 2x 230V sockets at the DJ table.
Loading dock: true
Elevator: false
Noise curfew: 01:00
Insurance: Certificate sent 2026-08-01.
Key holder: Anna Kowalska
Travel baseline minutes: 55
Travel distance km: 62
Travel origin label: Jawor 59-400
Accommodation name: Hotel PrzykĹ‚ad
Accommodation address: ul. Hotelowa 2, 59-400 Jawor
Accommodation latitude: 51.06
Accommodation longitude: 16.2
Accommodation distance km: 3.5
Accommodation check-in: 15:00
Accommodation check-out: 11:00
Accommodation booking ref: WED-2026-08
Accommodation rooms: 2
Accommodation contact name: Recepcja
Accommodation contact phone: +48 600 111 111
Accommodation paid by: COUPLE
Accommodation notes: Breakfast from 07:00.
Notes: Load-in before the 16:00 ceremony rehearsal.

## VIEW VISIBILITY

List a row only to override the D1 default matrix. Omit this table to keep the
defaults. Every role defaults to its `viewVisibility` preset in the v1.2
proposal.

| Role | Section | Visible |
| --- | --- | --- |
| photo | music | false |
| mc | venueAccommodation | true |

## MEDIA TEAM

| Team ID | Role | Name | Phone | Start | End | Deliverables | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| photo_main | PHOTO | Marek | +48 600 222 222 | 14:00 | 23:30 | Ceremony; Group photos; First dance; Oczepiny | Leaves after the winner photo. |
| video_main | VIDEO | Ola | +48 600 333 333 | 14:30 | 00:30 | Highlight film | Needs a clean feed from the DJ booth. |

## PHOTO PLAN

Sunset provider: sunrise-sunset.org
Sunset latitude: 51.05
Sunset longitude: 16.19
Mini session enabled: true
Mini session latest start before sunset (min): 30
Mini session location: Garden
Mini session backup location: Ballroom window
Group photos step ID:
Group photos location: OUTDOOR
Sparklers: true
Fire: false
Heavy smoke: true
Other effects: Cold sparks
Sparklers approved: true
Fire approved: false
Heavy smoke approved: true
Other effects approved: true
Guest coverage all guests: false
Guest coverage description: Formal photos with immediate family and witnesses only.
Guest coverage groups: Immediate family, Witnesses

### Group Photos

| Group ID | Label |
| --- | --- |
| bride_family | Bride's family |
| groom_family | Groom's family |
| friends | Friends |

## IMPORTANT SONGS

| Moment ID | Moment | Title | Artist | Version | Step ID | Planned time | Source type | File / Link | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| grand_entrance | GRAND_ENTRANCE | Marry You | Bruno Mars | Album version | step_03 | 18:00 | CUSTOMER_FILE | assets/audio/marry-you-bruno-mars.mp3 |  |
| first_dance | FIRST_DANCE | Perfect | Ed Sheeran | Album version |  | 19:30 | STREAMING |  | Duet version if available. |
| cake_cutting | CAKE_CUTTING | Cake | The Coup | Album version | step_05 | 20:30 | STREAMING |  |  |

## MUSIC POLICY

Requests open: true
Request window start: 20:00
Request window end: 23:00
Disco Polo policy: No
Clean versions: true

### Must Play

| Song ID | Track | Note |
| --- | --- | --- |
| first_dance | Perfect — Ed Sheeran | First dance. |
| last_song | Wonderful Tonight — Eric Clapton | Last song of the night. |

### Do Not Play

| Track |
| --- |
| Macarena - Los del R?o |

## GUEST REQUESTS

Requests open: true
Window start: 20:00
Window end: 23:00
Rules: One request per guest; the DJ decides the order.

## SPEECHES

| Speech ID | Order | Speaker | Relationship | Time | Language | Delivery | Consent | Visible roles |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| speech_witness | 1 | Bartek | Best man | 19:45 | PL | READ | true | mc, speaker |

### Speech Script speech_witness

```text
Drodzy PaĹ„stwo, chciaĹ‚bym powiedzieÄ‡ kilka sĹ‚Ăłw o Jennifer i Guillaumeâ€¦
```

## CAKE

Time: 20:30
Cutting song: Cake — The Coup
Sparklers: true
Photographer cue: Front-left of the cake table
Serve time: 20:45

## GAMES

| Game | Requested | Requested by | Languages | Existing questions | Requires photographer | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Test Wiedzy | UNDECIDED |  | PL, FR, EN | Yes | no | Question list Doc: gdoc_test_wiedzy |
| Test Zgodności | UNDECIDED |  | PL, FR, EN | No | no | Question list Doc: gdoc_test_zgodnosci; link to Oczepiny? |
| Speed Foto | YES |  |  | No | yes | Guests run in, pose, clear. |

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

## PRIVACY

Cloud sync: ENCRYPTED_HOST_KEY
Encryption algorithm: AES-GCM
Encryption key holder: HOST
Encryption version: 1

## LIVE SYNC STATE

> Runtime state. Leave these lines out of the couple's template. They exist only
> when exporting a demo cartridge.

Active step ID: step_03
Completed step IDs: step_01, step_02
Actual timestamps: step_01=2026-08-20T16:31:00+02:00, step_02=2026-08-20T17:00:00+02:00, step_03=2026-08-20T18:25:00+02:00

## EXTENSIONS

Optional JSON for app-specific additions. Leave as an empty object when unused.

```json
{}
```

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
| dinner | Dinner | 18:30 | TABLE_SERVICE |
| supper_1 | Supper I | 21:30 | TABLE_SERVICE |
| supper_2 | Supper II | 23:30 | BUFFET |

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

## WITNESSES

Witnesses are key persons, not guests or media crew. Contact details are
admin-only and must never be rendered on a stage role view.

| Witness ID | Name | Role | Language | Phone | Email | Speech IDs | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| witness_bartek | Bartek | Best man | PL | +48 600 222 333 | bartek@example.com | speech_witness | Also validates the Test Wiedzy questions. |
| witness_valentin | Valentin | Témoin | FR |  |  |  |  |
