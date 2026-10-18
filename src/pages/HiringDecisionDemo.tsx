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
  HIRING_DEMO_FIXTURE,
  HIRING_LEVER_SEARCH,
  runHiringDemo,
  solveHiringRequiredToWork,
  type HiringDemoAssumptions,
} from '@/lib/demo/hiring-decision-demo';

const fmtUsd = (v: number) => {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

type Lever = keyof HiringDemoAssumptions;

const LEVER_LABEL: Record<Lever, string> = {
  newClientsPerMonth: 'New clients won per month',
  hireMonthlyCost: 'Hire: fully loaded cost / month',
  collectionLagMonths: 'Clients pay after',
  grossMargin: 'Gross margin on client work',
};

const LEVER_FORMAT: Record<Lever, (v: number) => string> = {
  newClientsPerMonth: (v) => v.toFixed(1),
  hireMonthlyCost: (v) => `$${Math.round(v).toLocaleString('en-US')}`,
  collectionLagMonths: (v) => (Math.round(v) === 0 ? 'on delivery' : `${Math.round(v)} month${Math.round(v) === 1 ? '' : 's'}`),
  grossMargin: (v) => `${(v * 100).toFixed(0)}%`,
};

const SLIDER_RANGE: Record<Lever, { min: number; max: number; step: number }> = {
  newClientsPerMonth: { min: 0, max: 4, step: 0.1 },
  hireMonthlyCost: { min: 4_000, max: 10_000, step: 100 },
  collectionLagMonths: { min: 0, max: 3, step: 1 },
  grossMargin: { min: 0.35, max: 0.75, step: 0.01 },
};

const SLUG = 'hiring_decision';

export default function HiringDecisionDemo() {
  const f = HIRING_DEMO_FIXTURE;
  const [a, setA] = useState<HiringDemoAssumptions>(f.base);
  const [touched, setTouched] = useState(false);
  const startedRef = React.useRef(false);

  if (!startedRef.current) {
    startedRef.current = true;
    trackEvent('demo_started', { offer: SLUG, demo_version: f.version });
    recordFunnelEvent('open_the_hood_view', { surface: 'demo_hiring_decision' });
  }

  const r = useMemo(() => runHiringDemo(a, f), [a, f]);
  const required = useMemo(() => solveHiringRequiredToWork(a, f), [a, f]);

  function update(lever: Lever, value: number) {
    setA((prev) => ({ ...prev, [lever]: value }));
    if (!touched) {
      setTouched(true);
      trackEvent('demo_model_broken', { offer: SLUG, lever, demo_version: f.version });
    } else {
      trackEvent('demo_assumption_changed', { offer: SLUG, lever });
    }
  }

  const chartData = r.months.map((m) => ({
    month: m.month,
    'With the hire': Math.round(m.cashWith),
    'Without the hire': Math.round(m.cashWithout),
  }));

  const currentCap = f.currentHoursMonthly / f.hoursPerClientMonthly;
  const firstFullMonth = r.months.find((m) => m.hireUtilization >= 0.999)?.month ?? null;

  return (
    <PublicPageShell active="pricing" backTo={{ href: '/decision-review', label: 'Back to Decision Review' }} maxWidth="lg">
      <PageSEO
        title="Hiring Decision Demo — Can the business carry another employee? | AIWMC Quantis"
        description="Before the next hire, understand the cash commitment. Compare payroll, revenue ramp-up and collection timing on an illustrative example, then discuss your own decision."
        canonical="/demo/hiring-decision"
      />

      <section className="aiwmc-section-wash py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-4">Interactive demo · illustrative example, not your business</p>
        <SectionHeader
          title="Before the next hire, understand the cash commitment."
          subtitle="Can the business carry another employee before demand catches up? Payroll starts on day one; revenue only follows as new clients fill the new hours. Move a slider and every number below recomputes with the same deterministic engine behind every Quantis Decision Run."
        />
      </section>

      <GlassCard className="p-5 mb-6 text-sm text-muted-foreground">
        <strong className="text-foreground">Illustrative example.</strong> A services business with {f.startingClients} clients at ${f.avgMonthlyFee.toLocaleString('en-US')}/month,
        already at capacity ({f.currentHoursMonthly} delivery hours = {currentCap} clients), ${f.startingCash.toLocaleString('en-US')} in the bank.
        The hire adds {f.hireAddsHoursMonthly} client hours per month (room for {f.hireAddsHoursMonthly / f.hoursPerClientMonthly} more clients) and costs
        ${f.hireOneTimeCost.toLocaleString('en-US')} up front to recruit and onboard. Decision rule: cash stays above ${f.criteria.cashFloor.toLocaleString('en-US')} and
        the hire pays for itself within {f.criteria.maxPaybackMonths} months.
      </GlassCard>

      <GlassCard className="p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,260px)_1fr] gap-5 items-center">
          <video
            className="w-full rounded-lg border border-border"
            src="/video/hiring-decision-demo.mp4"
            poster="/video/hiring-decision-demo-poster.jpg"
            width={1080}
            height={1350}
            controls
            muted
            playsInline
            preload="none"
            aria-label="22-second walkthrough of this hiring example: payroll starts, cash dips to month 4, the hire pays for itself in month 11"
            onPlay={() => trackEvent('demo_video_played', { offer: SLUG, demo_version: f.version })}
          />
          <div className="text-sm text-muted-foreground">
            <p className="text-foreground font-semibold mb-1">22-second walkthrough</p>
            <p>
              The same example as the sliders below: payroll starts in month 1, cash bottoms out in month 4,
              and the hire pays for itself in month 11. Then two assumptions that break it.
              Every number in the video comes from this demo&apos;s engine.
            </p>
          </div>
        </div>
      </GlassCard>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-1">Change the assumptions</h2>
          <p className="text-sm text-muted-foreground mb-6">The base case holds. Find the assumption that breaks it.</p>
          <div className="space-y-6">
            {(Object.keys(SLIDER_RANGE) as Lever[]).map((lever) => (
              <div key={lever} className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-foreground">{LEVER_LABEL[lever]}</label>
                  <span className="text-sm font-bold text-primary">{LEVER_FORMAT[lever](a[lever])}</span>
                </div>
                <Slider
                  value={[a[lever]]}
                  onValueChange={([v]) => update(lever, v)}
                  min={SLIDER_RANGE[lever].min}
                  max={SLIDER_RANGE[lever].max}
                  step={SLIDER_RANGE[lever].step}
                  className="w-full"
                  aria-label={LEVER_LABEL[lever]}
                />
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-lg border border-border p-3 text-sm text-muted-foreground">
            To cover this hire alone at {LEVER_FORMAT.grossMargin(a.grossMargin)} margin, the business needs{' '}
            <strong className="text-foreground">{fmtUsd(r.revenueToCoverHire)} of new revenue per month</strong>{' '}
            (≈ {r.clientsToCoverHire.toFixed(1)} clients): {LEVER_FORMAT.hireMonthlyCost(a.hireMonthlyCost)} ÷ {LEVER_FORMAT.grossMargin(a.grossMargin)}.
          </div>
          {touched && (
            <Button variant="outline" size="sm" className="mt-6" onClick={() => { setA(f.base); setTouched(false); }}>
              Reset to base case
            </Button>
          )}
        </GlassCard>

        <GlassCard className={`p-6 border-2 ${r.holds ? 'border-emerald-500/40' : 'border-destructive/40'}`}>
          <div className="flex items-center gap-2 mb-4">
            {r.holds
              ? <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              : <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />}
            <h2 className="text-lg font-semibold">{r.holds ? 'The business can carry this hire' : 'This hire is financially fragile'}</h2>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5 text-sm">
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs">Hire pays for itself</p>
              <p className="text-xl font-bold">{r.paybackMonth ? `Month ${r.paybackMonth}` : 'Not in 18 mo'}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs">Lowest cash</p>
              <p className="text-xl font-bold">{fmtUsd(r.lowestCash)}</p>
              <p className="text-xs text-muted-foreground">month {r.lowestCashMonth}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs">New hours fully used</p>
              <p className="text-xl font-bold">{firstFullMonth ? `Month ${firstFullMonth}` : 'Not in 18 mo'}</p>
            </div>
          </div>

          {!r.holds && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 mb-5 text-sm flex items-start gap-2">
              <TrendingDown className="h-4 w-4 mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
              <span>
                {r.failures.includes('cash_floor') && `Cash falls below the ${fmtUsd(f.criteria.cashFloor)} floor in month ${r.floorBreachMonth}. `}
                {r.failures.includes('payback_too_slow') && `The hire takes ${r.paybackMonth} months to pay for itself, past the ${f.criteria.maxPaybackMonths}-month limit. `}
                {r.failures.includes('no_payback') && 'The hire does not pay for itself within 18 months. '}
                Under these assumptions the business is carrying payroll ahead of demand for too long.
              </span>
            </div>
          )}

          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                <YAxis tickFormatter={fmtUsd} tick={{ fontSize: 11 }} width={58} />
                <Tooltip formatter={(v: number) => fmtUsd(v)} labelFormatter={(m) => `Month ${m}`} />
                <ReferenceLine y={f.criteria.cashFloor} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Cash floor', fontSize: 10, fill: '#ef4444' }} />
                <Line type="monotone" dataKey="With the hire" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Without the hire" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Without the hire the team stays capped at {currentCap} clients: new demand above that is not served.
          </p>
        </GlassCard>
      </section>

      <section className="py-10">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-1">What must be true for this hire to work?</h2>
          <p className="text-sm text-muted-foreground mb-5">Holding every other assumption at its current value, here is the boundary for each one.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {required.map((x) => {
              const cmp = HIRING_LEVER_SEARCH[x.lever].worseWhen === 'higher' ? '≤' : '≥';
              return (
                <div key={x.lever} className="rounded-lg border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{LEVER_LABEL[x.lever]}</p>
                  <p className="text-sm font-bold">
                    {x.threshold === null ? 'Never holds' : x.unbounded ? 'Holds across full range' : `${cmp} ${LEVER_FORMAT[x.lever](x.threshold)}`}
                  </p>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </section>

      <section className="pb-16 text-center">
        <p className="text-sm text-muted-foreground mb-4 max-w-2xl mx-auto">
          Quantis does not make the hiring decision for you. It shows the cash commitment, how long payroll runs ahead of demand,
          and which assumption the decision depends on most. Your own numbers will differ from this example.
        </p>
        <Link to="/decision-review" onClick={() => trackEvent('demo_cta_clicked', { offer: SLUG, demo_version: f.version })}>
          <Button size="lg" className="gap-2 py-6 px-8">
            Discuss my decision
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>
    </PublicPageShell>
  );
}
