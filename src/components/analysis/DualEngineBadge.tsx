import React from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CrossValidation {
  agreement_score: number;
  is_dual_engine_verified: boolean;
  recommendation: string;
  divergence_count: number;
  critical_divergences: number;
  audit_summary: string;
}

interface DualEngineBadgeProps {
  crossValidation?: CrossValidation;
  className?: string;
}

export function DualEngineBadge({ crossValidation, className }: DualEngineBadgeProps) {
  if (!crossValidation) return null;

  const { agreement_score, is_dual_engine_verified, divergence_count, critical_divergences } = crossValidation;

  const isVerified = is_dual_engine_verified;
  const scoreColor = agreement_score >= 95
    ? 'text-emerald-700 dark:text-emerald-400'
    : agreement_score >= 80
    ? 'text-amber-700 dark:text-amber-400'
    : 'text-destructive';

  const bgColor = isVerified
    ? 'bg-emerald-500/10 border-emerald-500/30'
    : agreement_score >= 80
    ? 'bg-amber-500/10 border-amber-500/30'
    : 'bg-destructive/10 border-destructive/30';

  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm", bgColor, className)}>
      {isVerified ? (
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      )}
      <span className={cn("font-semibold", scoreColor)}>
        {isVerified ? 'Dual-Engine Verified' : `Engine Agreement: ${agreement_score}%`}
      </span>
      {divergence_count > 0 && (
        <Badge variant="outline" className="text-[10px] py-0 px-1.5">
          {divergence_count} divergence{divergence_count > 1 ? 's' : ''}
          {critical_divergences > 0 && ` (${critical_divergences} critical)`}
        </Badge>
      )}
    </div>
  );
}
