import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));

describe('issue #929 legacy speech migration', () => {
  it('adds owner-triggered preflight and migration actions', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain("action === 'preflight_speech_migration'");
    expect(api).toContain("action === 'migrate_speeches'");
    expect(api).toContain('legacySpeeches');
    expect(api).toContain('legacySpeechSummary');
    expect(api).toContain('requiresConfirmation');
    expect(api).toContain('discardUnlinked');
    expect(api).toContain('speech_migration_import');
    expect(api).toContain('speech_migration_discard');
    expect(api).toContain("writeAudit(admin, allowlisted, 'speech_migration'");
  });

  it('decrypts old redactions before whole-script encryption', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain('mergeLegacySpeechText');
    expect(api).toContain('decryptSecret');
    expect(api).toContain('encryptSpeechScript');
    expect(api).toContain('\\{\\{secret\\}\\}');
    expect(api).toContain('\\{\\{secret:');
    expect(api).toContain('SPEECH_SECRET_MASTER_KEY');
  });

  it('strips speeches and republishes through the normal cartridge path', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain('delete stripped.speeches');
    expect(api).toContain('normalizePublishRequest');
    expect(api).toContain('publishCartridge');
    expect(api).toContain('expectedRevision: Number(wedding.cartridge_revision ?? 0)');
  });

  it('surfaces preflight and confirmation in the admin panel', () => {
    const panel = read('src/admin/AdminSpeechesPanel.jsx');
    expect(panel).toContain('preflightSpeechMigration');
    expect(panel).toContain('migrateSpeeches');
    expect(panel).toContain('Legacy speech migration');
    expect(panel).toContain('unlinkedCount');
    expect(panel).toContain('Google Docs are never deleted or modified');
    expect(panel).toContain('Migrate legacy speeches');
  });

  it('removes the old runtime resolver, redaction UI and schema fields', () => {
    expect(read('src/lib/speeches.js')).not.toContain('resolveSpeeches');
    expect(read('src/StageDeck.jsx')).not.toContain('resolveSpeeches');
    expect(read('src/components/SpeakerView.jsx')).not.toContain('SecretScript');
    expect(read('src/components/SpeakerView.jsx')).not.toContain('redactions');
    const domain = json('schema/domains/speeches.json');
    expect(domain.$defs.redaction).toBeUndefined();
    expect(domain.$defs.speech.properties.script.properties.redactions).toBeUndefined();
    expect(read('schema/domains/speeches.json')).toBe(
      read('supabase/functions/_shared/domains/speeches.json'),
    );
  });

  it('removes the old marker parser and client token renderer', () => {
    const shared = read('supabase/functions/_shared/speechSecrets.js');
    expect(shared).not.toContain('parseSecretMarkers');
    expect(shared).not.toContain('SECRET_TOKEN_PATTERN');
    expect(shared).toContain('decryptSecret');
    const client = read('src/lib/speechSecrets.js');
    expect(client).not.toContain('splitSecretTokens');
    expect(client).not.toContain('decryptSpeechRedaction');
    expect(client).toContain('importSpeechKey');
  });

  it('keeps the old admin parse action out of the Drive function', () => {
    const drive = read('supabase/functions/admin_drive/index.ts');
    expect(drive).not.toContain("action === 'parse_speech'");
    expect(drive).not.toContain('parseSecretMarkers');
    expect(read('src/admin/adminApi.js')).not.toContain('importSpeechSource');
  });

  it('documents the idempotent and destructive migration contract', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain('alreadyMigrated');
    expect(api).toContain("existing.data?.live_revision != null");
    expect(api).toContain("error: 'Unlinked legacy speeches will lose their text.");
  });
});
