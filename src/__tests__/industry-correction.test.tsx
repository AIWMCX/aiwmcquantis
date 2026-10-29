import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IndustryCorrection } from '@/components/result/IndustryCorrection';
import { industryLabel } from '@/lib/industry-label';

// Buy-blockers #65: a run that guessed the wrong industry could not be corrected.

describe('industry correction on the result', () => {
  it('labels known and unknown slugs', () => {
    expect(industryLabel('saas')).toBe('SaaS / Software');
    expect(industryLabel('pet_grooming')).toBe('Pet grooming');
    expect(industryLabel('auto')).toBeNull();
  });

  it('shows the modeled industry and opens the picker', () => {
    render(
      <MemoryRouter>
        <IndustryCorrection idea="Mobile dog grooming van" location="Denver, CO" detectedIndustry="saas" />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('industry-correction').textContent).toMatch(/Modeled as: SaaS \/ Software/);
    fireEvent.click(screen.getByText('Wrong industry? Change it'));
    expect(screen.getByText('Re-run with this industry')).toBeTruthy();
  });

  it('re-runs in /app with the same idea and location', () => {
    const src = readFileSync('src/components/result/IndustryCorrection.tsx', 'utf8');
    expect(src).toMatch(/navigate\('\/app', \{\s*state: \{\s*decisionStatement: idea/);
    expect(readFileSync('src/pages/AppDashboard.tsx', 'utf8')).toMatch(/incoming\.prefillIndustry/);
    expect(readFileSync('src/pages/PublicAnalysisResult.tsx', 'utf8')).toMatch(/<IndustryCorrection/);
  });
});
