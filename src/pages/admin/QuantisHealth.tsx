import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { QuantisMath } from '@/lib/quantis-math';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { logger } from '@/lib/logger';
import {
  ArrowLeft, Activity, ShieldCheck, AlertTriangle, CheckCircle2,
  Loader2, RefreshCw, BarChart3, Zap, Download, Search, FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PageSEO } from '@/components/seo/PageSEO';
import { TierQaTile } from '@/components/admin/TierQaTile';

// ── Types ──

interface HealthMetrics {
  avgConfidence24h: number;
  avgConsensus24h: number;
  errorRate24h: number;
  volume24h: number;
  dailyTrend: { date: string; avgConfidence: number; count: number }[];
  errorBreakdown: { code: string; count: number }[];
  // Benchmark-First plan, Step 10: coverage telemetry.
  benchmarkLivePct24h: number;       // % of analyses where benchmark_mode === 'live'
  benchmarkDirectMatchPct24h: number;// avg direct-match share across all records
  invariantsCoveragePct: number;     // share of invariant tests passing (proxied)
  invariantsTotal: number;           // total invariant rules tracked
}

interface SelfTestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

interface QualityMetricRow {
  metric_date: string;
  reconciliation_rate: number | null;
  avg_confidence_score: number | null;
  inconsistency_rate: number | null;
  avg_consensus_score: number | null;
  benchmark_coverage_rate: number | null;
  error_rate_by_code: Record<string, number> | null;
  p50_latency_ms: number | null;
  p95_latency_ms: number | null;
  p99_latency_ms: number | null;
  total_analyses: number | null;
}

interface InconsistencyRow {
  id: string;
  analysis_id: string | null;
  summary: string | null;
  created_at: string;
}

interface AuditLogEntry {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  severity: string;
  created_at: string;
}

// ── Main Component ──

export default function QuantisHealth() {
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selfTestResults, setSelfTestResults] = useState<SelfTestResult[] | null>(null);
  const [testRunning, setTestRunning] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  // Quality tab state
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetricRow[]>([]);
  const [inconsistencies, setInconsistencies] = useState<InconsistencyRow[]>([]);
  const [qualityLoading, setQualityLoading] = useState(false);

  // Audit dialog state
  const [auditAnalysisId, setAuditAnalysisId] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate('/app');
  }, [isAdmin, adminLoading, navigate]);

  // ── Existing health metrics fetch ──

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: recent } = await supabase
        .from('analyses')
        .select('confidence_score, result, created_at')
        .gte('created_at', h24);

      const recentArr = recent || [];
      const confidences = recentArr.map(a => a.confidence_score).filter((c): c is number => c != null);
      const avgConf = confidences.length ? confidences.reduce((s, v) => s + v, 0) / confidences.length : 0;

      let consensusSum = 0;
      let consensusCount = 0;
      let errorCount = 0;
      const errorMap: Record<string, number> = {};

      // Benchmark coverage telemetry (Step 10).
      let liveBenchmarkCount = 0;
      let benchmarkSamples = 0;
      let directShareSum = 0;
      let matchSamples = 0;

      for (const a of recentArr) {
        const r = a.result as any;
        if (r?.cross_validation?.agreement_score != null) {
          consensusSum += r.cross_validation.agreement_score * 100;
          consensusCount++;
        }
        if (r?.validation?.is_blocked) errorCount++;
        if (r?.validation?.warnings) {
          for (const w of r.validation.warnings) {
            const code = w.code || 'UNKNOWN';
            errorMap[code] = (errorMap[code] || 0) + 1;
          }
        }
        const meta = r?.metadata;
        if (meta) {
          benchmarkSamples++;
          if (meta.benchmark_mode === 'live') liveBenchmarkCount++;
          const s = meta.benchmark_match_summary;
          if (s && typeof s.total === 'number' && s.total > 0) {
            directShareSum += (s.direct ?? 0) / s.total;
            matchSamples++;
          }
        }
      }

      const { data: weekData } = await supabase
        .from('analyses')
        .select('confidence_score, created_at')
        .gte('created_at', d7);

      const dayMap: Record<string, { sum: number; count: number }> = {};
      for (const a of weekData || []) {
        const day = (a.created_at || '').slice(0, 10);
        if (!dayMap[day]) dayMap[day] = { sum: 0, count: 0 };
        dayMap[day].count++;
        if (a.confidence_score != null) dayMap[day].sum += a.confidence_score;
      }

      const dailyTrend = Object.entries(dayMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date: date.slice(5),
          avgConfidence: v.count ? Math.round(v.sum / v.count) : 0,
          count: v.count,
        }));

      // Invariants test coverage — sourced from quality_metrics_daily
      // (reconciliation_rate is computed from how many of the ~40 invariant
      // checks passed; we surface today's value alongside the count of
      // tracked rules).
      const { data: latestQuality } = await supabase
        .from('quality_metrics_daily')
        .select('reconciliation_rate')
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      const invariantsCoveragePct = latestQuality?.reconciliation_rate ?? 0;
      // ~40 invariants are codified in benchmark-pipeline-invariants tests
      // plus the engine-side coherence rules. Hard-coded since the test
      // count is a build-time constant.
      const invariantsTotal = 40;

      setMetrics({
        avgConfidence24h: Math.round(avgConf),
        avgConsensus24h: consensusCount ? Math.round(consensusSum / consensusCount) : 0,
        errorRate24h: recentArr.length ? Math.round((errorCount / recentArr.length) * 100) : 0,
        volume24h: recentArr.length,
        dailyTrend,
        errorBreakdown: Object.entries(errorMap)
          .map(([code, count]) => ({ code, count }))
          .sort((a, b) => b.count - a.count),
        benchmarkLivePct24h: benchmarkSamples > 0
          ? Math.round((liveBenchmarkCount / benchmarkSamples) * 100)
          : 0,
        benchmarkDirectMatchPct24h: matchSamples > 0
          ? Math.round((directShareSum / matchSamples) * 100)
          : 0,
        invariantsCoveragePct: Math.round(invariantsCoveragePct),
        invariantsTotal,
      });
    } catch (err) {
      logger.error('Failed to fetch health metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Quality metrics fetch ──

  const fetchQualityMetrics = useCallback(async () => {
    setQualityLoading(true);
    try {
      const { data: qm } = await supabase
        .from('quality_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(30);

      setQualityMetrics((qm as QualityMetricRow[]) || []);

      const { data: incidents } = await supabase
        .from('reconciliation_log')
        .select('id, analysis_id, summary, created_at')
        .eq('reconciled', false)
        .order('created_at', { ascending: false })
        .limit(20);

      setInconsistencies((incidents as InconsistencyRow[]) || []);
    } catch (err) {
      logger.error('Failed to fetch quality metrics:', err);
    } finally {
      setQualityLoading(false);
    }
  }, []);

  // ── Audit log fetch ──

  const fetchAuditLogs = async (analysisId: string) => {
    if (!analysisId.trim()) return;
    setAuditLoading(true);
    try {
      const { data } = await supabase
        .from('analysis_logs')
        .select('id, event_type, payload, severity, created_at')
        .eq('analysis_id', analysisId.trim())
        .order('created_at', { ascending: true })
        .limit(200);

      setAuditLogs((data as AuditLogEntry[]) || []);
    } catch (err) {
      logger.error('Audit fetch error:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  // ── CSV export ──

  const exportQualityCSV = () => {
    if (!qualityMetrics.length) return;
    const headers = [
      'date', 'reconciliation_rate', 'avg_confidence', 'inconsistency_rate',
      'avg_consensus', 'benchmark_coverage', 'p50_ms', 'p95_ms', 'p99_ms', 'total_analyses',
    ];
    const rows = qualityMetrics.map(m => [
      m.metric_date,
      m.reconciliation_rate ?? '',
      m.avg_confidence_score ?? '',
      m.inconsistency_rate ?? '',
      m.avg_consensus_score ?? '',
      m.benchmark_coverage_rate ?? '',
      m.p50_latency_ms ?? '',
      m.p95_latency_ms ?? '',
      m.p99_latency_ms ?? '',
      m.total_analyses ?? '',
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quality_metrics_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (isAdmin) fetchMetrics();
  }, [isAdmin, fetchMetrics]);

  const runSelfTest = async () => {
    setTestRunning(true);
    try {
      const result = QuantisMath.runSelfTest();
      const tests: SelfTestResult[] = [];
      for (let i = 0; i < result.passed; i++) {
        tests.push({ name: `Test ${i + 1}`, passed: true, expected: '', actual: '' });
      }
      for (const err of result.errors) {
        const match = err.match(/^(.+?):\s*expected\s+(.+?),\s*got\s+(.+)$/);
        tests.push({
          name: match?.[1] || err,
          passed: false,
          expected: match?.[2] || '',
          actual: match?.[3] || '',
        });
      }
      setSelfTestResults(tests);
    } catch {
      setSelfTestResults([{ name: 'Self-Test', passed: false, expected: 'No errors', actual: 'Execution failed' }]);
    } finally {
      setTestRunning(false);
    }
  };

  if (adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Derived quality chart data (reversed for ascending order)
  const qualityChartData = [...qualityMetrics]
    .reverse()
    .slice(-7)
    .map(m => ({
      date: m.metric_date.slice(5),
      reconRate: m.reconciliation_rate != null ? Math.round(m.reconciliation_rate) : null,
      confidence: m.avg_confidence_score != null ? Math.round(m.avg_confidence_score) : null,
      analyses: m.total_analyses ?? 0,
    }));

  // Top error codes from latest metrics
  const latestErrors = qualityMetrics.length > 0
    ? Object.entries(qualityMetrics[0].error_rate_by_code || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageSEO title="Quantis Health | Admin" description="System health monitor" canonical="/admin/health" noindex />
      <Header darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} />

      <main className="flex-1 container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Quantis Health Monitor</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="system" onValueChange={(v) => { if (v === 'quality') fetchQualityMetrics(); }}>
          <TabsList className="mb-6">
            <TabsTrigger value="system">System Health</TabsTrigger>
            <TabsTrigger value="quality">Report Quality</TabsTrigger>
          </TabsList>

          {/* ── System Health Tab (existing) ── */}
          <TabsContent value="system">
            <HealthAlertsBanner metrics={metrics} />
            <div className="mb-6"><TierQaTile /></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KPICard label="Avg Confidence (24h)" value={metrics?.avgConfidence24h ?? 0} suffix="%" icon={<ShieldCheck className="w-4 h-4" />} good={v => v >= 60} />
              <KPICard label="Consensus Score" value={metrics?.avgConsensus24h ?? 0} suffix="%" icon={<BarChart3 className="w-4 h-4" />} good={v => v >= 70} />
              <KPICard label="Error Rate" value={metrics?.errorRate24h ?? 0} suffix="%" icon={<AlertTriangle className="w-4 h-4" />} good={v => v <= 5} />
              <KPICard label="Volume (24h)" value={metrics?.volume24h ?? 0} suffix="" icon={<Zap className="w-4 h-4" />} good={() => true} />
            </div>

            {/* Benchmark-First plan, Step 10: coverage + invariants telemetry. */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KPICard
                label="Benchmark Coverage (24h)"
                value={metrics?.benchmarkLivePct24h ?? 0}
                suffix="% live"
                icon={<ShieldCheck className="w-4 h-4" />}
                good={v => v >= 80}
              />
              <KPICard
                label="Direct Match Share"
                value={metrics?.benchmarkDirectMatchPct24h ?? 0}
                suffix="%"
                icon={<BarChart3 className="w-4 h-4" />}
                good={v => v >= 50}
              />
              <KPICard
                label="Invariants Passing"
                value={metrics?.invariantsCoveragePct ?? 0}
                suffix="%"
                icon={<CheckCircle2 className="w-4 h-4" />}
                good={v => v >= 95}
              />
              <KPICard
                label="Invariants Tracked"
                value={metrics?.invariantsTotal ?? 0}
                suffix=""
                icon={<FileText className="w-4 h-4" />}
                good={() => true}
              />
            </div>

            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">7-Day Confidence Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics?.dailyTrend.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={metrics.dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <Tooltip />
                      <Line type="monotone" dataKey="avgConfidence" name="Avg Confidence" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="count" name="Volume" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                )}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Error Breakdown (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics?.errorBreakdown.length ? (
                    <div className="space-y-2">
                      {metrics.errorBreakdown.map(e => (
                        <div key={e.code} className="flex items-center justify-between text-sm">
                          <code className="text-xs bg-muted px-2 py-0.5 rounded">{e.code}</code>
                          <Badge variant="outline">{e.count}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No errors detected ✓</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">System Self-Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button onClick={runSelfTest} disabled={testRunning} size="sm" variant="outline" className="w-full">
                    {testRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                    Run QMath Self-Test
                  </Button>
                  {selfTestResults && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {selfTestResults.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {t.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                          )}
                          <span className="text-foreground truncate">{t.name}</span>
                        </div>
                      ))}
                      <p className="text-xs font-medium pt-1 border-t border-border text-muted-foreground">
                        {selfTestResults.filter(t => t.passed).length}/{selfTestResults.length} passed
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Report Quality Tab (new) ── */}
          <TabsContent value="quality">
            {qualityLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Actions bar */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {qualityMetrics.length} days of quality data
                  </p>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Search className="w-4 h-4 mr-2" /> Audit Report
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Analysis Audit Trail</DialogTitle>
                        </DialogHeader>
                        <div className="flex gap-2 mb-4">
                          <Input
                            placeholder="Enter analysis ID…"
                            value={auditAnalysisId}
                            onChange={(e) => setAuditAnalysisId(e.target.value)}
                            className="font-mono text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => fetchAuditLogs(auditAnalysisId)}
                            disabled={auditLoading || !auditAnalysisId.trim()}
                          >
                            {auditLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                          </Button>
                        </div>
                        {auditLogs.length > 0 ? (
                          <div className="space-y-2">
                            {auditLogs.map((log) => (
                              <div key={log.id} className="border border-border rounded-md p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <SeverityBadge severity={log.severity} />
                                    <code className="text-xs font-semibold">{log.event_type}</code>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(log.created_at).toLocaleTimeString()}
                                  </span>
                                </div>
                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(log.payload, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-6">
                            {auditAnalysisId ? 'No logs found for this analysis.' : 'Enter an analysis ID to view its audit trail.'}
                          </p>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm" onClick={exportQualityCSV} disabled={!qualityMetrics.length}>
                      <Download className="w-4 h-4 mr-2" /> Export CSV
                    </Button>
                  </div>
                </div>

                {/* Reconciliation Rate Trend */}
                <Card className="mb-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">7-Day Quality Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {qualityChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={qualityChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="reconRate" name="Reconciliation %" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="confidence" name="Avg Confidence" stroke="hsl(var(--accent-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No quality data yet</p>
                    )}
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Top QE Error Codes */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Top Error Codes (Latest Day)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {latestErrors.length > 0 ? (
                        <div className="space-y-2">
                          {latestErrors.map(([code, count]) => (
                            <div key={code} className="flex items-center justify-between text-sm">
                              <code className="text-xs bg-muted px-2 py-0.5 rounded">{code}</code>
                              <Badge variant="outline">{count}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No errors ✓</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Inconsistency Incidents */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Inconsistency Incidents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {inconsistencies.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {inconsistencies.map((inc) => (
                            <div key={inc.id} className="flex items-start gap-2 text-xs border-b border-border pb-2 last:border-0">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <code className="text-xs text-muted-foreground block truncate">
                                  {inc.analysis_id?.slice(0, 8) ?? 'N/A'}
                                </code>
                                <p className="text-foreground truncate">{inc.summary || 'No summary'}</p>
                                <span className="text-muted-foreground">
                                  {new Date(inc.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No inconsistencies ✓</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Latency KPIs */}
                {qualityMetrics.length > 0 && qualityMetrics[0].p50_latency_ms != null && (
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <KPICard label="p50 Latency" value={Math.round(qualityMetrics[0].p50_latency_ms!)} suffix="ms" icon={<Zap className="w-4 h-4" />} good={v => v < 15000} />
                    <KPICard label="p95 Latency" value={Math.round(qualityMetrics[0].p95_latency_ms ?? 0)} suffix="ms" icon={<Zap className="w-4 h-4" />} good={v => v < 20000} />
                    <KPICard label="p99 Latency" value={Math.round(qualityMetrics[0].p99_latency_ms ?? 0)} suffix="ms" icon={<Zap className="w-4 h-4" />} good={v => v < 30000} />
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

// ── Helpers ──

function KPICard({ label, value, suffix, icon, good }: { label: string; value: number; suffix: string; icon: React.ReactNode; good: (v: number) => boolean }) {
  const isGood = good(value);
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={isGood ? 'text-emerald-500' : 'text-amber-500'}>{icon}</span>
        </div>
        <p className="text-2xl font-bold tabular-nums text-foreground">
          {value}{suffix}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * HealthAlertsBanner — surfaces critical conditions at the top of System Health.
 * Triggers:
 *   - Benchmark Coverage (24h) < 80% → engine running in fallback mode too often.
 *   - Direct Match Share < 30%      → catalog gaps (most matches are "similar").
 *   - Invariants Passing < 95%      → math reconciliation drift.
 *   - Invariants Tracked == 0       → telemetry pipeline is dead.
 */
function HealthAlertsBanner({ metrics }: { metrics: HealthMetrics | null }) {
  if (!metrics) return null;
  const alerts: { level: 'critical' | 'warning'; title: string; detail: string }[] = [];

  if (metrics.benchmarkLivePct24h < 50) {
    alerts.push({
      level: 'critical',
      title: 'Benchmark coverage critical',
      detail: `Only ${metrics.benchmarkLivePct24h}% of analyses ran with live benchmarks in the last 24h. Most users are seeing fallback output.`,
    });
  } else if (metrics.benchmarkLivePct24h < 80) {
    alerts.push({
      level: 'warning',
      title: 'Benchmark coverage degraded',
      detail: `${metrics.benchmarkLivePct24h}% live coverage (target ≥ 80%). Check benchmarks-query function logs.`,
    });
  }

  if (metrics.benchmarkDirectMatchPct24h < 30 && metrics.benchmarkLivePct24h > 0) {
    alerts.push({
      level: 'warning',
      title: 'Catalog gaps detected',
      detail: `Direct-match share is ${metrics.benchmarkDirectMatchPct24h}% (target ≥ 50%). Most analyses are matching to "similar" benchmarks — expand benchmark_master_* coverage.`,
    });
  }

  if (metrics.invariantsCoveragePct < 95 && metrics.invariantsCoveragePct > 0) {
    alerts.push({
      level: 'critical',
      title: 'Invariant violations',
      detail: `Only ${metrics.invariantsCoveragePct}% of metric invariants passed reconciliation. Recent reports may contain contradictory values (CAC payback, LTV:CAC, margins).`,
    });
  }

  if (metrics.invariantsTotal === 0) {
    alerts.push({
      level: 'warning',
      title: 'Invariant telemetry offline',
      detail: 'No invariant rules registered. The metrics pipeline may not be writing to quality_metrics_daily.',
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {alerts.map((a, i) => (
        <div
          key={`${a.level}-${i}`}
          role="alert"
          className={`rounded-lg border p-3 flex items-start gap-3 ${
            a.level === 'critical'
              ? 'border-destructive/40 bg-destructive/5 text-destructive'
              : 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{a.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>
          </div>
          <Badge variant={a.level === 'critical' ? 'destructive' : 'outline'} className="text-[10px]">
            {a.level}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    info: 'secondary',
    warning: 'outline',
    error: 'destructive',
    critical: 'destructive',
  };
  return <Badge variant={variants[severity] || 'secondary'} className="text-[10px] px-1.5 py-0">{severity}</Badge>;
}
