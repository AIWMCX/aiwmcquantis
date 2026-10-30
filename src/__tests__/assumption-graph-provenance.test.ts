import { describe, it, expect } from 'vitest';
import { computeAssumptionGraph } from '../../supabase/functions/analyze-business/assumption-graph';
import { classifyAssumptionOrigins } from '../../supabase/functions/_shared/assumption-origin';
import { selectAssumptionSources } from '@/lib/decision-memo-data';
import type { BusinessAnalysisResult } from '@/types/analysis';

const metrics = {
  averageCheck: 40, clientsActive: 300, cac: 25, churnRate: 0.05, cogsPercent: 30,
  fixedCosts: 8000, ltv: 560, grossMarginPercent: 70, netProfit: 1500, mrr: 12000,
};
const benchmarks = { cac_typical: 25, cac_min: 10, cac_max: 60, average_check_min: 20, average_check_max: 80 };

function origins(userInputs?: Record<string, number>, fa: Record<string, number> = {}) {
  return classifyAssumptionOrigins({
    userInputs, fa, mp: {}, benchmarks, locationMultipliers: { confidence: 70 }, subIndustry: null,
  });
}
const node = (g: ReturnType<typeof computeAssumptionGraph>, id: string) => g.nodes.find((n) => n.id === id)!;

describe('assumption graph provenance', () => {
  it('does not call price a user input when the user never entered one', () => {
    const g = computeAssumptionGraph(metrics, undefined, 70, origins(undefined));
    expect(node(g, 'price').source).toBe('benchmark');
    expect(node(g, 'price').origin).toBe('MODELED_BENCHMARK_PRIOR');
    expect(node(g, 'price').confidence).toBe(70);
  });

  it('marks values the user typed as their input with full confidence', () => {
    const g = computeAssumptionGraph(metrics, undefined, 70, origins({ average_price: 40, cac: 25, churn_rate: 5, monthly_costs: 8000, expected_customers: 300 }));
    for (const id of ['price', 'cac', 'churn', 'fixed_costs', 'customers']) {
      expect(node(g, id).source).toBe('user');
      expect(node(g, id).origin_label).toBe('Your input');
      expect(node(g, id).confidence).toBe(100);
    }
    // COGS has no user field: always the industry benchmark.
    expect(node(g, 'cogs').origin).toBe('MODELED_BENCHMARK_PRIOR');
  });

  it('labels an AI-extracted price as extracted, not as the user', () => {
    const g = computeAssumptionGraph(metrics, undefined, 70, origins(undefined, { average_check: 40 }));
    expect(node(g, 'price').origin).toBe('DERIVED');
    expect(node(g, 'price').source).toBe('calculated');
  });

  it('caps derived nodes at their weakest input', () => {
    const g = computeAssumptionGraph(metrics, undefined, 70, origins({ average_price: 40 }));
    // ltv = f(price 100, churn benchmark 40)
    expect(node(g, 'ltv').confidence).toBe(40);
    expect(node(g, 'ltv').origin).toBe('SYSTEM_ASSUMPTION');
  });

  it('reports unknown instead of guessing when no register is available', () => {
    const g = computeAssumptionGraph(metrics, undefined, 70);
    expect(node(g, 'price').source).toBe('unknown');
    expect(node(g, 'price').origin).toBeUndefined();
    expect(node(g, 'price').confidence).toBe(0);
    expect(node(g, 'ltv').confidence).toBe(0);
  });
});

describe('selectAssumptionSources (Decision Memo PDF table)', () => {
  it('builds formatted rows from recorded origins', () => {
    const g = computeAssumptionGraph(metrics, undefined, 70, origins({ average_price: 40 }));
    const rows = selectAssumptionSources({ assumption_graph: g } as unknown as BusinessAnalysisResult);
    expect(rows).toHaveLength(8);
    expect(rows[0]).toEqual({ label: 'Price (Avg Check)', value: '$40', source: 'Your input' });
    expect(rows.find((r) => r.label === 'Monthly Churn Rate')?.value).toBe('5.0%/mo');
    expect(rows.find((r) => r.label === 'COGS %')?.value).toBe('30%');
  });

  it('returns nothing for older analyses whose nodes carry no origin', () => {
    const old = { assumption_graph: { nodes: [{ id: 'price', label: 'Price (Avg Check)', value: 40, source: 'user', confidence: 85 }], edges: [], criticalPath: [], fragility_score: 0 } };
    expect(selectAssumptionSources(old as unknown as BusinessAnalysisResult)).toEqual([]);
  });
});
