import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canModerateSongRequests } from '../src/lib/songRequestQueue.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1021 DJ + MC guest-request bar', () => {
  it('allows DJ + MC moderation', () => {
    expect(canModerateSongRequests('dj_mc')).toBe(true);
    expect(canModerateSongRequests('mc')).toBe(true);
    expect(canModerateSongRequests('unknown')).toBe(false);
  });

  it('renders the compact bar under the header and in the compact shell', () => {
    const view = read('src/views/McMasterView.jsx');
    expect(view).toContain('role="dj_mc"');
    expect(view.match(/variant="bar"/g)).toHaveLength(2);
    expect(view).toContain('<DjSongRequestQueue');
    const secondary = view.indexOf('<SecondaryControlBar');
    const bar = view.indexOf('role="dj_mc"');
    const anchor = view.indexOf('{hasAnchorWarning ? (');
    expect(secondary).toBeGreaterThan(-1);
    expect(bar).toBeGreaterThan(secondary);
    expect(bar).toBeLessThan(anchor);
  });

  it('removes the duplicate body queue while keeping Music Policy', () => {
    const body = read('src/views/McMasterView.jsx');
    const section = body.slice(body.indexOf('aria-label="DJ VIP"'), body.indexOf('</section>', body.indexOf('aria-label="DJ VIP"')));
    expect(section).not.toContain('DjSongRequestQueue');
    expect(section).toContain('MusicPolicyCard');
  });

  it('keeps MC without DJ + MC unchanged', () => {
    const view = read('src/views/McMasterView.jsx');
    expect(view).toContain('{djMc ? (');
    expect(view).toContain('{djMc && activeMusicalSetEntry ? (');
  });
});
