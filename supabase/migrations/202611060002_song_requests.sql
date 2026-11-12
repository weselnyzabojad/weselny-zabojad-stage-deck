-- Public guest song requests for the DJ VIP queue.
--
-- Guests submit through the submit_song_request Edge Function, which uses the
-- service role. The browser never receives insert rights on song_requests and
-- can never read the queue. Only joined MC/DJ tokens may read and triage
-- requests, and the column grant allows status changes only.

create table if not exists public.song_requests (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  text not null references public.weddings(wedding_id) on delete cascade,
  song        text not null check (char_length(song) between 1 and 120),
  artist      text not null check (char_length(artist) between 1 and 120),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  source      text not null default 'guest_qr' check (source in ('guest_qr')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists song_requests_queue_idx
  on public.song_requests (wedding_id, status, created_at);

-- IPs are hashed before they reach this table. Service-role access only.
create table if not exists public.song_request_attempts (
  id           bigint generated always as identity primary key,
  room_code    text not null,
  ip_hash      text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists song_request_attempts_window_idx
  on public.song_request_attempts (room_code, ip_hash, attempted_at);

drop trigger if exists touch_song_requests on public.song_requests;
create trigger touch_song_requests
  before insert or update on public.song_requests
  for each row execute function public.touch_updated_at();

alter table public.song_requests enable row level security;
alter table public.song_request_attempts enable row level security;

drop policy if exists "song request queue read" on public.song_requests;
drop policy if exists "song request queue update" on public.song_requests;

create policy "song request queue read"
  on public.song_requests for select
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj')
  );

create policy "song request queue update"
  on public.song_requests for update
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj')
  )
  with check (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj')
    and status in ('accepted', 'declined')
  );

revoke all on public.song_requests from anon, authenticated;
revoke all on public.song_request_attempts from anon, authenticated;

grant select on public.song_requests to authenticated;
grant update (status) on public.song_requests to authenticated;
