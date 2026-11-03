// Prepared question bank: Test Zgodności (compatibility test).
//
// The bride and groom answer the same questions separately, then the MC reveals
// both answers. Content only: the final `games` schema/UI/parser is deferred
// (TODO 16) and must not be added to the AI converter prompt yet.
//
// Questions stay light: no family, exes, money or health. Agree the final set
// with the couple before the event.

export const TEST_ZGODNOSCI_GAME = {
  id: 'test_zgodnosci',
  kind: 'COMPATIBILITY_TEST',
  title: 'Test Zgodności',
  // Captured from the Google Doc `## GAMES` section: YES | NO | UNDECIDED.
  requested: 'UNDECIDED',
  prepared: true,
  languages: ['PL', 'FR', 'EN'],
  format: 'BRIDE_GROOM_SEPARATE_REVEAL',
  relationship: {
    standalone: false,
    anchorKind: 'OCZEPINI',
    anchorId: null,
    note:
      'Run as the Oczepini sub-event (oczepiny.testZgodnosci) or link it to one step. Do not schedule the same time twice.',
  },
  scoring: {
    mode: 'MATCHES',
    pointsPerMatch: 1,
    maxPoints: 10,
    answerMode: 'A_B',
    scoreBands: [
      {
        min: 0,
        max: 3,
        label: { PL: 'Dopiero się poznajecie', FR: 'Vous apprenez encore', EN: 'Still learning' },
        mcLine: {
          PL: 'Mamy jeszcze o czym rozmawiać przy śniadaniu!',
          FR: 'Vous avez encore des choses à découvrir au petit-déjeuner !',
          EN: 'You still have plenty to talk about over breakfast!',
        },
      },
      {
        min: 4,
        max: 6,
        label: { PL: 'Solidny duet', FR: 'Un duo solide', EN: 'A solid duo' },
        mcLine: {
          PL: 'Solidny duet — z kilkoma niespodziankami!',
          FR: 'Un duo solide — avec quelques surprises !',
          EN: 'A solid duo — with a few surprises!',
        },
      },
      {
        min: 7,
        max: 8,
        label: { PL: 'Świetne dopasowanie', FR: 'Très bonne entente', EN: 'Great match' },
        mcLine: {
          PL: 'Świetne dopasowanie! Prawie czytacie sobie w myślach.',
          FR: 'Très bonne entente ! Vous lisez presque dans les pensées.',
          EN: 'Great match! You almost read each other’s minds.',
        },
      },
      {
        min: 9,
        max: 10,
        label: { PL: 'Telepatia', FR: 'Télépathie', EN: 'Telepathic' },
        mcLine: {
          PL: 'Telepatia! Jesteście jedną drużyną w stu procentach.',
          FR: 'Télépathie ! Vous êtes une seule équipe à cent pour cent.',
          EN: 'Telepathic! You are one team, one hundred percent.',
        },
      },
    ],
  },
  questions: [
    {
      id: 'z01',
      prompt: {
        PL: 'Kto chętniej zaplanuje spontaniczny wyjazd?',
        FR: 'Qui planifie plus volontiers un voyage spontané ?',
        EN: 'Who is more likely to plan a spontaneous trip?',
      },
      options: {
        A: { PL: 'Panna Młoda', FR: 'La mariée', EN: 'The bride' },
        B: { PL: 'Pan Młody', FR: 'Le marié', EN: 'The groom' },
      },
    },
    {
      id: 'z02',
      prompt: {
        PL: 'Kto dłużej się szykuje do wyjścia?',
        FR: 'Qui prend plus de temps pour se préparer ?',
        EN: 'Who takes longer to get ready?',
      },
      options: {
        A: { PL: 'Panna Młoda', FR: 'La mariée', EN: 'The bride' },
        B: { PL: 'Pan Młody', FR: 'Le marié', EN: 'The groom' },
      },
    },
    {
      id: 'z03',
      prompt: {
        PL: 'Kto wzrusza się na filmach?',
        FR: 'Qui pleure devant un film ?',
        EN: 'Who is more likely to cry at a movie?',
      },
      options: {
        A: { PL: 'Panna Młoda', FR: 'La mariée', EN: 'The bride' },
        B: { PL: 'Pan Młody', FR: 'Le marié', EN: 'The groom' },
      },
    },
    {
      id: 'z04',
      prompt: {
        PL: 'Kto lepiej prowadzi samochód?',
        FR: 'Qui conduit le mieux ?',
        EN: 'Who is the better driver?',
      },
      options: {
        A: { PL: 'Panna Młoda', FR: 'La mariée', EN: 'The bride' },
        B: { PL: 'Pan Młody', FR: 'Le marié', EN: 'The groom' },
      },
    },
    {
      id: 'z05',
      prompt: {
        PL: 'Kto pierwszy zapomina o rocznicy?',
        FR: 'Qui oublie le premier un anniversaire ?',
        EN: 'Who is more likely to forget an anniversary?',
      },
      options: {
        A: { PL: 'Panna Młoda', FR: 'La mariée', EN: 'The bride' },
        B: { PL: 'Pan Młody', FR: 'Le marié', EN: 'The groom' },
      },
      notes: 'Keep it playful and agree the answer with the couple beforehand.',
    },
    {
      id: 'z06',
      prompt: {
        PL: 'Kto lepiej gotuje?',
        FR: 'Qui cuisine le mieux ?',
        EN: 'Who is the better cook?',
      },
      options: {
        A: { PL: 'Panna Młoda', FR: 'La mariée', EN: 'The bride' },
        B: { PL: 'Pan Młody', FR: 'Le marié', EN: 'The groom' },
      },
    },
    {
      id: 'z07',
      prompt: {
        PL: 'Kto częściej zagaduje nieznajomych?',
        FR: 'Qui engage plus souvent la conversation avec des inconnus ?',
        EN: 'Who is more likely to talk to strangers?',
      },
      options: {
        A: { PL: 'Panna Młoda', FR: 'La mariée', EN: 'The bride' },
        B: { PL: 'Pan Młody', FR: 'Le marié', EN: 'The groom' },
      },
    },
    {
      id: 'z08',
      prompt: {
        PL: 'Kto pierwszy zasypia na kanapie?',
        FR: 'Qui s’endort le premier sur le canapé ?',
        EN: 'Who is more likely to fall asleep on the sofa first?',
      },
      options: {
        A: { PL: 'Panna Młoda', FR: 'La mariée', EN: 'The bride' },
        B: { PL: 'Pan Młody', FR: 'Le marié', EN: 'The groom' },
      },
    },
    {
      id: 'z09',
      prompt: {
        PL: 'Kto pierwszy proponuje taniec?',
        FR: 'Qui propose de danser en premier ?',
        EN: 'Who is more likely to suggest a dance?',
      },
      options: {
        A: { PL: 'Panna Młoda', FR: 'La mariée', EN: 'The bride' },
        B: { PL: 'Pan Młody', FR: 'Le marié', EN: 'The groom' },
      },
    },
    {
      id: 'z10',
      prompt: {
        PL: 'Kto częściej wygrywa dyskusje?',
        FR: 'Qui gagne le plus souvent les discussions ?',
        EN: 'Who is more likely to win an argument?',
      },
      options: {
        A: { PL: 'Panna Młoda', FR: 'La mariée', EN: 'The bride' },
        B: { PL: 'Pan Młody', FR: 'Le marié', EN: 'The groom' },
      },
    },
  ],
  answerSheets: {
    bride: {
      id: 'zg_bride',
      label: { PL: 'Karta Panny Młodej', FR: 'Fiche de la mariée', EN: 'Bride answer sheet' },
      instructions: {
        PL: 'Zaznacz A lub B dla każdego pytania. Nie pokazuj nikomu.',
        FR: 'Cochez A ou B pour chaque question. Ne montrez à personne.',
        EN: 'Mark A or B for each question. Do not show anyone.',
      },
    },
    groom: {
      id: 'zg_groom',
      label: { PL: 'Karta Pana Młodego', FR: 'Fiche du marié', EN: 'Groom answer sheet' },
      instructions: {
        PL: 'Zaznacz A lub B dla każdego pytania. Nie pokazuj nikomu.',
        FR: 'Cochez A ou B pour chaque question. Ne montrez à personne.',
        EN: 'Mark A or B for each question. Do not show anyone.',
      },
    },
  },
  mcScript: {
    intro: {
      PL: 'Teraz Test Zgodności! Jennifer i Guillaume odpowiedzą osobno na te same pytania. Tam, gdzie odpowiedzi się zgadzają, zdobywają punkt. Zaczynamy!',
      FR: 'Place au Test de Compatibilité ! Jennifer et Guillaume répondent séparément aux mêmes questions. Chaque réponse identique rapporte un point. C’est parti !',
      EN: 'Time for the Compatibility Test! Jennifer and Guillaume answer the same questions separately. Every matching answer earns a point. Let’s go!',
    },
    ask: {
      PL: 'Pytanie {number}: {question}',
      FR: 'Question {number} : {question}',
      EN: 'Question {number}: {question}',
    },
    reveal: {
      PL: 'Panna Młoda wybrała {brideAnswer}, a Pan Młody {groomAnswer}. {result}',
      FR: 'La mariée a choisi {brideAnswer}, le marié {groomAnswer}. {result}',
      EN: 'The bride chose {brideAnswer}, the groom {groomAnswer}. {result}',
    },
    match: {
      PL: 'Zgodność! Punkt dla Pary Młodej.',
      FR: 'Compatibilité ! Un point pour les mariés.',
      EN: 'A match! A point for the couple.',
    },
    mismatch: {
      PL: 'Tym razem się różnicie — ale to też o was mówi!',
      FR: 'Cette fois, vous n’êtes pas d’accord — mais cela vous ressemble aussi !',
      EN: 'This time you differ — which also says something about you!',
    },
    score: {
      PL: '{points} na {max} punktów: {label}. {line}',
      FR: '{points} sur {max} : {label}. {line}',
      EN: '{points} out of {max}: {label}. {line}',
    },
    closing: {
      PL: 'Dziękujemy za tę małą grę w szczerość! Wznosimy toast za Jennifer i Guillaume.',
      FR: 'Merci pour ce petit jeu de sincérité ! Levons nos verres à Jennifer et Guillaume.',
      EN: 'Thank you for this little game of honesty! Let’s raise a glass to Jennifer and Guillaume.',
    },
  },
  props: [
    'Two printed answer sheets and pens',
    'A/B answer cards for the reveal',
    'Scoreboard or paper score sheet',
    'MC copy of the questions',
  ],
  fallback: {
    paper: {
      PL: 'Dwie wydrukowane karty (Panna/Pan Młody), pytania czytane przez MC, odpowiedzi zbierane i porównywane na papierze.',
      FR: 'Deux fiches imprimées (mariée/marié), questions lues par le MC, réponses collectées et comparées sur papier.',
      EN: 'Two printed sheets (bride/groom), questions read by the MC, answers collected and compared on paper.',
      answerSheetsIncluded: true,
    },
    noAB_Cards: {
      PL: 'Bez kart A/B: narzeczeni zapisują odpowiedzi na kartkach, a MC podnosi ręce w górę na A i B.',
      FR: 'Sans cartes A/B : les mariés écrivent leurs réponses et le MC lève la main pour A puis B.',
      EN: 'Without A/B cards: the couple writes answers and the MC raises a hand for A then B.',
    },
    deviceFailure: {
      PL: 'Cała gra działa z wydruku i tej karty — bez ekranu i bez internetu.',
      FR: 'Tout le jeu fonctionne depuis le tirage papier et cette fiche — sans écran ni internet.',
      EN: 'The whole game runs from the printed pack and this sheet — no screen or internet required.',
    },
  },
};

export default TEST_ZGODNOSCI_GAME;
