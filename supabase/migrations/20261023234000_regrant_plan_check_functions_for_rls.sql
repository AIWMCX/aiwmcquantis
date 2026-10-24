-- Regression from 20260827092000 (found 2026-10-23 by a live schema probe):
-- it revoked EXECUTE on verify_plus_subscription / verify_paid_subscription /
-- verify_pro_subscription from authenticated, on the premise that they had
-- "NO caller" except other SECURITY DEFINER functions. But RLS policies call
-- them, and policies run as the querying role, which now lacks EXECUTE:
--   GET /rest/v1/industry_benchmarks (signed in) ->
--   42501 permission denied for function verify_plus_subscription
-- The same applies to the plan-gated policies on documents, document_exports,
-- document_versions, branding_settings, api_keys and teams: paid features
-- erroring for paying users.
--
-- Restore EXECUTE for authenticated only (anon stays revoked). The accepted
-- residual risk, as before Aug 27: a signed-in caller can learn whether a
-- given (unguessable) user UUID has a paid plan. No money movement, no PII.

GRANT EXECUTE ON FUNCTION public.verify_plus_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_paid_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pro_subscription(uuid) TO authenticated;
