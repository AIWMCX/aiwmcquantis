import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { InputsUsed } from '@/components/result/InputsUsed';
import type { BusinessAnalysisResult } from '@/types/analysis';

const ROWS: NonNullable<BusinessAnalysisResult['inputs_used']> = [
  { key: 'average_price', label: 'Average price per sale', value: 420, unit: 'usd', origin: 'ai_estimate', origin_label: 'AI estimate from your description' },
  { key: 'customers', label: 'Customers a month', value: 74, unit: 'per_month', origin: 'calculated', origin_label: 'Calculated from the figures above' },
  { key: 'payroll', label: 'Payroll (team)', value: 5150.4, unit: 'usd_per_month', origin: 'industry_default', origin_label: 'Industry default' },
];

describe('InputsUsed (result page)', () => {
  it('lists each input with its value and where it came from', () => {
    render(<InputsUsed rows={ROWS} />);
    expect(screen.getByText('Inputs this report used')).toBeInTheDocument();
    expect(screen.getByText('$420')).toBeInTheDocument();
    expect(screen.getByText('74 / mo')).toBeInTheDocument();
    expect(screen.getByText('$5,150 / mo')).toBeInTheDocument();
    expect(screen.getByText('AI estimate from your description')).toBeInTheDocument();
    expect(screen.getByText('Industry default')).toBeInTheDocument();
    expect(screen.queryByTestId('inputs-reused')).toBeNull();
  });

  it('says when the inputs were reused from an earlier run of the same idea', () => {
    render(<InputsUsed rows={ROWS} reused />);
    expect(screen.getByTestId('inputs-reused')).toHaveTextContent('same inputs were used again');
  });

  it('renders nothing for analyses saved before inputs were recorded', () => {
    const { container } = render(<InputsUsed rows={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is on the public result page', () => {
    const page = readFileSync('src/pages/PublicAnalysisResult.tsx', 'utf8');
    expect(page).toMatch(/<InputsUsed rows=\{data\.result\.inputs_used\} reused=\{data\.result\.engine_inputs\?\.reused\} \/>/);
  });
});
