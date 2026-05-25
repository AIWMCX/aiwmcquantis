import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RiskFlag } from '@/lib/service-job/types';

const STYLES: Record<RiskFlag['severity'], { icon: typeof Info; border: string; text: string }> = {
  low: { icon: Info, border: 'border-emerald-500/40 bg-emerald-500/5', text: 'text-emerald-700 dark:text-emerald-400' },
  medium: { icon: AlertTriangle, border: 'border-amber-500/40 bg-amber-500/5', text: 'text-amber-700 dark:text-amber-400' },
  high: { icon: AlertCircle, border: 'border-red-500/50 bg-red-500/5', text: 'text-red-700 dark:text-red-400' },
};

export function RiskFlagCard({ risk }: { risk: RiskFlag }) {
  const s = STYLES[risk.severity];
  const Icon = s.icon;
  return (
    <Card className={cn('border-2', s.border)}>
      <CardContent className="flex gap-3 p-4">
        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', s.text)} />
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className={cn('text-xs font-semibold uppercase tracking-wide', s.text)}>
              {risk.severity}
            </p>
            <span className="text-xs text-muted-foreground">{risk.category}</span>
          </div>
          <p className="text-sm">{risk.message}</p>
          {risk.impact_estimate && (
            <p className="text-xs text-muted-foreground">Impact: {risk.impact_estimate}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
