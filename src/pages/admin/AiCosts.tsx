import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  getAiCallsInRange,
  listEndpoints,
  summarizeAiCalls,
  summarizeByEndpoint,
  type AiCallRow,
  type EndpointStat,
} from '@/lib/ai-cost-log';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';

/**
 * /admin/ai-costs — Genesis P1 admin read-only view of `ai_calls`.
 *
 * Aggregates per-endpoint cost / latency / error rate from the read-helper
 * in `src/lib/ai-cost-log.ts`. Filters: time range + task (endpoint).
 *
 * Admin-only — gated upstream by `<ProtectedRoute requireAdmin>` in App.tsx.
 */

const RANGES: { value: number; label: string }[] = [
  { value: 1, label: 'Last 1h' },
  { value: 6, label: 'Last 6h' },
  { value: 24, label: 'Last 24h' },
  { value: 168, label: 'Last 7 days' },
  { value: 720, label: 'Last 30 days' },
];

function fmtUsd(n: number): string {
  if (n === 0) return '$0';
  if (n < 0.01) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(2)}`;
}

export default function AiCosts() {
  const [hours, setHours] = useState<number>(24);
  const [task, setTask] = useState<string>('all');
  const [rows, setRows] = useState<AiCallRow[] | null>(null);
  const [endpoints, setEndpoints] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError(null);
    (async () => {
      try {
        const [eps, data] = await Promise.all([
          listEndpoints(hours),
          getAiCallsInRange({ hours, task: task === 'all' ? null : task }),
        ]);
        if (!alive) return;
        setEndpoints(eps);
        setRows(data);
      } catch (e) {
        logger.error('ai-costs load failed', e);
        if (alive) {
          setError(e instanceof Error ? e.message : 'failed to load');
          setRows([]);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [hours, task]);

  const summary = useMemo(
    () => (rows ? summarizeAiCalls(rows) : null),
    [rows],
  );
  const byEndpoint = useMemo<EndpointStat[]>(
    () => (rows ? summarizeByEndpoint(rows) : []),
    [rows],
  );

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
      <Helmet>
        <title>AI Costs · Admin · AIWMC Quantis</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Costs</h1>
          <p className="text-muted-foreground text-sm">
            Per-endpoint cost · latency · error rate from{' '}
            <code>public.ai_calls</code>. Genesis P1.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={String(r.value)}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={task} onValueChange={setTask}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All endpoints</SelectItem>
              {endpoints.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setHours((h) => h)}>
            Refresh
          </Button>
        </div>
      </header>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">
            Failed to load: {error}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total calls" value={summary ? String(summary.total_calls) : null} />
        <Stat label="Total cost" value={summary ? fmtUsd(summary.total_cost_usd) : null} />
        <Stat label="Input tokens" value={summary ? summary.total_input_tokens.toLocaleString('en-US') : null} />
        <Stat label="Output tokens" value={summary ? summary.total_output_tokens.toLocaleString('en-US') : null} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By endpoint</CardTitle>
          <CardDescription>
            Sorted by total cost; p95 latency from observed `ai_calls.latency_ms`.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows === null ? (
            <Skeleton className="h-40 w-full" />
          ) : byEndpoint.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No AI calls in this window.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead className="text-right">Cost (USD)</TableHead>
                  <TableHead className="text-right">In tok</TableHead>
                  <TableHead className="text-right">Out tok</TableHead>
                  <TableHead className="text-right">Avg ms</TableHead>
                  <TableHead className="text-right">p95 ms</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byEndpoint.map((s) => {
                  const errRate = s.calls > 0 ? s.error_calls / s.calls : 0;
                  return (
                    <TableRow key={s.task}>
                      <TableCell className="font-mono text-xs">{s.task}</TableCell>
                      <TableCell className="text-right">{s.calls.toLocaleString('en-US')}</TableCell>
                      <TableCell className="text-right">
                        {s.error_calls === 0 ? (
                          <span className="text-muted-foreground">0</span>
                        ) : (
                          <Badge variant={errRate > 0.05 ? 'destructive' : 'secondary'}>
                            {s.error_calls} ({(errRate * 100).toFixed(1)}%)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">{fmtUsd(s.cost_usd)}</TableCell>
                      <TableCell className="text-right font-mono">{s.input_tokens.toLocaleString('en-US')}</TableCell>
                      <TableCell className="text-right font-mono">{s.output_tokens.toLocaleString('en-US')}</TableCell>
                      <TableCell className="text-right font-mono">{s.avg_latency_ms}</TableCell>
                      <TableCell className="text-right font-mono">{s.p95_latency_ms}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold mt-1 font-mono">
          {value ?? <Skeleton className="h-7 w-20" />}
        </div>
      </CardContent>
    </Card>
  );
}
