import React, { useMemo } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { DEPTH_OPTIONS, fmtK, fmtPct } from './shared';
import type { OptionalFinancialInputs } from '@/types/analysis';

/* ─── CONFIDENCE RING ─── */
function ConfidenceRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 80 ? 'var(--q-status-green)' : score >= 60 ? 'var(--q-accent-primary)' : score >= 40 ? 'var(--q-status-yellow)' : 'var(--q-status-orange)';
  const tier = score >= 80 ? 'VERIFIED' : score >= 60 ? 'CONFIRMED' : score >= 40 ? 'ESTIMATED' : 'UNCERTAIN';
  const tierColor = score >= 80 ? 'var(--q-status-green)' : score >= 60 ? 'var(--q-accent-primary)' : score >= 40 ? 'var(--q-status-yellow)' : '#F87171';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[72px] h-[72px] sm:w-[88px] sm:h-[88px]">
        <svg viewBox="0 0 88 88" className="w-full h-full block">
          <circle cx={44} cy={44} r={r} fill="none" stroke="var(--q-border-subtle)" strokeWidth={6} />
          <circle
            cx={44} cy={44} r={r} fill="none" strokeWidth={6} strokeLinecap="round"
            stroke={color}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-all duration-[800ms]"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--q-text-primary)' }}>
            {score}
          </span>
          <span className="text-[9px]" style={{ color: 'var(--q-text-tertiary)' }}>/100</span>
        </div>
      </div>
      <span
        className="text-[10px] font-bold tracking-[0.08em] px-2.5 py-0.5 rounded-full"
        style={{ background: `${color}18`, border: `1px solid ${color}40`, color: tierColor }}
      >
        {tier}
      </span>
    </div>
  );
}

/* ─── SIDEBAR PROPS ─── */
interface ConfidenceSidebarProps {
  confidence: number;
  selectedIndustry: string | undefined;
  location: string;
  idea: string;
  financialInputs: OptionalFinancialInputs;
  depth: string;
  isFormValid: boolean;
  isLoading: boolean;
  missingHint: string;
}

export function ConfidenceSidebar({
  confidence, selectedIndustry, location, idea, financialInputs,
  depth, isFormValid, isLoading, missingHint,
}: ConfidenceSidebarProps) {
  const checklist = useMemo(() => [
    { label: 'Industry', done: !!selectedIndustry, required: true },
    { label: 'Location', done: location.trim().length >= 2, required: true },
    { label: 'Capital', done: !!financialInputs.startup_investment, required: true },
    { label: 'Price', done: !!financialInputs.average_price, required: true },
    { label: 'Customers', done: !!financialInputs.expected_customers, required: true },
    { label: 'Op. Costs', done: !!financialInputs.monthly_costs, required: true },
    { label: 'CAC', done: !!financialInputs.cac, required: false },
    { label: 'Churn', done: !!financialInputs.churn_rate, required: false },
  ], [selectedIndustry, location, financialInputs]);

  const liveEstimate = useMemo(() => {
    const price = financialInputs.average_price || 0;
    const cust = financialInputs.expected_customers || 0;
    const opex = financialInputs.monthly_costs || 0;
    const cac = financialInputs.cac || 0;
    const revenue = price * cust;
    const profit = revenue - opex - (cac * cust / 12);
    const margin = revenue > 0 ? ((revenue - opex) / revenue) * 100 : 0;
    return { revenue, profit, margin };
  }, [financialInputs]);

  const requiredReady = !!selectedIndustry && !!financialInputs.startup_investment && !!financialInputs.average_price && !!financialInputs.expected_customers && isFormValid;
  const depthTime = DEPTH_OPTIONS.find(d => d.id === depth)?.time || '90s';

  return (
    <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
      {/* Card A — Confidence Ring */}
      <div className="rounded-[var(--q-radius-lg)] overflow-hidden" style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}>
        <div className="flex items-center gap-2 h-12 px-4" style={{ borderBottom: '1px solid var(--q-border-subtle)' }}>
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--q-text-secondary)' }}>Analysis Quality</span>
        </div>
        <div className="p-4 flex flex-col items-center">
          <ConfidenceRing score={confidence} />
          <div className="w-full mt-3 space-y-[5px]">
            {checklist.map(item => (
              <div key={item.label} className="flex items-center gap-[7px] h-[22px]">
                <span
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300"
                  style={{
                    background: item.done ? 'var(--q-status-green)' : item.required ? 'var(--q-bg-input)' : 'var(--q-border-subtle)',
                    border: item.done ? 'none' : `1px solid ${item.required ? 'var(--q-border-default)' : 'var(--q-border-subtle)'}`,
                  }}
                >
                  {item.done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </span>
                <span className="text-[11px]" style={{ color: item.done ? 'var(--q-text-secondary)' : item.required ? 'var(--q-text-tertiary)' : 'var(--q-text-disabled)' }}>
                  {item.label}
                </span>
                {!item.done && !item.required && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--q-status-green-bg)', color: 'var(--q-status-green)', border: '1px solid var(--q-status-green-border)' }}>+20%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card B — Live Estimate */}
      <div className="rounded-[var(--q-radius-lg)] overflow-hidden" style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}>
        <div className="flex items-center gap-2 h-12 px-4" style={{ borderBottom: '1px solid var(--q-border-subtle)' }}>
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--q-text-secondary)' }}>Live Estimate</span>
        </div>
        <div className="p-3 space-y-2">
          {[
            { label: 'Monthly Revenue', value: liveEstimate.revenue, fmt: (v: number) => v > 0 ? fmtK(v) : '—', color: liveEstimate.revenue > 0 ? 'var(--q-status-green)' : 'var(--q-text-tertiary)' },
            { label: 'Est. Month 12 Profit', value: liveEstimate.profit, fmt: (v: number) => v !== 0 ? `${v < 0 ? '−' : ''}${fmtK(Math.abs(v))}` : '—', color: liveEstimate.profit > 0 ? 'var(--q-status-green)' : liveEstimate.profit < 0 ? 'var(--q-status-red)' : 'var(--q-text-tertiary)' },
            { label: 'Gross Margin', value: liveEstimate.margin, fmt: (v: number) => liveEstimate.revenue > 0 ? fmtPct(v) : '—', color: liveEstimate.margin > 40 ? 'var(--q-status-green)' : liveEstimate.margin > 20 ? 'var(--q-status-yellow)' : liveEstimate.revenue > 0 ? 'var(--q-status-red)' : 'var(--q-text-tertiary)' },
            { label: 'Depth', value: 0, fmt: () => depthTime, color: 'var(--q-status-ai)' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between py-[7px] px-3 rounded-lg" style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)' }}>
              <span className="text-[11px]" style={{ color: 'var(--q-text-tertiary)' }}>{row.label}</span>
              <span className="text-[13px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: row.color }}>{row.fmt(row.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={!requiredReady || isLoading}
        className="w-full h-[52px] rounded-xl border-none text-[15px] font-bold transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
        style={{
          fontFamily: 'Sora, sans-serif',
          background: requiredReady && !isLoading ? 'var(--q-gradient-accent)' : 'var(--q-bg-input)',
          color: requiredReady && !isLoading ? '#fff' : 'var(--q-text-disabled)',
          boxShadow: requiredReady && !isLoading ? '0 4px 20px rgba(79,142,247,0.3)' : 'none',
          cursor: requiredReady && !isLoading ? 'pointer' : 'not-allowed',
        }}
      >
        {isLoading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
        ) : requiredReady ? (
          'Start Free Analysis →'
        ) : (
          'Start Free Analysis'
        )}
      </button>
      {!requiredReady && missingHint && (
        <p className="text-[11px] text-center" style={{ color: 'var(--q-text-disabled)' }}>{missingHint}</p>
      )}
    </div>
  );
}
