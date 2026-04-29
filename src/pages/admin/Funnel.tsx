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
            Conversion-rate baseline is <code>home_view</code> unique sessions.
            Bot/spam sessions (filtered in <code>shouldTrack()</code>) are
            excluded before write.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
