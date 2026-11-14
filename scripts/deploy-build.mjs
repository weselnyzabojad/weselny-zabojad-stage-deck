// Netlify build entry point (issue #797).
//
// Production deploys must explicitly declare production deck mode. Preview and
// local builds stay unchanged, and the app itself also fails closed by
// defaulting production builds to `production` when the variable is missing.
import { build } from 'vite';
import { collectClientEnv, formatReport, validateEnv } from './validate-env.mjs';

if (process.env.CONTEXT === 'production') {
  const { env, loaded } = collectClientEnv();
  const result = validateEnv(env, {
    allowMissing: true,
    requireProduction: true,
  });
  if (result.errors.length > 0) {
    console.error(formatReport(result, { files: loaded.loaded }));
    process.exit(1);
  }
}

await build();
