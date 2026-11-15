-- Issue #969: store the private speech folder on the speech record so the
-- admin list can validate and retry Doc migrations without re-walking Drive.
-- Google Docs themselves are never modified by this migration.
alter table public.speech_records
  add column if not exists drive_folder_id text;
