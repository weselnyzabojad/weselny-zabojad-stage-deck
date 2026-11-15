import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #998 games badges and blocker alerts', () => {
  it('uses one badge scale with accessible state labels', () => {
    const panel = read('src/admin/AdminGamesPanel.jsx');
    expect(panel).toContain('const BADGE_BASE');
    expect(panel).toContain('aria-label={enabled ?');
    expect(panel).toContain('aria-label={`Doc requested ${value}`}');
    expect(panel).toContain('rounded-full');
  });

  it('renders the blocker as an inline alert above the Create button', () => {
    const panel = read('src/admin/AdminGamesPanel.jsx');
    const alertIndex = panel.indexOf('Create blocked by the wedding Doc.');
    const buttonIndex = panel.indexOf('Create question Doc');
    expect(alertIndex).toBeGreaterThan(-1);
    expect(buttonIndex).toBeGreaterThan(alertIndex);
    expect(panel).toContain('border-l-4 border-amber-600 bg-amber-950/40');
  });

  it('does not change the Create authorization gate', () => {
    const panel = read('src/admin/AdminGamesPanel.jsx');
    expect(panel).toContain('!creation.allowed');
    expect(panel).toContain('title={creation.allowed ? undefined : creation.error}');
  });
});
