import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import CulturalRulesBar from '../src/components/CulturalRulesBar.jsx';
import LanguageToggle from '../src/components/LanguageToggle.jsx';
import RoleShell from '../src/components/RoleShell.jsx';
import SpeechesChip from '../src/components/SpeechesChip.jsx';
import TopBarCenterIdentity from '../src/components/TopBarCenterIdentity.jsx';
import { setLocale } from '../src/i18n/index.js';

const render = (element) => renderToStaticMarkup(element);
const rules = {
  sto_lat: { status: 'YES' },
  gorzko: { status: 'STRICT_NO' },
};
const wedding = {
  dateISO: '2026-11-09',
  coupleProfile: {
    bride: { firstName: 'Jennifer', nationalities: ['FR'] },
    groom: { firstName: 'Guillaume', nationalities: ['PL'] },
    commonLanguages: ['FR', 'PL'],
  },
};

const renderShell = (props = {}) =>
  render(
    createElement(
      RoleShell,
      {
        compact: true,
        role: 'mc',
        wedding,
        syncStatus: 'connected',
        theme: 'night',
        onToggleTheme: () => {},
        culturalRules: rules,
        oczepinyStatus: { state: 'ON' },
        speechMode: 'COMPLEX',
        speeches: [{ id: 'speech_a', speaker: { name: 'Anna' } }],
        ...props,
      },
      createElement('div', null, 'Pocket content'),
    ),
  );

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #705 pocket top-bar rework', () => {
  it('removes Children expected and the standalone Sync control from the pocket header', () => {
    const html = renderShell();
    expect(html).not.toContain('Children expected');
    expect(html).not.toContain('Children not expected');
    expect(html).not.toContain('min-w-11 justify-center p-1.5');
  });

  it('moves the sync tone onto the role badge', () => {
    const connected = renderShell({ syncStatus: 'connected' });
    expect(connected).toContain('aria-label="MC. Sync: Cloud synced"');
    expect(connected).toContain('bg-emerald-400');
    expect(connected).toContain('>MC</span>');

    const connecting = renderShell({ syncStatus: 'connecting' });
    expect(connecting).toContain('bg-amber-400');

    const pending = renderShell({
      syncStatus: 'connected',
      outbox: { attempts: 1, nextAttemptAt: null, lastError: null },
    });
    expect(pending).toContain('bg-amber-400');

    const offline = renderShell({ syncStatus: 'offline' });
    expect(offline).toContain('bg-red-500');
    expect(offline).toContain('aria-label="MC. Sync: Offline"');
  });

  it('shows one language cell that cycles to the next locale', () => {
    const html = renderShell();
    expect(html).toContain('aria-label="Change interface language → Français"');
    expect(html).toContain('>EN<');
    expect(html).toContain('▾');
    expect(html).not.toContain('>FR<');
    expect(html).not.toContain('>PL<');

    setLocale('fr', { persist: false });
    const french = renderShell();
    expect(french).toContain('>FR<');
    expect(french).toContain('aria-label="Changer la langue de l&#x27;interface → Polski"');
    expect(french).not.toContain('>EN<');
  });

  it('removes the Détails disclosure and shows its content by default', () => {
    const html = renderShell({
      viewSwitch: createElement('button', { type: 'button' }, 'DJ view'),
      authControl: createElement('button', { type: 'button' }, 'PIN: 123456'),
    });

    expect(html).not.toContain('Details');
    expect(html).not.toContain('aria-expanded');
    expect(html).not.toContain('hidden=""');
    expect(html).toContain('Jennifer');
    expect(html).toContain('Guillaume');
    expect(html).toContain('Sto Lat');
    expect(html).toContain('Speeches');
    expect(html).toContain('DJ view');
    expect(html).toContain('PIN: 123456');
  });

  it('hides the date row but keeps couples and languages', () => {
    const pocket = render(
      createElement(TopBarCenterIdentity, { wedding, compact: true, showDate: false }),
    );
    expect(pocket).toContain('Jennifer');
    expect(pocket).toContain('Guillaume');
    expect(pocket).toContain('French');
    expect(pocket).not.toContain('Monday');
    expect(pocket).not.toContain('2026');

    const desktop = render(createElement(TopBarCenterIdentity, { wedding }));
    expect(desktop).toContain('Monday');
    expect(desktop).toContain('2026');
  });

  it('reduces pocket cultural and speeches chips to their labels', () => {
    const cultural = render(
      createElement(CulturalRulesBar, {
        rules,
        oczepinyStatus: { state: 'ON' },
        compact: true,
      }),
    );
    expect(cultural).toContain('Sto Lat');
    expect(cultural).toContain('Gorzko');
    expect(cultural).toContain('Oczepiny');
    expect(cultural).not.toContain('🎶');
    expect(cultural).not.toContain('🥃');
    expect(cultural).not.toContain('🌙');
    expect(cultural).not.toContain('>YES<');
    expect(cultural).not.toContain('>STRICT NO<');
    expect(cultural).not.toContain('bg-current');
    expect(cultural).toContain('bg-emerald-400');
    expect(cultural).toContain('bg-red-500');

    const speeches = render(
      createElement(SpeechesChip, {
        mode: 'COMPLEX',
        speeches: [{ id: 'speech_a', speaker: { name: 'Anna' } }],
        compact: true,
      }),
    );
    expect(speeches).toContain('Speeches');
    expect(speeches).not.toContain('🗣️');
    expect(speeches).not.toContain('>COMPLEX<');
    expect(speeches).not.toContain('bg-current');
  });

  it('keeps the desktop language control and chip treatment unchanged', () => {
    const language = render(createElement(LanguageToggle));
    expect(language).toContain('role="radiogroup"');
    expect(language).toContain('>EN<');
    expect(language).toContain('>FR<');
    expect(language).toContain('>PL<');

    const desktop = render(createElement(CulturalRulesBar, { rules }));
    expect(desktop).toContain('🎶');
    expect(desktop).toContain('>YES<');
    expect(desktop).toContain('>STRICT NO<');
  });
});
