const RULE_LABELS = {
  sto_lat: 'Sto Lat',
  gorzko: 'Gorzko',
  bread_salt: 'Bread & Salt',
};

function isFrenchSide(person) {
  const nationalities = Array.isArray(person?.nationalities)
    ? person.nationalities.map((code) => String(code).toUpperCase())
    : [];
  if (nationalities.length > 0) return nationalities.includes('FR');
  const languages = Array.isArray(person?.spokenLanguages)
    ? person.spokenLanguages.map((code) => String(code).toUpperCase())
    : [];
  return languages.includes('FR');
}

export function frenchParentSides(coupleProfile = {}) {
  const sides = [];
  if (isFrenchSide(coupleProfile.bride)) sides.push('bride');
  if (isFrenchSide(coupleProfile.groom)) sides.push('groom');
  return sides;
}

export function culturalParentActions(culturalRules = {}, coupleProfile = {}) {
  const sides = frenchParentSides(coupleProfile);
  if (sides.length === 0) return [];
  return Object.entries(culturalRules)
    .filter(([, rule]) => rule?.actor === 'PARENTS')
    .flatMap(([ruleKey, rule]) =>
      sides.map((side) => ({
        ruleKey,
        side,
        label: RULE_LABELS[ruleKey] ?? ruleKey,
        text: `Expliquer ${RULE_LABELS[ruleKey] ?? ruleKey} aux parents francophones`,
        rule,
      })),
    );
}
