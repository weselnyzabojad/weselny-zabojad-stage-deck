import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import GroupPhotoChecklist, {
  GROUP_PHOTO_ALL_GUESTS_KEY,
  GROUP_PHOTO_EXTRA_ALL_GUESTS_KEY,
  GROUP_PHOTO_WALK_INS_KEY,
  buildGroupPhotoItems,
  groupPhotoGroupKey,
} from '../../src/components/GroupPhotoChecklist.jsx';
import PhotographerView from '../../src/components/PhotographerView.jsx';
import { resolveGroupPhotoStepId } from '../../src/lib/photoPlan.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #379 group-photo checklist', () => {
  it('renders the mandatory sequence in order', () => {
    const html = renderToStaticMarkup(
      createElement(GroupPhotoChecklist, {
        groups: [
          { id: 'parents', label: 'Parents' },
          { id: 'witnesses', label: 'Witnesses' },
        ],
        location: 'Garden',
        mediaTeam: [
          { role: 'PHOTO', name: 'Marek' },
          { role: 'VIDEO', name: 'Ola' },
        ],
        checked: { [GROUP_PHOTO_ALL_GUESTS_KEY]: true },
        onToggle: () => {},
      }),
    );

    expect(html).toContain('Group photo sequence');
    expect(html).toContain('All guests + newlyweds');
    expect(html).toContain('at least one smiling photo');
    expect(html).toContain('Additional all-guest photos');
    expect(html.indexOf('Parents')).toBeLessThan(html.indexOf('Witnesses'));
    expect(html.indexOf('Witnesses')).toBeLessThan(html.indexOf('Open invitation'));
    expect(html).toContain('Location: Garden');
    expect(html).toContain('Media: Marek, Ola');
    expect(html).toContain('1 / 5 done');
  });

  it('uses stable keys for the required, group and walk-in items', () => {
    const items = buildGroupPhotoItems([{ id: 'parents', label: 'Parents' }]);
    expect(items.map((item) => item.key)).toEqual([
      GROUP_PHOTO_ALL_GUESTS_KEY,
      GROUP_PHOTO_EXTRA_ALL_GUESTS_KEY,
      groupPhotoGroupKey('parents'),
      GROUP_PHOTO_WALK_INS_KEY,
    ]);
    expect(items.filter((item) => item.required).map((item) => item.key)).toEqual([
      GROUP_PHOTO_ALL_GUESTS_KEY,
    ]);
  });

  it('renders a safe empty state when no groups exist', () => {
    const html = renderToStaticMarkup(createElement(GroupPhotoChecklist, {}));
    expect(html).toContain('All guests + newlyweds');
    expect(html).toContain('Open invitation');
    expect(html).toContain('0 / 3 done');
  });

  it('resolves the group-photo step from an explicit id or title fallback', () => {
    const steps = [
      { id: 'step_01', title: 'Cocktail' },
      { id: 'step_07', title: 'Group photos' },
    ];
    expect(resolveGroupPhotoStepId({ groupPhotos: { stepId: 'step_07' } }, steps)).toBe('step_07');
    expect(resolveGroupPhotoStepId({ groupPhotos: {} }, steps)).toBe('step_07');
    expect(resolveGroupPhotoStepId({ groupPhotos: { stepId: 'missing' } }, steps)).toBe('step_07');
  });

  it('wires the same checklist into MC and Photographer views', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('<GroupPhotoChecklist');
    expect(mc).toContain('resolveGroupPhotoStepId');
    expect(mc).toContain('checked={liveState.checked_subtasks}');
    expect(mc).toContain('onToggle={toggleSubtask}');

    const photo = read('src/components/PhotographerView.jsx');
    expect(photo).toContain('<GroupPhotoChecklist');
    expect(photo).toContain('checked={checkedSubtasks}');
    expect(photo).toContain('onToggle={onToggleSubtask}');

    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain('checkedSubtasks={liveState.checked_subtasks}');
    expect(deck).toContain('onToggleSubtask={toggleSubtask}');
  });

  it('renders the checklist inside the Photographer step card', () => {
    const wedding = {
      weddingId: '2026-08-20_test',
      coupleProfile: {
        bride: { firstName: 'A', nationalities: [] },
        groom: { firstName: 'B', nationalities: [] },
        commonLanguages: [],
      },
      date: '20.08.2026',
      nickname: 'Test',
      photoPlan: {
        groupPhotos: {
          stepId: 'step_07',
          location: 'Garden',
          groups: [{ id: 'parents', label: 'Parents' }],
        },
      },
      mediaTeam: [{ role: 'PHOTO', name: 'Marek' }],
    };
    const timeline = [
      {
        step: { id: 'step_07', title: 'Group photos', type: 'FLEXIBLE', time: '19:30' },
        plannedTime: '19:30',
        state: 'current',
      },
    ];
    const html = renderToStaticMarkup(
      createElement(PhotographerView, {
        wedding,
        timeline,
        clock: { now: new Date('2026-08-20T19:30:00.000Z') },
        checkedSubtasks: { [GROUP_PHOTO_ALL_GUESTS_KEY]: true },
        onToggleSubtask: () => {},
      }),
    );
    expect(html).toContain('Group photo sequence');
    expect(html).toContain('Parents');
    expect(html).toContain('Open invitation');
  });
});
