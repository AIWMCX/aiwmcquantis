import { describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BusinessPlanForm } from '@/components/docs/forms/BusinessPlanForm';

describe('business plan financial preview', () => {
  it('labels unprovided forecasts as missing instead of showing fabricated zeros', async () => {
    const onPreviewUpdate = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BusinessPlanForm template={undefined} onGenerate={() => {}} onPreviewUpdate={onPreviewUpdate} isGenerating={false} />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(onPreviewUpdate).toHaveBeenCalled());
    const html = onPreviewUpdate.mock.lastCall?.[0] as string;
    expect(html).toContain('Not provided');
    expect(html).not.toContain('0 mo');
    expect(html).not.toContain('>$0<');
  });
});
