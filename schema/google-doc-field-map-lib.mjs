import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const SCHEMA_DIR = here;
export const DOMAINS_DIR = path.join(here, 'domains');
export const FIELD_MAP_PATH = path.join(here, 'google-doc-field-map.json');

export const FIELD_STATUSES = new Set([
  'required',
  'optional',
  'separate',
  'no',
  'delete',
  'rework',
  'pending',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeShape(left, right) {
  if (isPlainObject(left) && isPlainObject(right)) {
    const merged = { ...left };
    for (const [key, value] of Object.entries(right)) {
      merged[key] = key in merged ? mergeShape(merged[key], value) : value;
    }
    return merged;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return [...left, ...right];
  }
  return right;
}

function unionArray(items) {
  let shape;
  for (const item of items) {
    if (isPlainObject(item)) {
      shape = shape === undefined ? item : mergeShape(shape, item);
    }
  }
  return shape;
}

function walk(value, base, out) {
  if (Array.isArray(value)) {
    if (!value.length) {
      out.push(base);
      return;
    }
    const shape = unionArray(value);
    if (shape) {
      walk(shape, `${base}[]`, out);
    } else {
      out.push(`${base}[]`);
    }
    return;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (!keys.length) {
      out.push(base);
    }
    for (const key of keys) {
      walk(value[key], base ? `${base}.${key}` : key, out);
    }
    return;
  }
  out.push(base);
}

export function canonicalFieldPath(fieldPath) {
  if (fieldPath.startsWith('liveSyncState.checked_subtasks.')) {
    return 'liveSyncState.checked_subtasks';
  }
  return fieldPath.endsWith('[]') ? fieldPath.slice(0, -2) : fieldPath;
}

export function enumerateExampleFields(value) {
  const rawPaths = [];
  walk(value, '', rawPaths);
  const fields = [];
  const seen = new Set();
  for (const rawPath of rawPaths) {
    if (rawPath === '$schema') continue;
    const fieldPath = canonicalFieldPath(rawPath);
    if (seen.has(fieldPath)) continue;
    seen.add(fieldPath);
    fields.push(fieldPath);
  }
  return fields;
}

export function listExampleFiles() {
  const domainFiles = fs
    .readdirSync(DOMAINS_DIR)
    .filter((file) => file.endsWith('.example.json'))
    .sort();
  return [...domainFiles, 'wedding-cartridge.example.json'];
}

export function exampleFilePath(fileName) {
  return fileName === 'wedding-cartridge.example.json'
    ? path.join(SCHEMA_DIR, fileName)
    : path.join(DOMAINS_DIR, fileName);
}

export function loadFieldMap(mapPath = FIELD_MAP_PATH) {
  return JSON.parse(fs.readFileSync(mapPath, 'utf8'));
}

function isContainerFor(fieldPath, leaves) {
  return leaves.some(
    (leaf) => leaf.startsWith(`${fieldPath}[].`) || leaf.startsWith(`${fieldPath}.`),
  );
}

export function validateFieldMap({ mapPath = FIELD_MAP_PATH } = {}) {
  const errors = [];
  let map;
  try {
    map = loadFieldMap(mapPath);
  } catch (error) {
    return { ok: false, errors: [`Cannot read field map: ${error.message}`], summary: {} };
  }

  if (map.version !== 1) {
    errors.push(`Field map version must be 1, got ${JSON.stringify(map.version)}.`);
  }
  if (!isPlainObject(map.files)) {
    errors.push('Field map must contain a files object.');
    return { ok: false, errors, summary: {} };
  }

  const exampleFiles = listExampleFiles();
  const expectedFiles = new Set(exampleFiles);
  const mappedFiles = new Set(Object.keys(map.files));

  for (const fileName of exampleFiles) {
    if (!mappedFiles.has(fileName)) {
      errors.push(`${fileName}: missing from field map.`);
    }
  }
  for (const fileName of mappedFiles) {
    if (!expectedFiles.has(fileName)) {
      errors.push(`${fileName}: field map entry has no matching example file.`);
    }
  }

  const summary = { files: 0, fields: 0, statuses: {} };

  for (const fileName of exampleFiles) {
    const fields = map.files[fileName];
    if (!isPlainObject(fields)) {
      errors.push(`${fileName}: field map entry must be an object.`);
      continue;
    }
    summary.files += 1;

    let example;
    try {
      example = JSON.parse(fs.readFileSync(exampleFilePath(fileName), 'utf8'));
    } catch (error) {
      errors.push(`${fileName}: cannot read example: ${error.message}`);
      continue;
    }

    const leaves = enumerateExampleFields(example);
    const leafSet = new Set(leaves);

    for (const leaf of leaves) {
      if (!(leaf in fields)) {
        errors.push(`${fileName}: field ${leaf} is not flagged.`);
      }
    }

    for (const [fieldPath, status] of Object.entries(fields)) {
      summary.fields += 1;
      summary.statuses[status] = (summary.statuses[status] ?? 0) + 1;
      if (!FIELD_STATUSES.has(status)) {
        errors.push(`${fileName}: field ${fieldPath} has unknown status ${JSON.stringify(status)}.`);
      }
      if (!leafSet.has(fieldPath) && !isContainerFor(fieldPath, leaves)) {
        errors.push(`${fileName}: flagged field ${fieldPath} does not exist in the example.`);
      }
    }
  }

  if (map.todos !== undefined) {
    if (!Array.isArray(map.todos)) {
      errors.push('Field map todos must be an array.');
    } else {
      for (const todo of map.todos) {
        if (!isPlainObject(todo) || typeof todo.file !== 'string' || typeof todo.field !== 'string' || typeof todo.note !== 'string') {
          errors.push('Each todo must have string file, field and note properties.');
          continue;
        }
        const fields = map.files[todo.file];
        if (!isPlainObject(fields)) {
          errors.push(`Todo references unknown file ${todo.file}.`);
          continue;
        }
        const leaves = enumerateExampleFields(
          JSON.parse(fs.readFileSync(exampleFilePath(todo.file), 'utf8')),
        );
        if (!(todo.field in fields) && !isContainerFor(todo.field, leaves)) {
          errors.push(`Todo references unknown field ${todo.file} :: ${todo.field}.`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, summary };
}
