/**
 * First Decision Experience state machine (Wave 1) and its Wave 2
 * server-persistence wiring.
 *
 * The engine math itself (runFounderDemo / solveRequiredToWork) is already
 * covered by founder-decision-demo.test.ts -- this suite only proves the
 * state machine wired around it: step transitions, evidence-inspection
 * tracking, that every emitted event carries `context: 'demo'` so it can
 * never be double-counted as real product activation, and that the Wave 2
 * persistence hook is called at the right moments (started once on mount,
 * completed when reaching the decision gate).
 *
 * useFirstExperienceDemoState (Supabase/React Query) is mocked here --
 * it's a thin persistence wrapper, and its own read/write correctness is
 * covered by the RPC functions themselves (SQL, not TS) plus manual/CI
 * verification against the real database.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockRecordFunnelEvent = vi.fn();
vi.mock('@/lib/analytics', () => ({
  recordFunnelEvent: (...args: unknown[]) => mockRecordFunnelEvent(...args),
}));

const mockMarkStarted = vi.fn();
const mockMarkCompleted = vi.fn();
const mockMarkSkipped = vi.fn();
const mockMarkSkippedAsync = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useFirstExperienceDemoState', () => ({
  useFirstExperienceDemoState: () => ({
    state: null,
    isLoading: false,
    hasStartedBefore: false,
    hasCompletedBefore: false,
    hasSkippedBefore: false,
    markStarted: mockMarkStarted,
    markCompleted: mockMarkCompleted,
    markSkipped: mockMarkSkipped,
    markSkippedAsync: mockMarkSkippedAsync,
  }),
}));

import { useFirstExperienceDemo, DEMO_STEPS } from '@/hooks/useFirstExperienceDemo';
import { FOUNDER_DEMO_FIXTURE } from '@/lib/demo/founder-decision-demo';

describe('useFirstExperienceDemo', () => {
  beforeEach(() => {
    mockRecordFunnelEvent.mockClear();
    mockMarkStarted.mockClear();
    mockMarkCompleted.mockClear();
    mockMarkSkipped.mockClear();
    mockMarkSkippedAsync.mockClear();
    mockMarkSkippedAsync.mockResolvedValue(undefined);
  });

  it('Wave 3: resume option skips the INTRO card and starts on EVIDENCE', () => {
    const { result } = renderHook(() => useFirstExperienceDemo({ resume: true }));
    expect(result.current.step).toBe('EVIDENCE');
  });

  it('Wave 3: skipDemo awaits persistence, records a distinct skip event (not own_decision_started), and resolves true on success', async () => {
    const { result } = renderHook(() => useFirstExperienceDemo());
    let succeeded: boolean = false;
    await act(async () => {
      succeeded = await result.current.skipDemo();
    });
    expect(succeeded).toBe(true);
    expect(mockMarkSkippedAsync).toHaveBeenCalledTimes(1);
    expect(mockMarkSkippedAsync).toHaveBeenCalledWith(FOUNDER_DEMO_FIXTURE.version);
    // Distinct event name: skipping declines onboarding, it does not mean
    // the user has started a real decision yet -- those must not share an
    // event name (caught in code review).
    const skipEvent = mockRecordFunnelEvent.mock.calls.find((c) => c[0] === 'first_experience_demo_skipped');
    expect(skipEvent).toBeTruthy();
    expect(skipEvent?.[1]).toMatchObject({ context: 'demo' });
    const wronglyNamedEvent = mockRecordFunnelEvent.mock.calls.find(
      (c) => c[0] === 'first_experience_own_decision_started',
    );
    expect(wronglyNamedEvent).toBeUndefined();
  });

  it('Wave 3: skipDemo resolves false and does NOT record telemetry when persistence fails -- never pretend a failed save succeeded', async () => {
    mockMarkSkippedAsync.mockRejectedValueOnce(new Error('network error'));
    const { result } = renderHook(() => useFirstExperienceDemo());
    let succeeded: boolean = true;
    await act(async () => {
      succeeded = await result.current.skipDemo();
    });
    expect(succeeded).toBe(false);
    const skipEvent = mockRecordFunnelEvent.mock.calls.find((c) => c[0] === 'first_experience_demo_skipped');
    expect(skipEvent).toBeUndefined();
  });

  it('calls the Wave 2 persistence markStarted once, with the fixture version', async () => {
    renderHook(() => useFirstExperienceDemo());
    // markStarted fires from a useEffect, so it lands after the initial render.
    await act(async () => {});
    expect(mockMarkStarted).toHaveBeenCalledTimes(1);
    expect(mockMarkStarted).toHaveBeenCalledWith(FOUNDER_DEMO_FIXTURE.version);
  });

  it('calls the Wave 2 persistence markCompleted exactly when completeDemo runs', () => {
    const { result } = renderHook(() => useFirstExperienceDemo());
    expect(mockMarkCompleted).not.toHaveBeenCalled();
    act(() => result.current.completeDemo());
    expect(mockMarkCompleted).toHaveBeenCalledTimes(1);
    expect(mockMarkCompleted).toHaveBeenCalledWith(FOUNDER_DEMO_FIXTURE.version);
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
  }, 20_000);

  it('reset reuses the cached base run instead of recomputing the engine', () => {
    const { result } = renderHook(() => useFirstExperienceDemo());
    const baseResult = result.current.result;
    act(() => result.current.updateAssumption('cac', 2500));
    expect(result.current.result).not.toBe(baseResult);
    act(() => result.current.resetToBase());
    expect(result.current.result).toBe(baseResult);
  }, 20_000);

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
