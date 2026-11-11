import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TopBarRoleIdentity from '../../src/components/TopBarRoleIdentity.jsx';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #188 static role element', () => {
  const mc = read('src/views/McMasterView.jsx');
  const dj = read('src/components/DjBoothView.jsx');
  const photo = read('src/components/PhotographerView.jsx');
  const speaker = read('src/components/SpeakerView.jsx');
  const shell = read('src/components/RoleShell.jsx');

  it('removes the role switcher from the MC header', () => {
    expect(mc).not.toContain('RoleSwitcher');
    expect(mc).not.toContain('<RoleSwitcher');
    expect(shell).not.toContain('RoleSwitcher');
  });

  it('keeps the MC sign-out role/PIN element', () => {
    expect(mc).toContain('<RoleSignOutControl');
    expect(mc).toContain('onSignOut={handleUnpair}');
    expect(mc).toContain('role={roleSession?.role ?? currentRole ?? ');
    expect(mc).toContain('pin={pairing?.pin ?? null}');
  });

  it('adds the non-clickable role element to every companion role', () => {
    expect(dj).toContain('<TopBarRoleIdentity role={role} tier={tierLabel} />');
    expect(photo).toContain('<TopBarRoleIdentity role={role} />');
    expect(speaker).toContain('<TopBarRoleIdentity role="speaker" />');
  });

  it('renders the role element without button or switch semantics', () => {
    const html = renderToStaticMarkup(
      createElement(TopBarRoleIdentity, { role: 'photo' }),
    );
    expect(html).toContain('Role: Photo');
    expect(html).toContain('🔒');
    expect(html).not.toContain('<button');
    expect(html).toContain('Role is fixed on this device');
  });

  it('keeps the DJ service tier in the static element', () => {
    expect(
      renderToStaticMarkup(
        createElement(TopBarRoleIdentity, { role: 'dj', tier: 'VIP' }),
      ),
    ).toContain('Role: DJ VIP');
    expect(
      renderToStaticMarkup(
        createElement(TopBarRoleIdentity, { role: 'dj', tier: 'STANDARD' }),
      ),
    ).toContain('Role: DJ');
    expect(
      renderToStaticMarkup(
        createElement(TopBarRoleIdentity, { role: 'dj', tier: 'STANDARD' }),
      ),
    ).not.toContain('Standard');
  });
});
