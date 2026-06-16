/**
 * /admin/edge-health — runs ?health=1 against every Edge Function and
 * shows version, deployed_at, commit_sha with status filtering.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Search } from 'lucide-react';

type Status = 'ok' | 'unreachable' | 'missing_version' | 'error';

interface Probe {
  function: string;
  status: Status;
  http_status: number | null;
  version: string | null;
  deployed_at: string | null;
  commit_sha: string | null;
  latency_ms: number | null;
  error: string | null;
}

interface SweepResponse {
  ok: boolean;
  scanned_at: string;
  total: number;
  counts: Record<Status, number>;
  results: Probe[];
}

const STATUS_META: Record<Status, { label: string; icon: typeof CheckCircle2; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  ok: { label: 'OK', icon: CheckCircle2, variant: 'default' },
  missing_version: { label: 'No version', icon: AlertTriangle, variant: 'secondary' },
  unreachable: { label: 'Unreachable', icon: XCircle, variant: 'destructive' },
  error: { label: 'Error', icon: XCircle, variant: 'destructive' },
};

export default function EdgeHealth() {
  const [data, setData] = useState<SweepResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [query, setQuery] = useState('');

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke('admin-health-sweep', { body: {} });
      if (err) throw err;
      setData(res as SweepResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sweep failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { run(); }, [run]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.results.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (q && !r.function.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, statusFilter, query]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Edge Function Health</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live <code className="px-1 py-0.5 rounded bg-muted text-xs">?health=1</code> probe across every deployed function.
              Source of truth for "is the latest code actually deployed?".
            </p>
          </div>
          <Button onClick={run} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Probing…' : 'Re-run sweep'}
          </Button>
        </div>

        {data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card><CardContent className="p-4"><div className="text-2xl font-bold">{data.total}</div><div className="text-xs text-muted-foreground">Total</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-2xl font-bold text-green-600">{data.counts.ok ?? 0}</div><div className="text-xs text-muted-foreground">OK</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-2xl font-bold text-amber-600">{data.counts.missing_version ?? 0}</div><div className="text-xs text-muted-foreground">No version</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-2xl font-bold text-red-600">{data.counts.unreachable ?? 0}</div><div className="text-xs text-muted-foreground">Unreachable</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-2xl font-bold text-red-600">{data.counts.error ?? 0}</div><div className="text-xs text-muted-foreground">Error</div></CardContent></Card>
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-lg">Functions</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="filter by name…"
                  className="pl-8 w-56"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | Status)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="ok">OK only</SelectItem>
                  <SelectItem value="missing_version">No version</SelectItem>
                  <SelectItem value="unreachable">Unreachable</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {error && <div className="text-sm text-destructive mb-3">{error}</div>}
            {!data && loading && <div className="text-sm text-muted-foreground">Running first sweep…</div>}
            {data && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-3 font-medium">Function</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Version</th>
                      <th className="py-2 pr-3 font-medium">Deployed at</th>
                      <th className="py-2 pr-3 font-medium">Commit</th>
                      <th className="py-2 pr-3 font-medium">Latency</th>
                      <th className="py-2 pr-3 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const meta = STATUS_META[r.status];
                      const Icon = meta.icon;
                      return (
                        <tr key={r.function} className="border-b hover:bg-muted/40">
                          <td className="py-2 pr-3 font-mono text-xs">{r.function}</td>
                          <td className="py-2 pr-3">
                            <Badge variant={meta.variant} className="gap-1">
                              <Icon className="h-3 w-3" /> {meta.label}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3 font-mono text-xs">{r.version ?? '—'}</td>
                          <td className="py-2 pr-3 text-xs text-muted-foreground">{r.deployed_at ? new Date(r.deployed_at).toLocaleString() : '—'}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{r.commit_sha ? r.commit_sha.slice(0, 7) : '—'}</td>
                          <td className="py-2 pr-3 text-xs">{r.latency_ms != null ? `${r.latency_ms}ms` : '—'}</td>
                          <td className="py-2 pr-3 text-xs text-destructive truncate max-w-xs" title={r.error ?? ''}>{r.error ?? ''}</td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} className="py-6 text-center text-muted-foreground text-sm">No functions match the current filter.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {data && (
              <p className="text-xs text-muted-foreground mt-4">
                Scanned at {new Date(data.scanned_at).toLocaleString()} · {filtered.length} of {data.total} shown
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
