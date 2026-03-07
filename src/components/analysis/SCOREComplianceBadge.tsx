import React, { useState } from 'react';
import { Shield, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface SCORECompliance {
  score: number;
  filledFields: string[];
  missingFields: string[];
  inconsistencies: Array<{ field: string; issue: string }>;
}

interface SCOREComplianceBadgeProps {
  compliance?: SCORECompliance;
}

export function SCOREComplianceBadge({ compliance }: SCOREComplianceBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  if (!compliance) return null;

  const { score, filledFields, missingFields, inconsistencies } = compliance;

  const color = score >= 80
    ? 'text-emerald-600 dark:text-emerald-400'
    : score >= 50
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-destructive';

  const bgColor = score >= 80
    ? 'bg-emerald-500/10 border-emerald-500/30'
    : score >= 50
    ? 'bg-amber-500/10 border-amber-500/30'
    : 'bg-destructive/10 border-destructive/30';

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          SCORE Compliance
        </h3>
        <div className="flex items-center gap-2">
          <Badge className={cn('font-bold text-xs', bgColor, color)}>
            {score}%
          </Badge>
          <ChevronDown className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )} />
        </div>
      </button>

      {/* Progress bar */}
      <div className="space-y-1">
        <Progress value={score} className="h-2" />
        <p className="text-xs text-muted-foreground">
          Your model fills {score}% of standard SCORE expectations
          {missingFields.length > 0 && ` — ${missingFields.length} fields missing`}
        </p>
      </div>

      {/* Inconsistencies */}
      {inconsistencies.length > 0 && (
        <div className="space-y-1">
          {inconsistencies.map((inc, i) => (
            <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{inc.field}:</span> {inc.issue}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="space-y-3 pt-2 border-t border-border animate-in fade-in duration-200">
          {/* Filled fields */}
          {filledFields.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Filled ({filledFields.length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {filledFields.map((f, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Missing fields */}
          {missingFields.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-muted-foreground" />
                Missing ({missingFields.length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {missingFields.map((f, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] text-muted-foreground">
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
