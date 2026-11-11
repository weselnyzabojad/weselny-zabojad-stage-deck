import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RoleSignOutControl from '../src/components/RoleSignOutControl.jsx';
import en from '../src/i18n/en.js';
import fr from '../src/i18n/fr.js';
import pl from '../src/i18n/pl.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #739 remove the local forget-device action', () => {
  it('shows the local PIN as static, non-interactive text', () => {
    const html = renderToStaticMarkup(
      createElement(RoleSignOutControl, {
        isProduction: false,
        pin: '0421',
        onSignOut: () => {},
      }),
    );
    expect(html).toContain('PIN:');
    expect(html).toContain('0421');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('forgetPin');
  });

  it('keeps the production role sign-out button', () => {
    const html = renderToStaticMarkup(
      createElement(RoleSignOutControl, {
        isProduction: true,
        role: 'dj',
        onSignOut: () => {},
      }),
    );
    expect(html).toContain('<button');
    expect(html).toContain('ROLE:');
    expect(html).toContain('DJ');
  });

  it('removes the local unpair path and dead pairing code', () => {
    expect(read('src/StageDeck.jsx')).not.toContain('pairing.unpair');
    expect(read('src/StageDeck.jsx')).not.toContain('mc.confirm.forgetPin');
    expect(read('src/hooks/usePairing.js')).not.toContain('unpair');
    expect(read('src/lib/pairing.js')).not.toContain('clearPairing');
    expect(read('src/views/McMasterView.jsx')).toContain(
      'onSignOut={IS_PRODUCTION ? handleUnpair : undefined}',
    );
  });

  it('keeps the local PIN gate that unlocks the deck', () => {
    const hook = read('src/hooks/usePairing.js');
    expect(hook).toContain('candidate !== expectedPin');
    expect(hook).toContain('savePairing(record)');
    expect(hook).toContain('isPaired: Boolean(pin)');
  });

  it('removes the forget-device labels from every locale', () => {
    for (const dictionary of [en, fr, pl]) {
      expect(dictionary).not.toHaveProperty('mc.title.forgetPin');
      expect(dictionary).not.toHaveProperty('mc.confirm.forgetPin');
    }
  });
});
