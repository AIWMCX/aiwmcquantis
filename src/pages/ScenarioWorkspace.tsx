import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageSEO } from '@/components/seo/PageSEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import {
  createScenarioSet,
  runScenario,
  promoteScenario,
  promoteScenarioToAnalysis,
  findScenarioBreakpoint,
  ScenarioEntitlementError,
  type ScenarioAssumptionKey,
  type ScenarioDeltaChange,
  type RunScenarioResult,
  type ScenarioBreakpointResult,
  type AssumptionOriginClass,
} from '@/services/scenario-sets-api';
import { ArrowLeft, Loader2, Sparkles, Lock, GitBranch, ChevronRight, Target } from 'lucide-react';
import { toast } from 'sonner';

const ASSUMPTION_LABELS: Record<ScenarioAssumptionKey, string> = {
  monthly_revenue: 'Monthly revenue',
  startup_investment: 'Startup investment',
  cac: 'Customer acquisition cost',
  average_price: 'Average price',
  monthly_costs: 'Monthly costs',
  churn_rate: 'Churn rate',
  expected_customers: 'Expected customers',
  rent: 'Rent',
};

/**
 * Living Assumption Register (Multiplier System #1) — short badge text per
 * origin class, shown next to each assumption input once a preview has run.
 */
const ORIGIN_LABELS: Record<AssumptionOriginClass, string> = {
  USER_ACTUAL: 'Your input',
  DERIVED: 'AI-extracted',
  MODELED_BENCHMARK_PRIOR: 'Benchmark prior',
  SYSTEM_ASSUMPTION: 'System-derived',
  PLACEHOLDER: 'No evidence',
};

/**
 * Starting-case quick presets — the schema (`scenarios.starting_case`,
 * already enforced by a DB check constraint) and run-scenario have
 * supported these since Phase D shipped; the builder never exposed them,
 * so every scenario had to be hand-built from a blank form. Matches the
 * Unified Decision Framework's §8.3 requirement for named starting cases,
 * not free-form deltas as the only entry point.
 */
const STARTING_CASE_PRESETS: Array<{
  id: 'baseline' | 'demand_downside' | 'cost_shock' | 'pricing_change' | 'capacity_constraint';
  label: string;
  description: string;
  changes: Partial<Record<ScenarioAssumptionKey, string>>;
}> = [
  { id: 'baseline', label: 'Baseline', description: 'Re-run the base case unchanged, as a comparison anchor', changes: {} },
  { id: 'demand_downside', label: 'Demand Downside', description: 'Revenue and customer count both 20% lower', changes: { monthly_revenue: '-20', expected_customers: '-20' } },
  { id: 'cost_shock', label: 'Cost Shock', description: 'Monthly costs 15% higher', changes: { monthly_costs: '15' } },
  { id: 'pricing_change', label: 'Pricing Change', description: 'Average price 10% higher', changes: { average_price: '10' } },
  { id: 'capacity_constraint', label: 'Capacity Constraint', description: 'Customer count capped 25% below plan', changes: { expected_customers: '-25' } },
];

interface ScenarioSetRow {
  id: string;
  name: string;
  created_at: string;
}

interface ScenarioRow {
  id: string;
  name: string;
}

interface AnalysisHistoryRow {
  id: string;
  idea: string;
  location: string;
  created_at: string;
  confidence_score: number | null;
  scenario_base_input: unknown;
}

/**
 * Phase D — standalone route (not an AppDashboard tab): scenario building is
 * multi-step and may target a historical analysis, so it owns its own data
 * fetching via ?analysisId=/&setId= rather than assuming dashboard state.
 * Wrapped in ProtectedRoute only (see src/App.tsx) — free users have
 * scenarioView/scenarioCustom and can build + preview here; only
 * save/compare/promote are gated inline via useEntitlements().
 */
export default function ScenarioWorkspace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const analysisId = searchParams.get('analysisId');
  const setId = searchParams.get('setId');
  const { hasFeature } = useEntitlements();

  const [baseAvailable, setBaseAvailable] = useState<boolean | null>(null);
  const [scenarioSets, setScenarioSets] = useState<ScenarioSetRow[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);

  const [scenarios, setScenarios] = useState<Array<{ id: string; name: string; run: RunScenarioResult | null }>>([]);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const [changes, setChanges] = useState<Partial<Record<ScenarioAssumptionKey, string>>>({});
  const [scenarioName, setScenarioName] = useState('');
  const [startingCase, setStartingCase] = useState<string>('custom');

  const applyPreset = (preset: typeof STARTING_CASE_PRESETS[number]) => {
    setStartingCase(preset.id);
    setChanges(preset.changes);
    setScenarioName((current) => current || preset.label);
    setPreview(null);
  };
  const [preview, setPreview] = useState<RunScenarioResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPromoting, setIsPromoting] = useState<string | null>(null);
  const [breakpoints, setBreakpoints] = useState<Partial<Record<ScenarioAssumptionKey, ScenarioBreakpointResult>>>({});
  const [solvingKey, setSolvingKey] = useState<ScenarioAssumptionKey | null>(null);

  // Landing view (no ?analysisId): the user's own completed-analysis
  // history, each flagged with how many scenario sets already exist for it —
  // this is the "general page" the sidebar's Scenarios link opens directly,
  // not a placeholder that requires picking an analysis elsewhere first.
  const [historyAnalyses, setHistoryAnalyses] = useState<AnalysisHistoryRow[]>([]);
  const [scenarioCounts, setScenarioCounts] = useState<Map<string, number>>(new Map());
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (analysisId || !user) return;
    let cancelled = false;
    setLoadingHistory(true);
    (async () => {
      const [{ data: analysesData }, { data: setsData }] = await Promise.all([
        supabase
          .from('analyses')
          .select('id, idea, location, created_at, confidence_score, scenario_base_input')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('scenario_sets')
          .select('analysis_id')
          .eq('user_id', user.id)
          .is('archived_at', null),
      ]);
      if (cancelled) return;
      const counts = new Map<string, number>();
      for (const row of setsData ?? []) {
        counts.set(row.analysis_id, (counts.get(row.analysis_id) ?? 0) + 1);
      }
      setHistoryAnalyses((analysesData ?? []) as AnalysisHistoryRow[]);
      setScenarioCounts(counts);
      setLoadingHistory(false);
    })();
    return () => { cancelled = true; };
  }, [analysisId, user]);

  useEffect(() => {
    if (!analysisId || !user) return;
    supabase
      .from('analyses')
      .select('scenario_base_input')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setBaseAvailable(!!data?.scenario_base_input));
  }, [analysisId, user]);

  const loadSets = useCallback(() => {
    if (!analysisId || !user) return;
    setLoadingSets(true);
    supabase
      .from('scenario_sets')
      .select('id, name, created_at')
      .eq('analysis_id', analysisId)
      .eq('user_id', user.id)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setScenarioSets(data ?? []);
        setLoadingSets(false);
      });
  }, [analysisId, user]);

  useEffect(() => { loadSets(); }, [loadSets]);

  const loadCompare = useCallback(async () => {
    if (!setId || !user) return;
    setLoadingCompare(true);
    const { data: scenarioRows } = await supabase
      .from('scenarios')
      .select('id, name')
      .eq('scenario_set_id', setId)
      .eq('user_id', user.id);

    const withRuns = await Promise.all(
      (scenarioRows ?? []).map(async (s: ScenarioRow) => {
        const { data: versions } = await supabase
          .from('scenario_versions')
          .select('id')
          .eq('scenario_id', s.id)
          .order('version_number', { ascending: false })
          .limit(1);
        const latestVersionId = versions?.[0]?.id;
        if (!latestVersionId) return { id: s.id, name: s.name, run: null };
        const { data: run } = await supabase
          .from('scenario_runs')
          .select('id, output, output_hash, engine_version, formula_version, reconciliation_status')
          .eq('scenario_version_id', latestVersionId)
          .maybeSingle();
        return {
          id: s.id,
          name: s.name,
          run: run
            ? ({
                persisted: true,
                run_id: run.id,
                output: run.output,
                reconciliation_status: run.reconciliation_status,
              } as unknown as RunScenarioResult)
            : null,
        };
      }),
    );
    setScenarios(withRuns);
    setLoadingCompare(false);
  }, [setId, user]);

  useEffect(() => { if (setId) loadCompare(); }, [setId, loadCompare]);

  const buildChanges = (): ScenarioDeltaChange[] =>
    Object.entries(changes)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([key, value]) => ({
        assumption_key: key as ScenarioAssumptionKey,
        operation: 'increase_pct' as const,
        value: Number(value),
      }));

  const handlePreview = async () => {
    if (!setId) {
      toast.error('Create a scenario set first');
      return;
    }
    setIsRunning(true);
    try {
      const result = await runScenario({ scenarioSetId: setId, changes: buildChanges(), persist: false, startingCase });
      setPreview(result);
    } catch (e) {
      if (e instanceof ScenarioEntitlementError) {
        toast.error(e.message);
      } else {
        toast.error(e instanceof Error ? e.message : 'Preview failed');
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleFindBreakpoint = async (key: ScenarioAssumptionKey) => {
    if (!analysisId) return;
    setSolvingKey(key);
    try {
      const result = await findScenarioBreakpoint({
        analysisId,
        assumptionKey: key,
        changes: buildChanges().filter((c) => c.assumption_key !== key),
      });
      setBreakpoints((b) => ({ ...b, [key]: result }));
    } catch (e) {
      if (e instanceof ScenarioEntitlementError) {
        toast.error(e.message);
      } else {
        toast.error(e instanceof Error ? e.message : 'Breakpoint search failed');
      }
    } finally {
      setSolvingKey(null);
    }
  };

  const handleSave = async () => {
    if (!analysisId) return;
    setIsSaving(true);
    try {
      let targetSetId = setId;
      if (!targetSetId) {
        const created = await createScenarioSet(analysisId);
        targetSetId = created.scenario_set_id;
      }
      const result = await runScenario({
        scenarioSetId: targetSetId!,
        name: scenarioName || 'Custom Scenario',
        changes: buildChanges(),
        persist: true,
        startingCase,
      });
      toast.success('Scenario saved');
      navigate(`/app/scenarios?analysisId=${analysisId}&setId=${targetSetId}`);
      setPreview(result);
    } catch (e) {
      if (e instanceof ScenarioEntitlementError) {
        toast.error(e.message, { description: 'Upgrade to Plus or Pro to save scenarios.' });
      } else {
        toast.error(e instanceof Error ? e.message : 'Save failed');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromote = async (runId: string) => {
    setIsPromoting(runId);
    try {
      const ref = await promoteScenario(runId);
      navigate('/docs', { state: { scenarioRunRef: ref } });
    } catch (e) {
      if (e instanceof ScenarioEntitlementError) {
        toast.error(e.message, { description: 'Upgrade to Plus or Pro to promote scenarios to documents.' });
      } else {
        toast.error(e instanceof Error ? e.message : 'Promote failed');
      }
    } finally {
      setIsPromoting(null);
    }
  };

  const [isPromotingToAnalysis, setIsPromotingToAnalysis] = useState<string | null>(null);
  const handlePromoteToAnalysis = async (runId: string) => {
    setIsPromotingToAnalysis(runId);
    try {
      await promoteScenarioToAnalysis(runId);
      toast.success('Created a new analysis from this scenario', {
        description: 'The original analysis is unchanged. Find the new one at the top of History.',
      });
      navigate('/app?tab=history');
    } catch (e) {
      if (e instanceof ScenarioEntitlementError) {
        toast.error(e.message, { description: 'Upgrade to Plus or Pro to promote scenarios.' });
      } else {
        toast.error(e instanceof Error ? e.message : 'Promote to new analysis failed');
      }
    } finally {
      setIsPromotingToAnalysis(null);
    }
  };

  if (!analysisId) {
    return (
      <AppLayout title="Scenario Modeling">
        <PageSEO
          title="Scenario Modeling — Quantis"
          description="Model what-if scenarios against any of your completed analyses using the same deterministic engine, then compare and promote results into documents."
          canonical="/app/scenarios"
        />
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <button
            onClick={() => navigate('/app')}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to dashboard
          </button>

          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <h1 className="text-xl font-semibold">Scenario Modeling</h1>
          </div>
          <p className="text-sm text-muted-foreground -mt-4">
            Pick a completed analysis to model what-if changes against — same engine, same numbers, fully reproducible.
          </p>

          {loadingHistory ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading your analyses…
            </div>
          ) : historyAnalyses.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  You haven't run an analysis yet. Run one first, then come back here to model scenarios against it.
                </p>
                <Button onClick={() => navigate('/app')}>Run an Analysis</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {historyAnalyses.map((a) => {
                const count = scenarioCounts.get(a.id) ?? 0;
                const enabled = !!a.scenario_base_input;
                return (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/app/scenarios?analysisId=${a.id}`)}
                    className="w-full text-left p-4 rounded-lg border hover:border-primary transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{a.idea}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.location} · {new Date(a.created_at).toLocaleDateString()}
                        {typeof a.confidence_score === 'number' && ` · ${a.confidence_score}% confidence`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {enabled ? (
                        <Badge variant={count > 0 ? 'default' : 'secondary'} className="whitespace-nowrap">
                          <GitBranch className="w-3 h-3 mr-1" />
                          {count > 0 ? `${count} scenario set${count === 1 ? '' : 's'}` : 'Model scenarios'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="whitespace-nowrap text-muted-foreground">
                          Re-run to enable
                        </Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Scenario Modeling">
      <PageSEO
        title="Scenario Modeling — Quantis"
        description="Model what-if scenarios against your analysis using the same deterministic engine, then compare and promote results into documents."
        canonical="/app/scenarios"
      />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <button
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to dashboard
        </button>

        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Scenario Modeling</h1>
        </div>

        {baseAvailable === false && (
          <Card className="border-amber-500/40">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              This analysis was saved before scenario modeling was enabled. Re-run it to unlock scenarios.
            </CardContent>
          </Card>
        )}

        {!setId && (
          <Card>
            <CardHeader><CardTitle className="text-base">Saved Scenario Sets</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {loadingSets ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : scenarioSets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved sets yet — build one below and save it.</p>
              ) : (
                scenarioSets.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/app/scenarios?analysisId=${analysisId}&setId=${s.id}`)}
                    className="w-full text-left p-3 rounded-lg border hover:border-primary transition-colors flex items-center justify-between"
                  >
                    <span>{s.name}</span>
                    <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {setId && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Compare Scenarios</CardTitle>
              {!hasFeature('scenarioCompare') && (
                <Badge variant="secondary"><Lock className="w-3 h-3 mr-1" />Upgrade to compare</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingCompare ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : scenarios.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scenarios in this set yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2 pr-4">Scenario</th>
                        <th className="py-2 pr-4">Revenue</th>
                        <th className="py-2 pr-4">Operating Profit</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {scenarios.map((s) => {
                        const base = s.run?.output?.financial_analysis?.scenarios?.base;
                        return (
                          <tr key={s.id} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">{s.name}</td>
                            <td className="py-2 pr-4 tabular-nums">{base ? `$${base.revenue.toLocaleString()}` : '—'}</td>
                            <td className="py-2 pr-4 tabular-nums">{base ? `$${base.net_profit.toLocaleString()}` : '—'}</td>
                            <td className="py-2 pr-4">
                              <Badge variant={s.run?.reconciliation_status === 'passed' ? 'default' : 'secondary'}>
                                {s.run?.reconciliation_status ?? 'unknown'}
                              </Badge>
                            </td>
                            <td className="py-2">
                              {s.run?.run_id && (
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!hasFeature('scenarioPromote') || isPromotingToAnalysis === s.run.run_id}
                                    onClick={() => handlePromoteToAnalysis(s.run!.run_id!)}
                                    title="Creates a new, separate analysis from this scenario — the original is never changed"
                                  >
                                    {isPromotingToAnalysis === s.run.run_id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Promote to New Analysis'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!hasFeature('scenarioPromote') || isPromoting === s.run.run_id}
                                    onClick={() => handlePromote(s.run!.run_id!)}
                                  >
                                    {isPromoting === s.run.run_id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Promote to Document'}
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Build a Scenario</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">Starting case</Label>
              <div className="flex flex-wrap gap-2">
                {STARTING_CASE_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    size="sm"
                    variant={startingCase === preset.id ? 'default' : 'outline'}
                    onClick={() => applyPreset(preset)}
                    title={preset.description}
                  >
                    {preset.label}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant={startingCase === 'custom' ? 'default' : 'outline'}
                  onClick={() => setStartingCase('custom')}
                  title="Set every assumption change yourself"
                >
                  Custom
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="scenario-name">Scenario name</Label>
              <Input
                id="scenario-name"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g. Higher CAC"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(Object.keys(ASSUMPTION_LABELS) as ScenarioAssumptionKey[]).map((key) => {
                const originInfo = preview?.output.assumption_origins?.[key];
                return (
                <div key={key}>
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <Label htmlFor={key} className="mb-0">{ASSUMPTION_LABELS[key]} (% change)</Label>
                    {originInfo && (
                      <Badge
                        variant={originInfo.origin === 'USER_ACTUAL' ? 'default' : originInfo.origin === 'PLACEHOLDER' ? 'destructive' : 'secondary'}
                        className="text-[10px] px-1.5 py-0 font-normal"
                        title={[
                          ORIGIN_LABELS[originInfo.origin],
                          originInfo.evidence_range ? `Evidence range: ${originInfo.evidence_range[0].toLocaleString()}–${originInfo.evidence_range[1].toLocaleString()}` : null,
                          `Confidence: ${originInfo.confidence}%`,
                        ].filter(Boolean).join(' · ')}
                      >
                        {ORIGIN_LABELS[originInfo.origin]} · {originInfo.confidence}%
                      </Badge>
                    )}
                  </div>
                  <Input
                    id={key}
                    type="number"
                    value={changes[key] ?? ''}
                    onChange={(e) => setChanges((c) => ({ ...c, [key]: e.target.value }))}
                    placeholder="0"
                  />
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleFindBreakpoint(key)}
                      disabled={solvingKey !== null || baseAvailable === false}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      title="Find the % change on this assumption where net profit hits zero, holding your other changes fixed"
                    >
                      {solvingKey === key
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Target className="w-3 h-3" />}
                      Find breakeven
                    </button>
                    {breakpoints[key] && (
                      <span className="text-xs tabular-nums">
                        {breakpoints[key]!.status === 'FOUND' && (
                          <>
                            Breaks even at{' '}
                            <strong>
                              {(breakpoints[key] as Extract<ScenarioBreakpointResult, { status: 'FOUND' }>).breakpoint_pct > 0 ? '+' : ''}
                              {(breakpoints[key] as Extract<ScenarioBreakpointResult, { status: 'FOUND' }>).breakpoint_pct}%
                            </strong>
                          </>
                        )}
                        {breakpoints[key]!.status === 'ALREADY_AT_TARGET' && 'Already at breakeven'}
                        {breakpoints[key]!.status === 'NOT_FOUND_IN_RANGE' && (
                          <span className="text-muted-foreground">
                            No breakeven between −95% and +500% — this lever alone can't get you there
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={handlePreview} disabled={isRunning || baseAvailable === false}>
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Preview
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || baseAvailable === false || !hasFeature('scenarioSave')}
                title={!hasFeature('scenarioSave') ? 'Upgrade to Plus or Pro to save scenarios' : undefined}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {hasFeature('scenarioSave') ? 'Save to Scenario Set' : <><Lock className="w-3 h-3 mr-2" />Save (Upgrade)</>}
              </Button>
            </div>

            {preview && (
              <div className="rounded-lg border p-4 space-y-2 text-sm">
                <div className="font-medium">Preview result</div>
                <div className="grid grid-cols-2 gap-2 tabular-nums">
                  <div>Revenue: ${preview.output.financial_analysis.scenarios.base.revenue.toLocaleString()}</div>
                  <div>Operating Profit: ${preview.output.financial_analysis.scenarios.base.net_profit.toLocaleString()}</div>
                </div>
                <Badge variant={preview.output.reconciliation.all_passed ? 'default' : 'secondary'}>
                  {preview.output.reconciliation.all_passed ? 'Reconciliation passed' : 'Reconciliation issues found'}
                </Badge>

                {preview.output.sensitivity?.length > 0 && (
                  <div className="pt-3 border-t space-y-2">
                    <div className="font-medium">What moves net profit most, from here</div>
                    <p className="text-xs text-muted-foreground">
                      Each assumption moved ±10% on its own, against this scenario's position. Dollar impact is the
                      average swing in monthly net profit.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b">
                            <th className="py-1.5 pr-4">Driver</th>
                            <th className="py-1.5 pr-4 text-right">Impact per ±10%</th>
                            <th className="py-1.5 text-right">Elasticity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.output.sensitivity.map((s) => (
                            <tr key={s.assumption_key} className="border-b last:border-0">
                              <td className="py-1.5 pr-4">{ASSUMPTION_LABELS[s.assumption_key]}</td>
                              <td className="py-1.5 pr-4 text-right tabular-nums">
                                {s.dollar_impact_per_10pct < 1
                                  ? <span className="text-muted-foreground">no effect</span>
                                  : `$${Math.round(s.dollar_impact_per_10pct).toLocaleString()}`}
                              </td>
                              <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                                {s.elasticity === null ? '—' : s.elasticity.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
