-- Issue #847: remove the exposed destructive MC RPC.
-- End-of-event cleanup must go through the AAL2 admin API, never a role token.
drop function if exists public.stage_deck_wipe_my_room();
