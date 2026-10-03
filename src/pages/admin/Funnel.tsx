import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';

/**
 * /admin/funnel — SOW §6.1 canonical 8-event funnel dashboard.
 * Reads from public.funnel_summary_30d (admin-only via security_invoker view).
 */

const SOW_EVENTS = [
  { key: 'home_view', label: 'Home view' },
  { key: 'pricing_view', label: 'Pricing view' },
  { key: 'free_signup_start', label: 'Free signup start' },
  { key: 'free_signup_complete', label: 'Free signup complete' },
  { key: 'analysis_start', label: 'Analysis start' },
  { key: 'analysis_complete', label: 'Analysis complete' },
  { key: 'paid_checkout_start', label: 'Paid checkout start' },
  { key: 'paid_checkout_complete', label: 'Paid checkout complete' },
] as const;

// Phase 5 (Growth & GTM), added 2026-08-03: the gap this session's own
// Domain 9 audit found -- verdict_viewed and paid_checkout_start had no
// staged events between them, so there was no way to see whether a user
// actually engages with scenario comparison or assumption editing before
// converting or churning. scenario_compared / assumption_changed have fired
// live and persisted to funnel_events since 2026-07-21 (migration
// 20260721184551_add_activation_ladder_events.sql already widened the
// canonical-name allowlist) -- the events existed, nothing rendered them.
// verdict_viewed, not home_view, is the right baseline here: this ladder
// measures post-analysis engagement depth, not top-of-funnel acquisition.
const ACTIVATION_LADDER_EVENTS = [
  { key: 'verdict_viewed', label: 'Verdict viewed' },
  { key: 'driver_inspected', label: 'Driver inspected' },
  { key: 'scenario_compared', label: 'Scenario compared' },
  { key: 'assumption_changed', label: 'Assumption changed' },
  { key: 'upgrade_cta_seen', label: 'Upgrade CTA seen' },
  { key: 'paid_checkout_start', label: 'Paid checkout start' },
  { key: 'subscription_activated', label: 'Subscription activated' },
] as const;

// JEV decision-intelligence (2026-10-03): a separate row rather than folded
// into ACTIVATION_LADDER_EVENTS above -- these only exist for founder/admin
// accounts while decision_review_v1 is off (see
// docs/decision-intelligence/), so mixing them into the real-user ladder
// would understate every stage's conversion by diluting the denominator
// with founder testing activity. Kept visible here so there's at least
// shadow-mode usage data once the panel starts getting used.
const INDEPENDENT_REVIEW_EVENTS = [
  { key: 'decision_breakpoint_viewed', label: 'Breakpoint viewed' },
  { key: 'independent_review_viewed', label: 'Independent review viewed' },
  { key: 'decision_consensus_viewed', label: 'Consensus viewed' },
] as const;

type Row = {
  event_name: string;
  total_events: number;
  unique_sessions: number;
  unique_users: number;
  unique_analyses: number;
  first_seen: string | null;
  last_seen: string | null;
};

export default function AdminFunnel() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('funnel_summary_30d' as never)
        .select('*');
      if (error) {
        logger.error('funnel_summary_30d read failed', error);
        setError(error.message);
        setRows([]);
        return;
      }
      setRows((data as unknown as Row[]) ?? []);
    })();
  }, []);

  const byEvent = new Map<string, Row>(
    (rows ?? []).map(r => [r.event_name, r]),
  );

  const sessionsAt = (key: string) => byEvent.get(key)?.unique_sessions ?? 0;
  const home = sessionsAt('home_view');
  const verdictViewed = sessionsAt('verdict_viewed');

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <Helmet>
        <title>Funnel — Admin · AIWMC Quantis</title>
      </Helmet>

      <header className="mb-6">
        <h1 className="text-2xl font-bold">Funnel — last 30 days</h1>
        <p className="text-sm text-muted-foreground mt-1">
          SOW §6.1 canonical events. Conversion percentages are stage-vs-home.
        </p>
      </header>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">
            Could not load funnel: {error}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SOW_EVENTS.map(({ key, label }) => {
          const row = byEvent.get(key);
          const sessions = row?.unique_sessions ?? 0;
          const conv = home > 0 ? ((sessions / home) * 100).toFixed(2) : '—';
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rows === null ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-3xl font-bold">{sessions.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      sessions · {conv}% of home
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {(row?.total_events ?? 0).toLocaleString()} total ·{' '}
                      {(row?.unique_users ?? 0).toLocaleString()} users
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <header className="mt-10 mb-6">
        <h2 className="text-xl font-bold">Activation ladder — post-analysis engagement</h2>
        <p className="text-sm text-muted-foreground mt-1">
          <strong>Analyses</strong> below counts distinct analysis_id values carried in each
          event's metadata — a third denominator alongside sessions/users, never mixed with
          either. Not every event stamps an analysis_id, so it reads lower there, honestly,
          rather than estimated.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Same <code>funnel_events</code> sink, different question: of the sessions that saw a
          verdict, how many actually engage before converting or leaving? Conversion percentages
          here are stage-vs-verdict-viewed, not stage-vs-home — home_view is the wrong baseline
          for engagement that only exists after an analysis completes.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {ACTIVATION_LADDER_EVENTS.map(({ key, label }) => {
          const row = byEvent.get(key);
          const sessions = row?.unique_sessions ?? 0;
          const conv = verdictViewed > 0 ? ((sessions / verdictViewed) * 100).toFixed(2) : '—';
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rows === null ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-3xl font-bold">{sessions.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      sessions · {conv}% of verdict-viewed
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {(row?.total_events ?? 0).toLocaleString()} total ·{' '}
                      {(row?.unique_users ?? 0).toLocaleString()} users ·{' '}
                      {(row?.unique_analyses ?? 0).toLocaleString()} analyses
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <header className="mt-10 mb-6">
        <h2 className="text-xl font-bold">Independent review (founder/admin-only preview)</h2>
        <p className="text-sm text-muted-foreground mt-1">
          JEV decision-intelligence shadow mode (<code>docs/decision-intelligence/</code>). These
          events currently only fire for admin accounts testing the panel in{' '}
          <code>DecisionSummary.tsx</code> — not yet real-user traffic — kept separate from the
          ladder above so it never dilutes a real conversion denominator.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {INDEPENDENT_REVIEW_EVENTS.map(({ key, label }) => {
          const row = byEvent.get(key);
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rows === null ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-3xl font-bold">{(row?.unique_sessions ?? 0).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      sessions · {(row?.unique_users ?? 0).toLocaleString()} users ·{' '}
                      {(row?.unique_analyses ?? 0).toLocaleString()} analyses
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Methodology</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Events are written to <code>funnel_events</code> via the{' '}
            <code>record_funnel_event</code> RPC from <code>src/lib/analytics.ts</code>.
            GA4 receives the same events for marketing attribution.
          </p>
          <p>
            Conversion-rate baseline is <code>home_view</code> unique sessions for the
            acquisition funnel above, and <code>verdict_viewed</code> for the activation
            ladder below. Bot/spam sessions (filtered in <code>shouldTrack()</code>) are
            excluded before write.
          </p>
          <p>
            <code>scenario_compared</code> / <code>assumption_changed</code> fire from{' '}
            <code>AccuracyTransparentResults.tsx</code> and have been persisting since
            migration <code>20260721184551_add_activation_ladder_events</code> widened
            the canonical-name allowlist — this page previously never rendered them.
          </p>
          <p>
            This page itself existed in the repo but was never routed, and the two views it
            reads (<code>funnel_summary_30d</code>/<code>funnel_daily_30d</code>) did not exist
            in production despite being defined in an early migration — both fixed 2026-10-03
            (migration <code>20261003140000_restore_funnel_summary_views</code>). The views now
            run with <code>security_invoker</code> so a non-admin authenticated user reading
            them directly gets the same zero rows <code>funnel_events</code>&apos; own RLS
            already gives them, rather than the aggregate counts the original definition's plain
            grant would have exposed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
