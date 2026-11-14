-- Issue #931: encrypted game question bundles and publication.
-- One encrypted bundle per wedding and game type. Revisions are immutable and
-- the wedding cartridge keeps only step.game metadata. No client table access:
-- reads/writes go through service-role Edge Functions.

create table if not exists public.game_question_bundles (
  wedding_id      text not null references public.weddings(wedding_id) on delete cascade,
  game_type       text not null check (game_type in ('TEST_WIEDZY', 'TEST_ZGODNOSCI')),
  game_id         text not null check (char_length(game_id) between 1 and 120),
  title           text not null check (char_length(title) between 1 and 200),
  source_doc_id   text,
  status          text not null default 'PUBLISHED' check (status in ('PUBLISHED', 'DELETED')),
  live_revision   integer check (live_revision is null or live_revision > 0),
  question_count  integer not null default 0 check (question_count >= 0),
  version         integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (wedding_id, game_type)
);

create index if not exists game_question_bundles_wedding_idx
  on public.game_question_bundles (wedding_id, status, game_type);

create table if not exists public.game_question_revisions (
  wedding_id      text not null references public.weddings(wedding_id) on delete cascade,
  game_type       text not null check (game_type in ('TEST_WIEDZY', 'TEST_ZGODNOSCI')),
  revision        integer not null check (revision > 0),
  published_at    timestamptz not null default now(),
  published_by    uuid,
  source_doc_id   text,
  question_count  integer not null check (question_count > 0),
  entry           jsonb not null,
  primary key (wedding_id, game_type, revision)
);

create index if not exists game_question_revisions_wedding_idx
  on public.game_question_revisions (wedding_id, game_type, revision desc);

create table if not exists public.game_question_logs (
  id           bigint generated always as identity primary key,
  wedding_id   text not null references public.weddings(wedding_id) on delete cascade,
  game_type    text,
  actor        text,
  action       text not null,
  code         text,
  message      text,
  created_at   timestamptz not null default now()
);

create index if not exists game_question_logs_wedding_idx
  on public.game_question_logs (wedding_id, created_at desc);

-- Published revisions are append-only. Deletion happens only through the
-- wedding TTL cascade, so a before-delete trigger would block retention.
create or replace function public.stage_deck_game_question_revision_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'game_question_revisions are immutable';
end $$;

revoke all on function public.stage_deck_game_question_revision_immutable()
  from public, anon, authenticated;

drop trigger if exists game_question_revisions_immutable on public.game_question_revisions;
create trigger game_question_revisions_immutable
  before update on public.game_question_revisions
  for each row execute function public.stage_deck_game_question_revision_immutable();

drop trigger if exists touch_game_question_bundles on public.game_question_bundles;
create trigger touch_game_question_bundles
  before insert or update on public.game_question_bundles
  for each row execute function public.touch_updated_at();

alter table public.game_question_bundles  enable row level security;
alter table public.game_question_revisions enable row level security;
alter table public.game_question_logs     enable row level security;

revoke all on public.game_question_bundles  from anon, authenticated;
revoke all on public.game_question_revisions from anon, authenticated;
revoke all on public.game_question_logs     from anon, authenticated;

-- Bundles and revision history follow the wedding's 30-day TTL through the
-- weddings cascade. Logs are retained for 90 days independently.
create or replace function public.stage_deck_purge_game_question_logs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer := 0;
begin
  delete from public.game_question_logs where created_at < now() - interval '90 days';
  get diagnostics removed = row_count;
  return removed;
end $$;

revoke all on function public.stage_deck_purge_game_question_logs()
  from public, anon, authenticated;
