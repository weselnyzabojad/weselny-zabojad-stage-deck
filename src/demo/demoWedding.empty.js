// Production replacement for `demoWedding.js` (issue #798).
//
// The Vite alias `@demo` points here whenever the build is not an explicit
// local/demo build, so no demo cartridge data enters the production graph.
// Production code never renders this shape: App uses the joined cartridge and
// the join gate, and StageDeck receives real wedding data.

export const DEFAULT_WEDDING = {
  weddingId: '',
  syncPin: '',
  liveSyncState: {},
  steps: [],
};

export function buildInitialLiveState() {
  return {};
}
