import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EXAMPLE_DECISIONS, SdwHero } from '@/components/landing/sadewa/SdwHero';
import { extractLocationFromText, isHiringDecision } from '@/lib/location-input';

describe('hero example decisions', () => {
  it('each example is long enough to run', () => {
    expect(EXAMPLE_DECISIONS).toHaveLength(3);
    for (const ex of EXAMPLE_DECISIONS) expect(ex.trim().length).toBeGreaterThanOrEqual(10);
  });

  it('one tap fills the input and enables "Test it free" without submitting', () => {
    render(
      <MemoryRouter>
        <SdwHero onWatchFilm={() => {}} />
      </MemoryRouter>,
    );
    const input = screen.getByLabelText('What are you deciding?') as HTMLInputElement;
    const submit = screen.getByRole('button', { name: /Test it free/ }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: EXAMPLE_DECISIONS[1] }));
    expect(input.value).toBe(EXAMPLE_DECISIONS[1]);
    expect(submit.disabled).toBe(false);
  });

  it('every example names a business and a City, ST, and none is a hire', () => {
    for (const ex of EXAMPLE_DECISIONS) {
      expect(extractLocationFromText(ex)).not.toBeNull();
      expect(isHiringDecision(ex)).toBe(false);
    }
  });

  it('a hiring decision goes to the hiring model instead of a business analysis', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<SdwHero onWatchFilm={() => {}} />} />
          <Route path="/demo/hiring-decision" element={<p>hiring model</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('What are you deciding?'), { target: { value: 'Hire a 2nd technician at $5,500/mo' } });
    fireEvent.click(screen.getByRole('button', { name: /Test it free/ }));
    expect(screen.getByText('hiring model')).toBeTruthy();
  });
});
