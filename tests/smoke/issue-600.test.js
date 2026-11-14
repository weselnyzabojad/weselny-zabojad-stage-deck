import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #600 admin-managed speaker email', () => {
  it('allows an optional speaker email in the legacy migration schema', () => {
    const speaker =
      json('schema/domains/speeches.json').$defs.speech.properties.speaker.anyOf[1];
    expect(speaker.properties.email.type).toBe('string');
  });

  it('does not resolve emails from the runtime cartridge model', () => {
    expect(read('src/lib/speeches.js')).not.toContain('resolveSpeeches');
    expect(read('src/lib/speeches.js')).not.toContain('email');
    expect(read('src/components/SpeakerView.jsx')).not.toContain('speaker.email');
  });

  it('keeps speaker contact metadata admin-only', () => {
    const panel = read('src/admin/AdminSpeechesPanel.jsx');
    expect(panel).toContain('Speaker name');
    expect(panel).toContain('Relationship');
    expect(read('src/components/SpeakerView.jsx')).not.toContain('speaker.email');
  });

  it('does not map speaker email from the Google Doc template', () => {
    expect(read('schema/google-doc-template.md')).not.toContain('Speaker email');
    expect(read('src/lib/googleDocCartridge.js')).not.toContain("row['Email']");
  });
});
