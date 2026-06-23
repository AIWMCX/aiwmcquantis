/**
 * DataMetric — financial KPI display with monospace number and context label.
 * Matches the screenshot's "INITIAL INVESTMENT / $142,500 / Build-out + 4-mo runway" cards.
 *
 * Usage:
 *   <DataMetric label="Monthly Profit (Y2)" value="$11,800" sub="Net, after all OpEx" />
 *   <DataMetric label="Confidence" value="79%" trend="up" status="good" />
 */
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

type MetricStatus = 'good' | 'warn' | 'bad' | 'neutral';
type MetricTrend  = 'up' | 'down' | 'flat';

const STATUS_COLORS: Record<MetricStatus, string> = {
  good:    'text-emerald-400',
  warn:    'text-amber-400',
  bad:     'text-red-400',
  neutral: 'text-[var(--q-text-primary)]',
};

const TREND_ICONS: Record<MetricTrend, ReactNode> = {
  up:   <TrendingUp  className="w-3.5 h-3.5 text-emerald-400" />,
  down: <TrendingDown className="w-3.5 h-3.5 text-red-400" />,
  flat: <Minus className="w-3.5 h-3.5 text-[var(--q-text-tertiary)]" />,
};

interface DataMetricProps {
  label: string;
  value: string;
  sub?: string;
  trend?: MetricTrend;
  status?: MetricStatus;
  /** Small annotation next to the value */
  annotation?: string;
  className?: string;
  /** Render as a clickable card that expands */
  expandable?: boolean;
  onClick?: () => void;
}

export function DataMetric({
  label,
  value,
  sub,
  trend,
  status = 'neutral',
  annotation,
  className,
  expandable,
  onClick,
}: DataMetricProps) {
  const valueColor = STATUS_COLORS[status];

  return (
    <div
      className={cn(
        'q-finance-card flex flex-col gap-1 p-4 sm:p-5',
        expandable && 'cursor-pointer hover:border-[var(--q-border-strong)] transition-colors duration-150',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* LABEL */}
      <p className="q-metric-band-label flex items-center gap-1.5">
        {trend && TREND_ICONS[trend]}
        {label}
      </p>

      {/* VALUE */}
      <div className="flex items-end gap-1.5">
        <span
          className={cn(
            'q-metric-band-value',
            valueColor,
          )}
        >
          {value}
        </span>
        {annotation && (
          <span className="text-[11px] font-mono text-[var(--q-text-tertiary)] mb-0.5 leading-none">
            {annotation}
          </span>
        )}
      </div>

      {/* SUB */}
      {sub && <p className="q-metric-band-sub">{sub}</p>}
    </div>
  );
}

/** 4-column KPI band matching the screenshot layout */
export function DataMetricBand({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 md:grid-cols-4 gap-3',
        className,
      )}
    >
      {children}
    </div>
  );
}
