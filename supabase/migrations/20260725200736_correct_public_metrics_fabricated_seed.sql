-- Domain 17 accuracy audit (2026-07-25, P0-27): public_metrics.
--
-- CORRECTED ROOT-CAUSE (revises the initial P0-27 write-up): the
-- trg_public_metrics_monotonic and trg_bump_plans_stress_tested triggers
-- are both present, enabled, and firing correctly -- confirmed the most
-- recent bump's updated_at (2026-07-22 23:15:32) exactly matches the
-- most recent real funnel_events.analysis_complete row's created_at to
-- the second. The +5 growth since the last check was organic, from 5
-- real analysis_complete events, not a manual batch edit as first
-- suspected. The trigger mechanism is not broken and needs no fix.
--
-- The real, still-valid defect: BOTH counters were seeded (2026-07-04 /
-- 2026-07-06 migrations) at 175 / 1247 -- numbers with no basis in real
-- historical volume. The entire project has only ever recorded 88 real
-- `analysis_complete` funnel events (and only 93 rows in public.analyses
-- total, ever). Every organic increment since has been real and correct,
-- but compounding on top of a false floor, so the displayed total has
-- remained ~14x overstated the whole time.
--
-- Fix: reset both counters to 88 -- the real, directly-verifiable count
-- of the exact event (`analysis_complete`) this trigger tracks. Both
-- counters share one trigger and increment identically per event, so
-- there is no separate real number to compute for "distinct plans
-- validated" (plans_stress_tested's stated semantic in the 2026-07-06
-- migration comment) beyond what that shared mechanism can verify --
-- documented here rather than inventing a distinct-count implementation
-- in this pass. Going forward both will grow correctly from an honest
-- floor.
--
-- The monotonic guard (by design) rejects any UPDATE that lowers a
-- value, including this deliberate one-time correction -- disabling it
-- for this single statement, then re-enabling immediately, is the
-- correct way to make a genuine correction without weakening the
-- guarantee for all normal future writes.

ALTER TABLE public.public_metrics DISABLE TRIGGER trg_public_metrics_monotonic;

UPDATE public.public_metrics SET value = 88 WHERE key IN ('analyses_total', 'plans_stress_tested');

ALTER TABLE public.public_metrics ENABLE TRIGGER trg_public_metrics_monotonic;
