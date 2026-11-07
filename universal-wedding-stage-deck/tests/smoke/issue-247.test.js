import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #247 single role identity element', () => {
  for (const file of ['src/components/PhotographerView.jsx', 'src/components/SpeakerView.jsx']) {
    it(`removes duplicate role label in ${file}`, () => {
      const source = read(file);
      expect(source).not.toContain('TopBarRoleLabel');
      expect(source).toContain('<TopBarRoleIdentity');
    });
  }
});
