// Season "Test Zgodności" view model (issue #1258).
//
// Aggregated, season-scoped facts only. The lower third stays free for a native
// Instagram poll sticker; no couple, venue or per-wedding data is rendered.
import { buildSocialCaption } from './socialStory.js';

function number(value) {
  return Number.isFinite(value) ? value : null;
}

export function buildSeasonModel(data = null) {
  const compatibility = data?.kpis?.compatibility ?? {};
  const answered = number(compatibility.answered);
  const total = number(compatibility.total);
  const weddings = number(compatibility.weddings);
  const averagePercent = number(compatibility.averagePercent);
  const destinations = Array.isArray(data?.kpis?.destinations)
    ? data.kpis.destinations
    : Array.isArray(data?.seasonPlan?.destinations)
      ? data.seasonPlan.destinations
      : [];
  const completed = number(data?.seasonPlan?.weddings?.completed);
  const upcoming = number(data?.seasonPlan?.weddings?.upcoming);
  return {
    seasonYear: number(data?.seasonYear),
    weddings: number(data?.coverage?.weddings) ?? weddings,
    completed,
    upcoming,
    planned: number(data?.seasonPlan?.weddings?.total),
    guests: number(data?.seasonPlan?.guests?.completed) ?? number(data?.kpis?.guests?.total),
    destinations: destinations.length,
    destinationList: destinations,
    stolatWeddings: number(data?.kpis?.stolatWeddings),
    averagePercent,
    answered,
    total,
    compatibilityWeddings: weddings,
    topQuestion: compatibility.topQuestion ?? null,
    available: (completed ?? 0) > 0 && (upcoming ?? 0) === 0,
    hasData: Boolean((weddings ?? 0) > 0 || (answered ?? 0) > 0 || (averagePercent ?? 0) > 0),
  };
}

export function buildMonthModel(data = null) {
  const month = data?.month ?? {};
  const guests = month.guests ?? {};
  const compatibility = month.compatibility ?? {};
  return {
    month: number(month.month),
    year: number(month.year),
    guests: {
      total: number(guests.total),
      pl: number(guests.pl),
      fr: number(guests.fr),
      other: number(guests.other),
    },
    averagePercent: number(compatibility.averagePercent),
    answered: number(compatibility.answered),
    total: number(compatibility.total),
    hasData: month.hasData === true,
  };
}

export function buildBeforeSeasonModel(data = null) {
  const plan = data?.seasonPlan ?? {};
  const destinations = Array.isArray(plan.destinations) ? plan.destinations : [];
  const completed = number(plan.weddings?.completed);
  const upcoming = number(plan.weddings?.upcoming);
  return {
    seasonYear: number(data?.seasonYear),
    destinations: destinations.length,
    destinationList: destinations,
    daysUntil: number(data?.nextWedding?.daysUntil),
    hasPlan: destinations.length > 0,
    available: (completed ?? 0) === 0 && (upcoming ?? 0) > 0,
  };
}

function destinationLine(destinations) {
  return destinations
    .map((entry) =>
      [entry.country, entry.completed ?? entry.planned]
        .filter((value) => value != null && value !== '')
        .join(' '),
    )
    .join(' · ');
}

export function monthCaptionLines(model, locale = 'fr') {
  const value = (input, suffix = '') => (input == null ? '—' : `${input}${suffix}`);
  if (!model.hasData) {
    return [
      locale === 'fr' ? 'Mois sans données complètes' : 'Miesiąc bez pełnych danych',
      locale === 'fr' ? 'Publiez les récapitulatifs du mois.' : 'Opublikuj podsumowania miesiąca.',
    ];
  }
  if (locale === 'fr') {
    return [
      `Mois ${model.month ?? ''}/${model.year ?? ''}`,
      `Invités : ${value(model.guests.total)} · PL ${value(model.guests.pl)} · FR ${value(model.guests.fr)} · autres ${value(model.guests.other)}`,
      `${value(model.averagePercent, '%')} de compatibilité · ${value(model.answered)}/${value(model.total)} réponses`,
    ];
  }
  return [
    `Miesiąc ${model.month ?? ''}/${model.year ?? ''}`,
    `Goście: ${value(model.guests.total)} · PL ${value(model.guests.pl)} · FR ${value(model.guests.fr)} · inni ${value(model.guests.other)}`,
    `${value(model.averagePercent, '%')} zgodności · ${value(model.answered)}/${value(model.total)} odpowiedzi`,
  ];
}

export function beforeSeasonCaptionLines(model, locale = 'fr') {
  const value = (input, suffix = '') => (input == null ? '—' : `${input}${suffix}`);
  if (!model.available || !model.hasPlan) {
    return [
      locale === 'fr' ? 'Avant-saison indisponible' : 'Przed sezonem niedostępne',
      locale === 'fr' ? 'Aucun plan de saison à venir.' : 'Brak planu nadchodzącego sezonu.',
    ];
  }
  if (locale === 'fr') {
    return [
      `Saison ${model.seasonYear ?? ''} · avant-saison`,
      `${model.destinations} destinations : ${destinationLine(model.destinationList)}`,
      `J−${value(model.daysUntil)} avant le premier mariage`,
    ];
  }
  return [
    `Sezon ${model.seasonYear ?? ''} · przed sezonem`,
    `${model.destinations} kierunków: ${destinationLine(model.destinationList)}`,
    `J−${value(model.daysUntil)} do pierwszego wesela`,
  ];
}

function legacySeasonCaptionLines(model, locale = 'fr') {
  const value = (input, suffix = '') => (input == null ? '—' : `${input}${suffix}`);
  if (locale === 'fr') {
    return [
      `Saison ${model.seasonYear ?? ''} — Test Zgodności`,
      `${value(model.averagePercent, '%')} de compatibilité sur ${value(model.compatibilityWeddings)} mariages`,
      `${value(model.answered)}/${value(model.total)} réponses agrégées`,
      model.topQuestion
        ? `Question la plus partagée : ${value(model.topQuestion.percent, '%')}`
        : 'Assez de données pour lancer le sondage.',
    ];
  }
  return [
    `Sezon ${model.seasonYear ?? ''} — Test Zgodności`,
    `${value(model.averagePercent, '%')} zgodności w ${value(model.compatibilityWeddings)} weselach`,
    `${value(model.answered)}/${value(model.total)} zagregowanych odpowiedzi`,
    model.topQuestion
      ? `Najczęściej zgodne pytanie: ${value(model.topQuestion.percent, '%')}`
      : 'Wystarczająco danych, aby uruchomić ankietę.',
  ];
}

export function seasonCaptionLines(model, locale = 'fr') {
  const value = (input, suffix = '') => (input == null ? '—' : `${input}${suffix}`);
  if (!model.available) {
    return [
      locale === 'fr' ? 'Saison pas encore terminée' : 'Sezon jeszcze się nie zakończył',
      locale === 'fr' ? 'Disponible après le dernier mariage.' : 'Dostępne po ostatnim weselu.',
    ];
  }
  const base = legacySeasonCaptionLines(model, locale);
  const extra =
    locale === 'fr'
      ? [
          `${value(model.completed)} mariages terminés · ${value(model.upcoming)} à venir · ${value(model.planned)} prévus`,
          `${model.destinations} destinations : ${destinationLine(model.destinationList)}`,
          `Sto Lat : ${value(model.stolatWeddings)} mariages`,
        ]
      : [
          `${value(model.completed)} zakończonych wesel · ${value(model.upcoming)} nadchodzących · ${value(model.planned)} zaplanowanych`,
          `${model.destinations} kierunków: ${destinationLine(model.destinationList)}`,
          `Sto Lat: ${value(model.stolatWeddings)} wesel`,
        ];
  return [...base.slice(0, 1), ...extra, ...base.slice(1)];
}

export function seasonCaption(model, locale = 'fr') {
  return buildSocialCaption({ locale, lines: seasonCaptionLines(model, locale) });
}
