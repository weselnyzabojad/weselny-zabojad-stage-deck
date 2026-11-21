// Anonymized season facts (issue #1215).
//
// One durable row per wedding recap. The row contains only aggregates and an
// opaque SHA-256 wedding key; names, contacts, venue names, addresses, tokens
// and raw event rows never leave the admin/recap store.

import { normalizeCountry } from './venueLocation.js';

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function nonNegativeInt(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function seasonYearFromDate(value) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(value) ?? '');
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return year;
    }
    return null;
  }
  const dotted = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text(value) ?? '');
  if (dotted) {
    const year = Number(dotted[3]);
    const month = Number(dotted[2]);
    const day = Number(dotted[1]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return year;
    }
  }
  return null;
}

export function resolveSeasonYear({ wedding, recap, now = new Date() } = {}) {
  return (
    seasonYearFromDate(wedding?.cartridge?.extensions?.dateISO) ??
    seasonYearFromDate(recap?.wedding?.dateISO) ??
    seasonYearFromDate(wedding?.date) ??
    seasonYearFromDate(recap?.wedding?.date) ??
    now.getUTCFullYear()
  );
}

function seasonMonthFromDate(value) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(value) ?? '');
  if (iso) return Number(iso[2]);
  const dotted = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text(value) ?? '');
  if (dotted) return Number(dotted[2]);
  return null;
}

export function resolveEventMonth({ wedding, recap, now = new Date() } = {}) {
  return (
    seasonMonthFromDate(wedding?.cartridge?.extensions?.dateISO) ??
    seasonMonthFromDate(recap?.wedding?.dateISO) ??
    seasonMonthFromDate(wedding?.date) ??
    seasonMonthFromDate(recap?.wedding?.date) ??
    now.getUTCMonth() + 1
  );
}

export function isStoLatEnabled(status) {
  const clean = text(status)?.toUpperCase().replace(/[\s-]+/g, '_');
  return clean === 'YES' || clean === 'ON_REQUEST';
}

function guestsFromCartridge(cartridge) {
  const demographics = cartridge?.demographics;
  if (!demographics || typeof demographics !== 'object') {
    return {
      guests_total: null,
      guests_pl: null,
      guests_fr: null,
      guests_other: null,
    };
  }
  return {
    guests_total: nonNegativeInt(demographics.total),
    guests_pl: nonNegativeInt(demographics.pl),
    guests_fr: nonNegativeInt(demographics.fr),
    guests_other: nonNegativeInt(demographics.other),
  };
}

function oczepinyPartCount(cartridge) {
  const oczepiny = cartridge?.oczepiny;
  if (!oczepiny || typeof oczepiny !== 'object') return null;
  if (oczepiny.enabled === false) return 0;
  // `subEvents` is the already-enabled subset written by the Doc parser.
  const subEvents = Array.isArray(oczepiny.subEvents) ? oczepiny.subEvents : [];
  return subEvents.length;
}

// Bounded, aggregated Test Zgodności facts (issue #1257). Only counts and a
// stable question key are kept; question text and couple identity never enter
// the durable season row.
function compatibilityFromRecap(recap) {
  const games = Array.isArray(recap?.games) ? recap.games : [];
  const entries = games.flatMap((game, gameIndex) => {
    const questions = Array.isArray(game?.questions) ? game.questions : [];
    return questions.map((question, questionIndex) => ({
      key: text(question?.id)
        ? `q:${text(question.id)}`
        : `g${gameIndex}:q${questionIndex}`,
      compatible: typeof question?.isCompatible === 'boolean' ? question.isCompatible : null,
    }));
  });
  const measured = entries.filter((entry) => entry.compatible != null);
  const summary = new Map();
  for (const entry of measured) {
    const current = summary.get(entry.key) ?? { key: entry.key, answered: 0, compatible: 0 };
    current.answered += 1;
    if (entry.compatible) current.compatible += 1;
    summary.set(entry.key, current);
  }
  return {
    compatibility_total: entries.length,
    compatibility_answered: measured.length,
    compatibility_percent:
      measured.length > 0
        ? Math.round(
            (measured.filter((entry) => entry.compatible).length / measured.length) * 100,
          )
        : null,
    compatibility_questions: [...summary.values()]
      .sort((left, right) => right.answered - left.answered || left.key.localeCompare(right.key))
      .slice(0, 20),
  };
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildSeasonFact({
  wedding,
  recap,
  recapId,
  now = new Date(),
} = {}) {
  const weddingId = text(wedding?.wedding_id);
  if (!weddingId || !recap) return null;

  const cartridge = wedding?.cartridge ?? {};
  const summary = recap?.summary ?? {};
  const gamesCount = Array.isArray(recap?.games)
    ? nonNegativeInt(recap.games.length)
    : nonNegativeInt(summary.gameCount);
  const ceremonyParts = Array.isArray(recap?.ceremony)
    ? nonNegativeInt(recap.ceremony.length)
    : nonNegativeInt(summary.ceremonyPartCount);
  const oczepinyParts = oczepinyPartCount(cartridge);
  const animationsTotal =
    gamesCount == null || ceremonyParts == null || oczepinyParts == null
      ? null
      : gamesCount + ceremonyParts + oczepinyParts;

  return {
    wedding_key: await sha256Hex(weddingId),
    season_year: resolveSeasonYear({ wedding, recap, now }),
    event_month: resolveEventMonth({ wedding, recap, now }),
    source_recap_id: typeof recapId === 'string' ? recapId : null,
    ...guestsFromCartridge(cartridge),
    country_code: normalizeCountry(wedding?.venue_country),
    stolat_enabled: isStoLatEnabled(cartridge?.culturalRules?.sto_lat?.status),
    games_count: gamesCount,
    ceremony_parts: ceremonyParts,
    oczepiny_parts: oczepinyParts,
    animations_total: animationsTotal,
    ...compatibilityFromRecap(recap),
    updated_at: now.toISOString(),
  };
}

export { seasonYearFromDate };
