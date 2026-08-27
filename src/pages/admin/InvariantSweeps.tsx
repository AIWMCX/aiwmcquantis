/**
 * GTM-audit item #18 (2026-08-27, Q19): "Is there a live dashboard tracking
 * financial-invariant violations across all analyses right now, or only ad
 * hoc?" scripts/sweep-financial-invariants.ts runs daily via
 * .github/workflows/financial-invariants-sweep.yml, but its results only
 * ever landed in a GitHub Actions log. This page reads
 * financial_invariant_sweep_runs (written by the sweep script itself) so
 * an admin can see run history at a glance without opening CI.
 */
import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, RefreshCw, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SweepRun {
  id: number;
  run_at: string;
  mode: "report-only" | "apply";
  scanned_count: number;
  violation_count: number;
  malformed_count: number;
  applied_count: number;
  violation_ids: string[];
}

export default function InvariantSweeps() {
  const [runs, setRuns] = useState<SweepRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // financial_invariant_sweep_runs is created by migration
        // 20260827100000, applied via the normal deploy pipeline (not
        // out-of-band) so it lands in the migration ledger correctly --
        // it isn't in the generated Database type yet as a result. Cast
        // narrowly here rather than force an early types regeneration;
        // replace with a typed `.from()` call next time types.ts is
        // regenerated.
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
  const currentlyClean = latest ? latest.violation_count === 0 : null;

  return (
    <AppLayout>
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
          {currentlyClean !== null && (
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
              <CardDescription>Last {runs.length} run(s), most recent first</CardDescription>
              <CardTitle className="text-lg">Sweep History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 px-4 font-medium">Run at (UTC)</th>
                      <th className="py-2 px-4 font-medium">Mode</th>
                      <th className="py-2 px-4 font-medium text-right">Scanned</th>
                      <th className="py-2 px-4 font-medium text-right">Violations</th>
                      <th className="py-2 px-4 font-medium text-right">Flagged</th>
                      <th className="py-2 px-4 font-medium text-right">Malformed (skipped)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr key={run.id} className="border-b last:border-0">
                        <td className="py-2 px-4 font-mono text-xs">
                          {new Date(run.run_at).toISOString().replace("T", " ").slice(0, 19)}
                        </td>
                        <td className="py-2 px-4">
                          <Badge variant="outline" className="text-xs">{run.mode}</Badge>
                        </td>
                        <td className="py-2 px-4 text-right font-mono">{run.scanned_count}</td>
                        <td className="py-2 px-4 text-right font-mono">
                          <span className={run.violation_count > 0 ? "text-red-600 font-semibold" : ""}>
                            {run.violation_count}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-right font-mono">{run.applied_count}</td>
                        <td className="py-2 px-4 text-right font-mono text-muted-foreground">{run.malformed_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
