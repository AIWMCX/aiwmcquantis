import { describe, it, expect } from 'vitest';
import { detectQuoteGenTrade } from '@/lib/quotegen-eligibility';

describe('detectQuoteGenTrade', () => {
  it('detects HVAC from idea text', () => {
    expect(detectQuoteGenTrade('Residential HVAC repair and installation service', undefined)).toBe('hvac');
  });

  it('detects HVAC from industry_detected', () => {
    expect(detectQuoteGenTrade('some idea', 'HVAC Services')).toBe('hvac');
  });

  it('detects electrician from idea text', () => {
    expect(detectQuoteGenTrade('Licensed electrician doing residential rewiring', undefined)).toBe('electrical');
  });

  it('detects handyman from idea text', () => {
    expect(detectQuoteGenTrade('General handyman service for small home repairs', undefined)).toBe('handyman');
  });

  it('does not offer QuoteGen for unrelated industries', () => {
    expect(detectQuoteGenTrade('Specialty coffee shop with remote workspace', 'Coffee Shop')).toBeNull();
    expect(detectQuoteGenTrade('SaaS analytics dashboard for retailers', 'SaaS')).toBeNull();
  });

  it('does not falsely match generic contractor/construction ideas', () => {
    // Deliberately narrower than industry-priors.ts's 'contractor_trades' bucket —
    // this gate is scoped to exactly HVAC/electrician/handyman, not all trades.
    expect(detectQuoteGenTrade('General construction contractor for home additions', undefined)).toBeNull();
    expect(detectQuoteGenTrade('Residential plumbing repair service', 'Trades / Contractor')).toBeNull();
  });

  it('handles undefined idea and industry gracefully', () => {
    expect(detectQuoteGenTrade(undefined, undefined)).toBeNull();
  });
});
