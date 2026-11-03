// Production QA, 2026-11-02: in 8 days 32 outside visitors saw the homepage and
// none submitted an idea. On the live site a press of "Test it free" did nothing
// (no event, no request) and a second press later worked.
//
// The homepage is not hydrated from static HTML: main.tsx uses createRoot and
// the shipped HTML has no form, so there is no pre-hydration form to lose a
// click. What did swallow presses: the button was disabled until React's state
// held 10+ characters. Text that reached the box without a change React saw
// (autofill, restored form state, scripted input) left the button disabled with
// the text visible, and short text got no message. These tests pin each path.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { handleSubmit, recordFunnelEvent } = vi.hoisted(() => ({
  handleSubmit: vi.fn(),
  recordFunnelEvent: vi.fn(),
}));

vi.mock('@/hooks/useAnalysis', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    useAnalysis: () => {
      const [idea, setIdea] = React.useState('');
      const [location, setLocation] = React.useState('');
      return {
        idea, setIdea, location, setLocation,
        errors: {}, handleSubmit, isLoading: false, analysisId: null, result: null,
        freeTierSummary: null, reset: vi.fn(), rateLimitError: null,
      };
    },
  };
});

vi.mock('@/lib/analytics', async () => {
  const actual = await vi.importActual<typeof import('@/lib/analytics')>('@/lib/analytics');
  return { ...actual, recordFunnelEvent, trackCtaClick: vi.fn() };
});

import { SdwHero } from '@/components/landing/sadewa/SdwHero';
import { ReportFirstHero } from '@/components/landing/ReportFirstHero';
import { HERO_IDEA_EVENT, publishHeroRunState, takePendingHeroIdea } from '@/lib/hero-idea';

const IDEA = 'Second coffee shop in Denver, CO, $80K build-out';

function renderHero() {
  return render(
    <MemoryRouter>
      <SdwHero onWatchFilm={() => {}} />
    </MemoryRouter>,
  );
}

describe('homepage hero: the first press always does something', () => {
  const sent = vi.fn();
  const onIdea = (e: Event) => sent((e as CustomEvent<string>).detail);
  beforeEach(() => {
    sent.mockReset();
    handleSubmit.mockReset();
    recordFunnelEvent.mockReset();
    takePendingHeroIdea();
    window.addEventListener(HERO_IDEA_EVENT, onIdea);
  });
  afterEach(() => window.removeEventListener(HERO_IDEA_EVENT, onIdea));

  it('runs text that is in the box even if React never saw it change', () => {
    renderHero();
    const input = screen.getByLabelText('What are you deciding?') as HTMLInputElement;
    // A plain DOM write: React's value tracker records it, so no onChange fires
    // and React state stays ''. Before the fix the button stayed disabled here.
    input.value = IDEA;
    fireEvent.input(input);
    const button = screen.getByRole('button', { name: /Test it free/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(sent).toHaveBeenCalledWith(IDEA);
  });

  it('shows progress in the hero in the same tick as the press', () => {
    renderHero();
    fireEvent.change(screen.getByLabelText('What are you deciding?'), { target: { value: IDEA } });
    fireEvent.click(screen.getByRole('button', { name: /Test it free/ }));
    const button = screen.getByRole('button', { name: /Running your numbers…/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    const progress = screen.getByTestId('hero-run-progress');
    expect(progress.getAttribute('role')).toBe('status');
    expect(progress.textContent).toContain('Reading your idea');
    expect(progress.textContent).toContain('Step 1 of 6');
    expect((screen.getByLabelText('What are you deciding?') as HTMLInputElement).value).toBe(IDEA);
  });

  it('a press with too little text gets a visible hint, never silence', () => {
    renderHero();
    const input = screen.getByLabelText('What are you deciding?') as HTMLInputElement;
    fireEvent.click(screen.getByRole('button', { name: /Test it free/ }));
    expect(screen.getByRole('alert').textContent).toContain('tap an example');
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: 'bakery' } });
    fireEvent.click(screen.getByRole('button', { name: /Test it free/ }));
    expect(screen.getByRole('alert').textContent).toContain('a few more words');
    expect(sent).not.toHaveBeenCalled();
  });

  it('a run that fails hands the button back with a message', () => {
    renderHero();
    fireEvent.change(screen.getByLabelText('What are you deciding?'), { target: { value: IDEA } });
    fireEvent.click(screen.getByRole('button', { name: /Test it free/ }));
    act(() => publishHeroRunState({ phase: 'running' }));
    act(() => publishHeroRunState({ phase: 'failed', message: 'Free limit reached for today.' }));
    expect(screen.getByRole('button', { name: /Test it free/ })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Free limit reached for today.');
  });

  it('an idea sent before the runner was listening still runs when it mounts', async () => {
    const hero = renderHero();
    fireEvent.change(screen.getByLabelText('What are you deciding?'), { target: { value: IDEA } });
    fireEvent.click(screen.getByRole('button', { name: /Test it free/ }));
    hero.unmount();
    expect(handleSubmit).not.toHaveBeenCalled();

    // The runner mounts only now (its window listener did not exist at the press).
    await act(async () => {
      render(
        <MemoryRouter>
          <ReportFirstHero />
        </MemoryRouter>,
      );
    });
    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(undefined, 'quick');
    expect(recordFunnelEvent).toHaveBeenCalledWith('idea_submitted', { source: 'sdw_hero', idea_length: IDEA.length });
    // The city in the idea is used, not the default location.
    expect((screen.getByLabelText('Location') as HTMLInputElement).value).toBe('Denver, CO');
    expect(takePendingHeroIdea()).toBeNull();
  });
});
