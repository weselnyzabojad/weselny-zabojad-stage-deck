-- Issue #1327: create-once guard for the generated client template.
alter table public.weddings
  add column if not exists template_doc_id text;
