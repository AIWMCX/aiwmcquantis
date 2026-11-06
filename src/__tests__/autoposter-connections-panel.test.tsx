import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const status = (over: Record<string, unknown>) => ({
  configured: true, redirect_uri: 'https://ref.supabase.co/functions/v1/x', connected: false, account_id: null,
  token_expires: null, last_tested: null, has_refresh_token: false, ...over,
});

const { responses, invoke } = vi.hoisted(() => {
  const responses: Record<string, Record<string, unknown>> = {};
  const invoke = vi.fn(async (name: string, opts?: { body?: { action?: string } }) =>
    ({ data: responses[`${name}:${opts?.body?.action}`] ?? null, error: null }));
  return { responses, invoke };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));

import { ConnectionsPanel } from '@/components/autoposter/ConnectionsPanel';

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><ConnectionsPanel /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Autoposter Connections panel (LinkedIn + X, admin API only)', () => {
  const assign = vi.fn();
  const realLocation = window.location;

  beforeEach(() => {
    invoke.mockClear();
    assign.mockClear();
    for (const k of Object.keys(responses)) delete responses[k];
    Object.defineProperty(window, 'location', { configurable: true, value: { ...realLocation, assign } });
  });
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  it('loads both cards from each function\'s status action', async () => {
    responses['oauth-linkedin-callback:status'] = status({ connected: true, account_id: 'li-member', token_expires: '2999-01-01T00:00:00Z' });
    responses['oauth-twitter-callback:status'] = status({ configured: false });
    renderPanel();

    expect(await screen.findByText('li-member')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'X' })).toBeTruthy();
    expect(await screen.findByText('TWITTER_CLIENT_ID')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect X/ })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: /Reconnect LinkedIn/ })).toHaveProperty('disabled', false);
    expect(invoke).toHaveBeenCalledWith('oauth-linkedin-callback', { body: { action: 'status' } });
    expect(invoke).toHaveBeenCalledWith('oauth-twitter-callback', { body: { action: 'status' } });
  });

  it('Connect X asks the X function to start and sends the browser to the returned URL', async () => {
    responses['oauth-linkedin-callback:status'] = status({});
    responses['oauth-twitter-callback:status'] = status({});
    responses['oauth-twitter-callback:start'] = { url: 'https://twitter.com/i/oauth2/authorize?state=s' };
    renderPanel();

    const btn = await screen.findByRole('button', { name: /Connect X/ });
    await waitFor(() => expect(btn).toHaveProperty('disabled', false));
    fireEvent.click(btn);

    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://twitter.com/i/oauth2/authorize?state=s'));
    expect(invoke).toHaveBeenCalledWith('oauth-twitter-callback', { body: { action: 'start' } });
    expect(invoke).not.toHaveBeenCalledWith('oauth-linkedin-callback', { body: { action: 'start' } });
  });
});
