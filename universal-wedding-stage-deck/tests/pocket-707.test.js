import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import CulturalRulesBar from '../src/components/CulturalRulesBar.jsx';
import LanguageToggle from '../src/components/LanguageToggle.jsx';
import RoleShell from '../src/components/RoleShell.jsx';
import SpeechesChip from '../src/components/SpeechesChip.jsx';
import ThemeToggle from '../src/components/ThemeToggle.jsx';
import TopBarCenterIdentity from '../src/components/TopBarCenterIdentity.jsx';
import { setLocale } from '../src/i18n/index.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const render = (element) => renderToStaticMarkup(element);
const wedding = {
  dateISO: '2026-11-09',
  coupleProfile: {
    bride: { firstName: 'Jennifer', nationalities: ['FR'] },
    groom: { firstName: 'Guillaume', nationalities: ['PL'] },
    commonLanguages: ['FR', 'PL'],
  },
};
const rules = { sto_lat: { status: 'YES' }, gorzko: { status: 'STRICT_NO' } };

const renderPocket = (props = {}) =>
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

describe('issue #710 pocket #707 visual polish', () => {
  it('gives the pocket header the shared #707 glass surface', () => {
    const html = renderPocket();
    expect(html).toContain('bg-panel/85');
    expect(html).toContain('border-panel-border');
    expect(html).toContain('backdrop-blur-xl');
    expect(html).toContain('shadow-sm');
  });

  it('keeps the sync state on the role badge with soft semantic tones', () => {
    const connected = renderPocket({ syncStatus: 'connected' });
    expect(connected).toContain('aria-label="MC. Sync: Cloud synced"');
    expect(connected).toContain('bg-tone-positive-bg');
    expect(connected).toContain('border-tone-positive-border');
    expect(connected).toContain('text-tone-positive-text');

    const pending = renderPocket({
      syncStatus: 'connected',
      outbox: { attempts: 1, nextAttemptAt: null, lastError: null },
    });
    expect(pending).toContain('bg-tone-negative-bg');

    const offline = renderPocket({ syncStatus: 'offline' });
    expect(offline).toContain('bg-tone-negative-bg');
    expect(offline).toContain('aria-label="MC. Sync: Offline"');
  });

  it('integrates the single-cell language and theme controls in one soft group', () => {
    const html = renderPocket();
    expect(html).toContain('bg-panel/70');
    expect(html).toContain('rounded-2xl');
    expect(html).toContain('border-l');
    expect(html).toContain('aria-label="Change interface language → Français"');
    expect(html).toContain('>EN<');
    expect(html).toContain('▾');
    expect(html).not.toContain('>FR<');
    expect(html).not.toContain('>PL<');
    expect(html).not.toContain('border-2 border-black');

    setLocale('fr', { persist: false });
    const french = renderPocket();
    expect(french).toContain('>FR<');
  });

  it('keeps text-only chips with the #707 semantic surfaces and no status chrome', () => {
    const cultural = render(
      createElement(CulturalRulesBar, {
        rules,
        oczepinyStatus: { state: 'ON' },
        compact: true,
      }),
    );
    expect(cultural).toContain('rounded-full');
    expect(cultural).toContain('bg-tone-positive-bg');
    expect(cultural).toContain('bg-tone-negative-bg');
    expect(cultural).toContain('Sto Lat');
    expect(cultural).toContain('Gorzko');
    expect(cultural).not.toContain('🎶');
    expect(cultural).not.toContain('>YES<');
    expect(cultural).not.toContain('bg-current');

    const speeches = render(
      createElement(SpeechesChip, {
        mode: 'COMPLEX',
        speeches: [{ id: 'speech_a', speaker: { name: 'Anna' } }],
        compact: true,
      }),
    );
    expect(speeches).toContain('Speeches');
    expect(speeches).toContain('bg-tone-positive-bg');
    expect(speeches).not.toContain('🗣️');
    expect(speeches).not.toContain('>COMPLEX<');
    expect(speeches).not.toContain('bg-current');
  });

  it('applies the refined identity and keeps the date hidden', () => {
    const html = render(
      createElement(TopBarCenterIdentity, {
        wedding,
        compact: true,
        showDate: false,
      }),
    );
    expect(html).toContain('Jennifer');
    expect(html).toContain('Guillaume');
    expect(html).toContain('text-base font-semibold tracking-wide text-ink');
    expect(html).toContain('rounded-full bg-raised/50 p-1');
    expect(html).toContain('bg-raised/55');
    expect(html).not.toContain('2026');
  });

  it('preserves the #705 structure and 44px controls', () => {
    const html = renderPocket();
    expect(html).not.toContain('Children expected');
    expect(html).not.toContain('Details');
    expect(html).not.toContain('aria-expanded');
    expect(html).not.toContain('Weselny');
    expect(html).not.toContain('Current time');
    expect(read('src/components/LanguageToggle.jsx')).toContain('min-h-11 min-w-11');
    expect(read('src/components/ThemeToggle.jsx')).toContain('h-11 w-11');
  });

  it('leaves desktop and join controls on their existing variants', () => {
    for (const file of [
      'src/views/McMasterView.jsx',
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/SpeakerView.jsx',
      'src/components/VenueManagerView.jsx',
    ]) {
      const source = read(file);
      expect(source, file).toContain('<UtilityControlGroup');
      expect(source, file).toContain('<LanguageToggle variant="desktop"');
    }

    expect(render(createElement(LanguageToggle))).toContain('border-2 border-black bg-white');
    expect(render(createElement(ThemeToggle, { theme: 'night' }))).toContain('border-2 border-black bg-white');
  });
});
