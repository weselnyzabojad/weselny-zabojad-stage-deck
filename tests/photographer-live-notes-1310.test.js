import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  MAX_PHOTOGRAPHER_NOTES_LENGTH,
  normalizeLiveState,
  normalizePhotographerNotes,
} from '../src/lib/liveStageState.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1310 photographer briefing notes in live state', () => {
  const migration = read('supabase/migrations/202611200002_photographer_live_notes.sql');
  const client = read('src/lib/sync/supabaseSyncClient.js');
  const view = read('src/components/PhotographerView.jsx');
  const deck = read('src/StageDeck.jsx');
  const schema = JSON.parse(read('schema/wedding-schema-v1.1.json'));

  it('allows only media roles with an active session for the same wedding', () => {
    expect(migration).toContain("app_role not in ('photo1', 'photo2', 'video')");
    expect(migration).toContain("s.wedding_id = wid");
    expect(migration).toContain('s.revoked_at is null');
    expect(migration).toContain('s.expires_at > now()');
    expect(migration).toContain("'Role cannot edit photographer notes'");
    expect(migration).toContain('security definer');
  });

  it('limits the note and writes only the live-state key', () => {
    expect(migration).toContain('char_length(value) > 500');
    expect(migration).toContain("'{photographer_notes}'");
    expect(migration).toContain('insert into public.live_sync_state');
    expect(migration).toContain("'wzsd:' || wid");
    expect(migration).not.toContain('update public.weddings');
    expect(migration).not.toContain('insert into public.cartridge_revisions');
  });

  it('normalizes the live-state key with a safe default', () => {
    expect(MAX_PHOTOGRAPHER_NOTES_LENGTH).toBe(500);
    expect(normalizePhotographerNotes('  hold the bouquet  ')).toBe('hold the bouquet');
    expect(normalizePhotographerNotes(null)).toBe('');
    expect(normalizePhotographerNotes('x'.repeat(600))).toHaveLength(500);

    const steps = [{ id: 'step-1' }];
    const state = normalizeLiveState(
      { step_order: ['step-1'], active_step_id: 'step-1', photographer_notes: '  cue  ' },
      steps,
    );
    expect(state.photographer_notes).toBe('cue');
    expect(normalizeLiveState(null, steps).photographer_notes).toBe('');
  });

  it('keeps the schema and cartridge contract free of the legacy field', () => {
    const noteSchema = schema.$defs.liveSyncState.properties.photographer_notes;
    expect(noteSchema.maxLength).toBe(500);
    expect(noteSchema.type).toEqual(['string', 'null']);
    expect(JSON.stringify(schema)).not.toContain('photographerBriefed');
  });

  it('wires the RPC and the editor UI', () => {
    expect(client).toContain("supabase.rpc('stage_deck_set_photographer_notes'");
    expect(client).toContain('p_notes: notes');
    expect(view).toContain("t('photo.briefing.title')");
    expect(view).toContain('onSavePhotographerNotes');
    expect(deck).toContain('photographerNotes={liveState.photographer_notes');
    expect(deck).toContain('onSavePhotographerNotes={savePhotographerNotes}');
  });
});
