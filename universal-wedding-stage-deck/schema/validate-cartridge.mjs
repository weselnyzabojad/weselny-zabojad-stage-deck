#!/usr/bin/env node
// Structural + semantic validation for WeddingSchema v1.1 cartridges.
//
// Usage:
//   node schema/validate-cartridge.mjs
//   node schema/validate-cartridge.mjs path/to/cartridge.json

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(here, 'wedding-schema-v1.1.json');
const cartridgePath = process.argv[2] ?? path.join(here, 'wedding-cartridge.example.json');

const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
const cartridge = JSON.parse(await readFile(cartridgePath, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const errors = [];

const pushError = (location, message) => {
  errors.push({ location, message });
};

const ids = new Set();
const stepIds = [];
const steps = Array.isArray(cartridge.steps) ? cartridge.steps : [];

for (const [index, step] of steps.entries()) {
  if (!step || typeof step !== 'object') continue;
  if (typeof step.id === 'string') {
    if (ids.has(step.id)) pushError(`/steps/${index}/id`, `duplicate step id "${step.id}"`);
    ids.add(step.id);
    stepIds.push(step.id);
  }
}

if (cartridge.liveSyncState && typeof cartridge.liveSyncState === 'object') {
  const live = cartridge.liveSyncState;
  const known = new Set(stepIds);
  const checkRefs = (value, location) => {
    if (!Array.isArray(value)) return;
    for (const [index, id] of value.entries()) {
      if (!known.has(id)) pushError(`${location}/${index}`, `unknown step id "${id}"`);
    }
  };

  checkRefs(live.completed_step_ids, '/liveSyncState/completed_step_ids');
  checkRefs(live.deferred_step_ids, '/liveSyncState/deferred_step_ids');
  checkRefs(live.step_order, '/liveSyncState/step_order');

  if (live.active_step_id != null && !known.has(live.active_step_id)) {
    pushError('/liveSyncState/active_step_id', `unknown step id "${live.active_step_id}"`);
  }
  if (live.active_step_id != null && live.completed_step_ids?.includes(live.active_step_id)) {
    pushError('/liveSyncState/active_step_id', 'active step cannot also be completed');
  }
  if (live.active_step_id != null && live.deferred_step_ids?.includes(live.active_step_id)) {
    pushError('/liveSyncState/active_step_id', 'active step cannot also be deferred');
  }
  for (const [index, id] of (live.deferred_step_ids ?? []).entries()) {
    if (live.completed_step_ids?.includes(id)) {
      pushError(`/liveSyncState/deferred_step_ids/${index}`, 'deferred step cannot be completed');
    }
  }

  const pingStep = live.stage_ping?.step_id;
  if (pingStep != null && !known.has(pingStep)) {
    pushError('/liveSyncState/stage_ping/step_id', `unknown step id "${pingStep}"`);
  }
}

const uniqueList = (items, location, label) => {
  if (!Array.isArray(items)) return;
  const seen = new Set();
  for (const [index, item] of items.entries()) {
    const id = item?.id;
    if (typeof id !== 'string') continue;
    if (seen.has(id)) pushError(`${location}/${index}/id`, `duplicate ${label} id "${id}"`);
    seen.add(id);
  }
};

uniqueList(cartridge.hardAnchors, '/hardAnchors', 'hard anchor');
uniqueList(cartridge.tact_and_vip_alerts, '/tact_and_vip_alerts', 'VIP alert');
uniqueList(cartridge.jokerGames, '/jokerGames', 'joker');

if (
  Number.isInteger(cartridge.jokersCount) &&
  Array.isArray(cartridge.jokerGames) &&
  cartridge.jokersCount !== cartridge.jokerGames.length
) {
  pushError(
    '/jokersCount',
    `jokersCount ${cartridge.jokersCount} does not match jokerGames.length ${cartridge.jokerGames.length}`,
  );
}
if (
  Number.isInteger(cartridge.vipRadarCount) &&
  Array.isArray(cartridge.tact_and_vip_alerts) &&
  cartridge.vipRadarCount !== cartridge.tact_and_vip_alerts.length
) {
  pushError(
    '/vipRadarCount',
    `vipRadarCount ${cartridge.vipRadarCount} does not match tact_and_vip_alerts.length ${cartridge.tact_and_vip_alerts.length}`,
  );
}

for (const [index, step] of steps.entries()) {
  const buffer = step?.buffer;
  if (!buffer || typeof buffer !== 'object') continue;
  if (
    Number.isFinite(buffer.minDurationMin) &&
    Number.isFinite(buffer.maxDurationMin) &&
    buffer.minDurationMin > buffer.maxDurationMin
  ) {
    pushError(`/steps/${index}/buffer`, 'minDurationMin cannot exceed maxDurationMin');
  }
  if (
    Number.isFinite(step.durationMin) &&
    Number.isFinite(buffer.minDurationMin) &&
    step.durationMin < buffer.minDurationMin
  ) {
    pushError(`/steps/${index}/durationMin`, 'durationMin is below buffer.minDurationMin');
  }
  if (
    Number.isFinite(step.durationMin) &&
    Number.isFinite(buffer.maxDurationMin) &&
    step.durationMin > buffer.maxDurationMin
  ) {
    pushError(`/steps/${index}/durationMin`, 'durationMin is above buffer.maxDurationMin');
  }
}

if (!validate(cartridge)) {
  for (const error of validate.errors ?? []) {
    pushError(error.instancePath || '/', error.message ?? 'schema validation failed');
  }
}

if (errors.length > 0) {
  console.error(`✗ ${cartridgePath} is not a valid WeddingSchema v1.1 cartridge\n`);
  for (const error of errors) {
    console.error(`  ${error.location}: ${error.message}`);
  }
  process.exit(1);
}

console.log(
  `✓ ${path.basename(cartridgePath)} is a valid WeddingSchema v1.1 cartridge ` +
    `(${steps.length} steps, ${cartridge.hardAnchors?.length ?? 0} hard anchors).`,
);
