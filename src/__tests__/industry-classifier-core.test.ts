import { describe, it, expect } from 'vitest';
import { scoreIndustriesByKeywords, type KeywordIndustry } from '../../supabase/functions/analyze-business/industry-classifier-core';

// Regression coverage for a real production bug (2026-08-30): a homepage
// free-analysis request for "A mobile dog-walking and pet-sitting service
// ... targeting busy professionals" was classified as "Consulting /
// Professional Services" because the generic word "professionals"
// substring-matched the keyword 'professional'. Reproduced live via the
// actual production site before this fix, then fixed by removing
// 'services'/'professional' from the consulting keyword list in index.ts.
// This suite tests the extracted scoring function directly with a minimal
// fixture set mirroring the real industry list's shape, not the full
// production keyword lists (which would make the test brittle to future
// legitimate keyword additions).

const FIXTURE_INDUSTRIES: KeywordIndustry[] = [
  { id: 'general', name: 'General Business', keywords: [] },
  {
    id: 'consulting',
    name: 'Consulting / Professional Services',
    keywords: ['consulting', 'consultant', 'agency', 'advisor', 'coach', 'coaching', 'training', 'b2b', 'enterprise'],
  },
  { id: 'fitness', name: 'Fitness / Wellness', keywords: ['gym', 'fitness', 'yoga', 'personal training'] },
  { id: 'food_service', name: 'Food & Beverage', keywords: ['restaurant', 'cafe', 'bakery', 'food', 'coffee'] },
];

describe('scoreIndustriesByKeywords', () => {
  it('SYNTHETIC REGRESSION: a pet-care business mentioning "professionals" as a target market does not match consulting', () => {
    const idea = 'a mobile dog-walking and pet-sitting service targeting busy professionals, $25 per walk, 40 recurring clients target';
    const { match, score } = scoreIndustriesByKeywords(idea, FIXTURE_INDUSTRIES);
    expect(match).toBeNull();
    expect(score).toBe(0);
  });

  it('still correctly matches a genuine consulting business', () => {
    const idea = 'a boutique management consulting firm specializing in digital transformation for mid-market companies';
    const { match } = scoreIndustriesByKeywords(idea, FIXTURE_INDUSTRIES);
    expect(match?.id).toBe('consulting');
  });

  it('matches the highest-scoring industry, not merely the first with any match', () => {
    const idea = 'a specialty coffee shop and cafe with a small bakery counter';
    const { match } = scoreIndustriesByKeywords(idea, FIXTURE_INDUSTRIES);
    expect(match?.id).toBe('food_service');
  });

  it('returns null (not a false match) when the idea matches no industry keywords at all', () => {
    const idea = 'a subscription box for handmade ceramics';
    const { match, score } = scoreIndustriesByKeywords(idea, FIXTURE_INDUSTRIES);
    expect(match).toBeNull();
    expect(score).toBe(0);
  });

  it('never returns the general bucket as a match (caller is responsible for the general fallback)', () => {
    const idea = 'a general business doing general things generally';
    const { match } = scoreIndustriesByKeywords(idea, FIXTURE_INDUSTRIES);
    expect(match).toBeNull();
  });

  it('is case-insensitive against the idea text', () => {
    const idea = 'A BOUTIQUE MANAGEMENT CONSULTING FIRM';
    const { match } = scoreIndustriesByKeywords(idea, FIXTURE_INDUSTRIES);
    expect(match?.id).toBe('consulting');
  });
});
