/**
 * First Decision Experience Wave 3: the routing resolver's precedence
 * logic. This is the highest-regression-risk surface of the wave (spec
 * section 8/18) -- a wrong branch here can force an established paying
 * customer through onboarding, or trap a new user in an infinite demo
 * loop. Tested exhaustively as a pure function, no database or React tree
 * required.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveFirstExperience,
  destinationToPath,
  type FirstExperienceResolverInput,
} from '@/lib/firstExperienceResolver';

function input(overrides: Partial<FirstExperienceResolverInput> = {}): FirstExperienceResolverInput {
  return {
    isAdmin: false,
    hasCompletedRealAnalysis: false,
    demoState: null,
    ...overrides,
  };
}

describe('resolveFirstExperience: precedence and state derivation', () => {
  it('brand-new user (no demo row at all) -> FIRST_DEMO', () => {
    expect(resolveFirstExperience(input())).toBe('FIRST_DEMO');
  });

  it('demo state exists but never actually started -> FIRST_DEMO (defensive: hasStartedBefore false)', () => {
    expect(
      resolveFirstExperience(
        input({ demoState: { hasStartedBefore: false, hasCompletedBefore: false, hasSkippedBefore: false } }),
      ),
    ).toBe('FIRST_DEMO');
  });

  it('demo started, not completed, not skipped -> RESUME_DEMO', () => {
    expect(
      resolveFirstExperience(
        input({ demoState: { hasStartedBefore: true, hasCompletedBefore: false, hasSkippedBefore: false } }),
      ),
    ).toBe('RESUME_DEMO');
  });

  it('demo completed -> START_DECISION', () => {
    expect(
      resolveFirstExperience(
        input({ demoState: { hasStartedBefore: true, hasCompletedBefore: true, hasSkippedBefore: false } }),
      ),
    ).toBe('START_DECISION');
  });

  it('demo explicitly skipped -> START_DECISION, same as completed (spec: never auto-show again after skip)', () => {
    expect(
      resolveFirstExperience(
        input({ demoState: { hasStartedBefore: true, hasCompletedBefore: false, hasSkippedBefore: true } }),
      ),
    ).toBe('START_DECISION');
  });

  it('real analysis completed always wins over ANY demo state -- established user never sees onboarding again', () => {
    const demoStates: Array<FirstExperienceResolverInput['demoState']> = [
      null,
      { hasStartedBefore: false, hasCompletedBefore: false, hasSkippedBefore: false },
      { hasStartedBefore: true, hasCompletedBefore: false, hasSkippedBefore: false },
      { hasStartedBefore: true, hasCompletedBefore: true, hasSkippedBefore: false },
      { hasStartedBefore: true, hasCompletedBefore: false, hasSkippedBefore: true },
    ];
    for (const demoState of demoStates) {
      expect(resolveFirstExperience(input({ hasCompletedRealAnalysis: true, demoState }))).toBe('NORMAL_APP');
    }
  });

  it('admin always wins over ANY demo state or analysis state -- never forced through onboarding', () => {
    const combos: Array<Partial<FirstExperienceResolverInput>> = [
      { hasCompletedRealAnalysis: false, demoState: null },
      { hasCompletedRealAnalysis: false, demoState: { hasStartedBefore: true, hasCompletedBefore: false, hasSkippedBefore: false } },
      { hasCompletedRealAnalysis: true, demoState: null },
    ];
    for (const combo of combos) {
      expect(resolveFirstExperience(input({ isAdmin: true, ...combo }))).toBe('NORMAL_APP');
    }
  });

  it('every branch is total -- all 2 (admin) x 2 (real analysis) x 5 (demo state, including explicitly skipped) combinations resolve without throwing', () => {
    // Corrected during code review: this matrix previously omitted the
    // hasSkippedBefore:true state (it was only covered by the separate
    // dedicated skip test above), so the earlier "exhaustive" claim in this
    // file's own status reporting was slightly stronger than the code --
    // this is now the actual full cross-product.
    const demoStates: Array<FirstExperienceResolverInput['demoState']> = [
      null,
      { hasStartedBefore: false, hasCompletedBefore: false, hasSkippedBefore: false },
      { hasStartedBefore: true, hasCompletedBefore: false, hasSkippedBefore: false },
      { hasStartedBefore: true, hasCompletedBefore: true, hasSkippedBefore: false },
      { hasStartedBefore: true, hasCompletedBefore: false, hasSkippedBefore: true },
    ];
    for (const isAdmin of [true, false]) {
      for (const hasCompletedRealAnalysis of [true, false]) {
        for (const demoState of demoStates) {
          const result = resolveFirstExperience({ isAdmin, hasCompletedRealAnalysis, demoState });
          expect(['FIRST_DEMO', 'RESUME_DEMO', 'START_DECISION', 'NORMAL_APP']).toContain(result);
        }
      }
    }
  });
});

describe('destinationToPath', () => {
  it('maps each destination to its expected route, including the resume query param', () => {
    expect(destinationToPath('FIRST_DEMO')).toBe('/app/start');
    expect(destinationToPath('RESUME_DEMO')).toBe('/app/start?resume=1');
    // Wave 4: /app/new-decision now exists. START_DECISION and NORMAL_APP
    // are no longer the same destination -- the page itself redirects to
    // /app when VITE_FLAG_NEW_DECISION_V1 is off, so this stays safe dark.
    expect(destinationToPath('START_DECISION')).toBe('/app/new-decision');
    expect(destinationToPath('NORMAL_APP')).toBe('/app');
  });
});
