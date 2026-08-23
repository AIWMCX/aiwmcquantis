-- User cohort classifier, part 1/2 (QNT-DEFECT-005 / GTM Track C item 1).
-- Split into 2 migrations because Postgres will not let a new enum value be
-- referenced in the same transaction that adds it.
--
-- Extends, does not duplicate, the existing binary filter built 2026-07-20
-- (external_commercial_users / commercial_subscriptions / commercial_analyses
-- in 20260721051509_commercial_clean_views.sql) -- that view is orphaned
-- (zero consumers anywhere in application code, confirmed via repo-wide grep)
-- and only distinguishes "external commercial" vs "everything else", with no
-- way to tell WHY a row was excluded. This adds the granular taxonomy
-- QNT-DEFECT-005 calls for: EXTERNAL_REAL / FOUNDER / STAFF / QA / TEST /
-- BOT / SYNTHETIC / DEMO.
--
-- Honest scope limit: BOT, SYNTHETIC, and DEMO have NO current detectable
-- signal anywhere in this schema (no user-agent capture, no synthetic-account
-- flag, no demo-account flag exist). Per this project's own established
-- doctrine (typed unavailable states over fabricated proxies), these 3
-- categories are real, valid enum values this classifier CAN assign, but no
-- current row will ever match them -- they exist for when a real detection
-- signal is added, not as false-precision placeholders. QA is similarly
-- reserved for a future manual-QA-tester signal distinct from the automated
-- test-fixture patterns TEST already catches.

CREATE TYPE public.user_cohort AS ENUM (
  'EXTERNAL_REAL', 'FOUNDER', 'STAFF', 'QA', 'TEST', 'BOT', 'SYNTHETIC', 'DEMO'
);
