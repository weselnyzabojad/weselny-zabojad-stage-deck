// Demo wedding cartridge and stage content (project.md TODO 22).
//
// Extracted verbatim from App.jsx as a pure refactor. This is demo/test data
// only: it is used by local/demo mode and tests, never as a production fallback
// when the server-published cartridge is missing.

import { deriveHardAnchors } from '../lib/hardAnchors.js';
import { applyCalculatedDurations } from '../lib/stepDurations.js';

export const HALL_ENTRANCE_SCRIPT = {
  has_script: true,
  type: "SPEECH",
  title: "Grand Entrance",
  items: [
    {
      id: "welcome",
      heading: "Welcome the couple",
      lines: [
        { lang: "PL", text: "Drodzy Państwo, prosimy o powstanie i powitanie Pary Młodej gromkimi brawami!" },
        { lang: "FR", text: "Mesdames et messieurs, veuillez vous lever et accueillir les jeunes mariés par un tonnerre d'applaudissements !" },
        { lang: "EN", text: "Ladies and gentlemen, please stand and welcome the newlyweds with a round of applause!" }
      ]
    },
    {
      id: "no-sto-lat",
      heading: "No Sto Lat tonight",
      lines: [
        { lang: "PL", text: "Uwaga: dziś wieczorem NIE śpiewamy „Sto lat”. Prosimy uszanować życzenie Pary Młodej." },
        { lang: "FR", text: "Attention : ce soir, nous ne chanterons PAS « Sto lat ». Merci de respecter le souhait des mariés." },
        { lang: "EN", text: "Please note: we will NOT sing “Sto Lat” tonight. Thank you for respecting the couple's wish." }
      ]
    },
    {
      id: "tartare",
      heading: "Steak tartare & vodka (FR explanation)",
      lines: [
        { lang: "FR", text: "En Pologne, la tradition veut que lorsqu'on mange un tartare, on se doit de boire de la vodka avec." },
        { lang: "PL", text: "W Polsce tradycja mówi, że do tatara pije się wódkę." },
        { lang: "EN", text: "In Poland, tradition says that steak tartare is served with a shot of vodka." }
      ]
    },
    {
      id: "guestbook",
      heading: "Guestbook, Instax & anniversary bottle",
      lines: [
        { lang: "EN", text: "A quick reminder: the guestbook and Instax cameras are by the entrance. Add a wish to the bottle for the couple's first anniversary!" },
        { lang: "PL", text: "Przypominamy: księga gości i aparaty Instax są przy wejściu. Wrzućcie życzenia do butelki na pierwszą rocznicę!" },
        { lang: "FR", text: "Petit rappel : le livre d'or et les appareils Instax sont à l'entrée. Ajoutez un vœu dans la bouteille pour le premier anniversaire du couple !" }
      ]
    }
  ]
};

export const TEST_WIEDZY_GAME = {
  has_script: true,
  type: "GAME_QUESTIONS",
  title: "Test Wiedzy — 14 Questions",
  items: [
    { id: "q01", question: { EN: "Who arrives at the airport 4 hours before the flight?", PL: "Kto przychodzi na lotnisko 4 godziny przed odlotem?", FR: "Qui arrive à l'aéroport 4 heures avant le vol ?" }, answer: "Antoine" },
    { id: "q02", question: { EN: "Who is the boss at home?", PL: "Kto rządzi w domu?", FR: "Qui est le chef à la maison ?" }, answer: "Justyna" },
    { id: "q03", question: { EN: "Who walks Silvio the dog?", PL: "Kto wyprowadza psa Silvio?", FR: "Qui promène Silvio le chien ?" }, answer: "Antoine" },
    { id: "q04", question: { EN: "Who sent the first message?", PL: "Kto napisał pierwszą wiadomość?", FR: "Qui a envoyé le premier message ?" }, answer: "Antoine" },
    { id: "q05", question: { EN: "Who is always late?", PL: "Kto zawsze się spóźnia?", FR: "Qui est toujours en retard ?" }, answer: "Justyna" },
    { id: "q06", question: { EN: "Who is the more romantic one?", PL: "Kto jest bardziej romantyczny?", FR: "Qui est le plus romantique ?" }, answer: "Antoine" },
    { id: "q07", question: { EN: "Who owns more shoes?", PL: "Kto ma więcej butów?", FR: "Qui a le plus de chaussures ?" }, answer: "Justyna" },
    { id: "q08", question: { EN: "Who is the gadget person?", PL: "Kto jest gadżeciarzem?", FR: "Qui est fou de gadgets ?" }, answer: "Antoine" },
    { id: "q09", question: { EN: "Who is the better cook?", PL: "Kto lepiej gotuje?", FR: "Qui cuisine le mieux ?" }, answer: "Justyna" },
    { id: "q10", question: { EN: "Who is the better driver?", PL: "Kto lepiej prowadzi samochód?", FR: "Qui est le meilleur conducteur ?" }, answer: "Antoine" },
    { id: "q11", question: { EN: "Who always knows where everything is?", PL: "Kto zawsze wie, gdzie wszystko jest?", FR: "Qui sait toujours où tout se trouve ?" }, answer: "Justyna" },
    { id: "q12", question: { EN: "Who has the worst handwriting?", PL: "Kto ma najbrzydszy charakter pisma?", FR: "Qui a la plus mauvaise écriture ?" }, answer: "Antoine" },
    { id: "q13", question: { EN: "Who falls asleep first?", PL: "Kto pierwszy zasypia?", FR: "Qui s'endort en premier ?" }, answer: "Justyna" },
    { id: "q14", question: { EN: "Who is worse at maths?", PL: "Kto jest gorszy z matematyki?", FR: "Qui est le plus nul en maths ?" }, answer: "Justyna" }
  ]
};

export const DEMO_WEDDING = {
  weddingId: "2026-08-20_jennifer_guillaume",
  date: "20.08.2026",
  syncPin: "2008",
  role: "MC",
  hostingMode: "HOST_AND_DJ",
  driftMinutes: 25,
  coupleProfile: {
    bride: { firstName: "Jennifer", nationalities: ["FR"] },
    groom: { firstName: "Guillaume", nationalities: ["FR"] },
    commonLanguages: ["FR", "PL", "EN"]
  },
  mediaTeam: [
    {
      id: "photo_main",
      role: "PHOTO",
      name: "Magda & Tomek",
      phone: "+48 600 000 000",
      startTime: "14:00",
      endTime: "21:30",
      deliverables: ["Ceremony", "Group photos", "First dance", "Oczepiny"],
      notes: "Leaves after the winner photo."
    },
    {
      id: "video_main",
      role: "VIDEO",
      name: "Ola",
      phone: "+48 600 333 333",
      startTime: "14:30",
      endTime: "00:30",
      deliverables: ["Highlight film"],
      notes: "Needs a clean feed from the DJ booth."
    }
  ],
  photoPlan: {
    sunset: {
      source: "ONLINE_API",
      provider: "sunrise-sunset.org",
      latitude: 51.05,
      longitude: 16.19,
      timezone: "Europe/Warsaw",
      lastFetchedAt: "2026-08-20T17:05:00.000Z",
      sunsetTime: "20:12",
      goldenHourStart: "19:32",
      civilTwilightEnd: "20:48",
      status: "LIVE"
    },
    miniSession: {
      enabled: true,
      latestStartMinutesBeforeSunset: 30,
      durationMin: 20,
      location: "Garden",
      backupLocation: "Ballroom window"
    },
    groupPhotos: {
      location: "OUTDOOR",
      groups: [
        { id: "bride_family", label: "Bride's family" },
        { id: "groom_family", label: "Groom's family" },
        { id: "friends", label: "Friends" }
      ],
      minGroupSize: 5,
      durationMin: 25
    },
    speedFoto: {
      enabled: true,
      description: "Couple in the middle of the dance floor; guests run in, pose, and clear.",
      durationMin: 10,
      music: "Fast party block"
    },
    specialEffects: {
      sparklers: true,
      fire: false,
      heavySmoke: true,
      other: "Cold sparks",
      permitRequired: false,
      venueApproved: true,
      safetyBriefing: "Briefed the venue manager and the photographer."
    },
    guestCoverage: {
      allGuests: false,
      selectedGuests: 12,
      description: "Formal photos with immediate family and witnesses only.",
      consent: "Couple approved; announce before candid coverage."
    }
  },
  oczepiny: {
    enabled: true,
    variant: "MIDNIGHT",
    order: "MIDNIGHT",
    throwings: { veil: true, bouquet: true, bowTie: true, cravat: false },
    game: { enabled: true, type: "TEST_ZGODNOSCI", notes: "Test Zgodności with the guests." },
    countdown: { mode: "MC" },
    toss: "VEIL",
    ties: "BOW_TIE",
    winnerPhoto: {
      enabled: true,
      replacesWinnersDance: false,
      winnersOnly: true,
      winnersWithCouple: true,
      photographerAvailable: true,
      photographerCue: "Winner photo with the couple, then clear the floor."
    },
    photographerBriefed: {
      confirmed: true,
      confirmedAt: "2026-08-19T18:00:00.000Z",
      confirmedBy: "MC",
      notes: "Cameraman confirmed the midnight window."
    },
    props: ["Veil", "Bow ties", "Test cards"],
    music: { enabled: true, track: "Oczepiny mix", playlist: "Midnight" },
    subEvents: [
      { id: "toss", title: "Veil toss", durationMin: 10, deferable: false, skippable: true },
      { id: "ties", title: "Bow-tie game", durationMin: 10, deferable: true, skippable: true },
      { id: "test", title: "Test Zgodności", durationMin: 15, deferable: true, skippable: true },
      { id: "winner_photo", title: "Winner photo", durationMin: 5, deferable: false, skippable: false }
    ]
  },
  culturalRules: {
    sto_lat: { status: "STRICT_NO", note: "Inform guests: NO Sto Lat tonight!" },
    gorzko: { status: "STRICT_NO", note: "No Gorzko Gorzko" },
    bread_salt: { status: "YES", note: "Vodka vs water shot, break glasses" }
  },
  childrenExpected: true,
  attractions: [
    {
      id: "photobooth",
      type: "PHOTO_BOOTH",
      name: "Fotobudka",
      booked: true,
      startTime: "20:00",
      endTime: "23:30",
      location: "Garden",
      provider: "Foto Fun",
      notes: "Unlimited prints"
    },
    {
      id: "guestbook",
      type: "GUEST_BOOK",
      name: "Guest book",
      booked: true,
      startTime: "18:00",
      endTime: "23:30",
      location: "Hall foyer",
      notes: "Signing pens on the table"
    },
    {
      id: "polaroids",
      type: "POLAROIDS",
      name: "Polaroids / Instax",
      booked: true,
      startTime: "19:00",
      endTime: "23:00",
      location: "Garden",
      notes: "One photo per guest"
    }
  ],
  wishes: { enabled: true },
  games: {
    enabled: true,
    questionLists: [
      {
        id: "test_wiedzy",
        title: "Test Wiedzy",
        gameType: "TEST_WIEDZY",
        enabled: true,
        sourceDocId: "gdoc_test_wiedzy",
        status: "AVAILABLE",
        questions: [
          {
            id: "w01",
            level: "EASY",
            prompt: {
              PL: "Gdzie Jennifer i Guillaume poznali się po raz pierwszy?",
              FR: "Où Jennifer et Guillaume se sont-ils rencontrés ?",
              EN: "Where did Jennifer and Guillaume first meet?",
            },
            answer: "GROOM",
          },
          {
            id: "w02",
            prompt: {
              PL: "Kto jako pierwszy powiedział „kocham cię”?",
              FR: "Qui a dit « je t'aime » en premier ?",
              EN: "Who said I love you first?",
            },
            answer: "BRIDE",
          },
          {
            id: "w03",
            level: "HARD",
            prompt: {
              PL: "Jak nazywa się pies Jennifer i Guillaume?",
              FR: "Comment s'appelle le chien du couple ?",
              EN: "What is the couple's dog called?",
            },
            answer: { PL: "Silvio", FR: "Silvio", EN: "Silvio" },
          },
        ],
      },
      {
        id: "test_zgodnosci",
        title: "Test Zgodności",
        gameType: "TEST_ZGODNOSCI",
        enabled: true,
        sourceDocId: "gdoc_test_zgodnosci",
        status: "AVAILABLE",
        questions: [
          {
            id: "z01",
            prompt: {
              PL: "Kto chętniej planuje spontaniczny wyjazd?",
              FR: "Qui planifie plus volontiers un voyage spontané ?",
              EN: "Who is more likely to plan a spontaneous trip?",
            },
          },
          {
            id: "z02",
            prompt: {
              PL: "Kto dłużej się szykuje do wyjścia?",
              FR: "Qui prend plus de temps pour se préparer ?",
              EN: "Who takes longer to get ready?",
            },
          },
        ],
      },
    ],
  },
  ceremony: {
    type: "RELIGIOUS",
    mcSupportRequested: true,
    mcTranslationHelpRequested: false,
    location: "St. Mary's Church",
    notes: "Full mass; MC introduces the couple at the church door.",
  },
  musicPolicy: {
    discoPoloPolicy: "ON_REQUEST",
    mustPlay: [
      { id: "first_dance", track: "Perfect - Ed Sheeran", note: "First dance — duet version." },
      { id: "grand_entrance", track: "Marry You - Bruno Mars", note: "Grand entrance cue." }
    ],
    doNotPlay: [
      { id: "no_macarena", track: "Macarena - Los del Río", reason: "Couple's request." },
      { id: "no_sto_lat", track: "Sto lat", reason: "No Sto Lat tonight." }
    ],
    requestsOpen: true,
    requestWindow: { start: "20:00", end: "23:00" },
    cleanVersions: true,
    licensing: "Venue ZAIKS license confirmed.",
    importantSongs: [
      {
        id: "grand_entrance",
        moment: "GRAND_ENTRANCE",
        title: "Marry You",
        artist: "Bruno Mars",
        version: "Album version",
        stepId: "step_03",
        plannedTime: "18:00",
        startAtSec: 0,
        fadeOutSec: 215,
        source: {
          type: "CUSTOMER_FILE",
          fileRef: "assets/audio/marry-you-bruno-mars.mp3",
          filename: "marry-you-bruno-mars.mp3",
          checksum: "sha256:5d41402abc4b2a76b9719d911017c592",
          durationSec: 230,
          availability: "LOCAL",
          notes: "Clean intro, no cold ending. Kept on the DJ laptop."
        },
        backupSource: {
          type: "SPOTIFY",
          url: "https://open.spotify.com/track/DEMO_GRAND_ENTRANCE",
          notes: "Demo link — replace with the couple's exact URL."
        },
        note: "Wait for the MC's cue before pressing play."
      },
      {
        id: "cake_cutting",
        moment: "CAKE",
        title: "Cake",
        artist: "The Coup",
        stepId: "step_05",
        plannedTime: "20:30",
        startAtSec: 18,
        fadeOutSec: 240,
        source: {
          type: "YOUTUBE",
          url: "https://www.youtube.com/watch?v=DEMO_CAKE_CUTTING",
          notes: "Demo link — opens online."
        },
        backupSource: {
          type: "CUSTOMER_FILE",
          fileRef: "assets/audio/cake-the-coup.mp3",
          filename: "cake-the-coup.mp3",
          availability: "LOCAL"
        },
        note: "Start on the chorus; photographers need the full cake moment."
      },
      {
        id: "first_dance",
        moment: "FIRST_DANCE",
        title: "Perfect",
        artist: "Ed Sheeran",
        version: "Duet version",
        stepId: "step_08",
        plannedTime: "21:45",
        startAtSec: 0,
        fadeOutSec: 270,
        source: {
          type: "SPOTIFY",
          url: "https://open.spotify.com/track/DEMO_FIRST_DANCE",
          notes: "Demo link — replace with the couple's exact URL."
        },
        backupSource: {
          type: "DEEZER",
          url: "https://www.deezer.com/track/DEMO_FIRST_DANCE"
        },
        note: "Dance floor cleared; fade out after the second chorus."
      }
    ]
  },
  cake: {
    time: "20:30",
    cuttingSong: "Cake - The Coup",
    sparklers: true,
    photographerCue: "Front-left of the cake table",
    serveTime: "20:45"
  },
  speechMode: "COMPLEX",
  speeches: [
    {
      id: "speech_witness",
      mode: "COMPLEX",
      speaker: { name: "Bartek", relationship: "Best man", contact: "+48 600 222 333" },
      order: 1,
      time: "19:45",
      durationMin: 5,
      language: "PL",
      mic: "MIC_2",
      cue: "After the main course",
      script: {
        text:
          "Dobry wieczór Państwu,\n\n" +
          "Kiedy Jennifer i Guillaume poprosili mnie, żebym stanął tu dziś jako świadek, od razu wiedziałem, że to zaszczyt.\n\n" +
          "Guillaume, pamiętasz naszą pierwszą podróż? Jennifer od razu przejęła mapę… i dobrze, bo my i tak byśmy się zgubili.\n\n" +
          "Wznieśmy toast za tę dwójkę: za śmiech, za cierpliwość i za wszystkie drogi, które jeszcze przed Wami.",
        format: "PLAIN",
        ready: true,
        source: "GOOGLE_DOC"
      },
      delivery: "READ",
      readFrom: "TABLET",
      consent: {
        storeScript: true,
        confirmedBy: "MC",
        confirmedAt: "2026-08-19T18:00:00.000Z"
      },
      mcIntro: true,
      visibleToRoles: ["mc", "speaker"]
    },
    {
      id: "speech_father",
      mode: "LIGHT",
      speaker: { name: "Père de Guillaume", relationship: "Father of the groom" },
      order: 2,
      time: "20:05",
      durationMin: 3,
      language: "FR",
      mic: "MIC_1",
      cue: "Before the cake",
      script: { text: "", format: "PLAIN", ready: false, source: "GOOGLE_DOC" },
      delivery: "MEMORIZE",
      readFrom: "MEMORY",
      consent: {
        storeScript: true,
        confirmedBy: "MC",
        confirmedAt: "2026-08-19T18:00:00.000Z"
      },
      mcIntro: true,
      visibleToRoles: ["mc", "speaker"]
    }
  ],
  witnesses: [
    {
      id: "witness_bartek",
      name: "Bartek",
      role: "Best man",
      language: "PL",
      contact: { phone: "+48 600 222 333" },
      responsibilities: ["GAME_ORGANIZER", "SPEECH"],
      speechIds: ["speech_witness"],
      notes: "Also validates the Test Wiedzy questions with the couple."
    }
  ],
  steps: [
    { id: "first_guests_arrival", time: "15:30", durationMin: 1, title: "First guests arrival", type: "HARD_ANCHOR", location: "Garden", mandatory: { kind: "FIRST_GUESTS_ARRIVAL", label: "First guests arrival" } },
    { id: "step_01", time: "16:30", durationMin: 30, title: "Cocktail / Vin d'honneur", type: "FLEXIBLE", location: "Garden", dj: { playlist: "Garden Aperitif", track: "La Vie en Rose — Édith Piaf" } },
    { id: "step_02", time: "17:00", durationMin: 60, title: "Ceremony", type: "FLEXIBLE", location: "Garden Gazebo", dj: { playlist: "Ceremony Procession", track: "Canon in D — Pachelbel", cutoff: "18:20" } },
    { id: "step_03", time: "18:00", realStart: "18:25", planned: "18:00", durationMin: 150, title: "Grand Entrance", type: "FLEXIBLE", location: "Main Hall", photographerCue: "Group photo before the toast", isMainSongRequired: true, grandEntranceOrder: "NEWLYWEDS_FIRST", mcCues: [ { language: "PL", timing: "AT_START", text: "Prosimy o powstanie i powitanie Pary Młodej!" }, { language: "FR", timing: "AT_START", text: "Veuillez vous lever et accueillir les jeunes mariés !" }, { language: "EN", timing: "AT_START", text: "Please stand and welcome the newlyweds!" } ], dj: { playlist: "Dinner Jazz", track: "Fly Me to the Moon — Frank Sinatra", cutoff: "20:15", cutoffSec: 3600 }, teleprompter: HALL_ENTRANCE_SCRIPT },
    { id: "dinner", time: "18:30", durationMin: 15, title: "Dinner", type: "HARD_ANCHOR", location: "Main Hall", mandatory: { kind: "KITCHEN_SERVICE", label: "Dinner", serviceMode: "TABLE_SERVICE" } },
    { id: "photo_leave", time: "20:30", durationMin: 1, title: "Photographer leaves", type: "HARD_ANCHOR", location: "Terrace", mandatory: { kind: "MILESTONE", label: "Photographer leaves", milestoneKind: "PHOTO", alertBeforeMin: 45 } },
    { id: "camera_leave", time: "20:30", durationMin: 1, title: "Cameraman leaves", type: "HARD_ANCHOR", location: "Terrace", mandatory: { kind: "MILESTONE", label: "Cameraman leaves", milestoneKind: "CAMERA", alertBeforeMin: 45 } },
    { id: "step_05", time: "20:30", durationMin: 30, title: "Wedding cake", type: "HARD_ANCHOR", location: "Terrace", isMainSongRequired: true, mandatory: { kind: "CAKE_SERVICE", label: "Wedding cake", cakeServiceMode: "KITCHEN_RETURN" }, dj: { playlist: "Party Set", track: "Dancing Queen - ABBA", cutoff: "21:30" } },
    { id: "step_06", time: "21:00", durationMin: 15, title: "Wedding Thank-You", type: "FLEXIBLE", location: "Main Hall" },
    { id: "step_07", time: "21:15", durationMin: 30, title: "Wishes", type: "FLEXIBLE", location: "Garden", optionalFlag: "wishes" },
    { id: "supper_1", time: "21:30", durationMin: 15, title: "Supper I", type: "HARD_ANCHOR", location: "Main Hall", mandatory: { kind: "KITCHEN_SERVICE", label: "Supper I", serviceMode: "TABLE_SERVICE" } },
    { id: "step_08", time: "21:45", durationMin: 135, title: "First Dance", type: "FLEXIBLE", location: "Main Hall", isMainSongRequired: true, firstDanceMode: "NORMAL", firstDanceStartAt: "00:12", firstDanceStopAt: "04:30", firstDanceNotes: "Key song for the DJ; fade under the applause.", song: { artist: "Ed Sheeran", title: "Perfect", Note: "Duet version if available.", source: "STREAMING" } },
    { id: "supper_2", time: "23:30", durationMin: 15, title: "Supper II", type: "HARD_ANCHOR", location: "Main Hall", mandatory: { kind: "KITCHEN_SERVICE", label: "Supper II", serviceMode: "BUFFET" } },
    { id: "step_09", time: "00:00", durationMin: 60, title: "Oczepiny", type: "FLEXIBLE", location: "Main Hall", optionalFlag: "oczepiny" },
    { id: "step_10", time: "01:00", durationMin: 30, title: "Test Wiedzy", type: "FLEXIBLE", location: "Main Hall", optionalFlag: "games", gameId: "test_wiedzy", teleprompter: TEST_WIEDZY_GAME },
    { id: "step_11", time: "01:30", durationMin: 30, title: "Test Zgodności", type: "FLEXIBLE", location: "Main Hall", optionalFlag: "games", gameId: "test_zgodnosci" },
    { id: "closure", time: "02:00", durationMin: 1, title: "Wedding closure", type: "HARD_ANCHOR", location: "Main Hall", mandatory: { kind: "CLOSURE", label: "Wedding closure", closureExtensionAllowed: true, closureExtensionUntil: "03:00", lastSong: "Perfect - Ed Sheeran" } }
  ]
};

export const SUBTASKS = [
  "Parents' thank-you speech + gifts (with mic)",
  "Rosół + Tartare with Vodka shot",
  "Speeches between starter and main course"
];

// Demo cartridge starting mid-evening, as it would after a couple of taps.
// `WeddingSchema v1.1` shape: `live_sync_state`. Actual starts are stored as
// full ISO datetimes (TODO 23); HH:MM display is derived from them.
export const INITIAL_LIVE_STATE = {
  active_step_id: "step_03",
  active_speech_id: "speech_witness",
  completed_step_ids: ["step_01", "step_02"],
  actual_timestamps: {
    step_01: "2026-08-20T16:31:00+02:00",
    step_02: "2026-08-20T17:00:00+02:00",
    step_03: "2026-08-20T18:25:00+02:00"
  },
  checked_subtasks: {
    [SUBTASKS[0]]: true,
    [SUBTASKS[1]]: false,
    [SUBTASKS[2]]: false
  }
};

const demoDurations = applyCalculatedDurations(DEMO_WEDDING.steps, {
  closureTime: '02:00',
});
if (demoDurations.errors.length === 0) DEMO_WEDDING.steps = demoDurations.steps;
DEMO_WEDDING.hardAnchors = deriveHardAnchors(DEMO_WEDDING.steps);

export function buildInitialLiveState(wedding) {
  const base = wedding.liveSyncState ?? {};
  return {
    ...base,
    checked_subtasks: {
      ...(base.checked_subtasks ?? {})
    }
  };
}

export const DEFAULT_WEDDING = {
  ...DEMO_WEDDING,
  liveSyncState: INITIAL_LIVE_STATE,
  steps: DEMO_WEDDING.steps.map((step) =>
    step.id === "step_03" ? { ...step, subTasks: SUBTASKS } : step
  )
};
