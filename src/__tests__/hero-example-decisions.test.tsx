import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EXAMPLE_DECISIONS, SdwHero } from '@/components/landing/sadewa/SdwHero';

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
});
