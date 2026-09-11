-- The /admin/today dashboard (2026-09-11) needs analysis_complete_events'
-- ok/degraded columns to show today's completed/failed Decision Run counts.
-- Only a "read own" policy existed; an admin client-side query would have
-- silently seen just their own rows, not company-wide truth. Mirrors the
-- exact has_role(auth.uid(), 'admin') pattern already used on analyses,
-- ai_calls, and financial_invariant_sweep_runs.
create policy "Admins can read all analysis_complete_events"
  on public.analysis_complete_events
  for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));
