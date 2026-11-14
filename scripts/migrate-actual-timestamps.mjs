#!/usr/bin/env node
// Migrate a cartridge's live-state actual timestamps to canonical ISO datetimes
// (project.md TODO 23 / issue #65).
//
// Usage:
//   node scripts/migrate-actual-timestamps.mjs <cartridge.json>
//   node scripts/migrate-actual-timestamps.mjs <cartridge.json> --write
//   node scripts/migrate-actual-timestamps.mjs <cartridge.json> --check
//
// Dry-run by default. `--check` exits 1 when a migration is needed, so CI can
// guard a cartridge library. `--write` rewrites the file in place.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  isIsoTimestamp,
  migrateActualTimestamps,
  resolveEventDateISO,
  resolveVenueTimeZone,
} from '../src/lib/eventTime.js';

const args = process.argv.slice(2);
const file = args.find((argument) => !argument.startsWith('--'));
const write = args.includes('--write');
const check = args.includes('--check');
const help = args.includes('--help') || args.includes('-h');

if (help || !file) {
  console.log(
    'Usage: node scripts/migrate-actual-timestamps.mjs <cartridge.json> [--write] [--check]',
  );
  process.exit(help ? 0 : 2);
}

const cartridgePath = path.resolve(file);
let cartridge;
try {
  cartridge = JSON.parse(await readFile(cartridgePath, 'utf8'));
} catch (error) {
  console.error(`Cannot read ${cartridgePath}: ${error.message}`);
  process.exit(2);
}

const live = cartridge.liveSyncState ?? cartridge.live_sync_state ?? null;
if (!live || typeof live !== 'object') {
  console.error(`${cartridgePath}: no liveSyncState / live_sync_state block to migrate.`);
  process.exit(2);
}

const key = Object.hasOwn(live, 'actualTimestamps') ? 'actualTimestamps' : 'actual_timestamps';
const before = live[key] && typeof live[key] === 'object' ? live[key] : {};

const eventDateISO = resolveEventDateISO(cartridge);
if (!eventDateISO) {
  console.error(
    `${cartridgePath}: cannot resolve the event date. Add dateISO, a YYYY-MM-DD weddingId prefix or a DD.MM.YYYY date.`,
  );
  process.exit(2);
}

const timeZone = resolveVenueTimeZone(cartridge);
if (!cartridge.venueDetails?.timezone && !cartridge.timezone) {
  console.warn(
    `warning: ${cartridgePath} has no venue timezone; using the device timezone (${timeZone}).`,
  );
}
const after = migrateActualTimestamps(before, { eventDateISO, timeZone });
const changedKeys = Object.keys(before).filter((id) => before[id] !== after[id]);
const removedKeys = Object.keys(before).filter((id) => !(id in after));
const changed = changedKeys.length > 0 || removedKeys.length > 0;

for (const id of changedKeys) {
  const from = before[id];
  const to = after[id];
  const fromLabel = isIsoTimestamp(from) ? from : `"${from}" (legacy HH:MM)`;
  console.log(`  ${id}: ${fromLabel} -> ${to}`);
}
for (const id of removedKeys) {
  console.log(`  ${id}: removed (empty or invalid timestamp)`);
}

if (!changed) {
  console.log(
    `✓ ${key} is already ISO in ${cartridgePath} (${Object.keys(after).length} entries, ${timeZone}).`,
  );
  process.exit(0);
}

if (write) {
  live[key] = after;
  await writeFile(cartridgePath, `${JSON.stringify(cartridge, null, 2)}\n`, 'utf8');
  console.log(`✓ Wrote ISO timestamps to ${cartridgePath} (${changedKeys.length} changed).`);
  process.exit(0);
}

console.log(
  `\n${changedKeys.length} timestamp(s) need migration in ${cartridgePath}. ` +
    'Re-run with --write to update the file.',
);
if (check) process.exit(1);
