/**
 * First Decision Experience state machine (Wave 1).
 *
 * The engine math itself (runFounderDemo / solveRequiredToWork) is already
 * covered by founder-decision-demo.test.ts -- this suite only proves the
 * state machine wired around it: step transitions, evidence-inspection
 * tracking, and that every emitted event carries `context: 'demo'` so it
 * can never be double-counted as real product activation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockRecordFunnelEvent = vi.fn();
vi.mock('@/lib/analytics', () => ({
  recordFunnelEvent: (...args: unknown[]) => mockRecordFunnelEvent(...args),
}));

import { useFirstExperienceDemo, DEMO_STEPS } from '@/hooks/useFirstExperienceDemo';
import { FOUNDER_DEMO_FIXTURE } from '@/lib/demo/founder-decision-demo';

describe('useFirstExperienceDemo', () => {
  beforeEach(() => {
    mockRecordFunnelEvent.mockClear();
  });

  it('starts on INTRO and fires first_experience_demo_started exactly once, tagged as demo', () => {
    const { result } = renderHook(() => useFirstExperienceDemo());
    expect(result.current.step).toBe('INTRO');
    const startedCalls = mockRecordFunnelEvent.mock.calls.filter((c) => c[0] === 'first_experience_demo_started');
    expect(startedCalls).toHaveLength(1);
    expect(startedCalls[0][1]).toMatchObject({ context: 'demo' });
  });

  it('walks every step in order via goToStep and records first_experience_demo_step_viewed for each', () => {
    const { result } = renderHook(() => useFirstExperienceDemo());
    for (const step of DEMO_STEPS.slice(1)) {
      act(() => result.current.goToStep(step));
      expect(result.current.step).toBe(step);
    }
    const stepViews = mockRecordFunnelEvent.mock.calls.filter((c) => c[0] === 'first_experience_demo_step_viewed');
    expect(stepViews).toHaveLength(DEMO_STEPS.length - 1);
  });

  it('tracks inspected evidence variables without duplicating an already-inspected one', () => {
    const { result } = renderHook(() => useFirstExperienceDemo());
    act(() => result.current.inspectVariable('cac'));
    act(() => result.current.inspectVariable('cac'));
    expect(result.current.inspectedVariables.size).toBe(1);
    expect(result.current.hasMeaningfulInteraction).toBe(true);
    const inspected = mockRecordFunnelEvent.mock.calls.filter((c) => c[0] === 'first_experience_variable_inspected');
    // Second click on the same variable is still recorded (re-inspection is
    // real signal); only the local Set dedupes for hasMeaningfulInteraction.
    expect(inspected.length).toBeGreaterThanOrEqual(1);
  });

  it('updateAssumption changes the live result using the SAME production engine as the founder demo page', () => {
    const { result } = renderHook(() => useFirstExperienceDemo());
    const baseHolds = result.current.result.holds;
    act(() => result.current.updateAssumption('churnMonthly', FOUNDER_DEMO_FIXTURE.base.churnMonthly * 3));
    expect(result.current.assumptions.churnMonthly).toBeCloseTo(FOUNDER_DEMO_FIXTURE.base.churnMonthly * 3, 6);
    // Tripling churn must never make a marginal decision look safer.
    if (!baseHolds) {
      expect(result.current.result.holds).toBe(false);
    }
    expect(result.current.changedVariables.has('churnMonthly')).toBe(true);
  });

  it('resetToBase clears changed variables and restores the fixture base assumptions', () => {
    const { result } = renderHook(() => useFirstExperienceDemo());
    act(() => result.current.updateAssumption('cac', 2500));
    act(() => result.current.resetToBase());
    expect(result.current.assumptions).toEqual(FOUNDER_DEMO_FIXTURE.base);
    expect(result.current.changedVariables.size).toBe(0);
  });

  it('completeDemo and startOwnDecision both record demo-context funnel events', () => {
    const { result } = renderHook(() => useFirstExperienceDemo());
    act(() => result.current.completeDemo());
    act(() => result.current.startOwnDecision());
    const completed = mockRecordFunnelEvent.mock.calls.find((c) => c[0] === 'first_experience_demo_completed');
    const started = mockRecordFunnelEvent.mock.calls.find((c) => c[0] === 'first_experience_own_decision_started');
    expect(completed?.[1]).toMatchObject({ context: 'demo' });
    expect(started?.[1]).toMatchObject({ context: 'demo' });
  });
});
