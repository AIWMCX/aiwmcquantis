/**
 * Year-1 ROI — the ONE definition (founder decision 2026-10-22: ramp model).
 *
 * ROI_year1 = Σ(month 1..12) modeled profit / investment × 100, where each
 * month comes from projectOperatingMonth(): months 1–6 ramp revenue
 * 30%→100% with 60% of costs fixed, months 7–12 revenue +5%/mo and costs
 * +2.5%/mo. This is accounting profit under those assumptions, not a cash
 * return and not steady-state profit × 12.
 *
 * Previously the same loop was copied inline in financial-calculator.ts and
 * quantis-engine.ts, while financial-engine.ts and the client formula
 * registry described profit × 12 (R&D F04).
 */
import { projectOperatingMonth } from './operating-projection.ts';

export const ROI_YEAR1_FORMULA_ID = 'roi_year1.ramp_model.v1';
export const ROI_YEAR1_EXPRESSION =
  'ROI_year1 = (Σ month 1–12 modeled profit / Investment) × 100%; months 1–6 ramp revenue 30%→100% with 60% of costs fixed, months 7–12 revenue +5%/mo and costs +2.5%/mo';

/** Unrounded Σ of modeled monthly profit over months 1..12. */
export function year1ModeledProfit(steadyRevenue: number, steadyExpenses: number): number {
  let total = 0;
  for (let m = 1; m <= 12; m++) {
    const p = projectOperatingMonth(steadyRevenue, steadyExpenses, m);
    total += p.revenue - p.expenses;
  }
  return total;
}

/** Rounded Year-1 ROI percent; 0 when there is no positive investment. */
export function roiYear1Percent(steadyRevenue: number, steadyExpenses: number, investment: number): number {
  if (!(investment > 0)) return 0;
  return Math.round((year1ModeledProfit(steadyRevenue, steadyExpenses) / investment) * 100);
}
