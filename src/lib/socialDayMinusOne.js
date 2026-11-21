// Day -1 "Prep Wrapper" view model (issue #1255).
//
// Aggregated, anonymized pre-event facts only. Country (no city, venue or
// couple), configured languages, locked steps, synced roles and the armed venue
// policy. There is no curfew data in the product, so none is claimed.
import { addDaysISO, resolveEventDateISO } from './eventTime.js';
import { normalizeVenuePolicies } from './venuePolicies.js';

export function resolveSocialTimeZone(wedding) {
  const candidate =
    wedding?.timezone ??
    wedding?.timeZone ??
    wedding?.cartridge?.extensions?.timeZone ??
    wedding?.timeZone;
  if (typeof candidate === 'string' && candidate.trim()) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: candidate });
      return candidate;
    } catch {
      // fall through to UTC
    }
  }
  return 'UTC';
}

export function venueTodayISO(timeZone, now = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function buildDayMinusOneModel({
  wedding = null,
  liveState = null,
  now = new Date(),
  surface = 'mc',
} = {}) {
  const cartridge = wedding?.cartridge ?? {};
  const adminMode = surface === 'admin';
  const couple = cartridge.coupleProfile ?? {};
  const admin = adminMode
    ? {
        bride: {
          firstName: couple.bride?.firstName ?? null,
          nationalities: asArray(couple.bride?.nationalities),
        },
        groom: {
          firstName: couple.groom?.firstName ?? null,
          nationalities: asArray(couple.groom?.nationalities),
        },
        venueName: wedding?.venue_name ?? wedding?.venue ?? null,
        venueCity: wedding?.venue_city ?? null,
        guests: {
          total: Number.isFinite(cartridge.demographics?.total)
            ? cartridge.demographics.total
            : null,
          pl: Number.isFinite(cartridge.demographics?.pl) ? cartridge.demographics.pl : null,
          fr: Number.isFinite(cartridge.demographics?.fr) ? cartridge.demographics.fr : null,
          other: Number.isFinite(cartridge.demographics?.other)
            ? cartridge.demographics.other
            : null,
          childrenExpected:
            typeof cartridge.childrenExpected === 'boolean'
              ? cartridge.childrenExpected
              : typeof wedding?.childrenExpected === 'boolean'
                ? wedding.childrenExpected
                : null,
        },
        cultural: {
          stoLat: cartridge.culturalRules?.sto_lat?.status ?? null,
          gorzko: cartridge.culturalRules?.gorzko?.status ?? null,
          breadSalt: cartridge.culturalRules?.bread_salt?.status ?? null,
        },
        servicePackage: cartridge.servicePackage ?? wedding?.servicePackage ?? null,
        vipDjName: wedding?.vipDjName ?? null,
      }
    : null;
  const eventDateISO =
    resolveEventDateISO({
      dateISO: cartridge.extensions?.dateISO ?? wedding?.dateISO,
      date: wedding?.date,
    }) ?? null;
  const timeZone = resolveSocialTimeZone(wedding);
  const targetDateISO = eventDateISO ? addDaysISO(eventDateISO, -1) : null;
  const rawPolicy =
    liveState?.media_overrides?.venuePolicies ??
    wedding?.venuePolicy ??
    wedding?.details?.venuePolicy ??
    null;
  const policy = normalizeVenuePolicies(rawPolicy);
  const languages = asArray(cartridge.extensions?.languages?.hostLanguages ?? wedding?.languages)
    .map((code) => String(code).toUpperCase().slice(0, 2))
    .filter(Boolean);
  const steps = asArray(cartridge.steps);
  const roles = asArray(wedding?.roles);
  return {
    readyToPost: Boolean(targetDateISO && venueTodayISO(timeZone, now) === targetDateISO),
    adminMode,
    admin,
    eventDateISO,
    targetDateISO,
    timeZone,
    country:
      String(wedding?.venue_country ?? wedding?.country ?? cartridge.extensions?.country ?? '')
        .trim()
        .toUpperCase()
        .slice(0, 2) || null,
    languages: [...new Set(languages)],
    stepCount: steps.length || wedding?.totalSteps || 0,
    hardAnchorCount: asArray(cartridge.hardAnchors).length || wedding?.hardAnchorCount || 0,
    roleCount: roles.length,
    policy: {
      armed: policy.decibelLimitEnabled || policy.forbiddenFx.length > 0,
      decibelLimit: policy.decibelLimit,
      forbiddenFx: policy.forbiddenFx.length,
    },
  };
}

export function dayMinusOneAdminCaptionLines(model, locale = 'fr') {
  const admin = model.admin;
  if (!model.adminMode || !admin) return [];
  const names = [admin.bride.firstName, admin.groom.firstName].filter(Boolean).join(' & ');
  const flags = [
    ...admin.bride.nationalities,
    ...admin.groom.nationalities,
  ].filter(Boolean).join(' ');
  const guests = admin.guests;
  const guestParts = [
    guests.total != null ? `${guests.total}` : null,
    guests.pl != null ? `PL ${guests.pl}` : null,
    guests.fr != null ? `FR ${guests.fr}` : null,
    guests.other != null ? `+${guests.other}` : null,
  ].filter(Boolean);
  const venue = [admin.venueName, admin.venueCity].filter(Boolean).join(', ');
  const cultural = [
    admin.cultural.stoLat ? `Sto Lat ${admin.cultural.stoLat}` : null,
    admin.cultural.gorzko ? `Gorzko ${admin.cultural.gorzko}` : null,
    admin.cultural.breadSalt ? `Bread & Salt ${admin.cultural.breadSalt}` : null,
  ].filter(Boolean);
  const packageLabel = admin.servicePackage
    ? admin.servicePackage.replaceAll('_', ' ')
    : null;
  if (locale === 'fr') {
    return [
      `Couple : ${names || '—'}${flags ? ` (${flags})` : ''}`,
      `Lieu : ${venue || '—'}`,
      `Invités : ${guestParts.join(' / ') || '—'}${guests.childrenExpected != null ? ` · enfants : ${guests.childrenExpected ? 'oui' : 'non'}` : ''}`,
      cultural.length > 0 ? `Rituels : ${cultural.join(' · ')}` : 'Rituels : —',
      `Formule : ${packageLabel || '—'}${admin.vipDjName ? ` · ${admin.vipDjName}` : ''}`,
    ];
  }
  return [
    `Para : ${names || '—'}${flags ? ` (${flags})` : ''}`,
    `Miejsce : ${venue || '—'}`,
    `Goście : ${guestParts.join(' / ') || '—'}${guests.childrenExpected != null ? ` · dzieci : ${guests.childrenExpected ? 'tak' : 'nie'}` : ''}`,
    cultural.length > 0 ? `Rytuały : ${cultural.join(' · ')}` : 'Rytuały : —',
    `Pakiet : ${packageLabel || '—'}${admin.vipDjName ? ` · ${admin.vipDjName}` : ''}`,
  ];
}

export function dayMinusOneCaptionLines(model, locale = 'fr') {
  const country = model.country || (locale === 'fr' ? 'Destination' : 'Kierunek');
  const languages = model.languages.length > 0 ? model.languages.join(' / ') : '—';
  const policy =
    locale === 'fr'
      ? model.policy.armed
        ? 'Politique du lieu armée'
        : 'Politique du lieu à confirmer'
      : model.policy.armed
        ? 'Zasady miejsca aktywne'
        : 'Zasady miejsca do potwierdzenia';
  const lines =
    locale === 'fr'
      ? [
          `J−1 avant le mariage — ${country}`,
          `${model.stepCount} étapes verrouillées · ${model.roleCount} rôles synchronisés`,
          `Langues : ${languages}`,
          policy,
        ]
      : [
          `D−1 przed weselem — ${country}`,
          `${model.stepCount} kroków zablokowanych · ${model.roleCount} ról zsynchronizowanych`,
          `Języki: ${languages}`,
          policy,
        ];
  return [...lines, ...dayMinusOneAdminCaptionLines(model, locale)];
}
