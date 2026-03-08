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
import { ArrowLeft, Activity, ShieldCheck, AlertTriangle, CheckCircle2, Loader2, RefreshCw, BarChart3, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PageSEO } from '@/components/seo/PageSEO';

interface HealthMetrics {
  avgConfidence24h: number;
  avgConsensus24h: number;
  errorRate24h: number;
  volume24h: number;
  dailyTrend: { date: string; avgConfidence: number; count: number }[];
  errorBreakdown: { code: string; count: number }[];
}

interface SelfTestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export default function QuantisHealth() {
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selfTestResults, setSelfTestResults] = useState<SelfTestResult[] | null>(null);
  const [testRunning, setTestRunning] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate('/app');
  }, [isAdmin, adminLoading, navigate]);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Last 24h analyses
      const { data: recent } = await supabase
        .from('analyses')
        .select('confidence_score, result, created_at')
        .gte('created_at', h24);

      const recentArr = recent || [];
      const confidences = recentArr.map(a => a.confidence_score).filter((c): c is number => c != null);
      const avgConf = confidences.length ? confidences.reduce((s, v) => s + v, 0) / confidences.length : 0;

      // Extract consensus scores and errors from results
      let consensusSum = 0;
      let consensusCount = 0;
      let errorCount = 0;
      const errorMap: Record<string, number> = {};

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
      }

      // 7-day trend
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

      setMetrics({
        avgConfidence24h: Math.round(avgConf),
        avgConsensus24h: consensusCount ? Math.round(consensusSum / consensusCount) : 0,
        errorRate24h: recentArr.length ? Math.round((errorCount / recentArr.length) * 100) : 0,
        volume24h: recentArr.length,
        dailyTrend,
        errorBreakdown: Object.entries(errorMap)
          .map(([code, count]) => ({ code, count }))
          .sort((a, b) => b.count - a.count),
      });
    } catch (err) {
      console.error('Failed to fetch health metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchMetrics();
  }, [isAdmin, fetchMetrics]);

  const runSelfTest = async () => {
    setTestRunning(true);
    try {
      // Run known-answer tests against QuantisMath
      const tests: SelfTestResult[] = [
        { name: 'Addition: 0.1 + 0.2', passed: QuantisMath.add(0.1, 0.2).toNumber() === 0.3, expected: '0.3', actual: String(QuantisMath.add(0.1, 0.2).toNumber()) },
        { name: 'Division by zero guard', passed: QuantisMath.divide(100, 0).toNumber() === 0, expected: '0', actual: String(QuantisMath.divide(100, 0).toNumber()) },
        { name: 'Percentage: 25 of 200', passed: QuantisMath.percentage(25, 200).toNumber() === 50, expected: '50', actual: String(QuantisMath.percentage(25, 200).toNumber()) },
        { name: 'Margin: rev=1000, cost=600', passed: QuantisMath.margin(1000, 600).toNumber() === 40, expected: '40', actual: String(QuantisMath.margin(1000, 600).toNumber()) },
        { name: 'Clamp: 150 in [0,100]', passed: QuantisMath.clamp(150, 0, 100).toNumber() === 100, expected: '100', actual: String(QuantisMath.clamp(150, 0, 100).toNumber()) },
        { name: 'Round: 3.456 to 2dp', passed: QuantisMath.round(3.456, 2) === 3.46, expected: '3.46', actual: String(QuantisMath.round(3.456, 2)) },
        { name: 'Multiply precision', passed: QuantisMath.multiply(0.1, 0.2).toNumber() === 0.02, expected: '0.02', actual: String(QuantisMath.multiply(0.1, 0.2).toNumber()) },
        { name: 'Subtract precision', passed: QuantisMath.subtract(1, 0.9).toNumber() === 0.1, expected: '0.1', actual: String(QuantisMath.subtract(1, 0.9).toNumber()) },
      ];
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

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KPICard label="Avg Confidence (24h)" value={metrics?.avgConfidence24h ?? 0} suffix="%" icon={<ShieldCheck className="w-4 h-4" />} good={v => v >= 60} />
          <KPICard label="Consensus Score" value={metrics?.avgConsensus24h ?? 0} suffix="%" icon={<BarChart3 className="w-4 h-4" />} good={v => v >= 70} />
          <KPICard label="Error Rate" value={metrics?.errorRate24h ?? 0} suffix="%" icon={<AlertTriangle className="w-4 h-4" />} good={v => v <= 5} />
          <KPICard label="Volume (24h)" value={metrics?.volume24h ?? 0} suffix="" icon={<Zap className="w-4 h-4" />} good={() => true} />
        </div>

        {/* Confidence Trend Chart */}
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
          {/* Error Breakdown */}
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

          {/* Self-Test */}
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
      </main>
      <Footer />
    </div>
  );
}

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
