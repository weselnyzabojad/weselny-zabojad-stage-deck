// Public under-construction release routing (issue #1298).
//
// The public surface intentionally exposes only the under-construction page at
// `/` and the season statistics embed. Every other route is handled by the
// Netlify 404 redirect; this helper keeps the client-side decision testable.
import { parseSeasonStatsEmbed } from './publicRoutes.js';

export function resolvePublicRoute(pathname = '', search = '', baseUrl = '/') {
  const embed = parseSeasonStatsEmbed(pathname, search, baseUrl);
  if (embed) return { kind: 'embed', embed };

  let rest = pathname || '/';
  if (baseUrl && baseUrl !== '/' && rest.startsWith(baseUrl)) {
    rest = rest.slice(baseUrl.length);
    if (!rest.startsWith('/')) rest = `/${rest}`;
  }
  if (rest === '/' || rest === '/index.html') return { kind: 'home' };
  return { kind: 'not-found' };
}
