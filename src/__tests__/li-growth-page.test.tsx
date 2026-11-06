import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const POST = 'Moved two clients from monthly to weekly cash reviews. Fewer surprises.';
const COMMENT =
  'Weekly matters most in the two months a year that have three biweekly payrolls. Payroll cash out in those months is 50% higher than in a normal month, and that is usually where the low point hides. Do your clients keep a 13-week view or just the next four?';
const POST_URL = 'https://www.linkedin.com/posts/jane-doe_cash-1';

const fixtures: Record<string, unknown[]> = {
  li_engagement_targets: [{
    prospect_id: 'p1', linkedin_url: 'https://www.linkedin.com/in/jane-doe', headline: 'Fractional CFO', country: 'US', business_type: 'cfo_practice',
    employees: 12, source: 'watchlist_engager', warmth: 'cold', connection_degree: 1, posts_weekly: false, has_verified_email: false, persona: 'fractional_cfo',
    fit_score: 60, fit_breakdown: {}, nurture_until: null, notes: null, created_at: '2026-11-01T00:00:00Z',
    commercial_prospects: { id: 'p1', company_name: 'Doe Advisory', contact_name: 'Jane Doe', contact_role: 'Fractional CFO', contact_channel: 'linkedin:x', stage: 'discovered', suppression_status: 'active' },
  }],
  li_engagement_signals: [{ id: 's1', prospect_id: 'p1', signal_type: 'their_post', post_url: POST_URL, excerpt: POST, observed_at: new Date(Date.now() - 2 * 3_600_000).toISOString() }],
  li_engagement_drafts: [{
    id: 'd1', prospect_id: 'p1', signal_id: 's1', action_type: 'comment', target_url: POST_URL, rationale: 'Fit 60 · fractional cfo · their post 0d ago',
    draft_text: COMMENT, lint_report: {}, status: 'draft', final_text: null, attempts: 1, sent_at: null, created_at: new Date().toISOString(),
  }],
  li_engagement_touches: [],
  li_fact_bank: [{ id: 'f1', fact: 'Illustrative test fact', numbers: ['50%', '13'], source_url: 'https://example.org/source', verified_at: '2026-11-01', topic: null, active: true }],
  li_engagement_settings: [{ ramp_week: 1, max_comments_day: 5, max_dm_first_day: 3, max_dm_followup_day: 5, max_connects_day: 5, max_connects_week: 50, max_comments_per_author: 2, author_cooldown_days: 7, followup_min_business_days: 5, fit_threshold_dm: 70, fit_threshold_comment: 50, paused_until: null, warning_paused_until: null }],
  commercial_prospects: [],
};

// Minimal thenable query builder: every chained call returns itself, awaiting
// it yields the table fixture (or its first row after maybeSingle/single).
// update() payloads are recorded so tests can see what was written.
const recordUpdate = vi.fn((_table: string, _patch: Record<string, unknown>) => undefined);
function chain(table: string) {
  let single = false;
  const proxy: unknown = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'then') {
        const rows = fixtures[table] ?? [];
        const value = { data: single ? rows[0] ?? null : rows, error: null };
        return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(value).then(res, rej);
      }
      if (prop === 'maybeSingle' || prop === 'single') return () => { single = true; return proxy; };
      if (prop === 'update') return (patch: Record<string, unknown>) => { recordUpdate(table, patch); return proxy; };
      return () => proxy;
    },
  });
  return proxy;
}

const SITE = 'https://doeadvisory.com';
const SCAN = {
  success: true, website: SITE, protected_hidden: false,
  candidates: [{ email: 'jane@doeadvisory.com', kind: 'personal', source_url: `${SITE}/contact` }],
  pages: [{ path: '/', result: 'read' }, { path: '/contact', result: 'read' }, { path: '/team', result: 'robots.txt disallows' }],
};
const invoke = vi.fn(async (name: string, opts?: { body?: Record<string, unknown> }) => {
  if (name === 'li-enrich') {
    return opts?.body?.action === 'scan'
      ? { data: SCAN, error: null }
      : { data: { success: true, email: 'jane@doeadvisory.com', contact_channel: 'email:jane@doeadvisory.com linkedin:x' }, error: null };
  }
  return { data: { draft: { ...fixtures.li_engagement_drafts[0], status: 'approved', final_text: COMMENT }, lint: { ok: true } }, error: null };
});
const rpc = vi.fn(async () => ({ data: null, error: null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (t: string) => chain(t),
    rpc: (...a: unknown[]) => rpc(...(a as [])),
    functions: { invoke: (...a: unknown[]) => invoke(...(a as [string, { body?: Record<string, unknown> }])) },
  },
}));
vi.mock('@/hooks/useAdmin', () => ({ useAdmin: () => ({ isAdmin: true, isContentAdmin: true, isLoading: false }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'admin@example.com' } }) }));

import LinkedInGrowth, { COMPLIANCE_LINE, PUBLISHED_EMAIL_LINE } from '@/pages/admin/LinkedInGrowth';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/admin/linkedin-growth']}>
        <LinkedInGrowth />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LinkedIn Growth page', () => {
  const writeText = vi.fn(async () => undefined);
  const open = vi.fn();
  beforeEach(() => {
    writeText.mockClear();
    open.mockClear();
    invoke.mockClear();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    window.open = open as unknown as typeof window.open;
  });

  it('states the human-sent rule and shows a fit-scored comment card with lint badges', async () => {
    renderPage();
    expect(await screen.findByText('Jane Doe')).toBeTruthy();
    expect(screen.getByTestId('li-compliance-line').textContent).toContain(COMPLIANCE_LINE);
    expect(screen.getByText(/✓ no dash/)).toBeTruthy();
    expect(screen.getByText(/✓ numbers sourced/)).toBeTruthy();
    expect(screen.getByText(/their words/)).toBeTruthy();
    const markSent = screen.getByRole('button', { name: /Mark sent/ }) as HTMLButtonElement;
    expect(markSent.disabled).toBe(true); // only after Copy & open approved it
  });

  it('Copy & open copies the text, opens the LinkedIn post in a new tab and approves server-side; nothing is sent', async () => {
    renderPage();
    const btn = (await screen.findByRole('button', { name: /Copy & open LinkedIn/ })) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    expect(writeText).toHaveBeenCalledWith(COMMENT);
    expect(open).toHaveBeenCalledWith(POST_URL, '_blank', 'noopener,noreferrer');
    expect(invoke).toHaveBeenCalledWith('li-growth-draft', { body: { action: 'approve', draft_id: 'd1', text: COMMENT } });
    expect(rpc).not.toHaveBeenCalledWith('li_mark_draft_sent', expect.anything());
  });

  it('an em dash in the edited text disables Copy & open', async () => {
    renderPage();
    const box = (await screen.findByLabelText('Draft text')) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: COMMENT.replace(', and', ' — and') } });
    const btn = screen.getByRole('button', { name: /Copy & open LinkedIn/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByText(/✗ no dash/)).toBeTruthy();
  });

  it('Published email: scans the firm site, shows each address with its kind and source page, attaches the chosen one and re-scores', async () => {
    renderPage();
    fireEvent.mouseDown(await screen.findByRole('tab', { name: /Prospects/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Details' }));
    expect(await screen.findByText(PUBLISHED_EMAIL_LINE)).toBeTruthy();
    expect(PUBLISHED_EMAIL_LINE).toBe('Only addresses the firm publishes on its own website. Quantis never guesses an address.');

    fireEvent.change(screen.getByLabelText('Firm website'), { target: { value: 'doeadvisory.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Scan/ }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('li-enrich', { body: { action: 'scan', prospect_id: 'p1', website: 'doeadvisory.com' } }));
    expect(await screen.findByText('jane@doeadvisory.com')).toBeTruthy();
    expect(screen.getByText('personal')).toBeTruthy();
    expect(screen.getByRole('link', { name: '/contact' }).getAttribute('href')).toBe(`${SITE}/contact`);
    expect(screen.getByText(/\/team robots\.txt disallows/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Use this address/ }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('li-enrich', {
      body: { action: 'attach', prospect_id: 'p1', email: 'jane@doeadvisory.com', source_url: `${SITE}/contact`, website: SITE },
    }));
    // Re-scored through fitPatch, after the attach, like every other edit on the page.
    const attachOrder = invoke.mock.invocationCallOrder[invoke.mock.calls.findIndex((c) => c[1]?.body?.action === 'attach')];
    await waitFor(() => expect(recordUpdate.mock.calls.some(([table, patch], i) =>
      table === 'li_engagement_targets' && 'fit_score' in patch && 'fit_scored_at' in patch && recordUpdate.mock.invocationCallOrder[i] > attachOrder)).toBe(true));
    expect(invoke).not.toHaveBeenCalledWith('business-mail', expect.anything());
  });
});
