import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from './helpers/googleDocCartridge.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) =>
  googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

const withoutTimelineRow = (name) =>
  template
    .split('\n')
    .filter((line) => !line.startsWith('| ') || !line.includes(`| ${name} |`))
    .join('\n');

describe('issue #1331 re-key Doc satellites to Step name', () => {
  it('uses Step name headers for DJ cues, notes and subtasks', () => {
    expect(template).toContain('| Step name | Playlist | Track | Cutoff | Note |');
    expect(template).toContain('| Step name | Notes |');
    expect(template).toContain('| Step name | Label | Done |');
    const satellites = template.slice(
      template.indexOf('## DJ CUES'),
      template.indexOf('## VENUE LOGISTICS'),
    );
    expect(satellites).not.toContain('| Step ID |');
  });

  it('attaches every satellite by canonical name in document order', () => {
    const { cartridge, warnings } = parse();
    const ceremony = cartridge.steps.find((step) => step.id === 'step_02');
    const entrance = cartridge.steps.find((step) => step.id === 'step_03');
    const firstDance = cartridge.steps.find((step) => step.id === 'step_08');

    expect(ceremony.dj).toMatchObject({ track: 'Canon in D - Pachelbel' });
    expect(entrance.dj).toMatchObject({ track: 'Fly Me to the Moon - Frank Sinatra' });
    expect(entrance.subTasks).toEqual([
      'Confirm the speech mic is on',
      'Rosół + Tartare with Vodka shot',
    ]);
    expect(entrance.grandEntranceOrder).toBe('NEWLYWEDS_FIRST');
    expect(firstDance).toMatchObject({
      firstDanceMode: 'NORMAL',
      firstDanceStartAt: '00:12',
      firstDanceStopAt: '04:30',
    });
    expect(warnings).toEqual([]);
  });

  it('resolves names case-insensitively after trimming', () => {
    const source = template
      .replace('| Ceremony | Ceremony Procession |', '|   ceremony   | Ceremony Procession |')
      .replace(
        '| Grand Entrance | Keep the newlyweds',
        '|   grand entrance   | Keep the newlyweds',
      );
    const { cartridge, warnings } = parse(source);
    expect(warnings).toEqual([]);
    expect(cartridge.steps.find((step) => step.id === 'step_02').dj.track).toBe(
      'Canon in D - Pachelbel',
    );
    expect(cartridge.steps.find((step) => step.id === 'step_03').notes).toContain(
      'Keep the newlyweds',
    );
  });

  it('warns and drops an unknown satellite name without creating a step', () => {
    const source = template
      .replace('| Ceremony | Ceremony Procession |', '| Ceremonia | Ceremony Procession |')
      .replace('| Great Entrance |', '| Great Entrance |');
    const { cartridge, warnings } = parse(source);
    expect(warnings).toContain('DJ CUES row skipped: unknown Step name "Ceremonia"');
    expect(cartridge.steps.some((step) => step.title === 'Ceremonia')).toBe(false);
  });

  it('warns and drops a satellite row for a deleted timeline step', () => {
    const withRows = withoutTimelineRow('Oczepiny')
      .replace(
        '| Grand Entrance | Dinner Jazz |',
        '| Oczepiny | Party | Song |  |  |\n| Grand Entrance | Dinner Jazz |',
      )
      .replace(
        '| Grand Entrance | Keep the newlyweds',
        '| Oczepiny | Dropped note |\n| Grand Entrance | Keep the newlyweds',
      );
    const { cartridge, warnings } = parse(withRows);
    expect(warnings).toContain('DJ CUES row skipped: Oczepiny is not in the timeline');
    expect(warnings).toContain('NOTES row skipped: Oczepiny is not in the timeline');
    expect(cartridge.steps.some((step) => step.title === 'Oczepiny')).toBe(false);
  });

  it('warns on a missing satellite Step name', () => {
    const source = template.replace(
      '| Ceremony | Ceremony Procession |',
      '|  | Ceremony Procession |',
    );
    const { warnings } = parse(source);
    expect(warnings).toContain('DJ CUES row skipped: missing Step name');
  });
});
