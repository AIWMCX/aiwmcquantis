import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Buy-blockers #83: "Last verified August 30" read as abandoned. Re-verified
// 2026-10-28 against code: the integrity check covers the executive summary
// only; the Status page references no incident runbook; the Monte Carlo only
// started running on reports on Oct 24 and the page now says so.
describe('State of Quantis, re-verified', () => {
  const src = readFileSync('src/pages/StateOfQuantis.tsx', 'utf8');

  it('carries the new verification date and recent fixes', () => {
    expect(src).toMatch(/const LAST_VERIFIED = 'October 28, 2026'/);
    expect(src).toMatch(/date: '2026-10-24'/);
  });

  it('claims nothing the code does not do', () => {
    expect(src).not.toMatch(/never invents or recomputes/);
    expect(src).not.toMatch(/incident runbook/);
    expect(src).toMatch(/PROFIT_RANGE_ASSUMPTIONS/);
  });
});
