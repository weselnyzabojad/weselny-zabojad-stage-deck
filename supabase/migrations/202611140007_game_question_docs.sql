-- Issue #932: one question Doc per enabled game.
-- Admin-only metadata for the owner-managed Drive Docs. Question text stays in
-- the Doc; parse output is encrypted as a #931 game bundle. No client access.
-- Drive Docs are never deleted or trashed by the app.

create table if not exists public.game_question_docs (
  wedding_id              text not null references public.weddings(wedding_id) on delete cascade,
  game_type               text not null check (game_type in ('TEST_WIEDZY', 'TEST_ZGODNOSCI')),
  game_id                 text not null check (char_length(game_id) between 1 and 120),
  title                   text not null check (char_length(title) between 1 and 200),
  drive_doc_id            text,
  drive_doc_url           text,
  drive_doc_name          text,
  drive_doc_version       text,
  drive_doc_modified_at   timestamptz,
  drive_doc_retrieved_at  timestamptz,
  drive_folder_id         text,
  languages               jsonb not null default '[]'::jsonb,
  status                  text not null default 'DRAFT'
    check (status in ('DRAFT', 'READY', 'PARSED', 'NEEDS_REVIEW', 'UNAVAILABLE')),
  review_required         boolean not null default false,
  question_count          integer not null default 0 check (question_count >= 0),
  last_parsed_at          timestamptz,
  version                 integer not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  primary key (wedding_id, game_type)
);

create index if not exists game_question_docs_wedding_idx
  on public.game_question_docs (wedding_id, status, game_type);

drop trigger if exists touch_game_question_docs on public.game_question_docs;
create trigger touch_game_question_docs
  before insert or update on public.game_question_docs
  for each row execute function public.touch_updated_at();

alter table public.game_question_docs enable row level security;

revoke all on public.game_question_docs from anon, authenticated;
