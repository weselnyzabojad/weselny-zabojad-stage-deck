import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ChildrenExpectedBadge from '../src/components/ChildrenExpectedBadge.jsx';
import CulturalRulesBar from '../src/components/CulturalRulesBar.jsx';
import DesktopUtilityGroup from '../src/components/DesktopUtilityGroup.jsx';
import DriftPill from '../src/components/DriftPill.jsx';
import LanguageToggle from '../src/components/LanguageToggle.jsx';
import OpenOnPhoneButton from '../src/components/OpenOnPhoneButton.jsx';
import RoleSignOutControl from '../src/components/RoleSignOutControl.jsx';
import SecondaryControlBar from '../src/components/SecondaryControlBar.jsx';
import SpeechesChip from '../src/components/SpeechesChip.jsx';
import SyncStatusBadge from '../src/components/SyncStatusBadge.jsx';
import ThemeToggle from '../src/components/ThemeToggle.jsx';
import TopBarCenterIdentity from '../src/components/TopBarCenterIdentity.jsx';
import TopBarClock from '../src/components/TopBarClock.jsx';
import TopBarLogo from '../src/components/TopBarLogo.jsx';
import TopBarShell from '../src/components/TopBarShell.jsx';
import en from '../src/i18n/en.js';

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

describe('issue #707 desktop control-bar refinement', () => {
  it('uses soft glass surfaces on the shared desktop bars', () => {
    const shell = render(createElement(TopBarShell, { left: 'L', center: 'C', right: 'R' }));
    expect(shell).toContain('bg-panel/85');
    expect(shell).toContain('border-panel-border');
    expect(shell).toContain('backdrop-blur-xl');

    const bar = render(
      createElement(SecondaryControlBar, {
        left: 'left',
        center: 'center',
        right: 'right',
      }),
    );
    expect(bar).toContain('bg-panel/70');
    expect(bar).toContain('border-panel-border');
    expect(bar).toContain('backdrop-blur-xl');
  });

  it('drops the heavy logo frame and gives the clock a telemetry feel', () => {
    const logo = render(createElement(TopBarLogo));
    expect(logo).toContain('rounded-2xl');
    expect(logo).toContain('shadow-sm');
    expect(logo).not.toContain('border-2 border-black');
    expect(logo).not.toContain('shadow-md');

    const clock = render(
      createElement(TopBarClock, { clock: { nowClock: '18:09:46' } }),
    );
    expect(clock).toContain('font-mono');
    expect(clock).toContain('text-3xl');
    expect(clock).toContain('tabular-nums');
    expect(clock).toContain('tracking-[0.08em]');
  });

  it('refines the couple identity, language pills and date hierarchy', () => {
    const html = render(createElement(TopBarCenterIdentity, { wedding }));
    expect(html).toContain('text-base');
    expect(html).toContain('rounded-full bg-raised/50 p-1');
    expect(html).toContain('bg-raised/55');
    expect(html).toContain('tracking-wide text-muted');
  });

  it('keeps the pocket identity unchanged', () => {
    const html = render(
      createElement(TopBarCenterIdentity, {
        wedding,
        compact: true,
        showDate: false,
      }),
    );
    expect(html).toContain('text-2xl');
    expect(html).toContain('border-brand-strong/40 bg-brand/10');
    expect(html).not.toContain('bg-raised/55');
  });

  it('modernises the semantic chips with theme-aware tones', () => {
    const desktop = render(
      createElement(CulturalRulesBar, {
        rules: { sto_lat: { status: 'YES' }, gorzko: { status: 'STRICT_NO' } },
        oczepinyStatus: { state: 'ON' },
      }),
    );
    expect(desktop).toContain('rounded-2xl');
    expect(desktop).toContain('bg-tone-positive-bg');
    expect(desktop).toContain('bg-tone-negative-bg');
    expect(desktop).toContain('shadow-[0_0_18px_-8px_var(--tone-positive-glow)]');
    expect(desktop).toContain('shadow-[0_0_8px_currentColor]');

    const pocket = render(
      createElement(CulturalRulesBar, {
        rules: { sto_lat: { status: 'YES' }, gorzko: { status: 'STRICT_NO' } },
        oczepinyStatus: { state: 'ON' },
        compact: true,
      }),
    );
    expect(pocket).toContain('rounded-full');
    expect(pocket).toContain('bg-emerald-400');
    expect(pocket).toContain('bg-red-500');
  });

  it('keeps speeches, children and drift semantic states intact', () => {
    const speeches = render(
      createElement(SpeechesChip, {
        mode: 'COMPLEX',
        speeches: [{ id: 'speech_a', speaker: { name: 'Anna' } }],
      }),
    );
    expect(speeches).toContain('bg-tone-positive-bg');
    expect(speeches).toContain('text-tone-positive-text');

    const children = render(
      createElement(ChildrenExpectedBadge, {
        wedding: { childrenExpected: true },
        inline: true,
      }),
    );
    expect(children).toContain('bg-tone-negative-bg');
    expect(children).toContain('text-tone-negative-text');

    const drift = render(
      createElement(DriftPill, {
        drift: {
          canonicalDriftTone: 'late',
          canonicalDriftLabel: '+5 min LATE',
          canonicalDriftMinutes: 5,
        },
      }),
    );
    expect(drift).toContain('bg-tone-negative-bg');
    expect(drift).not.toContain('border-2');
  });

  it('gives Sync, PIN and Open on phone matching interactive surfaces', () => {
    const sync = render(createElement(SyncStatusBadge, { status: 'connected' }));
    expect(sync).toContain('text-tone-positive-text');
    expect(sync).toContain('<svg');
    expect(sync).toContain('backdrop-blur-sm');

    const pin = render(
      createElement(RoleSignOutControl, { pin: '2008', onSignOut: () => {} }),
    );
    expect(pin).toContain('bg-panel/80');
    expect(pin).toContain('shadow-sm');
    expect(pin).not.toContain('border-2');

    const phone = render(
      createElement(OpenOnPhoneButton, { role: 'mc', roomCode: '1234' }),
    );
    expect(phone).toContain('bg-panel/80');
    expect(phone).toContain('<svg');
  });

  it('integrates language and theme into one segmented desktop group', () => {
    const group = render(
      createElement(
        DesktopUtilityGroup,
        null,
        createElement(LanguageToggle, { variant: 'desktop' }),
        createElement(ThemeToggle, { theme: 'night', variant: 'desktop' }),
      ),
    );
    expect(group).toContain('rounded-2xl');
    expect(group).toContain('bg-panel/70');
    expect(group).toContain('border-l');
    expect(group).toContain('>EN<');
    expect(group).toContain('>FR<');
    expect(group).toContain('>PL<');
    expect(group).toContain('aria-label="');
    expect(group).not.toContain('border-2 border-black');
  });

  it('keeps the pocket and join controls on their existing palette', () => {
    const pocketLanguage = render(createElement(LanguageToggle, { variant: 'cycle' }));
    expect(pocketLanguage).toContain('border-2 border-black bg-white');
    expect(pocketLanguage).toContain('▾');

    const defaultLanguage = render(createElement(LanguageToggle));
    expect(defaultLanguage).toContain('border-2 border-black bg-white');

    const defaultTheme = render(createElement(ThemeToggle, { theme: 'night' }));
    expect(defaultTheme).toContain('border-2 border-black bg-white');

    const roleShell = read('src/components/RoleShell.jsx');
    expect(roleShell).toContain('variant="cycle"');
    expect(roleShell).not.toContain('DesktopUtilityGroup');
  });

  it('wires the integrated group into every desktop role view', () => {
    for (const file of [
      'src/views/McMasterView.jsx',
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/SpeakerView.jsx',
      'src/components/VenueManagerView.jsx',
    ]) {
      const source = read(file);
      expect(source, file).toContain('<DesktopUtilityGroup');
      expect(source, file).toContain('<LanguageToggle variant="desktop"');
      expect(source, file).toContain('variant="desktop"');
    }
    expect(read('src/views/McMasterView.jsx')).toContain('<RoleSignOutControl');
  });

  it('keeps every new visible label localized', () => {
    expect(en['language.label']).toBeTruthy();
    expect(en['language.switch']).toBeTruthy();
    expect(en['status.connected']).toBeTruthy();
  });
});
