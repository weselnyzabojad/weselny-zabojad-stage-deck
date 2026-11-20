import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1308 initial service package in admin publish', () => {
  const dialogs = read('src/admin/AdminDialogs.jsx');
  const app = read('src/admin/AdminApp.jsx');
  const schema = JSON.parse(read('schema/wedding-schema-v1.1.json'));

  it('requires an explicit package in the publish dialog', () => {
    expect(dialogs).toContain("const SERVICE_PACKAGES = ['HOST_ONLY', 'DJ_MC', 'HOST_AND_DJ_VIP']");
    expect(dialogs).toContain('Choose a service package before publishing.');
    expect(dialogs).toContain('Choose a service package');
    expect(dialogs).toContain('onSubmit(cartridge, servicePackage)');
    expect(dialogs).toContain('!cartridgeJson.trim() || !servicePackage');
  });

  it('applies the selected package before cartridge validation', () => {
    expect(app).toContain(
      'const validation = await validateCartridge({ ...cartridge, servicePackage });',
    );
  });

  it('keeps the package required in the cartridge schema', () => {
    expect(schema.required).toContain('servicePackage');
    expect(schema.properties.servicePackage.enum).toEqual([
      'HOST_AND_DJ_VIP',
      'HOST_ONLY',
      'DJ_MC',
    ]);
  });
});
