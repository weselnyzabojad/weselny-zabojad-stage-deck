import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SpeechesChip from '../../src/components/SpeechesChip.jsx';
import RoleShell from '../../src/components/RoleShell.jsx';

const speeches = [
  { id: 'speech_a', speaker: { name: 'Anna' } },
  { id: 'speech_b', speaker: { name: 'Marek' } },
];

const render = (props) => renderToStaticMarkup(createElement(SpeechesChip, props));

describe('issue #198 Speeches status chip', () => {
  it('is red when there are no speeches', () => {
    const html = render({ mode: 'OFF', speeches: [] });
    expect(html).toContain('Speeches');
    expect(html).toContain('OFF');
    expect(html).toContain('bg-tone-negative-bg');
    expect(html).toContain('text-tone-negative-text');
  });

  it('uses green for LIGHT, COMPLEX and a live speech', () => {
    expect(render({ mode: 'LIGHT', speeches })).toContain('bg-tone-positive-bg');
    expect(render({ mode: 'COMPLEX', speeches })).toContain('bg-tone-positive-bg');
    expect(render({ mode: 'COMPLEX', speeches, activeSpeechId: 'speech_a' })).toContain('bg-tone-positive-bg');
  });

  it('keeps the chip visible but hides visible status text in compact mode', () => {
    const html = render({ mode: 'LIGHT', speeches, compact: true });
    expect(html).toContain('Speeches');
    expect(html).not.toContain('>LIGHT<');
    expect(html).toContain('bg-emerald-400');
  });

  it('renders in the MC pocket header only when speech data is supplied', () => {
    const withChip = renderToStaticMarkup(
      createElement(
        RoleShell,
        {
          compact: true,
          role: 'mc',
          syncStatus: 'connected',
          theme: 'night',
          onToggleTheme: () => {},
          speechMode: 'COMPLEX',
          speeches,
        },
        createElement('div', null, 'Pocket content'),
      ),
    );
    expect(withChip).toContain('Speeches');

    const withoutChip = renderToStaticMarkup(
      createElement(
        RoleShell,
        {
          compact: true,
          role: 'dj',
          syncStatus: 'connected',
          theme: 'night',
          onToggleTheme: () => {},
        },
        createElement('div', null, 'Pocket content'),
      ),
    );
    expect(withoutChip).not.toContain('Speeches');
  });
});
