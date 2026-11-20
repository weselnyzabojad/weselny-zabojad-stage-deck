// Runtime live-sync defaults. The cartridge schema stays backward compatible,
// but new code reads the defaults from this config module (#698).

export const LIVE_SYNC_CONFIG = Object.freeze({
  active_step_id: null,
  active_speech_id: null,
  completed_step_ids: Object.freeze([]),
  actual_timestamps: Object.freeze({}),
  checked_subtasks: Object.freeze({}),
  stage_ping: null,
  step_order: Object.freeze([]),
  mutation_log: Object.freeze([]),
});

export function normalizeLiveSyncState(raw = {}) {
  const input = raw && typeof raw === 'object' ? raw : {};
  return {
    active_step_id: input.active_step_id ?? LIVE_SYNC_CONFIG.active_step_id,
    active_speech_id: input.active_speech_id ?? LIVE_SYNC_CONFIG.active_speech_id,
    completed_step_ids: Array.isArray(input.completed_step_ids)
      ? input.completed_step_ids
      : [...LIVE_SYNC_CONFIG.completed_step_ids],
    actual_timestamps:
      input.actual_timestamps && typeof input.actual_timestamps === 'object'
        ? input.actual_timestamps
        : { ...LIVE_SYNC_CONFIG.actual_timestamps },
    checked_subtasks:
      input.checked_subtasks && typeof input.checked_subtasks === 'object'
        ? input.checked_subtasks
        : { ...LIVE_SYNC_CONFIG.checked_subtasks },
    stage_ping: input.stage_ping ?? LIVE_SYNC_CONFIG.stage_ping,
    step_order: Array.isArray(input.step_order)
      ? input.step_order
      : [...LIVE_SYNC_CONFIG.step_order],
    mutation_log: Array.isArray(input.mutation_log)
      ? input.mutation_log
      : [...LIVE_SYNC_CONFIG.mutation_log],
  };
}
