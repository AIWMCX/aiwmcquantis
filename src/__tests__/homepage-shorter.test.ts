import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Buy-blockers #101 (2026-10-29): 15 sections, 2 of 164 home sessions started
// an analysis. Sections that have their own page are linked, not repeated; the
// second email capture (Starter Kit) is gone (#108: one capture point).
describe('homepage keeps the path to a decision short', () => {
  const src = readFileSync('src/pages/Landing.tsx', 'utf8');

  it('no longer renders the sections that have their own pages', () => {
    for (const c of ['<QuantisOutputs', '<HowItWorksSection', '<Comparison', '<OpenTheHood', '<LeadCaptureInline']) {
      expect(src, c).not.toContain(c);
    }
  });

  it('links to those pages instead', () => {
    for (const href of ['/how-it-works', '/methodology', '/demo/sample-decision-memo', '/pricing#compare-links']) {
      expect(src, href).toContain(`to="${href}"`);
    }
  });

  it('keeps the decision path and the buyer bridges', () => {
    for (const c of ['<SdwHero', '<HiringDemoBand />', '<ReportFirstHero />', '<WhoItsFor />', '<PricingSection />', '<FAQSection />', '<FinalCTA />']) {
      expect(src, c).toContain(c);
    }
  });
});
