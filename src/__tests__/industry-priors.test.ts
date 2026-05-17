import { describe, it, expect } from 'vitest';
import { INDUSTRY_PRIORS, GENERIC_PRIOR, classifyIndustry, isRichPrior } from '@/lib/industry-priors';

describe('industry-priors', () => {
  it('exposes exactly 20 rich priors', () => {
    expect(INDUSTRY_PRIORS).toHaveLength(20);
  });

  it('every prior has confidence in the 70..78 band', () => {
    for (const p of INDUSTRY_PRIORS) {
      expect(p.confidence).toBeGreaterThanOrEqual(70);
      expect(p.confidence).toBeLessThanOrEqual(78);
    }
  });

  it('every prior has a non-empty source citation', () => {
    for (const p of INDUSTRY_PRIORS) {
      expect(p.source.length).toBeGreaterThan(8);
    }
  });

  it('every prior has internally consistent margin math (gross >= net, cogs = 100 - gross)', () => {
    for (const p of INDUSTRY_PRIORS) {
      expect(p.gross_margin_pct).toBeGreaterThanOrEqual(p.net_margin_pct);
      expect(p.cogs_pct + p.gross_margin_pct).toBeCloseTo(100, 0);
    }
  });

  it('classifies known idea phrases to the matching prior', () => {
    const cases: Array<[string, string]> = [
      ['B2B SaaS for legal teams', 'saas_b2b'],
      ['Mobile app for runners on the App Store', 'mobile_app'],
      ['DTC ecommerce skincare brand on Shopify', 'ecommerce_dtc'],
      ['Two-sided marketplace for pet sitters', 'marketplace'],
      ['Coffee shop in Brooklyn', 'coffee_shop'],
      ['Fast casual taco chain', 'qsr_fastfood'],
      ['Yoga studio in Denver', 'fitness_gym'],
      ['Marketing agency for dentists', 'agency_marketing'],
      ['Online course platform for engineers', 'edtech_online_course'],
      ['Telehealth app for chronic disease', 'healthtech_telemed'],
      ['Cleaning service for short-term rentals', 'cleaning_services'],
      ['Real estate brokerage in Miami', 'real_estate_brokerage'],
      ['Last mile delivery service', 'logistics_delivery'],
      ['Plumber contractor in Houston', 'contractor_trades'],
      ['Boutique retail store for vintage clothing', 'retail_brick_mortar'],
    ];
    for (const [idea, expectedId] of cases) {
      const p = classifyIndustry(idea);
      expect(p.id, `idea: "${idea}"`).toBe(expectedId);
      expect(isRichPrior(p)).toBe(true);
    }
  });

  it('falls back to GENERIC_PRIOR when nothing matches', () => {
    const p = classifyIndustry('asdf random gibberish xyz');
    expect(p.id).toBe(GENERIC_PRIOR.id);
    expect(isRichPrior(p)).toBe(false);
    expect(p.confidence).toBeLessThan(70);
  });

  it('handles empty inputs without crashing', () => {
    expect(classifyIndustry('').id).toBe(GENERIC_PRIOR.id);
    expect(classifyIndustry(undefined as unknown as string).id).toBe(GENERIC_PRIOR.id);
  });

  it('LTV:CAC multiple is healthy (>=3) for every rich prior', () => {
    for (const p of INDUSTRY_PRIORS) {
      expect(p.ltv_multiple_of_cac).toBeGreaterThanOrEqual(3);
    }
  });
});
