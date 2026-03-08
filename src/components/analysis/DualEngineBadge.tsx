import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, Info, AlertTriangle, XCircle, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConfidenceTier } from '@/services/confidence-scorer';

// ── New interface ──

export interface DualEngineBadgeProps {
  consensusScore: number;
  gptConfidence: number;
  geminiConfidence: number;
  overallConfidence: number;
  tier: ConfidenceTier;
  processingMs?: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

// ── Legacy interface (backward compat) ──

interface LegacyCrossValidation {
  agreement_score: number;
  is_dual_engine_verified: boolean;
  recommendation: string;
  divergence_count: number;
  critical_divergences: number;
  audit_summary: string;
}

interface LegacyDualEngineBadgeProps {
  crossValidation?: LegacyCrossValidation;
  className?: string;
}

type CombinedProps = DualEngineBadgeProps | LegacyDualEngineBadgeProps;

// ── Tier config ──

const TIER_CONFIG: Record<ConfidenceTier, {
  icon: React.ElementType;
  label: string;
  emoji: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  glowClass: string;
}> = {
  verified: {
    icon: ShieldCheck,
    label: 'GPT + Gemini Verified',
    emoji: '',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    glowClass: 'shadow-[0_0_12px_hsl(var(--chart-2)/0.3)]',
  },
  confident: {
    icon: CheckCircle2,
    label: 'Dual Engine Checked',
    emoji: '',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30',
    textClass: 'text-blue-700 dark:text-blue-400',
    glowClass: '',
  },
  estimated: {
    icon: Info,
    label: 'AI Estimated',
    emoji: '',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    textClass: 'text-amber-700 dark:text-amber-400',
    glowClass: '',
  },
  uncertain: {
    icon: AlertTriangle,
    label: 'Low Confidence',
    emoji: '',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/30',
    textClass: 'text-orange-700 dark:text-orange-400',
    glowClass: '',
  },
  blocked: {
    icon: XCircle,
    label: '✗ Insufficient Data',
    emoji: '✗',
    bgClass: 'bg-destructive/10',
    borderClass: 'border-destructive/30',
    textClass: 'text-destructive',
    glowClass: '',
  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-3 py-1.5 gap-2',
  lg: 'text-base px-4 py-2.5 gap-2.5',
};

const ICON_SIZES = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-5 h-5' };

// ── Normalize legacy props ──

function isNewProps(props: CombinedProps): props is DualEngineBadgeProps {
  return 'tier' in props;
}

function normalizeLegacy(cv: LegacyCrossValidation): DualEngineBadgeProps {
  const score = cv.agreement_score;
  let tier: ConfidenceTier = 'blocked';
  if (score >= 95) tier = 'verified';
  else if (score >= 80) tier = 'confident';
  else if (score >= 65) tier = 'estimated';
  else if (score >= 50) tier = 'uncertain';

  return {
    consensusScore: score,
    gptConfidence: score,
    geminiConfidence: score,
    overallConfidence: score,
    tier,
  };
}

// ── Component ──

export function DualEngineBadge(props: CombinedProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Handle legacy
  if (!isNewProps(props)) {
    if (!props.crossValidation) return null;
    const normalized = normalizeLegacy(props.crossValidation);
    return <DualEngineBadgeInner {...normalized} className={props.className} />;
  }

  return <DualEngineBadgeInner {...props} />;
}

function DualEngineBadgeInner({
  consensusScore,
  gptConfidence,
  geminiConfidence,
  overallConfidence,
  tier,
  processingMs,
  size = 'md',
  showDetails = false,
  className,
}: DualEngineBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;

  const isExpandable = showDetails || size === 'lg';

  return (
    <div
      className={cn(
        'inline-flex flex-col rounded-lg border transition-all duration-300',
        'animate-in zoom-in-95 fade-in duration-300',
        config.bgClass,
        config.borderClass,
        config.glowClass,
        className,
      )}
    >
      {/* Main badge row */}
      <button
        onClick={isExpandable ? () => setExpanded(!expanded) : undefined}
        className={cn(
          'inline-flex items-center font-semibold',
          SIZE_CLASSES[size],
          config.textClass,
          isExpandable && 'cursor-pointer hover:opacity-80',
          !isExpandable && 'cursor-default',
        )}
        type="button"
        aria-expanded={isExpandable ? expanded : undefined}
      >
        <Icon className={cn(ICON_SIZES[size])} />
        <span>{config.label}</span>
        {size !== 'sm' && (
          <span className="text-muted-foreground font-normal ml-1">
            {overallConfidence}%
          </span>
        )}
        {isExpandable && (
          expanded
            ? <ChevronUp className={cn(ICON_SIZES[size], 'ml-0.5 text-muted-foreground')} />
            : <ChevronDown className={cn(ICON_SIZES[size], 'ml-0.5 text-muted-foreground')} />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className={cn(
          'border-t px-3 py-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200',
          config.borderClass,
        )}>
          {/* Per-model breakdown */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">GPT-4o mini:</span>
              <span className="font-semibold text-foreground tabular-nums">{gptConfidence}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Gemini:</span>
              <span className="font-semibold text-foreground tabular-nums">{geminiConfidence}%</span>
            </div>
          </div>

          {/* Consensus bar */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Agreement</span>
              <span className="font-semibold text-foreground tabular-nums">{consensusScore}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', {
                  'bg-emerald-500': consensusScore >= 90,
                  'bg-blue-500': consensusScore >= 75 && consensusScore < 90,
                  'bg-amber-500': consensusScore >= 60 && consensusScore < 75,
                  'bg-destructive': consensusScore < 60,
                })}
                style={{ width: `${consensusScore}%` }}
              />
            </div>
          </div>

          {/* Processing time */}
          {processingMs != null && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="w-3 h-3" />
              Analyzed in {processingMs}ms
            </div>
          )}
        </div>
      )}
    </div>
  );
}
