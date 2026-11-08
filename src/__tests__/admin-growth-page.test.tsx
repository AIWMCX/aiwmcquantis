import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';

// Synthetic RPC payloads; numbers are made up.
const { rpc, invoke, RUNS } = vi.hoisted(() => {
  const SUMMARY = {
    generated_at: '2026-11-08T12:00:00Z',
    denver_today: '2026-11-08',
    from: '2026-01-01',
    to: '2026-11-08',
    first_party: [{ day: '2026-11-07', sessions: 17, engaged_sessions: 3 }],
    ext: [
      { source: 'ga4', day: '2026-11-07', metrics: { activeUsers: 9, sessions: 11, engagedSessions: 4, screenPageViews: 20, keyEvents: 1 }, fetched_at: '' },
      { source: 'gsc', day: '2026-11-05', metrics: { clicks: 2, impressions: 150, ctr: 0.0133, position: 12.3 }, fetched_at: '' },
    ],
  };
  const RUNS = [
    { source: 'clarity', mode: 'daily', status: 'not_configured', started_at: '2026-11-08T13:15:00Z', finished_at: '2026-11-08T13:15:02Z', rows_upserted: 0, error: 'CLARITY_API_TOKEN is not set' },
    { source: 'ga4', mode: 'daily', status: 'ok', started_at: '2026-11-08T13:15:00Z', finished_at: '2026-11-08T13:15:10Z', rows_upserted: 120, error: null },
  ];

  const rpc = vi.fn(async (name: string, args: { p_report?: string }) => {
    if (name === 'admin_growth_summary') return { data: SUMMARY, error: null };
    if (args.p_report === 'gsc_query') {
      return { data: { rows: [{ dims: { query: 'example query' }, days: 3, clicks: 2, impressions: 150, ctr: 0.0133, position: 12.3 }] }, error: null };
    }
    return { data: { rows: [] }, error: null };
  });
  const invoke = vi.fn(async () => ({ data: { success: true, results: {} }, error: null }));
  return { rpc, invoke, RUNS };
});

vi.mock('@/integrations/supabase/client', () => {
  const chain = () => {
    const p: Record<string, unknown> = {};
    p.select = () => p;
    p.order = () => p;
    p.limit = () => Promise.resolve({ data: RUNS, error: null });
    return p;
  };
  return { supabase: { rpc, from: () => chain(), functions: { invoke } } };
});

import AdminGrowth from '@/pages/admin/Growth';

describe('/admin/growth page', () => {
  it('renders sync status, the daily table, breakdowns and the honesty notes', async () => {
    render(<HelmetProvider><AdminGrowth /></HelmetProvider>);
    await waitFor(() => expect(screen.getByText('2026-11-07')).toBeInTheDocument());
    expect(screen.getAllByText('not configured').length).toBeGreaterThan(0);
    expect(screen.getByText('ok')).toBeInTheDocument();
    expect(screen.getAllByText('17').length).toBe(2); // the day row and its month row
    await waitFor(() => expect(screen.getByText('example query')).toBeInTheDocument());
    expect(screen.getByText(/GA4 counts only visitors who accepted the consent banner since 2026-11-03/)).toBeInTheDocument();
    expect(screen.getByText(/Search Console lags 2–3 days/)).toBeInTheDocument();
    expect(screen.getByText(/Supabase is the complete first-party count/)).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith('admin_growth_summary', { p_from: '2026-01-01' });
    expect(rpc).toHaveBeenCalledWith('admin_growth_breakdown', { p_report: 'ga4_channel', p_days: 28, p_limit: 50 });
  });

  it('"Run sync now" invokes growth-sync in daily mode', async () => {
    render(<HelmetProvider><AdminGrowth /></HelmetProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Run sync now' }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('growth-sync', { body: { mode: 'daily' } }));
  });

  it('"Backfill history" asks first and does nothing when cancelled', async () => {
    invoke.mockClear();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<HelmetProvider><AdminGrowth /></HelmetProvider>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Backfill history' })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Backfill history' }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(String(confirm.mock.calls[0][0])).toMatch(/Backfill 17 months \(2025-07-01 to 2026-11-08\)/);
    expect(invoke).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
