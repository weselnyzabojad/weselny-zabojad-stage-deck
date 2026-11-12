import { describe, expect, it } from 'vitest';
import pl from '../src/i18n/pl.js';

describe('issue #718 Polish Przemowy copy', () => {
  it('uses Przemowy for the speeches chip', () => {
    expect(pl['speeches.chip']).toBe('Przemowy');
  });

  it('uses the correct grammatical form in the Speaker strings', () => {
    expect(pl['speaker.title']).toBe('Mówca · Skrypt przemowy');
    expect(pl['speaker.offTitle']).toBe('Przemowy są wyłączone');
    expect(pl['role.speaker.blurb']).toContain('przemowy');
  });
});
