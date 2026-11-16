import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { venueChangeDecision } from '../src/lib/venueChangeConfirmation.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1097 Venue Manager change confirmation', () => {
  it('confirms only populated values that actually change', () => {
    expect(venueChangeDecision('', '18:30')).toBe('apply');
    expect(venueChangeDecision(null, '18:30')).toBe('apply');
    expect(venueChangeDecision('18:30', '18:30')).toBe('noop');
    expect(venueChangeDecision('18:30', '')).toBe('confirm');
    expect(venueChangeDecision('TABLE_SERVICE', 'BUFFET')).toBe('confirm');
  });

  it('routes the five fields through requestConfirmedChange', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain("import { venueChangeDecision } from '../lib/venueChangeConfirmation.js'");
    expect(venue).toContain("import ModalShell from './ModalShell'");
    expect(venue).toContain('const [pendingChange, setPendingChange] = useState(null)');
    expect(venue).toContain('const applyUpdate = (patch, change = null) => {');
    expect(venue).toContain('const requestConfirmedChange = (patch, change) => {');
    expect(venue).toContain("if (decision === 'apply')");
    expect(venue).toContain('setPendingChange({ patch, ...change })');
    expect(venue).toContain('onTime={(time) => requestCourseChange(index, \'time\', time)}');
    expect(venue).toContain('onMode={(mode) => requestCourseChange(index, \'serviceMode\', mode)}');
    expect(venue).toContain('cakeServiceMode: value');
    expect(venue).toContain('closureTime: time');
    expect(venue).toContain('closureExtensionUntil: time');
  });

  it('keeps notification inside the confirmed apply path', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    const apply = venue.slice(venue.indexOf('const applyUpdate'), venue.indexOf('const courses ='));
    expect(apply).toContain('onUpdateMandatory?.(');
    expect(apply).toContain("authorRole: 'venue_manager'");
    const request = venue.slice(
      venue.indexOf('const requestConfirmedChange'),
      venue.indexOf('const requestCourseChange'),
    );
    expect(request).toContain('applyUpdate(patch, change)');
    expect(request).toContain('setPendingChange({ patch, ...change })');
  });

  it('passes the edited field metadata to the schedule banner', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain("authorRole: 'venue_manager'");
    expect(venue).toContain('stepTitle: change.label');
    expect(venue).toContain('from: change.oldDisplay');
    expect(venue).toContain('to: change.newDisplay');
    expect(venue).toContain('applyUpdate(change.patch, change)');
  });

  it('adds cancel and confirm actions on the shared modal shell', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain('<ModalShell');
    expect(venue).toContain('labelledBy="venue-change-title"');
    expect(venue).toContain("t('venueManager.confirm.cancel')");
    expect(venue).toContain("t('venueManager.confirm.confirm')");
    expect(venue).toContain("t('venueManager.confirm.old')");
    expect(venue).toContain("t('venueManager.confirm.new')");
  });

  it('keeps add/remove and the extension checkbox immediate', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    const add = venue.slice(venue.indexOf('const addCourse'), venue.indexOf('const confirmationDialog'));
    expect(add).toContain('applyUpdate({ ...settings, kitchenServices: next })');
    const checkbox = venue.slice(
      venue.indexOf('closureExtensionAllowed: allowed') - 200,
      venue.indexOf('closureExtensionAllowed: allowed') + 250,
    );
    expect(checkbox).toContain('applyUpdate({');
  });

  it('localizes the confirmation copy in every locale', () => {
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of [
        'venueManager.confirm.title',
        'venueManager.confirm.description',
        'venueManager.confirm.old',
        'venueManager.confirm.new',
        'venueManager.confirm.cancel',
        'venueManager.confirm.confirm',
      ]) {
        expect(dict, `${locale}:${key}`).toContain(`'${key}'`);
      }
    }
  });
});
