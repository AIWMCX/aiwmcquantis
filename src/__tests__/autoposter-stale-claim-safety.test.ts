import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('supabase/functions/publish-due-posts/index.ts', 'utf8').replace(/\r\n/g, '\n');

describe('autoposter interrupted publish claims', () => {
  it('moves stale publishing claims to unknown, never back to scheduled automatically', () => {
    expect(source).toContain('15 * 60 * 1000');
    expect(source).toContain("status: 'unknown'");
    expect(source).toContain('.eq(\'status\', \'publishing\')');
    expect(source).toContain('.lt(\'updated_at\', stalePublishingBefore)');
    expect(source).toContain("status: 'publishing', updated_at: nowIso");
    expect(source).toContain('Check the platform before retrying.');
  });
});
