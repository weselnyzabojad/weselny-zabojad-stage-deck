#!/usr/bin/env node
// Validates the Google Doc template against the stable section manifest.
//
// Usage:
//   node scripts/validate-google-doc-template.mjs
//   node scripts/validate-google-doc-template.mjs path/to/template.md

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SECTION_MANIFEST,
  SECTION_ORDER,
  parseGoogleDocTemplate,
  validateGoogleDocTemplate,
} from '../src/lib/googleDocTemplate.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const templatePath = process.argv[2] ?? path.join(here, '..', 'schema', 'google-doc-template.md');

const EXPECTED_TABLES = {
  'EVENT': null,
  'COUPLE IDENTITY': null,
  'LANGUAGES': null,
  'CULTURAL RULES': ['Rule', 'Status', 'Note'],
  'OCZEPINY': ['Sub-event ID', 'Title', 'Duration (min)', 'Deferable', 'Skippable'],
  'TIMELINE': [
    'Step ID',
    'Time',
    'Duration (min)',
    'Title',
    'Type',
    'Location',
    'Anchor ID',
    'Main Song Required',
    'Optional Flag',
    'Notes',
  ],
  'DJ CUES': ['Step ID', 'Playlist', 'Track', 'Cutoff', 'CutoffSec', 'Note'],
  'MC CUES': ['Step ID', 'Language', 'Timing', 'Text'],
  'SUBTASKS': ['Step ID', 'Subtask ID', 'Label', 'Done'],
  'HARD ANCHORS': ['Anchor ID', 'Time', 'Label', 'Alert before (min)', 'Kind'],
  'VENUE LOGISTICS': null,
  'VIEW VISIBILITY': ['Role', 'Section', 'Visible'],
  'MEDIA TEAM': ['Team ID', 'Role', 'Name', 'Phone', 'Start', 'End', 'Deliverables', 'Notes'],
  'PHOTO PLAN': ['Group ID', 'Label'],
  'IMPORTANT SONGS': [
    'Moment ID',
    'Moment',
    'Title',
    'Artist',
    'Version',
    'Step ID',
    'Planned time',
    'Source type',
    'File / Link',
    'Start (s)',
    'Fade out (s)',
    'Notes',
  ],
  'MUSIC POLICY': ['Song ID', 'Track', 'Note'],
  'GUEST REQUESTS': null,
  'SPEECHES': [
    'Speech ID',
    'Order',
    'Speaker',
    'Relationship',
    'Time',
    'Duration (min)',
    'Language',
    'Mic',
    'Cue',
    'Delivery',
    'Read from',
    'Consent',
    'Visible roles',
  ],
  'CAKE': null,
  'GAMES': ['Game', 'Requested', 'Requested by', 'Languages', 'Existing questions', 'Notes'],
  'VENDOR CONTACTS': ['Contact ID', 'Role', 'Name', 'Phone', 'Email', 'Leaves at', 'Notes'],
  'KITCHEN': ['Course ID', 'Name', 'Time', 'Dietary notes'],
  'VIP ALERTS': ['Alert ID', 'Tone', 'Tag', 'Title', 'Detail', 'Visibility'],
  'PRE-WEDDING TODOS': ['Todo ID', 'Task', 'Done', 'Due date', 'Owner'],
  'PRIVACY': null,
  'LIVE SYNC STATE': null,
  'EXTENSIONS': null,
};

const text = await readFile(templatePath, 'utf8');
const parsed = parseGoogleDocTemplate(text);
const { errors, warnings } = validateGoogleDocTemplate(parsed);

const found = parsed.sections.map((section) => section.marker);
if (found.join('|') !== SECTION_ORDER.join('|')) {
  const missing = SECTION_ORDER.filter((marker) => !found.includes(marker));
  const extra = found.filter((marker) => !SECTION_ORDER.includes(marker));
  if (missing.length > 0) errors.push(`Missing sections: ${missing.join(', ')}`);
  if (extra.length > 0) errors.push(`Unexpected sections: ${extra.join(', ')}`);
  errors.push('Sections are not in the canonical manifest order.');
}

for (const section of parsed.sections) {
  const expected = EXPECTED_TABLES[section.marker];
  if (expected === null) continue;
  if (!expected) continue;

  const matching = section.tables.find(
    (table) => table.header.join('|') === expected.join('|'),
  );
  if (!matching) {
    errors.push(
      `## ${section.marker}: expected table header "${expected.join(' | ')}".`,
    );
    continue;
  }
  if (matching.rows.length === 0) {
    errors.push(`## ${section.marker}: table has no example rows.`);
  }
}

if (errors.length > 0) {
  console.error(`\n✗ ${templatePath} does not match the Google Doc template conventions\n`);
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}

for (const message of warnings) console.warn(`  warning: ${message}`);
console.log(
  `✓ Google Doc template is valid (${parsed.sections.length} sections, ` +
    `${SECTION_MANIFEST.filter((section) => section.required).length} required).`,
);
