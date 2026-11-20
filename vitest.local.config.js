import { defineConfig } from 'vitest/config';

// Opt-in integration suite. Run through `npm run test:local`, which supplies the
// local Supabase URL/keys and refuses hosted targets.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/local/**/*.test.js'],
    reporters: ['default'],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
