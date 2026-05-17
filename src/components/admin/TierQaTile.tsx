import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, PlayCircle, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';

type Failure = {
  tier: string;
  matrix: string;
  key: string;
  message: string;
  expected?: unknown;
  actual?: unknown;
};

interface TierQaRun {
  id: string;
  run_id: string;
  status: 'running' | 'passed' | 'failed' | 'error';
  triggered_by: string;
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  pass_rate: number;
  duration_ms: number | null;
  failures: Failure[];
  summary: Record<string, { passed: number; failed: number }>;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

export function TierQaTile() {
  const [run, setRun] = useState<TierQaRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const fetchLatest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tier_qa_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setRun(data as unknown as TierQaRun | null);
    } catch (e) {
      logger.error('TierQaTile fetch failed', e);
    } finally {
      setLoading(false);
    }
  };

  const triggerRun = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke('run-tier-qa-harness', { body: {} });
      if (error) throw error;
      await new Promise((r) => setTimeout(r, 1200));
      await fetchLatest();
    } catch (e) {
      logger.error('Tier QA manual run failed', e);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    fetchLatest();
  }, []);

  const renderStatus = () => {
    if (!run) return <Badge variant="outline">No runs yet</Badge>;
    const map: Record<TierQaRun['status'], { label: string; icon: JSX.Element; cls: string }> = {
      passed: { label: 'PASSED', icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: 'bg-green-500/15 text-green-600 border-green-500/30' },
      failed: { label: 'FAILED', icon: <AlertTriangle className="h-3.5 w-3.5" />, cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
      error:  { label: 'ERROR',  icon: <XCircle className="h-3.5 w-3.5" />, cls: 'bg-red-500/15 text-red-600 border-red-500/30' },
      running:{ label: 'RUNNING',icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
    };
    const s = map[run.status];
    return <Badge className={`gap-1 ${s.cls}`} variant="outline">{s.icon}{s.label}</Badge>;
  };

  const failuresToShow = run?.failures?.slice(0, showAll ? undefined : 5) ?? [];

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-semibold">Tier QA Harness</CardTitle>
          {renderStatus()}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={fetchLatest} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={triggerRun} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <PlayCircle className="h-4 w-4 mr-1" />}
            Run now
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !run ? (
          <p className="text-sm text-muted-foreground">Loading latest run…</p>
        ) : !run ? (
          <p className="text-sm text-muted-foreground">No harness runs yet. Click <strong>Run now</strong> to execute the first one.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Pass rate</div>
                <div className="text-2xl font-mono font-semibold">{run.pass_rate?.toFixed?.(1) ?? '0.0'}%</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Cases</div>
                <div className="text-2xl font-mono font-semibold">{run.passed_cases}/{run.total_cases}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Failures</div>
                <div className={`text-2xl font-mono font-semibold ${run.failed_cases > 0 ? 'text-amber-600' : ''}`}>{run.failed_cases}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Duration</div>
                <div className="text-2xl font-mono font-semibold">{run.duration_ms ? `${run.duration_ms}ms` : '—'}</div>
              </div>
            </div>

            {run.summary && Object.keys(run.summary).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {(['features', 'limits', 'pricing', 'smoke'] as const).map((m) => {
                  const s = run.summary[m];
                  if (!s) return null;
                  const ok = (s.failed ?? 0) === 0;
                  return (
                    <div key={m} className={`rounded border px-2 py-1.5 ${ok ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                      <div className="font-medium capitalize">{m}</div>
                      <div className="text-muted-foreground">{s.passed} pass · {s.failed} fail</div>
                    </div>
                  );
                })}
              </div>
            )}

            {run.failures && run.failures.length > 0 && (
              <div className="border-t pt-3 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Failure details ({run.failures.length})
                </div>
                <ul className="space-y-1.5 text-xs">
                  {failuresToShow.map((f, i) => (
                    <li key={i} className="rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1.5">
                      <span className="font-mono uppercase text-[10px] text-amber-700 mr-2">{f.tier} · {f.matrix}</span>
                      <span className="font-medium">{f.key}</span>
                      <div className="text-muted-foreground mt-0.5">{f.message}</div>
                    </li>
                  ))}
                </ul>
                {run.failures.length > 5 && (
                  <Button size="sm" variant="ghost" onClick={() => setShowAll(!showAll)}>
                    {showAll ? 'Show fewer' : `Show all ${run.failures.length}`}
                  </Button>
                )}
              </div>
            )}

            {run.error_message && (
              <div className="rounded border border-red-500/30 bg-red-500/5 px-2 py-1.5 text-xs">
                <strong className="text-red-600">Run error:</strong> {run.error_message}
              </div>
            )}

            <div className="text-xs text-muted-foreground flex items-center gap-4 border-t pt-2">
              <span>Triggered by: <strong>{run.triggered_by}</strong></span>
              <span>Started: {new Date(run.started_at).toLocaleString()}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
