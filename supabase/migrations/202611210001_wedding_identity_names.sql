-- Issue #1326: admin-owned couple names for the generated client template.
--
-- The names are app data, never Doc-sourced. Existing rows are backfilled only
-- when `couple` splits on `&` into exactly two non-empty trimmed names. The
-- first name is the bride and the second is the groom; nothing is inferred from
-- the folder name.

alter table public.weddings
  add column if not exists bride_name text
    check (bride_name is null or char_length(bride_name) between 1 and 80),
  add column if not exists groom_name text
    check (groom_name is null or char_length(groom_name) between 1 and 80);

update public.weddings
set
  bride_name = nullif(btrim(split_part(couple, '&', 1)), ''),
  groom_name = nullif(btrim(split_part(couple, '&', 2)), '')
where couple is not null
  and array_length(string_to_array(couple, '&'), 1) = 2
  and nullif(btrim(split_part(couple, '&', 1)), '') is not null
  and nullif(btrim(split_part(couple, '&', 2)), '') is not null
  and char_length(btrim(split_part(couple, '&', 1))) between 1 and 80
  and char_length(btrim(split_part(couple, '&', 2))) between 1 and 80
  and (bride_name is null or groom_name is null);
