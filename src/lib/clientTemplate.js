// Issue #1329 / decision 17.143: render the full customer Google Doc as HTML.
// The imported markdown template and the generated HTML share the canonical
// catalog, so the visible 3-column timeline cannot drift from the contract.

import { parseGoogleDocTemplate } from './googleDocTemplate.js';
import { CANONICAL_STEPS, TIMELINE_COLUMNS } from './canonicalSteps.js';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const inline = (value) =>
  escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

function renderTable(lines) {
  const rows = lines
    .filter((line) => !/^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(line))
    .map((line) =>
      line
        .replace(/^\s*\|/, '')
        .replace(/\|\s*$/, '')
        .split('|')
        .map((cell) => cell.trim()),
    );
  if (rows.length === 0) return '';
  const [header, ...body] = rows;
  return [
    '<table>',
    '<thead><tr>',
    ...header.map((cell) => `<th>${inline(cell)}</th>`),
    '</tr></thead>',
    '<tbody>',
    ...body.map(
      (row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`,
    ),
    '</tbody>',
    '</table>',
  ].join('');
}

function renderLines(lines = []) {
  const out = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (/^\s*```/.test(line)) {
      index += 1;
      const code = [];
      while (index < lines.length && !/^\s*```/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      out.push(`<pre>${escapeHtml(code.join('\n'))}</pre>`);
      continue;
    }
    if (/^###\s+/.test(line)) {
      out.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`);
      index += 1;
      continue;
    }
    if (/^\s*\|/.test(line)) {
      const tableLines = [];
      while (index < lines.length && /^\s*\|/.test(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }
      out.push(renderTable(tableLines));
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ''));
        index += 1;
      }
      out.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
      continue;
    }
    out.push(`<p>${inline(line)}</p>`);
    index += 1;
  }
  return out.join('\n');
}

function renderTimelineSection() {
  return [
    '<h2>TIMELINE</h2>',
    '<p>The timeline is a fixed catalog. Keep the canonical Step names exactly as written; change only the Hour, move rows, or delete a row to exclude that step.</p>',
    '<p>Row order is presentation-only; the parsed order is by Hour. The Example values column is reference-only and is never parsed.</p>',
    '<table>',
    `<thead><tr>${TIMELINE_COLUMNS.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>`,
    '<tbody>',
    ...CANONICAL_STEPS.map(
      (step) =>
        `<tr><td>${escapeHtml(step.exampleHour)}</td><td>${escapeHtml(step.name)}</td><td>${escapeHtml(step.exampleValues)}</td></tr>`,
    ),
    '</tbody>',
    '</table>',
  ].join('\n');
}

export function renderClientTemplateHtml({
  brideName,
  groomName,
  venueName,
  venueAddress,
  template,
} = {}) {
  const required = { brideName, groomName, venueName, venueAddress };
  const missing = Object.entries(required)
    .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
    .map(([field]) => field);
  if (missing.length > 0) {
    throw new Error(`Missing client template values: ${missing.join(', ')}`);
  }
  if (typeof template !== 'string' || !template.trim()) {
    throw new Error('A markdown template is required.');
  }

  const parsed = parseGoogleDocTemplate(template);
  const header = [
    `<h1>${escapeHtml(brideName.trim())} &amp; ${escapeHtml(groomName.trim())}</h1>`,
    `<p>Venue: ${escapeHtml(venueName.trim())}</p>`,
    `<p>Address: ${escapeHtml(venueAddress.trim())}</p>`,
  ].join('\n');
  const sections = parsed.sections
    .map((section) =>
      section.marker === 'TIMELINE'
        ? renderTimelineSection()
        : `<h2>${escapeHtml(section.marker)}</h2>\n${renderLines(section.lines)}`,
    )
    .join('\n');

  return [
    '<!doctype html>',
    '<html><head><meta charset="utf-8">',
    `<title>${escapeHtml(brideName.trim())} &amp; ${escapeHtml(groomName.trim())} - Wedding harmonogram</title>`,
    '</head><body>',
    header,
    sections,
    '</body></html>',
  ].join('\n');
}
