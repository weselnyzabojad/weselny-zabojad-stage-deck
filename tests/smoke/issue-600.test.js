import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveSpeeches } from '../../src/lib/speeches.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #600 admin-managed speaker email', () => {
  it('allows an optional speaker email in the speeches domain', () => {
    const speaker =
      json('schema/domains/speeches.json').$defs.speech.properties.speaker.anyOf[1];
    expect(speaker.properties.email.type).toBe('string');
  });

  it('keeps the email through normalization', () => {
    const [speech] = resolveSpeeches({
      speeches: [
        {
          id: 's1',
          speaker: { name: 'Bartek', relationship: 'Best man', email: 'bartek@example.com' },
        },
      ],
    });
    expect(speech.speaker.email).toBe('bartek@example.com');
    expect(resolveSpeeches({ speeches: [{ id: 's2', speaker: 'Anna' }] })[0].speaker.email).toBeNull();
  });

  it('does not cache the email on the speaker device', () => {
    expect(read('src/lib/speakerCache.js')).not.toContain('email');
  });

  it('exposes the email input only in the admin panel', () => {
    expect(read('src/admin/AdminSpeechesPanel.jsx')).toContain('Speaker email (admin only)');
    expect(read('src/components/SpeakerView.jsx')).not.toContain('speaker.email');
  });

  it('does not map speaker email from the Google Doc template', () => {
    expect(read('schema/google-doc-template.md')).not.toContain('Speaker email');
    expect(read('src/lib/googleDocCartridge.js')).not.toContain("row['Email']");
  });
});
