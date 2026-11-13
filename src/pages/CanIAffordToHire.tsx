import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageSEO } from '@/components/seo/PageSEO';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';
import { recordFunnelEvent, trackEvent } from '@/lib/analytics';
import { ENGAGEMENT_OFFER } from '@/config/engagement-offers';
import { encodeHiringOwn } from '@/lib/demo/hiring-own-numbers';
import {
  HIRE_AFFORD_EXAMPLE,
  runHireAfford,
  toHiringOwn,
  validateHireAfford,
  HIRE_AFFORD_FAQ as FAQ,
  type HireAffordField,
  type HireAffordInputs,
} from '@/lib/demo/hire-afford';

const SURFACE = 'can_i_afford_to_hire';

const usd = (v: number) => `${v < 0 ? '-' : ''}$${Math.round(Math.abs(v)).toLocaleString('en-US')}`;
const usdK = (v: number) => `${v < 0 ? '-' : ''}$${(Math.abs(v) / 1000).toFixed(1)}K`;

type Unit = 'usd' | 'pct' | 'months' | 'days';
interface FieldDef { key: HireAffordField; label: string; unit: Unit; hint?: string }

const MAIN: FieldDef[] = [
  { key: 'cashToday', label: 'Cash in the bank today', unit: 'usd' },
  { key: 'monthlyRevenue', label: 'Monthly revenue today', unit: 'usd' },
  { key: 'monthlyCosts', label: 'Monthly costs today, everything', unit: 'usd', hint: 'Payroll, rent, software, direct costs.' },
  { key: 'annualSalary', label: "The new employee's annual salary", unit: 'usd' },
  { key: 'newRevenueAtFull', label: 'Extra monthly revenue once they are fully busy', unit: 'usd', hint: 'What you can bill for their work at full capacity.' },
  { key: 'monthsToFull', label: 'Months until they are fully busy', unit: 'months' },
  { key: 'daysToGetPaid', label: 'Days until customers pay you', unit: 'days', hint: 'From doing the work to money in the bank.' },
];
const ADVANCED: FieldDef[] = [
  { key: 'grossMargin', label: 'Gross margin on extra sales', unit: 'pct', hint: 'Share of each extra sales dollar you keep after direct costs.' },
  { key: 'employerCostPct', label: 'Payroll taxes, insurance and benefits', unit: 'pct', hint: 'On top of salary. Ask your payroll provider for your real figure.' },
  { key: 'oneTimeCost', label: 'One-time hiring cost', unit: 'usd', hint: 'Recruiting, equipment, onboarding.' },
  { key: 'safetyFloor', label: 'Lowest bank balance you accept', unit: 'usd' },
];
const SUFFIX: Record<Unit, string> = { usd: '$', pct: '%', months: 'months', days: 'days' };

const toDisplay = (u: Unit, v: number) => String(u === 'pct' ? Math.round(v * 1000) / 10 : v);
const fromDisplay = (u: Unit, s: string) => {
  const n = Number(s.replace(/[$,\s]/g, ''));
  if (s.trim() === '' || !Number.isFinite(n)) return Number.NaN;
  return u === 'pct' ? n / 100 : n;
};
const ALL = [...MAIN, ...ADVANCED];
const unitOf = Object.fromEntries(ALL.map((f) => [f.key, f.unit])) as Record<HireAffordField, Unit>;
const toDraft = (i: HireAffordInputs) =>
  Object.fromEntries(ALL.map((f) => [f.key, toDisplay(f.unit, i[f.key])])) as Record<HireAffordField, string>;

const VERDICT = {
  affordable: { label: 'Yes, on these numbers', tone: 'text-emerald-400' },
  tight: { label: 'Cash holds, but payback is slow', tone: 'text-amber-400' },
  not_yet: { label: 'Not yet, on these numbers', tone: 'text-rose-400' },
} as const;

export default function CanIAffordToHire() {
  const [inputs, setInputs] = useState<HireAffordInputs>(HIRE_AFFORD_EXAMPLE);
  const [draft, setDraft] = useState(() => toDraft(HIRE_AFFORD_EXAMPLE));
  const [errors, setErrors] = useState<Partial<Record<HireAffordField, string>>>({});
  const [isExample, setIsExample] = useState(true);

  const r = useMemo(() => runHireAfford(inputs), [inputs]);
  const fasterPay = useMemo(
    () => (inputs.daysToGetPaid >= 30 ? runHireAfford({ ...inputs, daysToGetPaid: inputs.daysToGetPaid - 30 }) : null),
    [inputs],
  );
  const chart = r.engine.months.map((m) => ({ month: m.month, withHire: Math.round(m.cashWith), withoutHire: Math.round(m.cashWithout) }));
  const v = VERDICT[r.verdict];
  const fullModel = `/demo/hiring-decision?${encodeHiringOwn(toHiringOwn(inputs))}`;
  const review = ENGAGEMENT_OFFER.founderReview;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Object.fromEntries(ALL.map((f) => [f.key, fromDisplay(f.unit, draft[f.key])])) as unknown as HireAffordInputs;
    const errs = validateHireAfford(parsed);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setInputs(parsed);
    setIsExample(false);
    trackEvent('hiring_own_run', { offer: SURFACE });
    recordFunnelEvent('hiring_own_run', { surface: SURFACE, via: 'calculator' });
  }

  const field = (f: FieldDef) => {
    const id = `afford-${f.key}`;
    const err = errors[f.key];
    return (
      <div key={f.key} className="space-y-1">
        <Label htmlFor={id} className="text-xs text-muted-foreground">{f.label} ({SUFFIX[f.unit]})</Label>
        <Input
          id={id}
          inputMode="decimal"
          value={draft[f.key]}
          onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
          aria-invalid={!!err}
          aria-describedby={err ? `${id}-err` : f.hint ? `${id}-hint` : undefined}
        />
        {err
          ? <p id={`${id}-err`} className="text-xs text-destructive">{err}</p>
          : f.hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{f.hint}</p>}
      </div>
    );
  };

  return (
    <PublicPageShell>
      <PageSEO
        title="Can I Afford to Hire an Employee? Free Calculator | AIWMC Quantis"
        description="Free calculator: see the month your bank balance hits bottom after a new hire, when the hire pays for itself, and what changes the answer. No account."
        canonical="/can-i-afford-to-hire"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
        }}
      />

      <section className="aiwmc-section-wash py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-4">Free · 60 seconds · no account</p>
        <SectionHeader
          titleAs="h1"
          title="Can I afford to hire an employee?"
          subtitle="Annual profit can cover a salary while your bank balance still hits bottom months later. Payroll starts on day one, the new person takes months to get fully busy, and customers pay you later. This calculator shows the month your cash is lowest, before you sign the offer letter."
        />
      </section>

      <GlassCard className="p-5 md:p-6 mb-6">
        <form onSubmit={submit} noValidate aria-label="Can I afford to hire calculator">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{MAIN.map(field)}</div>
          <details className="mt-5">
            <summary className="cursor-pointer text-sm text-muted-foreground">Advanced assumptions (prefilled, editable)</summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">{ADVANCED.map(field)}</div>
          </details>
          {Object.keys(errors).length > 0 && (
            <p className="mt-4 text-sm text-destructive" role="alert">Fix the highlighted fields to run the numbers.</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit">Check my hire</Button>
            {!isExample && (
              <Button type="button" variant="ghost" onClick={() => { setInputs(HIRE_AFFORD_EXAMPLE); setDraft(toDraft(HIRE_AFFORD_EXAMPLE)); setErrors({}); setIsExample(true); }}>
                Back to the example
              </Button>
            )}
          </div>
        </form>
      </GlassCard>

      <GlassCard className="p-5 md:p-6 mb-6" aria-live="polite">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
          {isExample ? 'Illustrative example, not your business' : 'Your numbers'}
        </p>
        <p className={`text-2xl font-semibold mb-4 ${v.tone}`}>{v.label}</p>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Lowest bank balance</dt>
            <dd className="text-xl font-semibold text-foreground">{usd(r.lowestCash)}</dd>
            <dd className="text-muted-foreground">in month {r.lowestCashMonth}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">The hire pays for itself</dt>
            <dd className="text-xl font-semibold text-foreground">{r.paybackMonth ? `Month ${r.paybackMonth}` : 'Not within 18 months'}</dd>
            <dd className="text-muted-foreground">in cash, against not hiring</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Real monthly cost of the hire</dt>
            <dd className="text-xl font-semibold text-foreground">{usd(r.monthlyCost)}</dd>
            <dd className="text-muted-foreground">they must bring {usd(r.revenueToCoverHire)}/mo in sales to cover it</dd>
          </div>
        </dl>
        {r.floorBreachMonth !== null && (
          <p className="mt-4 text-sm text-rose-300">
            Cash drops below {usd(inputs.safetyFloor)} in month {r.floorBreachMonth}.
            {r.floorBreachWithoutHireMonth !== null && ` It does so in month ${r.floorBreachWithoutHireMonth} even without the hire, so the hire is not the only problem.`}
          </p>
        )}
        {fasterPay && fasterPay.verdict !== r.verdict && (
          <p className="mt-3 text-sm text-muted-foreground">
            What changes the answer: if customers paid {inputs.daysToGetPaid - 30} days after the work instead of {inputs.daysToGetPaid}, the lowest balance would be {usd(fasterPay.lowestCash)} and the verdict would be "{VERDICT[fasterPay.verdict].label.toLowerCase()}".
          </p>
        )}

        <div className="h-64 mt-6" role="img" aria-label="Bank balance by month, with and without the hire">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={usdK} tick={{ fontSize: 11 }} width={56} />
              <Tooltip formatter={(val: number) => usd(val)} labelFormatter={(m) => `Month ${m}`} />
              <Legend />
              <ReferenceLine y={inputs.safetyFloor} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="withHire" name="With the hire" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="withoutHire" name="Without the hire" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          18 months, same deterministic engine as every Quantis Decision Run. Your inputs are not checked facts; the result is only as good as they are.
          {isExample && ' Example: a services business with $54,000 monthly revenue, $30,000 in the bank, hiring at $62,000 a year, customers paying in 60 days.'}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="outline" className="gap-1">
            <Link to={fullModel} onClick={() => trackEvent('hire_afford_full_model', { offer: SURFACE })}>
              Open the full model with these numbers <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </GlassCard>

      <GlassCard className="p-5 md:p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">Need this for your bank, partner or board?</h2>
        <p className="text-sm text-muted-foreground mb-4">
          The {review.name} ({`$${review.price}`}, one time) turns this one decision into a written memo you can show someone else:
          a 30-minute intake with the founder, base, downside and upside cases, cash, break-even and payback reconciled, and the assumptions that would change the decision.
        </p>
        <Button asChild className="gap-1">
          <Link to="/decision-review" onClick={() => trackEvent('hire_afford_review_click', { offer: SURFACE })}>
            See the {review.name} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </GlassCard>

      <section className="mb-12 space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Why a hire you can afford on paper can still run you out of cash</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          <li><strong className="text-foreground">Payroll starts on day one.</strong> The new person is paid from the first month, before they bring in their full share of sales.</li>
          <li><strong className="text-foreground">They take months to get fully busy.</strong> Clients and work fill the new capacity gradually.</li>
          <li><strong className="text-foreground">Customers pay later.</strong> If clients pay 60 days after the work, the money for this month's work arrives two months from now, while payroll goes out every month.</li>
          <li><strong className="text-foreground">Salary is not the whole cost.</strong> Payroll taxes, insurance and benefits come on top. Use your payroll provider's figure.</li>
        </ul>
        <h2 className="text-xl font-semibold text-foreground">Questions</h2>
        <div className="space-y-4">
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <h3 className="text-sm font-semibold text-foreground">{q}</h3>
              <p className="text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          <Link className="underline" to="/demo/price-change">Price change decision</Link> · <Link className="underline" to="/demo/second-location">Second location decision</Link> · <Link className="underline" to="/decision-review">Founder Decision Review</Link>
        </p>
      </section>
    </PublicPageShell>
  );
}
