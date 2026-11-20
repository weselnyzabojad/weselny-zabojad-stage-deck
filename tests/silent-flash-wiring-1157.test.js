import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSilentFlash } from '../src/lib/silentFlash.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const reschedule = (overrides = {}) => ({
  value: [],
  updatedAt: '2026-11-17T20:00:10.000Z',
  role: 'mc',
  deviceId: 'device-mc',
  change: {
    kind: 'reschedule',
    stepId: 'step-first-dance',
    stepTitle: 'Première danse',
    from: '20:15',
    to: '20:30',
    authorRole: 'mc',
    at: '2026-11-17T20:00:00.000Z',
  },
  ...overrides,
});

describe('Silent Flash trigger (issue #1157)', () => {
  it('returns a descriptor for a reschedule from another device', () => {
    const flash = buildSilentFlash(reschedule(), { deviceId: 'device-dj' });
    expect(flash).toEqual({
      at: '2026-11-17T20:00:00.000Z',
      change: expect.objectContaining({
        kind: 'reschedule',
        stepTitle: 'Première danse',
      }),
    });
  });

  it('stays silent on the authoring device', () => {
    expect(buildSilentFlash(reschedule(), { deviceId: 'device-mc' })).toBeNull();
  });

  it('falls back to the override timestamp when change.at is absent', () => {
    const update = reschedule();
    update.change = { ...update.change, at: undefined };
    expect(buildSilentFlash(update, { deviceId: 'device-dj' })?.at).toBe(update.updatedAt);
  });

  it('ignores undo entries, other overrides and missing payloads', () => {
    expect(buildSilentFlash(null)).toBeNull();
    expect(buildSilentFlash({})).toBeNull();
    expect(buildSilentFlash({ value: [] })).toBeNull();
    expect(buildSilentFlash(reschedule({ change: { kind: 'undo' } }))).toBeNull();
    expect(buildSilentFlash(reschedule({ change: { kind: 'media_override' } }))).toBeNull();
    expect(
      buildSilentFlash(reschedule({ updatedAt: undefined, change: { kind: 'reschedule' } })),
    ).toBeNull();
  });

  it('does not silence every device when the override has no device id', () => {
    const update = reschedule();
    delete update.deviceId;
    expect(buildSilentFlash(update, { deviceId: 'device-dj' })).not.toBeNull();
  });
});

describe('Silent Flash wiring', () => {
  const stage = read('src/StageDeck.jsx');

  it('derives one descriptor from the live schedule override', () => {
    expect(stage).toContain("import { buildSilentFlash } from './lib/silentFlash'");
    expect(stage).toContain("import { getDeviceId } from './lib/deviceId'");
    expect(stage).toContain('buildSilentFlash(liveState.media_overrides?.steps');
    expect(stage).toContain('deviceId: getDeviceId()');
  });

  it('passes the descriptor to every in-scope view', () => {
    // DJ, photographer/video, venue manager and musician each receive the prop.
    expect(stage).toContain('flash={silentFlash}');
    expect(stage).toMatch(/\bsilentFlash,/);
  });

  it('keeps Speaker out of the flash wiring', () => {
    const start = stage.indexOf('<SpeakerView');
    const speaker = stage.slice(start, stage.indexOf('/>', start));
    expect(speaker).not.toContain('flash=');
    expect(read('src/components/SpeakerView.jsx')).not.toContain('flash');
  });

  it('forwards the prop to every current card in the wired views', () => {
    expect(read('src/components/DjBoothView.jsx')).toContain('flash={flash}');
    expect(read('src/components/PhotographerView.jsx').match(/flash=\{flash\}/g)).toHaveLength(2);
    expect(read('src/components/VenueManagerView.jsx')).toContain('flash={flash}');
    expect(read('src/components/MusicianView.jsx')).toContain('flash={flash}');
    expect(read('src/views/McMasterView.jsx').match(/flash=\{silentFlash\}/g)).toHaveLength(2);
  });

  it('does not touch the existing alerts', () => {
    expect(stage).toContain('<ScheduleChangeBanner');
    expect(stage).toContain('<MandatoryUpdatePopup');
  });
});
