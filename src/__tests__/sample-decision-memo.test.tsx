import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import SampleDecisionMemo, { MEMO_SCENARIOS } from '@/pages/SampleDecisionMemo';
import { runHiringDemo } from '@/lib/demo/hiring-decision-demo';

describe('Sample Decision Memo (/demo/sample-decision-memo)', () => {
  it('its three scenarios tell a real conditional story from the engine', () => {
    const by = Object.fromEntries(MEMO_SCENARIOS.map((s) => [s.key, runHiringDemo(s.a)]));
    expect(by.base.holds).toBe(true);
    expect(by.upside.holds).toBe(true);
    expect(by.downside.holds).toBe(false);
  });

  it('renders as fictional, with every deliverable section and the paid CTA', () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <SampleDecisionMemo />
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(screen.getByText(/Fictional example\./)).toBeTruthy();
    for (const h of ['1. The decision', '2. Facts, assumptions and unknowns', '3. Three scenarios', '4. Cash, break-even and payback, reconciled', '5. What would change the decision', '6. Conclusion']) {
      expect(screen.getByText(h)).toBeTruthy();
    }
    expect(screen.getByText(/Conditional go\./)).toBeTruthy();
    expect(screen.getByText(/Get this for your decision: \$349/)).toBeTruthy();
  });

  it('is a registered, linked public route', () => {
    expect(readFileSync('src/App.tsx', 'utf8')).toContain('path="/demo/sample-decision-memo"');
    expect(readFileSync('scripts/seo.routes.mjs', 'utf8')).toContain('"/demo/sample-decision-memo"');
    expect(readFileSync('scripts/generate-sitemap.ts', 'utf8')).toContain("'/demo/sample-decision-memo'");
    expect(readFileSync('src/pages/DecisionReview.tsx', 'utf8')).toContain('to="/demo/sample-decision-memo"');
  });
});
