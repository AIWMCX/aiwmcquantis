import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { IndustryCorrection } from '@/components/result/IndustryCorrection';
import { industryLabel } from '@/lib/industry-label';
import { INDUSTRIES } from '@/components/analysis/steps/shared';

// Buy-blockers #65. The choices must be the /app form's own INDUSTRIES so the
// pick shows as the selected chip there (first version used INDUSTRY_OPTIONS,
// half of which /app cannot display).
function AppState() {
  const { state } = useLocation();
  return <pre data-testid="app-state">{JSON.stringify(state)}</pre>;
}

const setup = () =>
  render(
    <MemoryRouter initialEntries={['/r/x']}>
      <Routes>
        <Route path="/r/x" element={<IndustryCorrection idea="Mobile dog grooming van" location="Boise, ID" detectedIndustry="saas" />} />
        <Route path="/app" element={<AppState />} />
      </Routes>
    </MemoryRouter>,
  );

describe('industry correction on the result', () => {
  it('labels slugs from the /app list first', () => {
    expect(industryLabel('saas')).toBe('SaaS');
    expect(industryLabel('food_service')).toBe('Food & Beverage');
    expect(industryLabel('pet_services')).toBe('Pet services');
    expect(industryLabel('auto')).toBeNull();
  });

  it('offers exactly the /app industries, minus the current one', () => {
    setup();
    fireEvent.click(screen.getByText('Wrong industry? Change it'));
    const offered = screen.getAllByRole('radio').map((r) => r.textContent);
    expect(offered).toEqual(INDUSTRIES.filter((i) => i.id !== 'saas').map((i) => i.label));
    expect((screen.getByText('Re-run with this industry') as HTMLButtonElement).disabled).toBe(true);
  });

  it('re-runs in /app with the same idea, location and the chosen industry', () => {
    setup();
    fireEvent.click(screen.getByText('Wrong industry? Change it'));
    fireEvent.click(screen.getByRole('radio', { name: 'Consulting' }));
    fireEvent.click(screen.getByText('Re-run with this industry'));
    expect(JSON.parse(screen.getByTestId('app-state').textContent ?? '{}')).toEqual({
      decisionStatement: 'Mobile dog grooming van',
      prefillLocation: 'Boise, ID',
      prefillIndustry: 'consulting',
    });
  });

  it('/app applies prefillIndustry and the result page renders the control', () => {
    expect(readFileSync('src/pages/AppDashboard.tsx', 'utf8')).toMatch(/incoming\.prefillIndustry/);
    expect(readFileSync('src/pages/PublicAnalysisResult.tsx', 'utf8')).toMatch(/<IndustryCorrection/);
  });
});
