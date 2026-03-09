import React, { useEffect, useCallback } from 'react';
import { X, Zap, ExternalLink, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export interface FormulaStep {
  label: string;
  value: number;
  operation: string;
  /** Optional sub-explanation shown indented below */
  detail?: string;
  /** '+' | '-' | '=' to prefix the value */
  sign?: '+' | '-' | '=';
}

export interface BenchmarkData {
  industryType: string;
  location?: string;
  p10?: number;
  p25: number;
  p50: number;
  p75: number;
  p90?: number;
  source?: string;
  sourceYear?: number;
  version?: string;
  updatedDaysAgo?: number;
}

export interface ModelContribution {
  model: string;
  value: number;
  weight: number;
}

export interface GeoContext {
  location: string;
  rentMultiplier?: number;
  salaryMultiplier?: number;
}

export interface ExplainPanelProps {
  metricName: string;
  metricValue: number;
  unit: string;
  formulaSteps: FormulaStep[];
  benchmark: BenchmarkData;
  explanation: string;
  confidence: number;
  confidenceTier: 'verified' | 'confident' | 'estimated' | 'uncertain' | 'blocked';
  modelContributions: ModelContribution[];
  geoContext?: GeoContext;
  isOpen: boolean;
  onClose: () => void;
  onViewFullPnL?: () => void;
}

const TIER_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  verified: { label: 'VERIFIED', color: 'bg-[var(--q-status-green-bg)] text-[var(--q-status-green)]', border: 'var(--q-status-green)' },
  confident: { label: 'CONFIDENT', color: 'bg-[var(--q-accent-glow)] text-[var(--q-accent-primary)]', border: 'var(--q-accent-primary)' },
  estimated: { label: 'ESTIMATED', color: 'bg-[var(--q-status-yellow-bg)] text-[var(--q-status-yellow)]', border: 'var(--q-status-yellow)' },
  uncertain: { label: 'UNCERTAIN', color: 'bg-[var(--q-status-orange-bg,var(--q-status-yellow-bg))] text-[var(--q-status-orange,var(--q-status-yellow))]', border: 'var(--q-status-orange, var(--q-status-yellow))' },
  blocked: { label: 'BLOCKED', color: 'bg-[var(--q-status-red-bg)] text-[var(--q-status-red)]', border: 'var(--q-status-red)' },
};

function getPercentilePosition(value: number, b: BenchmarkData): number {
  const min = b.p10 ?? b.p25 * 0.6;
  const max = b.p90 ?? b.p75 * 1.4;
  const range = max - min;
  if (range === 0) return 50;
  return Math.max(2, Math.min(98, ((value - min) / range) * 100));
}

function estimatePercentile(value: number, b: BenchmarkData): number {
  if (value <= (b.p10 ?? b.p25 * 0.6)) return 10;
  if (value <= b.p25) return 25;
  if (value <= b.p50) return 50;
  if (value <= b.p75) return 75;
  if (value >= (b.p90 ?? b.p75 * 1.4)) return 90;
  // Interpolate between p75 and p90
  const p90 = b.p90 ?? b.p75 * 1.4;
  return Math.round(75 + ((value - b.p75) / (p90 - b.p75)) * 15);
}

export function ExplainPanel({
  metricName,
  metricValue,
  unit,
  formulaSteps,
  benchmark,
  explanation,
  confidence,
  confidenceTier,
  modelContributions,
  geoContext,
  isOpen,
  onClose,
  onViewFullPnL,
}: ExplainPanelProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);

  const tier = TIER_CONFIG[confidenceTier] || TIER_CONFIG.estimated;
  const markerPos = getPercentilePosition(metricValue, benchmark);
  const userPercentile = estimatePercentile(metricValue, benchmark);
  const aboveMedian = metricValue >= benchmark.p50;
  const totalWeight = modelContributions.reduce((s, m) => s + m.weight, 0) || 1;

  // Agreement calculation
  const modelValues = modelContributions.map(m => m.value);
  const agreement = modelValues.length >= 2
    ? Math.round((1 - Math.abs(modelValues[0] - modelValues[1]) / Math.max(modelValues[0], modelValues[1], 1)) * 100)
    : null;
  const delta = modelValues.length >= 2
    ? Math.abs(modelValues[0] - modelValues[1])
    : null;
  const deltaPercent = modelValues.length >= 2 && modelValues[0] > 0
    ? ((delta! / modelValues[0]) * 100).toFixed(1)
    : null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[var(--q-bg-base)]/60 backdrop-blur-sm z-40 transition-opacity duration-200"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full sm:max-w-[420px] z-50',
          'bg-[var(--q-bg-surface)] shadow-2xl overflow-y-auto',
          'transition-transform ease-out',
          isOpen ? 'translate-x-0 duration-300' : 'translate-x-full duration-200'
        )}
        style={{ borderLeft: `3px solid ${tier.border}` }}
        role="dialog"
        aria-label={`Explanation for ${metricName}`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--q-bg-surface)] border-b border-[var(--q-border-subtle)] p-4 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <h2 className="text-sm font-semibold text-[var(--q-text-primary)]" style={{ fontFamily: 'var(--q-font-heading)' }}>
                {metricName}
              </h2>
              <p className="text-xl font-bold text-[var(--q-text-primary)] tabular-nums" style={{ fontFamily: 'var(--q-font-mono, ui-monospace, monospace)' }}>
                {unit === '$' ? '$' : ''}{metricValue.toLocaleString()}{unit !== '$' ? ` ${unit}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', tier.color)}>
                {tier.label} <Zap className="w-3 h-3" /> {confidence}%
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--q-bg-elevated)] transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-[var(--q-text-secondary)]" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* ── CALCULATION ── */}
          <section>
            <h3 className="text-[11px] font-bold text-[var(--q-text-tertiary)] uppercase tracking-widest mb-3">Calculation</h3>
            <div className="space-y-1">
              {formulaSteps.map((step, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--q-bg-elevated)]">
                    <span className="w-5 h-5 rounded-full bg-[var(--q-accent-glow)] text-[var(--q-accent-primary)] text-[10px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs text-[var(--q-text-primary)] flex-1">{step.label}</span>
                    <span className="text-xs font-bold tabular-nums text-[var(--q-text-primary)]" style={{ fontFamily: 'var(--q-font-mono, ui-monospace, monospace)' }}>
                      {step.sign === '-' ? '−' : step.sign === '=' ? '=' : ''} ${Math.abs(step.value).toLocaleString()}
                    </span>
                  </div>
                  {step.detail && (
                    <p className="text-[11px] text-[var(--q-text-tertiary)] pl-9 pb-1">
                      └ {step.detail}
                    </p>
                  )}
                </div>
              ))}
              {formulaSteps.length === 0 && (
                <p className="text-xs text-[var(--q-text-tertiary)] italic">No detailed calculation steps available.</p>
              )}
            </div>
            {onViewFullPnL && (
              <button onClick={onViewFullPnL} className="mt-2 text-xs text-[var(--q-accent-primary)] hover:underline flex items-center gap-1">
                View full 36-month P&L <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </section>

          <hr className="border-[var(--q-border-subtle)]" />

          {/* ── BENCHMARK POSITION ── */}
          <section>
            <h3 className="text-[11px] font-bold text-[var(--q-text-tertiary)] uppercase tracking-widest mb-1">Benchmark Position</h3>
            <p className="text-[11px] text-[var(--q-text-tertiary)] mb-3">
              {benchmark.industryType.replace(/_/g, ' ')}
              {benchmark.location ? ` · ${benchmark.location}` : ''}
            </p>

            {/* Percentile labels row */}
            <div className="flex justify-between text-[9px] tabular-nums text-[var(--q-text-tertiary)] mb-1 px-0.5" style={{ fontFamily: 'var(--q-font-mono, ui-monospace, monospace)' }}>
              {benchmark.p10 !== undefined && <span>p10</span>}
              <span>p25</span>
              <span>p50</span>
              <span>p75</span>
              {benchmark.p90 !== undefined && <span>p90</span>}
            </div>

            {/* Values row */}
            <div className="flex justify-between text-[9px] tabular-nums text-[var(--q-text-secondary)] mb-2 px-0.5" style={{ fontFamily: 'var(--q-font-mono, ui-monospace, monospace)' }}>
              {benchmark.p10 !== undefined && <span>{benchmark.p10}%</span>}
              <span>{benchmark.p25}%</span>
              <span>{benchmark.p50}%</span>
              <span>{benchmark.p75}%</span>
              {benchmark.p90 !== undefined && <span>{benchmark.p90}%</span>}
            </div>

            {/* Track */}
            <div className="relative h-3 rounded-full bg-[var(--q-bg-elevated)] border border-[var(--q-border-default)] mb-2">
              {/* IQR highlight */}
              <div
                className="absolute top-0 h-full rounded-full bg-[var(--q-accent-glow)]"
                style={{
                  left: `${getPercentilePosition(benchmark.p25, benchmark)}%`,
                  width: `${getPercentilePosition(benchmark.p75, benchmark) - getPercentilePosition(benchmark.p25, benchmark)}%`,
                }}
              />
              {/* User marker */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-[var(--q-bg-surface)] shadow-md transition-all duration-500"
                style={{
                  left: `${markerPos}%`,
                  transform: `translateX(-50%) translateY(-50%)`,
                  background: aboveMedian ? 'var(--q-status-green)' : 'var(--q-status-yellow)',
                }}
              />
            </div>

            <p className="text-xs text-[var(--q-text-secondary)]">
              <span className="font-medium">↑ You are here (p{userPercentile})</span>
            </p>
            <p className={cn('text-xs mt-1', aboveMedian ? 'text-[var(--q-status-green)]' : 'text-[var(--q-status-yellow)]')}>
              {aboveMedian
                ? `Above median for ${benchmark.industryType.replace(/_/g, ' ')} ✓`
                : `Below median — room for improvement`}
            </p>
          </section>

          <hr className="border-[var(--q-border-subtle)]" />

          {/* ── AI MODELS ── */}
          {modelContributions.length > 0 && (
            <section>
              <h3 className="text-[11px] font-bold text-[var(--q-text-tertiary)] uppercase tracking-widest mb-3">AI Models</h3>
              <div className="space-y-2.5">
                {modelContributions.map((m, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="text-xs text-[var(--q-text-primary)] w-24 truncate font-medium">{m.model}</span>
                    <span className="text-xs tabular-nums text-[var(--q-text-secondary)] w-16 text-right" style={{ fontFamily: 'var(--q-font-mono, ui-monospace, monospace)' }}>
                      ${m.value.toLocaleString()}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-[var(--q-bg-elevated)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--q-accent-primary)] transition-all duration-500"
                        style={{ width: `${(m.weight / totalWeight) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-[var(--q-text-tertiary)] w-8 text-right">
                      {Math.round((m.weight / totalWeight) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
              {agreement !== null && delta !== null && (
                <p className="text-xs text-[var(--q-text-secondary)] mt-2 tabular-nums">
                  Agreement: <span className="font-bold text-[var(--q-text-primary)]">{agreement}%</span>
                  {' '}∆ ${delta.toLocaleString()} ({deltaPercent}%)
                </p>
              )}
            </section>
          )}

          <hr className="border-[var(--q-border-subtle)]" />

          {/* ── FOOTER: Sources ── */}
          <section className="space-y-1">
            <p className="text-[10px] text-[var(--q-text-tertiary)]">
              Benchmark source: {benchmark.source || 'Industry reports'}{benchmark.sourceYear ? ` ${benchmark.sourceYear}` : ''}
              {benchmark.version ? ` · ${benchmark.version}` : ''}
            </p>
            {geoContext && (
              <p className="text-[10px] text-[var(--q-text-tertiary)]">
                Geo: {geoContext.location}
                {geoContext.rentMultiplier ? ` · Rent ×${geoContext.rentMultiplier.toFixed(2)}` : ''}
                {geoContext.salaryMultiplier ? ` · Salary ×${geoContext.salaryMultiplier.toFixed(2)}` : ''}
              </p>
            )}
            {benchmark.updatedDaysAgo !== undefined && (
              <p className="text-[10px] text-[var(--q-text-tertiary)]">
                Updated: {benchmark.updatedDaysAgo === 0 ? 'today' : `${benchmark.updatedDaysAgo} days ago`}
              </p>
            )}
            <Link
              to="/methodology"
              target="_blank"
              className="inline-flex items-center gap-1 text-[10px] text-[var(--q-accent-primary)] hover:underline mt-2"
            >
              <BookOpen className="w-3 h-3" />
              How we calculate this →
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
