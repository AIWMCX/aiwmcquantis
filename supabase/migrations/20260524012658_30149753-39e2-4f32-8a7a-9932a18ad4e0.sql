-- 1) Analysis reference tables: drop broad authenticated SELECT.
--    Access is gated via SECURITY DEFINER RPC public.get_analysis_case_grid.
DROP POLICY IF EXISTS "Authenticated read analysis_break_even"     ON public.analysis_break_even;
DROP POLICY IF EXISTS "Authenticated read analysis_burn_runway"    ON public.analysis_burn_runway;
DROP POLICY IF EXISTS "Authenticated read analysis_cash_flow"      ON public.analysis_cash_flow;
DROP POLICY IF EXISTS "Authenticated read analysis_dcf"            ON public.analysis_dcf;
DROP POLICY IF EXISTS "Authenticated read analysis_dscr_credit"    ON public.analysis_dscr_credit;
DROP POLICY IF EXISTS "Authenticated read analysis_edge_cases"     ON public.analysis_edge_cases;
DROP POLICY IF EXISTS "Authenticated read analysis_monte_carlo"    ON public.analysis_monte_carlo;
DROP POLICY IF EXISTS "Authenticated read analysis_pre_mortem"     ON public.analysis_pre_mortem;
DROP POLICY IF EXISTS "Authenticated read analysis_scenario"       ON public.analysis_scenario;
DROP POLICY IF EXISTS "Authenticated read analysis_tam_sam_som"    ON public.analysis_tam_sam_som;
DROP POLICY IF EXISTS "Authenticated read analysis_unit_economics" ON public.analysis_unit_economics;

-- Ensure RLS stays enabled (deny-by-default). Service role and SECURITY DEFINER bypass RLS.
ALTER TABLE public.analysis_break_even     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_burn_runway    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_cash_flow      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_dcf            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_dscr_credit    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_edge_cases     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_monte_carlo    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_pre_mortem     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_scenario       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_tam_sam_som    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_unit_economics ENABLE ROW LEVEL SECURITY;

-- 2) benchmarks_v2_*: restrict SELECT to authenticated only.
DROP POLICY IF EXISTS "Public read access" ON public.benchmarks_v2_core;
DROP POLICY IF EXISTS "Public read access" ON public.benchmarks_v2_geo;
DROP POLICY IF EXISTS "Public read access" ON public.benchmarks_v2_risk;
DROP POLICY IF EXISTS "Public read access" ON public.benchmarks_v2_invoice;
DROP POLICY IF EXISTS "Public read access" ON public.benchmarks_v2_unit_econ;

CREATE POLICY "Authenticated read benchmarks_v2_core"
  ON public.benchmarks_v2_core      FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read benchmarks_v2_geo"
  ON public.benchmarks_v2_geo       FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read benchmarks_v2_risk"
  ON public.benchmarks_v2_risk      FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read benchmarks_v2_invoice"
  ON public.benchmarks_v2_invoice   FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read benchmarks_v2_unit_econ"
  ON public.benchmarks_v2_unit_econ FOR SELECT TO authenticated USING (true);

-- 3) team_invitations: hide token_hash from any client-side SELECT.
REVOKE SELECT (token_hash) ON public.team_invitations FROM authenticated, anon;

-- 4) user_realism_feedback: remove anon read path.
DROP POLICY IF EXISTS "Users can view their own realism feedback" ON public.user_realism_feedback;
CREATE POLICY "Users can view their own realism feedback"
  ON public.user_realism_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5) email_send_log: explicit defense-in-depth deny for non-service-role reads.
CREATE POLICY "Deny authenticated SELECT on email_send_log"
  ON public.email_send_log
  FOR SELECT
  TO authenticated
  USING (false);