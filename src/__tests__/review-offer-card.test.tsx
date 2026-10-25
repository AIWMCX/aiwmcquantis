import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReviewOfferCard } from '@/components/analysis/ReviewOfferCard';
import { ENGAGEMENT_OFFERS } from '@/config/engagement-offers';

describe('result → Founder Decision Review', () => {
  it('shows the offer price from config and links the offer and the sample memo', () => {
    render(<MemoryRouter><ReviewOfferCard /></MemoryRouter>);
    const price = ENGAGEMENT_OFFERS.find((o) => o.code === 'founder_decision_review')!.price;
    expect(screen.getByText(new RegExp(`\\$${price}, one decision`))).toBeTruthy();
    expect(screen.getByRole('link', { name: /See the review/ }).getAttribute('href')).toBe('/decision-review');
    expect(screen.getByRole('link', { name: /Read a sample memo/ }).getAttribute('href')).toBe('/demo/sample-decision-memo');
  });

  it('renders once on the first result step, after the profit range', () => {
    const src = readFileSync('src/components/analysis/AccuracyTransparentResults.tsx', 'utf8');
    expect(src.match(/<ReviewOfferCard \/>/g)).toHaveLength(1);
    expect(src.indexOf('<ReviewOfferCard />')).toBeGreaterThan(src.indexOf('<ProfitRangeCard'));
    expect(src).toContain('{currentStep === 1 && result.financial_analysis && <ReviewOfferCard />}');
  });
});
