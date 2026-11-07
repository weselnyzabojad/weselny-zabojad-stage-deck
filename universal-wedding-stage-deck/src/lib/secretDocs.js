const SPEECH_PATTERN = /speech|mowa|discours/i;
const QUESTION_PATTERN = /zgodno|question|quiz|pytani/i;

function slug(value, fallback = 'secret') {
  return (
    String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || fallback
  );
}

function cleanLine(line) {
  return String(line ?? '')
    .replace(/^\s*#+\s*/, '')
    .replace(/^\s*[-*]\s+/, '')
    .replace(/^\s*\d+[.)]\s+/, '')
    .trim();
}

function questionLines(text) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);
  const rows = lines
    .filter((line) => line.includes('|'))
    .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean))
    .filter((cells) => cells.length >= 1)
    .map((cells) => cells[0])
    .filter((cell) => !/^[-: ]+$/.test(cell))
    .filter((cell) => !/^(question|questions|pytanie|pytania)$/i.test(cell));
  if (rows.length > 0) return [...new Set(rows)];
  return [
    ...new Set(
      lines
        .filter((line) => line.includes('?'))
        .flatMap((line) =>
          line
            .split('?')
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => `${part}?`),
        ),
    ),
  ];
}

export function parseSecretDoc({ name = '', text = '', weddingName = 'wedding' } = {}) {
  const idBase = `${slug(weddingName)}_${slug(name)}`;
  if (SPEECH_PATTERN.test(name)) {
    return {
      kind: 'speech',
      speeches: [
        {
          id: idBase,
          mode: 'COMPLEX',
          speaker: { name: 'Speaker' },
          order: 1,
          language: 'PL',
          script: {
            text: String(text ?? '').trim(),
            format: 'PLAIN',
            ready: Boolean(String(text ?? '').trim()),
            source: 'GOOGLE_DOC',
          },
          delivery: 'READ',
          readFrom: 'TABLET',
          consent: { storeScript: true },
          visibleToRoles: ['mc', 'speaker'],
        },
      ],
      questionLists: [],
    };
  }

  if (QUESTION_PATTERN.test(name)) {
    const questions = questionLines(text).map((prompt, index) => ({
      id: `${idBase}_q${index + 1}`,
      prompt,
    }));
    return {
      kind: 'questions',
      speeches: [],
      questionLists: [
        {
          id: idBase,
          title: name || 'Test zgodności',
          sourceDocId: undefined,
          status: questions.length > 0 ? 'AVAILABLE' : 'MISSING',
          questions,
        },
      ],
    };
  }

  return { kind: 'unknown', speeches: [], questionLists: [] };
}

export function summarizeSecretDocs(docs = []) {
  const speeches = [];
  const questionLists = [];
  const unknown = [];
  for (const doc of docs) {
    const parsed = parseSecretDoc(doc);
    if (parsed.kind === 'unknown') unknown.push(doc.name);
    speeches.push(...parsed.speeches);
    questionLists.push(...parsed.questionLists);
  }
  return {
    speeches,
    questionLists,
    unknown,
    empty: docs.length === 0,
    speechCount: speeches.length,
    questionCount: questionLists.reduce((total, list) => total + list.questions.length, 0),
  };
}
