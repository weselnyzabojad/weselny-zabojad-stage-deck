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
  return {
    seasonYear: number(data?.seasonYear),
    weddings: number(data?.coverage?.weddings) ?? weddings,
    completed: number(data?.seasonPlan?.weddings?.completed),
    guests: number(data?.seasonPlan?.guests?.completed) ?? number(data?.kpis?.guests?.total),
    destinations: Array.isArray(data?.kpis?.destinations) ? data.kpis.destinations.length : null,
    averagePercent,
    answered,
    total,
    compatibilityWeddings: weddings,
    topQuestion: compatibility.topQuestion ?? null,
    hasData: Boolean((weddings ?? 0) > 0 || (answered ?? 0) > 0 || (averagePercent ?? 0) > 0),
  };
}

export function seasonCaptionLines(model, locale = 'fr') {
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

export function seasonCaption(model, locale = 'fr') {
  return buildSocialCaption({ locale, lines: seasonCaptionLines(model, locale) });
}
