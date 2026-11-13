import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../supabase/functions/', import.meta.url);

function functionSources(dir = ROOT.pathname.replace(/^\/([A-Za-z]:)/, '$1')) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...functionSources(path));
    else if (name === 'index.ts') out.push(readFileSync(path, 'utf8'));
  }
  return out;
}

describe('issue #855 CORS fail-closed', () => {
  it('never falls back to a wildcard and rejects unknown origins', () => {
    const sources = functionSources();

    expect(sources.length).toBeGreaterThanOrEqual(7);
    for (const source of sources) {
      expect(source).not.toContain("Deno.env.get('ALLOWED_ORIGIN') ?? '*'");
      expect(source).toContain('function originAllowed(req: Request)');
      expect(source).toContain("return !origin || (ALLOWED_ORIGIN !== '' && origin === ALLOWED_ORIGIN);");
      expect(source).toContain("Origin not allowed.");
    }
  });
});
