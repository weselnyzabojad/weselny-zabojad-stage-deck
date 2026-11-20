import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDeckIntent } from '../../src/lib/sync/roleSession.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #352 QR phone PIN handoff', () => {
  it('marks QR links as requiring a PIN challenge', () => {
    expect(parseDeckIntent('/deck/abc123/mc', '?phone=true', '/deck')).toEqual({
      roomCode: 'abc123',
      role: 'mc',
      requirePin: true,
    });
    expect(parseDeckIntent('/deck/abc123/mc', '', '/deck')).toMatchObject({ requirePin: false });
    expect(parseDeckIntent('/deck/', '?role=dj&phone=true', '/deck')).toMatchObject({
      role: 'dj',
      requirePin: true,
    });
  });

  it('gates production sessions and local pairing until QR PIN succeeds', () => {
    const app = read('src/App.jsx');
    expect(app).toContain('requireQrPin');
    expect(app).toContain('isRoleSessionValid(roleSession) && !requireQrPin');
    expect(app).toContain('(!pairing.isPaired || requireQrPin)');
    expect(app).toContain('setPhoneAuthDone(true)');
  });

  it('never embeds the PIN in the QR URL', () => {
    expect(read('src/lib/openOnPhone.js')).not.toContain('pin=');
  });
});
