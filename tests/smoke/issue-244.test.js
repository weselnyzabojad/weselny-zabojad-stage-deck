import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #244 reduced Now speaking card', () => {
  const speaker = read('src/components/SpeakerView.jsx');
  it('keeps only label, name and relationship', () => {
    expect(speaker).toContain("t('speaker.nowSpeaking')");
    expect(speaker).toContain('activeSpeech.speaker.name');
    expect(speaker).toContain('activeSpeech.speaker.relationship');
  });
  it('removes timers and secondary metadata', () => {
    for (const removed of ['TimerChip', 'Starts in', 'Offline copy', 'MC introduces', 'Reads from', 'Consent pending', 'activeSpeech.cue', 'activeSpeech.mic']) {
      expect(speaker).not.toContain(removed);
    }
  });
  it('keeps the script display', () => {
    expect(speaker).toContain('activeSpeech.script.text');
  });
});
