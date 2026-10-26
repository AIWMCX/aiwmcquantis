import type { BusinessAnalysisResult } from '@/types/analysis';
import { detectGeoFromInput, getGeoCoefficients } from '@/lib/geo-calibrator';

export interface WhyRow { icon: string; driver: string; value: string; source: string }

/**
 * Rows for the result page's "Why These Numbers?" panel.
 *
 * Replaces a hard-coded list (found live 2026-10-25) that showed Denver's rent
 * multiplier "×1.15" with the source "CoStar 2025" for every location, and
 * printed $50 CAC, 40% margin and "SaaS benchmarks" 5% churn whenever the
 * report lacked those values. Now: only values this report actually has, and
 * the rent line only when the location matched a metro in the Quantis table.
 */
export function whyTheseNumbers(result: BusinessAnalysisResult, location: string | undefined): WhyRow[] {
  const fa = result.financial_analysis;
  const rows: WhyRow[] = [];

  const slug = detectGeoFromInput(location ?? '');
  if (slug !== 'us_national') {
    const geo = getGeoCoefficients(slug);
    rows.push({ icon: '📍', driver: `${geo.displayName} rent`, value: `×${geo.rentMultiplier.toFixed(2)}`, source: 'Quantis metro estimate vs US average' });
  } else {
    rows.push({ icon: '📍', driver: 'Location', value: 'US average', source: 'No metro match, so no local adjustment' });
  }

  const cac = fa?.unit_economics?.cac;
  if (typeof cac === 'number' && cac > 0) {
    rows.push({ icon: '👥', driver: 'Customer acquisition cost', value: `$${Math.round(cac).toLocaleString('en-US')}`, source: 'This report (modeled)' });
  }
  const gm = fa?.scenarios?.base?.gross_margin;
  if (typeof gm === 'number' && gm > 0) {
    rows.push({ icon: '📊', driver: 'Gross margin', value: `${(gm * 100).toFixed(0)}%`, source: 'This report (modeled)' });
  }
  const churn = fa?.inputs?.churn_rate;
  if (typeof churn === 'number' && churn > 0) {
    rows.push({ icon: '🔄', driver: 'Monthly churn', value: `${(churn * 100).toFixed(1)}%`, source: 'This report (modeled)' });
  }
  return rows;
}
