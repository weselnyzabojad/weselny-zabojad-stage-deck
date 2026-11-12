import { existsSync, readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import OpenOnPhoneButton, {
  OpenOnPhoneDialog,
} from '../../src/components/OpenOnPhoneButton.jsx';
import { buildOpenOnPhoneUrl, canOpenOnPhone } from '../../src/lib/openOnPhone.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #156 Open on phone QR popup', () => {
  it('gates the button by role, tier and pocket', () => {
    expect(canOpenOnPhone({ role: 'mc' })).toBe(true);
    expect(canOpenOnPhone({ role: 'dj', tier: 'VIP' })).toBe(true);
    expect(canOpenOnPhone({ role: 'dj', tier: 'STANDARD' })).toBe(false);
    expect(canOpenOnPhone({ role: 'photo' })).toBe(true);
    expect(canOpenOnPhone({ role: 'speaker' })).toBe(true);
    expect(canOpenOnPhone({ role: 'mc', compact: true })).toBe(false);
  });

  it('builds a role-specific URL and preserves the room code', () => {
    expect(
      buildOpenOnPhoneUrl({
        origin: 'https://www.weselnyzabojad.pl',
        baseUrl: '/deck/',
        roomCode: 'abc123',
        role: 'dj',
      }),
    ).toBe('https://www.weselnyzabojad.pl/deck/abc123/dj?phone=true');

    expect(
      buildOpenOnPhoneUrl({
        origin: 'https://www.weselnyzabojad.pl',
        baseUrl: '/deck/',
        roomCode: null,
        role: 'photo',
      }),
    ).toBe('https://www.weselnyzabojad.pl/deck/?role=photo&phone=true');
  });

  it('renders no button for DJ Standard or pocket', () => {
    expect(
      renderToStaticMarkup(
        createElement(OpenOnPhoneButton, { role: 'dj', tier: 'STANDARD' }),
      ),
    ).toBe('');
    expect(
      renderToStaticMarkup(createElement(OpenOnPhoneButton, { role: 'mc', compact: true })),
    ).toBe('');
  });

  it('renders an icon + text button for eligible desktop roles', () => {
    const html = renderToStaticMarkup(
      createElement(OpenOnPhoneButton, { role: 'photo', roomCode: 'abc123' }),
    );
    expect(html).toContain('Open on phone');
    expect(html).toContain('<svg');
  });

  it('renders a role-specific QR dialog with easy close controls', () => {
    const html = renderToStaticMarkup(
      createElement(OpenOnPhoneDialog, {
        open: true,
        onClose: () => {},
        role: 'dj',
        tier: 'VIP',
        roomCode: 'abc123',
      }),
    );
    expect(html).toContain('Open DJ VIP on your phone');
    expect(html).toContain('/abc123/dj?phone=true');
    expect(html).toContain('Close overlay');
    expect(html).toContain('>Close<');
  });

  it('uses the shared modal close behavior', () => {
    const dialog = read('src/components/OpenOnPhoneButton.jsx');
    const modal = read('src/components/ModalShell.jsx');
    expect(dialog).toContain('<ModalShell');
    expect(modal).toContain("event.key === 'Escape'");
    expect(modal).toContain('event.target === event.currentTarget');
  });

  it('removes the old PhoneQRCode component', () => {
    expect(existsSync(new URL('../../src/components/PhoneQRCode.jsx', import.meta.url))).toBe(
      false,
    );
  });
});
