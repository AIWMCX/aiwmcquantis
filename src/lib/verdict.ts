/**
 * Computes a single-line verdict headline from a BusinessAnalysisResult.
 * The verdict is the FIRST thing a visitor sees on the result page —
 * it must be brutally honest, scannable, and tied to actual numbers.
 */

import type { BusinessAnalysisResult } from '@/types/analysis';
import { getMonthlyProfit, getPaybackMonths } from '@/types/analysis';

export type VerdictTone = 'pass' | 'caution' | 'fail';

export interface Verdict {
  tone: VerdictTone;
  headline: string;        // 32px, single line
  subline: string;         // supporting numbers
  toneColor: string;       // CSS color token
  toneLabel: string;       // chip label
}

export function computeVerdict(result: BusinessAnalysisResult): Verdict {
  const fa = result.financial_analysis;
  const monthly = getMonthlyProfit(fa) ?? 0;
  const payback = getPaybackMonths(fa) ?? 999;
  const ltvCac = fa.unit_economics?.ltv_cac_ratio ?? 0;
  const confidence = result.confidence_score ?? 0;

  const isFail =
    monthly <= 0 ||
    payback >= 36 ||
    (ltvCac > 0 && ltvCac < 1.5);

  const isPass =
    monthly > 0 &&
    payback > 0 && payback <= 18 &&
    ltvCac >= 3 &&
    confidence >= 60;

  if (isFail) {
    return {
      tone: 'fail',
      toneLabel: 'Likely Fail',
      toneColor: 'var(--q-status-red, #ef4444)',
      headline: monthly <= 0
        ? 'This business loses money every month at base case.'
        : payback >= 36
          ? `Payback is ${Math.round(payback)} months — capital won't return on a normal horizon.`
          : `LTV:CAC ${ltvCac.toFixed(1)} — you spend more to acquire than each customer is worth.`,
      subline: `Monthly net: ${fmtUsd(monthly)} · Payback: ${payback >= 999 ? 'never' : `${Math.round(payback)} mo`} · Data confidence ${confidence}%`,
    };
  }

  if (isPass) {
    return {
      tone: 'pass',
      toneLabel: 'Viable',
      toneColor: 'var(--q-status-green, #22c55e)',
      headline: `Profitable from month ${Math.max(1, Math.round(payback))} — unit economics hold up.`,
      subline: `Monthly net: ${fmtUsd(monthly)} · LTV:CAC ${ltvCac.toFixed(1)} · Data confidence ${confidence}%`,
    };
  }

  return {
    tone: 'caution',
    toneLabel: 'Risky',
    toneColor: 'var(--q-status-yellow, #eab308)',
    headline: payback >= 24
      ? `Payback ${Math.round(payback)} months — workable, but fragile to any miss.`
      : ltvCac < 3
        ? `LTV:CAC ${ltvCac.toFixed(1)} — margins are too thin for ad-driven growth.`
        : `Marginal: profitable on paper, sensitive to assumption changes.`,
    subline: `Monthly net: ${fmtUsd(monthly)} · Payback: ${payback >= 999 ? 'never' : `${Math.round(payback)} mo`} · Data confidence ${confidence}%`,
  };
}

function fmtUsd(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${Math.round(abs)}`;
}
