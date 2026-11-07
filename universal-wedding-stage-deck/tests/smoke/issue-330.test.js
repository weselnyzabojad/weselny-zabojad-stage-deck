import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #330 documentation refresh', () => {
  it('replaces the default Vite README', () => {
    const readme = read('README.md');
    expect(readme).toContain('# Universal Wedding Stage Deck');
    expect(readme).not.toContain('This template provides a minimal setup');
    expect(readme).not.toContain('React Compiler is not enabled');
    for (const section of [
      'Quick start',
      'Environment',
      'Routes',
      'Role surfaces',
      'Schedule model',
      'Validation',
      'Cloud sync and security',
      'Admin Google Drive flow',
    ]) {
      expect(readme).toContain(section);
    }
  });

  it('documents runnable validation commands and routes', () => {
    const readme = read('README.md');
    for (const command of [
      'npm run lint',
      'npm run validate:i18n',
      'npm run validate:schema',
      'npm run validate:fixtures',
      'npm run validate:template',
      'npm test',
      'npm run build',
    ]) {
      expect(readme).toContain(command);
    }
    expect(readme).toContain('/deck/admin');
    expect(readme).toContain('/request/:roomCode');
  });

  it('describes the current schedule and data contract', () => {
    const readme = read('README.md');
    expect(readme).toContain('FLEXIBLE');
    expect(readme).toContain('HARD_ANCHOR');
    expect(readme).toContain('table service');
    expect(readme).toContain('RELIGIOUS');
    expect(readme).toContain('Grand Entrance order');
    expect(readme).toContain('First Dance');
    expect(readme).toContain('question-list Google Docs');
  });

  it('corrects the Supabase security description', () => {
    const readme = read('README.md');
    expect(readme).toContain('revokes anon access');
    expect(readme).not.toContain('enables RLS with anon');
    expect(readme).toContain('service-role key stays in Edge Function secrets');
  });

  it('marks remaining old scheduling references as removed or historical', () => {
    const activeDocs = [
      read('README.md'),
      read('docs/google-doc-template-conventions.md'),
      read('docs/testing.md'),
      read('docs/mc-stage-rail-plan.md'),
    ].join('\n');
    expect(activeDocs).not.toContain('ELASTIC STEP');
    expect(activeDocs).not.toContain('Buffer accordion,');
    expect(activeDocs).toContain('removed');
  });
});
