import { describe, expect, it } from 'vitest';
import { TRIGGERS } from '@/lib/contextualTriggers';

describe('contextualTriggers: T2 quotes the real analysis count (2026-09-19 fix)', () => {
  it('T2_three_analyses.body is a function, not a static string tied to a stale "3"', () => {
    const t2 = TRIGGERS.find((t) => t.id === 'T2_three_analyses');
    expect(t2).toBeDefined();
    expect(typeof t2!.body).toBe('function');
  });

  it('reflects the real event count, including past the >= 3 threshold', () => {
    const t2 = TRIGGERS.find((t) => t.id === 'T2_three_analyses')!;
    const body = t2.body as (events: Record<string, number>) => string;

    // Fires at exactly 3 -- copy must say 3, not some other baked-in number.
    expect(body({ calculation_completed: 3 })).toContain('run 3 analyses');

    // Fires late (e.g. a higher-priority trigger won the earlier renders) --
    // copy must track the real count, not silently keep saying "3".
    expect(body({ calculation_completed: 7 })).toContain('run 7 analyses');
    expect(body({ calculation_completed: 7 })).not.toContain('run 3 analyses');
  });
});

describe('contextualTriggers: T4 quotes the canonical Monte Carlo count (2026-09-18 fix)', () => {
  it('T4 no longer hardcodes "10,000" scenarios', () => {
    const t4 = TRIGGERS.find((t) => t.id === 'T4_scenario_iteration');
    expect(t4).toBeDefined();
    const body = typeof t4!.body === 'function' ? '' : t4!.body;
    expect(body).not.toContain('10,000');
    expect(body).toContain('1,000');
  });
});
