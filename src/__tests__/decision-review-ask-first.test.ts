import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const PAGE = readFileSync('src/pages/DecisionReview.tsx', 'utf8');

describe('/decision-review: a buyer can ask before paying', () => {
  it('every offer card has a mailto question link next to Reserve', () => {
    expect(PAGE).toContain('mailto:support@aiwmcquantis.com?subject=');
    expect(PAGE).toContain('Ask a question before you pay');
    expect(PAGE).toContain("trackEvent('paid_review_question_click'");
  });

  it('the page view reaches the funnel sink, not only GA4', () => {
    expect(PAGE).toContain("recordFunnelEvent('paid_review_view'");
    expect(readFileSync('src/lib/analytics.ts', 'utf8')).toContain("| 'paid_review_view'");
  });

  it('no testimonial component exists to ship by accident', () => {
    expect(existsSync('src/components/landing/ClientTestimonials.tsx')).toBe(false);
  });
});
