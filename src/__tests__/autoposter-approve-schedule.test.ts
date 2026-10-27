import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// 2026-10-27: 11 dated LinkedIn posts sat as drafts and never published. The
// Approve & schedule path ignored update errors, allowed past times and did
// nothing silently when no row was schedulable.
const hook = readFileSync('src/hooks/useAutoposter.ts', 'utf8');
const sheet = readFileSync('src/components/autoposter/PostEditorSheet.tsx', 'utf8');
const approve = hook.slice(hook.indexOf('export function useApproveAndSchedule'), hook.indexOf('export function useCancelPlatform'));

describe('Approve & schedule is honest', () => {
  it('refuses a time that has already passed', () => {
    expect(approve).toMatch(/getTime\(\) <= Date\.now\(\)/);
    expect(approve).toContain('has already passed');
  });

  it('checks every platform update and fails when nothing was scheduled', () => {
    expect(approve).toContain(".select('id')");
    expect(approve).toMatch(/r\.error \|\| !r\.data\?\.length/);
    expect(approve).toMatch(/if \(scheduled === 0\)/);
  });

  it('never re-queues a row that may be live', () => {
    expect(approve).toContain(".in('status', ['draft', 'scheduled', 'failed', 'needs_credentials'])");
  });

  it('marks the post scheduled only after a platform row was', () => {
    expect(approve.indexOf('if (scheduled === 0)')).toBeLessThan(approve.indexOf(".from('autoposter_posts')"));
  });

  it('says why when nothing can be scheduled, and keeps the sheet open on error', () => {
    expect(sheet).toContain("toast.error('Nothing to schedule'");
    expect(sheet).toMatch(/try \{\s+await approve\.mutateAsync/);
  });
});
