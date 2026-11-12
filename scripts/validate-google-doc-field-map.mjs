import { validateFieldMap } from '../schema/google-doc-field-map-lib.mjs';

const { ok, errors, summary } = validateFieldMap();

if (!ok) {
  console.error('Google Doc field map is invalid:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Google Doc field map OK: ${summary.files} files, ${summary.fields} flagged fields.`,
);
for (const [status, count] of Object.entries(summary.statuses).sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`  ${status}: ${count}`);
}
