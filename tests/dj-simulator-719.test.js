import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { djCapabilities } from '../src/lib/djCapabilities.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

describe('issue #719 DJ dev song-request simulator removal', () => {
  it('removes the simulator from both DJ layouts and the capability map', () => {
    const dj = read('src/components/DjBoothView.jsx');
    expect(dj).not.toContain('SongRequestSimulator');
    expect(dj).not.toContain('devSimulator');
    expect(djCapabilities('vip')).not.toHaveProperty('devSimulator');
  });

  it('deletes the dev component', () => {
    expect(exists('src/dev/SongRequestSimulator.jsx')).toBe(false);
  });
});
