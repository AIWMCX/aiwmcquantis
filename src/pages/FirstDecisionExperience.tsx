import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageSEO } from '@/components/seo/PageSEO';
import { DemoProgressRail } from '@/components/first-experience/DemoProgressRail';
import { EvidenceStep } from '@/components/first-experience/EvidenceStep';
import { EconomicsStep } from '@/components/first-experience/EconomicsStep';
import { StressTestStep } from '@/components/first-experience/StressTestStep';
import { SensitivityStep } from '@/components/first-experience/SensitivityStep';
import { DecisionGateStep } from '@/components/first-experience/DecisionGateStep';
import { DEMO_STEPS, useFirstExperienceDemo, type DemoStep } from '@/hooks/useFirstExperienceDemo';

const NEXT: Partial<Record<DemoStep, DemoStep>> = {
  INTRO: 'EVIDENCE',
  EVIDENCE: 'ECONOMICS',
  ECONOMICS: 'SCENARIOS',
  SCENARIOS: 'SENSITIVITY',
  SENSITIVITY: 'DECISION_GATE',
};
const PREV: Partial<Record<DemoStep, DemoStep>> = {
  EVIDENCE: 'INTRO',
  ECONOMICS: 'EVIDENCE',
  SCENARIOS: 'ECONOMICS',
  SENSITIVITY: 'SCENARIOS',
  DECISION_GATE: 'SENSITIVITY',
};

export default function FirstDecisionExperience() {
  const [searchParams] = useSearchParams();
  const demo = useFirstExperienceDemo({ resume: searchParams.get('resume') === '1' });
  const { step, stepIndex, totalSteps, goToStep, fixture } = demo;

  function next() {
    const target = NEXT[step];
    if (!target) return;
    if (target === 'DECISION_GATE') demo.completeDemo();
    goToStep(target);
  }

  function back() {
    const target = PREV[step];
    if (target) goToStep(target);
  }

  return (
    <AppLayout title="How Quantis works">
      <PageSEO
        title="How Quantis Works — First Decision"
        description="A five-step walkthrough of how Quantis tests a real spending decision, using the same engine that powers every Decision Run."
        canonical="/app/start"
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {step === 'INTRO' ? (
          <GlassCard className="p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-3">See how it works with one example</p>
            <h1 className="text-2xl md:text-3xl font-bold mb-3">Test the financial conditions behind a decision.</h1>
            <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
              Quantis separates what you know from what you're assuming, models the financial consequences, tests downside conditions,
              and shows what has to be true before you commit capital. No setup. No data of yours required — this walkthrough uses one
              fixed example.
            </p>
            <Button size="lg" onClick={next}>
              Start 5-step demo
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Already know Quantis?{' '}
              <Link to="/app" onClick={demo.skipDemo} className="underline hover:text-foreground">
                Start my own decision
              </Link>
            </p>
          </GlassCard>
        ) : (
          <>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <DemoProgressRail step={step} />
              <span className="text-xs text-muted-foreground tabular-nums">
                {stepIndex} / {totalSteps - 1}
              </span>
            </div>

            <GlassCard className="p-4 text-xs text-muted-foreground">
              <strong className="text-foreground">Illustrative Quantis demonstration.</strong> Fixed example company:{' '}
              {fixture.startingCustomers} existing customers, ${fixture.decision.totalSpend.toLocaleString('en-US')} in proposed growth
              spend. Not a forecast for your business.
            </GlassCard>

            {step === 'EVIDENCE' && (
              <EvidenceStep ledger={demo.evidenceLedger} inspected={demo.inspectedVariables} onInspect={demo.inspectVariable} />
            )}
            {step === 'ECONOMICS' && <EconomicsStep result={demo.result} />}
            {step === 'SCENARIOS' && (
              <StressTestStep
                cac={demo.assumptions.cac}
                onChangeCac={(v) => demo.updateAssumption('cac', v)}
                result={demo.result}
                touched={demo.changedVariables.has('cac')}
              />
            )}
            {step === 'SENSITIVITY' && <SensitivityStep requiredToWork={demo.requiredToWork} />}
            {step === 'DECISION_GATE' && (
              <DecisionGateStep requiredToWork={demo.requiredToWork} onStartOwnDecision={demo.startOwnDecision} />
            )}

            {step !== 'DECISION_GATE' && (
              <div className="flex justify-between">
                <Button variant="outline" onClick={back} disabled={step === 'EVIDENCE'}>
                  Back
                </Button>
                <Button onClick={next}>Next</Button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
