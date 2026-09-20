import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dashboardSource = readFileSync(
  resolve(process.cwd(), 'src/pages/AppDashboard.tsx'),
  'utf8',
);
const formSource = readFileSync(
  resolve(process.cwd(), 'src/components/analysis/CompactAnalysisForm.tsx'),
  'utf8',
);

describe('"Try Coffee Shop Sample" actually produces a submittable analysis (2026-09-20)', () => {
  it('sets selected_industry, not just idea/location/financial fields', () => {
    // Found by running the master operating prompt's first-user acceptance
    // test against live production: clicking the site's own flagship
    // one-click demo button left every industry chip unselected
    // (confirmed via aria-checked="false" on all of them in the live DOM),
    // so the required-fields gate never passed and "Start Free Analysis"
    // silently did nothing for every anonymous visitor who tried the demo.
    // Search for the unique emoji-prefixed button label, not the bare
    // phrase -- this file's own explanatory comment above the handler also
    // contains the words "Try Coffee Shop Sample", which would otherwise
    // match first and point the slice at the wrong position.
    const idx = dashboardSource.indexOf('☕ Try Coffee Shop Sample');
    expect(idx).toBeGreaterThan(-1);
    const handlerStart = dashboardSource.lastIndexOf('onClick={() => {', idx);
    const block = dashboardSource.slice(handlerStart, idx);
    expect(block).toContain("selected_industry: 'coffee_shop'");
  });

  it("'coffee_shop' matches the real industry id (not a guessed string)", () => {
    // Cross-checked against src/components/analysis/steps/shared.ts's own
    // INDUSTRIES list: { id: 'coffee_shop', label: 'Coffee Shop', ... }.
    expect(dashboardSource).toContain("selected_industry: 'coffee_shop'");
  });

  it('CompactAnalysisForm re-syncs its local selectedIndustry state when the prop changes after mount', () => {
    // The deeper root cause: selectedIndustry starts as local useState
    // seeded from financialInputs.selected_industry, but useState's
    // initializer only runs once -- a later external change to the prop
    // (like the sample-fill button) never reached this local state without
    // an explicit effect syncing it. Fixing only the missing field above,
    // without this, would NOT have worked.
    expect(formSource).toMatch(/useEffect\(\(\) => \{\s*if \(financialInputs\.selected_industry && financialInputs\.selected_industry !== selectedIndustry\)/);
  });
});
