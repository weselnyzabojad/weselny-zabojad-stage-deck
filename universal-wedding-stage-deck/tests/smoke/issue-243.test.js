import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #243 remove Speaker timeline', () => {
  const speaker = read('src/components/SpeakerView.jsx');
  it('removes the timeline UI and import', () => {
    expect(speaker).not.toContain('TimelineFocusStack');
    expect(speaker).not.toContain('>Timeline<');
  });
  it('keeps the assigned speech view', () => {
    expect(speaker).toContain('Now speaking');
    expect(speaker).toContain('activeSpeech.script.text');
  });
});
