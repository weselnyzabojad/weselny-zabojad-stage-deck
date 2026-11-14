// Issue #924: bilingual speech Doc template, filename and deterministic parser.
// Labels are language-neutral: SPEAKER [xx] / MC [yy].

const LABEL = /^\s*(SPEAKER|MC)\s*\[\s*([A-Za-z]{2})\s*\]\s*$/;

export function speechDocFilename({ weddingId, order, speakerName, relationship }) {
  const clean = (value) =>
    String(value ?? '')
      .replace(/[\\/:*?"<>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const id = clean(weddingId);
  if (!id) throw new Error('A wedding id is required.');
  const parts = [id, order, clean(speakerName), clean(relationship)].filter(
    (part) => part != null && String(part).trim() !== '',
  );
  return parts.join(' - ').slice(0, 180);
}

export function buildSpeechDocTemplate({
  speakerName = 'Speaker',
  relationship = '',
  speakerLanguage,
  mcLanguage,
}) {
  const sp = String(speakerLanguage ?? '').toUpperCase();
  const mc = String(mcLanguage ?? '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(sp) || !/^[A-Z]{2}$/.test(mc)) {
    throw new Error('Speaker and MC languages must be ISO 639-1 codes.');
  }
  if (sp === mc) throw new Error('Speaker and MC languages must differ.');
  return [
    `SPEAKER [${sp}]`,
    `Write ${speakerName}${relationship ? ` (${relationship})` : ''}'s paragraph here.`,
    '',
    `MC [${mc}]`,
    'Write the manual translation here.',
    '',
    `SPEAKER [${sp}]`,
    'Write the next speaker paragraph here.',
    '',
    `MC [${mc}]`,
    'Write the manual translation here.',
    '',
  ].join('\n');
}

function blocks(text) {
  const rows = String(text ?? '').split(/\r?\n/);
  const out = [];
  let current = null;
  for (const line of rows) {
    const match = LABEL.exec(line);
    if (match) {
      if (current) out.push(current);
      current = { role: match[1], lang: match[2].toUpperCase(), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) out.push(current);
  return out.map((block) => ({
    ...block,
    text: block.lines.join('\n').trim(),
  }));
}

export function parseSpeechDoc(text, {
  speakerLanguage = null,
  mcLanguage = null,
  order = null,
  requireTranslation = true,
} = {}) {
  const all = blocks(text);
  const errors = [];
  if (!all.length) {
    return { pairs: [], errors: [{ code: 'empty_doc', message: 'No SPEAKER/MC blocks found.' }] };
  }
  const expectedSpeaker = speakerLanguage ? String(speakerLanguage).toUpperCase() : null;
  const expectedMc = mcLanguage ? String(mcLanguage).toUpperCase() : null;
  if (expectedSpeaker && expectedMc && expectedSpeaker === expectedMc) {
    return {
      pairs: [],
      errors: [{ code: 'same_language', message: 'Speaker and MC languages must differ.' }],
    };
  }
  if (order != null && (!Number.isInteger(order) || order < 1)) {
    errors.push({ code: 'invalid_order', message: 'Speech order must be a positive integer.' });
  }

  const pairs = [];
  for (let index = 0; index < all.length; index += 1) {
    const block = all[index];
    if (block.role !== 'SPEAKER') {
      errors.push({
        code: 'unexpected_mc',
        message: `MC block at position ${index + 1} has no preceding SPEAKER block.`,
      });
      continue;
    }
    if (expectedSpeaker && block.lang !== expectedSpeaker) {
      errors.push({
        code: 'language_mismatch',
        message: `SPEAKER block uses ${block.lang}; expected ${expectedSpeaker}.`,
      });
    }
    if (!block.text) {
      errors.push({ code: 'empty_speaker', message: `SPEAKER block ${pairs.length + 1} is empty.` });
    }
    const next = all[index + 1];
    if (!next || next.role !== 'MC') {
      if (requireTranslation) {
        errors.push({
          code: 'missing_translation',
          message: `SPEAKER block ${pairs.length + 1} has no MC translation pair.`,
        });
      }
      pairs.push({ speaker: block.text, translation: null });
      continue;
    }
    if (expectedMc && next.lang !== expectedMc) {
      errors.push({
        code: 'language_mismatch',
        message: `MC block uses ${next.lang}; expected ${expectedMc}.`,
      });
    }
    if (!next.text) {
      errors.push({ code: 'empty_translation', message: `MC block ${pairs.length + 1} is empty.` });
    }
    pairs.push({ speaker: block.text, translation: next.text });
    index += 1;
  }

  const script = pairs
    .map((pair) => `SPEAKER:\n${pair.speaker}\n\nMC:\n${pair.translation ?? ''}`)
    .join('\n\n');
  return { pairs, script, errors };
}
