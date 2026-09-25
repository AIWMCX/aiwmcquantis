import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import type { FounderDemoAssumptions, RequiredToWork } from '@/lib/demo/founder-decision-demo';
import { fmtUsd } from './format';

interface Props {
  requiredToWork: RequiredToWork[];
  onStartOwnDecision: () => void;
}

const LEVER_LABEL: Record<keyof FounderDemoAssumptions, string> = {
  cac: 'CAC remains below',
  churnMonthly: 'Churn remains below',
  price: 'Price remains above',
  grossMargin: 'Gross margin remains above',
};

// Mirrors SensitivityStep's LEVER_FORMAT -- churn and gross margin are 0-1
// fractions, never dollar amounts, so they must never go through fmtUsd.
const LEVER_FORMAT: Record<keyof FounderDemoAssumptions, (v: number) => string> = {
  cac: (v) => fmtUsd(v),
  churnMonthly: (v) => `${(v * 100).toFixed(1)}%`,
  price: (v) => fmtUsd(v),
  grossMargin: (v) => `${(v * 100).toFixed(0)}%`,
};

export function DecisionGateStep({ requiredToWork, onStartOwnDecision }: Props) {
  const conditions = requiredToWork.filter((r) => r.threshold !== null && !r.unbounded);

  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold mb-1">Turn analysis into a decision you can monitor.</h2>
      <p className="text-sm text-muted-foreground mb-5">Quantis does not decide for you. It makes the conditions behind the decision explicit.</p>

      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500 mb-2">Proceed if</p>
        <ul className="space-y-1 text-sm">
          {conditions.map((c) => (
            <li key={c.lever} className="flex items-center gap-2">
              <span className="text-emerald-500">&#10003;</span>
              {LEVER_LABEL[c.lever]} {LEVER_FORMAT[c.lever](c.threshold ?? 0)}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Reconsider if any critical condition fails.</p>

      <div className="text-center pt-2 border-t border-border">
        <p className="text-sm text-muted-foreground mb-4 mt-4">Now test your own decision.</p>
        <Link to="/app" onClick={onStartOwnDecision}>
          <Button size="lg" className="gap-2">
            Start my own decision
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </GlassCard>
  );
}
