import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { orderSubtasks } from '../../src/lib/subtasks.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #200 MC subtasks rename and ordering', () => {
  it('shows unchecked tasks first and keeps checked tasks afterwards', () => {
    const tasks = ['Cake table', 'Sparklers', 'Toast glasses', 'Guest book'];
    const checked = { 'Cake table': true, 'Guest book': true };
    expect(orderSubtasks(tasks, checked)).toEqual([
      'Sparklers',
      'Toast glasses',
      'Cake table',
      'Guest book',
    ]);
  });

  it('keeps the original order inside each group and does not mutate input', () => {
    const tasks = ['a', 'b', 'c', 'd'];
    const original = [...tasks];
    expect(orderSubtasks(tasks, { b: true })).toEqual(['a', 'c', 'd', 'b']);
    expect(tasks).toEqual(original);
  });

  it('handles missing input safely', () => {
    expect(orderSubtasks()).toEqual([]);
    expect(orderSubtasks(null, {})).toEqual([]);
  });

  it('renames the heading and marks completed tasks', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('📋 Sub-tasks');
    expect(mc).not.toContain('Catering & Sub-Tasks');
    expect(mc).toContain('orderSubtasks(stepSubtasks');
    expect(mc).toContain('line-through');
  });
});
