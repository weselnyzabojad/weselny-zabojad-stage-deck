// Translation-completeness gate for the per-device UI locales (issue #78).
//
// Fails when a locale is missing a key, adds an unexpected key, leaves a value
// empty, or drops/adds an interpolation placeholder relative to English.
import en from '../src/i18n/en.js';
import fr from '../src/i18n/fr.js';
import pl from '../src/i18n/pl.js';

const LOCALES = { fr, pl };
const REFERENCE = en;
const referenceKeys = Object.keys(REFERENCE);

function placeholders(value) {
  return [...String(value).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

let failed = false;

for (const [locale, dictionary] of Object.entries(LOCALES)) {
  const missing = referenceKeys.filter((key) => !(key in dictionary));
  const extra = Object.keys(dictionary).filter((key) => !(key in REFERENCE));
  const empty = referenceKeys.filter(
    (key) => key in dictionary && typeof dictionary[key] === 'string' && !dictionary[key].trim(),
  );

  const placeholderMismatches = referenceKeys.filter((key) => {
    if (!(key in dictionary)) return false;
    return placeholders(REFERENCE[key]).join(',') !== placeholders(dictionary[key]).join(',');
  });

  const problems = [];
  if (missing.length) problems.push(`missing keys: ${missing.join(', ')}`);
  if (extra.length) problems.push(`unexpected keys: ${extra.join(', ')}`);
  if (empty.length) problems.push(`empty values: ${empty.join(', ')}`);
  if (placeholderMismatches.length) {
    problems.push(`placeholder mismatch: ${placeholderMismatches.join(', ')}`);
  }

  if (problems.length) {
    failed = true;
    console.error(`✗ ${locale}:`);
    for (const problem of problems) console.error(`  - ${problem}`);
  } else {
    console.log(`✓ ${locale}: ${referenceKeys.length} keys complete`);
  }
}

if (failed) process.exit(1);
console.log(`✓ Translations complete: ${referenceKeys.length} keys across ${Object.keys(LOCALES).length + 1} locales.`);
