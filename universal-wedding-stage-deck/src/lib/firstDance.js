export const FIRST_DANCE_MODES = {
  FAKE: {
    label: 'Fake first dance',
    mcExplanation:
      'Ask guests to come around the dancefloor. The first songs are dedicated to the newlyweds and open the musical set.',
  },
  NORMAL: {
    label: 'Normal first dance',
    mcExplanation: 'Standard first dance with the key song for the DJ.',
  },
};

function seconds(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

export function resolveFirstDance(step) {
  const mode = FIRST_DANCE_MODES[step?.firstDanceMode] ? step.firstDanceMode : null;
  return {
    mode,
    meta: mode ? FIRST_DANCE_MODES[mode] : null,
    startAtSec: seconds(step?.firstDanceStartAtSec),
    stopAfterSec: seconds(step?.firstDanceStopAfterSec),
    notes: typeof step?.firstDanceNotes === 'string' && step.firstDanceNotes.trim()
      ? step.firstDanceNotes.trim()
      : null,
  };
}

export function formatFirstDanceSeconds(value) {
  if (!Number.isInteger(value) || value < 0) return null;
  const minutes = Math.floor(value / 60);
  const rest = value % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}
