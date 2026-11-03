import React, { useEffect, useState } from 'react';
import logo from './assets/img/logo.png';
import BufferAccordionCard from './components/BufferAccordionCard';
import CakeCard from './components/CakeCard';
import CartridgeImporter from './components/CartridgeImporter';
import ContactsModal from './components/ContactsModal';
import CoupleIdentity from './components/CoupleIdentity';
import DriftPill from './components/DriftPill';
import EventAdminCard from './components/EventAdminCard';
import MusicPolicyCard from './components/MusicPolicyCard';
import CulturalRulesBar from './components/CulturalRulesBar';
import DjBoothView from './components/DjBoothView';
import GameClickerOverlay from './components/GameClickerOverlay';
import HardAnchorAlertBanner from './components/HardAnchorAlertBanner';
import HardAnchorRadar from './components/HardAnchorRadar';
import HoldToConfirmButton from './components/HoldToConfirmButton';
import JokerDrawerCard from './components/JokerDrawerCard';
import PairingScreen from './components/PairingScreen';
import PhotographerView from './components/PhotographerView';
import PocketRemoteView from './components/PocketRemoteView';
import PreWeddingChecklistCard from './components/PreWeddingChecklistCard';
import ReelClock from './components/ReelClock';
import RoleJoinScreen from './components/RoleJoinScreen';
import RoleSwitcher from './components/RoleSwitcher';
import SpeechesCard from './components/SpeechesCard';
import SpeakerView from './components/SpeakerView';
import StagePingControls from './components/StagePingControls';
import SyncStatusBadge from './components/SyncStatusBadge';
import ThemeToggle from './components/ThemeToggle';
import TeleprompterOverlay from './components/TeleprompterOverlay';
import UndoToast from './components/UndoToast';
import VipAlertsModal from './components/VipAlertsModal';
import { useLiveStageState } from './hooks/useLiveStageState';
import { usePairing } from './hooks/usePairing';
import { useRole } from './hooks/useRole';
import { useEventClock } from './hooks/useEventClock';
import { useTheme } from './hooks/useTheme';
import { useSensitiveNotes } from './hooks/useSensitiveNotes';
import { availableRoleIds } from './lib/roles';
import { buildDriftReport } from './lib/driftEngine';
import { resolveCakeProtocol } from './lib/cake';
import { resolveContacts } from './lib/contacts';
import { resolveMusicPolicy } from './lib/musicPolicy';
import {
  resolveActiveSpeech,
  resolveSpeechMode,
  resolveSpeeches,
} from './lib/speeches';
import { clearSpeakerScript, loadSpeakerScript } from './lib/speakerCache';
import { swapBlockReason, swapNeedsWarning } from './lib/stepGuards';
import { resolveEventDateISO, resolveVenueTimeZone } from './lib/eventTime';
import { getSyncConfig } from './lib/sync/syncConfig';
import {
  clearRoleSession,
  isRoleSessionValid,
  loadRoleSession,
  parseDeckIntent,
  saveRoleSession,
} from './lib/sync/roleSession';
import { activeSteps, findDeferTarget } from './lib/liveStageState';
import { loadActiveCartridge, saveActiveCartridge, clearActiveCartridge } from './lib/cartridgeStorage';
import { createSupabaseSyncClient } from './lib/sync/supabaseSyncClient';
import { clearStoredHostKey } from './lib/sensitiveNotes';

const HALL_ENTRANCE_SCRIPT = {
  has_script: true,
  type: "SPEECH",
  title: "Hall Entrance, Toast & Dinner Start",
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

const TEST_WIEDZY_GAME = {
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

const VIP_ALERTS = [
  {
    id: "uncle-sylwek",
    tone: "critical",
    icon: "🎸",
    tag: "Family",
    title: "Uncle Sylwek — guitar limit",
    detail: "May arrive with a guitar and ask to play. Allow MAX 1 short performance (a few minutes). Do not allow repeated concerts."
  },
  {
    id: "uncle-dawid",
    tone: "critical",
    icon: "⚠️",
    tag: "Family",
    title: "Uncle Dawid Chmielewski",
    detail: "Can become difficult to control after alcohol. If needed, discreetly alert Wojtek — he takes full responsibility for handling him."
  },
  {
    id: "birthdays",
    tone: "celebrate",
    icon: "🎂",
    tag: "Birthday",
    title: "Guest birthdays today",
    detail: "Call Melanie and Marzena to the center: “Joyeux Anniversaire” for Melanie, “Sto Lat” for Marzena. Best moment: cake."
  },
  {
    id: "blind-grandmother",
    tone: "care",
    icon: "👵",
    tag: "Care",
    title: "Blind grandmother",
    detail: "Groom's grandmother is elderly and nearly blind; groom's mother cares for her. Keep walkways clear and warn before loud moments."
  }
];

const DEMO_WEDDING = {
  weddingId: "2026-08-20_jennifer_guillaume",
  couple: "Jennifer & Guillaume",
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
  venueLogistics: {
    timezone: "Europe/Warsaw",
    address: "Château de la Forêt, 1 Allée des Chênes, 59-400 Jawor",
    coordinates: { latitude: 51.05, longitude: 16.19 },
    manager: { name: "Anna Kowalska", phone: "+48 600 111 111", email: "anna@venue.example" },
    installation: {
      windowStart: "12:00",
      windowEnd: "16:00",
      loadInMinutes: 45,
      accessNotes: "Service entrance at the back; ask for the key.",
      parking: "Staff car park behind the building.",
      power: "2x 230V sockets at the DJ table.",
      loadingDock: true,
      noiseCurfew: "01:00"
    },
    notes: "Group photos in the garden before 20:15."
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
    order: "MIDNIGHT",
    anchorId: "ocsepiny",
    toss: "VEIL",
    ties: "BOW_TIE",
    winnerPhoto: {
      enabled: true,
      replacesWinnersDance: false,
      photographerCue: "Winner photo with the couple, then clear the floor."
    },
    photographerBriefed: {
      confirmed: true,
      confirmedAt: "2026-08-19T18:00:00.000Z",
      confirmedBy: "MC",
      notes: "Cameraman confirmed the midnight window."
    },
    props: ["Veil", "Bow ties", "Test cards"],
    music: { track: "Oczepiny mix", playlist: "Midnight" },
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
  vipRadarCount: VIP_ALERTS.length,
  tact_and_vip_alerts: VIP_ALERTS,
  jokersCount: 3,
  hardAnchors: [
    { id: "photo_video", time: "20:30", label: "Photo / Video Leaves", alertBeforeMin: 45 },
    { id: "sunset", time: "21:10", label: "Sunset Window", alertBeforeMin: 30 },
    { id: "ocsepiny", time: "00:00", label: "Oczepiny (Exact)", alertBeforeMin: 30 }
  ],
  musicPolicy: {
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
        stepId: "step_04",
        plannedTime: "19:30",
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
  contacts: [
    {
      id: "photo_video",
      role: "Photo / Video",
      name: "Magda & Tomek",
      phone: "+48 600 000 000",
      email: "photo@studio.example",
      leavesAt: "20:30",
      notes: "Group photo before 20:15; leaves with the video team at the hard anchor."
    },
    {
      id: "dj_mark",
      role: "DJ",
      name: "DJ Mark",
      phone: "+48 600 444 444",
      email: "dj@example.com",
      notes: "Booth on the left; silent pings enabled."
    },
    {
      id: "venue_manager",
      role: "Venue manager",
      name: "Anna Kowalska",
      phone: "+48 600 111 111",
      email: "anna@venue.example",
      notes: "Key holder; service entrance at the back."
    }
  ],
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
  preWeddingTodos: [
    { task: "Confirm Test Wiedzy questions with witnesses", done: true },
    { task: "Check XLR cables at 16:15", done: false },
    { task: "Confirm the Instax cameras and guestbook are packed", done: false }
  ],
  steps: [
    { id: "step_01", time: "16:30", durationMin: 30, title: "Aperitif in Garden", type: "BUFFER", location: "Garden", buffer: { minDurationMin: 15, maxDurationMin: 45 }, dj: { playlist: "Garden Aperitif", track: "La Vie en Rose — Édith Piaf" } },
    { id: "step_02", time: "17:00", durationMin: 60, title: "Outdoor Civil Ceremony", type: "ELASTIC", location: "Garden Gazebo", dj: { playlist: "Ceremony Procession", track: "Canon in D — Pachelbel", cutoff: "18:20" } },
    { id: "step_03", time: "18:00", realStart: "18:25", planned: "18:00", durationMin: 90, title: "Hall Entrance, Toast & Dinner Start", type: "ELASTIC", location: "Main Hall", photographerCue: "Group photo before the toast", dj: { playlist: "Dinner Jazz", track: "Fly Me to the Moon — Frank Sinatra", cutoff: "20:15", cutoffSec: 3600 }, teleprompter: HALL_ENTRANCE_SCRIPT },
    { id: "step_04", time: "19:30", durationMin: 30, title: "Buffets Open & Dance Floor", type: "BUFFER", location: "Main Hall", deferable: true, buffer: { minDurationMin: 10, maxDurationMin: 60, danceBlock: true }, dj: { playlist: "Dance Floor Block", track: "September — Earth, Wind & Fire", cutoffSec: 1800 } },
    { id: "step_05", time: "20:30", durationMin: 30, title: "Cake & Sparklers", type: "HARD_ANCHOR", location: "Terrace", dj: { playlist: "Party Set", track: "Dancing Queen — ABBA", cutoff: "21:30" }, teleprompter: TEST_WIEDZY_GAME }
  ]
};

const SUBTASKS = [
  "Parents' thank-you speech + gifts (with mic)",
  "Rosół + Tartare with Vodka shot",
  "Speeches between starter and main course"
];

// Demo cartridge starting mid-evening, as it would after a couple of taps.
// `WeddingSchema v1.1` shape: `live_sync_state`. Actual starts are stored as
// full ISO datetimes (TODO 23); HH:MM display is derived from them.
const INITIAL_LIVE_STATE = {
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

function buildInitialLiveState(wedding) {
  const base = wedding.liveSyncState ?? {};
  const preWedding = Object.fromEntries(
    (wedding.preWeddingTodos ?? []).map((todo) => [todo.task, todo.done])
  );
  return {
    ...base,
    checked_subtasks: {
      ...preWedding,
      ...(base.checked_subtasks ?? {})
    }
  };
}

const DEFAULT_WEDDING = {
  ...DEMO_WEDDING,
  liveSyncState: INITIAL_LIVE_STATE,
  steps: DEMO_WEDDING.steps.map((step) =>
    step.id === "step_03" ? { ...step, subTasks: SUBTASKS } : step
  )
};
const STORED_CARTRIDGE = loadActiveCartridge();
const ACTIVE_WEDDING = STORED_CARTRIDGE ?? DEFAULT_WEDDING;
const HAS_STORED_CARTRIDGE = Boolean(STORED_CARTRIDGE);

// Venue date/timezone drive ISO migration, clock display and day rollover.
const EVENT_DATE_ISO = resolveEventDateISO(ACTIVE_WEDDING);
const VENUE_TIME_ZONE = resolveVenueTimeZone(ACTIVE_WEDDING);

// Production `/deck/` uses per-role PINs validated by the join_room Edge
// Function. Local/demo mode keeps the DDMM display-PIN gate.
const SYNC_CONFIG = getSyncConfig();
const IS_PRODUCTION = SYNC_CONFIG.isProduction;
const DECK_INTENT =
  typeof window !== 'undefined'
    ? parseDeckIntent(window.location.pathname, window.location.search, import.meta.env.BASE_URL)
    : { roomCode: null, role: null };

const STEP_TYPE_STYLES = {
  ELASTIC: "text-white bg-brand border-brand-strong",
  BUFFER: "text-cyan-200 bg-cyan-950/70 border-cyan-800",
  HARD_ANCHOR: "text-alert-tint bg-alert/20 border-alert/60"
};

export default function App() {
  const WEDDING = ACTIVE_WEDDING;
  const [roleSession, setRoleSession] = useState(() =>
    IS_PRODUCTION ? loadRoleSession() : null,
  );
  const sessionValid = IS_PRODUCTION && isRoleSessionValid(roleSession);
  const pairing = usePairing({ expectedPin: WEDDING.syncPin, weddingId: WEDDING.weddingId });
  const { role, setRole } = useRole();
  // The actor role is logged in mutation entries; production uses the token role.
  const actorRole = IS_PRODUCTION ? roleSession?.role ?? 'mc' : role;
  const {
    liveState,
    markCurrentDone,
    undoLastStep,
    canUndo,
    lastUndo,
    toggleSubtask,
    sendStagePing,
    addManualOffset,
    clearManualOffset,
    swapWithNext,
    deferToJokerDrawer,
    restoreDeferredStep,
    selectSpeech,
    savedLocally,
    syncStatus,
    syncConfigured,
    syncError,
    remoteUpdatedAt,
    serverTimeOffsetMs,
    serverTimeAvailable,
  } = useLiveStageState({
    steps: WEDDING.steps,
    weddingId: WEDDING.weddingId,
    // D7: the room is keyed by the weddingId, never the DDMM PIN.
    roomId: IS_PRODUCTION ? roleSession?.weddingId ?? null : WEDDING.weddingId,
    initialLiveState: buildInitialLiveState(WEDDING),
    eventDateISO: EVENT_DATE_ISO,
    timeZone: VENUE_TIME_ZONE,
    accessToken: sessionValid ? roleSession.token : null,
    requireToken: IS_PRODUCTION,
    role: actorRole,
  });
  // Per-device theme (TODO 27): Night Stage default, Daylight for outdoor glare.
  const { theme, toggleTheme } = useTheme();
  // D4: the host/MC device decrypts sensitive notes with its local host key.
  const sensitiveNotes = useSensitiveNotes({
    enabled: IS_PRODUCTION && sessionValid && roleSession?.role === 'mc',
    wedding: WEDDING,
    weddingId: roleSession?.weddingId ?? WEDDING.weddingId,
    accessToken: sessionValid ? roleSession.token : null,
  });
  // One shared ticking clock for every view (P0.6). Recomputing the drift
  // report from `now` keeps overruns, anchors and cutoffs live.
  const now = useEventClock({ serverTimeOffsetMs });
  const [overlay, setOverlay] = useState(null);
  const [controlNotice, setControlNotice] = useState('');
  const [undoToast, setUndoToast] = useState(null);
  const [importerOpen, setImporterOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  // Offline cache for the speaker script (the active id is synced separately).
  const [cachedSpeakerSpeech] = useState(() => loadSpeakerScript(ACTIVE_WEDDING.weddingId));
  const [cartridgeError, setCartridgeError] = useState(null);
  const closeOverlay = () => setOverlay(null);
  const handleRoleChange = (next) => {
    setOverlay(null);
    setRole(next);
  };

  // Production: after the role PIN is accepted, fetch the role-scoped cartridge
  // from the room. A cartridge cached for another wedding does not count.
  const hasMatchingCartridge =
    HAS_STORED_CARTRIDGE &&
    (!IS_PRODUCTION || ACTIVE_WEDDING.weddingId === roleSession?.weddingId);
  const needsProductionCartridge = IS_PRODUCTION && sessionValid && !hasMatchingCartridge;
  useEffect(() => {
    if (!needsProductionCartridge) return undefined;

    let cancelled = false;
    const client = createSupabaseSyncClient(SYNC_CONFIG, {
      accessToken: roleSession.token,
    });

    client
      .fetchWedding(roleSession.weddingId)
      .then((row) => {
        if (cancelled) return;
        if (!row?.cartridge) throw new Error('The server has no cartridge for this room.');
        if (!saveActiveCartridge(row.cartridge)) {
          throw new Error('The published cartridge is missing required fields.');
        }
        window.location.reload();
      })
      .catch((error) => {
        if (!cancelled) setCartridgeError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [needsProductionCartridge, roleSession]);

  if (IS_PRODUCTION && !sessionValid) {
    return (
      <RoleJoinScreen
        intent={DECK_INTENT}
        theme={theme}
        onToggleTheme={toggleTheme}
        onJoined={(session) => {
          saveRoleSession(session);
          setRoleSession(session);
        }}
      />
    );
  }

  if (needsProductionCartridge) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-4 text-center text-slate-100">
        <div className="max-w-sm rounded-2xl border border-line bg-card p-6 shadow-2xl">
          <div className="text-3xl" aria-hidden="true">
            {cartridgeError ? '⚠️' : '🎧'}
          </div>
          <h1 className="mt-2 font-heading text-lg font-bold text-white">
            {cartridgeError ? 'Could not load this wedding' : 'Loading wedding…'}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {cartridgeError ??
              'Fetching the role-scoped cartridge for this room. No wedding data is cached until it arrives.'}
          </p>
          {cartridgeError ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg border border-brand-strong bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-hover"
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (!IS_PRODUCTION && !pairing.isPaired) {
    return (
      <>
        <PairingScreen
          wedding={WEDDING}
          onPair={pairing.pair}
          cloudConfigured={syncConfigured}
          theme={theme}
          onToggleTheme={toggleTheme}
          onImport={() => setImporterOpen(true)}
        />
        <CartridgeImporter
          key={importerOpen ? 'importer-open' : 'importer-closed'}
          open={importerOpen}
          onClose={() => setImporterOpen(false)}
          currentCartridge={WEDDING}
        />
      </>
    );
  }

  const handleUnpair = () => {
    if (IS_PRODUCTION) {
      const confirmed = window.confirm(
        'Sign out of this role? You will need the role PIN to rejoin.'
      );
      if (!confirmed) return;
      clearRoleSession();
      setRoleSession(null);
      return;
    }
    const confirmed = window.confirm(
      "Forget the room PIN on this device? Timeline progress stays saved locally."
    );
    if (confirmed) pairing.unpair();
  };

  const availableRoles = availableRoleIds(WEDDING.hostingMode);
  // Production: the role token fixes this device to exactly one role. Switching
  // requires signing out and joining with another role's PIN.
  const roleIds = IS_PRODUCTION ? [roleSession.role] : availableRoles;
  const currentRole = IS_PRODUCTION
    ? roleSession.role
    : roleIds.includes(role)
      ? role
      : "mc";
  const showDjCues = availableRoles.includes("dj");

  const steps = activeSteps(WEDDING.steps, liveState);
  const manualOffset = liveState.manual_offset_minutes ?? 0;
  const vipAlerts =
    sensitiveNotes.payload?.vipAlerts ?? WEDDING.tact_and_vip_alerts ?? [];
  const jokerCount = WEDDING.jokersCount ?? WEDDING.jokerGames?.length ?? 0;
  const contacts = resolveContacts({
    ...WEDDING,
    contacts: sensitiveNotes.payload?.contacts ?? WEDDING.contacts,
  });
  const driftReport = buildDriftReport(steps, liveState, {
    jokerAvailable: jokerCount > 0,
    hardAnchors: WEDDING.hardAnchors,
    manualOffsetMinutes: manualOffset,
    now,
    eventDateISO: EVENT_DATE_ISO,
    timeZone: VENUE_TIME_ZONE,
    serverTimeOffsetMs,
    serverTimeAvailable,
  });
  const { entries: timeline, activeEntry: currentEntry, nextEntry } = driftReport;
  const activeIndex = timeline.findIndex((entry) => entry.isActive);
  const cakeProtocol = resolveCakeProtocol(WEDDING, timeline, activeIndex);
  const musicPolicy = resolveMusicPolicy(WEDDING, now, {
    eventDateISO: EVENT_DATE_ISO,
    timeZone: VENUE_TIME_ZONE,
  });
  const speeches = resolveSpeeches(WEDDING);
  const speechMode = resolveSpeechMode(WEDDING, speeches);
  const activeSpeech = resolveActiveSpeech(speeches, liveState.active_speech_id);
  // If the cartridge is unavailable but the active speech id is still known,
  // show the cached copy on this speaker device instead of a blank screen.
  const speakerSpeech =
    activeSpeech ??
    (cachedSpeakerSpeech && cachedSpeakerSpeech.id === liveState.active_speech_id
      ? cachedSpeakerSpeech
      : null);
  const currentStep = currentEntry?.step ?? null;
  const completedCount = driftReport.completedCount;
  const isComplete = !currentStep;
  const realStart = currentEntry?.projectedStart ?? null;
  const estimatedEnd = currentEntry?.projectedEnd ?? null;
  const stepTypeClass = currentStep ? STEP_TYPE_STYLES[currentStep.type] ?? STEP_TYPE_STYLES.ELASTIC : '';
  const script = currentStep?.teleprompter?.type === "SPEECH" ? currentStep.teleprompter : null;
  const game = currentStep?.teleprompter?.type === "GAME_QUESTIONS" ? currentStep.teleprompter : null;
  const stepSubtasks = currentStep?.subTasks ?? [];
  const deferTarget = findDeferTarget(WEDDING.steps, liveState);
  const deferredSteps = WEDDING.steps.filter((step) =>
    liveState.deferred_step_ids?.includes(step.id),
  );

  // P0.7: block hard anchors, warn on photographer cues.
  const swapBlock = swapBlockReason(currentStep, nextEntry?.step ?? null);
  const swapWarn = swapNeedsWarning(currentStep, nextEntry?.step ?? null);
  const notifyUndo = (label) => setUndoToast({ id: Date.now(), label });

  const handleAddOffset = () => {
    addManualOffset(15);
    setControlNotice("Kitchen / vendor +15m offset applied.");
    notifyUndo('Manual offset +15m');
  };
  const handleClearOffset = () => {
    clearManualOffset();
    setControlNotice("Manual offset cleared.");
    notifyUndo('Manual offset cleared');
  };
  const handleSwap = () => {
    if (!currentStep || !nextEntry || swapBlock) return;
    if (
      swapWarn &&
      !window.confirm(
        'One of these steps carries a photographer cue. Swap anyway? The vendor may be waiting for that moment.',
      )
    ) {
      return;
    }
    setControlNotice(`Swapped ${currentStep.title} with ${nextEntry.step.title}.`);
    swapWithNext();
    notifyUndo('Swapped steps');
  };
  const handleDefer = () => {
    if (!deferTarget) return;
    setControlNotice(`Deferred ${deferTarget.title} to the Joker Drawer.`);
    deferToJokerDrawer();
    notifyUndo('Deferred to Joker Drawer');
  };
  const handleRestore = (stepId) => {
    const step = WEDDING.steps.find((candidate) => candidate.id === stepId);
    restoreDeferredStep(stepId);
    setControlNotice(`Restored ${step?.title ?? "block"} from the Joker Drawer.`);
    notifyUndo('Restored block');
  };
  const handleAdvance = () => {
    markCurrentDone();
    setControlNotice('Step marked done.');
    notifyUndo('Step completed');
  };
  const handleUndo = () => {
    if (!canUndo) return;
    undoLastStep();
    setUndoToast(null);
    setControlNotice('Last action undone.');
  };
  const handleOpenAnchor = (anchorElementId) => {
    setContactsOpen(false);
    window.setTimeout(() => {
      document
        .getElementById(anchorElementId)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const handleWipeEvent = async () => {
    if (IS_PRODUCTION && roleSession?.role === 'mc') {
      const client = createSupabaseSyncClient(SYNC_CONFIG, {
        accessToken: roleSession.token,
      });
      await client.wipeRoom();
    }
    clearActiveCartridge();
    pairing.unpair();
    clearRoleSession();
    clearStoredHostKey();
    clearSpeakerScript(WEDDING.weddingId);
    window.location.reload();
  };

  const roleProps = {
    role: currentRole,
    roles: roleIds,
    onRoleChange: handleRoleChange
  };

  if (currentRole === "dj") {
    return (
      <DjBoothView
        wedding={WEDDING}
        timeline={timeline}
        projectedFinish={driftReport.projectedFinish}
        clock={driftReport.clock}
        drift={driftReport.drift}
        musicPolicy={musicPolicy}
        stagePing={liveState.stage_ping}
        syncStatus={syncStatus}
        syncError={syncError}
        remoteUpdatedAt={remoteUpdatedAt}
        servicePackage={WEDDING.servicePackage}
        viewVisibility={WEDDING.viewVisibility?.dj}
        theme={theme}
        onToggleTheme={toggleTheme}
        {...roleProps}
      />
    );
  }

  if (currentRole === "photo") {
    return (
      <PhotographerView
        wedding={WEDDING}
        timeline={timeline}
        clock={driftReport.clock}
        stagePing={liveState.stage_ping}
        hardAnchors={WEDDING.hardAnchors}
        syncStatus={syncStatus}
        syncError={syncError}
        remoteUpdatedAt={remoteUpdatedAt}
        theme={theme}
        onToggleTheme={toggleTheme}
        {...roleProps}
      />
    );
  }

  if (currentRole === "speaker") {
    return (
      <SpeakerView
        wedding={WEDDING}
        clock={driftReport.clock}
        speechMode={speechMode}
        speechCount={speeches.length}
        activeSpeech={speakerSpeech}
        activeSpeechId={liveState.active_speech_id}
        fromCache={!activeSpeech && Boolean(speakerSpeech)}
        syncStatus={syncStatus}
        syncError={syncError}
        remoteUpdatedAt={remoteUpdatedAt}
        theme={theme}
        onToggleTheme={toggleTheme}
        canExit={!IS_PRODUCTION}
        onExit={() => handleRoleChange("mc")}
      />
    );
  }

  if (currentRole === "pocket") {
    return (
      <>
        <PocketRemoteView
          wedding={WEDDING}
          timeline={timeline}
          clock={driftReport.clock}
          drift={driftReport.drift}
          cake={cakeProtocol}
          musicPolicy={musicPolicy}
          theme={theme}
          onToggleTheme={toggleTheme}
          onAdvance={handleAdvance}
          onUndo={handleUndo}
          canUndo={canUndo}
          canAdvance={!isComplete}
          onOpenScript={() => setOverlay("teleprompter")}
          hasScript={Boolean(script)}
          syncStatus={syncStatus}
          syncError={syncError}
          remoteUpdatedAt={remoteUpdatedAt}
          {...roleProps}
        />
        {overlay === "teleprompter" && (
          <TeleprompterOverlay open step={currentStep} onClose={closeOverlay} />
        )}
        <UndoToast
          toast={undoToast}
          onUndo={handleUndo}
          onDismiss={() => setUndoToast(null)}
        />
      </>
    );
  }

  return (
    <>
      <div className="h-screen bg-page text-slate-100 font-body flex flex-col justify-between select-none overflow-hidden antialiased">
      
      {/* ================= TOP BAR ================= */}
      <header className="bg-card border-b border-line px-4 py-3 flex flex-wrap items-center justify-between text-xs font-heading tracking-wide">
        <div className="flex items-center space-x-4">
          <div className="bg-white px-3 py-1.5 rounded-lg shadow-md flex items-center justify-center">
            <img 
              src={logo} 
              alt="Weselny Żabojad" 
              className="h-20 w-auto object-contain max-w-[260px]" 
            />
          </div>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="bg-raised px-3 py-1.5 rounded text-white font-mono font-semibold border border-line-strong text-sm">{realStart ?? "—"}</span>
          <DriftPill drift={driftReport.drift} />
          <CoupleIdentity wedding={WEDDING} className="text-xs" />
        </div>

        <div className="flex flex-wrap items-center gap-2 my-2 sm:my-0">
          <CulturalRulesBar rules={WEDDING.culturalRules} />
          <button
            type="button"
            onClick={() => setOverlay("vip")}
            title="Open confidential VIP & tactful family alerts"
            className="bg-alert/20 border border-alert/60 text-alert-soft px-2.5 py-1 rounded font-semibold cursor-pointer hover:bg-alert/30 active:bg-alert/40 transition"
          >
            🚨 VIP Radar ({vipAlerts.length})
          </button>
          <span className="bg-brand/40 border border-brand-strong text-brand-soft px-2.5 py-1 rounded cursor-pointer hover:bg-brand/60 transition">🃏 Jokers ({jokerCount})</span>
          <button
            type="button"
            onClick={() => setImporterOpen(true)}
            title="Import a WeddingSchema v1.1 cartridge"
            className="rounded border border-line-strong bg-raised px-2.5 py-1 font-semibold text-slate-200 transition hover:bg-line"
          >
            📥 Import
          </button>
          <button
            type="button"
            onClick={() => setContactsOpen(true)}
            title="Open the vendor contacts directory"
            className="rounded border border-line-strong bg-raised px-2.5 py-1 font-semibold text-slate-200 transition hover:bg-line"
          >
            📇 Contacts ({contacts.length})
          </button>
        </div>

        <div className="flex items-center space-x-3 font-mono">
          <button
            type="button"
            onClick={handleUnpair}
            title={
              IS_PRODUCTION
                ? 'Sign out of this role'
                : 'Paired room PIN — click to forget this device'
            }
            className="text-slate-400 hover:text-white transition"
          >
            {IS_PRODUCTION ? (
              <>
                ROLE: <strong className="text-white">{roleSession.role.toUpperCase()}</strong>
                <span className="ml-1 text-[10px]">🔐</span>
              </>
            ) : (
              <>
                PIN: <strong className="text-white">{pairing.pin}</strong>
                <span className="ml-1 text-[10px]">🔓</span>
              </>
            )}
          </button>
          <span className="text-slate-500">•</span>
          <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} />
          {roleIds.length > 1 ? (
            <RoleSwitcher role={currentRole} roles={roleIds} onChange={handleRoleChange} />
          ) : null}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {driftReport.hardAnchorRadar.hasWarning ? (
        <HardAnchorAlertBanner radar={driftReport.hardAnchorRadar} />
      ) : null}

      {/* ================= MAIN DASHBOARD (70% / 30% SPLIT) ================= */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-10 gap-4 p-4 overflow-y-auto">
        
        {/* ACTIVE STEP (70% Width -> 7 cols on lg) */}
        <section className="lg:col-span-7 bg-card/95 border border-line rounded-xl p-4 flex flex-col justify-between shadow-xl relative">
          {currentStep ? (
            <div className="flex-1 min-h-0 flex flex-col justify-between">
              <div>
                {/* Step Header & Timing */}
                <div className="flex items-center justify-between border-b border-line pb-2.5 mb-3">
                  <div>
                    <span className={`text-xs uppercase tracking-wider font-heading font-semibold px-2.5 py-1 rounded border ${stepTypeClass}`}>
                      {currentStep.type.replace("_", " ")} STEP
                    </span>
                    <h1 className="text-2xl font-heading font-bold text-white mt-2">{currentStep.title}</h1>
                    <div className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                      <span>📍 Location: <strong className="text-slate-200">{currentStep.location}</strong></span>
                    </div>
                  </div>
                  <div className="text-right bg-page/80 p-3 rounded-lg border border-line">
                    <div className="text-xs text-slate-400">Planned: <span className="line-through text-slate-500">{currentStep.planned || currentStep.time}</span></div>
                    <div className="text-sm font-mono text-white font-semibold mt-0.5">Real Start: {realStart}</div>
                    <div className="text-xs text-slate-300 mt-0.5">Est. End: {estimatedEnd ?? "—"}</div>
                  </div>
                </div>

                <div className={`grid grid-cols-1 gap-4 my-3 ${showDjCues ? "md:grid-cols-2" : ""}`}>
                  {/* MC Cues */}
                  <div className="bg-page/60 p-3.5 rounded-lg border border-line">
                    <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-alert"></span>
                      <span>🗣️ MC Cues (FR / PL / EN)</span>
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start space-x-2">
                        <span className="text-brand-soft font-mono text-xs mt-0.5">[FR/PL]</span>
                        <span>Inform guests: NO Sto Lat tonight!</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-brand-soft font-mono text-xs mt-0.5">[FR]</span>
                        <span>Explain Polish Steak Tartare + Vodka tradition.</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-brand-soft font-mono text-xs mt-0.5">[ALL]</span>
                        <span>Announce Instax + Guestbook + 1st Anniv Bottle.</span>
                      </li>
                    </ul>
                  </div>

                  {/* DJ / Audio Cues (hidden in HOST_ONLY mode) */}
                  {showDjCues && (
                    <div className="bg-page/60 p-3.5 rounded-lg border border-line">
                      <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
                        <span>🎧 DJ / Audio Cues</span>
                      </h3>
                      <ul className="space-y-2 text-sm text-slate-300">
                        <li className="flex items-start space-x-2">
                          <span className="text-cyan-400 font-mono text-xs mt-0.5">🎵</span>
                          <span>{currentStep.dj?.playlist ?? "Background dinner music"} ({currentStep.dj?.track ?? "playlist active"}).</span>
                        </li>
                        <li className="text-xs text-slate-400 bg-card p-2 rounded border border-line mt-2">
                          ⚡ Remote Stage Ping Ready: <span className="text-white font-mono">Synced to DJ Booth View</span>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Catering & Sub-Tasks */}
                {stepSubtasks.length > 0 ? (
                  <div className="mt-4 bg-page/70 p-3.5 rounded-lg border border-line">
                  <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider mb-2">📋 Catering & Sub-Tasks (Tap to check off)</h3>
                  <div className="space-y-2">
                    {stepSubtasks.map((task) => {
                      const checked = Boolean(liveState.checked_subtasks[task]);
                      return (
                        <div 
                          key={task} 
                          onClick={() => toggleSubtask(task)}
                          className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition ${checked ? 'bg-brand/30 border border-brand/60 text-slate-200' : 'bg-card border border-line text-slate-300 hover:border-line-strong'}`}
                        >
                          <input 
                            type="checkbox" 
                            checked={checked} 
                            onChange={() => {}} 
                            className="w-4 h-4 rounded text-brand bg-page border-slate-700 focus:ring-brand"
                          />
                          <span className={`text-sm ${checked ? 'line-through text-slate-400' : ''}`}>{task}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                ) : null}
              </div>

              {/* Launch overlays for the active step */}
              <div className="mt-4 pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {script && (
                    <button
                      type="button"
                      onClick={() => setOverlay("teleprompter")}
                      className="bg-raised hover:bg-line text-slate-200 px-4 py-2 rounded-lg text-xs font-heading font-semibold transition border border-line-strong"
                    >
                      📖 Open Teleprompter / Script
                    </button>
                  )}
                  {game && (
                    <button
                      type="button"
                      onClick={() => setOverlay("game")}
                      className="bg-brand/40 hover:bg-brand/70 text-white px-4 py-2 rounded-lg text-xs font-heading font-semibold transition border border-brand-strong"
                    >
                      🎮 Game Clicker ({game.items.length} Qs)
                    </button>
                  )}
                  {!script && !game && (
                    <span className="text-xs text-slate-500 font-mono">No script attached to this step.</span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono">Step {currentEntry.index + 1} of {steps.length}</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <div className="text-5xl mb-3">🎉</div>
              <span className="text-xs uppercase tracking-widest text-emerald-300 font-heading font-semibold">Event complete</span>
              <h1 className="text-2xl font-heading font-bold text-white mt-2">All {steps.length} steps marked done</h1>
              <p className="text-sm text-slate-400 mt-2 max-w-md">
                Progress is saved on this device. Use Undo in the footer if you advanced by mistake.
              </p>
              <div className="mt-4 text-xs font-mono text-slate-400">{completedCount} / {steps.length} completed</div>
            </div>
          )}
        </section>

        {/* PEEK NEXT & HARD ANCHOR RADAR (30% Width -> 3 cols on lg) */}
        <section className="lg:col-span-3 flex flex-col space-y-4">
          
          <ReelClock clock={driftReport.clock} />

          {/* Peek Next */}
          <div className="bg-card/95 border border-line rounded-xl p-4 shadow-lg">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-heading font-semibold">PEEK NEXT</span>
            {nextEntry ? (
              <>
                <div className="text-lg font-heading font-bold text-white mt-1">{nextEntry.step.title}</div>
                <div className="text-xs font-mono mt-1">
                  <span className="text-slate-500 line-through">{nextEntry.plannedStart}</span>
                  <span className="mx-1 text-slate-500">→</span>
                  <span className="text-white">{nextEntry.projectedStart}</span>
                  {nextEntry.projectedDriftMinutes ? (
                    <span
                      className={`ml-2 font-semibold ${
                        nextEntry.projectedDriftMinutes > 0 ? 'text-alert-soft' : 'text-emerald-300'
                      }`}
                    >
                      {nextEntry.driftLabel}
                    </span>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400 mt-1">No further steps — event complete.</div>
            )}
          </div>

          <CakeCard cake={cakeProtocol} />

          <MusicPolicyCard policy={musicPolicy} compact />

          <BufferAccordionCard accordion={driftReport.bufferAccordion} />

          <JokerDrawerCard steps={deferredSteps} onRestore={handleRestore} />

          <PreWeddingChecklistCard
            tasks={WEDDING.preWeddingTodos ?? []}
            checked={liveState.checked_subtasks}
            onToggle={toggleSubtask}
          />

          <EventAdminCard
            wedding={WEDDING}
            isProduction={IS_PRODUCTION}
            hostKey={sensitiveNotes.hostKey}
            sensitiveStatus={sensitiveNotes.status}
            onWipe={handleWipeEvent}
          />

          <SpeechesCard
            wedding={WEDDING}
            mode={speechMode}
            speeches={speeches}
            activeSpeechId={liveState.active_speech_id}
            onSelect={selectSpeech}
            clock={driftReport.clock}
          />

          <HardAnchorRadar radar={driftReport.hardAnchorRadar} />

          {/* Silent Stage Pings to DJ (hidden in HOST_ONLY mode) */}
          {showDjCues && (
            <StagePingControls
              onSend={sendStagePing}
              lastPing={liveState.stage_ping}
              syncStatus={syncStatus}
            />
          )}

        </section>

      </main>

      {/* ================= BOTTOM BAR (DRIFT CONTROLS & PRIMARY ACTION) ================= */}
      <footer className="bg-card border-t border-line px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        
        {/* Drift & Sequence Controls */}
        <div className="flex items-center space-x-2 overflow-x-auto py-1">
          <span className="text-xs font-heading font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">Drift Controls:</span>
          <button
            type="button"
            onClick={handleAddOffset}
            disabled={isComplete}
            title="Add 15 minutes to the upcoming kitchen / vendor block"
            className={`px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap shadow border ${
              isComplete
                ? "bg-card text-slate-600 border-line cursor-not-allowed"
                : "bg-raised hover:bg-line border-line-strong text-white"
            }`}
          >
            ⏱️ Kitchen / Vendor +15m
          </button>
          {manualOffset > 0 ? (
            <span
              title="Manual kitchen / vendor offset applied to upcoming blocks"
              className="flex items-center gap-1 rounded-lg border border-amber-800 bg-amber-950/70 px-2.5 py-1.5 font-mono text-[10px] whitespace-nowrap text-amber-200"
            >
              +{manualOffset}m offset
              <button
                type="button"
                onClick={handleClearOffset}
                title="Clear manual offset"
                aria-label="Clear manual offset"
                className="rounded px-1 text-sm leading-none text-amber-300 hover:bg-amber-900/60 hover:text-white"
              >
                ×
              </button>
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleSwap}
            disabled={!nextEntry || Boolean(swapBlock)}
            title={
              swapBlock ??
              (nextEntry ? `Swap ${currentStep?.title} with ${nextEntry.step.title}` : "No next step to swap")
            }
            className={`px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap shadow border ${
              !nextEntry || swapBlock
                ? "bg-card text-slate-600 border-line cursor-not-allowed"
                : "bg-raised hover:bg-line border-line-strong text-slate-200"
            }`}
          >
            🔀 Swap w/ Next
          </button>
          <button
            type="button"
            onClick={handleDefer}
            disabled={!deferTarget}
            title={
              deferTarget
                ? `Defer ${deferTarget.title} to the Joker Drawer`
                : "No safe deferable block (anchors and photographer-cue steps are protected)"
            }
            className={`px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap shadow border ${
              !deferTarget
                ? "bg-card text-slate-600 border-line cursor-not-allowed"
                : driftReport.canonicalDriftMinutes >= 45
                  ? "bg-amber-950/60 hover:bg-amber-900/60 border-amber-700 text-amber-200"
                  : "bg-raised hover:bg-line border-line-strong text-brand-soft"
            }`}
          >
            🃏 Defer to Joker Drawer
          </button>
          {controlNotice ? (
            <span
              aria-live="polite"
              title={controlNotice}
              className="max-w-[240px] truncate rounded-lg border border-line-strong bg-raised px-2.5 py-1.5 text-[10px] text-slate-300"
            >
              {controlNotice}
            </span>
          ) : null}
          <span
            title="Timeline progress survives tablet lock or browser refresh"
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono whitespace-nowrap border ${savedLocally ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-amber-950/70 border-amber-800 text-amber-300'}`}
          >
            {savedLocally ? "💾 Saved locally" : "⚠️ Local save unavailable"}
          </span>
        </div>

        {/* Undo + Primary Action Button */}
        <div className="flex items-center space-x-3 ml-auto">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            title={canUndo ? `Undo: ${lastUndo?.label ?? 'last action'}` : "Nothing to undo"}
            className={`px-3 py-2.5 rounded-xl text-sm font-heading font-semibold transition border ${!canUndo ? 'bg-card text-slate-600 border-line cursor-not-allowed' : 'bg-raised hover:bg-line text-slate-200 border-line-strong'}`}
          >
            ↩ Undo
          </button>
          <HoldToConfirmButton
            onConfirm={handleAdvance}
            disabled={isComplete}
            label={isComplete ? "EVENT COMPLETE ✓" : "HOLD TO ADVANCE ➔"}
            holdLabel="hold 1.2s"
            className={`px-6 py-2.5 rounded-xl text-sm font-heading font-bold transition border ${isComplete ? 'bg-card text-slate-500 border-line' : 'bg-brand hover:bg-brand-hover active:bg-brand-active text-white shadow-lg shadow-blue-950/60 border-brand-strong'}`}
          />
        </div>

      </footer>

      {overlay === "teleprompter" && (
        <TeleprompterOverlay open step={currentStep} onClose={closeOverlay} />
      )}
      {overlay === "game" && (
        <GameClickerOverlay open game={game} onClose={closeOverlay} />
      )}
      {overlay === "vip" && (
        <VipAlertsModal open alerts={vipAlerts} onClose={closeOverlay} />
      )}

      <UndoToast
        toast={undoToast}
        onUndo={handleUndo}
        onDismiss={() => setUndoToast(null)}
      />

      </div>

      <CartridgeImporter
        key={importerOpen ? 'importer-open' : 'importer-closed'}
        open={importerOpen}
        onClose={() => setImporterOpen(false)}
        currentCartridge={WEDDING}
      />

      <ContactsModal
        open={contactsOpen}
        onClose={() => setContactsOpen(false)}
        contacts={contacts}
        onOpenAnchor={handleOpenAnchor}
      />
    </>
  );
}
