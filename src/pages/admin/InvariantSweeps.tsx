/**
 * GTM-audit item #18 (2026-08-27, Q19): "Is there a live dashboard tracking
 * financial-invariant violations across all analyses right now, or only ad
 * hoc?" scripts/sweep-financial-invariants.ts runs daily via
 * .github/workflows/financial-invariants-sweep.yml, but its results only
 * ever landed in a GitHub Actions log. This page reads
 * financial_invariant_sweep_runs (written by the sweep script itself) so
 * an admin can see run history at a glance without opening CI.
 *
 * Revised 2026-08-29 (Phase 5 re-validation, charter 5.4): the original
 * version showed only aggregate counts with no breakdown by which
 * invariant was violated and no way to see which specific analyses were
 * flagged in a given run. This revision adds both: an expandable row per
 * run shows the category breakdown (violation_categories, added in
 * migration 20260829040000) and the raw violation_ids list, plus status/
 * engine-version/duration columns from the same migration.
 */
import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, RefreshCw, Scale, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SweepRun {
  id: number;
  run_at: string;
  finished_at: string | null;
  mode: "report-only" | "apply";
  status: "completed" | "failed" | "interrupted";
  engine_version: string | null;
  scanned_count: number;
  violation_count: number;
  malformed_count: number;
  applied_count: number;
  violation_ids: string[];
  violation_categories: Record<string, number>;
  failure_summary: string | null;
}

function StatusBadge({ status, violationCount }: { status: SweepRun["status"]; violationCount: number }) {
  if (status === "interrupted") {
    return (
      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
        <AlertTriangle className="h-3 w-3 mr-1" /> interrupted
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">
        failed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={violationCount > 0 ? "text-xs bg-red-500/10 text-red-600 border-red-500/20" : "text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20"}>
      {violationCount > 0 ? `${violationCount} violation(s)` : "clean"}
    </Badge>
  );
}

function formatDuration(runAt: string, finishedAt: string | null): string {
  if (!finishedAt) return "—";
  const ms = new Date(finishedAt).getTime() - new Date(runAt).getTime();
  if (ms < 0 || Number.isNaN(ms)) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export default function InvariantSweeps() {
  const [runs, setRuns] = useState<SweepRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // financial_invariant_sweep_runs is created by migration
        // 20260827100000 and expanded by 20260829040000, both applied via
        // the normal deploy pipeline (not out-of-band) so they land in the
        // migration ledger correctly -- the table isn't in the generated
        // Database type yet as a result. Cast narrowly here rather than
        // force an early types regeneration; replace with a typed
        // `.from()` call next time types.ts is regenerated.
        const { data, error } = await (supabase as any)
          .from("financial_invariant_sweep_runs")
          .select("*")
          .order("run_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        setRuns((data ?? []) as SweepRun[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sweep history");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const latest = runs[0];
  const currentlyClean = latest ? latest.status === "completed" && latest.violation_count === 0 : null;

  return (
    <>
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Scale className="h-8 w-8 text-primary" />
              Financial Invariant Sweeps
            </h1>
            <p className="text-muted-foreground mt-1">
              Recurring check that operating profit never exceeds gross profit, and gross profit never exceeds revenue, across every analysis.
            </p>
          </div>
          {currentlyClean !== null && latest && (
            <Badge
              variant="outline"
              className={
                currentlyClean
                  ? "text-sm py-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "text-sm py-1 bg-red-500/10 text-red-600 border-red-500/20"
              }
            >
              {currentlyClean ? (
                <>
                  <ShieldCheck className="h-4 w-4 mr-1" /> Clean as of last run
                </>
              ) : latest.status === "interrupted" ? (
                <>
                  <AlertTriangle className="h-4 w-4 mr-1" /> Last run was interrupted
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 mr-1" /> {latest.violation_count} violation(s) as of last run
                </>
              )}
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" /> Loading sweep history...
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">{error}</CardContent>
          </Card>
        ) : runs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No sweep runs recorded yet. The scheduled workflow runs daily at 09:00 UTC, or trigger it manually via workflow_dispatch.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardDescription>Last {runs.length} run(s), most recent first — click a row for the category breakdown and flagged analysis IDs</CardDescription>
              <CardTitle className="text-lg">Sweep History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 px-4 font-medium w-6"></th>
                      <th className="py-2 px-4 font-medium">Run at (UTC)</th>
                      <th className="py-2 px-4 font-medium">Duration</th>
                      <th className="py-2 px-4 font-medium">Mode</th>
                      <th className="py-2 px-4 font-medium">Status</th>
                      <th className="py-2 px-4 font-medium">Engine</th>
                      <th className="py-2 px-4 font-medium text-right">Scanned</th>
                      <th className="py-2 px-4 font-medium text-right">Flagged</th>
                      <th className="py-2 px-4 font-medium text-right">Malformed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => {
                      const isExpanded = expandedId === run.id;
                      const hasDetail = run.violation_ids?.length > 0 || run.failure_summary;
                      return (
                        <React.Fragment key={run.id}>
                          <tr
                            className={`border-b last:border-0 ${hasDetail ? "cursor-pointer hover:bg-muted/40" : ""}`}
                            onClick={() => hasDetail && setExpandedId(isExpanded ? null : run.id)}
                          >
                            <td className="py-2 px-4 text-muted-foreground">
                              {hasDetail ? (isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : null}
                            </td>
                            <td className="py-2 px-4 font-mono text-xs">
                              {new Date(run.run_at).toISOString().replace("T", " ").slice(0, 19)}
                            </td>
                            <td className="py-2 px-4 font-mono text-xs text-muted-foreground">
                              {formatDuration(run.run_at, run.finished_at)}
                            </td>
                            <td className="py-2 px-4">
                              <Badge variant="outline" className="text-xs">{run.mode}</Badge>
                            </td>
                            <td className="py-2 px-4">
                              <StatusBadge status={run.status} violationCount={run.violation_count} />
                            </td>
                            <td className="py-2 px-4 font-mono text-xs text-muted-foreground">{run.engine_version ?? "—"}</td>
                            <td className="py-2 px-4 text-right font-mono">{run.scanned_count}</td>
                            <td className="py-2 px-4 text-right font-mono">
                              <span className={run.violation_count > 0 ? "text-red-600 font-semibold" : ""}>
                                {run.violation_count}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-right font-mono text-muted-foreground">{run.malformed_count}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="border-b last:border-0 bg-muted/20">
                              <td></td>
                              <td colSpan={8} className="py-3 px-4 text-xs space-y-2">
                                {run.failure_summary && (
                                  <div className="text-amber-700 dark:text-amber-400">
                                    <span className="font-medium">Failure summary:</span> {run.failure_summary}
                                  </div>
                                )}
                                {run.violation_categories && Object.keys(run.violation_categories).length > 0 && (
                                  <div>
                                    <span className="font-medium text-muted-foreground">Category breakdown:</span>{" "}
                                    {Object.entries(run.violation_categories).map(([code, count]) => (
                                      <Badge key={code} variant="outline" className="text-xs mr-1 font-mono">
                                        {code}: {count}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                {run.violation_ids?.length > 0 && (
                                  <div>
                                    <span className="font-medium text-muted-foreground">Flagged analysis IDs:</span>
                                    <div className="font-mono text-muted-foreground mt-1 space-y-0.5">
                                      {run.violation_ids.map((id) => (
                                        <div key={id}>{id}</div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
