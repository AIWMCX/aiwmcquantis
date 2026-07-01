-- ============================================================================
-- Fix plan_entitlements.stripe_price_ids for tier='plus': seeded with two
-- price IDs (price_1TKemwLKMhSmZURCw1AwGYX2, price_1TKenYLKMhSmZURCEqUTfJDM)
-- that do not exist anywhere in the Stripe account (verified via GetPrices
-- on prod_ThBb89uyqRxyBa, 2026-06-30 -- no archived/inactive recurring price
-- exists under either ID, or any other ID, on that product). Replaced with
-- the real, active Plus monthly/annual price IDs.
-- ============================================================================
-- Same trust-critical class of bug as 20260630130000_fix_doc_template_count.sql:
-- this table is public-readable (anon SELECT grant), so the fake IDs were
-- live and queryable via the REST API, not just a stale code comment.

UPDATE public.plan_entitlements
SET stripe_price_ids = '["price_1SjnEiLKMhSmZURCONsiueNU","price_1SvWTaLKMhSmZURClCoqty4O"]'::jsonb,
    updated_at = now()
WHERE tier = 'plus'
  AND stripe_price_ids @> '["price_1TKemwLKMhSmZURCw1AwGYX2"]'::jsonb;
