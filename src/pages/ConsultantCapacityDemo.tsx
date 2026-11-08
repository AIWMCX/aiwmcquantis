import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { PageSEO } from '@/components/seo/PageSEO';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';
import { recordFunnelEvent, trackEvent } from '@/lib/analytics';
import {
  CONSULTANT_DEMO_FIXTURE,
  runConsultantDemo,
  type ConsultantDemoAssumptions,
} from '@/lib/demo/consultant-capacity-demo';

const fmtUsd = (v: number) => {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

const LEVER_LABEL: Record<keyof ConsultantDemoAssumptions, string> = {
  claimedMonthlyDemand: 'Client claims new customers / month',
  hoursPerCustomer: 'Hours to serve one customer / month',
  availableHoursMonthly: 'Hours your team actually has / month',
};

const LEVER_FORMAT: Record<keyof ConsultantDemoAssumptions, (v: number) => string> = {
  claimedMonthlyDemand: (v) => `${v.toFixed(0)}/mo`,
  hoursPerCustomer: (v) => `${v.toFixed(0)} hrs`,
  availableHoursMonthly: (v) => `${v.toFixed(0)} hrs`,
};

const SLIDER_RANGE: Record<keyof ConsultantDemoAssumptions, { min: number; max: number; step: number }> = {
  claimedMonthlyDemand: { min: 1, max: 60, step: 1 },
  hoursPerCustomer: { min: 5, max: 100, step: 1 },
  availableHoursMonthly: { min: 200, max: 2000, step: 20 },
};

export default function ConsultantCapacityDemo() {
  const fixture = CONSULTANT_DEMO_FIXTURE;
  const [assumptions, setAssumptions] = useState<ConsultantDemoAssumptions>(fixture.base);
  const [touched, setTouched] = useState(false);
  const startedRef = React.useRef(false);

  if (!startedRef.current) {
    startedRef.current = true;
    trackEvent('demo_started', { offer: 'consultant_founding_pilot', demo_version: fixture.version });
    recordFunnelEvent('open_the_hood_view', { surface: 'demo_consultant_capacity' });
  }

  const result = useMemo(() => runConsultantDemo(assumptions, fixture), [assumptions, fixture]);

  function updateLever(lever: keyof ConsultantDemoAssumptions, value: number) {
    setAssumptions((prev) => ({ ...prev, [lever]: value }));
    if (!touched) {
      setTouched(true);
      trackEvent('demo_model_broken', { offer: 'consultant_founding_pilot', lever, demo_version: fixture.version });
    } else {
      trackEvent('demo_assumption_changed', { offer: 'consultant_founding_pilot', lever });
    }
  }

  function resetToBase() {
    setAssumptions(fixture.base);
    setTouched(false);
  }

  const chartData = result.months
    .filter((m) => m.month % 3 === 0 || m.month === 1)
    .map((m) => ({
      month: `M${m.month}`,
      'Client claims': Math.round(m.demandCustomers),
      'You can actually serve': Math.round(m.servedCustomers),
    }));

  return (
    <PublicPageShell active="pricing" backTo={{ href: '/decision-review', label: 'Back to Decision Review' }} maxWidth="lg">
      <PageSEO
        title="Interactive Demo — AIWMC Quantis Consultant Founding Pilot"
        description="See the gap every consulting engagement hides: what a client says they can bring in per month versus what your team can actually deliver."
        canonical="/demo/consultant-founding-pilot"
      />

      <section className="aiwmc-section-wash py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-4">Interactive demo · fixed example, not your business</p>
        <SectionHeader
          titleAs="h1"
          title="Your client says 30 new customers a month. Can you actually serve that many?"
          subtitle="Same deterministic engine behind every Quantis Decision Run, applied to a services business with a fixed delivery capacity. Move a slider and watch the gap between claimed demand and real capacity recompute live."
        />
      </section>

      <GlassCard className="p-5 mb-6 text-sm text-muted-foreground">
        <strong className="text-foreground">Illustrative Quantis demonstration.</strong> Values are a fixed example services business, not a forecast for your business. Company: {fixture.startingCustomers} existing customers already consuming capacity, ${fixture.avgTicketSize}/mo average ticket, {Math.round(fixture.grossMargin * 100)}% gross margin.
      </GlassCard>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-1">Reconcile the claim</h2>
          <p className="text-sm text-muted-foreground mb-6">Change what the client claims, or what your team can actually deliver, and see where the story breaks.</p>
          <div className="space-y-6">
            {(Object.keys(SLIDER_RANGE) as (keyof ConsultantDemoAssumptions)[]).map((lever) => (
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

        <GlassCard className={`p-6 border-2 ${result.capacityBinds ? 'border-destructive/40' : 'border-emerald-500/40'}`}>
          <div className="flex items-center gap-2 mb-4">
            {result.capacityBinds ? (
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            )}
            <h2 className="text-lg font-semibold">
              {result.capacityBinds ? 'The claim exceeds real capacity' : 'The claim fits inside real capacity'}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs">Max customers you can serve</p>
              <p className="text-xl font-bold">{result.maxServableCustomers.toFixed(0)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs">Hours short / month</p>
              <p className="text-xl font-bold">{result.hoursGap.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">including {fixture.startingCustomers} existing customers</p>
            </div>
          </div>

          {result.capacityBinds && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 mb-5 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
              <span>
                By month 12, the plan counts {result.months[11].demandCustomers.toFixed(0)} customers but the team can only serve {result.months[11].servedCustomers.toFixed(0)} — {fmtUsd(result.year1RevenueGap)} in revenue this plan is counting on but cannot actually deliver.
              </span>
            </div>
          )}

          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={36} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Client claims" fill="hsl(var(--muted-foreground))" opacity={0.5} />
                <Bar dataKey="You can actually serve" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </section>

      <section className="py-10">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-1">Why this happens every time</h2>
          <p className="text-sm text-muted-foreground">
            A claimed growth number and your team's real delivery capacity are two different numbers, computed two different ways — nobody reconciles them until the customers show up. Quantis runs the reconciliation on the same engine as your P&amp;L, every month, before you sign the engagement.
          </p>
        </GlassCard>
      </section>

      <section className="pb-16 text-center">
        <p className="text-sm text-muted-foreground mb-4">Quantis does not tell you to turn the client down. It shows exactly how much of the plan your current capacity cannot support.</p>
        <Link
          to="/decision-review"
          onClick={() => trackEvent('demo_cta_clicked', { offer: 'consultant_founding_pilot', demo_version: fixture.version })}
        >
          <Button size="lg" className="gap-2 py-6 px-8">
            See the $499 Consultant Founding Pilot
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>
    </PublicPageShell>
  );
}
