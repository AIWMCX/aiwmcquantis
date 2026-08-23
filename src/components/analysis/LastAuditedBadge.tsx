import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';
import { 
  getLatestAuditInfo, 
  getAuditFreshness, 
  getQSLLabel, 
  DEFAULT_AUDIT_INFO,
  type AuditInfo 
} from '@/services/safety-evaluation-service';
import { cn } from '@/lib/utils';

interface LastAuditedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
}

export function LastAuditedBadge({ size = 'md' }: LastAuditedBadgeProps) {
  const [auditInfo, setAuditInfo] = useState<AuditInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAuditInfo() {
      try {
        const info = await getLatestAuditInfo();
        setAuditInfo(info);
      } catch (err) {
        logger.error('Failed to fetch audit info', err);
        setAuditInfo(DEFAULT_AUDIT_INFO);
      } finally {
        setLoading(false);
      }
    }
    fetchAuditInfo();
  }, []);

  if (loading) {
    if (size === 'sm') {
      return <Skeleton className="h-4 w-48" />;
    }
    if (size === 'md') {
      return <Skeleton className="h-14 w-64 rounded-lg" />;
    }
    return <Skeleton className="h-32 w-72 rounded-xl" />;
  }

  const info = auditInfo || DEFAULT_AUDIT_INFO;
  const freshness = getAuditFreshness(info.lastAuditedAt);
  const qslLabel = getQSLLabel(info.safetyLevel);

  // Size SM: Inline text
  if (size === 'sm') {
    return (
      <Link 
        to="/methodology" 
        className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ShieldCheck className="w-3 h-3" style={{ color: freshness.color }} />
        <span>
          Automated internal checks ran{' '}
          <span style={{ color: freshness.color }}>{freshness.label}</span>
          {' '}· QSL-{info.safetyLevel} {qslLabel}
        </span>
      </Link>
    );
  }

  // Size MD: Compact card
  if (size === 'md') {
    return (
      <Link
        to="/methodology"
        className="inline-flex flex-col gap-1 px-3 py-2 rounded-lg border transition-colors hover:bg-muted/50"
        style={{
          backgroundColor: 'hsl(var(--muted) / 0.3)',
          borderColor: 'hsl(var(--border))',
        }}
      >
        <div className="flex items-center gap-1.5 text-xs text-foreground">
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: freshness.color }} />
          <span>
            Internal checks ran:{' '}
            <span className="font-medium" style={{ color: freshness.color }}>
              {freshness.label}
            </span>
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          QSL-{info.safetyLevel} · {info.engineVersion}
        </span>
      </Link>
    );
  }

  // Size LG: Full card with progress bar
  const progressPercent = (info.passedChecks / info.totalChecks) * 100;
  const progressColor = info.passedChecks >= 8 
    ? 'hsl(var(--q-status-green-hsl, 142 71% 45%))' 
    : info.passedChecks >= 6 
      ? 'hsl(var(--q-status-yellow-hsl, 45 93% 47%))' 
      : 'hsl(var(--q-status-red-hsl, 0 84% 60%))';

  const formattedDate = info.lastAuditedAt.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className="rounded-xl border p-5 space-y-4 max-w-xs"
      style={{
        backgroundColor: 'hsl(var(--card))',
        borderColor: 'hsl(var(--border))',
      }}
    >
      {/* Heading */}
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4" style={{ color: freshness.color }} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Automated Internal Checks
        </span>
      </div>

      {/* Date */}
      <p
        className="text-sm font-mono font-semibold"
        style={{ color: freshness.color }}
      >
        {formattedDate}
      </p>

      {/* QSL Level */}
      <p className="text-xs text-foreground">
        QSL-{info.safetyLevel} <span className="text-muted-foreground">{qslLabel}</span>
      </p>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div 
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: 'hsl(var(--muted))' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${progressPercent}%`,
              backgroundColor: progressColor,
            }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          {info.passedChecks}/{info.totalChecks} safety checks passed
        </p>
      </div>

      {/* Link */}
      <Link
        to="/methodology"
        className="text-[11px] text-primary hover:underline flex items-center gap-1"
      >
        View methodology →
      </Link>
    </div>
  );
}

/**
 * Hook to get audit freshness label for inline use.
 */
export function useAuditFreshness(): { label: string; loading: boolean } {
  const [label, setLabel] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const info = await getLatestAuditInfo();
        const freshness = getAuditFreshness(info.lastAuditedAt);
        setLabel(freshness.label.toLowerCase());
      } catch {
        setLabel('today');
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  return { label, loading };
}
