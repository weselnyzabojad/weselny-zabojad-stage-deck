import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseSecretDoc, summarizeSecretDocs } from '../../src/lib/secretDocs.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #364 month secrets folders', () => {
  it('parses a speech Doc as one verbatim speech', () => {
    const result = parseSecretDoc({
      name: 'Speech Bartek',
      text: 'Drodzy Państwo,\n\nDziękuję za przybycie.',
      weddingName: 'UM-2027-09-001',
    });
    expect(result.kind).toBe('speech');
    expect(result.speeches[0].script.text).toBe('Drodzy Państwo,\n\nDziękuję za przybycie.');
    expect(result.speeches[0].visibleToRoles).toEqual(['mc', 'speaker']);
  });

  it('parses a Test zgodności question Doc', () => {
    const result = parseSecretDoc({
      name: 'Test zgodności pytania',
      text: '| Question |\n| --- |\n| Gdzie się poznali? |\n| Kto powiedział pierwszy? |',
      weddingName: 'UM-2027-09-001',
    });
    expect(result.kind).toBe('questions');
    expect(result.questionLists[0].status).toBe('AVAILABLE');
    expect(result.questionLists[0].questions).toHaveLength(2);
  });

  it('summarizes missing, unknown and available docs safely', () => {
    expect(summarizeSecretDocs([])).toMatchObject({
      empty: true,
      speechCount: 0,
      questionCount: 0,
    });
    const summary = summarizeSecretDocs([
      { name: 'Speech', text: 'Hello' },
      { name: 'Questions', text: 'Who? Why?' },
      { name: 'Other', text: 'nope' },
    ]);
    expect(summary.speechCount).toBe(1);
    expect(summary.questionCount).toBe(2);
    expect(summary.unknown).toEqual(['Other']);
  });

  it('discovers and associates secrets folders in the admin UI', () => {
    const ui = read('src/admin/AdminWeddingFolders.jsx');
    expect(ui).toContain('partition.secrets');
    expect(ui).toContain('secretByWedding');
    expect(ui).toContain('loadSecret');
    expect(ui).toContain('Load secrets');
    expect(read('src/lib/driveFolders.js')).toContain("'secrets'");
  });
});
