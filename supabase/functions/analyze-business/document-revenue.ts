// Monthly revenue from one parsed document (D6, 2026-10-23).
//
// Previously a revenue "total" with no stated period was divided by 3 when it
// exceeded $50k and used as-is otherwise. A $600k annual total became a $200k
// month; a $40k quarter became a $40k month. Annual and ARR figures were never
// read at all. Now only figures whose period the document states are
// converted, and an unlabeled total is not used (the caller records why).

export interface DocumentRevenueFields {
  revenue?: { total?: number; monthly?: number; quarterly?: number; annual?: number };
  metrics?: { mrr?: number; arr?: number };
}

export type DocumentRevenueBasis =
  | 'document_mrr' | 'document_monthly_revenue' | 'document_arr' | 'document_quarterly_revenue' | 'document_annual_revenue';

export type DocumentMonthlyRevenue =
  | { monthly: number; basis: DocumentRevenueBasis }
  | { monthly: null; note: string | null };

const pos = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;

export function monthlyRevenueFromDocument(doc: DocumentRevenueFields): DocumentMonthlyRevenue {
  if (pos(doc.metrics?.mrr)) return { monthly: doc.metrics.mrr, basis: 'document_mrr' };
  if (pos(doc.revenue?.monthly)) return { monthly: doc.revenue.monthly, basis: 'document_monthly_revenue' };
  if (pos(doc.metrics?.arr)) return { monthly: Math.round(doc.metrics.arr / 12), basis: 'document_arr' };
  if (pos(doc.revenue?.quarterly)) return { monthly: Math.round(doc.revenue.quarterly / 3), basis: 'document_quarterly_revenue' };
  if (pos(doc.revenue?.annual)) return { monthly: Math.round(doc.revenue.annual / 12), basis: 'document_annual_revenue' };
  if (pos(doc.revenue?.total)) {
    return {
      monthly: null,
      note: `A revenue total of ${Math.round(doc.revenue.total).toLocaleString('en-US')} was found, but the document does not say what period it covers, so it was not used as monthly revenue. Enter monthly revenue to include it.`,
    };
  }
  return { monthly: null, note: null };
}
