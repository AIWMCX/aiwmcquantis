/**
 * GTM-audit item #11 (2026-08-26, Q89 category "Technical Moat"): confirmed
 * via a real-code investigation agent that BeatMissEngine.classify() derived
 * its BEAT/IN-LINE/MISS verdict purely from a +/-8% delta off p50, ignoring
 * the p75 value the same row displays right next to the badge. A value
 * could sit past the displayed p75 column and still render "IN-LINE" --
 * the same class of bug the RVCE validation-badge fix addressed earlier
 * this session (a badge computed independently of the range it's shown
 * alongside). Fixed by deriving the verdict from actual p25/p75 band
 * membership.
 */
import { describe, it, expect } from 'vitest';
import { classify } from '../components/analysis/BeatMissEngine';

describe('BeatMissEngine classify()', () => {
  it('BEAT (higher-is-better) requires exceeding p75, not just +8% off p50', () => {
    // p50=100, p75=110 -- a value of 109 is +9% off p50 (would have been
    // "BEAT" under the old threshold) but still sits INSIDE the p25-p75
    // band shown on the row, so it must be IN-LINE, not BEAT.
    expect(classify(109, 90, 100, 110, true).verdict).toBe('IN-LINE');
    expect(classify(111, 90, 100, 110, true).verdict).toBe('BEAT');
  });

  it('MISS (higher-is-better) requires falling below p25', () => {
    expect(classify(91, 90, 100, 110, true).verdict).toBe('IN-LINE');
    expect(classify(89, 90, 100, 110, true).verdict).toBe('MISS');
  });

  it('BEAT (lower-is-better, e.g. CAC/churn) requires falling below p25', () => {
    expect(classify(91, 90, 100, 110, false).verdict).toBe('IN-LINE');
    expect(classify(89, 90, 100, 110, false).verdict).toBe('BEAT');
  });

  it('MISS (lower-is-better) requires exceeding p75', () => {
    expect(classify(109, 90, 100, 110, false).verdict).toBe('IN-LINE');
    expect(classify(111, 90, 100, 110, false).verdict).toBe('MISS');
  });

  it('reproduces the exact bug: a value 9% above p50 but still under a wider p75 must not BEAT', () => {
    // A realistic SaaS gross-margin case: p25=72, p50=78, p75=84. A value of
    // 85 is +9% off p50 -- old code said BEAT. It IS past p75, so BEAT is
    // still correct here, but 84.9 (barely inside p75) must NOT be BEAT.
    expect(classify(85, 72, 78, 84, true).verdict).toBe('BEAT');
    expect(classify(83.9, 72, 78, 84, true).verdict).toBe('IN-LINE');
  });
});
