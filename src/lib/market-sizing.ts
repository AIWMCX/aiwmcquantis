/**
 * Deterministic TAM / SAM / SOM calculator.
 *
 * Replaces the previous flow that required two heavy LLM round-trips
 * (analyze-plus → analyze-pro-extension), which timed out at 502/46s.
 *
 * Strategy:
 *   1. If the analysis already produced parseable USD strings in
 *      result.market_analysis.market_size, use those.
 *   2. Otherwise fall back to a revenue-anchored model:
 *        annual_revenue = monthly_revenue × 12
 *        SOM            = annual_revenue × 25      (5y aggressive obtainable)
 *        SAM            = SOM / 0.05               (you target 5% of SAM)
 *        TAM            = SAM / 0.10               (SAM is 10% of TAM)
 *   3. Always returns finite values + investor framing strings so the
 *      Market Sizing card and PDF export can render reliably.
 */

import type { BusinessAnalysisResult } from '@/types/analysis';

export interface MarketSizingTier {
  value_usd: number;
  methodology: string;
  investor_framing: string;
  pct?: number; // SAM as % of TAM, SOM as % of SAM
}

export interface MarketSizing {
  tam: MarketSizingTier;
  sam: MarketSizingTier;
  som: MarketSizingTier;
  derivation: 'parsed_from_analysis' | 'revenue_anchored' | 'hybrid';
  annual_revenue_usd: number;
  generated_at: string;
}

/** "$1.2B", "5,400,000 USD", "approx $300M total" → 1_200_000_000 / 5_400_000 / 300_000_000 */
export function parseUsd(input: string | number | null | undefined): number {
  if (input == null) return NaN;
  if (typeof input === 'number') return Number.isFinite(input) ? input : NaN;
  const s = String(input).replace(/[, _]/g, '');
  const m = s.match(/(-?\d+(?:\.\d+)?)\s*(b(?:n|illion)?|m(?:m|illion)?|k|t(?:rillion)?)?/i);
  if (!m) return NaN;
  const num = parseFloat(m[1]);
  if (!Number.isFinite(num)) return NaN;
  const unit = (m[2] ?? '').toLowerCase();
  if (unit.startsWith('t')) return num * 1_000_000_000_000;
  if (unit.startsWith('b')) return num * 1_000_000_000;
  if (unit.startsWith('m')) return num * 1_000_000;
  if (unit.startsWith('k')) return num * 1_000;
  return num;
}

export function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

/** Pick the most defensible monthly revenue baseline from a result blob. */
function pickAnnualRevenue(result: BusinessAnalysisResult | null | undefined): number {
  if (!result) return 0;
  const r: any = result;
  const monthly =
    r?.financial_analysis?.scenarios?.base?.revenue ??
    r?.financial_analysis?.monthly_revenue ??
    r?.monthly_revenue?.realistic ??
    r?.monthly_revenue_estimate ??
    0;
  const annual = Number(monthly) * 12;
  return Number.isFinite(annual) && annual > 0 ? annual : 0;
}

export function computeMarketSizing(
  result: BusinessAnalysisResult | null | undefined,
  opts: { idea?: string; location?: string } = {},
): MarketSizing {
  const annual = pickAnnualRevenue(result);
  const ms = (result as any)?.market_analysis?.market_size as
    | { tam?: string; sam?: string; som?: string }
    | undefined;

  const parsedTam = parseUsd(ms?.tam);
  const parsedSam = parseUsd(ms?.sam);
  const parsedSom = parseUsd(ms?.som);

  // Revenue-anchored fallback (always defined)
  const fbSom = Math.max(annual * 25, 250_000); // floor so we never show $0
  const fbSam = fbSom / 0.05;
  const fbTam = fbSam / 0.10;

  // Pick parsed if numeric, else fallback. Each tier independently.
  const tam = Number.isFinite(parsedTam) && parsedTam > 0 ? parsedTam : fbTam;
  const sam = Number.isFinite(parsedSam) && parsedSam > 0 ? parsedSam : fbSam;
  const som = Number.isFinite(parsedSom) && parsedSom > 0 ? parsedSom : fbSom;

  const usedParsed =
    [parsedTam, parsedSam, parsedSom].filter((x) => Number.isFinite(x) && x > 0).length;
  const derivation: MarketSizing['derivation'] =
    usedParsed === 3 ? 'parsed_from_analysis'
    : usedParsed === 0 ? 'revenue_anchored'
    : 'hybrid';

  const samPctOfTam = tam > 0 ? (sam / tam) * 100 : 0;
  const somPctOfSam = sam > 0 ? (som / sam) * 100 : 0;
  const where = opts.location ? ` in ${opts.location}` : '';

  return {
    annual_revenue_usd: annual,
    derivation,
    generated_at: new Date().toISOString(),
    tam: {
      value_usd: tam,
      methodology: usedParsed
        ? 'Parsed from analysis market_size.tam'
        : 'Top-down: SAM ÷ 10% serviceable share',
      investor_framing: `Total addressable market${where}: ${formatUsd(tam)}. The full universe of customers who could theoretically buy this category, before geography or channel constraints.`,
    },
    sam: {
      value_usd: sam,
      pct: samPctOfTam,
      methodology: usedParsed
        ? 'Parsed from analysis market_size.sam'
        : 'Top-down: SOM ÷ 5% target capture',
      investor_framing: `Serviceable addressable market: ${formatUsd(sam)} (~${samPctOfTam.toFixed(1)}% of TAM). Customers reachable with this product, channel mix, and operating geography.`,
    },
    som: {
      value_usd: som,
      pct: somPctOfSam,
      methodology: usedParsed
        ? 'Parsed from analysis market_size.som'
        : 'Bottom-up: projected annual revenue × 25 (5-year obtainable)',
      investor_framing: `Serviceable obtainable market: ${formatUsd(som)} (~${somPctOfSam.toFixed(1)}% of SAM). Realistic 5-year revenue ceiling given current resources and go-to-market.`,
    },
  };
}
