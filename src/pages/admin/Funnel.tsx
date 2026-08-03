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
  { key: 'scenario_compared', label: 'Scenario compared' },
  { key: 'assumption_changed', label: 'Assumption changed' },
  { key: 'upgrade_cta_seen', label: 'Upgrade CTA seen' },
  { key: 'paid_checkout_start', label: 'Paid checkout start' },
] as const;

type Row = {
  event_name: string;
  total_events: number;
  unique_sessions: number;
  unique_users: number;
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
                      {(row?.unique_users ?? 0).toLocaleString()} users
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
        </CardContent>
      </Card>
    </div>
  );
}
