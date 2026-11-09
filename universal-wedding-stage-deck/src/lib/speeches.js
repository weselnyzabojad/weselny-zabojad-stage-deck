// Speeches and the dedicated speaker role (project.md TODO 8).
//
// The final speech schema/UI is still provisional; this module captures the
// mode and script text now and provides the normalised data the MC card and the
// "Speech text - script" view need. Scripts are stored verbatim — never
// summarised or rewritten.

import { clockToEventDate } from './eventTime.js';

export const SPEECH_MODES = ['OFF', 'LIGHT', 'COMPLEX'];
export const SPEECH_DELIVERY = ['READ', 'MEMORIZE', 'NOTES'];
export const SPEECH_READ_FROM = ['PHONE', 'TABLET', 'PAPER', 'MEMORY', 'OTHER'];

const CLOCK_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function clock(value) {
  const trimmed = text(value);
  return trimmed && CLOCK_PATTERN.test(trimmed) ? trimmed : null;
}

export function normalizeSpeechMode(value) {
  return SPEECH_MODES.includes(value) ? value : null;
}

// Wedding-level default. Older cartridges with speeches but no explicit mode
// are treated as COMPLEX; truly empty cartridges are OFF.
export function resolveSpeechMode(wedding, speeches = []) {
  return normalizeSpeechMode(wedding?.speechMode) ?? (speeches.length > 0 ? 'COMPLEX' : 'OFF');
}

function normalizeSpeaker(raw) {
  if (typeof raw === 'string') {
    return { name: text(raw) ?? 'Speaker', relationship: null, contact: null, email: null };
  }
  if (!raw || typeof raw !== 'object') {
    return { name: 'Speaker', relationship: null, contact: null, email: null };
  }
  return {
    name: text(raw.name) ?? 'Speaker',
    relationship: text(raw.relationship) ?? text(raw.role),
    contact: text(raw.contact),
    email: text(raw.email),
  };
}

function normalizeScript(raw) {
  if (!raw || typeof raw !== 'object') {
    return { text: null, format: null, ready: false, source: null };
  }
  const scriptText = typeof raw.text === 'string' ? raw.text : null;
  const hasText = Boolean(scriptText && scriptText.trim());
  return {
    text: hasText ? scriptText : null,
    format: text(raw.format),
    ready: raw.ready === true || hasText,
    source: text(raw.source),
  };
}

// Consent defaults to granted for speeches captured before this field existed;
// an explicit `storeScript: false` locks the script on the speaker device.
function normalizeConsent(raw) {
  if (!raw || typeof raw !== 'object') {
    return { storeScript: true, confirmedBy: null, confirmedAt: null, notes: null };
  }
  return {
    storeScript: raw.storeScript === false ? false : true,
    confirmedBy: text(raw.confirmedBy),
    confirmedAt: text(raw.confirmedAt),
    notes: text(raw.notes),
  };
}

export function resolveSpeeches(wedding) {
  const items = Array.isArray(wedding?.speeches) ? wedding.speeches : [];
  const weddingMode = normalizeSpeechMode(wedding?.speechMode);

  return items
    .filter((speech) => speech && typeof speech === 'object')
    .map((speech, index) => {
      const override = normalizeSpeechMode(speech.mode);
      const mode =
        override && override !== 'OFF'
          ? override
          : weddingMode && weddingMode !== 'OFF'
            ? weddingMode
            : 'COMPLEX';
      const visibleToRoles = Array.isArray(speech.visibleToRoles)
        ? speech.visibleToRoles.map(text).filter(Boolean)
        : [];
      const consent = normalizeConsent(speech.consent);
      const speakerVisible = visibleToRoles.length === 0 || visibleToRoles.includes('speaker');

      return {
        id: text(speech.id) ?? `speech_${index + 1}`,
        mode,
        speaker: normalizeSpeaker(speech.speaker),
        order: Number.isFinite(speech.order) ? speech.order : index + 1,
        time: clock(speech.time),
        durationMin: Number.isFinite(speech.durationMin) ? speech.durationMin : null,
        language: text(speech.language),
        mic: text(speech.mic),
        cue: text(speech.cue),
        teleprompterRef: text(speech.teleprompterRef),
        script: normalizeScript(speech.script),
        delivery: SPEECH_DELIVERY.includes(speech.delivery) ? speech.delivery : null,
        readFrom: SPEECH_READ_FROM.includes(speech.readFrom) ? speech.readFrom : null,
        mcIntro: speech.mcIntro === true,
        visibleToRoles,
        consent,
        // The speaker device may see the script only when the role is allowed
        // and the couple consented to storing it.
        speakerVisible,
        scriptAllowed: speakerVisible && consent.storeScript,
      };
    })
    .sort((a, b) => a.order - b.order);
}

// The MC selects the live speech (`liveSyncState.active_speech_id`). A
// single-speech wedding can default to that one; multiple speeches wait for an
// explicit selection so a speaker never sees the wrong script.
export function resolveActiveSpeech(speeches, activeSpeechId) {
  if (!Array.isArray(speeches) || speeches.length === 0) return null;
  if (activeSpeechId) {
    return speeches.find((speech) => speech.id === activeSpeechId) ?? null;
  }
  return speeches.length === 1 ? speeches[0] : null;
}

export function speechTiming(speech, { now = new Date(), eventDateISO = null, timeZone = 'UTC' } = {}) {
  const empty = {
    startsAt: null,
    startsInSec: null,
    endsAt: null,
    remainingSec: null,
    elapsedSec: null,
  };
  if (!speech?.time) return empty;

  const startsAt = clockToEventDate({ clock: speech.time, eventDateISO, timeZone, after: now });
  if (!startsAt) return empty;

  const durationSec = Number.isFinite(speech.durationMin) ? speech.durationMin * 60 : null;
  const endsAt = durationSec != null ? new Date(startsAt.getTime() + durationSec * 1000) : null;
  const startsInSec = (startsAt.getTime() - now.getTime()) / 1000;

  return {
    startsAt,
    startsInSec,
    endsAt,
    remainingSec: endsAt ? (endsAt.getTime() - now.getTime()) / 1000 : null,
    elapsedSec: startsInSec < 0 ? Math.abs(startsInSec) : null,
  };
}
