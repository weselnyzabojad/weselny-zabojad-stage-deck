// Projection and drift math now live in `driftEngine.js`. Re-exported here so
// existing imports (`buildTimeline`, `computeDriftMinutes`, ...) keep working.
export * from './driftEngine.js';
