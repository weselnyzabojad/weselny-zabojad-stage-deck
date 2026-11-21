import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SocialExportStudio from '../src/components/SocialExportStudio.jsx';
import StoryFrame from '../src/components/social/StoryFrame.jsx';
import {
  buildSocialCaption,
  pickCaptionValues,
  sanitizeCaption,
  storyExportOptions,
  storyFileName,
  STORY_HEIGHT,
  STORY_SAFE_BOTTOM,
  STORY_SAFE_TOP,
  STORY_WIDTH,
  templatesForSurface,
} from '../src/lib/socialStory.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const renderStudio = (props = {}) =>
  renderToStaticMarkup(createElement(SocialExportStudio, props));

describe('issue #1254 Social Export Studio shared engine', () => {
  it('exports a true 1080x1920 PNG with dark or transparent background', () => {
    expect(storyExportOptions({ mode: 'dark' })).toEqual({
      width: 1080,
      height: 1920,
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor: '#020617',
    });
    expect(storyExportOptions({ mode: 'hud' }).backgroundColor).toBeUndefined();
    expect(STORY_WIDTH).toBe(1080);
    expect(STORY_HEIGHT).toBe(1920);
  });

  it('keeps the top 250px and bottom 300px safe zones', () => {
    const html = renderToStaticMarkup(
      createElement(StoryFrame, { safeZones: true, label: 'Story' }, 'content'),
    );
    expect(html).toContain('data-safe-zone="top"');
    expect(html).toContain('data-safe-zone="bottom"');
    expect(html).toContain(`height:${STORY_SAFE_TOP}px`);
    expect(html).toContain(`height:${STORY_SAFE_BOTTOM}px`);
    expect(html).toContain('width:1080px');
    expect(html).toContain('height:1920px');
  });

  it('builds plain-text FR/PL captions with branding only', () => {
    const caption = buildSocialCaption({
      locale: 'fr',
      lines: ['Nuit de préparation', '<script>alert(1)</script>', '12 rôles synchronisés'],
    });
    expect(caption).toContain('Nuit de préparation');
    expect(caption).toContain('12 rôles synchronisés');
    expect(caption).toContain('deck.weselnyzabojad.pl');
    expect(caption).not.toContain('<script>');
    expect(sanitizeCaption('  a\r\n<b>  ')).toBe('a\nb');
  });

  it('picks only approved caption values', () => {
    expect(
      pickCaptionValues(
        { country: 'PL', languages: ['PL', 'FR'], surname: 'Secret', email: 'x@y.z' },
        ['country', 'languages'],
      ),
    ).toEqual({ country: 'PL', languages: 'PL, FR' });
  });

  it('builds a safe filename without a couple name', () => {
    expect(storyFileName('dayMinusOne', '2026-08-20')).toBe(
      'stage-deck-dayminusone-2026-08-20.png',
    );
    expect(storyFileName('season', null)).toBe('stage-deck-season-undated.png');
  });

  it('limits templates by surface', () => {
    expect(templatesForSurface('mc').map((item) => item.id)).toEqual([
      'dayMinusOne',
      'dayPlusOne',
    ]);
    expect(templatesForSurface('admin').map((item) => item.id)).toEqual([
      'dayMinusOne',
      'dayPlusOne',
      'month',
      'beforeSeason',
      'season',
    ]);
  });

  it('renders the Studio with tabs, modes and caption buttons', () => {
    const mc = renderStudio({ surface: 'mc' });
    expect(mc).toContain('Social Export Studio');
    expect(mc).toContain('Day −1 · Prep Wrapper');
    expect(mc).toContain('Day +1 · Post-Event Wrapped');
    expect(mc).not.toContain('Season · Test Zgodności');
    expect(mc).toContain('Dark card');
    expect(mc).toContain('Transparent HUD');
    expect(mc).toContain('Copy FR caption');
    expect(mc).toContain('Copy PL caption');
    const admin = renderStudio({ surface: 'admin' });
    expect(admin).toContain('Month Story');
    expect(admin).toContain('Before season');
    expect(admin).not.toContain('Season · Test Zgodności');
  });

  it('is mounted in MC and admin with a per-row Social button', () => {
    const postMortem = read('src/components/PostMortemAnalytics.jsx');
    expect(postMortem).toContain("surface=\"mc\"");
    expect(postMortem).toContain('SocialExportStudio');
    const overview = read('src/admin/AdminPortfolioOverview.jsx');
    expect(overview).toContain('onSocial');
    expect(overview).toContain("social.open");
    expect(overview).toContain("surface=\"admin\"");
    expect(overview).toContain('wedding={social.data?.wedding ?? socialRow}');
  });
});
