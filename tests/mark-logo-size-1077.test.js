import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// PNG IHDR: width at byte 16, height at byte 20 (big-endian uint32).
function pngSize(path) {
  const bytes = readFileSync(new URL(`../${path}`, import.meta.url));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe('issue #1077 DJ Mark landing logo size', () => {
  it('uses a wide, tightly cropped Mark asset instead of the padded square', () => {
    const mark = pngSize('src/assets/img/dj-vip/logo_mark.png');
    const szymoniak = pngSize('src/assets/img/dj-vip/logo_szymoniak.png');
    const zaremba = pngSize('src/assets/img/dj-vip/logo_zaremba.png');
    expect(mark.width / mark.height).toBeGreaterThan(1.5);
    expect(mark.width).not.toBe(mark.height);
    expect(szymoniak.width / szymoniak.height).toBeGreaterThan(1.5);
    expect(zaremba.width / zaremba.height).toBeGreaterThan(1.5);
  });

  it('keeps one shared max-height rule for all three bundled partners', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).toContain('max-h-[60px] w-auto object-contain sm:max-h-20');
    expect(landing).toContain('BUILTIN_PARTNER_LOGOS');
    expect(landing).toContain('dj_mark: logoMark');
    expect(landing).toContain('dj_szymoniak: logoSzymoniak');
    expect(landing).toContain('dj_zaremba: logoZaremba');
  });
});
