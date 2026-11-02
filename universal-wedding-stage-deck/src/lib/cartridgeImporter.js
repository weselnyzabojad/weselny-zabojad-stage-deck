import weddingSchema from '../../schema/wedding-schema-v1.1.json';
import { collectSemanticErrors } from './cartridgeValidation';

let validatorPromise = null;

// Ajv is loaded on demand so the main stage-deck bundle stays lean. The PWA
// still precaches the chunk, so importing works offline after first load.
async function getValidator() {
  if (!validatorPromise) {
    validatorPromise = import('ajv/dist/2020.js').then(({ default: Ajv2020 }) => {
      const ajv = new Ajv2020({ allErrors: true, strict: false });
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

export async function validateCartridge(cartridge) {
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
  return { valid: errors.length === 0, errors };
}

export function summarizeCartridge(cartridge) {
  const steps = Array.isArray(cartridge?.steps) ? cartridge.steps : [];
  const buffers = steps.filter((step) => step?.type === 'BUFFER');
  const anchors = Array.isArray(cartridge?.hardAnchors) ? cartridge.hardAnchors : [];
  const vipAlerts = Array.isArray(cartridge?.tact_and_vip_alerts)
    ? cartridge.tact_and_vip_alerts
    : [];
  const preWedding = Array.isArray(cartridge?.preWeddingTodos)
    ? cartridge.preWeddingTodos
    : [];
  const jokers = Array.isArray(cartridge?.jokerGames) ? cartridge.jokerGames : [];

  return {
    couple: cartridge?.couple ?? '—',
    date: cartridge?.date ?? '—',
    syncPin: cartridge?.syncPin ?? '—',
    stepCount: steps.length,
    bufferCount: buffers.length,
    hardAnchorCount: anchors.length,
    vipAlertCount: vipAlerts.length,
    preWeddingCount: preWedding.length,
    jokerCount: jokers.length,
  };
}
