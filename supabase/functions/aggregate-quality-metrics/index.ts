import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';

Deno.serve(async (req) => {
  const reqId = getRequestId(req);
  const log = createLogger('aggregate-quality-metrics', reqId);

  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Authenticate via cron secret
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  try {
    // Target: yesterday
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const metricDate = yesterday.toISOString().slice(0, 10);
    const dayStart = `${metricDate}T00:00:00Z`;
    const dayEnd = `${metricDate}T23:59:59.999Z`;

    // 1. Fetch analysis_complete events for latency + confidence
    const { data: completeLogs } = await sb
      .from("analysis_logs")
      .select("payload")
      .eq("event_type", "analysis_complete")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    const completeArr = completeLogs || [];
    const totalAnalyses = completeArr.length;

    // Extract latencies and confidences
    const latencies: number[] = [];
    const confidences: number[] = [];
    let reconciledCount = 0;

    for (const log of completeArr) {
      const p = log.payload as any;
      if (typeof p?.durationMs === "number") latencies.push(p.durationMs);
      if (typeof p?.confidence === "number") confidences.push(p.confidence);
      if (p?.reconciled === true) reconciledCount++;
    }

    latencies.sort((a, b) => a - b);
    const percentile = (arr: number[], p: number) =>
      arr.length === 0 ? null : arr[Math.min(Math.floor(arr.length * p), arr.length - 1)];

    const p50 = percentile(latencies, 0.5);
    const p95 = percentile(latencies, 0.95);
    const p99 = percentile(latencies, 0.99);

    const avgConfidence =
      confidences.length > 0
        ? confidences.reduce((s, v) => s + v, 0) / confidences.length
        : null;

    const reconciliationRate =
      totalAnalyses > 0 ? (reconciledCount / totalAnalyses) * 100 : null;

    // 2. AI consensus scores
    const { data: consensusLogs } = await sb
      .from("analysis_logs")
      .select("payload")
      .eq("event_type", "ai_consensus")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    const consensusScores = (consensusLogs || [])
      .map((l: any) => l.payload?.consensusScore)
      .filter((v: any) => typeof v === "number") as number[];

    const avgConsensus =
      consensusScores.length > 0
        ? consensusScores.reduce((s, v) => s + v, 0) / consensusScores.length
        : null;

    // 3. Error breakdown
    const { data: errorLogs } = await sb
      .from("analysis_logs")
      .select("payload")
      .eq("event_type", "engine_error")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    const errorMap: Record<string, number> = {};
    for (const log of errorLogs || []) {
      const code = (log.payload as any)?.code || "UNKNOWN";
      errorMap[code] = (errorMap[code] || 0) + 1;
    }

    // Also count performance warnings
    const { data: perfLogs } = await sb
      .from("analysis_logs")
      .select("payload")
      .eq("event_type", "performance_warning")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    for (const log of perfLogs || []) {
      const code = (log.payload as any)?.code || "QE-PERF-001";
      errorMap[code] = (errorMap[code] || 0) + 1;
    }

    // 4. Benchmark coverage (% of benchmark_used events vs total analyses)
    const { count: benchmarkCount } = await sb
      .from("analysis_logs")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "benchmark_used")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    const benchmarkCoverage =
      totalAnalyses > 0 && benchmarkCount != null
        ? Math.min(100, (benchmarkCount / totalAnalyses) * 100)
        : null;

    // 5. Inconsistency rate from reconciliation_log
    const { data: reconLogs } = await sb
      .from("reconciliation_log")
      .select("reconciled")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    const reconArr = reconLogs || [];
    const inconsistencyRate =
      reconArr.length > 0
        ? (reconArr.filter((r: any) => !r.reconciled).length / reconArr.length) * 100
        : null;

    // 6. Upsert into quality_metrics_daily
    const { error: upsertError } = await sb.from("quality_metrics_daily").upsert(
      {
        metric_date: metricDate,
        reconciliation_rate: reconciliationRate,
        avg_confidence_score: avgConfidence,
        inconsistency_rate: inconsistencyRate,
        avg_consensus_score: avgConsensus,
        benchmark_coverage_rate: benchmarkCoverage,
        error_rate_by_code: errorMap,
        p50_latency_ms: p50,
        p95_latency_ms: p95,
        p99_latency_ms: p99,
        total_analyses: totalAnalyses,
      },
      { onConflict: "metric_date" }
    );

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({
        success: true,
        metric_date: metricDate,
        total_analyses: totalAnalyses,
        reconciliation_rate: reconciliationRate,
        avg_confidence: avgConfidence,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    log.error("aggregate-quality-metrics error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
