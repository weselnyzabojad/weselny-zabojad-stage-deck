import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #336 mobile 3D parity and regression coverage', () => {
  it('lets dev previews inherit the shared wrapper without local 3D code', () => {
    const dev = read('src/components/DevViewSwitcher.jsx');
    expect(dev).not.toContain('CurrentStepTilt');
    expect(dev).not.toContain('rotateX');
    expect(read('src/components/TimelineFocusStack.jsx')).toContain('CurrentStepTilt');
  });

  it('keeps admin out of mobile 3D and mobile access work', () => {
    expect(read('src/admin/AdminApp.jsx')).not.toContain('CurrentStepTilt');
    expect(read('src/admin/AdminApp.jsx')).not.toContain('current-step-tilt');
  });

  it('documents the mobile viewport and reduced-motion QA', () => {
    const plan = read('docs/phone-layout-plan.md');
    expect(plan).toContain('Mobile 3D current-step QA');
    expect(plan).toContain('320×568');
    expect(plan).toContain('375×667');
    expect(plan).toContain('prefers-reduced-motion');
  });

  it('keeps touch cards flat while fine pointers keep the tilt', () => {
    const css = read('src/index.css');
    expect(css).toContain('@media (hover: hover) and (pointer: fine)');
    expect(css).not.toContain('current-step-tilt:active');
  });
});
