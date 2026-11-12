// HARD_ANCHOR protection radar.
//
// Each anchor is a fixed real-world deadline (vendor departure, midnight
// Oczepiny, shuttle bus...). The radar compares the projected end of
// the last block scheduled before the anchor against the anchor time:
//
//   slack < 0                 -> collision (work overruns the anchor)
//   slack <= compressionLimit -> compression / amber warning
//   anchor is within the      -> approaching / early notice
//   alertBeforeMin window
//
// Warnings are advisory; applying a recovery action is issue #13.

import { clockDeltaMinutes, clockToMinutes } from './clockMath.js';

const DEFAULT_ALERT_BEFORE_MIN = 45;
const DEFAULT_COMPRESSION_SLACK_MIN = 10;

const SEVERITY = {
  collision: 3,
  compression: 2,
  approaching: 1,
  safe: 0,
  passed: 0,
  unknown: 0,
};

function messageFor(report) {
  const { label, time, status, slackMinutes, overrunMinutes, minutesToAnchor, workEntry } = report;
  const workTitle = workEntry?.step?.title;
  const workEnd = workEntry?.projectedEnd;

  if (status === 'collision') {
    return `${label} at ${time} - ${workTitle ?? 'projected work'} ends ${workEnd ?? 'late'}, ${overrunMinutes}m over.`;
  }
  if (status === 'compression') {
    return `${label} at ${time} - only ${slackMinutes}m slack after ${workTitle ?? 'the current block'}.`;
  }
  if (status === 'approaching') {
    return `${label} at ${time} — in ~${minutesToAnchor}m. Protect this anchor.`;
  }
  if (status === 'passed') {
    return `${label} at ${time} — passed.`;
  }
  if (status === 'unknown') {
    return `${label} at ${time} — timing unavailable.`;
  }
  return `${label} at ${time} — ${slackMinutes}m slack.`;
}

export function buildHardAnchorRadar(
  anchors = [],
  entries = [],
  {
    currentEntry = null,
    compressionSlackMinutes = DEFAULT_COMPRESSION_SLACK_MIN,
  } = {},
) {
  const referenceClock =
    currentEntry?.projectedEnd ?? entries[entries.length - 1]?.projectedEnd ?? null;

  const reports = (Array.isArray(anchors) ? anchors : [])
    .filter((anchor) => anchor && clockToMinutes(anchor.time) != null)
    .map((anchor) => {
      const alertBeforeMin = Number.isFinite(anchor.alertBeforeMin)
        ? anchor.alertBeforeMin
        : DEFAULT_ALERT_BEFORE_MIN;
      const minutesToAnchor = referenceClock
        ? clockDeltaMinutes(referenceClock, anchor.time)
        : null;

      // The last scheduled block whose projected start is before the anchor.
      let workEntry = null;
      for (const entry of entries) {
        if (!entry.projectedStart) continue;
        const startToAnchor = clockDeltaMinutes(entry.projectedStart, anchor.time);
        if (startToAnchor == null) continue;
        if (startToAnchor > 0) workEntry = entry;
        else break;
      }

      const workEnd = workEntry?.projectedEnd ?? referenceClock;
      const slackMinutes = workEnd ? clockDeltaMinutes(workEnd, anchor.time) : null;
      const overrunMinutes =
        slackMinutes != null && slackMinutes < 0 ? Math.abs(slackMinutes) : 0;

      const collision = slackMinutes != null && slackMinutes < 0;
      const compression =
        !collision && slackMinutes != null && slackMinutes <= compressionSlackMinutes;
      const approaching =
        !collision &&
        !compression &&
        minutesToAnchor != null &&
        minutesToAnchor >= 0 &&
        minutesToAnchor <= alertBeforeMin;
      const passed =
        !collision &&
        !compression &&
        minutesToAnchor != null &&
        minutesToAnchor < 0;
      const status = collision
        ? 'collision'
        : compression
          ? 'compression'
          : approaching
            ? 'approaching'
            : passed
              ? 'passed'
              : slackMinutes == null
                ? 'unknown'
                : 'safe';

      const report = {
        id: anchor.id ?? anchor.label ?? anchor.time,
        label: anchor.label ?? 'Hard anchor',
        time: anchor.time,
        alertBeforeMin,
        minutesToAnchor,
        workEntry,
        workEnd,
        slackMinutes,
        overrunMinutes,
        status,
        severity: SEVERITY[status] ?? 0,
      };

      return { ...report, message: messageFor(report) };
    });

  const warnings = reports
    .filter((report) => report.severity >= SEVERITY.compression)
    .sort(
      (a, b) =>
        b.severity - a.severity ||
        (a.minutesToAnchor ?? Number.POSITIVE_INFINITY) -
          (b.minutesToAnchor ?? Number.POSITIVE_INFINITY),
    );
  const primary = warnings[0] ?? null;

  const status = reports.some((report) => report.status === 'collision')
    ? 'collision'
    : reports.some((report) => report.status === 'compression')
      ? 'compression'
      : reports.some((report) => report.status === 'approaching')
        ? 'approaching'
        : reports.length > 0
          ? 'safe'
          : 'empty';

  return {
    anchors: reports,
    primary,
    warnings,
    hasWarning: Boolean(primary),
    status,
    collisionCount: reports.filter((report) => report.status === 'collision').length,
    compressionCount: reports.filter((report) => report.status === 'compression').length,
    message:
      primary?.message ??
      (reports.length > 0
        ? 'All fixed anchors have healthy slack.'
        : 'No hard anchors configured.'),
  };
}
