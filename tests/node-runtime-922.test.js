import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #922 Node 22 alignment', () => {
  it('declares the Node 22 range and ships .nvmrc', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.engines?.node).toBe('>=22 <23');
    expect(read('.nvmrc').trim()).toBe('22');
  });

  it('documents how to select the runtime', () => {
    const readme = read('README.md');
    expect(readme).toContain('Node 22 is required');
    expect(readme).toContain('.nvmrc');
    const local = read('docs/local-development.md');
    expect(local).toContain('Node.js 22');
    expect(local).toContain('nvm use');
  });
});
