// Photographer / cameraman data helpers (project.md TODO 21, D2/D6).
//
// Sunset values come from the cartridge (fetched online at publish/import time,
// D6). The app never estimates a sunset offline: a missing or stale value is
// rendered as unavailable/stale, never guessed.

import { clockToEventDate, isIsoTimestamp } from './eventTime.js';
import { clockDeltaMinutes } from './clockMath.js';

export const DEFAULT_PHOTO_VISIBILITY = {
  timeline: true,
  venueAddress: true,
  venueMaps: true,
  venueManager: true,
  venueInstallation: true,
  venueParking: true,
  photoPlan: true,
  sunset: true,
  notes: true,
};

const MEDIA_ROLES = ['PHOTO', 'VIDEO', 'DRONE'];
const SUNSET_STATUS = ['LIVE', 'STALE', 'UNAVAILABLE'];
const CLOCK_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizePhoneHref(phone) {
  const trimmed = text(phone);
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d+]/g, '');
  const normalized = digits.startsWith('+')
    ? `+${digits.slice(1).replace(/\+/g, '')}`
    : digits.replace(/\+/g, '');
  return /\d{5,}/.test(normalized.replace(/\D/g, '')) ? `tel:${normalized}` : null;
}

function clockText(value) {
  const trimmed = text(value);
  return trimmed && CLOCK_PATTERN.test(trimmed) ? trimmed : null;
}

function finite(value) {
  return Number.isFinite(value) ? value : null;
}

export function resolvePhotoVisibility(wedding) {
  return {
    ...DEFAULT_PHOTO_VISIBILITY,
    ...(wedding?.viewVisibility?.photo ?? {}),
  };
}

export function resolveMediaTeam(wedding) {
  const team = Array.isArray(wedding?.mediaTeam) ? wedding.mediaTeam : [];

  return team
    .filter((member) => member && typeof member === 'object' && (text(member.name) || text(member.id)))
    .map((member, index) => {
      const phone = text(member.phone);
      return {
        id: text(member.id) ?? `media_${index + 1}`,
        role: MEDIA_ROLES.includes(member.role) ? member.role : 'PHOTO',
        name: text(member.name) ?? 'Media team',
        phone,
        phoneHref: normalizePhoneHref(phone),
        startTime: clockText(member.startTime),
        endTime: clockText(member.endTime),
        deliverables: Array.isArray(member.deliverables)
          ? member.deliverables.map(text).filter(Boolean)
          : [],
        notes: text(member.notes),
      };
    });
}

function resolveMiniSession(wedding) {
  const raw = wedding?.photoPlan?.miniSession;
  if (!raw || typeof raw !== 'object' || raw.enabled !== true) return null;

  return {
    enabled: true,
    stepId: text(raw.stepId),
    latestStartMinutesBeforeSunset: Number.isFinite(raw.latestStartMinutesBeforeSunset)
      ? raw.latestStartMinutesBeforeSunset
      : null,
    durationMin: Number.isFinite(raw.durationMin) ? raw.durationMin : null,
    location: text(raw.location),
    backupLocation: text(raw.backupLocation),
  };
}

export function resolveSunset(wedding) {
  const raw = wedding?.photoPlan?.sunset;
  if (!raw || typeof raw !== 'object') return null;

  const status = SUNSET_STATUS.includes(raw.status) ? raw.status : 'UNAVAILABLE';
  const sunsetTime = clockText(raw.sunsetTime);
  const goldenHourStart = clockText(raw.goldenHourStart);
  const civilTwilightEnd = clockText(raw.civilTwilightEnd);

  return {
    status,
    usable: (status === 'LIVE' || status === 'STALE') && Boolean(sunsetTime),
    sunsetTime,
    goldenHourStart,
    civilTwilightEnd,
    lastFetchedAt: text(raw.lastFetchedAt),
    latitude: finite(raw.latitude),
    longitude: finite(raw.longitude),
    timezone: text(raw.timezone),
    provider: text(raw.provider),
    miniSession: resolveMiniSession(wedding),
  };
}

// Absolute countdowns for the sunset/light window. Negative values mean the
// moment has passed. Returns null instants when the clock or the venue date is
// unknown.
export function buildSunsetCountdowns(sunset, { now = new Date(), eventDateISO = null, timeZone = 'UTC' } = {}) {
  if (!sunset?.usable) {
    return { sunsetAt: null, goldenHourAt: null, latestMiniStartAt: null };
  }

  const context = { eventDateISO, timeZone };
  const sunsetAt = sunset.sunsetTime
    ? clockToEventDate({ clock: sunset.sunsetTime, ...context, after: now })
    : null;
  const goldenHourAt = sunset.goldenHourStart
    ? clockToEventDate({ clock: sunset.goldenHourStart, ...context, after: now })
    : null;

  let latestMiniStartAt = null;
  const minutes = sunset.miniSession?.latestStartMinutesBeforeSunset;
  if (sunsetAt && Number.isFinite(minutes)) {
    latestMiniStartAt = new Date(sunsetAt.getTime() - minutes * 60000);
  }

  return { sunsetAt, goldenHourAt, latestMiniStartAt };
}

export function resolvePhotoPlan(wedding) {
  const plan = wedding?.photoPlan;
  if (!plan || typeof plan !== 'object') return null;

  const groupPhotos = plan.groupPhotos && typeof plan.groupPhotos === 'object'
    ? {
        stepId: text(plan.groupPhotos.stepId),
        location: text(plan.groupPhotos.location),
        groups: Array.isArray(plan.groupPhotos.groups)
          ? plan.groupPhotos.groups
              .filter((group) => group && typeof group === 'object')
              .map((group, index) => ({
                id: text(group.id) ?? `group_${index + 1}`,
                label: text(group.label) ?? text(group.name) ?? `Group ${index + 1}`,
              }))
          : [],
        minGroupSize: Number.isFinite(plan.groupPhotos.minGroupSize)
          ? plan.groupPhotos.minGroupSize
          : null,
        durationMin: Number.isFinite(plan.groupPhotos.durationMin)
          ? plan.groupPhotos.durationMin
          : null,
      }
    : null;

  const speedFoto = plan.speedFoto && typeof plan.speedFoto === 'object'
    ? {
        stepId: text(plan.speedFoto.stepId),
        enabled: plan.speedFoto.enabled === true,
        description: text(plan.speedFoto.description),
        durationMin: Number.isFinite(plan.speedFoto.durationMin) ? plan.speedFoto.durationMin : null,
        music: text(plan.speedFoto.music),
      }
    : null;

  const specialEffects = plan.specialEffects && typeof plan.specialEffects === 'object'
    ? {
        stepId: text(plan.specialEffects.stepId),
        sparklers: plan.specialEffects.sparklers === true,
        fire: plan.specialEffects.fire === true,
        heavySmoke: plan.specialEffects.heavySmoke === true,
        other: text(plan.specialEffects.other),
        permitRequired: plan.specialEffects.permitRequired === true,
        venueApproved: plan.specialEffects.venueApproved === true,
        safetyBriefing: text(plan.specialEffects.safetyBriefing),
      }
    : null;

  const guestCoverage = plan.guestCoverage && typeof plan.guestCoverage === 'object'
    ? {
        stepId: text(plan.guestCoverage.stepId),
        allGuests: plan.guestCoverage.allGuests === true,
        selectedGuests: Number.isFinite(plan.guestCoverage.selectedGuests)
          ? plan.guestCoverage.selectedGuests
          : null,
        description: text(plan.guestCoverage.description),
        consent: text(plan.guestCoverage.consent),
      }
    : null;

  return {
    miniSession: resolveMiniSession(wedding),
    groupPhotos,
    speedFoto,
    specialEffects,
    guestCoverage,
  };
}

export function resolveOczepiny(wedding, hardAnchors = [], mediaTeam = resolveMediaTeam(wedding)) {
  const raw = wedding?.oczepiny;
  if (!raw || typeof raw !== 'object' || raw.enabled !== true) return null;

  const anchor =
    Array.isArray(hardAnchors) && raw.anchorId
      ? hardAnchors.find((candidate) => candidate?.id === raw.anchorId) ?? null
      : null;
  const anchorTime = clockText(anchor?.time);

  const winnerPhoto = raw.winnerPhoto && typeof raw.winnerPhoto === 'object'
    ? {
        enabled: raw.winnerPhoto.enabled === true,
        replacesWinnersDance: raw.winnerPhoto.replacesWinnersDance === true,
        photographerCue: text(raw.winnerPhoto.photographerCue),
      }
    : { enabled: false, replacesWinnersDance: false, photographerCue: null };

  // Proposal rule 10: warn when every media team member leaves before the
  // Oczepini anchor (they would miss the winner photo).
  let winnerPhotoWarning = false;
  if (winnerPhoto.enabled && anchorTime && mediaTeam.length > 0) {
    const withEnd = mediaTeam.filter((member) => member.endTime);
    winnerPhotoWarning =
      withEnd.length === mediaTeam.length &&
      withEnd.every((member) => {
        const delta = clockDeltaMinutes(member.endTime, anchorTime);
        return delta != null && delta > 0;
      });
  }

  return {
    enabled: true,
    order: ['MIDNIGHT', 'AFTER_CAKE', 'CUSTOM'].includes(raw.order) ? raw.order : 'CUSTOM',
    anchorId: text(raw.anchorId),
    anchor: anchor
      ? { id: text(anchor.id) ?? anchorTime, label: text(anchor.label) ?? 'Oczepini anchor', time: anchorTime }
      : null,
    toss: ['VEIL', 'BOUQUET', 'OFF'].includes(raw.toss) ? raw.toss : null,
    ties: ['BOW_TIE', 'TIE', 'OFF'].includes(raw.ties) ? raw.ties : null,
    winnerPhoto,
    winnerPhotoWarning,
    photographerBriefed:
      raw.photographerBriefed && typeof raw.photographerBriefed === 'object'
        ? {
            confirmed: raw.photographerBriefed.confirmed === true,
            confirmedAt: text(raw.photographerBriefed.confirmedAt),
            confirmedBy: text(raw.photographerBriefed.confirmedBy),
            notes: text(raw.photographerBriefed.notes),
          }
        : null,
    props: Array.isArray(raw.props) ? raw.props.map(text).filter(Boolean) : [],
    music: raw.music && typeof raw.music === 'object'
      ? { track: text(raw.music.track), playlist: text(raw.music.playlist) }
      : null,
    subEvents: Array.isArray(raw.subEvents)
      ? raw.subEvents
          .filter((event) => event && typeof event === 'object')
          .map((event, index) => ({
            id: text(event.id) ?? `sub_${index + 1}`,
            title: text(event.title) ?? `Event ${index + 1}`,
            durationMin: Number.isFinite(event.durationMin) ? event.durationMin : null,
            deferable: event.deferable === true,
            skippable: event.skippable === true,
          }))
      : [],
  };
}

function mapsUrlFor(venue) {
  const address = text(venue?.address);
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  const lat = finite(venue?.coordinates?.latitude);
  const lng = finite(venue?.coordinates?.longitude);
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return null;
}

export function resolveVenueAccess(wedding) {
  const venue = wedding?.venueLogistics;
  if (!venue || typeof venue !== 'object') return null;

  const manager = venue.manager && typeof venue.manager === 'object' ? venue.manager : null;
  const installation =
    venue.installation && typeof venue.installation === 'object' ? venue.installation : null;

  const resolved = {
    address: text(venue.address),
    mapsUrl: mapsUrlFor(venue),
    manager: manager
      ? {
          name: text(manager.name),
          phone: text(manager.phone),
          phoneHref: normalizePhoneHref(manager.phone),
        }
      : null,
    installation: installation
      ? {
          windowStart: clockText(installation.windowStart),
          windowEnd: clockText(installation.windowEnd),
          latestStart: clockText(installation.latestStart),
          loadInMinutes: Number.isFinite(installation.loadInMinutes)
            ? installation.loadInMinutes
            : null,
          setupMinutes: Number.isFinite(installation.setupMinutes) ? installation.setupMinutes : null,
          accessNotes: text(installation.accessNotes),
          parking: text(installation.parking),
          power: text(installation.power),
          loadingDock: installation.loadingDock === true,
          elevator: installation.elevator === true,
          noiseCurfew: clockText(installation.noiseCurfew),
        }
      : null,
    notes: text(venue.notes),
  };

  return resolved;
}

// Last fetched time for a STALE badge; accepts ISO strings only.
export function sunsetFreshnessLabel(sunset) {
  if (!sunset?.lastFetchedAt || !isIsoTimestamp(sunset.lastFetchedAt)) return null;
  const date = new Date(sunset.lastFetchedAt);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

// Map photo-plan items to timeline steps. Explicit `stepId` wins; otherwise a
// deterministic title/keyword match is used so a cartridge without ids still
// shows details in a sensible step card.
const PHOTO_PLAN_MATCHERS = {
  miniSession: /mini|session|golden/i,
  groupPhotos: /group|family|portrait/i,
  speedFoto: /speed/i,
  specialEffects: /cake|sparkler|fire|smoke|effect/i,
  guestCoverage: /guest|dinner|reception/i,
};

export function mapPhotoPlanToSteps(plan, timeline = []) {
  const byStep = {};
  if (!plan || !Array.isArray(timeline)) return byStep;
  const stepIds = new Set(timeline.map((entry) => entry?.step?.id).filter(Boolean));

  for (const [type, matcher] of Object.entries(PHOTO_PLAN_MATCHERS)) {
    const data = plan[type];
    if (!data) continue;
    const explicit = data.stepId && stepIds.has(data.stepId) ? data.stepId : null;
    const fallback = explicit
      ? null
      : timeline.find((entry) => matcher.test(entry?.step?.title ?? ''))?.step?.id ?? null;
    const stepId = explicit ?? fallback;
    if (!stepId) continue;
    byStep[stepId] = byStep[stepId] ?? [];
    byStep[stepId].push({ type, data });
  }

  return byStep;
}
