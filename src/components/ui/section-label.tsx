/**
 * SectionLabel — the institutional eyebrow label used throughout the app.
 * Matches the landing page's "DETERMINISTIC ENGINE · SOURCES CITED ON EVERY NUMBER" style.
 *
 * Usage:
 *   <SectionLabel>Engine Status</SectionLabel>
 *   <SectionLabel dot="green" icon={<Shield size={10} />}>QSL-2 Verified</SectionLabel>
 */
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface SectionLabelProps {
  children: ReactNode;
  className?: string;
  /** Optional leading status dot color */
  dot?: 'green' | 'yellow' | 'red' | 'cyan' | 'none';
  /** Optional leading icon (renders before text) */
  icon?: ReactNode;
  /** Variant: default pill or bare text */
  variant?: 'pill' | 'bare';
}

const DOT_COLORS: Record<NonNullable<SectionLabelProps['dot']>, string> = {
  green:  'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]',
  yellow: 'bg-amber-400  shadow-[0_0_5px_rgba(245,158,11,0.8)]',
  red:    'bg-red-500    shadow-[0_0_5px_rgba(239,68,68,0.8)]',
  cyan:   'bg-cyan-400   shadow-[0_0_5px_rgba(45,212,191,0.8)]',
  none:   '',
};

export function SectionLabel({
  children,
  className,
  dot,
  icon,
  variant = 'pill',
}: SectionLabelProps) {
  const isPill = variant === 'pill';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        'font-mono text-[10px] font-medium tracking-[0.18em] uppercase',
        'text-[var(--q-accent-primary)]',
        isPill && [
          'rounded-full border border-[var(--q-border-default)]',
          'bg-[var(--q-bg-elevated)] px-3 py-1',
        ],
        className,
      )}
    >
      {dot && dot !== 'none' && (
        <span className={cn('inline-block w-1.5 h-1.5 rounded-full flex-shrink-0', DOT_COLORS[dot])} />
      )}
      {icon && <span className="flex-shrink-0 opacity-70">{icon}</span>}
      {children}
    </span>
  );
}
