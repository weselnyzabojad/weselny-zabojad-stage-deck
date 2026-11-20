// Dev/recette-only coherent fixtures for the three season widget states.
// Loaded dynamically only when `?previewState` is enabled by the preview flag.

const FIXTURES = {
  pre: {
    seasonYear: 2027,
    hasData: false,
    nextWedding: { city: 'Kraków', country: 'PL', month: 6, year: 2027 },
    seasonPlan: {
      state: 'pre',
      year: 2027,
      weddings: { total: 12, completed: 0, upcoming: 12 },
      guests: { planned: 1480, completed: null },
      destinations: [
        { country: 'PL', planned: 6, completed: 0 },
        { country: 'FR', planned: 4, completed: 0 },
        { country: 'BE', planned: 2, completed: 0 },
      ],
    },
  },
  live: {
    seasonYear: 2026,
    hasData: true,
    nextWedding: { city: 'Lyon', country: 'FR', month: 9, year: 2026 },
    seasonPlan: {
      state: 'live',
      year: 2026,
      weddings: { total: 18, completed: 7, upcoming: 11 },
      guests: { planned: 2400, completed: 920 },
      destinations: [
        { country: 'PL', planned: 10, completed: 4 },
        { country: 'FR', planned: 5, completed: 2 },
        { country: 'BE', planned: 3, completed: 1 },
      ],
    },
  },
  post: {
    seasonYear: 2025,
    hasData: true,
    nextWedding: null,
    seasonPlan: {
      state: 'post',
      year: 2025,
      weddings: { total: 16, completed: 16, upcoming: 0 },
      guests: { planned: 2100, completed: 2100 },
      destinations: [
        { country: 'PL', planned: 9, completed: 9 },
        { country: 'FR', planned: 4, completed: 4 },
        { country: 'BE', planned: 3, completed: 3 },
      ],
    },
  },
};

export function previewSeasonStats(state, now = new Date()) {
  const fixture = FIXTURES[state];
  if (!fixture) return null;
  const plan = fixture.seasonPlan;
  return {
    ...fixture,
    generatedAt: now.toISOString(),
    coverage: {
      weddings: plan.weddings.completed,
      guestCounts: plan.guests.completed == null ? 0 : plan.weddings.completed,
      countries: plan.destinations.filter((entry) => entry.completed > 0).length,
      stolat: 0,
      animations: 0,
    },
    kpis: {
      guests: { total: plan.guests.completed },
      destinations: plan.destinations
        .filter((entry) => entry.completed > 0)
        .map((entry) => ({ country: entry.country, weddings: entry.completed })),
      stolatWeddings: 0,
      animations: { total: null },
    },
  };
}

export default previewSeasonStats;
