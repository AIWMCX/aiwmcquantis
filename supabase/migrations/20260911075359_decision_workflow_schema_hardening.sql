-- Follow-up hardening for the decision-workflow schema (advisor findings,
-- caught immediately after the schema migration rather than left to drift):
--
-- 1. set_decision_workflow_updated_at had a mutable search_path -- every
--    other trigger/SECURITY DEFINER function in this codebase pins one.
-- 2. anon had redundant default table-level SELECT grants on all 14 new
--    tables. RLS (enabled + forced, no anon policy on any of them) already
--    blocks anon from reading a single row -- this is not a live data
--    exposure -- but the unused grant makes the tables needlessly
--    discoverable in the GraphQL schema. None of this workflow's data is
--    ever meant to be anonymous-readable, so revoke it outright rather than
--    leave defense-in-depth to RLS alone.

create or replace function public.set_decision_workflow_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke select on table public.workflow_templates from anon;
revoke select, insert, update, delete on table public.workflow_entitlements from anon;
revoke select, insert, update, delete on table public.decision_workspaces from anon;
revoke select, insert, update, delete on table public.decision_workspace_members from anon;
revoke select, insert, update, delete on table public.decision_frames from anon;
revoke select, insert, update, delete on table public.decision_evidence_items from anon;
revoke select, insert, update, delete on table public.decision_assumptions from anon;
revoke select, insert, update, delete on table public.decision_scenarios from anon;
revoke select, insert, update, delete on table public.decision_calculation_runs from anon;
revoke select, insert, update, delete on table public.decision_risks from anon;
revoke select, insert, update, delete on table public.decision_actions from anon;
revoke select, insert, update, delete on table public.decision_review_events from anon;
revoke select, insert, update, delete on table public.decision_packet_versions from anon;
revoke select, insert, update, delete on table public.decision_activity_events from anon;
