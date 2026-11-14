import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROLES } from '../../src/lib/roles.js';
import { ROLE_IDS } from '../../src/admin/adminUtils.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #274 Venue Manager role', () => {
  it('registers the role in roles, admin and join', () => {
    expect(ROLES.venue_manager).toBeTruthy();
    expect(ROLE_IDS).toContain('venue_manager');
    expect(read('supabase/functions/join_room/index.ts')).toContain("'venue_manager'");
  });

  it('renders a read-only timeline and editable mandatory panel', () => {
    const view = read('src/components/VenueManagerView.jsx');
    expect(view).toContain('<TimelineFocusStack');
    expect(view).not.toContain('label="First guests arrival"');
    expect(view).toContain('venueManager.course.dinner');
    expect(view).toContain('venueManager.course.firstSupper');
    expect(view).toContain('venueManager.course.secondSupper');
    expect(view).toContain('venueManager.course.thirdSupper');
    expect(view).toContain('venueManager.cakeService');
    expect(view).toContain('KITCHEN_RETURN');
    expect(view).toContain('CUT_IN_PLACE');
    expect(view).not.toContain('HOLD TO ADVANCE');
    expect(view).not.toContain('<DriftPill');
  });

  it('supports laptop and pocket shells', () => {
    const view = read('src/components/VenueManagerView.jsx');
    expect(view).toContain('<RoleShell');
    expect(view).toContain('<TopBarShell');
    expect(view).toContain('TopBarCenterIdentity');
  });

  it('is routed in StageDeck', () => {
    expect(read('src/StageDeck.jsx')).toContain('<VenueManagerView');
  });
});
