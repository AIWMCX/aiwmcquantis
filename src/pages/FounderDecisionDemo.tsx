import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { PageSEO } from '@/components/seo/PageSEO';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';
import { recordFunnelEvent, trackEvent } from '@/lib/analytics';
import {
  FOUNDER_DEMO_FIXTURE,
  LEVER_SEARCH,
  runFounderDemo,
  solveRequiredToWork,
  type FounderDemoAssumptions,
} from '@/lib/demo/founder-decision-demo';

const fmtUsd = (v: number) => {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

const LEVER_LABEL: Record<keyof FounderDemoAssumptions, string> = {
  cac: 'Blended CAC',
  churnMonthly: 'Monthly churn',
  price: 'Price / month',
  grossMargin: 'Gross margin',
};

const LEVER_FORMAT: Record<keyof FounderDemoAssumptions, (v: number) => string> = {
  cac: (v) => fmtUsd(v),
  churnMonthly: (v) => `${(v * 100).toFixed(1)}%`,
  price: (v) => fmtUsd(v),
  grossMargin: (v) => `${(v * 100).toFixed(0)}%`,
};

const SLIDER_RANGE: Record<keyof FounderDemoAssumptions, { min: number; max: number; step: number }> = {
  cac: { min: 400, max: 3000, step: 10 },
  churnMonthly: { min: 0.01, max: 0.12, step: 0.001 },
  price: { min: 60, max: 300, step: 1 },
  grossMargin: { min: 0.5, max: 0.95, step: 0.01 },
};

export default function FounderDecisionDemo() {
  const fixture = FOUNDER_DEMO_FIXTURE;
  const [assumptions, setAssumptions] = useState<FounderDemoAssumptions>(fixture.base);
  const [touched, setTouched] = useState(false);
  const startedRef = React.useRef(false);

  if (!startedRef.current) {
    startedRef.current = true;
    trackEvent('demo_started', { offer: 'founder_decision_review', demo_version: fixture.version });
    recordFunnelEvent('open_the_hood_view', { surface: 'demo_founder_decision_review' });
  }

  const result = useMemo(() => runFounderDemo(assumptions, fixture), [assumptions, fixture]);
  const requiredToWork = useMemo(() => solveRequiredToWork(assumptions, fixture), [assumptions, fixture]);

  function updateLever(lever: keyof FounderDemoAssumptions, value: number) {
    setAssumptions((prev) => ({ ...prev, [lever]: value }));
    if (!touched) {
      setTouched(true);
      trackEvent('demo_model_broken', { offer: 'founder_decision_review', lever, demo_version: fixture.version });
    } else {
      trackEvent('demo_assumption_changed', { offer: 'founder_decision_review', lever });
    }
  }

  function resetToBase() {
    setAssumptions(fixture.base);
    setTouched(false);
  }

  const chartData = result.months.map((m) => ({
    month: m.month,
    'With investment': Math.round(m.cashWith),
    'Without investment': Math.round(m.cashWithout),
  }));

  return (
    <PublicPageShell active="pricing" backTo={{ href: '/decision-review', label: 'Back to Decision Review' }} maxWidth="lg">
      <PageSEO
        title="Interactive Decision Demo — AIWMC Quantis Founder Decision Review"
        description="See exactly how Quantis tests a real spending decision: change one assumption and watch cash, payback, and the decision gate recompute live."
        canonical="/demo/founder-decision-review"
      />

      <section className="aiwmc-section-wash py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-4">Interactive demo · fixed example, not your business</p>
        <SectionHeader
          title="Should this company put another $120K into growth?"
          subtitle="This is the same deterministic engine behind every Quantis Decision Run — running on one fixed, fictional example. Move a slider below and watch every dependent number recompute."
        />
      </section>

      <GlassCard className="p-5 mb-6 text-sm text-muted-foreground">
        <strong className="text-foreground">Illustrative Quantis demonstration.</strong> Values are a fixed example company, not a forecast for your business. Company: {fixture.startingCustomers} existing customers, ${fixture.startingCash.toLocaleString('en-US')} starting cash, considering ${fixture.decision.totalSpend.toLocaleString('en-US')} in additional acquisition spend over months {fixture.decision.startMonth}–{fixture.decision.endMonth}.
      </GlassCard>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-1">Break the model</h2>
          <p className="text-sm text-muted-foreground mb-6">The base case holds. Change one assumption and see what breaks it.</p>
          <div className="space-y-6">
            {(Object.keys(SLIDER_RANGE) as (keyof FounderDemoAssumptions)[]).map((lever) => (
              <div key={lever} className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-foreground">{LEVER_LABEL[lever]}</label>
                  <span className="text-sm font-bold text-primary">{LEVER_FORMAT[lever](assumptions[lever])}</span>
                </div>
                <Slider
                  value={[assumptions[lever]]}
                  onValueChange={([v]) => updateLever(lever, v)}
                  min={SLIDER_RANGE[lever].min}
                  max={SLIDER_RANGE[lever].max}
                  step={SLIDER_RANGE[lever].step}
                  className="w-full"
                  aria-label={LEVER_LABEL[lever]}
                />
              </div>
            ))}
          </div>
          {touched && (
            <Button variant="outline" size="sm" className="mt-6" onClick={resetToBase}>
              Reset to base case
            </Button>
          )}
        </GlassCard>

        <GlassCard className={`p-6 border-2 ${result.holds ? 'border-emerald-500/40' : 'border-destructive/40'}`}>
          <div className="flex items-center gap-2 mb-4">
            {result.holds ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            )}
            <h2 className="text-lg font-semibold">
              {result.holds ? 'Decision holds' : 'Decision is financially fragile'}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs">Payback</p>
              <p className="text-xl font-bold">{result.paybackMonth ? `Month ${result.paybackMonth}` : 'Never'}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs">Lowest cash</p>
              <p className="text-xl font-bold">{fmtUsd(result.lowestCash)}</p>
              <p className="text-xs text-muted-foreground">month {result.lowestCashMonth}</p>
            </div>
          </div>

          {!result.holds && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 mb-5 text-sm flex items-start gap-2">
              <TrendingDown className="h-4 w-4 mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
              <span>
                {result.failures.includes('cash_floor') && `Cash falls below the ${fmtUsd(fixture.criteria.cashFloor)} floor in month ${result.floorBreachMonth}. `}
                {result.failures.includes('payback_too_slow') && `Payback takes ${result.paybackMonth} months — past the ${fixture.criteria.maxPaybackMonths}-month limit. `}
                {result.failures.includes('no_payback') && 'The investment never pays back inside the 3-year window. '}
                The decision is no longer financially defensible under these assumptions.
              </span>
            </div>
          )}

          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                <YAxis tickFormatter={fmtUsd} tick={{ fontSize: 11 }} width={54} />
                <Tooltip formatter={(v: number) => fmtUsd(v)} labelFormatter={(m) => `Month ${m}`} />
                <ReferenceLine y={fixture.criteria.cashFloor} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Cash floor', fontSize: 10, fill: '#ef4444' }} />
                <Line type="monotone" dataKey="With investment" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Without investment" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </section>

      <section className="py-10">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-1">What must be true for this to work?</h2>
          <p className="text-sm text-muted-foreground mb-5">Holding every other assumption at its current value, here is the boundary for each one.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {requiredToWork.map((r) => {
              const { worseWhen } = LEVER_SEARCH[r.lever];
              const cmp = worseWhen === 'higher' ? '≤' : '≥';
              return (
                <div key={r.lever} className="rounded-lg border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{LEVER_LABEL[r.lever]}</p>
                  <p className="text-sm font-bold">
                    {r.threshold === null ? 'Never holds' : r.unbounded ? 'Holds across full range' : `${cmp} ${LEVER_FORMAT[r.lever](r.threshold)}`}
                  </p>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </section>

      <section className="pb-16 text-center">
        <p className="text-sm text-muted-foreground mb-4">Quantis does not make the decision for you. It shows what must be true for the decision to remain financially defensible.</p>
        <Link
          to="/decision-review"
          onClick={() => trackEvent('demo_cta_clicked', { offer: 'founder_decision_review', demo_version: fixture.version })}
        >
          <Button size="lg" className="gap-2 py-6 px-8">
            See the $349 Founder Decision Review
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>
    </PublicPageShell>
  );
}
