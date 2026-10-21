import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdvancedFinancialInputs } from '@/components/analysis/AdvancedFinancialInputs';

describe('advanced financial input claims', () => {
  it('counts an explicitly supplied zero without promising an accuracy or confidence gain', () => {
    render(<AdvancedFinancialInputs financialInputs={{ monthly_costs: 0 }} onChange={() => {}} />);

    expect(screen.getByText('1/7 financial assumptions provided')).toBeTruthy();
    expect(screen.queryByText(/accuracy by|confidence boost|confidence/i)).toBeNull();
  });
});
