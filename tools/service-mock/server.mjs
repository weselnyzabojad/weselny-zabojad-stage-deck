#!/usr/bin/env node
// Local stand-in for the third-party health endpoints used by `service_health`.
// Local development only: it never proxies to a real provider, so monitoring in
// dev cannot leak traffic or alerts to Sentry or sunrise-sunset.org.
//
// Routes:
//   GET /health                                  mock liveness
//   GET /sentry/api/0/projects/:org/:project/    requires any Bearer token
//   GET /sunset                                  sunrise-sunset style payload
//   GET /auth/v1/health                          local Supabase auth shape
//   GET /rest/v1/                                local Supabase REST shape
//
// Add `?status=500` to a provider route to simulate a failure in dev.

import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

function sendJson(res, status, payload) {
  const text = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
  });
  res.end(text);
}

function overrideStatus(url, fallback) {
  const status = Number(url.searchParams.get('status'));
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : fallback;
}

export function createServiceMock() {
  async function handler(req, res) {
    const url = new URL(req.url ?? '/', 'http://service-mock');
    const path = url.pathname;

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === 'GET' && path === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }
    if (req.method === 'GET' && /^\/sentry\/api\/0\/projects\/[^/]+\/[^/]+\/?$/.test(path)) {
      const authorization = req.headers.authorization ?? '';
      const status = overrideStatus(url, /^Bearer\s+\S+/.test(authorization) ? 200 : 401);
      if (status !== 200) {
        sendJson(res, status, { detail: 'mock Sentry failure' });
        return;
      }
      sendJson(res, 200, { slug: 'stage-deck', status: 'active' });
      return;
    }
    if ((req.method === 'GET' || req.method === 'HEAD') && path === '/deck') {
      const status = overrideStatus(url, 200);
      if (req.method === 'HEAD') {
        res.writeHead(status, { 'Content-Type': 'text/html' });
        res.end();
        return;
      }
      res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(status === 200 ? '<!doctype html><title>Stage Deck</title>' : 'Deck failure');
      return;
    }
    if (req.method === 'GET' && path === '/sunset') {      const status = overrideStatus(url, 200);
      if (status !== 200) {
        sendJson(res, status, { status: 'ERROR' });
        return;
      }
      sendJson(res, 200, {
        results: {
          sunrise: '2026-08-20T04:40:00+00:00',
          sunset: '2026-08-20T18:35:00+00:00',
          day_length: 50000,
        },
        status: 'OK',
      });
      return;
    }
    if (req.method === 'GET' && path === '/auth/v1/health') {
      const status = overrideStatus(url, 200);
      sendJson(res, status, status === 200 ? { version: 'service-mock', name: 'GoTrue' } : { error: 'mock auth failure' });
      return;
    }
    if (req.method === 'GET' && path === '/rest/v1/') {
      const status = overrideStatus(url, 200);
      sendJson(
        res,
        status,
        status === 200 ? { openapi: '3.0.0', info: { title: 'service-mock' } } : { error: 'mock rest failure' },
      );
      return;
    }
    sendJson(res, 404, { error: 'Not found.' });
  }

  return { handler };
}

export function startServiceMock({ host = '0.0.0.0', port = Number(process.env.PORT) || 8080 } = {}) {
  const mock = createServiceMock();
  const server = createServer((req, res) => {
    mock.handler(req, res);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      resolve({
        port: actualPort,
        url: `http://127.0.0.1:${actualPort}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const mock = await startServiceMock();
  console.log(`Service health mock listening on ${mock.url}`);
}
