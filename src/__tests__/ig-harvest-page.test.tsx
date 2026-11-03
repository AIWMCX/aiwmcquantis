import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import type { IgItemRow } from '@/lib/ig-harvest/triage';

const row = (over: Partial<IgItemRow>): IgItemRow => ({
  id: 'id', item_key: 'k', kind: 'site/tool', host: 'h', name: 'n', example_url: 'https://h.example', urls: [], mentions: 1,
  routes: [], senders: [], first_seen: null, last_seen: null, context: null, status: 'new', product: null, notes: null,
  last_run_id: null, created_at: '', updated_at: '', ...over,
});

const updateItems = vi.fn(async (ids: string[], patch: Partial<IgItemRow>) => ids.map((id) => row({ id, name: 'acme/kit', ...patch })));
vi.mock('@/lib/ig-harvest/db', () => ({
  loadItems: async () => [
    row({ id: '1', name: 'acme/kit', host: 'github.com', kind: 'repo', example_url: 'https://github.com/acme/kit', mentions: 4, routes: ['build'], context: 'Comment KIT for the repo' }),
    row({ id: '2', name: 'cashflow.example.com', host: 'cashflow.example.com', mentions: 1, routes: ['quantis'], senders: ['growth.lab'] }),
  ],
  loadRuns: async () => [{ id: 'r1', created_by: null, file_name: 'export.zip', threads: 3, link_mentions: 5, distinct_items: 2, media: 1, created_at: '2026-11-01T10:00:00Z' }],
  saveHarvest: vi.fn(),
  updateItems: (ids: string[], patch: Partial<IgItemRow>) => updateItems(ids, patch),
}));

import InstagramHarvest from '@/pages/admin/InstagramHarvest';

describe('/admin/instagram-harvest page', () => {
  it('lists stored items, searches them, and saves a note', async () => {
    render(<HelmetProvider><InstagramHarvest /></HelmetProvider>);
    expect(await screen.findByText('acme/kit')).toBeTruthy();
    expect(screen.getByText('cashflow.example.com')).toBeTruthy();
    expect(screen.getByText(/2 items, 5 mentions, 3 threads, 1 media/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open acme/kit' }).getAttribute('href')).toBe('https://github.com/acme/kit');

    fireEvent.change(screen.getByPlaceholderText('Search name, link, sender, notes'), { target: { value: 'growth' } });
    expect(screen.queryByText('acme/kit')).toBeNull();
    expect(screen.getByText('cashflow.example.com')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Search name, link, sender, notes'), { target: { value: '' } });
    const [note] = screen.getAllByPlaceholderText('Add a note');
    fireEvent.change(note, { target: { value: 'Try in Build onboarding' } });
    fireEvent.blur(note);
    expect(updateItems).toHaveBeenCalledWith(['1'], { notes: 'Try in Build onboarding' });
  });
});
