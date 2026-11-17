import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseSyncClient } from '../src/lib/sync/supabaseSyncClient.js';

const hoisted = vi.hoisted(() => {
  const client = {
    rpc: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
    from: vi.fn(),
    realtime: { setAuth: vi.fn() },
  };
  return { client };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => hoisted.client,
}));

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const config = { url: 'https://example.supabase.co', anonKey: 'anon', table: 'live_sync_state' };

function makeChannel() {
  const channel = {
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => channel),
  };
  return channel;
}

describe('read-receipt sync client (issue #1159)', () => {
  let client;
  let channel;

  beforeEach(() => {
    vi.clearAllMocks();
    channel = makeChannel();
    hoisted.client.channel.mockReturnValue(channel);
    hoisted.client.rpc.mockResolvedValue({ data: null, error: null });
    client = createSupabaseSyncClient(config, { accessToken: 'token' });
  });

  it('acknowledges a revision through the definer RPC', async () => {
    await client.ackStepReceipt({
      stepId: 'step-first-dance',
      revision: '2026-11-17T20:00:00.000Z',
    });

    expect(hoisted.client.rpc).toHaveBeenCalledWith('stage_deck_ack_step', {
      p_step_id: 'step-first-dance',
      p_revision: '2026-11-17T20:00:00.000Z',
    });
  });

  it('rejects an incomplete acknowledgement and wraps RPC errors', async () => {
    await expect(client.ackStepReceipt({ stepId: 'x' })).rejects.toThrow(
      'Step and revision are required.',
    );

    hoisted.client.rpc.mockResolvedValue({ data: null, error: { message: 'Session revoked or expired' } });
    await expect(
      client.ackStepReceipt({ stepId: 'x', revision: '2026-11-17T20:00:00.000Z' }),
    ).rejects.toThrow('Session revoked or expired');
  });

  it('fetches receipts and presence rows defensively', async () => {
    hoisted.client.rpc.mockResolvedValueOnce({
      data: [{ role: 'photo1', device_id: 'd1', seen_at: '2026-11-17T20:00:05Z' }],
      error: null,
    });
    await expect(
      client.fetchStepReceipts({ stepId: 'step', revision: '2026-11-17T20:00:00Z' }),
    ).resolves.toEqual([{ role: 'photo1', device_id: 'd1', seen_at: '2026-11-17T20:00:05Z' }]);
    expect(hoisted.client.rpc).toHaveBeenLastCalledWith('stage_deck_step_receipts', {
      p_step_id: 'step',
      p_revision: '2026-11-17T20:00:00Z',
    });

    hoisted.client.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(
      client.fetchStepReceipts({ stepId: 'step', revision: 'rev' }),
    ).resolves.toEqual([]);
    await expect(client.fetchStepReceipts({})).resolves.toEqual([]);

    hoisted.client.rpc.mockResolvedValueOnce({ data: [{ role: 'dj', status: 'online' }], error: null });
    await expect(client.fetchRolePresence()).resolves.toEqual([{ role: 'dj', status: 'online' }]);
    expect(hoisted.client.rpc).toHaveBeenLastCalledWith('stage_deck_role_presence');
  });

  it('wraps receipt fetch errors', async () => {
    hoisted.client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'permission denied' } });
    await expect(
      client.fetchStepReceipts({ stepId: 'step', revision: 'rev' }),
    ).rejects.toThrow('permission denied');
  });

  it('subscribes to INSERT hints and filters the revision', () => {
    const onChange = vi.fn();
    const onStatus = vi.fn();
    const unsubscribe = client.subscribeStepReceipts({
      stepId: 'step',
      revision: '2026-11-17T20:00:00.000Z',
      onChange,
      onStatus,
    });

    expect(hoisted.client.channel).toHaveBeenCalledWith('wzsd:step-receipts:step');
    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'stage_step_receipts',
        filter: 'step_id=eq.step',
      }),
      expect.any(Function),
    );

    const handler = channel.on.mock.calls[0][2];
    handler({ new: { step_id: 'step', revision: '2026-11-17T20:00:00+00:00', role: 'dj' } });
    expect(onChange).toHaveBeenCalledTimes(1);

    handler({ new: { step_id: 'step', revision: '2026-11-17T21:00:00+00:00', role: 'dj' } });
    expect(onChange).toHaveBeenCalledTimes(1);

    const statusHandler = channel.subscribe.mock.calls[0][0];
    statusHandler('SUBSCRIBED');
    statusHandler('CHANNEL_ERROR', { message: 'socket down' });
    expect(onStatus).toHaveBeenNthCalledWith(1, 'connected');
    expect(onStatus).toHaveBeenNthCalledWith(2, 'error', 'socket down');

    unsubscribe();
    expect(hoisted.client.removeChannel).toHaveBeenCalledWith(channel);
  });
});

describe('read-receipt migration contract', () => {
  const sql = read('supabase/migrations/202611170001_stage_step_receipts.sql');

  it('creates the receipt table with the revision-keyed primary key', () => {
    expect(sql).toContain('create table if not exists public.stage_step_receipts');
    expect(sql).toContain('primary key (wedding_id, role, device_id, step_id, revision)');
    expect(sql).toContain('stage_step_receipts_wedding_step_revision_idx');
    expect(sql).toContain("references public.weddings(wedding_id) on delete cascade");
  });

  it('restricts reads to the MC and blocks direct writes', () => {
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('create policy "mc read step receipts"');
    expect(sql).toContain("public.current_app_role() = 'mc' or public.is_app_admin()");
    expect(sql).toContain('revoke all on public.stage_step_receipts from public, anon, authenticated');
    expect(sql).toContain('grant select on public.stage_step_receipts to authenticated');
    expect(sql).not.toContain('grant insert');
    expect(sql).not.toContain('grant update');
    expect(sql).not.toContain('grant delete');
  });

  it('derives identity from the token and rejects revoked sessions', () => {
    for (const fn of [
      'stage_deck_ack_step',
      'stage_deck_step_receipts',
      'stage_deck_role_presence',
    ]) {
      expect(sql).toContain(`function public.${fn}`);
      expect(sql).toContain(`revoke all on function public.${fn}`);
    }
    expect(sql.match(/security definer/g)).toHaveLength(3);
    expect(sql).toContain("raise exception 'Session revoked or expired'");
    expect(sql).toContain("raise exception 'Role cannot acknowledge step changes'");
    expect(sql).toContain("raise exception 'Only the MC may read step receipts'");
    expect(sql).toContain("raise exception 'Only the MC may read role presence'");
    expect(sql).toContain('on conflict (wedding_id, role, device_id, step_id, revision) do nothing');
  });

  it('fixes the presence role constraint for dj_mc and musician', () => {
    expect(sql).toContain('alter table public.role_presence drop constraint if exists role_presence_role_check');
    expect(sql).toContain("'dj_mc'");
    expect(sql).toContain("'musician'");
    expect(sql).toContain("'venue_manager'");
  });

  it('adds the table to Realtime idempotently', () => {
    expect(sql).toContain('pg_publication_tables');
    expect(sql).toContain('alter publication supabase_realtime add table public.stage_step_receipts');
  });
});
