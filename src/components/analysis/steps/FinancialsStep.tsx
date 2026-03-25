import React from 'react';
import { Check } from 'lucide-react';
import { INDUSTRIES, INDUSTRY_BENCHMARKS, DEPTH_OPTIONS } from './shared';
import { FinancialField } from './FinancialField';
import type { OptionalFinancialInputs } from '@/types/analysis';

interface FinancialsStepProps {
  financialInputs: OptionalFinancialInputs;
  updateField: (field: keyof OptionalFinancialInputs, value: number | undefined) => void;
  selectedIndustry: string | undefined;
  depth: string;
  onDepthChange: (id: string) => void;
}

export function FinancialsStep({ financialInputs, updateField, selectedIndustry, depth, onDepthChange }: FinancialsStepProps) {
  const benchmarks = selectedIndustry ? INDUSTRY_BENCHMARKS[selectedIndustry] : undefined;
  const allFilled = !!(financialInputs.startup_investment && financialInputs.average_price && financialInputs.expected_customers && financialInputs.monthly_costs);

  return (
    <div className="rounded-[var(--q-radius-lg)] overflow-hidden" style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}>
      <div className="flex items-center justify-between h-12 px-4" style={{ borderBottom: '1px solid var(--q-border-subtle)' }}>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{
            background: allFilled ? 'var(--q-status-green)' : 'var(--q-accent-primary)',
            color: '#fff'
          }}>{allFilled ? <Check className="w-3 h-3" /> : '2'}</span>
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--q-text-secondary)' }}>Step 2 · Financial Inputs</span>
        </div>
        {selectedIndustry && (
          <span className="text-[10px] px-2 py-[3px] rounded-md" style={{ background: 'var(--q-bg-input)', color: 'var(--q-text-tertiary)' }}>
            Benchmarks: {INDUSTRIES.find(i => i.id === selectedIndustry)?.label}
          </span>
        )}
      </div>
      <div className="p-4 space-y-3">
        {/* Core fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FinancialField label="Starting Capital" prefix="$" placeholder="50,000" value={financialInputs.startup_investment} onChange={v => updateField('startup_investment', v)} benchmarkMin={benchmarks?.capital?.[0]} benchmarkMax={benchmarks?.capital?.[1]} hint="How much to start" />
          <FinancialField label="Price per Customer" prefix="$" placeholder="89" value={financialInputs.average_price} onChange={v => updateField('average_price', v)} benchmarkMin={benchmarks?.price?.[0]} benchmarkMax={benchmarks?.price?.[1]} hint="Per transaction / month / unit" />
          <FinancialField label="Customers at Launch" placeholder="30" value={financialInputs.expected_customers} onChange={v => updateField('expected_customers', v)} benchmarkMin={benchmarks?.customers?.[0]} benchmarkMax={benchmarks?.customers?.[1]} hint="Month 1 target" />
          <FinancialField label="Monthly Op. Costs" prefix="$" placeholder="10,000" value={financialInputs.monthly_costs} onChange={v => updateField('monthly_costs', v)} benchmarkMin={benchmarks?.opex?.[0]} benchmarkMax={benchmarks?.opex?.[1]} hint="Rent + staff + software" />
        </div>

        <div className="h-px" style={{ background: 'var(--q-border-subtle)' }} />

        {/* Optional header */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--q-text-disabled)' }}>Optional · +40% confidence boost</span>
          <div className="flex-1 h-px" style={{ background: 'var(--q-border-subtle)' }} />
          <span className="text-[11px] font-semibold" style={{ color: 'var(--q-status-green)' }}>⚡ +40%</span>
        </div>

        {/* Optional fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FinancialField label="Cust. Acquisition Cost" prefix="$" placeholder="150" value={financialInputs.cac} onChange={v => updateField('cac', v)} benchmarkMin={benchmarks?.cac?.[0]} benchmarkMax={benchmarks?.cac?.[1]} hint="Cost to acquire 1 customer" />
          <FinancialField label="Monthly Churn Rate" suffix="%" placeholder="5" value={financialInputs.churn_rate} onChange={v => updateField('churn_rate', v)} benchmarkMin={benchmarks?.churn?.[0]} benchmarkMax={benchmarks?.churn?.[1]} hint="% customers lost/month" />
        </div>

        <div className="h-px" style={{ background: 'var(--q-border-subtle)' }} />

        {/* Depth selector */}
        <div>
          <label className="text-[11px] font-semibold tracking-[0.06em] uppercase mb-2 block" style={{ color: 'var(--q-text-tertiary)' }}>Analysis Depth</label>
          <div className="grid grid-cols-3 gap-1.5">
            {DEPTH_OPTIONS.map(opt => (
              <button
                key={opt.id} type="button"
                onClick={() => onDepthChange(opt.id)}
                className="flex flex-col items-center gap-0.5 py-2 px-1.5 rounded-lg cursor-pointer transition-all duration-150"
                style={{
                  background: depth === opt.id ? 'var(--q-accent-glow)' : 'var(--q-bg-input)',
                  border: `1px solid ${depth === opt.id ? 'var(--q-accent-primary)' : 'var(--q-border-subtle)'}`,
                }}
              >
                <span className="text-[13px] font-bold" style={{ color: depth === opt.id ? 'var(--q-accent-primary)' : 'var(--q-text-secondary)' }}>{opt.label}</span>
                <span className="text-[10px]" style={{ color: depth === opt.id ? 'var(--q-accent-primary)' : 'var(--q-text-tertiary)' }}>{opt.time}</span>
                <span className="text-[9px] text-center" style={{ color: 'var(--q-text-disabled)' }}>{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
