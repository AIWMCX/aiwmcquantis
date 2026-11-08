import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { toolStatuses, type SyncRunRow } from '@/lib/growth-seo';

// Synthetic rows; every number and message is made up.
const { RUNS, EXT, DENIED } = vi.hoisted(() => {
  const DENIED = "User does not have sufficient permission for site 'sc-domain:example'. (synthetic)";
  const RUNS = [
    { source: 'indexing', mode: 'daily', status: 'permission_denied', started_at: '2026-11-08T13:15:00Z', finished_at: '2026-11-08T13:15:20Z', rows_upserted: 1, error: `url_inspection: permission_denied (${DENIED})`,
      details: { endpoints: { sitemaps: { status: 'ok', calls: 1, rows: 1 }, url_inspection: { status: 'permission_denied', calls: 1, rows: 0, google_message: DENIED } } } },
    { source: 'psi', mode: 'daily', status: 'ok', started_at: '2026-11-08T13:15:00Z', finished_at: '2026-11-08T13:15:40Z', rows_upserted: 10, error: null },
    { source: 'bing', mode: 'daily', status: 'not_configured', started_at: '2026-11-08T13:15:00Z', finished_at: '2026-11-08T13:15:01Z', rows_upserted: 0, error: 'BING_WEBMASTER_API_KEY is not set' },
    { source: 'clarity', mode: 'daily', status: 'error', started_at: '2026-11-08T13:15:00Z', finished_at: '2026-11-08T13:15:02Z', rows_upserted: 0, error: 'Clarity HTTP 429' },
    { source: 'ga4', mode: 'daily', status: 'ok', started_at: '2026-11-08T13:15:00Z', finished_at: '2026-11-08T13:15:10Z', rows_upserted: 120, error: null },
    { source: 'gsc', mode: 'backfill', status: 'skipped', started_at: '2026-11-08T12:00:00Z', finished_at: '2026-11-08T12:00:01Z', rows_upserted: 0, error: 'outside source range' },
  ];
  const psi = (path: string, device: string, field: boolean) => ({
    source: 'psi', day: '2026-11-08', report: 'psi_url', dims: { path, device }, fetched_at: '2026-11-08T13:15:40Z',
    metrics: {
      perf_score: 61, seo_score: 100, accessibility_score: 93, best_practices_score: 96,
      lab_lcp_ms: 4400, lab_cls: 0.02, lab_tbt_ms: 250,
      field_scope: field ? 'url' : 'none',
      field_lcp_p75_ms: field ? 2100 : null, field_lcp_category: field ? 'good' : null,
      field_inp_p75_ms: field ? 300 : null, field_inp_category: field ? 'needs-improvement' : null,
      field_cls_p75: field ? 0.3 : null, field_cls_category: field ? 'poor' : null,
      field_overall_category: field ? 'needs-improvement' : null,
      lighthouse_version: '12.0.0', runtime_error: null,
    },
  });
  const EXT: Record<string, unknown[]> = {
    psi: [psi('/', 'mobile', true), psi('/pricing', 'desktop', false)],
    indexing: [{
      source: 'indexing', day: '2026-11-08', report: 'indexing_sitemap', dims: { path: 'https://www.aiwmcquantis.com/sitemap.xml' }, fetched_at: '',
      metrics: { submitted: 40, indexed: 0, errors: 0, warnings: 2, is_pending: 0, last_downloaded: '2026-11-06T03:04:05Z' },
    }],
    indexnow: [{
      source: 'indexnow', day: '2026-11-07', report: 'indexnow_ping', dims: { pinged_at: '2026-11-07T20:00:00.000Z' }, fetched_at: '',
      metrics: { http_status: 202, url_count: 39, accepted: 1, duration_ms: 300, commit_sha: 'abc1234' },
    }],
    bing: [],
  };
  return { RUNS, EXT, DENIED };
});

vi.mock('@/integrations/supabase/client', () => {
  const chain = (table: string) => {
    let source = '';
    const p: Record<string, unknown> = {};
    p.select = () => p;
    p.eq = (_c: string, v: string) => { source = v; return p; };
    p.gte = () => p;
    p.order = () => p;
    p.limit = () => Promise.resolve({ data: table === 'ext_sync_runs' ? RUNS : (EXT[source] ?? []), error: null });
    return p;
  };
  const rpc = vi.fn(async (name: string) => (name === 'admin_growth_summary'
    ? { data: { generated_at: '', denver_today: '2026-11-08', from: '2026-01-01', to: '2026-11-08', first_party: [], ext: [] }, error: null }
    : { data: { rows: [] }, error: null }));
  return { supabase: { rpc, from: (t: string) => chain(t), functions: { invoke: vi.fn() } } };
});

import AdminGrowth from '@/pages/admin/Growth';

describe('toolStatuses()', () => {
  it('one chip per source in order; skipped runs never decide; no run = never run', () => {
    const s = toolStatuses(RUNS as unknown as SyncRunRow[]);
    expect(s.map((x) => [x.source, x.state])).toEqual([
      ['ga4', 'connected'], ['gsc', 'never_run'], ['clarity', 'error'], ['psi', 'connected'],
      ['indexing', 'needs_permission'], ['indexnow', 'never_run'], ['bing', 'not_configured'],
    ]);
    expect(s.find((x) => x.source === 'psi')?.last_run).toBe('2026-11-08T13:15:40Z');
  });
});

describe('/admin/growth phase-2 sections', () => {
  it('renders the tool-status chips with state and last sync time', async () => {
    render(<HelmetProvider><AdminGrowth /></HelmetProvider>);
    const strip = await screen.findByTestId('tool-status-strip');
    await waitFor(() => expect(within(strip).getAllByRole('listitem')).toHaveLength(7));
    const chip = (s: string) => screen.getByTestId(`tool-chip-${s}`);
    expect(chip('ga4')).toHaveAttribute('data-state', 'connected');
    expect(within(chip('ga4')).getByText('connected')).toBeInTheDocument();
    expect(within(chip('ga4')).getByText(/last sync Nov 8, 2026/)).toBeInTheDocument();
    expect(within(chip('bing')).getByText('not configured')).toBeInTheDocument();
    expect(within(chip('clarity')).getByText('error')).toBeInTheDocument();
    expect(within(chip('indexing')).getByText('needs Full permission in Search Console')).toBeInTheDocument();
    expect(within(chip('indexnow')).getByText('no run yet')).toBeInTheDocument();
    expect(within(chip('gsc')).getByText('never run')).toBeInTheDocument();
  });

  it('shows PSI rows with CWV chips and "no field data", the permission banner with Google\'s message, sitemaps, IndexNow and Bing not configured', async () => {
    render(<HelmetProvider><AdminGrowth /></HelmetProvider>);
    const psi = await screen.findByTestId('psi-table');
    expect(within(psi).getAllByText('no field data').length).toBeGreaterThan(0);
    expect(within(psi).getByText('this page')).toBeInTheDocument();
    expect(within(psi).getAllByText('poor').length).toBeGreaterThan(0); // lab LCP 4.4 s and field CLS 0.30
    expect(within(psi).getAllByText('needs-improvement').length).toBeGreaterThan(0);
    const banner = await screen.findByTestId('permission-denied-url_inspection');
    expect(banner).toHaveTextContent('needs Full permission in Search Console');
    expect(banner).toHaveTextContent(DENIED);
    expect(within(await screen.findByTestId('sitemap-table')).getByText('40')).toBeInTheDocument();
    expect(within(await screen.findByTestId('indexnow-table')).getByText('accepted')).toBeInTheDocument();
    expect(await screen.findByTestId('bing-not-configured')).toHaveTextContent('BING_WEBMASTER_API_KEY');
    expect(screen.getByText(/URL Inspection is the version in Google's index, not a live test/)).toBeInTheDocument();
    expect(screen.getByText(/does not mean any engine crawled or indexed a page/)).toBeInTheDocument();
  });
});
