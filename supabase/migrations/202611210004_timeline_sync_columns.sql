-- Issue #1376: timeline editor context and Doc sync status.
alter table public.weddings
  add column if not exists timeline_doc_synced_revision integer,
  add column if not exists timeline_doc_synced_at timestamptz;
