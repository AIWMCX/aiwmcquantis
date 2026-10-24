import { useEffect, useState } from 'react';
import type { MonteCarloResult } from '@/lib/monte-carlo';
import { computeProfitRange, PROFIT_RANGE_ASSUMPTIONS } from '@/lib/profit-range';
import { MONTE_CARLO_ITERATIONS } from '@/config/canonical-facts';

const usd = (v: number) => `${v < 0 ? '−' : ''}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`;
const pct = (f: number) => `${Math.round(f * 100)}%`;

/**
 * P10 / median / P90 monthly profit from a seeded Monte Carlo over the
 * report's own monthly revenue and costs. Assumptions are printed with it.
 */
export function ProfitRangeCard({ monthlyRevenue, monthlyCosts, seedKey }: { monthlyRevenue: number; monthlyCosts: number; seedKey: string }) {
  const [mc, setMc] = useState<MonteCarloResult | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMc(null);
    computeProfitRange({ monthlyRevenue, monthlyCosts, seedKey })
      .then((r) => { if (!cancelled) setMc(r); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [monthlyRevenue, monthlyCosts, seedKey]);

  if (failed) return null;
  const { revenue, costs } = PROFIT_RANGE_ASSUMPTIONS;

  return (
    <section className="q-card p-5" aria-labelledby="profit-range-heading" data-testid="profit-range-card">
      <h3 id="profit-range-heading" className="font-semibold text-foreground">Monthly profit range</h3>
      <p className="text-xs text-muted-foreground mt-1">
        {MONTE_CARLO_ITERATIONS.toLocaleString('en-US')} simulated months (Monte Carlo) around your numbers.
      </p>
      {!mc ? (
        <p className="text-sm text-muted-foreground mt-4" role="status">Simulating…</p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Low (P10)</dt>
              <dd className="text-lg font-semibold tabular-nums text-foreground">{usd(mc.p10)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Typical (median)</dt>
              <dd className="text-lg font-semibold tabular-nums text-foreground">{usd(mc.median)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">High (P90)</dt>
              <dd className="text-lg font-semibold tabular-nums text-foreground">{usd(mc.p90)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-foreground">
            Profitable in <span className="font-semibold tabular-nums">{Math.round(mc.probabilityPositive)}%</span> of simulated months.
          </p>
        </>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Assumptions: revenue varies {pct(revenue.min)}–{pct(revenue.max)} and costs {pct(costs.min)}–{pct(costs.max)} of the figures above
        (triangular, most likely at your figure). Seeded, so this report always shows the same range. It describes
        month-to-month variation in these two inputs only, not every risk.
      </p>
    </section>
  );
}
