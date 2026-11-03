# Local sync outbox and retry (TODO 25 / issue #67)

The live stage state is already persisted locally. TODO 25 adds the missing
guarantee: a failed cloud publish must stay **pending** until the cloud confirms
the latest snapshot, including across reloads and reconnects.

## Why a snapshot outbox, not a mutation queue

`live_sync_state` is a full snapshot, and every stage command produces a new
snapshot that contains all earlier changes. Replaying individual mutations would
publish stale intermediate states. Instead:

- the latest local snapshot remains the payload,
- the outbox stores only **metadata** for the room,
- each retry sends the newest snapshot, never a stale queued one.

This coalesces rapid taps without losing a mutation. If state changes while a
publish is in flight, the newer snapshot is queued immediately after the write.

## Storage record

Key: `wzsd:v1:sync-outbox:<roomKey>` in `localStorage`.

```json
{
  "roomKey": "wzsd:2026-08-20_jennifer_guillaume",
  "queuedAt": "2026-08-20T18:25:03.000Z",
  "attempts": 3,
  "lastAttemptAt": "2026-08-20T18:25:33.000Z",
  "nextAttemptAt": "2026-08-20T18:26:01.000Z",
  "lastError": "Failed to fetch"
}
```

- One record per room; the latest snapshot wins.
- `queuedAt` is the first failure and is preserved across retries.
- `attempts` drives the backoff and the badge.
- `lastError` is display-only and truncated.
- Storage failures never throw; the show keeps running.

The entry is removed only after a successful publish of the **current** local
snapshot. Wiping the event removes it too.

## Retry schedule

`src/lib/sync/outbox.js` uses exponential backoff:

| Attempt | Delay |
| --- | --- |
| 1 | 2s |
| 2 | 4s |
| 3 | 8s |
| 4 | 16s |
| 5 | 32s |
| 6+ | capped at 60s |

A clean mutation still uses the existing 200ms debounce. An outbox entry uses
the remaining backoff instead.

Triggers that wake the outbox immediately:

- the browser `online` event,
- the Supabase Realtime channel reaching `connected`,
- a newer local snapshot while a write is in flight (backoff resets),
- app boot with an expired `nextAttemptAt`.

## Publishing rules

`useLiveStageState` now has one publish path:

1. Wait for hydration, then publish `serialized` after the debounce/backoff.
2. On success, set `lastPublished` to the exact snapshot that was sent.
   - If it still matches the current snapshot, clear the outbox.
   - If local state moved, re-queue immediately and publish the newer snapshot.
3. On failure, record the attempt, keep the room queued, and let the effect
   schedule the next backoff.
4. A queued attempt always re-reads the newest local snapshot.
5. A publish already in flight is never overlapped; completion re-evaluates the
   effect.

## Sync badge

`SyncStatusBadge` shows an outbox entry even when the channel status looks
healthy:

- label: **Pending sync** (plus the failed-attempt count when > 0),
- amber pulsing dot (disabled by reduced-motion),
- tooltip: queued explanation, attempts, next retry time and last error,
- `role="status"` + `aria-live="polite"` so the change is announced.

The badge is passed through the MC, DJ, pocket, photographer and speaker views.

## No silent loss — scenario walkthrough

| Scenario | Result |
| --- | --- |
| Publish fails, user keeps working | Outbox stays; every new snapshot is also retried |
| User reloads while pending | Outbox is read from localStorage and retried |
| Backoff waiting, network returns | `online`/Realtime connected resets the delay to 0 |
| State changes during a write | Newer snapshot is queued and sent next |
| Publish succeeds after newer state | Outbox stays until the newer snapshot also succeeds |
| Corrupt/blocked storage | Retry metadata is absent, but the live snapshot still persists separately; the badge does not claim a clean sync |
| Event wiped | Outbox is removed with the room |

## Limitations

- This is device-local. Two devices offline at once still converge via the
  existing last-write-wins snapshot model; a future version can add a server
  revision check.
- The outbox does not queue sensitive-note uploads (different table and
  encryption path). That can be added later with the same pattern.
- The badge does not tick a live countdown; it shows the next retry time in the
  tooltip and updates on each attempt.

## Manual verification

1. Disable the network or force `publish` to reject.
2. Advance a step → badge changes to **Pending sync** and the outbox key exists.
3. Reload → the badge still shows pending and the same local state.
4. Re-enable the network → the retry fires, badge returns to **Cloud synced**,
   and the outbox key disappears.
5. Change state during a slow publish → the final remote row matches the latest
   local state.
