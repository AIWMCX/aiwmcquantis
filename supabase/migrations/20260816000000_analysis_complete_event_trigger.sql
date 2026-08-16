-- Analysis-complete funnel-event trigger — 2026-08-16
--
-- Fixes a measurement gap that currently blocks every commercial-funnel
-- decision. Live production evidence, DB-verified this session:
--
--   commercial_analyses (persisted table)  = 24 in the last 30 days
--   funnel_events.analysis_complete (event) = 6 in the last 30 days
--
-- A 4x discrepancy means we cannot tell whether "82% drop from analysis_started
-- to analysis_complete" (33 -> 6 in the last 30 days on funnel_events) is real
-- funnel loss or an under-instrumented completion event. Either interpretation
-- has completely different downstream actions, so it is impossible to prioritize
-- the next commercial change without closing this gap first.
--
-- Client-side emission was tried previously and is what produces the current
-- drift: analyses are inserted from at least four different paths (client
-- authenticated save, client anonymous save, migrateLocalStorageToDb,
-- server-side promote-scenario-to-analysis) and a client-side event call
-- can be lost to a page refresh, a network blip between the save and the
-- event, a client crash, or simply a call site that was never wired up.
--
-- An AFTER INSERT trigger on public.analyses is the only hook that catches
-- every one of those four paths atomically. The row-in-analyses IS the
-- ground truth for "an analysis completed" (analyses only stores completed
-- runs; started-but-failed analyses live in analysis_jobs, not here). So
-- one trigger = one event, guaranteed 1:1.
--
-- Precedent: this table already has an AFTER INSERT trigger
-- (trg_admin_notify_new_analysis, calling notify_admin_new_analysis()),
-- so the pattern is proven safe on this write path. The
-- bump_plans_stress_tested_on_analysis_complete function
-- (20260706170000_analyses_total_counter.sql) already establishes the
-- fire-and-forget error-handling convention used below: a bump/emit failure
-- must never propagate up and block the primary write. That convention is
-- what makes this trigger safe to add to a hot write path.
--
-- Only ~1 hour of coding work, but this is DO_NOW per the sprint charter's
-- own criterion #7: "blocks measurement of the revenue path." Every
-- downstream funnel-tuning decision this sprint depends on the numbers this
-- event produces being trustworthy.

CREATE OR REPLACE FUNCTION public.emit_analysis_complete_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fire-and-forget. An event-log write failure must NEVER block the primary
  -- analysis save on the customer's request path. Matches the exact pattern
  -- established by bump_plans_stress_tested_on_analysis (20260704130000) and
  -- bump_plans_stress_tested_on_analysis_complete (20260706170000), both live
  -- on this exact table's write path today.
  BEGIN
    INSERT INTO public.funnel_events (
      event_name,
      session_id,
      user_id,
      metadata
    ) VALUES (
      'analysis_complete',
      -- session_id is NOT NULL on funnel_events. NEW.id is guaranteed present,
      -- unique per analysis, and joinable back to the analysis row -- exactly
      -- the semantics an event consumer wants ("which completion is this").
      -- This is stronger than the human-visible session tracking used by
      -- client-side emits, which cannot be trusted for server-emitted events
      -- (the trigger has no browser-session context).
      NEW.id::text,
      NEW.user_id,  -- nullable on funnel_events; matches anonymous analyses (user_id IS NULL)
      jsonb_build_object(
        'analysis_id', NEW.id,
        'depth', NEW.depth,
        'tier_at_creation', NEW.tier_at_creation,
        'anonymous', NEW.user_id IS NULL,
        'emitted_by', 'trg_analyses_emit_complete_event'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'emit_analysis_complete_event: event insert failed (%): % -- analysis save NOT affected',
      SQLSTATE, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- No EXECUTE grants needed -- trigger functions are invoked by the executor,
-- never by direct SQL calls from any role. Matches the pattern of every
-- other trigger function on this table (notify_admin_new_analysis, etc.).

DROP TRIGGER IF EXISTS trg_analyses_emit_complete_event ON public.analyses;
CREATE TRIGGER trg_analyses_emit_complete_event
  AFTER INSERT ON public.analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_analysis_complete_event();

COMMENT ON FUNCTION public.emit_analysis_complete_event() IS
  'AFTER INSERT trigger on public.analyses -- emits one funnel_events row (event_name=analysis_complete) per real completed analysis, from any of the four insert paths. Fire-and-forget: event-log failures cannot block the primary analysis write. Closes the measurement gap where funnel_events undercounted completed analyses by 4x, blocking every commercial-funnel decision.';
