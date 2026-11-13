import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// LinkedIn comments stalled after 2026-11-05: drafts waited for a manual
// "Draft all" click. A saved post now drafts its comment immediately [M5].
const PAGE = readFileSync('src/pages/admin/LinkedInGrowth.tsx', 'utf8');
const DOCTRINE = readFileSync('supabase/functions/_shared/marketing-doctrine.ts', 'utf8');

describe('LinkedIn Growth: comment drafted when a post is saved', () => {
  it('both post-saving paths call autoDraftComment with the new signal id', () => {
    expect(PAGE).toContain('async function autoDraftComment(prospectId: string, signalId: string)');
    expect(PAGE.match(/await autoDraftComment\(/g)?.length).toBe(2);
    expect(PAGE).toContain(".select('id').single()");
  });

  it('drafting still goes through li-growth-draft (lint), never a direct insert', () => {
    const fn = PAGE.slice(PAGE.indexOf('async function autoDraftComment'), PAGE.indexOf('async function invokeEnrich'));
    expect(fn).toContain("invokeDraft({ action: 'generate'");
    expect(fn).not.toContain('li_engagement_drafts');
  });

  it('comments aim for the second-order point, specific to the person', () => {
    expect(DOCTRINE).toContain('second-order point');
    expect(DOCTRINE).toContain('a comment that would fit any post fails this rule');
  });
});
