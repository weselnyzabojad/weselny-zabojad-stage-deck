import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #351 admin Drive Google Doc publication', () => {
  it('maps and summarizes a Google Doc in the admin preview', () => {
    const panel = read('src/admin/AdminDrivePanel.jsx');
    expect(panel).toContain('googleDocTemplateToCartridge');
    expect(panel).toContain('hashSourceText');
    expect(panel).toContain('sourceTextHash');
    expect(panel).toContain('cartridge: preview.cartridge');
    expect(panel).not.toContain('Google Doc preview is read-only');
  });

  it('publishes a Google Doc cartridge with source-hash binding', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain("source.kind === 'json'");
    expect(api).toContain('drive_google_doc');
    expect(api).toContain('sourceTextHash');
    expect(api).toContain('sha256Text');
    expect(api).toContain('drive_source_changed');
    expect(api).not.toContain("source.kind !== 'json'");
  });

  it('produces a valid cartridge from the canonical template', async () => {
    const template = read('schema/google-doc-template.md');
    const result = googleDocTemplateToCartridge(parseGoogleDocTemplate(template));
    expect(result.errors).toEqual([]);
    expect(result.cartridge.steps.length).toBeGreaterThan(0);
    expect(result.cartridge.musicPolicy.importantSongs.length).toBeGreaterThan(0);
  });

  it('keeps a completeness guard for unmapped/malformed data', () => {
    const malformed = googleDocTemplateToCartridge(parseGoogleDocTemplate(''));
    expect(malformed.errors.length).toBeGreaterThan(0);
    expect(malformed.cartridge.steps).toEqual([]);
  });
});
