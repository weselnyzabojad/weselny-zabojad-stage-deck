import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  isOriginAllowed,
  matchingOrigin,
  parseAllowedOrigins,
  withCors,
} from '../../supabase/functions/_shared/cors.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const request = (origin) =>
  new Request('https://example.supabase.co/functions/v1/admin_api', {
    headers: origin ? { origin } : {},
  });

describe('Edge Function CORS allowlist', () => {
  it('parses a comma-separated list of exact origins', () => {
    expect(parseAllowedOrigins(' https://deck.example , http://localhost:5173 , ')).toEqual([
      'https://deck.example',
      'http://localhost:5173',
    ]);
    expect(parseAllowedOrigins('')).toEqual([]);
  });

  it('allows browser requests without an Origin header', () => {
    expect(matchingOrigin(request(null), 'https://deck.example')).toBe('');
    expect(isOriginAllowed(request(null), 'https://deck.example')).toBe(true);
  });

  it('matches only the configured origins', () => {
    const configured = 'https://deck.example, http://localhost:5173';
    expect(isOriginAllowed(request('http://localhost:5173'), configured)).toBe(true);
    expect(isOriginAllowed(request('https://deck.example'), configured)).toBe(true);
    expect(isOriginAllowed(request('https://evil.example'), configured)).toBe(false);
    expect(isOriginAllowed(request('http://localhost:5173'), 'https://deck.example')).toBe(false);
    expect(isOriginAllowed(request('https://evil.example'), '*')).toBe(false);
  });

  it('echoes the matched origin and never the whole configured list', async () => {
    const response = withCors(
      request('http://localhost:5173'),
      new Response('ok', { headers: { 'Content-Type': 'text/plain' } }),
      'https://deck.example,http://localhost:5173',
    );
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(response.headers.get('Vary')).toBe('Origin');
    expect(await response.text()).toBe('ok');
  });

  it('omits CORS headers for a disallowed origin', () => {
    const response = withCors(
      request('https://evil.example'),
      new Response('nope', { status: 403 }),
      'https://deck.example',
    );
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(response.headers.get('Vary')).toBe('Origin');
  });

  it('keeps a single production origin working unchanged', () => {
    const response = withCors(
      request('https://deck.example'),
      new Response('ok'),
      'https://deck.example',
    );
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://deck.example');
  });

  it('routes both admin functions through the shared helper', () => {
    for (const file of ['admin_api', 'admin_drive']) {
      const source = read(`supabase/functions/${file}/index.ts`);
      expect(source).toContain("from '../_shared/cors.js'");
      expect(source).toContain('withCors(req, await handleRequest(req))');
      expect(source).not.toContain('function originAllowed');
    }
  });
});
