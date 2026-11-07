import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { setLocale } from '../../src/i18n/index.js';
import { OpenOnPhoneDialog } from '../../src/components/OpenOnPhoneButton.jsx';
import PairingScreen from '../../src/components/PairingScreen.jsx';

const wedding = {
  couple: 'Jennifer & Guillaume',
  date: '20.08.2026',
};

const renderQr = (locale) => {
  setLocale(locale, { persist: false });
  return renderToStaticMarkup(
    createElement(OpenOnPhoneDialog, {
      open: true,
      onClose: () => {},
      role: 'dj',
      tier: 'VIP',
      roomCode: 'abc123',
    }),
  );
};

const renderPairing = (locale) => {
  setLocale(locale, { persist: false });
  return renderToStaticMarkup(
    createElement(PairingScreen, {
      wedding,
      onPair: () => ({ ok: true }),
      cloudConfigured: true,
      theme: 'night',
      onToggleTheme: () => {},
    }),
  );
};

afterEach(() => setLocale('en', { persist: false }));

describe('issue #353 QR and PIN flow localization', () => {
  it('localizes the open-on-phone dialog', () => {
    expect(renderQr('fr')).toContain('Vue mobile');
    expect(renderQr('fr')).toContain('Ouvrir DJ VIP sur votre téléphone');
    expect(renderQr('pl')).toContain('Widok telefonu');
    expect(renderQr('pl')).toContain('Otwórz DJ VIP na telefonie');
  });

  it('localizes the local pairing screen', () => {
    const fr = renderPairing('fr');
    expect(fr).toContain('Appairage de la salle');
    expect(fr).toContain('PIN d’affichage à 4 chiffres');
    expect(fr).toContain('Appairer cet appareil');
    expect(fr).toContain('Synchronisation cloud configurée');

    const pl = renderPairing('pl');
    expect(pl).toContain('Parowanie pokoju');
    expect(pl).toContain('Sparuj to urządzenie');
    expect(pl).toContain('Synchronizacja w chmurze skonfigurowana');
  });

  it('keeps the room code and PIN digits as data', () => {
    const html = renderQr('pl');
    expect(html).toContain('/abc123/dj');
    expect(html).not.toContain('pin=');
  });

  it('keeps join-screen copy localized through t()', () => {
    const join = readJoin();
    expect(join).toContain("t('join.title')");
    expect(join).toContain("t('join.qrHint')");
  });
});

function readJoin() {
  return readFileSync(new URL('../../src/components/RoleJoinScreen.jsx', import.meta.url), 'utf8');
}
