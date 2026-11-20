-- Remove the VIP Radar / Contacts sensitive-note store.
--
-- VIP Radar and vendor Contacts were deleted from the application. The
-- `sensitive_notes` table existed only for their encrypted payload, so it is
-- no longer needed. The table is dropped with its policies and grants.

drop policy if exists "sensitive host read" on public.sensitive_notes;
drop policy if exists "sensitive host insert" on public.sensitive_notes;
drop policy if exists "sensitive host update" on public.sensitive_notes;

drop table if exists public.sensitive_notes;
