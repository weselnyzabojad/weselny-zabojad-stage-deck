-- Issue #923: dedicated encrypted speech bundle backend.
-- No client table access: every read/write goes through service-role Edge
-- Functions. The wedding cartridge keeps only speechMode.

create table if not exists public.speech_records (
  wedding_id              text not null references public.weddings(wedding_id) on delete cascade,
  id                      text not null,
  sort_order              integer not null,
  speaker_name            text not null check (char_length(speaker_name) between 1 and 160),
  speaker_relationship    text,
  speaker_language        text not null check (speaker_language ~ '^[A-Z]{2}$'),
  mc_language             text not null check (mc_language ~ '^[A-Z]{2}$'),
  speaker_access          boolean not null default true,
  drive_doc_id            text,
  drive_doc_url           text,
  drive_doc_name          text,
  drive_doc_version       text,
  drive_doc_modified_at   timestamptz,
  drive_doc_retrieved_at  timestamptz,
  status                  text not null default 'DRAFT' check (status in ('DRAFT', 'READY', 'PUBLISHED', 'UNAVAILABLE', 'DELETED')),
  live_revision           integer,
  locked_at               timestamptz,
  version                 integer not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  primary key (wedding_id, id),
  constraint speech_records_languages_differ check (speaker_language <> mc_language)
);

create index if not exists speech_records_order_idx
  on public.speech_records (wedding_id, sort_order, id);

create table if not exists public.speech_revisions (
  wedding_id    text not null references public.weddings(wedding_id) on delete cascade,
  revision      integer not null check (revision > 0),
  published_at  timestamptz not null default now(),
  published_by  uuid,
  entries       jsonb not null,
  primary key (wedding_id, revision)
);

create index if not exists speech_revisions_wedding_idx
  on public.speech_revisions (wedding_id, revision desc);

create table if not exists public.speech_access (
  wedding_id   text not null,
  speech_id    text not null,
  pin_hash     text not null,
  enabled      boolean not null default true,
  rotated_at   timestamptz,
  revoked_at   timestamptz,
  last_used_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (wedding_id, speech_id),
  foreign key (wedding_id, speech_id)
    references public.speech_records(wedding_id, id) on delete cascade
);

create table if not exists public.speech_sessions (
  jti         uuid primary key,
  wedding_id  text not null,
  speech_id   text not null,
  role        text not null check (role = 'speaker'),
  device_id   text not null,
  issued_at   timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  foreign key (wedding_id, speech_id)
    references public.speech_records(wedding_id, id) on delete cascade
);

create index if not exists speech_sessions_lookup_idx
  on public.speech_sessions (wedding_id, speech_id, expires_at);

create table if not exists public.speech_live (
  wedding_id  text primary key references public.weddings(wedding_id) on delete cascade,
  speech_id   text not null,
  started_at  timestamptz not null default now(),
  started_by  uuid,
  foreign key (wedding_id, speech_id)
    references public.speech_records(wedding_id, id) on delete cascade
);

create table if not exists public.speech_logs (
  id           bigint generated always as identity primary key,
  wedding_id   text not null references public.weddings(wedding_id) on delete cascade,
  actor        text,
  action       text not null,
  doc_id       text,
  doc_version  text,
  error_code   text,
  message      text,
  created_at   timestamptz not null default now()
);

create index if not exists speech_logs_wedding_idx
  on public.speech_logs (wedding_id, created_at desc);

drop trigger if exists touch_speech_records on public.speech_records;
create trigger touch_speech_records
  before insert or update on public.speech_records
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_speech_access on public.speech_access;
create trigger touch_speech_access
  before insert or update on public.speech_access
  for each row execute function public.touch_updated_at();

alter table public.speech_records   enable row level security;
alter table public.speech_revisions enable row level security;
alter table public.speech_access    enable row level security;
alter table public.speech_sessions  enable row level security;
alter table public.speech_live      enable row level security;
alter table public.speech_logs      enable row level security;

revoke all on public.speech_records   from anon, authenticated;
revoke all on public.speech_revisions from anon, authenticated;
revoke all on public.speech_access    from anon, authenticated;
revoke all on public.speech_sessions  from anon, authenticated;
revoke all on public.speech_live      from anon, authenticated;
revoke all on public.speech_logs      from anon, authenticated;

-- Logs are retained for 90 days independently of the wedding TTL.
create or replace function public.stage_deck_purge_speech_logs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer := 0;
begin
  delete from public.speech_logs where created_at < now() - interval '90 days';
  get diagnostics removed = row_count;
  return removed;
end $$;

revoke all on function public.stage_deck_purge_speech_logs() from public, anon, authenticated;
