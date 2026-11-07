import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const exists = (path) => existsSync(new URL(`../../${path}`, import.meta.url));

describe('VIP Radar and Contacts removal', () => {
  it('removes the feature files and MC wiring', () => {
    expect(exists('src/components/VipAlertsModal.jsx')).toBe(false);
    expect(exists('src/components/ContactsModal.jsx')).toBe(false);
    expect(exists('src/lib/contacts.js')).toBe(false);
    expect(exists('src/hooks/useSensitiveNotes.js')).toBe(false);
    expect(exists('src/lib/sensitiveNotes.js')).toBe(false);
    expect(read('src/views/McMasterView.jsx')).not.toContain('VipAlertsModal');
    expect(read('src/views/McMasterView.jsx')).not.toContain('ContactsModal');
  });

  it('removes schema fields and template sections', () => {
    const schema = JSON.parse(read('schema/wedding-schema-v1.1.json'));
    for (const key of ['vipRadarCount', 'tact_and_vip_alerts', 'contacts']) {
      expect(schema.properties).not.toHaveProperty(key);
    }
    expect(schema.$defs).not.toHaveProperty('vipAlert');
    expect(schema.$defs).not.toHaveProperty('contact');
    expect(schema.$defs.privacy.properties).not.toHaveProperty('sensitiveFields');

    const template = read('src/lib/googleDocTemplate.js');
    expect(template).not.toContain("marker: 'VENDOR CONTACTS'");
    expect(template).not.toContain("marker: 'VIP ALERTS'");
  });

  it('drops the sensitive-note table by migration', () => {
    const migration = read('supabase/migrations/202611070001_drop_vip_contacts.sql');
    expect(migration).toContain('drop table if exists public.sensitive_notes');
    expect(read('src/lib/sync/supabaseSyncClient.js')).not.toContain('sensitive_notes');
  });
});
