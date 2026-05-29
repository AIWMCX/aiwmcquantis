import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';

interface FunnelStep {
  key: string;
  label: string;
  sessions: number;
  conv_from_prev_pct: number | null;
  conv_from_top_pct: number | null;
}
interface FunnelPayload {
  window_days: number;
  generated_at: string;
  steps: FunnelStep[];
}
interface MonthlyRow {
  month_start: string;
  total_analyses: number;
  unique_users: number;
  free_count: number;
  plus_count: number;
  pro_count: number;
  anonymous_count: number;
}

export function SampleFunnelAndAnalysesCard() {
  const [funnel, setFunnel] = useState<FunnelPayload | null>(null);
  const [monthly, setMonthly] = useState<MonthlyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [f, m] = await Promise.all([
          supabase.rpc('get_sample_report_funnel', { p_days: 30 }),
          supabase.rpc('get_monthly_analyses_stats', { p_months: 12 }),
        ]);
        if (f.error) throw f.error;
        if (m.error) throw m.error;
        setFunnel(f.data as unknown as FunnelPayload);
        setMonthly((m.data ?? []) as unknown as MonthlyRow[]);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load';
        logger.error('[SampleFunnelAndAnalysesCard]', e);
        setError(msg);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      {/* Sample Report Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Sample Report Funnel · last 30 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive mb-3">{error}</p>}
          {funnel === null && !error ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {funnel?.steps.map(s => (
                <div key={s.key} className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {s.label}
                  </p>
                  <p className="text-2xl font-bold tabular-nums mt-1">
                    {s.sessions.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.conv_from_prev_pct === null
                      ? 'top of funnel'
                      : `${s.conv_from_prev_pct}% from previous`}
                  </p>
                  {s.conv_from_top_pct !== null && s.key !== 'sample_view' && (
                    <p className="text-[11px] text-muted-foreground">
                      {s.conv_from_top_pct}% of views
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Analyses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Monthly Analyses · last 12 months
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthly === null && !error ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Month</th>
                    <th className="py-2 px-3 text-right">Total</th>
                    <th className="py-2 px-3 text-right">Users</th>
                    <th className="py-2 px-3 text-right">Free</th>
                    <th className="py-2 px-3 text-right">Plus</th>
                    <th className="py-2 px-3 text-right">Pro</th>
                    <th className="py-2 pl-3 text-right">Anonymous</th>
                  </tr>
                </thead>
                <tbody>
                  {(monthly ?? []).map(r => (
                    <tr key={r.month_start} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-medium">
                        {new Date(r.month_start).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-bold">
                        {r.total_analyses.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {r.unique_users.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                        {r.free_count.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-primary">
                        {r.plus_count.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-success">
                        {r.pro_count.toLocaleString()}
                      </td>
                      <td className="py-2 pl-3 text-right tabular-nums text-muted-foreground">
                        {r.anonymous_count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {monthly?.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-muted-foreground">
                        No analyses yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
