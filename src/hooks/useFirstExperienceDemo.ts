import { useEffect, useMemo, useRef, useState } from 'react';
import { recordFunnelEvent } from '@/lib/analytics';
import { useFirstExperienceDemoState } from '@/hooks/useFirstExperienceDemoState';
import {
  FOUNDER_DEMO_FIXTURE,
  LEVER_SEARCH,
  runFounderDemo,
  solveRequiredToWork,
  type FounderDemoAssumptions,
} from '@/lib/demo/founder-decision-demo';

/**
 * First Decision Experience state machine (Wave 1). Deliberately reuses the
 * SAME production fixture/engine as the shipped /demo/founder-decision-review
 * page rather than a second "onboarding" fixture -- the spec this implements
 * explicitly forbids a second independent financial logic layer, and this
 * fixture/decision (a $120K growth-spend call) is already the canonical
 * "confident claim" example used elsewhere in the product.
 */
export const DEMO_STEPS = ['INTRO', 'EVIDENCE', 'ECONOMICS', 'SCENARIOS', 'SENSITIVITY', 'DECISION_GATE'] as const;
export type DemoStep = (typeof DEMO_STEPS)[number];

export interface EvidenceItem {
  id: keyof FounderDemoAssumptions;
  label: string;
  value: string;
  type: 'FACT' | 'ASSUMPTION';
  why: string;
}

const EVIDENCE_LEDGER: EvidenceItem[] = [
  { id: 'price', label: 'Monthly price', value: '$149', type: 'FACT', why: 'Set price, not modeled.' },
  { id: 'grossMargin', label: 'Gross margin', value: '81%', type: 'FACT', why: 'Measured from current COGS.' },
  { id: 'cac', label: 'Blended CAC', value: '$1,180', type: 'ASSUMPTION', why: 'Assumes new acquisition converts at the same rate as today\'s.' },
  { id: 'churnMonthly', label: 'Monthly churn', value: '4.1%', type: 'ASSUMPTION', why: 'Assumes the current cohort\'s churn holds for new customers too.' },
];

export interface UseFirstExperienceDemoOptions {
  /** Wave 3: user is resuming a previously-started, not-yet-finished demo
   *  (routed here as /app/start?resume=1) -- skip the intro card and land
   *  straight on the first real step. Only step position is skipped, since
   *  Wave 2 persists start/complete/skip timestamps, not a step index. */
  resume?: boolean;
}

export function useFirstExperienceDemo(options: UseFirstExperienceDemoOptions = {}) {
  const fixture = FOUNDER_DEMO_FIXTURE;
  const [step, setStep] = useState<DemoStep>(options.resume ? 'EVIDENCE' : 'INTRO');
  const [assumptions, setAssumptions] = useState<FounderDemoAssumptions>(fixture.base);
  const [inspectedVariables, setInspectedVariables] = useState<Set<string>>(new Set());
  const [changedVariables, setChangedVariables] = useState<Set<string>>(new Set());
  const startedRef = useRef(false);
  const persisted = useFirstExperienceDemoState();

  if (!startedRef.current) {
    startedRef.current = true;
    recordFunnelEvent('first_experience_demo_started', { demo_version: fixture.version, context: 'demo' });
  }

  // Server-side persistence (Wave 2): idempotent upsert, never overwrites an
  // earlier real demo_started_at. In a useEffect, not the render body above
  // -- unlike the plain recordFunnelEvent call, react-query's mutate()
  // triggers its own internal state update and must not run during render.
  useEffect(() => {
    persisted.markStarted(fixture.version);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // runFounderDemo + solveRequiredToWork cost a few hundred ms per change.
  // Cache by assumption values so "reset to base" and toggling back to an
  // earlier value reuse the earlier run instead of recomputing.
  const runCache = useRef(new Map<string, { result: ReturnType<typeof runFounderDemo>; requiredToWork: ReturnType<typeof solveRequiredToWork> }>());
  const { result, requiredToWork } = useMemo(() => {
    const key = JSON.stringify(assumptions);
    let hit = runCache.current.get(key);
    if (!hit) {
      hit = { result: runFounderDemo(assumptions, fixture), requiredToWork: solveRequiredToWork(assumptions, fixture) };
      if (runCache.current.size >= 50) runCache.current.clear();
      runCache.current.set(key, hit);
    }
    return hit;
  }, [assumptions, fixture]);
  const hasMeaningfulInteraction = inspectedVariables.size > 0 || changedVariables.size > 0;

  function goToStep(next: DemoStep) {
    setStep(next);
    recordFunnelEvent('first_experience_demo_step_viewed', { step: next, demo_version: fixture.version, context: 'demo' });
  }

  function inspectVariable(id: string) {
    setInspectedVariables((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    recordFunnelEvent('first_experience_variable_inspected', { variable_id: id, demo_version: fixture.version, context: 'demo' });
  }

  function updateAssumption(lever: keyof FounderDemoAssumptions, value: number) {
    setAssumptions((prev) => ({ ...prev, [lever]: value }));
    setChangedVariables((prev) => {
      const next = new Set(prev);
      next.add(lever);
      return next;
    });
    recordFunnelEvent('first_experience_variable_inspected', {
      variable_id: lever,
      action: 'changed',
      demo_version: fixture.version,
      context: 'demo',
    });
  }

  function resetToBase() {
    setAssumptions(fixture.base);
    setChangedVariables(new Set());
  }

  function completeDemo() {
    persisted.markCompleted(fixture.version);
    recordFunnelEvent('first_experience_demo_completed', {
      demo_version: fixture.version,
      context: 'demo',
      inspected_count: inspectedVariables.size,
      changed_count: changedVariables.size,
      has_meaningful_interaction: hasMeaningfulInteraction,
    });
  }

  function startOwnDecision() {
    recordFunnelEvent('first_experience_own_decision_started', { demo_version: fixture.version, context: 'demo' });
  }

  /**
   * Skipping must be atomic from the user's perspective: persist first,
   * THEN record telemetry, THEN let the caller navigate. Awaited (not
   * fire-and-forget) so a failed write is never silently treated as a
   * saved preference -- caught in code review: a fire-and-forget skip that
   * fails would leave the server thinking the user is still mid-demo, so
   * the resolver would wrongly resume them into it on their next sign-in,
   * violating the exact contract this was added to support. Returns
   * whether persistence actually succeeded so the caller can show a
   * recoverable error instead of navigating on a false premise.
   */
  async function skipDemo(): Promise<boolean> {
    try {
      await persisted.markSkippedAsync(fixture.version);
    } catch {
      return false;
    }
    // Distinct from first_experience_own_decision_started: skipping means
    // the user declined onboarding, not that they've started a real
    // decision yet -- those are different, and conflating them would make
    // the event name lie about what happened (caught in code review).
    recordFunnelEvent('first_experience_demo_skipped', { demo_version: fixture.version, context: 'demo' });
    return true;
  }

  const stepIndex = DEMO_STEPS.indexOf(step);

  return {
    fixture,
    step,
    stepIndex,
    totalSteps: DEMO_STEPS.length,
    goToStep,
    assumptions,
    result,
    requiredToWork,
    leverSearch: LEVER_SEARCH,
    evidenceLedger: EVIDENCE_LEDGER,
    inspectedVariables,
    changedVariables,
    hasMeaningfulInteraction,
    inspectVariable,
    updateAssumption,
    resetToBase,
    completeDemo,
    startOwnDecision,
    skipDemo,
    // Wave 2/3: server-persisted progress, exposed for the resolver and any
    // other consumer to read without duplicating the fetch.
    hasStartedBefore: persisted.hasStartedBefore,
    hasCompletedBefore: persisted.hasCompletedBefore,
    hasSkippedBefore: persisted.hasSkippedBefore,
  };
}

export type FirstExperienceDemoApi = ReturnType<typeof useFirstExperienceDemo>;
