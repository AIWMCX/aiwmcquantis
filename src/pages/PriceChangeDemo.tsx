import React, { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, AlertTriangle, CheckCircle2, Link2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageSEO } from '@/components/seo/PageSEO';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';
import { recordFunnelEvent, trackEvent } from '@/lib/analytics';
import {
  PRICE_CHANGE_EXAMPLE,
  PRICE_CHANGE_VERSION,
  PRICE_HORIZON,
  decodePriceChange,
  encodePriceChange,
  runPriceChange,
  solvePriceRequiredToWork,
  validatePriceChange,
  type PriceChangeInputs,
  type PriceField,
  type PriceLever,
} from '@/lib/demo/price-change-decision';

const SLUG = 'price_change';

const fmtUsd = (v: number) => {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};
const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(Math.abs(v) < 0.1 ? 1 : 0)}%`;

type Unit = 'usd' | 'count' | 'pct' | 'signedPct' | 'month';

const GROUPS: { title: string; fields: { key: PriceField; label: string; unit: Unit; hint?: string }[] }[] = [
  {
    title: 'Your business today',
    fields: [
      { key: 'currentClients', label: 'Paying clients', unit: 'count' },
      { key: 'currentPrice', label: 'Average price per client per month', unit: 'usd' },
      { key: 'grossMargin', label: 'Gross margin at today’s price', unit: 'pct', hint: 'What is left of the price after the direct cost of serving the client.' },
      { key: 'churnMonthly', label: 'Clients lost per month', unit: 'pct' },
      { key: 'newClientsPerMonth', label: 'New clients won per month', unit: 'count' },
      { key: 'fixedCostsMonthly', label: 'Fixed costs per month', unit: 'usd' },
      { key: 'startingCash', label: 'Cash in the bank', unit: 'usd' },
    ],
  },
  {
    title: 'The change',
    fields: [
      { key: 'priceChangePct', label: 'Price change', unit: 'signedPct', hint: '15 for +15%, −10 for a 10% cut.' },
      { key: 'clientsLostPct', label: 'Clients who leave because of it', unit: 'pct', hint: 'Your best guess. The page shows how many you can afford to lose.' },
      { key: 'newClientChangePct', label: 'Change in new clients won', unit: 'signedPct', hint: '−10 for 10% fewer, 30 for 30% more.' },
      { key: 'judgeAtMonth', label: 'It must be paying off by month', unit: 'month' },
    ],
  },
];

const UNIT_OF = Object.fromEntries(GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f.unit]))) as Record<PriceField, Unit>;
const SUFFIX: Record<Unit, string> = { usd: '$', count: '', pct: '%', signedPct: '%', month: '' };

const toDisplay = (u: Unit, v: number) => (u === 'pct' || u === 'signedPct' ? String(Math.round(v * 1000) / 10) : String(v));
function fromDisplay(u: Unit, s: string): number {
  const n = Number(s.replace(/[$,\s%+]/g, '').replace('−', '-'));
  if (s.trim() === '' || !Number.isFinite(n)) return Number.NaN;
  return u === 'pct' || u === 'signedPct' ? n / 100 : n;
}
const toDraft = (i: PriceChangeInputs) =>
  Object.fromEntries(Object.entries(i).map(([k, v]) => [k, toDisplay(UNIT_OF[k as PriceField], v)])) as Record<PriceField, string>;

const LEVER_LABEL: Record<PriceLever, string> = {
  clientsLostPct: 'Clients who leave because of it',
  newClientChangePct: 'Change in new clients won',
};

export default function PriceChangeDemo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromLink = useMemo(() => {
    const d = decodePriceChange(searchParams);
    return d && Object.keys(validatePriceChange(d)).length === 0 ? d : null;
    // Only the first URL matters; later URL updates come from this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [draft, setDraft] = useState<Record<PriceField, string>>(() => toDraft(fromLink ?? PRICE_CHANGE_EXAMPLE));
  const [valid, setValid] = useState<PriceChangeInputs>(fromLink ?? PRICE_CHANGE_EXAMPLE);
  const [isOwn, setIsOwn] = useState(!!fromLink);
  const [copied, setCopied] = useState(false);
  const startedRef = useRef(false);

  const parsed = useMemo(
    () => Object.fromEntries(Object.entries(draft).map(([k, s]) => [k, fromDisplay(UNIT_OF[k as PriceField], s)])) as unknown as PriceChangeInputs,
    [draft],
  );
  const errors = useMemo(() => validatePriceChange(parsed), [parsed]);

  if (!startedRef.current) {
    startedRef.current = true;
    trackEvent('demo_started', { offer: SLUG, demo_version: PRICE_CHANGE_VERSION });
    recordFunnelEvent('open_the_hood_view', { surface: 'demo_price_change' });
    if (fromLink) recordFunnelEvent('price_change_run', { surface: 'demo_price_change', via: 'saved_link' });
  }

  function edit(key: PriceField, value: string) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    setCopied(false);
    const p = Object.fromEntries(Object.entries(next).map(([k, s]) => [k, fromDisplay(UNIT_OF[k as PriceField], s)])) as unknown as PriceChangeInputs;
    if (Object.keys(validatePriceChange(p)).length === 0) {
      setValid(p);
      setSearchParams(new URLSearchParams(encodePriceChange(p)), { replace: true });
      if (!isOwn) {
        setIsOwn(true);
        trackEvent('price_change_run', { offer: SLUG, field: key });
        recordFunnelEvent('price_change_run', { surface: 'demo_price_change', via: 'edit' });
      }
    }
  }

  function resetToExample() {
    setDraft(toDraft(PRICE_CHANGE_EXAMPLE));
    setValid(PRICE_CHANGE_EXAMPLE);
    setIsOwn(false);
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  async function copyLink() {
    const url = `${window.location.origin}/demo/price-change?${encodePriceChange(valid)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackEvent('price_change_link_copied', { offer: SLUG });
    } catch {
      window.prompt('Copy this link to come back to your numbers:', url);
    }
  }

  const r = useMemo(() => runPriceChange(valid), [valid]);
  const required = useMemo(() => solvePriceRequiredToWork(valid), [valid]);
  const judgeMonth = Math.round(valid.judgeAtMonth);
  const raise = valid.priceChangePct > 0;
  const chartData = r.months.map((m) => ({
    month: m.month,
    'With the change': Math.round(m.cashWith),
    'Without it': Math.round(m.cashWithout),
  }));

  return (
    <PublicPageShell active="pricing" backTo={{ href: '/decision-review', label: 'Back to Decision Review' }} maxWidth="lg">
      <PageSEO
        title="Price Change Decision — should you raise your prices? | AIWMC Quantis"
        description="Test a price change on your own numbers: how many clients you can afford to lose, when it pays off, and cash with and without it."
        canonical="/demo/price-change"
      />

      <section className="aiwmc-section-wash py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-4">
          {isOwn ? 'Your numbers · same engine as every Quantis Decision Run' : 'Price change · prefilled with an illustrative example'}
        </p>
        <SectionHeader
          titleAs="h1"
          title="Before you change your price, know how many clients you can afford to lose."
          subtitle="A price rise earns more per client and may cost some clients. Put in your numbers: every result below recomputes with the same deterministic engine behind every Quantis Decision Run."
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
                    const id = `price-${f.key}`;
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
                ? `The ${fmtPct(valid.priceChangePct)} change is ahead by month ${judgeMonth}`
                : `The ${fmtPct(valid.priceChangePct)} change is behind at month ${judgeMonth}`}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5 text-sm">
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs">Cash vs. no change, month {judgeMonth}</p>
              <p className="text-xl font-bold">{fmtUsd(r.diffAtJudge)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs">Month {PRICE_HORIZON}</p>
              <p className="text-xl font-bold">{fmtUsd(r.diffAtHorizon)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs">Ahead for good from</p>
              <p className="text-xl font-bold">{r.aheadFromMonth ? `Month ${r.aheadFromMonth}` : `Not in ${PRICE_HORIZON} mo`}</p>
            </div>
          </div>

          {raise && Number.isFinite(r.breakEvenClientLossPct) && (
            <div className="rounded-lg border border-border p-3 mb-5 text-sm text-muted-foreground">
              Rule of thumb: at {(valid.grossMargin * 100).toFixed(0)}% margin, a {fmtPct(valid.priceChangePct)} price earns the same gross profit
              even if you lose <strong className="text-foreground">{(r.breakEvenClientLossPct * 100).toFixed(1)}% of clients</strong>{' '}
              ({fmtPct(valid.priceChangePct).replace('+', '')} ÷ ({(valid.grossMargin * 100).toFixed(0)}% + {fmtPct(valid.priceChangePct).replace('+', '')})).
              You assumed {(valid.clientsLostPct * 100).toFixed(1)}%.
            </div>
          )}

          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                <YAxis tickFormatter={fmtUsd} tick={{ fontSize: 11 }} width={58} />
                <Tooltip formatter={(v: number) => fmtUsd(v)} labelFormatter={(m) => `Month ${m}`} />
                <Line type="monotone" dataKey="With the change" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Without it" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Cash in the bank, with and without the change. Serving a client costs the same after the change, so the margin per client moves with the price.
          </p>
        </GlassCard>
      </section>

      <section className="py-10">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-1">What must be true for this change to pay off by month {judgeMonth}?</h2>
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
                      : x.lever === 'clientsLostPct'
                        ? `At most ${(x.threshold * 100).toFixed(1)}% leave`
                        : `At least ${fmtPct(x.threshold)} new clients`}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="pb-16 text-center">
        <p className="text-sm text-muted-foreground mb-4 max-w-2xl mx-auto">
          Quantis does not set your price. It shows what the change does to cash, how many clients you can afford to lose,
          and which guess the decision depends on most. Your inputs are not checked facts: the result is only as good as they are.
        </p>
        <Link to="/decision-review" onClick={() => trackEvent('demo_cta_clicked', { offer: SLUG, demo_version: PRICE_CHANGE_VERSION })}>
          <Button size="lg" className="gap-2 py-6 px-8">
            Get a second opinion on this change
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>
    </PublicPageShell>
  );
}
