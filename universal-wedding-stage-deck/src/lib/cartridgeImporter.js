import weddingSchema from '../../schema/wedding-schema-v1.1.json';
import oczepinyDomain from '../../schema/domains/oczepiny.json';
import firstDanceDomain from '../../schema/domains/first-dance.json';
import attractionsDomain from '../../schema/domains/attractions.json';
import culturalRulesDomain from '../../schema/domains/cultural-rules.json';
import coupleProfileDomain from '../../schema/domains/couple-profile.json';
import photoPlanDomain from '../../schema/domains/photo-plan.json';
import miniSessionDomain from '../../schema/domains/mini-session.json';
import groupPhotosDomain from '../../schema/domains/group-photos.json';
import speedFotoDomain from '../../schema/domains/speed-foto.json';
import guestCoverageDomain from '../../schema/domains/guest-coverage.json';
import specialEffectsDomain from '../../schema/domains/special-effects.json';
import cakeDomain from '../../schema/domains/cake.json';
import { collectSemanticErrors } from './cartridgeValidation';
import { applyCalculatedDurations } from './stepDurations.js';

let validatorPromise = null;

// Ajv is loaded on demand so the main stage-deck bundle stays lean. The PWA
// still precaches the chunk, so importing works offline after first load.
async function getValidator() {
  if (!validatorPromise) {
    validatorPromise = import('ajv/dist/2020.js').then(({ default: Ajv2020 }) => {
      const ajv = new Ajv2020({ allErrors: true, strict: false });
      // Register the per-domain schemas the main schema `$ref`s.
      ajv.addSchema(oczepinyDomain);
      ajv.addSchema(firstDanceDomain);
      ajv.addSchema(attractionsDomain);
      ajv.addSchema(culturalRulesDomain);
      ajv.addSchema(coupleProfileDomain);
      ajv.addSchema(photoPlanDomain);
      ajv.addSchema(miniSessionDomain);
      ajv.addSchema(groupPhotosDomain);
      ajv.addSchema(speedFotoDomain);
      ajv.addSchema(guestCoverageDomain);
      ajv.addSchema(specialEffectsDomain);
      ajv.addSchema(cakeDomain);
      return ajv.compile(weddingSchema);
    });
  }
  return validatorPromise;
}

export function parseCartridgeJson(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return { ok: false, error: 'Paste a JSON cartridge first.' };
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

const DEPRECATED_TOP_LEVEL_FIELDS = ['jokersCount', 'jokerGames', 'weatherVariants'];
const DEPRECATED_STEP_FIELDS = ['deferable', 'weatherOption', 'cateringNotes', 'propsAndFx'];

// Issue #75: delete, do not migrate. Old v1.1 cartridges may still contain the
// retired fields; strip them before validation so the importer accepts the
// cartridge and saves a clean object without those keys.
export function sanitizeCartridge(cartridge) {
  if (!cartridge || typeof cartridge !== 'object' || Array.isArray(cartridge)) {
    return cartridge;
  }

  const clean = JSON.parse(JSON.stringify(cartridge));
  for (const field of DEPRECATED_TOP_LEVEL_FIELDS) delete clean[field];

  for (const step of Array.isArray(clean.steps) ? clean.steps : []) {
    if (!step || typeof step !== 'object') continue;
    for (const field of DEPRECATED_STEP_FIELDS) delete step[field];
  }

  if (clean.liveSyncState && typeof clean.liveSyncState === 'object') {
    delete clean.liveSyncState.deferred_step_ids;
    delete clean.liveSyncState.manual_offset_minutes;
  }

  if (Array.isArray(clean.steps)) {
    const computed = applyCalculatedDurations(clean.steps, {
      closureTime: clean.mandatorySteps?.closureTime ?? null,
    });
    if (computed.errors.length === 0) clean.steps = computed.steps;
  }

  return clean;
}

export async function validateCartridge(input) {
  const cartridge = sanitizeCartridge(input);
  const errors = [];

  try {
    const validate = await getValidator();
    if (!validate(cartridge)) {
      for (const error of validate.errors ?? []) {
        errors.push({
          location: error.instancePath || '/',
          message: error.message ?? 'schema validation failed',
        });
      }
    }
  } catch (error) {
    errors.push({
      location: '/',
      message: `Schema validator failed to load: ${error.message}`,
    });
  }

  errors.push(...collectSemanticErrors(cartridge));
  return { valid: errors.length === 0, errors, cartridge };
}

export function summarizeCartridge(cartridge) {
  const steps = Array.isArray(cartridge?.steps) ? cartridge.steps : [];
  const flexibleSteps = steps.filter((step) => step?.type === 'FLEXIBLE');
  const anchors = Array.isArray(cartridge?.hardAnchors) ? cartridge.hardAnchors : [];
  const preWedding = Array.isArray(cartridge?.preWeddingTodos)
    ? cartridge.preWeddingTodos
    : [];
  const keySongs = Array.isArray(cartridge?.musicPolicy?.importantSongs)
    ? cartridge.musicPolicy.importantSongs
    : [];
  const cake = cartridge?.cake && typeof cartridge.cake === 'object' ? cartridge.cake : null;
  const musicPolicy =
    cartridge?.musicPolicy && typeof cartridge.musicPolicy === 'object'
      ? cartridge.musicPolicy
      : null;

  return {
    couple: cartridge?.couple ?? '—',
    date: cartridge?.date ?? '—',
    syncPin: cartridge?.syncPin ?? '—',
    stepCount: steps.length,
    flexibleStepCount: flexibleSteps.length,
    hardAnchorCount: anchors.length,
    preWeddingCount: preWedding.length,
    keySongCount: keySongs.length,
    hasCake: Boolean(cake),
    cakeTime: cake?.time ?? null,
    cakeServeTime: cake?.serveTime ?? null,
    mustPlayCount: Array.isArray(musicPolicy?.mustPlay) ? musicPolicy.mustPlay.length : 0,
    doNotPlayCount: Array.isArray(musicPolicy?.doNotPlay) ? musicPolicy.doNotPlay.length : 0,
    requestsOpen:
      typeof musicPolicy?.requestsOpen === 'boolean' ? musicPolicy.requestsOpen : null,
    cleanVersions:
      typeof musicPolicy?.cleanVersions === 'boolean' ? musicPolicy.cleanVersions : null,
  };
}
