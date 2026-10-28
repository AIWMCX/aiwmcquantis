import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { format } from 'date-fns';
import { calendarDate } from '@/lib/autoposter-status';

// 2026-10-27: the queue showed each post one day before its publish day.
// new Date('2026-10-28') is UTC midnight = Oct 27 evening in Denver.
describe('calendarDate', () => {
  it('keeps the calendar day in any timezone', () => {
    expect(format(calendarDate('2026-10-28'), 'yyyy-MM-dd')).toBe('2026-10-28');
    expect(format(calendarDate('2026-11-01'), 'MMM d')).toBe('Nov 1');
  });

  it('passes full timestamps through', () => {
    expect(calendarDate('2026-10-28T14:00:00Z').toISOString()).toBe('2026-10-28T14:00:00.000Z');
  });

  it('autoposter screens never parse post_date with new Date()', () => {
    for (const f of ['PostQueue', 'PostArchive', 'KPITracker']) {
      const src = readFileSync(`src/components/autoposter/${f}.tsx`, 'utf8');
      expect(src, f).not.toMatch(/new Date\((p|post)\.post_date\)/);
      expect(src, f).not.toMatch(/format\(new Date\(v/);
    }
  });
});
