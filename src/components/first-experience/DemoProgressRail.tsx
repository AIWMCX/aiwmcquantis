import { CheckCircle2 } from 'lucide-react';
import { DEMO_STEPS, type DemoStep } from '@/hooks/useFirstExperienceDemo';

const STEP_LABEL: Record<DemoStep, string> = {
  INTRO: 'Start',
  EVIDENCE: 'Know what you know',
  ECONOMICS: 'See the model',
  SCENARIOS: 'Stress-test it',
  SENSITIVITY: 'Find what matters',
  DECISION_GATE: 'Decide with conditions',
};

export function DemoProgressRail({ step }: { step: DemoStep }) {
  const currentIndex = DEMO_STEPS.indexOf(step);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {DEMO_STEPS.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li
            key={s}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${
              active
                ? 'border-primary bg-primary/10 text-primary font-semibold'
                : done
                  ? 'border-emerald-500/40 text-emerald-500'
                  : 'border-border text-muted-foreground'
            }`}
          >
            {done ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <span className="tabular-nums">{i + 1}</span>}
            {STEP_LABEL[s]}
          </li>
        );
      })}
    </ol>
  );
}
