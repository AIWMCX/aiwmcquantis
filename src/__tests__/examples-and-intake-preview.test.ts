import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { EXAMPLE_ANALYSES, EXAMPLE_LIST, yearOneReturn } from '@/pages/examples/exampleData';

// Register #80/#81 (2026-10-27): hand-typed "ROI" disagreed with five examples'
// own numbers and fed a meaningless "8/10" score.
describe('example pages', () => {
  it('derives year-1 profit ÷ startup cost from the example numbers', () => {
    expect(yearOneReturn({ monthlyProfit: '$3,900', startupCost: '$8,000' })).toBe('585%');
    expect(yearOneReturn({ monthlyProfit: '€0', startupCost: '€8,000' })).toBe('—');
    const app = EXAMPLE_ANALYSES['mobile-app-startup-san-francisco'];
    expect(yearOneReturn(app.metrics)).toBe('31%');
  });

  it('carries no hand-typed ROI or score', () => {
    for (const f of ['exampleData.ts', 'exampleDataExpanded.ts']) {
      expect(readFileSync(`src/pages/examples/${f}`, 'utf8')).not.toMatch(/roi: '/);
    }
    for (const ex of EXAMPLE_LIST) expect(ex).not.toHaveProperty('score');
    expect(readFileSync('src/pages/examples/ExamplesIndex.tsx', 'utf8')).not.toContain('/10');
  });

  it('labels the figure as an upper bound', () => {
    const page = readFileSync('src/pages/examples/ExampleAnalysis.tsx', 'utf8');
    expect(page).toContain('note={YEAR_ONE_RETURN_NOTE}');
    expect(page).not.toContain('ROI (Year 1)');
  });
});

// Register #92: the $349 page previews the real intake.
describe('decision review intake preview', () => {
  const page = readFileSync('src/pages/DecisionReview.tsx', 'utf8');
  const intake = readFileSync('src/pages/EngagementIntake.tsx', 'utf8');

  it('is shown on the page', () => {
    expect(page).toContain("What we'll ask you");
    expect(page).toContain('INTAKE_PREVIEW.required.map');
  });

  it('matches the fields the intake form actually requires', () => {
    expect(intake).toContain('form.company_name');
    expect(intake).toMatch(/Textarea required[^>]*form\.decision_question/);
    expect(intake).toContain('Preferred contact email');
    expect(intake).toMatch(/isConsultant && \(\s*<label[^]*Primary client type \*/);
    for (const optional of ['Decision deadline', 'What has already been tried?', 'Specific questions you want reviewed']) {
      expect(intake).toContain(optional);
    }
  });
});
