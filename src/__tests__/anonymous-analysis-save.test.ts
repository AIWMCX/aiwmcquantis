// Regression 2026-10-23: 0 of 223 production analyses were anonymous. The
// column was missing (PGRST204) and insert().select() needs a SELECT policy
// anonymous visitors don't have. The save must send its own id, include the
// session id, and never chain .select() onto the insert.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

const insert = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ insert, select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) })) })) })) },
}));

import { saveAnonymousAnalysis } from '@/services/analysisDb';

const result = { confidence_score: 70, financial_analysis: { startup_investment: { total: 10000 } } } as never;

describe('saveAnonymousAnalysis', () => {
  beforeEach(() => insert.mockReset());

  it('inserts with a client id and session id, and returns that id', async () => {
    insert.mockResolvedValue({ error: null });
    const saved = await saveAnonymousAnalysis('Hire a second technician', 'Denver', result, 'quick');
    const row = insert.mock.calls[0][0];
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row.user_id).toBeNull();
    expect(typeof row.anonymous_session_id).toBe('string');
    expect(saved?.id).toBe(row.id);
  });

  it('falls back to a local id when the insert fails', async () => {
    insert.mockResolvedValue({ error: { code: 'PGRST204', message: 'x' } });
    const saved = await saveAnonymousAnalysis('Hire a second technician', 'Denver', result, 'quick');
    expect(saved?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved?.id).not.toBe(insert.mock.calls[0][0].id);
  });

  it('the repair migration adds the column, the insert policy and the claim RPC', () => {
    const sql = readFileSync('supabase/migrations/20261023220000_anonymous_analysis_save_repair.sql', 'utf8');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS anonymous_session_id text');
    expect(sql).toContain('CREATE POLICY "Anyone can create anonymous analysis"');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.claim_anonymous_analysis');
    // user_settings does not exist in production; touching it is what broke 20260514020520.
    expect(sql.replace(/--.*$/gm, '')).not.toMatch(/user_settings/i);
  });
});

describe('anon insert restrictive policy', () => {
  it('narrows the deny policy to unowned rows with a session id (was WITH CHECK (false))', () => {
    const sql = readFileSync('supabase/migrations/20261023230000_anonymous_insert_restrictive_policy.sql', 'utf8');
    expect(sql).toContain('AS RESTRICTIVE');
    expect(sql).toContain('TO anon');
    expect(sql).toMatch(/WITH CHECK \(\s*user_id IS NULL\s*AND anonymous_session_id IS NOT NULL/);
    expect(sql.replace(/--.*$/gm, '')).not.toContain('WITH CHECK (false)');
  });
});
