import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DjSetHealthCard from '../../src/components/DjSetHealthCard.jsx';
import { buildDjSetHealth } from '../../src/lib/djSetHealth.js';

const cachedFile = (name) => ({
  type: 'CUSTOMER_FILE',
  fileRef: `assets/audio/${name}.mp3`,
  filename: `${name}.mp3`,
  availability: 'LOCAL',
});

const onlineSource = {
  type: 'YOUTUBE',
  url: 'https://example.com/private-link',
};

const weddingWith = (importantSongs) => ({
  musicPolicy: { importantSongs },
});

const song = (overrides = {}) => ({
  id: 'song_1',
  moment: 'FIRST_DANCE',
  title: 'Perfect',
  artist: 'Ed Sheeran',
  stepId: 'step_01',
  source: cachedFile('perfect'),
  ...overrides,
});

const timeline = [{ step: { id: 'step_01', title: 'First dance' } }];

describe('issue #145 offline set health', () => {
  it('reports all local key songs as ready', () => {
    const health = buildDjSetHealth(weddingWith([song()]), timeline);
    expect(health.status).toBe('ready');
    expect(health.cached).toBe(1);
    expect(health.offlineReady).toBe(1);
    expect(health.items[0].stepTitle).toBe('First dance');
  });

  it('identifies a missing primary with a cached backup', () => {
    const health = buildDjSetHealth(
      weddingWith([
        song({
          source: { type: 'CUSTOMER_FILE', fileRef: 'missing.mp3', availability: 'MISSING' },
          backupSource: cachedFile('perfect-backup'),
        }),
      ]),
      timeline,
    );

    expect(health.status).toBe('attention');
    expect(health.backup).toBe(1);
    expect(health.offlineReady).toBe(1);
    expect(health.items[0].effective.label).toBe('Backup cached');
  });

  it('marks online-only sources as not offline-ready', () => {
    const health = buildDjSetHealth(
      weddingWith([song({ source: onlineSource })]),
      timeline,
    );

    expect(health.status).toBe('attention');
    expect(health.online).toBe(1);
    expect(health.offlineReady).toBe(0);
  });

  it('marks songs with no usable source as critical', () => {
    const health = buildDjSetHealth(
      weddingWith([song({ source: null })]),
      timeline,
    );

    expect(health.status).toBe('critical');
    expect(health.criticalItems).toHaveLength(1);
    expect(health.items[0].effective.label).toBe('Missing');
  });

  it('never exposes source URLs in the health result', () => {
    const health = buildDjSetHealth(
      weddingWith([song({ source: onlineSource })]),
      timeline,
    );
    expect(JSON.stringify(health)).not.toContain('https://');
  });

  it('keeps the pocket card to readiness and critical warnings', () => {
    const html = renderToStaticMarkup(
      createElement(DjSetHealthCard, {
        wedding: weddingWith([song()]),
        timeline,
        compact: true,
      }),
    );
    expect(html).toContain('Offline set health');
    expect(html).toContain('1/1 offline-ready');
    expect(html).not.toContain('Perfect');
  });

  it('shows song and step details in the desktop card', () => {
    const html = renderToStaticMarkup(
      createElement(DjSetHealthCard, {
        wedding: weddingWith([song()]),
        timeline,
        compact: false,
      }),
    );
    expect(html).toContain('Perfect');
    expect(html).toContain('First dance');
    expect(html).toContain('Primary: Customer file');
  });
});
