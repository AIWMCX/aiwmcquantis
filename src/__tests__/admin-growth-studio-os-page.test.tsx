import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import type { GrowthOsSnapshot } from '@/lib/growth-os';

const SNAP: GrowthOsSnapshot = {
  generated_at: '2026-11-17T02:00:00Z',
  range: { from: '2025-01-01', to: '2026-11-17' },
  products: [
    { id: 'store', name: 'AIWMC Store / AIWMC Studio', url: 'https://www.aiwmc.store', repo: 'AIWMCX/aiwmcstore', role: 'Creative agency', live: { status: 200 }, last_commit: 'c99a6f4 stage 4', prompt: 'store prompt', wiring: '' },
    { id: 'build', name: 'AIWMC Build', url: 'https://build.aiwmc.store', repo: 'AIWMCX/aiwmc-builder', role: 'Trades video', live: { status: 200 }, last_commit: '', prompt: '', wiring: '' },
    { id: 'quantis', name: 'AIWMC Quantis', url: 'https://www.aiwmcquantis.com', repo: 'AIWMCX/aiwmcquantis', role: 'Last race', live: { status: 200 }, last_commit: '', prompt: '', wiring: 'quantis wiring map' },
    { id: 'space', name: 'AIWMC Research Foundation', url: 'https://aiwmc.space', repo: 'AIWMCX/ai-research-nexus', role: 'Papers', live: { status: null, error: 'URLError' }, last_commit: '', prompt: '', wiring: '' },
  ],
  registry: 'REGISTRY TEXT',
  master_spec: 'SPEC',
  master_prompt: 'PROMPT',
  timeline: [
    { date: '2026-11-16', kind: 'ops', text: 'Owner emails drafted in Gmail', products: ['quantis'] },
    { date: '2026-11-15', kind: 'commit', repo: 'store', sha: 'abc1234', text: 'stage 3 homepage', products: ['store'] },
  ],
  documents: [
    { id: 'vault:REGISTRY.md', source: 'vault', path: 'REGISTRY.md', title: 'Growth Studio registry', date: '2026-11-16', bytes: 2048, truncated: false, products: ['general'], text: 'Full registry body' },
  ],
  memory: [{ id: 'r1', title: 'no-image-no-publish', description: 'every post needs an image', kind: 'rule', products: ['quantis'], text: 'rule body', date: '2026-11-09' }],
  skills: [{ name: 'hook-machine', folder: 'hook-machine', description: 'hooks' }],
  tasks: [{ id: 'quantis-daily-growth-desk', schedule: '07:15 daily', description: 'growth desk', products: ['quantis'], text: 'task' }],
  page_db: { plan: [] },
};

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
invoke.mockImplementation(() => Promise.resolve({ data: SNAP, error: null }));

import GrowthStudioOS from '@/pages/admin/GrowthStudioOS';

describe('/admin/growth-studio', () => {
  it('loads the snapshot from the admin-only growth-os function and shows all 4 products', async () => {
    render(<MemoryRouter><HelmetProvider><GrowthStudioOS /></HelmetProvider></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'AIWMC Growth Studio OS' })).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith('growth-os');
    for (const name of ['AIWMC Store / AIWMC Studio', 'AIWMC Build', 'AIWMC Quantis', 'AIWMC Research Foundation']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getAllByText('live 200')).toHaveLength(3);
    expect(screen.getByText(/down URLError/)).toBeInTheDocument();
  });

  it('filters the overview to one product', async () => {
    render(<MemoryRouter><HelmetProvider><GrowthStudioOS /></HelmetProvider></MemoryRouter>);
    await screen.findByRole('heading', { name: 'AIWMC Growth Studio OS' });
    fireEvent.click(screen.getByRole('button', { name: 'aiwmcquantis.com' }));
    expect(screen.queryByText('AIWMC Store / AIWMC Studio')).not.toBeInTheDocument();
    expect(screen.getByText('AIWMC Quantis')).toBeInTheDocument();
  });

  it('opens on the product named in ?product= (entry from build.aiwmc.store/admin)', async () => {
    render(<MemoryRouter initialEntries={['/admin/growth-studio?product=build']}><HelmetProvider><GrowthStudioOS /></HelmetProvider></MemoryRouter>);
    await screen.findByRole('heading', { name: 'AIWMC Growth Studio OS' });
    expect(screen.getByText('AIWMC Build')).toBeInTheDocument();
    expect(screen.queryByText('AIWMC Quantis')).not.toBeInTheDocument();
  });
});
