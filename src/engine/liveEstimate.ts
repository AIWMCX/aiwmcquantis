/**
 * Pure, synchronous, zero-network live-estimate compute.
 *
 * Why this exists (mega prompt Fix #2 sub-bug B): the "LIVE ESTIMATE" sidebar
 * used to invoke the `analyze-business` edge function on every keystroke,
 * burning the user's rate-limit budget before they ever clicked
 * "Start Analysis". Wire this function into the sidebar via
 *   const estimate = useMemo(() => computeLiveEstimate(formState), [formState])
 * and you get an instant preview with zero network calls.
 *
 * This is NOT a substitute for the real deterministic engine. It is a
 * first-order sketch suitable for steering input.
 */

export type AnalysisFormState = {
  expectedCustomers?: number | null;
  pricePerUnit?: number | null;
  cogsPercent?: number | null; // 0.0 – 1.0
  monthlyOpex?: number | null;
  [k: string]: unknown;
};

export interface LiveEstimate {
  monthlyRevenue: number;
  month12Profit: number;
  grossMarginPct: number; // 0.0 – 1.0
  analysisDepth: 'surface' | 'standard' | 'deep';
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function computeLiveEstimate(form: AnalysisFormState): LiveEstimate {
  const customers = num(form.expectedCustomers);
  const price = num(form.pricePerUnit);
  const cogsPct = num(form.cogsPercent, 0.4);
  const opex = num(form.monthlyOpex);

  const monthlyRevenue = customers * price;
  const grossProfit = monthlyRevenue * (1 - cogsPct);
  const month12Profit = grossProfit - opex;
  const grossMarginPct = monthlyRevenue > 0 ? grossProfit / monthlyRevenue : 0;

  const filledFields = Object.values(form).filter(
    (v) => v !== null && v !== undefined && v !== '',
  ).length;
  const analysisDepth: LiveEstimate['analysisDepth'] =
    filledFields >= 10 ? 'deep' : filledFields >= 6 ? 'standard' : 'surface';

  return { monthlyRevenue, month12Profit, grossMarginPct, analysisDepth };
}
