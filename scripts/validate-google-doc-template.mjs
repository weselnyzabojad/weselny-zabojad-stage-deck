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
  'EVENT': ['Field', 'Your value', 'Example'],
  'COUPLE IDENTITY': ['Field', 'Your value', 'Example'],
  'LANGUAGES': ['Field', 'Your value', 'Example'],
  'DEMOGRAPHICS': ['Field', 'Your value', 'Example'],
  'CULTURAL RULES': ['Rule', 'Status', 'Example'],
  'MANDATORY STEPS': ['Field', 'Your value', 'Example'],
  'TIMELINE': ['Hour', 'Step name', 'Example values'],
  'DJ CUES': ['Step name', 'Playlist', 'Track', 'Cutoff', 'Note'],
  'NOTES': ['Step name', 'Notes'],
  'SUBTASKS': ['Step name', 'Subtask ID', 'Label', 'Done'],
  'VENUE LOGISTICS': ['Field', 'Your value', 'Example'],
  'VIEW VISIBILITY': ['Role', 'Section', 'Visible'],
  'MEDIA TEAM': ['Team ID', 'Role', 'Name', 'Phone', 'Start', 'End', 'Deliverables', 'Notes'],
  'PHOTO PLAN': ['Field', 'Your value', 'Example'],
  'IMPORTANT SONGS': [
    'Moment ID',
    'Moment',
    'Title',
    'Artist',
    'Version',
    'Source type',
    'File / Link',
    'Notes',
  ],
  'MUSIC POLICY': ['Field', 'Your value', 'Example'],
  'GUEST REQUESTS': ['Field', 'Your value', 'Example'],
  'SPEECHES': ['Field', 'Your value', 'Example'],
  'CAKE': ['Field', 'Your value', 'Example'],
  'GAMES': ['Game', 'Requested', 'Requested by', 'Languages', 'Existing questions', 'Requires photographer', 'Notes'],
  'KITCHEN': ['Course ID', 'Name', 'Time', 'Service Mode', 'Dietary notes'],
  'CEREMONY SCRIPT': ['Field', 'Your value', 'Example'],
  'WITNESSES': [
    'Witness ID',
    'Name',
    'Language',
    'Phone',
    'Email',
  ],
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
  if (!section.raw.includes('**How to fill:**')) {
    errors.push(`## ${section.marker}: missing the "How to fill" instruction line.`);
  }

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
