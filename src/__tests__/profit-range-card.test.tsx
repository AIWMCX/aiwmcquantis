import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProfitRangeCard } from '@/components/analysis/ProfitRangeCard';

describe('ProfitRangeCard', () => {
  it('shows the P10 / median / P90 range, the profitable share and the assumptions', async () => {
    render(<ProfitRangeCard monthlyRevenue={10_000} monthlyCosts={6_000} seedKey="t" />);
    expect(screen.getByText('1,000 simulated months (Monte Carlo) around your numbers.')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Low (P10)')).toBeTruthy());
    expect(screen.getByText('Typical (median)')).toBeTruthy();
    expect(screen.getByText('High (P90)')).toBeTruthy();
    expect(screen.getByText(/Profitable in/).textContent).toContain('100%');
    expect(screen.getByText(/Assumptions: revenue varies 80%–120% and costs 90%–115%/)).toBeTruthy();
  });
});
