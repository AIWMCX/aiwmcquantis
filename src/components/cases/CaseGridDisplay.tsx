/**
 * CaseGridDisplay — renders all 11 analysis blocks for a single reference case.
 * Source: AIWMC Quantis 2026 Complete Analysis Dataset (95,500 datapoints).
 */
import React from 'react';
import { Database } from 'lucide-react';
import type { AnalysisCaseGrid } from '@/services/analysis-case-grid';

interface BlockSpec {
  key: keyof Omit<AnalysisCaseGrid, 'case_id'>;
  title: string;
  description: string;
}

const BLOCKS: BlockSpec[] = [
  { key: 'edge_case', title: '1. Edge Case Profile', description: 'Business identity, unit economics & known risks' },
  { key: 'unit_economics', title: '2. Unit Economics', description: 'CAC, LTV, payback & contribution margins' },
  { key: 'monte_carlo', title: '3. Monte Carlo', description: 'Probabilistic outcome distribution' },
  { key: 'tam_sam_som', title: '4. TAM / SAM / SOM', description: 'Market sizing breakdown' },
  { key: 'break_even', title: '5. Break-Even', description: 'Volume + revenue threshold to profitability' },
  { key: 'scenario', title: '6. Scenario (Bear/Base/Bull)', description: 'NPV + IRR across 3 scenarios' },
  { key: 'cash_flow', title: '7. Cash Flow', description: 'Operating, free & cumulative cash flow' },
  { key: 'dcf', title: '8. DCF Valuation', description: 'WACC, terminal value, enterprise value' },
  { key: 'dscr_credit', title: '9. DSCR / Credit', description: 'Debt service coverage & lender lens' },
  { key: 'burn_runway', title: '10. Burn & Runway', description: 'Months of runway, gross & net burn' },
  { key: 'pre_mortem', title: '11. Pre-Mortem', description: 'Failure modes & top fragility risks' },
];

const SKIP_KEYS = new Set(['source', 'sample_size', 'data_version', 'data_date', 'case_id', 'business', 'business_idea']);

function fmtKey(k: string): string {
  return k.split('_').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ');
}

function fmtVal(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number') {
    if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (Math.abs(v) < 1 && v !== 0) return v.toFixed(3);
    return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(v);
}

function BlockCard({ spec, data }: { spec: BlockSpec; data: Record<string, unknown> | null }) {
  if (!data) {
    return (
      <div className="q-card p-4 opacity-60">
        <h3 className="font-semibold text-sm mb-1">{spec.title}</h3>
        <p className="text-xs text-muted-foreground italic">No data for this case.</p>
      </div>
    );
  }
  const entries = Object.entries(data).filter(([k, v]) => !SKIP_KEYS.has(k) && v !== null && v !== '');
  return (
    <div className="q-card p-4 space-y-3">
      <header>
        <h3 className="font-semibold text-sm text-foreground">{spec.title}</h3>
        <p className="text-[11px] text-muted-foreground">{spec.description}</p>
      </header>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-[12px]">
        {entries.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground truncate">{fmtKey(k)}</dt>
            <dd className="font-mono text-foreground text-right">{fmtVal(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function CaseGridDisplay({ grid }: { grid: AnalysisCaseGrid }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
        <Database className="w-3 h-3 text-[var(--q-accent-primary)]" />
        <span>AIWMC Quantis 2026 Complete Analysis Dataset · n=95,500 · v2026.1 · 2026-01-01</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {BLOCKS.map((b) => (
          <BlockCard key={b.key} spec={b} data={grid[b.key] as Record<string, unknown> | null} />
        ))}
      </div>
    </div>
  );
}
