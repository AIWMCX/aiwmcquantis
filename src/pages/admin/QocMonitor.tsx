import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Activity, RefreshCw, Clock, DollarSign,
  CheckCircle2, AlertTriangle, XCircle, ShieldX, MinusCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types — mirror the qoc_audit row (see supabase/functions/qoc-orchestrate)
// ---------------------------------------------------------------------------
type Verdict = "PASS" | "PARTIAL" | "FAIL" | "HARD_BLOCK" | "SKIPPED";

type Trace = {
  stage?: string;
  verdict?: string;
  duration_ms?: number;
  cost_usd?: number;
  notes?: string;
  [k: string]: unknown;
};

type QocRow = {
  id: string;
  request_id: string;
  report_id: string;
  fingerprint: string | null;
  user_id: string;
  overall_verdict: Verdict;
  total_cost_usd: number;
  total_duration_ms: number;
  traces: Trace[] | null;
  short_circuit: Record<string, unknown> | null;
  created_at: string;
};

const VERDICT_META: Record<Verdict, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  PASS:       { label: "Pass",       icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  PARTIAL:    { label: "Partial",    icon: AlertTriangle, cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  FAIL:       { label: "Fail",       icon: XCircle,      cls: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
  HARD_BLOCK: { label: "Hard Block", icon: ShieldX,      cls: "bg-red-600/15 text-red-700 border-red-600/30" },
  SKIPPED:    { label: "Skipped",    icon: MinusCircle,  cls: "bg-slate-500/15 text-slate-500 border-slate-500/30" },
};

const fmtUsd = (n: number) =>
  n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
const fmtMs = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(2)} s` : `${n} ms`;
const fmtAgo = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return `${Math.round(d)}s ago`;
  if (d < 3600) return `${Math.round(d / 60)}m ago`;
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  return `${Math.round(d / 86400)}d ago`;
};

function VerdictBadge({ v }: { v: Verdict }) {
  const m = VERDICT_META[v] ?? VERDICT_META.SKIPPED;
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${m.cls}`}>
      <Icon className="w-3 h-3" />
      {m.label}
    </Badge>
  );
}

export default function QocMonitor() {
  const [rows, setRows] = useState<QocRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [windowHrs, setWindowHrs] = useState<24 | 168 | 720>(24);
  const [verdictFilter, setVerdictFilter] = useState<"ALL" | Verdict>("ALL");
  const [selected, setSelected] = useState<QocRow | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const since = new Date(Date.now() - windowHrs * 3600_000).toISOString();
    const { data, error } = await supabase
      .from("qoc_audit")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) setError(error.message);
    setRows((data ?? []) as unknown as QocRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [windowHrs]);

  const filtered = useMemo(
    () => (rows ?? []).filter(r => verdictFilter === "ALL" || r.overall_verdict === verdictFilter),
    [rows, verdictFilter],
  );

  const kpi = useMemo(() => {
    const data = rows ?? [];
    const total = data.length;
    const pass = data.filter(r => r.overall_verdict === "PASS").length;
    const blocked = data.filter(r => ["FAIL", "HARD_BLOCK"].includes(r.overall_verdict)).length;
    const cost = data.reduce((s, r) => s + Number(r.total_cost_usd || 0), 0);
    const durs = data.map(r => r.total_duration_ms || 0).sort((a, b) => a - b);
    const p50 = durs[Math.floor(durs.length * 0.5)] ?? 0;
    const p95 = durs[Math.floor(durs.length * 0.95)] ?? 0;
    const passRate = total ? (pass / total) * 100 : 0;
    return { total, pass, blocked, cost, p50, p95, passRate };
  }, [rows]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageSEO
        title="QOC Monitor | AIWMC Quantis Admin"
        description="Quantis Orchestration Core — live audit, verdicts, cost and latency telemetry."
        canonical="/admin/qoc"
        noindex
      />
      <Header darkMode={false} onToggleTheme={() => {}} />

      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Quantis Orchestration Core</h1>
              <p className="text-sm text-muted-foreground">
                Per-request audit envelope · verdicts, stage traces, cost &amp; latency.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin"><ArrowLeft className="w-4 h-4 mr-1.5" />Admin</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Requests" value={rows == null ? null : kpi.total.toString()} />
          <KpiCard label="Pass rate" value={rows == null ? null : `${kpi.passRate.toFixed(1)}%`}
                   tone={kpi.passRate >= 95 ? "good" : kpi.passRate >= 80 ? "warn" : "bad"} />
          <KpiCard label="Blocked" value={rows == null ? null : kpi.blocked.toString()}
                   tone={kpi.blocked === 0 ? "good" : "warn"} />
          <KpiCard label="P50 / P95 latency"
                   value={rows == null ? null : `${fmtMs(kpi.p50)} / ${fmtMs(kpi.p95)}`}
                   icon={Clock} />
          <KpiCard label="Spend (window)" value={rows == null ? null : fmtUsd(kpi.cost)} icon={DollarSign} />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6 flex flex-wrap items-center gap-4">
            <Tabs value={String(windowHrs)} onValueChange={v => setWindowHrs(Number(v) as 24 | 168 | 720)}>
              <TabsList>
                <TabsTrigger value="24">24h</TabsTrigger>
                <TabsTrigger value="168">7d</TabsTrigger>
                <TabsTrigger value="720">30d</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={verdictFilter} onValueChange={v => setVerdictFilter(v as "ALL" | Verdict)}>
              <TabsList>
                <TabsTrigger value="ALL">All</TabsTrigger>
                <TabsTrigger value="PASS">Pass</TabsTrigger>
                <TabsTrigger value="PARTIAL">Partial</TabsTrigger>
                <TabsTrigger value="FAIL">Fail</TabsTrigger>
                <TabsTrigger value="HARD_BLOCK">Blocked</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="ml-auto text-xs text-muted-foreground">
              Showing {filtered.length} of {rows?.length ?? 0} rows · max 500
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orchestrated requests</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-sm text-rose-600 mb-3">
                Failed to load QOC audit: {error}
              </div>
            )}
            {rows == null ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No orchestrated requests in this window.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Verdict</TableHead>
                      <TableHead>Request</TableHead>
                      <TableHead>Stages</TableHead>
                      <TableHead className="text-right">Latency</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead>Short-circuit</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(r => {
                      const stages = Array.isArray(r.traces) ? r.traces.length : 0;
                      const sc = r.short_circuit
                        ? (r.short_circuit as { stage?: string; reason?: string })
                        : null;
                      return (
                        <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40"
                                  onClick={() => setSelected(r)}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {fmtAgo(r.created_at)}
                          </TableCell>
                          <TableCell><VerdictBadge v={r.overall_verdict} /></TableCell>
                          <TableCell className="font-mono text-xs">
                            {r.request_id.slice(0, 8)}…
                            {r.fingerprint && (
                              <span className="ml-2 text-muted-foreground">
                                fp {r.fingerprint.slice(0, 6)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{stages}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {fmtMs(r.total_duration_ms)}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {fmtUsd(Number(r.total_cost_usd))}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {sc ? `${sc.stage ?? "?"} — ${sc.reason ?? "n/a"}` : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">Inspect</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          QOC is the governance layer wrapping the deterministic engine: preflight, dedupe, narrate, verify, audit.
          Writes to <code>qoc_audit</code> are service-role only.
        </p>
      </main>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              QOC Request
              {selected && <VerdictBadge v={selected.overall_verdict} />}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Meta label="request_id" value={selected.request_id} mono />
                <Meta label="report_id" value={selected.report_id} mono />
                <Meta label="fingerprint" value={selected.fingerprint ?? "—"} mono />
                <Meta label="user_id" value={selected.user_id} mono />
                <Meta label="duration" value={fmtMs(selected.total_duration_ms)} />
                <Meta label="cost" value={fmtUsd(Number(selected.total_cost_usd))} />
                <Meta label="created_at" value={new Date(selected.created_at).toLocaleString()} />
              </div>

              <div>
                <h3 className="font-semibold mb-2">Stage traces</h3>
                {Array.isArray(selected.traces) && selected.traces.length > 0 ? (
                  <div className="space-y-2">
                    {selected.traces.map((t, i) => (
                      <div key={i} className="rounded-md border p-3 bg-muted/30">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="font-medium">
                            {i + 1}. {t.stage ?? "stage"}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {t.verdict && <Badge variant="outline">{String(t.verdict)}</Badge>}
                            {typeof t.duration_ms === "number" && <span>{fmtMs(t.duration_ms)}</span>}
                            {typeof t.cost_usd === "number" && <span>{fmtUsd(t.cost_usd)}</span>}
                          </div>
                        </div>
                        {t.notes && (
                          <div className="mt-1 text-xs text-muted-foreground">{t.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No stage traces recorded.</div>
                )}
              </div>

              {selected.short_circuit && (
                <div>
                  <h3 className="font-semibold mb-2">Short circuit</h3>
                  <pre className="rounded-md bg-muted/40 p-3 text-xs overflow-x-auto">
                    {JSON.stringify(selected.short_circuit, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

function KpiCard({
  label, value, tone, icon: Icon,
}: {
  label: string;
  value: string | null;
  tone?: "good" | "warn" | "bad";
  icon?: typeof Activity;
}) {
  const toneCls =
    tone === "good" ? "text-emerald-600" :
    tone === "warn" ? "text-amber-600"  :
    tone === "bad"  ? "text-rose-600"   : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {label}
        </div>
        <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneCls}`}>
          {value ?? <Skeleton className="h-7 w-20" />}
        </div>
      </CardContent>
    </Card>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono break-all" : ""}>{value}</div>
    </div>
  );
}
