import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from './helpers/googleDocCartridge.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #1366 generated IDs, media team and photo plan', () => {
  it('removes authored IDs from the Doc tables', () => {
    expect(template).not.toContain('| Subtask ID |');
    expect(template).not.toContain('| Team ID |');
    expect(template).not.toContain('| Group ID |');
  });

  it('generates deterministic subtask IDs from step and label', () => {
    const entrance = parse().cartridge.steps.find((step) => step.id === 'step_03');
    expect(entrance.subTaskIds['Confirm the speech mic is on']).toBe(
      'step_03_confirm_the_speech_mic_is_on',
    );
    expect(Object.keys(entrance.subTaskIds)).toHaveLength(2);
  });

  it('generates media IDs from role and name', () => {
    const { mediaTeam } = parse().cartridge;
    expect(mediaTeam.map((member) => member.id)).toEqual(['photo_marek', 'video_ola']);
    expect(mediaTeam.map((member) => member.name)).toEqual(['Marek', 'Ola']);
  });

  it('generates group IDs from labels and keeps optional notes', () => {
    const groups = parse().cartridge.photoPlan.groupPhotos.groups;
    expect(groups).toEqual([
      { id: 'bride_s_family', label: "Bride's family", note: 'Immediate family' },
      { id: 'groom_s_family', label: "Groom's family", note: 'Immediate family' },
      { id: 'friends', label: 'Friends' },
    ]);
  });

  it('allows an empty photographer-decided mini-session backup location', () => {
    const { miniSession } = parse().cartridge.photoPlan;
    expect(miniSession).toEqual({ enabled: true, location: 'Garden' });
  });

  it('suffixes duplicate generated IDs', () => {
    const source = template.replace(
      '| Friends |  |',
      '| Friends |  |\n| Friends | Duplicate label |',
    );
    const groups = parse(source).cartridge.photoPlan.groupPhotos.groups;
    expect(groups.map((group) => group.id)).toEqual([
      'bride_s_family',
      'groom_s_family',
      'friends',
      'friends_2',
    ]);
  });
});
