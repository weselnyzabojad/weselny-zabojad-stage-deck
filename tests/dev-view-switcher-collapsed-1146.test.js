import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DevViewSwitcher from '../src/components/DevViewSwitcher.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const render = (props) => renderToStaticMarkup(createElement(DevViewSwitcher, props));

const props = {
  currentRole: 'mc',
  roles: ['mc', 'dj'],
  previewEnabled: true,
  onChange: () => {},
  steps: [{ id: 's1', time: '18:00', title: 'Grand Entrance' }],
  currentStepId: 's1',
  onStepChange: () => {},
};

describe('issue #1146 collapsible dev view switcher', () => {
  it('renders only the DEV chip by default', () => {
    const html = render(props);
    expect(html).toContain('DEV');
    expect(html).not.toContain('DEV VIEW SWITCHER');
    expect(html).not.toContain('DJ Mark');
    expect(html).not.toContain('dev-step-navigator');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="dev-view-switcher-panel"');
  });

  it('renders the full panel when defaultOpen is set', () => {
    const html = render({ ...props, defaultOpen: true });
    expect(html).toContain('DEV VIEW SWITCHER');
    expect(html).toContain('dev-step-navigator');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('data-testid="dev-view-switcher-panel"');
  });

  it('renders nothing outside dev preview mode', () => {
    expect(render({ ...props, previewEnabled: false })).toBe('');
  });

  it('wires toggle, Escape, outside close and focus return', () => {
    const source = read('src/components/DevViewSwitcher.jsx');
    expect(source).toContain('const [open, setOpen] = useState(defaultOpen)');
    expect(source).toContain('aria-expanded={open}');
    expect(source).toContain("document.addEventListener('keydown', closeOnEscape)");
    expect(source).toContain("document.addEventListener('mousedown', closeOnOutsideClick)");
    expect(source).toContain("event.key !== 'Escape'");
    expect(source).toContain('triggerRef.current?.focus()');
    expect(source).toContain('onClick={() => setOpen((value) => !value)}');
  });

  it('keeps the responsive anchors and viewport-capped panel', () => {
    const source = read('src/components/DevViewSwitcher.jsx');
    expect(source).toContain('fixed left-3 top-3');
    expect(source).toContain('sm:bottom-3 sm:top-auto');
    expect(source).toContain('sm:flex-col-reverse');
    expect(source).toContain('max-h-[45dvh]');
    expect(source).toContain('overflow-y-auto');
  });
});
