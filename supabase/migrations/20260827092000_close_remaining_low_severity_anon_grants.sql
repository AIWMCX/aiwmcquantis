-- P0 security fix, fourth wave (same-day systematic audit) -- the
-- remaining low-severity findings.
--
-- All seven functions below accept a caller-supplied uuid/key with no
-- check that it belongs to the caller, and had no legitimate anon/
-- authenticated direct use: confirmed via codebase search that
-- increment_api_key_usage and verify_pro_subscription are called only via
-- a service-role admin client (supabase/functions/api-analyze-main), and
-- increment_template_usage / bump_public_metric / verify_paid_subscription
-- / verify_plus_subscription / _quote_gen_plan_tier have NO caller
-- anywhere in src/ or supabase/functions/ at all (only referenced
-- internally by other SECURITY DEFINER functions, whose SQL-to-SQL calls
-- execute under the owning role and are unaffected by this REVOKE).
--
-- Impact if left open: any authenticated/anonymous caller could inflate
-- an arbitrary api_key's or doc_template's usage counter, arbitrarily
-- inflate/manipulate a public-facing marketing metric (bump_public_metric
-- takes a free-text key and delta), or check any other user's paid-tier
-- status by UUID. All low severity -- no money movement, no PII beyond a
-- binary/tier flag, no path to escalate to something more severe.
--
-- Deliberately NOT touched: resubscribe_lead(text) / unsubscribe_lead(text)
-- remain anon-callable. These are the standard "click this link in the
-- email" unsubscribe/resubscribe token pattern, keyed by a hash of the
-- email address rather than a user session -- working without
-- authentication is the intended design, not an oversight.
REVOKE EXECUTE ON FUNCTION public.increment_api_key_usage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_template_usage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_public_metric(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_paid_subscription(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_plus_subscription(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_pro_subscription(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._quote_gen_plan_tier(uuid) FROM PUBLIC, anon, authenticated;
