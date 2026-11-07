// Google Doc template conventions (project.md D8 / issue #70).
//
// The couple's harmonogram is a plain Google Doc. Stable `## SECTION` markers
// (and fixed table headers) let the importer map each part deterministically to
// a WeddingSchema v1.2 block. This module is pure: it only reads text.
//
// Status: the v1.2 schema is still a proposal. The manifest below mirrors
// `schema/wedding-schema-v1.2.proposal.md`; regenerate the template when the
// schema is frozen and approved.

export const SECTION_MANIFEST = Object.freeze([
  {
    order: 1,
    marker: 'EVENT',
    required: true,
    schemaPath: ['weddingId', 'couple', 'date', 'dateISO', 'syncPin', 'servicePackage', 'venue', 'childrenExpected'],
    purpose: 'Identity, date, room key and service package.',
  },
  {
    order: 2,
    marker: 'COUPLE IDENTITY',
    required: true,
    schemaPath: ['couple', 'coupleProfile'],
    purpose: 'Bride and groom names, nationalities and shared languages.',
  },
  {
    order: 3,
    marker: 'LANGUAGES',
    required: true,
    schemaPath: ['languages'],
    purpose: 'Content languages and their default.',
  },
  {
    order: 4,
    marker: 'CULTURAL RULES',
    required: true,
    schemaPath: ['culturalRules'],
    purpose: 'Sto Lat, Gorzko and Bread & Salt decisions (D5).',
  },
  {
    order: 5,
    marker: 'OCZEPINY',
    required: false,
    schemaPath: ['oczepiny'],
    purpose: 'Oczepini order, anchor, toss/ties and sub-events.',
  },
  {
    order: 6,
    marker: 'TIMELINE',
    required: true,
    schemaPath: ['steps'],
    purpose: 'One row per step: time, duration, type, location and notes.',
  },
  {
    order: 7,
    marker: 'DJ CUES',
    required: false,
    schemaPath: ['steps[].dj'],
    purpose: 'Playlist, track, absolute/relative cutoff and booth note per step.',
  },
  {
    order: 8,
    marker: 'MC CUES',
    required: false,
    schemaPath: ['steps[].mcCues'],
    purpose: 'Localized MC lines per step.',
  },
  {
    order: 9,
    marker: 'SUBTASKS',
    required: false,
    schemaPath: ['steps[].subTasks'],
    purpose: 'Stable-ID checklist items per step.',
  },
  {
    order: 10,
    marker: 'HARD ANCHORS',
    required: false,
    schemaPath: ['hardAnchors'],
    purpose: 'Fixed real-world deadlines and their alert window.',
  },
  {
    order: 11,
    marker: 'VENUE LOGISTICS',
    required: false,
    schemaPath: ['venueLogistics'],
    purpose: 'Address, coordinates, manager, installation, travel and hotel.',
  },
  {
    order: 12,
    marker: 'VIEW VISIBILITY',
    required: true,
    schemaPath: ['viewVisibility'],
    purpose: 'Per-role, per-section visibility matrix (D1).',
  },
  {
    order: 13,
    marker: 'MEDIA TEAM',
    required: false,
    schemaPath: ['mediaTeam'],
    purpose: 'Photo, video and drone crew with start/end windows (D2).',
  },
  {
    order: 14,
    marker: 'PHOTO PLAN',
    required: false,
    schemaPath: ['photoPlan'],
    purpose: 'Sunset source, mini session, group photos and effects (D6).',
  },
  {
    order: 15,
    marker: 'IMPORTANT SONGS',
    required: false,
    schemaPath: ['musicPolicy.importantSongs'],
    purpose: 'Fixed key moments: entrance, first dance, cake and so on.',
  },
  {
    order: 16,
    marker: 'MUSIC POLICY',
    required: false,
    schemaPath: ['musicPolicy'],
    purpose: 'Must-play, do-not-play, request window and licensing.',
  },
  {
    order: 17,
    marker: 'GUEST REQUESTS',
    required: false,
    schemaPath: ['musicPolicy.requestWindow', 'musicPolicy.requestsOpen'],
    purpose: 'Whether and when guests may request songs.',
  },
  {
    order: 18,
    marker: 'SPEECHES',
    required: false,
    schemaPath: ['speeches'],
    purpose: 'Speech plan plus verbatim script blocks.',
  },
  {
    order: 19,
    marker: 'CAKE',
    required: false,
    schemaPath: ['cake'],
    purpose: 'Cake cutting and serving protocol.',
  },
  {
    order: 20,
    marker: 'GAMES',
    required: false,
    schemaPath: ['games'],
    purpose: 'Optional games with an explicit YES / NO / UNDECIDED answer.',
  },
  {
    order: 21,
    marker: 'VENDOR CONTACTS',
    required: false,
    schemaPath: ['contacts'],
    purpose: 'Vendor directory with stable IDs and departure times.',
  },
  {
    order: 22,
    marker: 'KITCHEN',
    required: false,
    schemaPath: ['kitchen'],
    purpose: 'Courses, dietary counts, vendor meals and service anchors.',
  },
  {
    order: 23,
    marker: 'VIP ALERTS',
    required: false,
    schemaPath: ['vipAlerts'],
    purpose: 'Sensitive family/care notes (encrypted, never plaintext in logs).',
  },
  {
    order: 24,
    marker: 'PRE-WEDDING TODOS',
    required: false,
    schemaPath: ['preWeddingTodos'],
    purpose: 'Pre-flight checklist with owners and due dates.',
  },
  {
    order: 25,
    marker: 'PRIVACY',
    required: false,
    schemaPath: ['privacy'],
    purpose: 'Sensitive field list and cloud-sync encryption policy (D4).',
  },
  {
    order: 26,
    marker: 'LIVE SYNC STATE',
    required: false,
    schemaPath: ['liveSyncState'],
    purpose: 'Optional demo seed; production state is generated at runtime.',
  },
  {
    order: 27,
    marker: 'EXTENSIONS',
    required: false,
    schemaPath: ['extensions'],
    purpose: 'Forward-compatible JSON for app-specific additions.',
  },
  {
    order: 28,
    marker: 'MANDATORY STEPS',
    required: false,
    schemaPath: ['mandatorySteps'],
    purpose: 'Exact-hour first-arrival and kitchen service obligations.',
  },
]);

export const SECTION_ORDER = Object.freeze(SECTION_MANIFEST.map((section) => section.marker));
export const REQUIRED_SECTIONS = Object.freeze(
  SECTION_MANIFEST.filter((section) => section.required).map((section) => section.marker),
);
export const SECTION_BY_MARKER = Object.freeze(
  Object.fromEntries(SECTION_MANIFEST.map((section) => [section.marker, section])),
);

const MARKER_PATTERN = /^##[ \t]+(.+?)[ \t]*$/;
const SUBSECTION_PATTERN = /^###[ \t]+(.+?)[ \t]*$/;
const TABLE_SEPARATOR_PATTERN = /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/;
const KEY_VALUE_PATTERN = /^([A-Za-z][\w ./-]*?):[ \t]*(.*)$/;
const BULLET_PATTERN = /^\s*[-*][ \t]+(.*)$/;
const FENCE_PATTERN = /^\s*```([A-Za-z0-9_-]*)\s*$/;

function stripInlineMarkup(value) {
  return value
    .trim()
    .replace(/^`+|`+$/g, '')
    .replace(/^\*\*(.*)\*\*$/, '$1')
    .replace(/^__(.*)__$/, '$1')
    .replace(/^\*(.*)\*$/, '$1')
    .replace(/^_(.*)_$/, '$1')
    .trim();
}

function splitTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map((cell) => stripInlineMarkup(cell));
}

export function parseMarkdownTables(lines = []) {
  const tables = [];
  const source = Array.isArray(lines) ? lines : [];

  for (let index = 0; index < source.length; index += 1) {
    const line = source[index];
    if (!line.includes('|') || index + 1 >= source.length) continue;
    if (!TABLE_SEPARATOR_PATTERN.test(source[index + 1])) continue;

    const header = splitTableRow(line);
    if (header.length === 0 || header.some((cell) => cell.length === 0)) continue;

    const rows = [];
    let cursor = index + 2;
    while (cursor < source.length && source[cursor].includes('|') && source[cursor].trim().length > 0) {
      if (MARKER_PATTERN.test(source[cursor]) || SUBSECTION_PATTERN.test(source[cursor])) break;
      const cells = splitTableRow(source[cursor]);
      if (cells.length === header.length) {
        rows.push(Object.fromEntries(header.map((key, cellIndex) => [key, cells[cellIndex]])));
      }
      cursor += 1;
    }

    tables.push({ header, rows });
    index = cursor - 1;
  }

  return tables;
}

export function parseKeyValues(lines = []) {
  const entries = {};
  let inFence = false;

  for (const line of lines) {
    if (FENCE_PATTERN.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = KEY_VALUE_PATTERN.exec(line);
    if (!match) continue;
    entries[match[1].trim()] = stripInlineMarkup(match[2]);
  }

  return entries;
}

export function parseBullets(lines = []) {
  const bullets = [];
  let inFence = false;

  for (const line of lines) {
    if (FENCE_PATTERN.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = BULLET_PATTERN.exec(line);
    if (match) bullets.push(stripInlineMarkup(match[1]));
  }

  return bullets;
}

export function parseCodeBlocks(lines = []) {
  const blocks = [];
  let current = null;

  for (const line of lines) {
    const fence = FENCE_PATTERN.exec(line);
    if (fence) {
      if (current) {
        blocks.push({ lang: current.lang, text: current.lines.join('\n').trim() });
        current = null;
      } else {
        current = { lang: fence[1] || 'text', lines: [] };
      }
      continue;
    }
    if (current) current.lines.push(line);
  }

  return blocks;
}

function parseSubSections(lines = []) {
  const subSections = [];
  let current = null;

  for (const line of lines) {
    const match = SUBSECTION_PATTERN.exec(line);
    if (match) {
      if (current) subSections.push(current);
      current = { title: match[1].trim(), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }

  if (current) subSections.push(current);

  return subSections.map((subSection) => ({
    title: subSection.title,
    lines: subSection.lines,
    keyValues: parseKeyValues(subSection.lines),
    tables: parseMarkdownTables(subSection.lines),
    bullets: parseBullets(subSection.lines),
    codeBlocks: parseCodeBlocks(subSection.lines),
  }));
}

function makeSection(meta, startLine, lines) {
  return {
    marker: meta.marker,
    order: meta.order,
    required: meta.required,
    schemaPath: meta.schemaPath,
    purpose: meta.purpose,
    startLine,
    lines,
    raw: lines.join('\n').trim(),
    keyValues: parseKeyValues(lines),
    tables: parseMarkdownTables(lines),
    bullets: parseBullets(lines),
    codeBlocks: parseCodeBlocks(lines),
    subSections: parseSubSections(lines),
  };
}

// Split a Google Doc into its stable `## SECTION` blocks. `###` headings stay
// inside their parent section, so localized scripts and sub-event tables can be
// parsed without breaking the outer marker.
export function parseGoogleDocTemplate(text = '') {
  const normalized = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const preamble = [];
  const sections = [];
  let current = null;
  let inFence = false;

  lines.forEach((line, index) => {
    if (FENCE_PATTERN.test(line)) inFence = !inFence;

    const match = !inFence ? MARKER_PATTERN.exec(line) : null;
    if (match) {
      if (current) sections.push(makeSection(current.meta, current.startLine, current.lines));
      const marker = match[1].trim();
      const meta = SECTION_BY_MARKER[marker] ?? {
        marker,
        order: null,
        required: false,
        schemaPath: [],
        purpose: 'Unknown section',
      };
      current = { meta, startLine: index + 1, lines: [] };
      return;
    }

    if (current) current.lines.push(line);
    else preamble.push(line);
  });

  if (current) sections.push(makeSection(current.meta, current.startLine, current.lines));

  const byMarker = {};
  const duplicates = [];
  for (const section of sections) {
    if (byMarker[section.marker]) duplicates.push(section.marker);
    else byMarker[section.marker] = section;
  }

  return {
    preamble: preamble.join('\n').trim(),
    sections,
    byMarker,
    duplicates,
  };
}

export function validateGoogleDocTemplate(parsed) {
  const errors = [];
  const warnings = [];
  const sections = parsed?.sections ?? [];
  const seen = new Set();
  const unknown = [];
  const duplicates = new Set(parsed?.duplicates ?? []);
  let lastOrder = 0;
  const outOfOrder = [];

  for (const section of sections) {
    if (seen.has(section.marker)) continue;
    seen.add(section.marker);

    if (!SECTION_BY_MARKER[section.marker]) {
      const canonical = section.marker.toUpperCase();
      if (SECTION_BY_MARKER[canonical]) {
        errors.push(
          `Section marker "${section.marker}" must be uppercase (use "## ${canonical}").`,
        );
      } else {
        unknown.push(section.marker);
      }
      continue;
    }
    if (section.marker !== section.marker.toUpperCase()) {
      errors.push(`Section marker "${section.marker}" must be uppercase.`);
    }
    if (lastOrder > section.order) outOfOrder.push(section.marker);
    lastOrder = Math.max(lastOrder, section.order);
  }

  for (const marker of unknown) {
    errors.push(
      `Unknown section "## ${marker}". Use only the markers from docs/google-doc-template-conventions.md.`,
    );
  }
  for (const marker of duplicates) {
    errors.push(`Duplicate section "## ${marker}". Each marker may appear only once.`);
  }
  for (const marker of REQUIRED_SECTIONS) {
    if (!seen.has(marker)) errors.push(`Missing required section "## ${marker}".`);
  }
  if (outOfOrder.length > 0) {
    warnings.push(
      `Sections are not in the canonical order (from "## ${outOfOrder[0]}" onward). ` +
        'Parsing still works, but keep the template order for readable diffs.',
    );
  }

  return { errors, warnings };
}

export function sectionForMarker(marker) {
  return SECTION_BY_MARKER[stripInlineMarkup(marker ?? '')] ?? null;
}

export function canonicalSectionOrder() {
  return [...SECTION_ORDER];
}

function paragraphText(paragraph) {
  return (Array.isArray(paragraph?.elements) ? paragraph.elements : [])
    .map((element) => element?.textRun?.content ?? element?.autoText?.content ?? '')
    .join('')
    .replace(/\n+$/g, '');
}

function paragraphToMarkdown(paragraph) {
  const text = paragraphText(paragraph);
  const style = paragraph?.paragraphStyle?.namedStyleType ?? '';
  const heading = /^HEADING_([1-6])$/.exec(style);
  if (heading) return `${'#'.repeat(Number(heading[1]))} ${text}`.trimEnd();

  if (paragraph?.bullet) {
    const level = Math.max(0, Number(paragraph.bullet.nestingLevel) || 0);
    return `${'  '.repeat(level)}- ${text}`.trimEnd();
  }
  return text.trimEnd();
}

function tableCellText(cell) {
  return (Array.isArray(cell?.content) ? cell.content : [])
    .map((element) => (element?.paragraph ? paragraphText(element.paragraph) : ''))
    .filter((text) => text.trim().length > 0)
    .join('<br>')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>')
    .trim();
}

function tableToMarkdownLines(table) {
  const rows = Array.isArray(table?.tableRows) ? table.tableRows : [];
  if (rows.length === 0) return [];

  const cells = rows.map((row) =>
    (Array.isArray(row?.tableCells) ? row.tableCells : []).map(tableCellText),
  );
  const width = Math.max(1, ...cells.map((row) => row.length));
  const padded = cells.map((row) => [
    ...row,
    ...Array(Math.max(0, width - row.length)).fill(''),
  ]);

  const lines = [];
  padded.forEach((row, index) => {
    lines.push(`| ${row.join(' | ')} |`);
    if (index === 0) lines.push(`| ${Array(width).fill('---').join(' | ')} |`);
  });
  return lines;
}

// Convert a Google Docs API v1 `documents.get` response into the markdown-like
// text consumed by `parseGoogleDocTemplate`. This function is pure and keeps
// the deterministic section markers, table rows and bullet text intact.
export function googleDocToTemplateText(document) {
  const content = document?.body?.content;
  if (!Array.isArray(content)) return '';

  const lines = [];
  for (const element of content) {
    if (element?.paragraph) {
      lines.push(paragraphToMarkdown(element.paragraph));
    } else if (element?.table) {
      lines.push('', ...tableToMarkdownLines(element.table), '');
    } else if (element?.tableOfContents?.content) {
      for (const child of element.tableOfContents.content) {
        if (child?.paragraph) lines.push(paragraphToMarkdown(child.paragraph));
        else if (child?.table) lines.push('', ...tableToMarkdownLines(child.table), '');
      }
    } else if (element?.sectionBreak) {
      lines.push('');
    }
  }

  return lines
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

