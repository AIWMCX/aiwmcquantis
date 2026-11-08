import { describe, expect, it } from 'vitest';
import { aggregateMonthly, buildDailyRows, daysDesc, monthRanges, type GrowthSummary } from '@/lib/growth-summary';

// Synthetic admin_growth_summary() payload; numbers are made up.
const summary: GrowthSummary = {
  generated_at: '2026-02-02T12:00:00Z',
  denver_today: '2026-02-02',
  from: '2026-01-01',
  to: '2026-02-02',
  first_party: [
    { day: '2026-01-30', sessions: 10, engaged_sessions: 4 },
    { day: '2026-02-01', sessions: 6, engaged_sessions: 1 },
  ],
  ext: [
    { source: 'ga4', day: '2026-01-30', metrics: { activeUsers: 5, sessions: 6, engagedSessions: 3, screenPageViews: 9, keyEvents: 1 }, fetched_at: '' },
    { source: 'gsc', day: '2026-01-30', metrics: { clicks: 2, impressions: 100, ctr: 0.02, position: 10 }, fetched_at: '' },
    { source: 'gsc', day: '2026-01-31', metrics: { clicks: 0, impressions: 300, ctr: 0, position: 20 }, fetched_at: '' },
    { source: 'gsc', day: '2026-02-01', metrics: { clicks: 1, impressions: 0, ctr: 0, position: 0 }, fetched_at: '' },
  ],
};

describe('admin growth summary shaping', () => {
  it('lists days newest first, inclusive', () => {
    expect(daysDesc('2026-01-30', '2026-02-02')).toEqual(['2026-02-02', '2026-02-01', '2026-01-31', '2026-01-30']);
  });

  it('merges first-party and external rows per day; missing sources stay null', () => {
    const rows = buildDailyRows(summary, '2026-01-30', '2026-02-02');
    expect(rows.map((r) => r.key)).toEqual(['2026-02-02', '2026-02-01', '2026-01-31', '2026-01-30']);
    const jan30 = rows[3];
    expect(jan30).toMatchObject({ fp_sessions: 10, fp_engaged: 4, ga4: { users: 5, sessions: 6, engaged: 3, views: 9, key_events: 1 } });
    expect(jan30.gsc).toEqual({ clicks: 2, impressions: 100, ctr: 0.02, position: 10 });
    expect(rows[0]).toMatchObject({ fp_sessions: 0, ga4: null, gsc: null, clarity: null });
    // No impressions: CTR and position are unknown, not 0.
    expect(rows[1].gsc).toEqual({ clicks: 1, impressions: 0, ctr: null, position: null });
  });

  it('aggregates months: sums, clicks/impressions CTR, impression-weighted position', () => {
    const months = aggregateMonthly(buildDailyRows(summary, '2026-01-01', '2026-02-02'));
    expect(months.map((m) => m.key)).toEqual(['2026-02', '2026-01']);
    const jan = months[1];
    expect(jan.fp_sessions).toBe(10);
    expect(jan.ga4).toEqual({ users: 5, sessions: 6, engaged: 3, views: 9, key_events: 1 });
    expect(jan.gsc?.clicks).toBe(2);
    expect(jan.gsc?.impressions).toBe(400);
    expect(jan.gsc?.ctr).toBeCloseTo(0.005);
    expect(jan.gsc?.position).toBeCloseTo((10 * 100 + 20 * 300) / 400);
    expect(months[0].gsc).toEqual({ clicks: 1, impressions: 0, ctr: null, position: null });
  });

  it('splits the backfill range into calendar months', () => {
    expect(monthRanges('2025-07-01', '2025-09-10')).toEqual([
      { from: '2025-07-01', to: '2025-07-31' },
      { from: '2025-08-01', to: '2025-08-31' },
      { from: '2025-09-01', to: '2025-09-10' },
    ]);
  });
});
