// Issue #1329 / decision 17.143: render the full customer Google Doc as HTML.
// Issue #1358: the generated HTML carries the landing-inspired editorial
// identity while staying self-contained for Google Drive's HTML import.
//
// The imported markdown template is the only source of sections, tables and
// scripts. Styles are inline (plus a small embedded fallback) so Google Docs
// keeps the layout even when it drops unsupported CSS properties.

import { parseGoogleDocTemplate } from './googleDocTemplate.js';
import { CLIENT_DOC_LOGO_DATA_URI } from '../assets/img/logoData.js';

export const CLIENT_TEMPLATE_PALETTE = Object.freeze({
  page: '#FBF9F5',
  card: '#FFFFFF',
  gold: '#C5A059',
  goldWash: '#F5EBD8',
  ink: '#1A1A1A',
  muted: '#6B6257',
  border: '#E4D9C8',
  wash: '#F5EFE4',
});

const BODY_FONT = "'Helvetica Neue', Arial, Helvetica, sans-serif";
const HEADING_FONT = "Georgia, 'Times New Roman', serif";
const SCRIPT_FONT = "'Courier New', Courier, monospace";

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

const SECTION_STYLE = [
  'background:#FFFFFF',
  'border:1px solid #E4D9C8',
  'border-radius:10px',
  'padding:22px 26px',
  'margin:0 0 22px',
].join(';');

const H2_STYLE = [
  `font-family:${HEADING_FONT}`,
  'font-size:15pt',
  'line-height:1.25',
  'color:#1A1A1A',
  'margin:0 0 12px',
  'padding:0 0 8px',
  'border-bottom:2px solid #C5A059',
  'letter-spacing:0.04em',
].join(';');

const H3_STYLE = [
  `font-family:${HEADING_FONT}`,
  'font-size:12pt',
  'line-height:1.3',
  'color:#1A1A1A',
  'margin:18px 0 8px',
].join(';');

const P_STYLE = [
  `font-family:${BODY_FONT}`,
  'font-size:10.5pt',
  'line-height:1.55',
  'color:#1A1A1A',
  'margin:8px 0',
].join(';');

const CALLOUT_STYLE = [
  'background:#F5EFE4',
  'border-left:4px solid #C5A059',
  'padding:10px 14px',
  'margin:0 0 14px',
  `font-family:${BODY_FONT}`,
  'font-size:10.5pt',
  'line-height:1.45',
  'color:#1A1A1A',
].join(';');

const isExampleColumn = (cell) => /^example(\s|$)/i.test(String(cell ?? '').trim());

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
  const isFieldTable = header.join('|') === 'Field|Your value|Example';
  const widths = isFieldTable ? ['28%', '42%', '30%'] : null;

  const headerCell = (cell) => {
    const example = isExampleColumn(cell);
    return [
      'background:#F5EBD8',
      'color:#1A1A1A',
      'border:1px solid #E4D9C8',
      'padding:10px 12px',
      'text-align:left',
      'vertical-align:bottom',
      'font-weight:700',
      'font-size:9.5pt',
      'line-height:1.35',
      example ? 'font-style:italic' : '',
      example ? 'color:#6B6257' : '',
    ]
      .filter(Boolean)
      .join(';');
  };

  const bodyCell = (cell, column) => {
    const example = isExampleColumn(column);
    return [
      'border:1px solid #E4D9C8',
      'padding:9px 12px',
      'text-align:left',
      'vertical-align:top',
      'font-size:9.5pt',
      'line-height:1.45',
      example ? 'background:#FCF8F1' : 'background:#FFFFFF',
      example ? 'color:#6B6257' : 'color:#1A1A1A',
      example ? 'font-style:italic' : '',
      !example && String(column).trim() === 'Your value' ? 'font-weight:600' : '',
    ]
      .filter(Boolean)
      .join(';');
  };

  return [
    `<table data-doc-table="${isFieldTable ? 'fixed-field' : 'repeating'}" style="width:100%;border-collapse:collapse;margin:12px 0 18px;background:#FFFFFF;">`,
    widths
      ? `<colgroup>${widths.map((width) => `<col style="width:${width}">`).join('')}</colgroup>`
      : '',
    `<thead><tr>${header.map((cell) => `<th style="${headerCell(cell)}">${inline(cell)}</th>`).join('')}</tr></thead>`,
    `<tbody>${body
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell, index) =>
                `<td style="${bodyCell(cell, header[index])}">${inline(cell)}</td>`,
            )
            .join('')}</tr>`,
      )
      .join('')}</tbody>`,
    '</table>',
  ].join('');
}

function renderLines(lines = [], context = {}) {
  const out = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const howTo = /^\*\*How to fill:\*\*\s*(.*)$/.exec(line);
    if (howTo) {
      out.push(
        `<div data-callout="how-to-fill" style="${CALLOUT_STYLE}"><strong style="color:#1A1A1A;">How to fill:</strong> ${inline(howTo[1])}</div>`,
      );
      index += 1;
      continue;
    }

    const fence = /^\s*```([A-Za-z0-9_-]*)\s*$/.exec(line);
    if (fence) {
      index += 1;
      const code = [];
      while (index < lines.length && !/^\s*```/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      const language = fence[1] || 'text';
      out.push(
        `<div data-script-language="${escapeHtml(language)}" style="margin:12px 0 18px;border:1px solid #E4D9C8;border-radius:8px;background:#FFFFFF;overflow:hidden;">` +
          `<div style="background:#F5EBD8;color:#6B6257;padding:7px 12px;font-family:${BODY_FONT};font-size:9pt;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(language.toUpperCase())}</div>` +
          `<pre style="margin:0;padding:14px 16px;white-space:pre-wrap;font-family:${SCRIPT_FONT};font-size:10pt;line-height:1.55;color:#1A1A1A;">${escapeHtml(code.join('\n'))}</pre>` +
          '</div>',
      );
      continue;
    }

    if (/^###\s+/.test(line)) {
      const heading = line.replace(/^###\s+/, '');
      const label =
        heading === 'Bride' && context.brideName
          ? `Bride: ${context.brideName}`
          : heading === 'Groom' && context.groomName
            ? `Groom: ${context.groomName}`
            : heading;
      out.push(`<h3 style="${H3_STYLE}">${inline(label)}</h3>`);
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
      out.push(
        `<ul style="margin:8px 0 12px 22px;padding:0;${P_STYLE}">${items
          .map((item) => `<li style="margin:4px 0;">${inline(item)}</li>`)
          .join('')}</ul>`,
      );
      continue;
    }

    out.push(`<p style="${P_STYLE}">${inline(line)}</p>`);
    index += 1;
  }
  return out.join('\n');
}

function renderCover({ brideName, groomName, venueName, venueAddress }) {
  const logoStyle = [
    'display:block',
    'max-width:210px',
    'max-height:64px',
    'width:auto',
    'height:auto',
    'object-fit:contain',
    'border:0',
  ].join(';');

  return [
    `<header data-cover="wedding-harmonogram" style="background:${CLIENT_TEMPLATE_PALETTE.page};padding:34px 40px 30px;border-bottom:2px solid ${CLIENT_TEMPLATE_PALETTE.gold};text-align:center;">`,
    '<table role="presentation" width="100%" style="width:100%;border-collapse:collapse;margin:0 0 24px;"><tbody><tr>',
    `<td style="width:50%;text-align:left;vertical-align:middle;padding:0;"><img data-cover-logo="primary" src="${CLIENT_DOC_LOGO_DATA_URI}" alt="Weselny Żabojad" style="${logoStyle}" /></td>`,
    `<td style="width:50%;text-align:right;vertical-align:middle;padding:0;"><div data-second-logo-slot="empty" aria-label="Second logo slot" style="display:inline-block;width:64px;height:64px;line-height:64px;border:1px dashed ${CLIENT_TEMPLATE_PALETTE.border};border-radius:4px;color:${CLIENT_TEMPLATE_PALETTE.muted};font-size:8pt;"></div></td>`,
    '</tr></tbody></table>',
    `<p style="margin:0 0 10px;font-family:${BODY_FONT};font-size:8.5pt;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${CLIENT_TEMPLATE_PALETTE.gold};">Wedding harmonogram</p>`,
    `<h1 style="margin:0 0 10px;font-family:${HEADING_FONT};font-size:26pt;line-height:1.15;font-weight:400;color:${CLIENT_TEMPLATE_PALETTE.ink};">${escapeHtml(brideName.trim())} &amp; ${escapeHtml(groomName.trim())}</h1>`,
    `<p style="margin:4px 0;font-family:${BODY_FONT};font-size:10.5pt;line-height:1.5;color:${CLIENT_TEMPLATE_PALETTE.ink};">Venue: ${escapeHtml(venueName.trim())}</p>`,
    `<p style="margin:4px 0;font-family:${BODY_FONT};font-size:10.5pt;line-height:1.5;color:${CLIENT_TEMPLATE_PALETTE.muted};">Address: ${escapeHtml(venueAddress.trim())}</p>`,
    '</header>',
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
  const sections = parsed.sections
    .map(
      (section) =>
        `<section data-doc-section="${escapeHtml(section.marker)}" style="${SECTION_STYLE}">\n<h2 style="${H2_STYLE}">${escapeHtml(section.marker)}</h2>\n${renderLines(section.lines, { brideName, groomName })}</section>`,
    )
    .join('\n');

  return [
    '<!doctype html>',
    '<html><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(brideName.trim())} &amp; ${escapeHtml(groomName.trim())} - Wedding harmonogram</title>`,
    '<style>body{margin:0;background:#FBF9F5;}table{border-collapse:collapse;}img{max-width:100%;}@media(max-width:640px){h1{font-size:20pt !important;}section{padding:16px !important;}}</style>',
    '</head>',
    `<body style="margin:0;padding:0;background:${CLIENT_TEMPLATE_PALETTE.page};color:${CLIENT_TEMPLATE_PALETTE.ink};font-family:${BODY_FONT};">`,
    renderCover({ brideName, groomName, venueName, venueAddress }),
    `<main style="max-width:880px;margin:0 auto;padding:26px 20px 44px;background:${CLIENT_TEMPLATE_PALETTE.page};">`,
    sections,
    '</main>',
    '</body></html>',
  ].join('\n');
}
