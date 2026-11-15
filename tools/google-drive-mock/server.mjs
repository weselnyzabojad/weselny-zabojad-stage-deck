#!/usr/bin/env node
// Local Google Drive v3 stand-in for the admin panel (local development only).
//
// The Edge Functions talk to this server when GOOGLE_DRIVE_API_BASE is set, so
// the Drive panels, folder tree, Doc creation, Doc parsing and Doc migration can
// be exercised without a Google account or real Drive data. It implements only
// the endpoints `_shared/googleDrive.js` calls:
//
//   POST /token
//   GET  /drive/v3/files                (q filter, orderBy name_natural)
//   GET  /drive/v3/files/:id            (metadata, alt=media)
//   GET  /drive/v3/files/:id/export     (text/plain)
//   POST /drive/v3/files                (JSON create)
//   PATCH /drive/v3/files/:id           (rename, addParents/removeParents)
//   POST /upload/drive/v3/files         (multipart Google Doc create)
//   PATCH /upload/drive/v3/files/:id    (media update)
//
// State is in memory and resets with the container. The token endpoint accepts
// any signable service-account assertion and hands out a fixed bearer token; the
// mock never validates Google signatures or scopes.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

export const MOCK_ROOT_FOLDER_ID = '1Q7IVT0GNiLztKQE8l4eCDCRw-px1qheh';
export const MOCK_WEDDING_ID = 'Jennifer&Guillaume-UM-2026-08-001';
export const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
export const DRIVE_DOC_MIME_TYPE = 'application/vnd.google-apps.document';
export const DRIVE_JSON_MIME_TYPE = 'application/json';
const MOCK_OWNER_EMAIL = 'drive-mock@stage-deck.local';

class HttpError extends Error {
  constructor(status, message, reason = '') {
    super(message);
    this.status = status;
    this.reason = reason;
  }
}

function errorPayload(status, message, reason = '') {
  return {
    error: {
      code: status,
      message,
      errors: reason ? [{ message, reason }] : [],
    },
  };
}

function unquote(raw, clause) {
  const match = /^'((?:[^'\\]|\\.)*)'$/.exec(String(raw).trim());
  if (!match) throw new HttpError(400, `Unsupported Drive query: ${clause}`, 'invalid');
  return match[1].replace(/\\(.)/g, '$1');
}

function splitTopLevelClauses(query) {
  const clauses = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < query.length; index += 1) {
    const char = query[index];
    if (char === '\\' && quoted) {
      current += char + (query[index + 1] ?? '');
      index += 1;
      continue;
    }
    if (char === "'") quoted = !quoted;
    if (!quoted && query.startsWith(' and ', index)) {
      clauses.push(current.trim());
      current = '';
      index += ' and '.length - 1;
      continue;
    }
    current += char;
  }
  clauses.push(current.trim());
  return clauses.filter(Boolean);
}

function parseQuery(query) {
  const predicates = [];
  for (const clause of splitTopLevelClauses(String(query ?? ''))) {
    if (/^trashed\s*=\s*false$/.test(clause)) {
      predicates.push((file) => file.trashed === false);
      continue;
    }
    if (/^trashed\s*=\s*true$/.test(clause)) {
      predicates.push((file) => file.trashed === true);
      continue;
    }
    let match =
      /^\(\s*mimeType\s*=\s*('(?:[^'\\]|\\.)*')\s+or\s+mimeType\s*=\s*('(?:[^'\\]|\\.)*')\s*\)$/.exec(
        clause,
      );
    if (match) {
      const types = [unquote(match[1], clause), unquote(match[2], clause)];
      predicates.push((file) => types.includes(file.mimeType));
      continue;
    }
    match = /^mimeType\s*=\s*(.+)$/.exec(clause);
    if (match) {
      const value = unquote(match[1], clause);
      predicates.push((file) => file.mimeType === value);
      continue;
    }
    match = /^name\s+contains\s+(.+)$/.exec(clause);
    if (match) {
      const value = unquote(match[1], clause);
      predicates.push((file) => file.name.includes(value));
      continue;
    }
    match = /^name\s*=\s*(.+)$/.exec(clause);
    if (match) {
      const value = unquote(match[1], clause);
      predicates.push((file) => file.name === value);
      continue;
    }
    match = /^(.+)\s+in\s+parents$/.exec(clause);
    if (match) {
      const value = unquote(match[1], clause);
      predicates.push((file) => file.parents.includes(value));
      continue;
    }
    throw new HttpError(400, `Unsupported Drive query: ${clause}`, 'invalid');
  }
  return (file) => predicates.every((predicate) => predicate(file));
}

function checksum(content) {
  return createHash('md5').update(content, 'utf8').digest('hex');
}

function parseMultipartRelated(body, boundary) {
  let metadata = null;
  let content = '';
  for (const part of body.split(`--${boundary}`)) {
    const normalized = part.replace(/^\r\n/, '');
    if (!normalized || normalized === '--' || normalized === '--\r\n') continue;
    const separator = normalized.indexOf('\r\n\r\n');
    if (separator === -1) continue;
    const headers = normalized.slice(0, separator);
    let payload = normalized.slice(separator + 4);
    if (payload.endsWith('\r\n')) payload = payload.slice(0, -2);
    if (/content-type:\s*application\/json/i.test(headers)) {
      try {
        metadata = JSON.parse(payload);
      } catch {
        throw new HttpError(400, 'Drive mock received malformed Doc metadata.', 'invalid');
      }
    } else {
      content = payload;
    }
  }
  if (!metadata) throw new HttpError(400, 'Drive mock received no Doc metadata.', 'invalid');
  return { metadata, content };
}

export function createMockDrive({ cartridge = '' } = {}) {
  const files = new Map();
  let sequence = 0;

  function insert({ id, name, mimeType, parents = [], content = null, appCreated = true }) {
    sequence += 1;
    const file = {
      id: id ?? `mock-file-${sequence}`,
      name,
      mimeType,
      parents: [...parents],
      content,
      appCreated,
      permissions: [
        {
          id: 'owner',
          type: 'user',
          role: 'owner',
          emailAddress: MOCK_OWNER_EMAIL,
          displayName: 'Stage Deck service account',
        },
      ],
      trashed: false,
      version: 1,
      modifiedTime: new Date().toISOString(),
    };
    files.set(file.id, file);
    return file;
  }

  function folder(parentId, name) {
    const existing = [...files.values()].find(
      (file) =>
        file.mimeType === DRIVE_FOLDER_MIME_TYPE &&
        file.name === name &&
        file.parents.includes(parentId),
    );
    return existing ?? insert({ name, mimeType: DRIVE_FOLDER_MIME_TYPE, parents: [parentId] });
  }

  const root = insert({
    id: MOCK_ROOT_FOLDER_ID,
    name: 'Wesele',
    mimeType: DRIVE_FOLDER_MIME_TYPE,
  });
  const year = folder(root.id, '2026');
  const month = folder(year.id, 'August');
  const wedding = folder(month.id, MOCK_WEDDING_ID);
  folder(wedding.id, 'games');
  const secrets = folder(month.id, 'secrets');
  const privateWedding = folder(secrets.id, MOCK_WEDDING_ID);
  const speeches = folder(privateWedding.id, 'speeches');
  folder(privateWedding.id, 'compatibility-test-game');
  insert({
    name: `${MOCK_WEDDING_ID} - 1 - Mock - Best man`,
    mimeType: DRIVE_DOC_MIME_TYPE,
    parents: [speeches.id],
    content: 'Mock speech script for local Drive sharing.',
    appCreated: true,
  });
  if (cartridge.trim()) {
    insert({
      name: `${MOCK_WEDDING_ID}.json`,
      mimeType: DRIVE_JSON_MIME_TYPE,
      parents: [wedding.id],
      content: cartridge,
      appCreated: false,
    });
  }

  function metadata(file) {
    const meta = {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime,
      version: String(file.version),
      parents: [...file.parents],
      webViewLink: `https://drive.google.com/file/d/${file.id}/view`,
    };
    if (file.content != null) {
      meta.size = String(Buffer.byteLength(file.content, 'utf8'));
      meta.md5Checksum = checksum(file.content);
    }
    return meta;
  }

  function getFile(id) {
    const file = files.get(id);
    if (!file || file.trashed) {
      throw new HttpError(404, 'File not found.', 'notFound');
    }
    return file;
  }

  function writeContent(file, content) {
    file.content = content;
    file.version += 1;
    file.modifiedTime = new Date().toISOString();
    return file;
  }

  function sendJson(res, status, payload) {
    const text = JSON.stringify(payload);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(text),
    });
    res.end(text);
  }

  function sendText(res, status, text, contentType = 'text/plain; charset=utf-8') {
    res.writeHead(status, {
      'Content-Type': contentType,
      'Content-Length': Buffer.byteLength(text),
    });
    res.end(text);
  }

  async function readBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8');
  }

  async function handle(req, res) {
    const url = new URL(req.url ?? '/', 'http://google-drive-mock');
    const path = url.pathname;
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
        res.end();
        return;
      }
      if (req.method === 'GET' && path === '/health') {
        sendJson(res, 200, { ok: true, rootFolderId: MOCK_ROOT_FOLDER_ID });
        return;
      }
      if (req.method === 'POST' && path === '/token') {
        await readBody(req);
        sendJson(res, 200, {
          access_token: 'mock-google-access-token',
          expires_in: 3600,
          token_type: 'Bearer',
        });
        return;
      }

      const authorization = req.headers.authorization ?? '';
      if (!/^Bearer\s+\S+/.test(authorization)) {
        sendJson(res, 401, errorPayload(401, 'Expected a bearer token.', 'authError'));
        return;
      }

      if (path === '/drive/v3/files' && req.method === 'GET') {
        const matchesQuery = parseQuery(url.searchParams.get('q'));
        const order = url.searchParams.get('orderBy');
        const result = [...files.values()].filter(matchesQuery);
        if (order === 'name_natural') {
          result.sort((left, right) =>
            left.name.localeCompare(right.name, undefined, { numeric: true }),
          );
        }
        sendJson(res, 200, { files: result.map(metadata) });
        return;
      }

      if (path === '/drive/v3/files' && req.method === 'POST') {
        const body = JSON.parse((await readBody(req)) || '{}');
        if (typeof body.name !== 'string' || !body.name.trim()) {
          throw new HttpError(400, 'A file name is required.', 'invalid');
        }
        if (typeof body.mimeType !== 'string' || !body.mimeType) {
          throw new HttpError(400, 'A mimeType is required.', 'invalid');
        }
        const created = insert({
          name: body.name,
          mimeType: body.mimeType,
          parents: Array.isArray(body.parents) ? body.parents : [],
        });
        sendJson(res, 200, metadata(created));
        return;
      }

      if (path === '/upload/drive/v3/files' && req.method === 'POST') {
        const contentType = req.headers['content-type'] ?? '';
        const boundary = /boundary="?([^";]+)"?/.exec(contentType)?.[1];
        if (!boundary) throw new HttpError(400, 'Missing multipart boundary.', 'invalid');
        const { metadata: docMetadata, content } = parseMultipartRelated(
          await readBody(req),
          boundary,
        );
        if (typeof docMetadata.name !== 'string' || !docMetadata.name.trim()) {
          throw new HttpError(400, 'A file name is required.', 'invalid');
        }
        const created = insert({
          name: docMetadata.name,
          mimeType: docMetadata.mimeType ?? DRIVE_DOC_MIME_TYPE,
          parents: Array.isArray(docMetadata.parents) ? docMetadata.parents : [],
          content,
        });
        sendJson(res, 200, metadata(created));
        return;
      }

      const uploadMatch = /^\/upload\/drive\/v3\/files\/([^/]+)$/.exec(path);
      if (uploadMatch && req.method === 'PATCH') {
        const file = getFile(decodeURIComponent(uploadMatch[1]));
        sendJson(res, 200, metadata(writeContent(file, await readBody(req))));
        return;
      }

      const permissionsMatch = /^\/drive\/v3\/files\/([^/]+)\/permissions(?:\/([^/]+))?$/.exec(
        path,
      );
      if (permissionsMatch) {
        const file = getFile(decodeURIComponent(permissionsMatch[1]));
        const permissionId = permissionsMatch[2]
          ? decodeURIComponent(permissionsMatch[2])
          : '';

        if (req.method === 'GET' && !permissionId) {
          sendJson(res, 200, { permissions: file.permissions });
          return;
        }

        if (req.method === 'POST' && !permissionId) {
          if (!file.appCreated) {
            throw new HttpError(
              403,
              'The service account cannot manage permissions for this file.',
              'insufficientFilePermissions',
            );
          }
          const body = JSON.parse((await readBody(req)) || '{}');
          if (body.role !== 'reader' || body.type !== 'user') {
            throw new HttpError(400, 'Only user reader permissions are supported.', 'invalid');
          }
          const email = String(body.emailAddress ?? '').trim().toLowerCase();
          if (!email) throw new HttpError(400, 'A recipient email is required.', 'invalid');
          const existing = file.permissions.find(
            (permission) => permission.emailAddress?.toLowerCase() === email,
          );
          if (existing) {
            sendJson(res, 200, existing);
            return;
          }
          const permission = {
            id: `permission-${(sequence += 1)}`,
            type: 'user',
            role: 'reader',
            emailAddress: email,
            displayName: email,
          };
          file.permissions.push(permission);
          sendJson(res, 200, permission);
          return;
        }

        if (req.method === 'DELETE' && permissionId) {
          const permission = file.permissions.find((entry) => entry.id === permissionId);
          if (!permission) throw new HttpError(404, 'Permission not found.', 'notFound');
          if (permission.role === 'owner') {
            throw new HttpError(403, 'The owner permission cannot be removed.', 'forbidden');
          }
          file.permissions = file.permissions.filter((entry) => entry.id !== permissionId);
          sendJson(res, 200, { ok: true });
          return;
        }
      }

      const fileMatch = /^\/drive\/v3\/files\/([^/]+)(?:\/(export))?$/.exec(path);
      if (fileMatch) {
        const file = getFile(decodeURIComponent(fileMatch[1]));
        const isExport = fileMatch[2] === 'export';
        if (req.method === 'GET' && isExport) {
          sendText(res, 200, file.content ?? '');
          return;
        }
        if (req.method === 'GET' && url.searchParams.get('alt') === 'media') {
          sendText(
            res,
            200,
            file.content ?? '',
            file.mimeType === DRIVE_JSON_MIME_TYPE
              ? 'application/json; charset=utf-8'
              : 'text/plain; charset=utf-8',
          );
          return;
        }
        if (req.method === 'GET') {
          sendJson(res, 200, metadata(file));
          return;
        }
        if (req.method === 'PATCH') {
          const body = JSON.parse((await readBody(req)) || '{}');
          if (typeof body.name === 'string' && body.name.trim()) {
            file.name = body.name.trim();
          }
          const addParents = (url.searchParams.get('addParents') ?? '')
            .split(',')
            .filter(Boolean);
          const removeParents = (url.searchParams.get('removeParents') ?? '')
            .split(',')
            .filter(Boolean);
          if (addParents.length > 0 || removeParents.length > 0) {
            file.parents = [
              ...new Set([...file.parents.filter((id) => !removeParents.includes(id)), ...addParents]),
            ];
          }
          file.version += 1;
          file.modifiedTime = new Date().toISOString();
          sendJson(res, 200, metadata(file));
          return;
        }
      }

      throw new HttpError(404, 'Mock Drive endpoint not implemented.', 'notFound');
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(res, error.status, errorPayload(error.status, error.message, error.reason));
        return;
      }
      console.error('[google-drive-mock]', error);
      sendJson(res, 500, errorPayload(500, 'Mock Drive failure.', 'backendError'));
    }
  }

  return { handler: handle, files, rootId: MOCK_ROOT_FOLDER_ID };
}

export function startMockDrive({
  host = '0.0.0.0',
  port = Number(process.env.PORT) || 8080,
  cartridge = '',
} = {}) {
  const drive = createMockDrive({ cartridge });
  const server = createServer((req, res) => {
    drive.handler(req, res);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      resolve({
        ...drive,
        port: actualPort,
        url: `http://127.0.0.1:${actualPort}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const cartridgePath = (process.env.MOCK_CARTRIDGE_PATH ?? '').trim();
  const cartridge = cartridgePath ? readFileSync(cartridgePath, 'utf8') : '';
  const mock = await startMockDrive({ cartridge });
  console.log(`Google Drive mock listening on ${mock.url}`);
  console.log(`  root folder: ${MOCK_ROOT_FOLDER_ID}`);
  console.log(`  wedding:     ${MOCK_WEDDING_ID}`);
}
