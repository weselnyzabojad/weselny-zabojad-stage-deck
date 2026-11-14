import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #135 remove the Event data component', () => {
  it('deletes EventAdminCard from the codebase', () => {
    expect(
      existsSync(new URL('../../src/components/EventAdminCard.jsx', import.meta.url)),
    ).toBe(false);
  });

  it('removes the component and its wipe handler from the MC view', () => {
    const mcView = read('src/views/McMasterView.jsx');
    expect(mcView).not.toContain('EventAdminCard');
    expect(mcView).not.toContain('Event data');
    expect(mcView).not.toContain('handleWipeEvent');
    expect(mcView).not.toContain('sensitiveNotes');
  });

  it('removes the unused wipe handler from App', () => {
    expect(read('src/App.jsx')).not.toContain('handleWipeEvent');
  });
});
