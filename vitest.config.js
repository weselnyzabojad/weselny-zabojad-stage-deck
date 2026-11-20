import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      // Tests exercise the real demo cartridge regardless of build flags.
      '@demo': fileURLToPath(new URL('./src/demo/demoWedding.js', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['tests/local/**'],
    reporters: ['default'],
  },
});
