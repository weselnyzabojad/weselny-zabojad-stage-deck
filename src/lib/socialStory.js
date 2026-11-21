// Social Export Studio contracts (issue #1254).
//
// Pure helpers shared by the MC and owner-admin surfaces. Story PNGs are always
// exported at the true 1080x1920 size; the UI only scales the preview.
import { toPng } from 'html-to-image';

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
export const STORY_SAFE_TOP = 250;
export const STORY_SAFE_BOTTOM = 300;
export const STORY_BRAND_URL = 'deck.weselnyzabojad.pl';

export const SOCIAL_TEMPLATES = Object.freeze([
  {
    id: 'dayMinusOne',
    surfaces: ['mc', 'admin'],
    accent: 'fr',
    supportsBackground: true,
  },
  {
    id: 'dayPlusOne',
    surfaces: ['mc', 'admin'],
    accent: 'fr',
    supportsBackground: true,
  },
  {
    id: 'month',
    surfaces: ['admin'],
    accent: 'gold',
    supportsBackground: false,
  },
  {
    id: 'beforeSeason',
    surfaces: ['admin'],
    accent: 'gold',
    supportsBackground: false,
  },
  {
    id: 'season',
    surfaces: ['admin'],
    accent: 'gold',
    supportsBackground: false,
  },
]);

export function templatesForSurface(surface = 'mc') {
  return SOCIAL_TEMPLATES.filter((template) =>
    template.surfaces.includes(surface === 'admin' ? 'admin' : 'mc'),
  );
}

export function storyExportOptions({ mode = 'dark' } = {}) {
  return {
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: mode === 'hud' ? undefined : '#020617',
  };
}

// Captions are plain text. Angle brackets are stripped so a caption can never
// be interpreted as markup by a social composer.
export function sanitizeCaption(value) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, 2200);
}

export function buildSocialCaption({ lines = [], locale: _locale = 'fr' } = {}) {
  const body = lines
    .map((line) => sanitizeCaption(line))
    .filter(Boolean)
    .join('\n');
  const text = [body, STORY_BRAND_URL].filter(Boolean).join('\n\n');
  return sanitizeCaption(text);
}

export function storyFileName(templateId, dateISO = '') {
  const safeId = String(templateId ?? 'story').replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(String(dateISO)) ? dateISO : 'undated';
  return `stage-deck-${safeId}-${safeDate}.png`;
}

export async function exportStoryPng(node, { templateId, dateISO, mode = 'dark' } = {}) {
  if (!node) throw new Error('Story node is missing');
  const dataUrl = await toPng(node, storyExportOptions({ mode }));
  const link = document.createElement('a');
  link.download = storyFileName(templateId, dateISO);
  link.href = dataUrl;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  return link.download;
}

// Approved fields only. Template view models build their caption from this
// whitelist; anything else is dropped before it can reach the exported text.
export function pickCaptionValues(values = {}, allowed = []) {
  const picked = {};
  for (const key of allowed) {
    const value = values?.[key];
    if (value == null || value === '') continue;
    picked[key] = Array.isArray(value) ? value.join(', ') : String(value);
  }
  return picked;
}
