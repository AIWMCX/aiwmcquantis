import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { INDUSTRIES, INDUSTRY_BENCHMARKS, DEPTH_OPTIONS, FIELD_HINTS } from './shared';
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
  const hints = selectedIndustry ? FIELD_HINTS[selectedIndustry] : undefined;
  const allFilled = !!(financialInputs.startup_investment && financialInputs.average_price && financialInputs.expected_customers && financialInputs.monthly_costs);

  return (
    <div className="rounded-[var(--q-radius-lg)] overflow-hidden" style={{ background: 'var(--q-bg-surface-bright)', border: '1px solid var(--q-border-subtle)' }}>
      <div className="flex items-center justify-between h-12 px-4" style={{ borderBottom: '1px solid var(--q-border-subtle)' }}>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{
            background: allFilled ? 'var(--q-status-green)' : 'var(--q-accent-primary)',
            color: '#fff'
          }}>{allFilled ? <Check className="w-3 h-3" /> : '2'}</span>
          <span className="text-[13px] font-bold tracking-[0.06em] uppercase" style={{ color: 'var(--q-text-secondary)' }}>Step 2 · Financial Inputs</span>
        </div>
        {selectedIndustry && (
          <span className="text-[11px] px-2 py-[3px] rounded-md font-medium" style={{ background: 'var(--q-bg-input)', color: 'var(--q-text-tertiary)' }}>
            Benchmarks: {INDUSTRIES.find(i => i.id === selectedIndustry)?.label}
          </span>
        )}
      </div>
      <div className="p-4 space-y-3">
        {/* Core fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FinancialField label="Starting Capital" prefix="$" placeholder="50,000" value={financialInputs.startup_investment} onChange={v => updateField('startup_investment', v)} benchmarkMin={benchmarks?.capital?.[0]} benchmarkMax={benchmarks?.capital?.[1]} hint="How much to start" advisorHint={hints?.capital} />
          <FinancialField label="Price per Customer" prefix="$" placeholder="89" value={financialInputs.average_price} onChange={v => updateField('average_price', v)} benchmarkMin={benchmarks?.price?.[0]} benchmarkMax={benchmarks?.price?.[1]} hint="Per transaction / month / unit" advisorHint={hints?.price} />
          <FinancialField label="Customers at Launch" placeholder="30" value={financialInputs.expected_customers} onChange={v => updateField('expected_customers', v)} benchmarkMin={benchmarks?.customers?.[0]} benchmarkMax={benchmarks?.customers?.[1]} hint="Month 1 target" advisorHint={hints?.customers} />
          <FinancialField label="Monthly Op. Costs" prefix="$" placeholder="10,000" value={financialInputs.monthly_costs} onChange={v => updateField('monthly_costs', v)} benchmarkMin={benchmarks?.opex?.[0]} benchmarkMax={benchmarks?.opex?.[1]} hint="Rent + staff + software" advisorHint={hints?.opex} />
        </div>

        <div className="h-px" style={{ background: 'var(--q-border-subtle)' }} />

        {/* Optional header */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--q-text-disabled)' }}>Optional · +40% confidence boost</span>
          <div className="flex-1 h-px" style={{ background: 'var(--q-border-subtle)' }} />
          <span className="text-[12px] font-semibold" style={{ color: 'var(--q-status-green)' }}>⚡ +40%</span>
        </div>

        {/* Optional fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FinancialField label="Cust. Acquisition Cost" prefix="$" placeholder="150" value={financialInputs.cac} onChange={v => updateField('cac', v)} benchmarkMin={benchmarks?.cac?.[0]} benchmarkMax={benchmarks?.cac?.[1]} hint="Cost to acquire 1 customer" advisorHint={hints?.cac} />
          <FinancialField label="Monthly Churn Rate" suffix="%" placeholder="5" value={financialInputs.churn_rate} onChange={v => updateField('churn_rate', v)} benchmarkMin={benchmarks?.churn?.[0]} benchmarkMax={benchmarks?.churn?.[1]} hint="% customers lost/month" advisorHint={hints?.churn} />
        </div>

        <div className="h-px" style={{ background: 'var(--q-border-subtle)' }} />

        {/* Depth selector */}
        <div>
          <label className="q-form-label mb-2 block">Analysis Depth</label>
          <div className="grid grid-cols-3 gap-1.5 relative">
            {DEPTH_OPTIONS.map(opt => (
              <button
                key={opt.id} type="button"
                onClick={() => onDepthChange(opt.id)}
                className="flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-lg cursor-pointer transition-all duration-200 relative group"
                style={{
                  background: depth === opt.id ? 'var(--q-accent-glow)' : 'var(--q-bg-input)',
                  border: `1.5px solid ${depth === opt.id ? 'var(--q-accent-primary)' : 'var(--q-border-subtle)'}`,
                  boxShadow: depth === opt.id ? '0 0 12px var(--q-accent-glow)' : 'none',
                }}
              >
                {opt.recommended && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 whitespace-nowrap" style={{ background: 'var(--q-accent-primary)', color: '#fff' }}>
                    <Sparkles className="w-2.5 h-2.5" /> Recommended
                  </span>
                )}
                <span className="text-[14px] font-bold" style={{ color: depth === opt.id ? 'var(--q-accent-primary)' : 'var(--q-text-secondary)' }}>{opt.label}</span>
                <span className="text-[11px] font-medium" style={{ color: depth === opt.id ? 'var(--q-accent-primary)' : 'var(--q-text-tertiary)' }}>{opt.time}</span>
                <span className="text-[10px] text-center leading-tight" style={{ color: 'var(--q-text-disabled)' }}>{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
