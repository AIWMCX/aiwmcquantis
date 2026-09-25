import { GlassCard } from '@/components/ui/glass-card';
import { LEVER_SEARCH, type FounderDemoAssumptions, type RequiredToWork } from '@/lib/demo/founder-decision-demo';
import { fmtUsd } from './format';

const LEVER_LABEL: Record<keyof FounderDemoAssumptions, string> = {
  cac: 'Blended CAC',
  churnMonthly: 'Monthly churn',
  price: 'Price / month',
  grossMargin: 'Gross margin',
};

const LEVER_FORMAT: Record<keyof FounderDemoAssumptions, (v: number) => string> = {
  cac: (v) => fmtUsd(v),
  churnMonthly: (v) => `${(v * 100).toFixed(1)}%`,
  price: (v) => fmtUsd(v),
  grossMargin: (v) => `${(v * 100).toFixed(0)}%`,
};

export function SensitivityStep({ requiredToWork }: { requiredToWork: RequiredToWork[] }) {
  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold mb-1">Find what can actually change the decision.</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Holding every other assumption where it is now, here is the boundary for each one.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {requiredToWork.map((r) => {
          const { worseWhen } = LEVER_SEARCH[r.lever];
          const cmp = worseWhen === 'higher' ? '≤' : '≥';
          return (
            <div key={r.lever} className="rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">{LEVER_LABEL[r.lever]}</p>
              <p className="text-sm font-bold">
                {r.threshold === null
                  ? 'Never holds'
                  : r.unbounded
                    ? 'Holds across full range'
                    : `${cmp} ${LEVER_FORMAT[r.lever](r.threshold)}`}
              </p>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
