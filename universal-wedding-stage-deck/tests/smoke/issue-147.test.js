import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DjExportPack from '../../src/components/DjExportPack.jsx';
import {
  buildCueSheetHtml,
  buildSetListCsv,
  buildSourceChecklist,
  cueSheetFilename,
  setListFilename,
} from '../../src/lib/djExport.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const wedding = {
  weddingId: '2026-08-20_jennifer_guillaume',
  coupleProfile: {
    bride: { firstName: 'Jennifer', nationalities: ['FR'] },
    groom: { firstName: 'Guillaume', nationalities: ['FR'] },
    commonLanguages: ['FR', 'PL', 'EN'],
  },
  date: '2026-08-20',
  musicPolicy: {
    importantSongs: [
      {
        id: 'grand_entrance',
        moment: 'GRAND_ENTRANCE',
        title: 'Marry You',
        artist: 'Bruno Mars',
        stepId: 'step_01',
        startAtSec: 5,
        fadeOutSec: 215,
        source: {
          type: 'CUSTOMER_FILE',
          fileRef: 'missing.mp3',
          availability: 'MISSING',
        },
        backupSource: {
          type: 'SPOTIFY',
          url: 'https://example.com/backup',
        },
      },
    ],
  },
};

const timeline = [
  {
    projectedStart: '18:00',
    projectedEnd: '18:05',
    step: {
      id: 'step_01',
      title: 'Grand entrance',
      type: 'HARD_ANCHOR',
      location: 'Main hall',
      dj: { track: 'Marry You, "Live"', playlist: 'Entrance', cutoff: '18:05' },
    },
  },
];

describe('issue #147 VIP export & print pack', () => {
  it('builds CSV rows with proper escaping', () => {
    const csv = buildSetListCsv(timeline);
    expect(csv).toContain('Start,End,Step,Type,Location,Track,Playlist,Cutoff');
    expect(csv).toContain('18:00,18:05,Grand entrance,HARD ANCHOR,Main hall');
    expect(csv).toContain('"Marry You, ""Live"""');
  });

  it('builds a printable cue sheet with planned cues and source checks', () => {
    const html = buildCueSheetHtml({
      wedding,
      timeline,
      generatedAt: new Date('2026-01-01T00:00:00Z'),
    });
    expect(html).toContain('Jennifer &amp; Guillaume');
    expect(html).toContain('Grand entrance');
    expect(html).toContain('Marry You');
    expect(html).toContain('Start 0:05');
    expect(html).toContain('Fade 3:35');
    expect(html).toContain('Source &amp; backup checklist');
    expect(html).toContain('unavailable');
    expect(html).toContain('Planned set only');
    expect(html).not.toContain('Actual set');
  });

  it('keeps missing and unavailable sources visible in the checklist', () => {
    const checklist = buildSourceChecklist(wedding);
    expect(checklist).toHaveLength(1);
    expect(checklist[0].primaryStatus).toBe('unavailable');
    expect(checklist[0].backupStatus).toBe('ready');
  });

  it('sanitizes export filenames', () => {
    expect(cueSheetFilename(wedding)).toBe(
      '2026-08-20_jennifer_guillaume-cue-sheet.html',
    );
    expect(setListFilename(wedding)).toBe(
      '2026-08-20_jennifer_guillaume-set-list.csv',
    );
  });

  it('renders desktop VIP export controls and the checklist', () => {
    const html = renderToStaticMarkup(
      createElement(DjExportPack, { wedding, timeline, enabled: true }),
    );
    expect(html).toContain('Export &amp; print pack');
    expect(html).toContain('Print cue sheet');
    expect(html).toContain('Download CSV');
    expect(html).toContain('Source &amp; backup checklist');
    expect(html).toContain('Marry You');
    expect(html).toContain('Unavailable');
  });

  it('does not render for Standard', () => {
    const html = renderToStaticMarkup(
      createElement(DjExportPack, { wedding, timeline, enabled: false }),
    );
    expect(html).toBe('');
  });

  it('removes the export pack from the reworked DJ view', () => {
    const source = read('src/components/DjBoothView.jsx');
    expect(source).not.toContain('DjExportPack');
  });
});
