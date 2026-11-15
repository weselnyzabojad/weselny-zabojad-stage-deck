import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  MAX_MUTATION_LOG,
  appendMutation,
  mergeMutationLogs,
} from '../src/lib/liveStageState.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1051 runtime and bundle performance', () => {
  it('bounds mutation history and merged logs', () => {
    let state = { mutation_log: [] };
    for (let index = 0; index < MAX_MUTATION_LOG + 25; index += 1) {
      state = appendMutation(state, { deviceId: 'd', role: 'mc' }, 'test', { index });
    }
    expect(state.mutation_log).toHaveLength(MAX_MUTATION_LOG);
    expect(state.mutation_log[0].payload.index).toBe(25);

    const merged = mergeMutationLogs(
      Array.from({ length: MAX_MUTATION_LOG }, (_, i) => ({ id: `a${i}` })),
      Array.from({ length: MAX_MUTATION_LOG }, (_, i) => ({ id: `b${i}` })),
    );
    expect(merged).toHaveLength(MAX_MUTATION_LOG);
    expect(merged[merged.length - 1].id).toBe(`b${MAX_MUTATION_LOG - 1}`);
  });

  it('does not store full media override arrays in the mutation log', () => {
    const hook = read('src/hooks/useLiveStageState.js');
    expect(hook).toContain("Array.isArray(value) ? { kind: 'array', length: value.length } : value");
    expect(hook).toContain("Array.isArray(previous)");
    expect(hook).toContain('useMemo(() => JSON.stringify(liveState), [liveState])');
  });

  it('lazy-loads the deck and skips PWA registration on landing', () => {
    const main = read('src/main.jsx');
    expect(main).toContain("const App = lazy(() => import('./App.jsx'))");
    expect(main).not.toContain("import App from './App.jsx'");
    expect(main).toContain('{IS_LANDING ? null : <PwaUpdatePrompt />}');
    expect(main).toContain('Loading stage deck');
  });
});
