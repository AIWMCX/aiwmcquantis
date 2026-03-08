import React from 'react';
import { Shield, CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ConfidenceTier = 'verified' | 'confirmed' | 'estimated' | 'uncertain' | 'blocked';

interface QConfidenceBadgeProps {
  score: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

function getTier(score: number): ConfidenceTier {
  if (score >= 95) return 'verified';
  if (score >= 80) return 'confirmed';
  if (score >= 65) return 'estimated';
  if (score >= 50) return 'uncertain';
  return 'blocked';
}

const TIER_CONFIG: Record<ConfidenceTier, {
  label: string;
  icon: React.ElementType;
  prefix: string;
  classes: string;
  glow?: string;
}> = {
  verified: {
    label: 'VERIFIED',
    icon: Shield,
    prefix: '',
    classes: 'bg-[var(--q-status-green-bg)] text-[var(--q-status-green)] border-[var(--q-status-green-border)]',
    glow: 'shadow-[0_0_12px_var(--q-status-green-bg)]',
  },
  confirmed: {
    label: 'CONFIRMED',
    icon: CheckCircle2,
    prefix: '✓',
    classes: 'bg-[rgba(79,142,247,0.08)] text-[var(--q-accent-primary)] border-[rgba(79,142,247,0.2)]',
  },
  estimated: {
    label: 'ESTIMATED',
    icon: Info,
    prefix: '~',
    classes: 'bg-[var(--q-status-yellow-bg)] text-[var(--q-status-yellow)] border-[var(--q-status-yellow-border)]',
  },
  uncertain: {
    label: 'UNCERTAIN',
    icon: AlertTriangle,
    prefix: '⚠',
    classes: 'bg-[var(--q-status-orange-bg)] text-[var(--q-status-orange)] border-[var(--q-status-orange-border)]',
  },
  blocked: {
    label: 'INSUFFICIENT DATA',
    icon: XCircle,
    prefix: '✕',
    classes: 'bg-muted/50 text-muted-foreground border-border',
  },
};

export function QConfidenceBadge({ score, className, showLabel = true, size = 'sm' }: QConfidenceBadgeProps) {
  const tier = getTier(score);
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;

  const sizeClasses = size === 'md'
    ? 'px-3 py-1.5 text-xs gap-1.5'
    : 'px-2 py-0.5 text-[10px] gap-1';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold tracking-wide',
        sizeClasses,
        config.classes,
        config.glow,
        className
      )}
    >
      <Icon className={size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      {showLabel && <span>{config.label}</span>}
      <span className="font-mono">{score}%</span>
    </span>
  );
}

export { getTier, type ConfidenceTier };
