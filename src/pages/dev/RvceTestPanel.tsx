import { useState } from 'react';
import { runRVCEValidation } from '@/engine/rvce/rvceService';
import { ValidationSection } from '@/components/rvce/ValidationSection';
import type {
  AnalysisCorePayload,
  AnalysisValidationPayload,
} from '@/engine/rvce/types';

interface TestResult {
  validation: AnalysisValidationPayload | null;
  loading: boolean;
  error: string | null;
  elapsed: number;
}

const TEST_SCENARIOS: { name: string; payload: AnalysisCorePayload }[] = [
  {
    name: '☕ Denver Coffee Shop (known-good — should mostly be OK)',
    payload: {
      analysis_id: crypto.randomUUID(),
      business_profile: {
        title: 'Specialty coffee shop with remote work focus',
        description:
          'Premium coffee shop targeting remote workers in downtown Denver, offering craft coffee, fast wifi, and co-working seating',
        industry: 'Food & Beverage / Coffee',
        business_model: 'B2C retail',
        location_city: 'Denver',
        location_country: 'US',
        stage: 'pre-revenue',
      },
      core_metrics: {
        revenue_monthly: 28500,
        gross_margin_pct: 62,
        opex_rent_monthly: 4800,
        opex_marketing_monthly: 2200,
        opex_payroll_monthly: 12000,
        total_opex_monthly: 20500,
        ltv: 1200,
        cac: 285,
        ltv_cac_ratio: 4.2,
        cac_payback_months: 6,
        startup_investment_total: 185000,
        som_year1_revenue: 342000,
      },
    },
  },
  {
    name: '🍕 Miami Restaurant (moderate — some WARN expected)',
    payload: {
      analysis_id: crypto.randomUUID(),
      business_profile: {
        title: 'Fast-casual Mediterranean restaurant in Miami Beach',
        description:
          'Mediterranean fast-casual restaurant targeting tourists and locals in Miami Beach with dine-in and delivery',
        industry: 'Food & Beverage / Restaurant',
        business_model: 'B2C retail',
        location_city: 'Miami',
        location_country: 'US',
        stage: 'pre-revenue',
      },
      core_metrics: {
        revenue_monthly: 95000,
        gross_margin_pct: 68,
        opex_rent_monthly: 8500,
        opex_marketing_monthly: 4500,
        opex_payroll_monthly: 36000,
        total_opex_monthly: 55000,
        ltv: 380,
        cac: 65,
        ltv_cac_ratio: 5.8,
        cac_payback_months: 3,
        startup_investment_total: 420000,
        som_year1_revenue: 1140000,
      },
    },
  },
  {
    name: '💻 SaaS PM Tool (tech — different benchmark class)',
    payload: {
      analysis_id: crypto.randomUUID(),
      business_profile: {
        title: 'AI-powered project management tool for remote teams',
        description:
          'B2B SaaS project management platform with AI task prioritization for remote engineering teams',
        industry: 'Software / SaaS',
        business_model: 'B2B SaaS',
        location_city: 'San Francisco',
        location_country: 'US',
        stage: 'pre-revenue',
      },
      core_metrics: {
        revenue_monthly: 12400,
        gross_margin_pct: 82,
        opex_rent_monthly: 0,
        opex_marketing_monthly: 8500,
        opex_payroll_monthly: 25000,
        total_opex_monthly: 35000,
        ltv: 4200,
        cac: 340,
        ltv_cac_ratio: 3.1,
        cac_payback_months: 14,
        startup_investment_total: 50000,
        som_year1_revenue: 148800,
      },
    },
  },
  {
    name: '🚨 OUTLIER TEST — $131K marketing on $22K revenue (must flag OUTLIER)',
    payload: {
      analysis_id: crypto.randomUUID(),
      business_profile: {
        title: 'Online certification for plant-based charcuterie',
        description:
          'B2C online certification with mailed starter cultures and AI-graded assessments for NYC chefs',
        industry: 'Consulting / Professional Services',
        business_model: 'B2C productized service',
        location_city: 'New York',
        location_country: 'US',
        stage: 'pre-revenue',
      },
      core_metrics: {
        revenue_monthly: 22275,
        gross_margin_pct: 56,
        opex_rent_monthly: 1400,
        opex_marketing_monthly: 131544,
        opex_payroll_monthly: 14500,
        total_opex_monthly: 158430,
        ltv: 50644,
        cac: 32886,
        ltv_cac_ratio: 1.54,
        cac_payback_months: 10,
        startup_investment_total: 35000,
        som_year1_revenue: 267000,
      },
    },
  },
  {
    name: '⚡ FAIL-SAFE TEST — empty metrics (should return UNAVAILABLE / NO_DATA)',
    payload: {
      analysis_id: crypto.randomUUID(),
      business_profile: {
        title: 'Test',
        description: 'Minimal input test',
        industry: 'Unknown',
        business_model: 'Unknown',
        location_city: 'Unknown',
        location_country: 'US',
        stage: 'idea',
      },
      core_metrics: {
        revenue_monthly: 0,
      },
    },
  },
];

export default function RvceTestPanel() {
  const [results, setResults] = useState<Record<number, TestResult>>({});

  const runTest = async (index: number) => {
    setResults((prev) => ({
      ...prev,
      [index]: { validation: null, loading: true, error: null, elapsed: 0 },
    }));

    const start = Date.now();
    try {
      const validation = await runRVCEValidation(TEST_SCENARIOS[index].payload);
      const elapsed = Date.now() - start;
      setResults((prev) => ({
        ...prev,
        [index]: { validation, loading: false, error: null, elapsed },
      }));
    } catch (err) {
      const elapsed = Date.now() - start;
      setResults((prev) => ({
        ...prev,
        [index]: {
          validation: null,
          loading: false,
          error: (err as Error).message,
          elapsed,
        },
      }));
    }
  };

  const runAll = async () => {
    for (let i = 0; i < TEST_SCENARIOS.length; i++) {
      await runTest(i);
      if (i < TEST_SCENARIOS.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  };

  const fmtVal = (k: string, v: number) =>
    k.includes('pct')
      ? `${v}%`
      : k.includes('ratio')
        ? `${v}x`
        : k.includes('months')
          ? `${v} mo`
          : `$${v.toLocaleString()}`;

  return (
    <div className="container mx-auto max-w-5xl py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">RVCE Test Panel</h1>
        <p className="text-sm text-muted-foreground">
          Run 5 test scenarios against the live <code>rvce-validate</code> Edge
          Function. Each test calls Claude Haiku 4.5 with{' '}
          <code>web_search_20250305</code> to validate metrics.
        </p>
      </header>

      <button
        onClick={runAll}
        className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition"
      >
        Run All 5 Tests Sequentially →
      </button>

      {TEST_SCENARIOS.map((scenario, i) => {
        const result = results[i];
        return (
          <section
            key={i}
            className="rounded-lg border border-border bg-card p-4 space-y-3"
          >
            <header className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">{scenario.name}</h2>
              <button
                onClick={() => runTest(i)}
                disabled={result?.loading}
                className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted transition disabled:opacity-50"
              >
                {result?.loading ? 'Running...' : 'Run Test'}
              </button>
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {Object.entries(scenario.payload.core_metrics).map(([k, v]) => (
                <div
                  key={k}
                  className="rounded border border-border/60 bg-muted/30 px-2 py-1"
                >
                  <div className="text-muted-foreground capitalize">
                    {k.replace(/_/g, ' ')}
                  </div>
                  <div className="font-mono">{fmtVal(k, v)}</div>
                </div>
              ))}
            </div>

            {result?.loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/40 border-t-foreground animate-spin" />
                Calling RVCE Edge Function... (expect 5–15 seconds)
              </div>
            )}

            {result?.error && (
              <div className="rounded border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-700 dark:text-red-300">
                Error: {result.error}
              </div>
            )}

            {result?.validation && !result.loading && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <Stat label="Status" value={result.validation.status} />
                  <Stat
                    label="Client latency"
                    value={`${result.elapsed}ms`}
                  />
                  <Stat
                    label="Server latency"
                    value={`${result.validation.latency_ms}ms`}
                  />
                  <Stat
                    label="Confidence"
                    value={`${Math.round(result.validation.global_confidence_score * 100)}%`}
                  />
                  <Stat
                    label="Flags"
                    value={String(result.validation.flags.length)}
                  />
                </div>

                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    View raw JSON response
                  </summary>
                  <pre className="mt-2 overflow-auto rounded bg-muted p-3 max-h-96 text-[11px]">
                    {JSON.stringify(result.validation, null, 2)}
                  </pre>
                </details>

                <ValidationSection validation={result.validation} />
              </div>
            )}
          </section>
        );
      })}

      <section className="rounded-lg border border-border bg-card p-4 space-y-2 text-sm">
        <h3 className="font-semibold">Verification Checklist</h3>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-xs">
          <li>Test 1 (Denver Coffee): mostly OK; rent ~$4,800 realistic.</li>
          <li>
            Test 2 (Miami Restaurant): GM 68% may WARN (typical 60–65%).
          </li>
          <li>Test 3 (SaaS): GM 82% OK; rent $0 likely NO_DATA.</li>
          <li>
            Test 4 (OUTLIER): marketing $131K MUST be OUTLIER; LTV:CAC 1.54x
            WARN.
          </li>
          <li>
            Test 5 (Fail-safe): UNAVAILABLE or all NO_DATA, no crash, no UI
            error.
          </li>
          <li>
            All: latency under 25s, no console errors, ValidationSection
            renders with tooltips.
          </li>
          <li>
            Supabase: rows in <code>rvce_validation_log</code> with
            metrics_validation JSONB and latency_ms.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-muted/30 px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}
