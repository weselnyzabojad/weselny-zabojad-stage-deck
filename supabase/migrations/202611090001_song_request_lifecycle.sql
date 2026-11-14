-- Guest song request lifecycle: device correlation, played state and cooldown.
--
-- device_id is a guest-generated correlation id, never authentication. Guests
-- still have no table access; status is read only through the
-- get_song_request_status Edge Function.

alter table public.song_requests
  add column if not exists device_id text;

alter table public.song_requests
  add column if not exists played_at timestamptz;

do $$
begin
  alter table public.song_requests
    add constraint song_requests_device_id_length
    check (device_id is null or char_length(device_id) between 8 and 64);
exception
  when duplicate_object then null;
end $$;

create index if not exists song_requests_device_cooldown_idx
  on public.song_requests (wedding_id, device_id, created_at desc);

create index if not exists song_requests_queue_state_idx
  on public.song_requests (wedding_id, status, played_at, created_at);

-- The DJ Played action sets played_at while status stays accepted/declined.
grant update (played_at) on public.song_requests to authenticated;
