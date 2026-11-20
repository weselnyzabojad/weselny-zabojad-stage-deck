// Prepared question bank: Test Wiedzy (knowledge quiz).
//
// This is content only. The final `games` schema, UI and Google Doc parser are
// deliberately deferred (TODO 16); do not import this into the AI converter
// prompt or the cartridge validator until the schema is approved.
//
// The demo answers describe the Jennifer & Guillaume example wedding. Replace
// them with the couple's real facts before running a live game.

export const TEST_WIEDZY_GAME = {
  id: 'test_wiedzy',
  kind: 'KNOWLEDGE_QUIZ',
  title: 'Test Wiedzy',
  // Captured from the Google Doc `## GAMES` section: YES | NO | UNDECIDED.
  requested: 'UNDECIDED',
  prepared: true,
  languages: ['PL', 'FR', 'EN'],
  format: 'TWO_TEAMS_MC_LED',
  relationship: {
    standalone: true,
    anchorId: null,
    note: 'Can run in any FLEXIBLE block. Link it to a step when scheduling.',
  },
  scoring: {
    mode: 'POINTS',
    pointsPerCorrect: 1,
    maxPoints: 12,
    teams: 'Two guest teams',
    tieBreaker: {
      id: 'tb_ceremony_start',
      prompt: {
        PL: 'O której godzinie rozpoczęła się ceremonia?',
        FR: 'À quelle heure la cérémonie a-t-elle commencé ?',
        EN: 'What time did the ceremony start?',
      },
      answer: {
        PL: '17:00',
        FR: '17h00',
        EN: '17:00',
      },
    },
    prize: {
      PL: 'Butelka szampana od Pary Młodej',
      FR: 'Une bouteille de champagne offerte par les mariés',
      EN: 'A bottle of champagne from the couple',
    },
    scoreBands: [
      {
        min: 0,
        max: 4,
        label: { PL: 'Rozgrzewka', FR: 'Échauffement', EN: 'Warm-up' },
      },
      {
        min: 5,
        max: 8,
        label: { PL: 'Dobra robota', FR: 'Bon travail', EN: 'Good going' },
      },
      {
        min: 9,
        max: 12,
        label: { PL: 'Znawcy Pary Młodej', FR: 'Experts des mariés', EN: 'Couple experts' },
      },
    ],
  },
  questions: [
    {
      id: 'w01',
      prompt: {
        PL: 'Gdzie Jennifer i Guillaume poznali się po raz pierwszy?',
        FR: 'Où Jennifer et Guillaume se sont-ils rencontrés pour la première fois ?',
        EN: 'Where did Jennifer and Guillaume first meet?',
      },
      answer: {
        PL: 'Na weselu przyjaciół w Krakowie',
        FR: "Au mariage d'amis à Cracovie",
        EN: "At a friend's wedding in Kraków",
      },
    },
    {
      id: 'w02',
      prompt: {
        PL: 'Kto jako pierwszy powiedział „kocham cię”?',
        FR: 'Qui a dit « je t’aime » en premier ?',
        EN: 'Who said “I love you” first?',
      },
      answer: { PL: 'Guillaume', FR: 'Guillaume', EN: 'Guillaume' },
    },
    {
      id: 'w03',
      prompt: {
        PL: 'Kto częściej się spóźnia?',
        FR: 'Qui est le plus souvent en retard ?',
        EN: 'Who is more often late?',
      },
      answer: { PL: 'Jennifer', FR: 'Jennifer', EN: 'Jennifer' },
    },
    {
      id: 'w04',
      prompt: {
        PL: 'Jak nazywa się pies Jennifer i Guillaume?',
        FR: 'Comment s’appelle le chien de Jennifer et Guillaume ?',
        EN: 'What is the name of Jennifer and Guillaume’s dog?',
      },
      answer: { PL: 'Silvio', FR: 'Silvio', EN: 'Silvio' },
    },
    {
      id: 'w05',
      prompt: {
        PL: 'Kto się oświadczył?',
        FR: 'Qui a fait la demande ?',
        EN: 'Who proposed?',
      },
      answer: { PL: 'Guillaume', FR: 'Guillaume', EN: 'Guillaume' },
    },
    {
      id: 'w06',
      prompt: {
        PL: 'W jakim mieście Jennifer i Guillaume się zaręczyli?',
        FR: 'Dans quelle ville Jennifer et Guillaume se sont-ils fiancés ?',
        EN: 'In which city did Jennifer and Guillaume get engaged?',
      },
      answer: { PL: 'W Gdańsku', FR: 'À Gdańsk', EN: 'In Gdańsk' },
    },
    {
      id: 'w07',
      prompt: {
        PL: 'Jaka jest ulubiona polska potrawa Guillaume’a?',
        FR: 'Quel est le plat polonais préféré de Guillaume ?',
        EN: 'What is Guillaume’s favourite Polish dish?',
      },
      answer: { PL: 'Pierogi', FR: 'Les pierogi', EN: 'Pierogi' },
    },
    {
      id: 'w08',
      prompt: {
        PL: 'Z jakiego miasta pochodzi Jennifer?',
        FR: 'De quelle ville vient Jennifer ?',
        EN: 'Which city is Jennifer from?',
      },
      answer: { PL: 'Z Lyonu', FR: 'De Lyon', EN: 'Lyon' },
    },
    {
      id: 'w09',
      prompt: {
        PL: 'Kto lepiej gotuje?',
        FR: 'Qui cuisine le mieux ?',
        EN: 'Who is the better cook?',
      },
      answer: { PL: 'Jennifer', FR: 'Jennifer', EN: 'Jennifer' },
    },
    {
      id: 'w10',
      prompt: {
        PL: 'W ilu krajach byli razem?',
        FR: 'Dans combien de pays sont-ils allés ensemble ?',
        EN: 'How many countries have they visited together?',
      },
      answer: { PL: 'W dwunastu', FR: 'Douze', EN: 'Twelve' },
      notes: 'Update this number with the couple before the event.',
    },
    {
      id: 'w11',
      prompt: {
        PL: 'Jaka jest piosenka pierwszego tańca?',
        FR: 'Quelle est la chanson de leur première danse ?',
        EN: 'What is their first-dance song?',
      },
      answer: { PL: '„Perfect” — Ed Sheeran', FR: '« Perfect » — Ed Sheeran', EN: '“Perfect” — Ed Sheeran' },
    },
    {
      id: 'w12',
      prompt: {
        PL: 'Kto rządzi w domu?',
        FR: 'Qui est le chef à la maison ?',
        EN: 'Who is the boss at home?',
      },
      answer: { PL: 'Jennifer', FR: 'Jennifer', EN: 'Jennifer' },
      notes: 'Keep the tone playful; agree the answer with the couple first.',
    },
  ],
  mcScript: {
    intro: {
      PL: 'Kochani, czas na Test Wiedzy! Dwie drużyny, dwanaście pytań i butelka szampana dla zwycięzców. Zasady są proste: odpowiada kapitan drużyny, a ja liczę punkty.',
      FR: 'Chers invités, place au Test de Connaissances ! Deux équipes, douze questions et une bouteille de champagne pour les gagnants. Règle simple : le capitaine répond, je compte les points.',
      EN: 'Ladies and gentlemen, it’s time for the Knowledge Quiz! Two teams, twelve questions and a bottle of champagne for the winners. The captain answers and I keep score.',
    },
    ask: {
      PL: 'Pytanie numer {number}: {question}',
      FR: 'Question numéro {number} : {question}',
      EN: 'Question number {number}: {question}',
    },
    correct: {
      PL: 'Dobrze! Punkt dla drużyny {team}.',
      FR: 'Bonne réponse ! Un point pour l’équipe {team}.',
      EN: 'Correct! A point for team {team}.',
    },
    wrong: {
      PL: 'Niestety nie. Poprawna odpowiedź to: {answer}.',
      FR: 'Pas tout à fait. La bonne réponse est : {answer}.',
      EN: 'Not quite. The correct answer is: {answer}.',
    },
    tieBreak: {
      PL: 'Mamy remis! Pytanie dogrywkowe: {question}',
      FR: 'Égalité ! Question décisive : {question}',
      EN: 'It’s a tie! Tie-breaker question: {question}',
    },
    closing: {
      PL: 'Brawo dla zwycięzców i dla wszystkich, którzy próbowali! Nagroda trafia do drużyny {team}.',
      FR: 'Bravo aux gagnants et à tous les participants ! Le prix revient à l’équipe {team}.',
      EN: 'Bravo to the winners and everyone who played! The prize goes to team {team}.',
    },
  },
  props: [
    'Two buzzers or two clearly marked tables',
    'Printed answer key (MC copy)',
    'Scoreboard or paper score sheet',
    'Prize bottle',
  ],
  fallback: {
    paper: {
      PL: 'Wydrukuj pytania i klucz odpowiedzi. Drużyny zapisują odpowiedzi na kartkach; MC czyta pytania na głos.',
      FR: 'Imprimez les questions et le corrigé. Les équipes écrivent leurs réponses ; le MC lit les questions à voix haute.',
      EN: 'Print the questions and answer key. Teams write answers on paper; the MC reads the questions aloud.',
      answerKeyIncluded: true,
    },
    noBuzzers: {
      PL: 'Zamiast buzzerów drużyny podnoszą rękę lub kartkę z literą A/B.',
      FR: 'Sans buzzers, les équipes lèvent la main ou une carte A/B.',
      EN: 'Without buzzers, teams raise a hand or an A/B card.',
    },
    deviceFailure: {
      PL: 'Gra działa w całości z tej karty i wydruku — nie zależy od ekranu ani internetu.',
      FR: 'Le jeu fonctionne entièrement depuis cette fiche et le tirage papier — aucun écran ni internet requis.',
      EN: 'The game runs entirely from this sheet and the printed pack — no screen or internet required.',
    },
  },
};

export default TEST_WIEDZY_GAME;
