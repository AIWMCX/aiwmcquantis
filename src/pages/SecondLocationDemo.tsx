import React, { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, AlertTriangle, CheckCircle2, Link2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageSEO } from '@/components/seo/PageSEO';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';
import { recordFunnelEvent, trackEvent } from '@/lib/analytics';
import {
  LOCATION_EXAMPLE,
  LOCATION_HORIZON,
  LOCATION_VERSION,
  decodeLocation,
  encodeLocation,
  runLocation,
  solveLocationRequiredToWork,
  validateLocation,
  type LocationField,
  type LocationInputs,
  type LocationLever,
} from '@/lib/demo/second-location-decision';

const SLUG = 'second_location';

const fmtUsd = (v: number) => {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

type Unit = 'usd' | 'count' | 'pct' | 'month';

const GROUPS: { title: string; fields: { key: LocationField; label: string; unit: Unit; hint?: string }[] }[] = [
  {
    title: 'Your first location today',
    fields: [
      { key: 'currentClients', label: 'Paying clients', unit: 'count' },
      { key: 'pricePerClient', label: 'Average revenue per client per month', unit: 'usd' },
      { key: 'grossMargin', label: 'Gross margin', unit: 'pct', hint: 'What is left after the direct cost of serving the client.' },
      { key: 'churnMonthly', label: 'Clients lost per month', unit: 'pct' },
      { key: 'newClientsPerMonth', label: 'New clients won per month', unit: 'count' },
      { key: 'capacityFirst', label: 'Most clients it can serve', unit: 'count', hint: 'Chairs, rooms, staff hours: the ceiling, not today’s count.' },
      { key: 'fixedCostsMonthly', label: 'Fixed costs per month', unit: 'usd' },
      { key: 'startingCash', label: 'Cash in the bank', unit: 'usd' },
    ],
  },
  {
    title: 'The second location',
    fields: [
      { key: 'openingCost', label: 'Opening cost (build-out, deposit, equipment)', unit: 'usd' },
      { key: 'extraFixedMonthly', label: 'Its fixed costs per month (rent, staff)', unit: 'usd' },
      { key: 'capacitySecond', label: 'Most clients it can serve', unit: 'count' },
      { key: 'newClientsSecond', label: 'New clients per month once running', unit: 'count' },
      { key: 'rampMonths', label: 'Months to reach that', unit: 'month' },
      { key: 'cannibalizationPct', label: 'Of those, would have come to you anyway', unit: 'pct', hint: 'Clients who live between the two. They are not extra.' },
      { key: 'judgeAtMonth', label: 'It must be paying off by month', unit: 'month' },
      { key: 'cashFloor', label: 'Cash must never drop below', unit: 'usd' },
    ],
  },
];

const UNIT_OF = Object.fromEntries(GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f.unit]))) as Record<LocationField, Unit>;
const SUFFIX: Record<Unit, string> = { usd: '$', count: '', pct: '%', month: '' };

const toDisplay = (u: Unit, v: number) => (u === 'pct' ? String(Math.round(v * 1000) / 10) : String(v));
function fromDisplay(u: Unit, s: string): number {
  const n = Number(s.replace(/[$,\s%+]/g, '').replace('−', '-'));
  if (s.trim() === '' || !Number.isFinite(n)) return Number.NaN;
  return u === 'pct' ? n / 100 : n;
}
const toDraft = (i: LocationInputs) =>
  Object.fromEntries(Object.entries(i).map(([k, v]) => [k, toDisplay(UNIT_OF[k as LocationField], v)])) as Record<LocationField, string>;

const LEVER_LABEL: Record<LocationLever, string> = {
  newClientsSecond: 'New clients per month at the second location',
  openingCost: 'Opening cost',
  cannibalizationPct: 'Would have come to you anyway',
  extraFixedMonthly: 'Its fixed costs per month',
};

function leverText(lever: LocationLever, v: number): string {
  switch (lever) {
    case 'newClientsSecond': return `At least ${v.toFixed(1)} a month`;
    case 'openingCost': return `At most ${fmtUsd(v)}`;
    case 'cannibalizationPct': return `At most ${(v * 100).toFixed(1)}%`;
    case 'extraFixedMonthly': return `At most ${fmtUsd(v)} a month`;
  }
}

export default function SecondLocationDemo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromLink = useMemo(() => {
    const d = decodeLocation(searchParams);
    return d && Object.keys(validateLocation(d)).length === 0 ? d : null;
    // Only the first URL matters; later URL updates come from this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [draft, setDraft] = useState<Record<LocationField, string>>(() => toDraft(fromLink ?? LOCATION_EXAMPLE));
  const [valid, setValid] = useState<LocationInputs>(fromLink ?? LOCATION_EXAMPLE);
  const [isOwn, setIsOwn] = useState(!!fromLink);
  const [copied, setCopied] = useState(false);
  const startedRef = useRef(false);

  const parsed = useMemo(
    () => Object.fromEntries(Object.entries(draft).map(([k, s]) => [k, fromDisplay(UNIT_OF[k as LocationField], s)])) as unknown as LocationInputs,
    [draft],
  );
  const errors = useMemo(() => validateLocation(parsed), [parsed]);

  if (!startedRef.current) {
    startedRef.current = true;
    trackEvent('demo_started', { offer: SLUG, demo_version: LOCATION_VERSION });
    recordFunnelEvent('open_the_hood_view', { surface: 'demo_second_location' });
    if (fromLink) recordFunnelEvent('second_location_run', { surface: 'demo_second_location', via: 'saved_link' });
  }

  function edit(key: LocationField, value: string) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    setCopied(false);
    const p = Object.fromEntries(Object.entries(next).map(([k, s]) => [k, fromDisplay(UNIT_OF[k as LocationField], s)])) as unknown as LocationInputs;
    if (Object.keys(validateLocation(p)).length === 0) {
      setValid(p);
      setSearchParams(new URLSearchParams(encodeLocation(p)), { replace: true });
      if (!isOwn) {
        setIsOwn(true);
        trackEvent('second_location_run', { offer: SLUG, field: key });
        recordFunnelEvent('second_location_run', { surface: 'demo_second_location', via: 'edit' });
      }
    }
  }

  function resetToExample() {
    setDraft(toDraft(LOCATION_EXAMPLE));
    setValid(LOCATION_EXAMPLE);
    setIsOwn(false);
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  async function copyLink() {
    const url = `${window.location.origin}/demo/second-location?${encodeLocation(valid)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackEvent('second_location_link_copied', { offer: SLUG });
    } catch {
      window.prompt('Copy this link to come back to your numbers:', url);
    }
  }

  const r = useMemo(() => runLocation(valid), [valid]);
  const required = useMemo(() => solveLocationRequiredToWork(valid), [valid]);
  const judgeMonth = Math.round(valid.judgeAtMonth);
  const floorBroken = r.lowestCash < valid.cashFloor;
  const behind = r.diffAtJudge < 0;
  const chartData = r.months.map((m) => ({
    month: m.month,
    'With the second location': Math.round(m.cashWith),
    'Without it': Math.round(m.cashWithout),
  }));

  return (
    <PublicPageShell active="pricing" backTo={{ href: '/decision-review', label: 'Back to Decision Review' }} maxWidth="lg">
      <PageSEO
        title="Second Location Decision — should you open another location? | AIWMC Quantis"
        description="Test a second location on your own numbers: opening cost, ramp-up and overlap, when it pays back, and the lowest your cash gets."
        canonical="/demo/second-location"
      />

      <section className="aiwmc-section-wash py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-4">
          {isOwn ? 'Your numbers · same engine as every Quantis Decision Run' : 'Second location · prefilled with an illustrative example'}
        </p>
        <SectionHeader
          title="Before you sign the lease, know the month a second location pays back."
          subtitle="It costs money up front, takes months to fill, and some of its clients would have come to you anyway. Put in your numbers: every result below recomputes with the same deterministic engine behind every Quantis Decision Run."
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold">{isOwn ? 'Your numbers' : 'Example numbers: replace with yours'}</h2>
            {isOwn && <Button variant="ghost" size="sm" onClick={resetToExample}>Back to the example</Button>}
          </div>
          <div className="space-y-6">
            {GROUPS.map((g) => (
              <fieldset key={g.title} className="space-y-3">
                <legend className="text-sm font-semibold text-foreground mb-1">{g.title}</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {g.fields.map((f) => {
                    const id = `loc-${f.key}`;
                    const err = errors[f.key];
                    return (
                      <div key={f.key} className="space-y-1">
                        <Label htmlFor={id} className="text-xs text-muted-foreground">
                          {f.label}{SUFFIX[f.unit] && ` (${SUFFIX[f.unit]})`}
                        </Label>
                        <Input
                          id={id}
                          inputMode="decimal"
                          value={draft[f.key]}
                          onChange={(e) => edit(f.key, e.target.value)}
                          aria-invalid={!!err}
                          aria-describedby={err ? `${id}-err` : f.hint ? `${id}-hint` : undefined}
                        />
                        {err
                          ? <p id={`${id}-err`} className="text-xs text-destructive">{err}</p>
                          : f.hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{f.hint}</p>}
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
          {Object.keys(errors).length > 0 && (
            <p className="mt-4 text-sm text-destructive" role="alert">Fix the highlighted fields; the result shows your last valid numbers.</p>
          )}
          {isOwn && (
            <Button variant="outline" size="sm" className="mt-5 gap-1" onClick={copyLink}>
              <Link2 className="h-4 w-4" aria-hidden="true" />
              {copied ? 'Link copied' : 'Copy link to this run'}
            </Button>
          )}
        </GlassCard>

        <GlassCard className={`p-6 border-2 ${r.holds ? 'border-emerald-500/40' : 'border-destructive/40'}`} aria-live="polite">
          <div className="flex items-center gap-2 mb-4">
            {r.holds
              ? <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              : <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />}
            <h2 className="text-lg font-semibold">
              {r.holds
                ? `The second location is ahead by month ${judgeMonth}`
                : floorBroken && !behind
                  ? `It pays back, but cash drops below ${fmtUsd(valid.cashFloor)} first`
                  : floorBroken
                    ? `Behind at month ${judgeMonth}, and cash drops below ${fmtUsd(valid.cashFloor)}`
                    : `The second location is behind at month ${judgeMonth}`}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5 text-sm">
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs">Cash vs. one location, month {judgeMonth}</p>
              <p className="text-xl font-bold">{fmtUsd(r.diffAtJudge)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs">Pays back from</p>
              <p className="text-xl font-bold">{r.paybackMonth ? `Month ${r.paybackMonth}` : `Not in ${LOCATION_HORIZON} mo`}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs">Lowest cash{r.lowestCashMonth ? `, month ${r.lowestCashMonth}` : ''}</p>
              <p className={`text-xl font-bold ${floorBroken ? 'text-destructive' : ''}`}>{fmtUsd(r.lowestCash)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 mb-5 text-sm text-muted-foreground">
            {r.firstFullMonth
              ? <>Without it, your first location is full by <strong className="text-foreground">month {r.firstFullMonth}</strong>: after that, extra demand is turned away.</>
              : <>Without it, your first location never fills up in {LOCATION_HORIZON} months: the second one is not relieving a capacity limit.</>}
          </div>

          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                <YAxis tickFormatter={fmtUsd} tick={{ fontSize: 11 }} width={58} />
                <Tooltip formatter={(v: number) => fmtUsd(v)} labelFormatter={(m) => `Month ${m}`} />
                <ReferenceLine y={valid.cashFloor} stroke="hsl(var(--destructive))" strokeDasharray="2 4" />
                <Line type="monotone" dataKey="With the second location" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Without it" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Cash in the bank, with and without the second location; the red line is your cash floor. Clients go to whichever location has room.
          </p>
        </GlassCard>
      </section>

      <section className="py-10">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-1">What must be true for it to pay off by month {judgeMonth}, above your cash floor?</h2>
          <p className="text-sm text-muted-foreground mb-5">Holding everything else at your numbers, here is the boundary for each guess.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {required.map((x) => (
              <div key={x.lever} className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">{LEVER_LABEL[x.lever]}</p>
                <p className="text-sm font-bold">
                  {x.threshold === null
                    ? 'Never pays off'
                    : x.unbounded
                      ? 'Pays off across the full range'
                      : leverText(x.lever, x.threshold)}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="pb-16 text-center">
        <p className="text-sm text-muted-foreground mb-4 max-w-2xl mx-auto">
          Quantis does not pick your location. It shows what opening it does to cash, when it pays back,
          and which guess the decision depends on most. Your inputs are not checked facts: the result is only as good as they are.
        </p>
        <Link to="/decision-review" onClick={() => trackEvent('demo_cta_clicked', { offer: SLUG, demo_version: LOCATION_VERSION })}>
          <Button size="lg" className="gap-2 py-6 px-8">
            Get a second opinion before you sign
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>
    </PublicPageShell>
  );
}
