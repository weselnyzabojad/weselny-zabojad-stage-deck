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

## COUPLE IDENTITY

Couple: Jennifer & Guillaume
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

Enabled: true
Order: MIDNIGHT
Anchor ID: oczepiny_midnight
Toss: VEIL
Ties: BOW_TIE
Winner photo enabled: true
Winner photo replaces winners dance: true
Winner photo cue: Winner photo with the couple, then clear the floor.
Photographer briefed: true
Photographer briefed at: 2026-08-19T18:00:00.000Z
Photographer briefed by: MC
Music track: Oczepiny mix
Music playlist: Midnight
Props: Veil, Bow ties, Test cards

### Sub-events

| Sub-event ID | Title | Duration (min) | Deferable | Skippable |
| --- | --- | --- | --- | --- |
| toss | Veil toss | 10 | false | true |
| ties | Bow-tie game | 10 | true | true |
| test | Test ZgodnoĹ›ci | 15 | true | true |
| winner_photo | Winner photo | 5 | false | false |

## TIMELINE

| Step ID | Time | Duration (min) | Title | Type | Location | Anchor ID | Main Song Required | Optional Flag | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| step_00 | 15:30 | 30 | First guests arrival | HARD_ANCHOR | Venue entrance |  | false |  | Ceremony in church: St. Mary Church |
| step_01 | 16:30 | 30 | Cocktail / Vin d'honneur | BUFFER | Garden |  | false |  |  |
| step_02 | 17:00 | 60 | Ceremony | ELASTIC | Garden Gazebo |  | false |  |  |
| step_03 | 18:00 | 90 | Grand Entrance | ELASTIC | Main Hall |  | true |  | Planned 18:00; actual start logged live. |
| step_05 | 20:30 | 30 | Wedding cake | HARD_ANCHOR | Terrace | cake_midnight | true |  |  |
| step_06 | 21:00 | 15 | Wedding Thank-You | ELASTIC | Main Hall |  | false |  |  |
| step_07 | 21:15 | 30 | Wishes | BUFFER | Garden |  | false | wishes |  |
| step_08 | 21:45 | 10 | First Dance | ELASTIC | Main Hall |  | true |  |  |
| step_09 | 00:00 | 60 | Oczepiny | HARD_ANCHOR | Main Hall | oczepiny_midnight | false | oczepiny |  |
| step_10 | 01:00 | 45 | Games | BUFFER | Main Hall |  | false | games |  |

## DJ CUES

| Step ID | Playlist | Track | Cutoff | CutoffSec | Note |
| --- | --- | --- | --- | --- | --- |
| step_02 | Ceremony Procession | Canon in D — Pachelbel | 18:20 |  |  |
| step_03 | Dinner Jazz | Fly Me to the Moon — Frank Sinatra | 20:15 | 3600 | Absolute cutoff wins over cutoffSec. |

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

## HARD ANCHORS

| Anchor ID | Time | Label | Alert before (min) | Kind |
| --- | --- | --- | --- | --- |
| ceremony_start | 17:00 | Civil ceremony | 30 | FAMILY |
| cake_midnight | 21:30 | Cake service | 45 | VENDOR |
| oczepiny_midnight | 00:00 | Oczepiny | 30 | OTHER |

## VENUE LOGISTICS

Address: DwĂłr X, ul. PrzykĹ‚adowa 1, 59-400 Jawor
Latitude: 51.05
Longitude: 16.19
Timezone: Europe/Warsaw
Manager name: Anna Kowalska
Manager phone: +48 600 000 000
Manager email: anna@venue.example
Installation window start: 12:00
Installation window end: 16:00
Installation latest start: 12:00
Load-in minutes: 45
Setup minutes: 90
Load-out minutes: 45
Access notes: Service entrance at the back; ask for the key.
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
| dj | vipAlerts | false |
| photo | music | false |
| mc | venueAccommodation | true |

## MEDIA TEAM

| Team ID | Role | Name | Phone | Start | End | Deliverables | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| photo_main | PHOTO | Marek | +48 600 222 222 | 14:00 | 23:30 | Ceremony; Group photos; First dance; Oczepiny | Leaves after the winner photo. |
| video_main | VIDEO | Ola | +48 600 333 333 | 14:30 | 00:30 | Highlight film | Needs a clean feed from the DJ booth. |

## PHOTO PLAN

Sunset source: ONLINE_API
Sunset provider: sunrise-sunset.org
Sunset latitude: 51.05
Sunset longitude: 16.19
Sunset timezone: Europe/Warsaw
Mini session enabled: true
Mini session latest start before sunset (min): 30
Mini session duration (min): 20
Mini session location: Garden
Mini session backup location: Ballroom window
Group photos location: OUTDOOR
Group photos min group size: 5
Group photos duration (min): 25
Speed foto enabled: true
Speed foto description: Couple in the middle of the dance floor; guests run in, pose, and clear.
Speed foto duration (min): 10
Speed foto music: Fast party block
Sparklers: true
Fire: false
Heavy smoke: true
Other effects: Cold sparks
Permit required: false
Venue approved: true
Safety briefing: Briefed the venue manager and the photographer.
Guest coverage all guests: false
Guest coverage selected guests: 12
Guest coverage description: Formal photos with immediate family and witnesses only.
Guest coverage consent: Couple approved; announce before candid coverage.

### Group Photos

| Group ID | Label |
| --- | --- |
| bride_family | Bride's family |
| groom_family | Groom's family |
| friends | Friends |

## IMPORTANT SONGS

| Moment ID | Moment | Title | Artist | Version | Step ID | Planned time | Source type | File / Link | Start (s) | Fade out (s) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| grand_entrance | GRAND_ENTRANCE | Marry You | Bruno Mars | Album version | step_03 | 18:00 | CUSTOMER_FILE | assets/audio/marry-you-bruno-mars.mp3 | 0 | 215 |  |
| first_dance | FIRST_DANCE | Perfect | Ed Sheeran | Album version |  | 19:30 | STREAMING |  | 0 | 260 | Duet version if available. |
| cake_cutting | CAKE_CUTTING | Cake | The Coup | Album version | step_05 | 20:30 | STREAMING |  | 0 | 180 |  |

## MUSIC POLICY

Requests open: true
Request window start: 20:00
Request window end: 23:00
Clean versions: true
Licensing: Venue ZAIKS license confirmed.

### Must Play

| Song ID | Track | Note |
| --- | --- | --- |
| first_dance | Perfect — Ed Sheeran | First dance. |
| last_song | Wonderful Tonight — Eric Clapton | Last song of the night. |

### Do Not Play

| Song ID | Track | Reason |
| --- | --- | --- |
| no_macarena | Macarena — Los del RĂ­o | Couple's request. |

## GUEST REQUESTS

Requests open: true
Window start: 20:00
Window end: 23:00
Rules: One request per guest; the DJ decides the order.

## SPEECHES

| Speech ID | Order | Speaker | Relationship | Time | Duration (min) | Language | Mic | Cue | Delivery | Read from | Consent | Visible roles |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| speech_witness | 1 | Bartek | Best man | 19:45 | 5 | PL | MIC_2 | After the main course | READ | TABLET | true | mc, speaker |

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

| Game | Requested | Requested by | Languages | Existing questions | Notes |
| --- | --- | --- | --- | --- | --- |
| Test Wiedzy | UNDECIDED |  | PL, FR, EN | No |  |
| Test ZgodnoĹ›ci | UNDECIDED |  | PL, FR, EN | No | Link to Oczepiny? |

## VENDOR CONTACTS

| Contact ID | Role | Name | Phone | Email | Leaves at | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| dj_mark | DJ | DJ Mark | +48 600 444 444 | dj@example.com | 00:30 | Needs a clean feed. |
| photo_video | Photo / Video | Magda & Tomek | +48 600 000 000 | photo@studio.example | 23:30 | Group photo before 20:15. |

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

## VIP ALERTS

Sensitive. The importer encrypts this section before cloud sync and never logs
plaintext.

| Alert ID | Tone | Tag | Title | Detail | Visibility |
| --- | --- | --- | --- | --- | --- |
| divorce | critical | FAMILY | Do not seat X and Y together | Sensitive family context. | mc |

## PRE-WEDDING TODOS

| Todo ID | Task | Done | Due date | Owner |
| --- | --- | --- | --- | --- |
| confirm_test_questions | Confirm Test ZgodnoĹ›ci questions with the witnesses | false | 2026-08-18 | MC |
| confirm_sunset | Confirm the sunset time with the photo team | false | 2026-08-19 | MC |

## PRIVACY

Sensitive fields: vipAlerts, contacts[].phone
Cloud sync: ENCRYPTED_HOST_KEY
Encryption algorithm: AES-GCM
Encryption key holder: HOST
Encryption version: 1

### Sensitive Fields

- vipAlerts
- contacts[].phone

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
| Obiad weselny | 18:30 |
| Pierwsza kolacja | 21:30 |
| Druga kolacja | 23:30 |
| Trzecia kolacja |  |
