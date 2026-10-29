import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CompareLinks } from '@/components/layout/CompareLinks';
import { VS_PAGES } from '@/pages/vs/vsData';

// Buy-blockers #114: comparison pages got 1 view in 30 days; nothing linked them.
describe('comparison links on pricing and blog', () => {
  it('links every comparison page', () => {
    render(<MemoryRouter><CompareLinks /></MemoryRouter>);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(VS_PAGES.map((p) => `/vs/${p.slug}`));
  });

  it('pricing and the blog index render it; pricing no longer hard-codes the review price', () => {
    const pricing = readFileSync('src/pages/Pricing.tsx', 'utf8');
    expect(pricing).toMatch(/<CompareLinks/);
    expect(pricing).not.toMatch(/from \$349/);
    expect(readFileSync('src/pages/Blog.tsx', 'utf8')).toMatch(/<CompareLinks/);
  });
});
