import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLIENT_TEMPLATE_PALETTE, renderClientTemplateHtml } from '../src/lib/clientTemplate.js';
import { CLIENT_DOC_LOGO_DATA_URI } from '../src/assets/img/logoData.js';
import { parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => parseGoogleDocTemplate(source);
const htmlFor = (source = template) =>
  renderClientTemplateHtml({
    brideName: 'Anna',
    groomName: 'Piotr',
    venueName: 'Dwór Pod Lipami',
    venueAddress: 'ul. Lipowa 12',
    template: source,
  });

describe('issue #1358 branded client Doc layout', () => {
  const html = htmlFor();
  const parsed = parse();

  it('uses the landing-inspired palette on a self-contained page', () => {
    expect(CLIENT_TEMPLATE_PALETTE).toMatchObject({
      page: '#FBF9F5',
      card: '#FFFFFF',
      gold: '#C5A059',
      ink: '#1A1A1A',
    });
    for (const color of Object.values(CLIENT_TEMPLATE_PALETTE)) {
      expect(html).toContain(color);
    }
  });

  it('renders the primary logo from an embedded data URI in the cover', () => {
    const logo = readFileSync(
      new URL('../src/assets/img/logo.png', import.meta.url),
    ).toString('base64');
    expect(CLIENT_DOC_LOGO_DATA_URI).toBe(`data:image/png;base64,${logo}`);
    expect(html).toContain('data-cover="wedding-harmonogram"');
    expect(html).toContain('data-cover-logo="primary"');
    expect(html).toContain(`src="${CLIENT_DOC_LOGO_DATA_URI}"`);
    expect(html).toContain('alt="Weselny Żabojad"');
    expect(html).toContain('max-width:210px');
    expect(html).toContain('max-height:64px');
    expect(html).toContain('object-fit:contain');
    expect(html.indexOf('data-cover-logo="primary"')).toBeLessThan(
      html.indexOf('Anna &amp; Piotr</h1>'),
    );
  });

  it('reserves an empty right-hand slot for the second logo', () => {
    expect(html).toContain('data-second-logo-slot="empty"');
    const slot = html.slice(
      html.indexOf('data-second-logo-slot="empty"'),
      html.indexOf('</td>', html.indexOf('data-second-logo-slot="empty"')),
    );
    expect(slot).not.toContain('<img');
    expect(slot).toContain('width:64px');
    expect(slot).toContain('height:64px');
  });

  it('gives every section a header, a How to fill block and its table', () => {
    const sections = html.split('data-doc-section="').slice(1);
    expect(sections).toHaveLength(parsed.sections.length);
    for (const section of parsed.sections) {
      const rendered = html.slice(
        html.indexOf(`data-doc-section="${section.marker}"`),
        html.indexOf('</section>', html.indexOf(`data-doc-section="${section.marker}"`)),
      );
      expect(rendered, section.marker).toContain('>How to fill:</strong>');
      expect(rendered, section.marker).toContain('data-callout="how-to-fill"');
    }
  });

  it('styles fixed-field tables and keeps the example column distinct', () => {
    expect(html).toContain('data-doc-table="fixed-field"');
    expect(html).toContain('background:#F5EBD8');
    expect(html).toContain('font-style:italic');
    expect(html).toContain('font-weight:600');
    expect(html).toContain('border:1px solid #E4D9C8');
    expect(html).toMatch(/<col style="width:28%">/);
    expect(html).toMatch(/<col style="width:42%">/);
    expect(html).toMatch(/<col style="width:30%">/);
  });

  it('does not render the removed ceremony scripts anywhere', () => {
    expect(html).not.toContain('data-script-language');
    expect(html).not.toContain('<pre style=');
    expect(html).not.toContain('Drodzy goście, witamy was bardzo serdecznie');
    expect(html).not.toContain('data-doc-section="CEREMONY SCRIPT"');
  });

  it('keeps every section and table header in parity with the markdown source', () => {
    for (const section of parsed.sections) {
      expect(html).toContain(`data-doc-section="${section.marker}"`);
      for (const table of section.tables) {
        for (const header of table.header) {
          expect(html, `${section.marker}: ${header}`).toContain(`>${header}</th>`);
        }
      }
    }
  });

  it('keeps the checked-in example preview in parity with the generated Doc', () => {
    const example = read('docs/examples/wedding-google-doc.example.html');
    for (const section of parsed.sections) {
      expect(example).toContain(`data-doc-section="${section.marker}"`);
      for (const table of section.tables) {
        for (const header of table.header) {
          expect(example, `${section.marker}: ${header}`).toContain(`>${header}</th>`);
        }
      }
    }
    expect(example).toContain('data-cover-logo="primary"');
    expect(example).toContain('data-second-logo-slot="empty"');
    expect(example).not.toMatch(/src="https?:/i);
  });

  it('requires no external font, script, image or network asset', () => {
    expect(html).not.toMatch(/src="https?:/i);
    expect(html).not.toMatch(/href="https?:/i);
    expect(html).not.toMatch(/url\((['"]?)https?:/i);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('@import');
    expect(html).not.toContain('fonts.googleapis');
    expect(html).not.toContain('logo.png');
  });
});
