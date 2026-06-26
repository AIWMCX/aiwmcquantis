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
  TrendingUp, Gauge, Shield,
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
    // QOC-ECON v1.0 §4.3 — dedupe savings: every short-circuit at "dedupe"
    // would have otherwise cost the average non-dedupe PASS spend.
    const dedupeHits = data.filter(r => {
      const sc = r.short_circuit as { at?: string; stage?: string } | null;
      return sc?.at === "dedupe" || sc?.stage === "dedupe";
    }).length;
    const paidRuns = data.filter(r => !r.short_circuit && Number(r.total_cost_usd || 0) > 0);
    const avgPaidCost = paidRuns.length
      ? paidRuns.reduce((s, r) => s + Number(r.total_cost_usd || 0), 0) / paidRuns.length
      : 0;
    const dedupeSavings = dedupeHits * avgPaidCost;
    const dedupeRate = total ? (dedupeHits / total) * 100 : 0;

    // Breakdown: short-circuits by verdict and stage, with estimated savings
    const shortCircuits = data.filter(r => r.short_circuit != null);
    const scByStage: Record<string, { count: number; savedUsd: number }> = {};
    const scByVerdict: Record<string, { count: number; savedUsd: number }> = {};
    for (const r of shortCircuits) {
      const sc = r.short_circuit as { at?: string; stage?: string; reason?: string } | null;
      const stage = sc?.at ?? sc?.stage ?? "unknown";
      const verdict = r.overall_verdict;
      if (!scByStage[stage]) scByStage[stage] = { count: 0, savedUsd: 0 };
      scByStage[stage].count++;
      scByStage[stage].savedUsd += avgPaidCost;
      if (!scByVerdict[verdict]) scByVerdict[verdict] = { count: 0, savedUsd: 0 };
      scByVerdict[verdict].count++;
      scByVerdict[verdict].savedUsd += avgPaidCost;
    }

    // Optimization intelligence: extract signals from stage trace details.
    const fullRuns = data.filter(r => !r.short_circuit && Array.isArray(r.traces));
    let escalatedCount = 0;
    let softThrottledCount = 0;
    let singleModelCount = 0;
    let dualModelCount = 0;
    for (const r of fullRuns) {
      for (const t of r.traces as Trace[]) {
        if (t.stage === "narrate") {
          if ((t as any).detail?.confidence_gated || (t as Record<string, unknown>)["confidence_gated"]) escalatedCount++;
          if ((t as any).detail?.soft_throttled || (t as Record<string, unknown>)["soft_throttled"]) softThrottledCount++;
        }
        if (t.stage === "verify") {
          const sm = (t as any).detail?.single_model ?? (t as Record<string, unknown>)["single_model"];
          if (sm === true) singleModelCount++;
          else if (sm === false) dualModelCount++;
        }
      }
    }
    const escalationRate = fullRuns.length ? (escalatedCount / fullRuns.length) * 100 : 0;
    const softThrottleRate = fullRuns.length ? (softThrottledCount / fullRuns.length) * 100 : 0;
    const singleModelRate = (singleModelCount + dualModelCount)
      ? (singleModelCount / (singleModelCount + dualModelCount)) * 100
      : 0;

    return {
      total, pass, blocked, cost, p50, p95, passRate,
      dedupeHits, dedupeSavings, dedupeRate,
      shortCircuitTotal: shortCircuits.length,
      scByStage, scByVerdict, avgPaidCost,
      fullRunCount: fullRuns.length,
      escalatedCount, escalationRate,
      softThrottledCount, softThrottleRate,
      singleModelCount, dualModelCount, singleModelRate,
    };
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Requests" value={rows == null ? null : kpi.total.toString()} />
          <KpiCard label="Pass rate" value={rows == null ? null : `${kpi.passRate.toFixed(1)}%`}
                   tone={kpi.passRate >= 95 ? "good" : kpi.passRate >= 80 ? "warn" : "bad"} />
          <KpiCard label="Blocked" value={rows == null ? null : kpi.blocked.toString()}
                   tone={kpi.blocked === 0 ? "good" : "warn"} />
          <KpiCard label="P50 / P95 latency"
                   value={rows == null ? null : `${fmtMs(kpi.p50)} / ${fmtMs(kpi.p95)}`}
                   icon={Clock} />
          <KpiCard label="Spend (window)" value={rows == null ? null : fmtUsd(kpi.cost)} icon={DollarSign} />
          <KpiCard
            label={`Dedupe saved (${kpi.dedupeRate.toFixed(1)}%)`}
            value={rows == null ? null : fmtUsd(kpi.dedupeSavings)}
            tone={kpi.dedupeHits > 0 ? "good" : undefined}
            icon={DollarSign}
          />
        </div>

        {/* Optimization intelligence */}
        {rows != null && kpi.fullRunCount > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Optimization intelligence
                <Badge variant="outline" className="font-mono text-xs">
                  {kpi.fullRunCount} full runs
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-md border p-3 bg-muted/20">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Confidence-gated escalation
                  </div>
                  <div className="text-xl font-semibold tabular-nums">
                    {kpi.escalatedCount} <span className="text-sm font-normal text-muted-foreground">({kpi.escalationRate.toFixed(1)}%)</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Free-tier requests upgraded from deepseek → haiku due to weak input confidence.
                  </p>
                </div>
                <div className="rounded-md border p-3 bg-muted/20">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Gauge className="w-3.5 h-3.5" />
                    Soft throttle
                  </div>
                  <div className="text-xl font-semibold tabular-nums">
                    {kpi.softThrottledCount} <span className="text-sm font-normal text-muted-foreground">({kpi.softThrottleRate.toFixed(1)}%)</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Narration tier downshifted under moderate load (3-4 req/min) — graceful degradation vs hard block.
                  </p>
                </div>
                <div className="rounded-md border p-3 bg-muted/20">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Shield className="w-3.5 h-3.5" />
                    Conditional verify depth
                  </div>
                  <div className="text-xl font-semibold tabular-nums">
                    {kpi.singleModelRate.toFixed(1)}% <span className="text-sm font-normal text-muted-foreground">single-model</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpi.singleModelCount} single / {kpi.dualModelCount} dual — high-confidence requests skip dual-model consensus (~50% verify cost savings).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dedupe / short-circuit breakdown */}
        {rows != null && kpi.shortCircuitTotal > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Short-circuit breakdown
                <Badge variant="outline" className="font-mono text-xs">
                  {kpi.shortCircuitTotal} requests · est. {fmtUsd(kpi.shortCircuitTotal * kpi.avgPaidCost)} saved
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* By stage */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">By stage</h4>
                  <div className="space-y-1.5">
                    {Object.entries(kpi.scByStage)
                      .sort(([, a], [, b]) => b.count - a.count)
                      .map(([stage, { count, savedUsd }]) => (
                        <div key={stage} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{stage}</span>
                            <span className="text-muted-foreground">{count} req</span>
                          </div>
                          <span className="text-emerald-600 tabular-nums text-xs">{fmtUsd(savedUsd)} saved</span>
                        </div>
                      ))}
                  </div>
                </div>
                {/* By verdict */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">By verdict</h4>
                  <div className="space-y-1.5">
                    {Object.entries(kpi.scByVerdict)
                      .sort(([, a], [, b]) => b.count - a.count)
                      .map(([verdict, { count, savedUsd }]) => (
                        <div key={verdict} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <VerdictBadge v={verdict as Verdict} />
                            <span className="text-muted-foreground">{count} req</span>
                          </div>
                          <span className="text-emerald-600 tabular-nums text-xs">{fmtUsd(savedUsd)} saved</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                        {/* Optimization signal badges */}
                        {(t as any).detail && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {(t as any).detail.confidence_gated && (
                              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">escalated</Badge>
                            )}
                            {(t as any).detail.soft_throttled && (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">soft-throttled</Badge>
                            )}
                            {(t as any).detail.single_model === true && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">single-model</Badge>
                            )}
                            {(t as any).detail.single_model === false && (
                              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/30">dual-model</Badge>
                            )}
                            {(t as any).detail.tier && (
                              <Badge variant="outline" className="text-[10px]">{(t as any).detail.tier}</Badge>
                            )}
                            {(t as any).detail.force_model && (
                              <Badge variant="outline" className="text-[10px]">forced: {(t as any).detail.force_model}</Badge>
                            )}
                          </div>
                        )}
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

              {/* Unverified claims warning */}
              {((selected as any).report)?.verification?.unverified_count > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h3 className="font-semibold text-amber-700">
                      {((selected as any).report).verification.unverified_count} unverified claim{((selected as any).report).verification.unverified_count !== 1 ? "s" : ""}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {(((selected as any).report).verification.claims ?? [])
                      .filter((c: any) => c.verdict !== "PASS")
                      .map((c: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{c.text}</span>
                          <Badge variant="outline" className={
                            c.verdict === "FAIL"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          }>{c.verdict}</Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}

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
