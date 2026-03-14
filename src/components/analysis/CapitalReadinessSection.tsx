import React from 'react';
import { getCapitalReadiness } from '@/lib/quantis-safety-levels';
import { Landmark, ArrowRight, Target, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CapitalReadinessSectionProps {
  confidenceScore: number;
}

export function CapitalReadinessSection({ confidenceScore }: CapitalReadinessSectionProps) {
  const readiness = getCapitalReadiness(confidenceScore);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--q-text-primary)]" style={{ fontFamily: 'var(--q-font-heading)' }}>
          Capital Readiness
        </h4>
        <span
          className="px-2.5 py-1 rounded-full text-[10px] font-bold border"
          style={{
            color: readiness.config.color,
            backgroundColor: readiness.config.bg,
            borderColor: readiness.config.border,
          }}
        >
          {readiness.config.badge} · {readiness.config.label}
        </span>
      </div>

      {/* Verdict */}
      <div
        className="p-4 rounded-lg border-l-[3px]"
        style={{
          borderLeftColor: readiness.config.color,
          backgroundColor: readiness.config.bg,
          borderColor: readiness.config.border,
        }}
      >
        <p className="text-sm text-[var(--q-text-primary)] leading-relaxed">
          {readiness.verdict}
        </p>
      </div>

      {/* Funding Paths */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--q-text-tertiary)]">
          Eligible Funding Paths
        </p>
        <div className="flex flex-wrap gap-1.5">
          {readiness.fundingPath.map((path) => (
            <span
              key={path}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--q-bg-elevated)] border border-[var(--q-border-default)] text-[var(--q-text-secondary)]"
            >
              <Landmark className="w-3 h-3" />
              {path}
            </span>
          ))}
        </div>
      </div>

      {/* What Must Change */}
      {readiness.whatMustChange.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--q-text-tertiary)]">
            To Reach Next Tier
          </p>
          <div className="space-y-1.5">
            {readiness.whatMustChange.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-[var(--q-text-secondary)]">
                <ChevronRight className="w-3 h-3 mt-0.5 text-[var(--q-accent-primary)] flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Milestone */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--q-accent-glow)] border border-[var(--q-accent-primary)]/15">
        <Target className="w-4 h-4 text-[var(--q-accent-primary)] flex-shrink-0" />
        <p className="text-xs text-[var(--q-text-secondary)]">
          <span className="font-semibold text-[var(--q-text-primary)]">Next: </span>
          {readiness.nextMilestone}
        </p>
      </div>
    </div>
  );
}
