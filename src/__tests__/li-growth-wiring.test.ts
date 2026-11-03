import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CEILING, RAMP } from '@/lib/li-growth/caps';

const SQL = readFileSync('supabase/migrations/20261102120000_li_engagement_growth_agent.sql', 'utf8');
const FN = readFileSync('supabase/functions/li-growth-draft/index.ts', 'utf8');
const LINT = readFileSync('supabase/functions/_shared/li-growth-lint.ts', 'utf8');
const PAGE = readFileSync('src/pages/admin/LinkedInGrowth.tsx', 'utf8');
const DEPLOY = readFileSync('.github/workflows/production-deploy.yml', 'utf8');
const TABLES = ['li_engagement_targets', 'li_engagement_signals', 'li_fact_bank', 'li_engagement_drafts', 'li_engagement_touches', 'li_engagement_settings'];

describe('LinkedIn Growth Agent: compliance guards', () => {
  it('the edge function never talks to LinkedIn and never posts or messages', () => {
    for (const src of [FN, LINT]) {
      expect(src).not.toMatch(/linkedin\.com/i);
      expect(src).not.toMatch(/\bfetch\s*\(/);
    }
    expect(FN).not.toMatch(/oauth|access_token|w_member_social|ugcPosts|socialActions/i);
  });

  it('the page opens only https://www.linkedin.com URLs, in a new tab, after the founder clicks', () => {
    expect(PAGE).toMatch(/isSafeLinkedInUrl\(draft\.target_url\)/);
    expect(PAGE).toContain("window.open(draft.target_url, '_blank', 'noopener,noreferrer')");
    expect(PAGE).not.toMatch(/\bfetch\s*\(/);
    expect(PAGE).toContain('COMPLIANCE_LINE');
    expect(PAGE).toMatch(/never posts, comments, reacts, connects or messages on LinkedIn/);
  });
});

describe('LinkedIn Growth Agent: database', () => {
  it('every table has RLS and admin-only policies using the has_role pattern', () => {
    for (const t of TABLES) {
      expect(SQL, t).toContain(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`);
      expect(SQL, t).toMatch(new RegExp(`ON public\\.${t} FOR (ALL|SELECT)\\s+USING \\(public\\.has_role\\(auth\\.uid\\(\\), 'admin'::app_role\\)\\)`));
      expect(SQL, t).toContain(`"anon_deny_${t}"`);
    }
  });

  it('drafts and touches cannot be written by the client: only SELECT policies', () => {
    for (const t of ['li_engagement_drafts', 'li_engagement_touches']) {
      const policies = SQL.match(new RegExp(`CREATE POLICY "[^"]+"\\s+ON public\\.${t} FOR \\w+`, 'g')) ?? [];
      const kinds = policies.map((p) => p.split(' FOR ')[1]);
      expect(kinds.sort(), t).toEqual(['ALL', 'SELECT']); // ALL is the anon_deny USING (false)
      expect(SQL).toMatch(new RegExp(`"anon_deny_${t}"\\s+ON public\\.${t} FOR ALL USING \\(false\\) WITH CHECK \\(false\\)`));
    }
  });

  it('people are linked to commercial_prospects, not duplicated', () => {
    expect(SQL).toMatch(/prospect_id uuid PRIMARY KEY REFERENCES public\.commercial_prospects\(id\) ON DELETE CASCADE/);
    expect(SQL).toContain('public.transition_prospect_stage(_prospect_id, _to, _reason)');
    expect(SQL).toContain('INSERT INTO public.commercial_outcomes');
  });

  it('every SECURITY DEFINER function checks admin first and pins search_path', () => {
    const fns = SQL.split('CREATE OR REPLACE FUNCTION').slice(1);
    for (const body of fns) {
      if (!body.includes('SECURITY DEFINER')) continue;
      expect(body).toContain('SET search_path = public');
      const guard = body.indexOf("public.has_role(");
      const firstWrite = body.search(/\b(INSERT|UPDATE)\b/);
      expect(guard).toBeGreaterThan(-1);
      if (firstWrite > -1) expect(guard).toBeLessThan(firstWrite);
    }
  });

  it('one DM sequence per person is enforced by unique indexes', () => {
    expect(SQL).toMatch(/UNIQUE INDEX IF NOT EXISTS li_touches_one_dm_first_idx\s+ON public\.li_engagement_touches \(prospect_id\) WHERE touch_type = 'dm_first'/);
    expect(SQL).toMatch(/UNIQUE INDEX IF NOT EXISTS li_touches_one_followup_idx\s+ON public\.li_engagement_touches \(prospect_id\) WHERE touch_type = 'dm_followup'/);
  });

  it('settings CHECK ceilings and defaults match caps.ts (parity)', () => {
    const ceiling = (col: string) => Number(SQL.match(new RegExp(`${col} smallint NOT NULL DEFAULT (\\d+) CHECK \\(${col} BETWEEN 0 AND (\\d+)\\)`))?.[2]);
    const dflt = (col: string) => Number(SQL.match(new RegExp(`${col} smallint NOT NULL DEFAULT (\\d+)`))?.[1]);
    expect(ceiling('max_comments_day')).toBe(CEILING.comment);
    expect(ceiling('max_dm_first_day')).toBe(CEILING.dm_first);
    expect(ceiling('max_dm_followup_day')).toBe(CEILING.dm_followup);
    expect(ceiling('max_connects_day')).toBe(CEILING.connect);
    expect(ceiling('max_connects_week')).toBe(CEILING.connect_week);
    expect(dflt('max_comments_day')).toBe(RAMP[1].comment);
    expect(dflt('max_dm_first_day')).toBe(RAMP[1].dm_first);
    expect(dflt('max_connects_day')).toBe(RAMP[1].connect);
  });
});

describe('LinkedIn Growth Agent: edge function and release wiring', () => {
  it('is admin-only, has a health endpoint, uses llm-call with R3 and the shared lint', () => {
    expect(FN).toContain("maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION)");
    expect(FN).toContain(".from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin')");
    expect(FN).toContain("from '../_shared/llm-call.ts'");
    expect(FN).toContain("from '../_shared/r3-validator.ts'");
    expect(FN).toContain("from '../_shared/li-growth-lint.ts'");
    expect(FN).toMatch(/MAX_ATTEMPTS = 2/);
    expect(FN).toContain('MARKETING_DOCTRINE,');
    expect(FN).toContain('ENGAGEMENT_RULES,');
  });

  it('only a server-linted text can be approved', () => {
    const approve = FN.split('async function approve(')[1].split('Deno.serve')[0];
    expect(approve.indexOf('lintDraft(')).toBeGreaterThan(-1);
    expect(approve.indexOf('if (!lint.ok) return')).toBeLessThan(approve.indexOf("status: 'approved'"));
  });

  it('is in the production deploy list and the admin router', () => {
    const list = DEPLOY.match(/FUNCTIONS=\(\r?\n([\s\S]*?)\r?\n\s*\)/)?.[1] ?? '';
    expect(list).toMatch(/^\s*li-growth-draft\s*$/m);
    expect(readFileSync('src/App.tsx', 'utf8')).toContain('<Route path="linkedin-growth" element={<LinkedInGrowth />} />');
    expect(readFileSync('src/components/admin/AdminLayout.tsx', 'utf8')).toContain("to: '/admin/linkedin-growth'");
    expect(readFileSync('src/pages/admin/ContentStudio.tsx', 'utf8')).toContain("navigate('/admin/linkedin-growth')");
  });
});
