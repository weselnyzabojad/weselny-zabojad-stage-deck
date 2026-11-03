// Removed Issue #16 module (project.md TODO 20 / D10).
//
// `coHosts` and `contentCreators` are gone from the app, UI and importer
// summary. The v1.1 schema keeps their definitions so older cartridges still
// validate, but they are dropped whenever a cartridge is stored or imported.

export function dropDeprecatedCartridgeFields(cartridge) {
  if (!cartridge || typeof cartridge !== 'object') return cartridge;
  if (!('coHosts' in cartridge) && !('contentCreators' in cartridge)) return cartridge;

  const copy = { ...cartridge };
  delete copy.coHosts;
  delete copy.contentCreators;
  return copy;
}

export function hasLegacyTeamBlocks(cartridge) {
  return Boolean(
    (Array.isArray(cartridge?.coHosts) && cartridge.coHosts.length > 0) ||
      (Array.isArray(cartridge?.contentCreators) && cartridge.contentCreators.length > 0),
  );
}
