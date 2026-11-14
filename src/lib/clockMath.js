// Shared clock math for the drift engine and the HARD_ANCHOR radar.
// Clock values are "HH:MM" strings from the cartridge.

const MINUTES_PER_DAY = 24 * 60;
const MAX_CLOCK_DELTA = MINUTES_PER_DAY / 2;

export function clockToMinutes(clock) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock ?? '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

// Signed difference `to - from`. When the raw difference crosses midnight,
// fold it into the shorter path so 00:10 against 23:50 reads as +20 minutes.
export function clockDeltaMinutes(fromClock, toClock) {
  const from = clockToMinutes(fromClock);
  const to = clockToMinutes(toClock);
  if (from == null || to == null) return null;

  let delta = to - from;
  if (delta > MAX_CLOCK_DELTA) delta -= MINUTES_PER_DAY;
  if (delta < -MAX_CLOCK_DELTA) delta += MINUTES_PER_DAY;
  return delta;
}
