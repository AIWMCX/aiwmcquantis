import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PriceBand } from '@/lib/service-job/types';

interface Props {
  variant: 'aggressive' | 'balanced' | 'defensive';
  band: PriceBand;
  probLossPct?: number;
  probMarginBelowTargetPct?: number;
}

const META: Record<Props['variant'], { title: string; subtitle: string; accent: string }> = {
  aggressive: {
    title: 'Aggressive',
    subtitle: 'Win the bid. ~25% risk of margin shortfall.',
    accent: 'border-amber-500/40 bg-amber-500/5',
  },
  balanced: {
    title: 'Balanced',
    subtitle: 'Recommended. ~10% risk of margin shortfall.',
    accent: 'border-primary/50 bg-primary/5',
  },
  defensive: {
    title: 'Defensive',
    subtitle: 'Protect downside. ≤2% risk of loss.',
    accent: 'border-emerald-500/40 bg-emerald-500/5',
  },
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function PriceBandCard({ variant, band, probLossPct, probMarginBelowTargetPct }: Props) {
  const m = META[variant];
  const recommended = variant === 'balanced';
  return (
    <Card className={cn('relative border-2', m.accent)}>
      {recommended && (
        <Badge className="absolute -top-2 left-4">Recommended</Badge>
      )}
      <CardContent className="space-y-2 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {m.title}
          </h3>
          <span className="font-mono text-xs text-muted-foreground">
            {(band.margin_pct * 100).toFixed(0)}% margin
          </span>
        </div>
        <p className="font-mono text-3xl font-bold tabular-nums">{fmt(band.price)}</p>
        <p className="text-xs text-muted-foreground">{m.subtitle}</p>
        {(probLossPct !== undefined || probMarginBelowTargetPct !== undefined) && (
          <div className="mt-2 grid grid-cols-2 gap-2 border-t pt-2 text-xs">
            <div>
              <p className="text-muted-foreground">P(loss)</p>
              <p className="font-mono font-medium">{(probLossPct ?? 0).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">P(below target)</p>
              <p className="font-mono font-medium">{(probMarginBelowTargetPct ?? 0).toFixed(1)}%</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
