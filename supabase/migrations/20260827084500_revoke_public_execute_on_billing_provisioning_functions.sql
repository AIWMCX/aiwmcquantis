-- P0 security fix, second wave: a systematic audit of every SECURITY
-- DEFINER function executable by `anon` (prompted by finding
-- admin_fix_subscription unguarded earlier the same day) found two more
-- functions with the identical pattern -- no authorization check at all.
--
-- provision_pro_features(uuid, timestamptz, text, text): upserts
-- public.subscriptions to plan_id='pro', status='active' for any supplied
-- user_id, clearing payment_failed_at/canceled_at. Anonymous callers could
-- grant themselves (or anyone) a permanent free Pro subscription.
--
-- mark_subscription_canceled(uuid, text): cancels/downgrades any supplied
-- user_id's subscription. Anonymous callers could cancel any paying
-- customer's subscription (revenue-griefing / DoS vector).
--
-- Confirmed via codebase search: the ONLY callers of either function are
-- supabase/functions/stripe-webhook/index.ts, which authenticates with
-- SUPABASE_SERVICE_ROLE_KEY (not the anon/publishable key) -- there is no
-- legitimate client-side caller for either. service_role is left
-- untouched; only anon/authenticated/PUBLIC execution paths are closed.
--
-- (A third candidate flagged by the same audit, get_analysis_case_grid,
-- was investigated and found to be a false positive: it reads from a
-- fixed 40-case public demo/reference library (analysis_edge_cases),
-- not private customer data -- intentionally public, no fix needed.)

REVOKE EXECUTE ON FUNCTION public.provision_pro_features(uuid, timestamptz, text, text)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_subscription_canceled(uuid, text)
  FROM PUBLIC, anon, authenticated;
