import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  containsWord,
  detectGeoFromLocation,
  detectSectorFromIdea,
  markSectorFallback,
} from '../../supabase/functions/analyze-business/benchmark-keywords';
import { matchQualityToType } from '../../supabase/functions/analyze-business/benchmark-records';

// Live 2026-10-25: a dog-grooming van and a hiring decision both got the
// "B2B Consulting" benchmark row reported as an "exact" match, and that row was
// overlaid on the industry the main classifier had detected.

describe('benchmark keyword matching (#54)', () => {
  it('matches whole words and plurals, not fragments', () => {
    expect(containsWord('Hire a 2nd technician', 'tech')).toBe(false);
    expect(containsWord('two restaurants downtown', 'restaurant')).toBe(true);
    expect(containsWord('booking appointments', 'app')).toBe(false);
    expect(containsWord('a mobile app for dog owners', 'app')).toBe(true);
  });

  it('no longer maps Orlando, Las Vegas or Salt Lake to Los Angeles', () => {
    for (const city of ['Orlando, FL', 'Las Vegas, NV', 'Salt Lake City, UT']) {
      expect(detectGeoFromLocation(city).tier).not.toBe('T1');
    }
    expect(detectGeoFromLocation('LA').tier).toBe('T1');
    expect(detectGeoFromLocation('Los Angeles, CA').tier).toBe('T1');
  });
});

describe('sector fallback is never an "exact" match (#55)', () => {
  it('flags an idea with no sector keyword', () => {
    expect(detectSectorFromIdea('Mobile dog-grooming van in Columbus, OH').matched).toBe(false);
    expect(detectSectorFromIdea('Hire a 2nd technician at $5,500/mo').matched).toBe(false);
    expect(detectSectorFromIdea('Specialty coffee shop in Denver').matched).toBe(true);
  });

  it('downgrades sector-dependent sections and the overall quality', () => {
    const s = markSectorFallback({
      overall_match_quality: 'exact',
      core: { match_quality: 'exact' },
      unit_econ: { match_quality: 'exact' },
      risk: null,
      invoice: { match_quality: 'exact' },
      geo: { match_quality: 'exact' },
    });
    expect(s.overall_match_quality).toBe('sector_fallback');
    expect(s.core?.match_quality).toBe('sector_fallback');
    expect(s.geo?.match_quality).toBe('exact');
    expect(matchQualityToType('sector_fallback')).not.toBe('direct');
  });

  it('the analysis marks the fallback and skips the overlay for it', () => {
    const src = readFileSync('supabase/functions/analyze-business/index.ts', 'utf8');
    expect(src).toContain('if (!detectSectorFromIdea(idea_clean).matched) {');
    expect(src).toContain("overall_match_quality !== 'sector_fallback'");
    expect(src).toContain('if (containsWord(ideaLower, kw)) {');
  });
});
