import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderClientTemplateHtml } from '../src/lib/clientTemplate.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');

describe('issue #1371 rename client Doc to Wedding scenario', () => {
  it('renames the template heading and generated copy', () => {
    expect(template).toContain('# Wedding scenario - Google Doc template (v1.1)');
    const html = renderClientTemplateHtml({
      brideName: 'Jennifer',
      groomName: 'Guillaume',
      venueName: 'Dwór',
      venueAddress: 'Lipowa 12',
      template,
    });
    expect(html).toContain('Jennifer &amp; Guillaume - Wedding scenario</title>');
    expect(html).toContain('>Wedding scenario</p>');
    expect(html).not.toContain('Wedding harmonogram');
    expect(html).toContain('data-cover="wedding-harmonogram"');
  });

  it('renames the generated Drive filename', () => {
    const drive = read('supabase/functions/admin_drive/index.ts');
    expect(drive).toContain(
      '`Wedding scenario - ${clean(brideName)} & ${clean(groomName)} (${clean(weddingId)})`',
    );
    expect(drive).not.toContain('`Wedding harmonogram - ${clean(brideName)}');
  });

  it('keeps the checked-in example preview in sync', () => {
    const example = read('docs/examples/wedding-google-doc.example.html');
    expect(example).toContain('Jennifer &amp; Guillaume - Wedding scenario</title>');
    expect(example).toContain('>Wedding scenario</p>');
    expect(example).not.toContain('Wedding harmonogram');
  });
});
