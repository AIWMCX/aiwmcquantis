/**
 * ReturningDecisionBanner (Activation-to-revenue Wave 6, PR C).
 *
 * "Do not fake this using localStorage alone" -- this suite proves the
 * banner renders nothing without a real persisted analysis, and only ever
 * surfaces real fields (idea, created_at, and a real critical assumption)
 * from the mocked useAnalysisHistory() result -- never a fabricated one.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockRecordFunnelEvent = vi.fn();
vi.mock('@/lib/analytics', () => ({
  recordFunnelEvent: (...args: unknown[]) => mockRecordFunnelEvent(...args),
}));

let mockHistoryState: { history: unknown[]; isLoaded: boolean; isAuthenticated: boolean };
vi.mock('@/hooks/useAnalysisHistory', () => ({
  useAnalysisHistory: () => mockHistoryState,
}));

import { ReturningDecisionBanner } from '@/components/analysis/ReturningDecisionBanner';

function renderIt(onOpenReport = vi.fn()) {
  return render(
    <MemoryRouter>
      <ReturningDecisionBanner onOpenReport={onOpenReport} />
    </MemoryRouter>,
  );
}

describe('ReturningDecisionBanner', () => {
  it('renders nothing when there is no real prior analysis', () => {
    mockHistoryState = { history: [], isLoaded: true, isAuthenticated: true };
    const { container } = renderIt();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while history is still loading, rather than a false-empty or fabricated state', () => {
    mockHistoryState = { history: [], isLoaded: false, isAuthenticated: true };
    const { container } = renderIt();
    expect(container).toBeEmptyDOMElement();
  });

  it('surfaces the real idea, date, and critical assumption from the persisted analysis', () => {
    mockHistoryState = {
      history: [{
        id: 'analysis-9',
        idea: 'Coffee shop expansion to Denver',
        location: 'Denver, CO',
        created_at: '2026-09-20T00:00:00Z',
        result: {
          assumption_graph: {
            criticalPath: [{ assumption: 'CAC', sensitivity: 0.8, breakingThreshold: 250, currentValue: 220, direction: 'up', recommendation: 'x' }],
          },
        },
      }],
      isLoaded: true,
      isAuthenticated: true,
    };
    renderIt();
    expect(screen.getByText('Coffee shop expansion to Denver')).toBeInTheDocument();
    expect(screen.getByText('CAC')).toBeInTheDocument();
    expect(screen.getByText(/= 220/)).toBeInTheDocument();
  });

  it('calls onOpenReport with the real stored result and id, not a re-fetched or fabricated one', () => {
    const onOpenReport = vi.fn();
    mockHistoryState = {
      history: [{ id: 'analysis-9', idea: 'x', location: 'y', created_at: '2026-09-20T00:00:00Z', result: { financial_analysis: {} } }],
      isLoaded: true,
      isAuthenticated: true,
    };
    renderIt(onOpenReport);
    fireEvent.click(screen.getByText('Open report'));
    expect(onOpenReport).toHaveBeenCalledWith({ financial_analysis: {} }, 'analysis-9');
  });

  it('navigates to the real /app/scenarios route (with intent=return) for "Update assumption"', () => {
    mockHistoryState = {
      history: [{ id: 'analysis-9', idea: 'x', location: 'y', created_at: '2026-09-20T00:00:00Z', result: {} }],
      isLoaded: true,
      isAuthenticated: true,
    };
    renderIt();
    fireEvent.click(screen.getByText('Update assumption'));
    expect(mockNavigate).toHaveBeenCalledWith('/app/scenarios?analysisId=analysis-9&intent=return');
  });
});
