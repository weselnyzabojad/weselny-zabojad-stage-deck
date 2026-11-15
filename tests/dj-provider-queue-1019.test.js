import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canModerateSongRequests } from '../src/lib/songRequestQueue.js';
import { djCapabilities } from '../src/lib/djCapabilities.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1019 DJ provider guest-request bar', () => {
  it('keeps moderation rights for DJ provider previews', () => {
    expect(canModerateSongRequests('dj')).toBe(true);
    expect(canModerateSongRequests('dj_mark')).toBe(true);
    expect(canModerateSongRequests('dj_szymoniak')).toBe(true);
    expect(canModerateSongRequests('mc')).toBe(true);
    expect(canModerateSongRequests('photographer')).toBe(false);
  });

  it('passes the canonical DJ role after provider preview props', () => {
    const stage = read('src/StageDeck.jsx');
    expect(stage).toContain("const djBoothProps = { ...roleProps, role: 'dj' }");
    const djBlock = stage.slice(stage.indexOf('<DjBoothView'), stage.indexOf('/>', stage.indexOf('<DjBoothView')));
    expect(djBlock).toContain('{...djBoothProps}');
    expect(djBlock).not.toContain('{...roleProps}');
  });

  it('renders the bar for VIP in wide and compact layouts only', () => {
    const view = read('src/components/DjBoothView.jsx');
    expect(view.match(/<DjSongRequestQueue/g)).toHaveLength(2);
    expect(view.match(/caps\.guestRequests/g)?.length).toBeGreaterThanOrEqual(2);
    expect(djCapabilities('vip').guestRequests).toBe(true);
    expect(djCapabilities('standard').guestRequests).toBe(false);
  });

  it('preserves the existing queue states and actions', () => {
    const queue = read('src/components/DjSongRequestQueue.jsx');
    expect(queue).toContain('notConfigured');
    expect(queue).toContain('offline');
    expect(queue).toContain('noPending');
    expect(queue).toContain('accept');
    expect(queue).toContain('decline');
  });
});
