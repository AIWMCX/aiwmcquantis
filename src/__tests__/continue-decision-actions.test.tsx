/**
 * ContinueDecisionActions (Activation-to-revenue Wave 6, PR C).
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

import { ContinueDecisionActions } from '@/components/analysis/ContinueDecisionActions';

function renderIt(props: Partial<React.ComponentProps<typeof ContinueDecisionActions>> = {}) {
  return render(
    <MemoryRouter>
      <ContinueDecisionActions analysisId="analysis-1" {...props} />
    </MemoryRouter>,
  );
}

describe('ContinueDecisionActions', () => {
  it('navigates to the real /app/scenarios route with the analysis id and an intent tag', () => {
    renderIt();
    fireEvent.click(screen.getByText('Compare downside'));
    expect(mockNavigate).toHaveBeenCalledWith('/app/scenarios?analysisId=analysis-1&intent=downside');
    expect(mockRecordFunnelEvent).toHaveBeenCalledWith('next_action_selected', {
      analysis_id: 'analysis-1', action: 'Compare downside', context: 'continue_decision',
    });
  });

  it('navigates to /app/new-decision (the real PR A route) for "Start a related decision"', () => {
    renderIt();
    fireEvent.click(screen.getByText('Start a related decision'));
    expect(mockNavigate).toHaveBeenCalledWith('/app/new-decision');
  });

  it('disables scenario actions when there is no analysisId to attach them to', () => {
    renderIt({ analysisId: undefined });
    expect(screen.getByText('Change an assumption').closest('button')).toBeDisabled();
  });

  it('disables "Update with real numbers" when no handler is supplied, never silently no-ops', () => {
    renderIt({ onUpdateWithRealNumbers: undefined });
    expect(screen.getByText('Update with real numbers').closest('button')).toBeDisabled();
  });

  it('calls the supplied onUpdateWithRealNumbers and fires the event when enabled', () => {
    const onUpdateWithRealNumbers = vi.fn();
    renderIt({ onUpdateWithRealNumbers });
    fireEvent.click(screen.getByText('Update with real numbers'));
    expect(onUpdateWithRealNumbers).toHaveBeenCalled();
    expect(mockRecordFunnelEvent).toHaveBeenCalledWith('next_action_selected', {
      analysis_id: 'analysis-1', action: 'Update with real numbers', context: 'continue_decision',
    });
  });
});
