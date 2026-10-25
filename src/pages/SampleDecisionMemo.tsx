import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';
import { recordFunnelEvent } from '@/lib/analytics';
import { ENGAGEMENT_OFFERS } from '@/config/engagement-offers';
import {
  HIRING_DEMO_FIXTURE,
  runHiringDemo,
  solveHiringRequiredToWork,
  type HiringDemoAssumptions,
  type HiringDemoResult,
} from '@/lib/demo/hiring-decision-demo';

/**
 * Sample Decision Memo — what a $349 Founder Decision Review delivers, shown
 * on the fictional hiring-demo business. Every number is computed here by the
 * same engine as /demo/hiring-decision; only the scenario inputs are chosen.
 */

const f = HIRING_DEMO_FIXTURE;
const REVIEW = ENGAGEMENT_OFFERS.find((o) => o.code === 'founder_decision_review')!;

export const MEMO_SCENARIOS: { key: string; label: string; a: HiringDemoAssumptions }[] = [
  { key: 'downside', label: 'Downside', a: { ...f.base, newClientsPerMonth: 0.75, collectionLagMonths: 2, grossMargin: 0.5 } },
  { key: 'base', label: 'Base', a: f.base },
  { key: 'upside', label: 'Upside', a: { ...f.base, newClientsPerMonth: 2.5, grossMargin: 0.58 } },
];

const usd = (v: number) => `${v < 0 ? '-' : ''}$${Math.round(Math.abs(v)).toLocaleString('en-US')}`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const lag = (v: number) => (Math.round(v) === 0 ? 'on delivery' : `${Math.round(v)} month${Math.round(v) === 1 ? '' : 's'} after the work`);

const verdict = (r: HiringDemoResult) => {
  if (r.holds) return 'Holds';
  const parts = [];
  if (r.failures.includes('cash_floor')) parts.push(`cash falls below ${usd(f.criteria.cashFloor)} in month ${r.floorBreachMonth}`);
  if (r.failures.includes('no_payback')) parts.push('the hire never pays back within 18 months');
  if (r.failures.includes('payback_too_slow')) parts.push(`payback slower than ${f.criteria.maxPaybackMonths} months`);
  return `Fails: ${parts.join('; ')}`;
};

// Thresholds are rounded toward the safe side, so the stated line always holds.
const LEVER_TEXT: Record<keyof HiringDemoAssumptions, (t: number) => string> = {
  newClientsPerMonth: (t) => `New clients won per month stay at or above ${(Math.ceil(t * 100) / 100).toFixed(2)} (assumed ${f.base.newClientsPerMonth}).`,
  hireMonthlyCost: (t) => `The hire's fully loaded cost stays at or below ${usd(Math.floor(t / 10) * 10)} a month (assumed ${usd(f.base.hireMonthlyCost)}).`,
  collectionLagMonths: (t) => `Clients pay no later than ${lag(t)} (assumed ${lag(f.base.collectionLagMonths)}).${Math.round(t) === Math.round(f.base.collectionLagMonths) ? ' No slack: one month later breaks the rule.' : ''}`,
  grossMargin: (t) => `Gross margin on client work stays at or above ${(Math.ceil(t * 1000) / 10).toFixed(1)}% (assumed ${pct(f.base.grossMargin)}).`,
};

export default function SampleDecisionMemo() {
  const results = useMemo(() => MEMO_SCENARIOS.map((s) => ({ ...s, r: runHiringDemo(s.a) })), []);
  const required = useMemo(() => solveHiringRequiredToWork(f.base), []);
  const base = results.find((s) => s.key === 'base')!.r;
  const downside = results.find((s) => s.key === 'downside')!.r;
  const fixedCosts = Object.values(f.fixedOpexMonthly).reduce((s, v) => s + v, 0);

  useEffect(() => {
    recordFunnelEvent('sample_view', { surface: 'decision_memo', demo_version: f.version });
  }, []);

  return (
    <PublicPageShell active="pricing" backTo={{ href: '/decision-review', label: 'Back to Decision Review' }} maxWidth="lg">
      <PageSEO
        title="Sample Decision Memo — what a Founder Decision Review delivers | AIWMC Quantis"
        description="A fictional, fully worked Decision Memo: the facts, assumptions and unknowns, three scenarios, the cash and payback reconciliation, and the assumptions that would change the decision."
        canonical="/demo/sample-decision-memo"
      />

      <section className="aiwmc-section-wash py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-4">Sample Decision Memo · fictional business</p>
        <SectionHeader
          title="Should the firm hire one more delivery person now?"
          subtitle={`This is the shape of what a $${REVIEW.price} Founder Decision Review delivers, worked through on a made-up services firm. The numbers are calculated by the same engine as the interactive hiring demo.`}
        />
      </section>

      <GlassCard className="p-5 mb-8 text-sm text-muted-foreground">
        <strong className="text-foreground">Fictional example.</strong> The business, owner and figures are invented to show the memo format. It is not a forecast, a client case or advice.
      </GlassCard>

      <article className="space-y-8 pb-12">
        <GlassCard className="p-6 md:p-8">
          <h2 className="text-xl font-semibold">1. The decision</h2>
          <p className="mt-3 text-muted-foreground">
            Hire one more delivery person at {usd(f.base.hireMonthlyCost)} a month fully loaded, plus {usd(f.hireOneTimeCost)} to recruit and onboard, or wait.
            The owner's rule: cash never drops below {usd(f.criteria.cashFloor)}, and the hire pays for itself within {f.criteria.maxPaybackMonths} months.
          </p>
        </GlassCard>

        <GlassCard className="p-6 md:p-8">
          <h2 className="text-xl font-semibold">2. Facts, assumptions and unknowns</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm">
            <div>
              <p className="font-semibold">Facts (supplied by the owner)</p>
              <ul className="mt-2 space-y-1 text-muted-foreground list-disc pl-4">
                <li>{f.startingClients} clients at {usd(f.avgMonthlyFee)} a month</li>
                <li>Team delivers {f.currentHoursMonthly} hours a month: full at {f.currentHoursMonthly / f.hoursPerClientMonthly} clients</li>
                <li>{usd(f.startingCash)} in the bank</li>
                <li>Fixed costs {usd(fixedCosts)} a month</li>
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">In a real review these are checked against statements and invoices.</p>
            </div>
            <div>
              <p className="font-semibold">Assumptions (estimates)</p>
              <ul className="mt-2 space-y-1 text-muted-foreground list-disc pl-4">
                <li>{f.base.newClientsPerMonth} new clients won per month</li>
                <li>Clients pay {lag(f.base.collectionLagMonths)}</li>
                <li>Gross margin {pct(f.base.grossMargin)}</li>
                <li>The hire adds {f.hireAddsHoursMonthly} client hours a month</li>
                <li>{pct(f.churnMonthly)} of clients leave each month</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Unknowns (not modeled)</p>
              <ul className="mt-2 space-y-1 text-muted-foreground list-disc pl-4">
                <li>How many weeks until the hire is fully productive</li>
                <li>Whether demand holds past the first six months</li>
                <li>Whether current clients would leave if service slips without the hire</li>
              </ul>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 md:p-8">
          <h2 className="text-xl font-semibold">3. Three scenarios</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 font-medium">Scenario</th>
                  <th className="py-2 pr-4 font-medium">New clients / mo</th>
                  <th className="py-2 pr-4 font-medium">Paid</th>
                  <th className="py-2 pr-4 font-medium">Margin</th>
                  <th className="py-2 pr-4 font-medium">Payback</th>
                  <th className="py-2 pr-4 font-medium">Lowest cash</th>
                  <th className="py-2 font-medium">Against the rule</th>
                </tr>
              </thead>
              <tbody>
                {results.map(({ key, label, a, r }) => (
                  <tr key={key} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-4 font-semibold">{label}</td>
                    <td className="py-2 pr-4">{a.newClientsPerMonth}</td>
                    <td className="py-2 pr-4">{lag(a.collectionLagMonths)}</td>
                    <td className="py-2 pr-4">{pct(a.grossMargin)}</td>
                    <td className="py-2 pr-4">{r.paybackMonth === null ? 'not within 18 months' : `month ${r.paybackMonth}`}</td>
                    <td className="py-2 pr-4">{usd(r.lowestCash)} (month {r.lowestCashMonth})</td>
                    <td className="py-2">{verdict(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard className="p-6 md:p-8">
          <h2 className="text-xl font-semibold">4. Cash, break-even and payback, reconciled</h2>
          <ul className="mt-3 space-y-2 text-muted-foreground text-sm">
            <li>To cover the hire alone, the firm needs {usd(base.revenueToCoverHire)} more revenue a month ({usd(f.base.hireMonthlyCost)} ÷ {pct(f.base.grossMargin)} margin), about {base.clientsToCoverHire.toFixed(1)} new clients at {usd(f.avgMonthlyFee)}.</li>
            <li>In the base case the hire's cumulative cash effect turns positive in month {base.paybackMonth ?? '—'}; the lowest balance is {usd(base.lowestCash)} in month {base.lowestCashMonth}.</li>
            <li>In the downside, {downside.floorBreachMonth ? `cash breaks the ${usd(f.criteria.cashFloor)} floor in month ${downside.floorBreachMonth}` : 'cash stays above the floor'}: slower wins and later payment tie up cash while payroll runs from day one.</li>
          </ul>
        </GlassCard>

        <GlassCard className="p-6 md:p-8">
          <h2 className="text-xl font-semibold">5. What would change the decision</h2>
          <p className="mt-2 text-sm text-muted-foreground">Each line is the point where the base case stops meeting the owner's rule, holding everything else fixed.</p>
          <ol className="mt-4 space-y-2 text-sm list-decimal pl-5">
            {required.map((q) => (
              <li key={q.lever}>
                {q.threshold === null ? `No value of ${q.lever} makes the plan hold.` : q.unbounded ? `${LEVER_TEXT[q.lever](q.threshold)} The plan holds across the whole tested range.` : LEVER_TEXT[q.lever](q.threshold)}
              </li>
            ))}
            <li>How fast the hire becomes productive. Not modeled here; in a real review it is asked at intake and tested as a scenario.</li>
          </ol>
        </GlassCard>

        <GlassCard className="p-6 md:p-8">
          <h2 className="text-xl font-semibold">6. Conclusion</h2>
          <p className="mt-3 text-muted-foreground">
            {base.holds && !downside.holds
              ? 'Conditional go. The hire meets the rule in the base and upside cases but not in the downside. Before committing, confirm the pipeline supports the new-client threshold above and that clients pay on current terms; review again after three months of actual wins.'
              : base.holds
                ? 'Go. The hire meets the rule in every scenario tested.'
                : 'Wait. The hire does not meet the rule in the base case.'}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Limitations: decision support based on supplied information and stated assumptions. Not accounting, tax, legal or investment advice, and not a guarantee of any outcome.
          </p>
        </GlassCard>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/decision-review" className="flex-1">
            <Button size="lg" className="w-full gap-2">Get this for your decision: ${REVIEW.price} <ArrowRight className="h-4 w-4" /></Button>
          </Link>
          <Link to="/demo/hiring-decision" className="flex-1">
            <Button size="lg" variant="outline" className="w-full gap-2"><FileText className="h-4 w-4" />Move the numbers yourself</Button>
          </Link>
        </div>
      </article>
    </PublicPageShell>
  );
}
