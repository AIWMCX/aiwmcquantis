import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// 2026-11-06: /pricing stuck on "Processing..." after a failed checkout.
// Every pricing/upgrade CTA resets its button with
// `createCheckout(...).catch(() => setLoading(false))`, but createCheckout
// swallowed the error, so the catch never ran. It must reject on failure,
// and show the function's own error message instead of supabase-js's
// generic "non-2xx status code".

const invoke = vi.fn();
const toast = vi.fn();

// Any supabase query chain resolves to "no rows": the hook's own data
// loading is not under test here.
const chain: any = new Proxy(function () {}, {
  get: (_t, prop) => (prop === 'then' ? (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) : chain),
  apply: () => chain,
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: new Proxy({}, {
    get: (_t, prop) => (prop === 'functions' ? { invoke } : chain),
  }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'owner@example.com' }, session: null, loading: false }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/analytics', () => ({ trackCheckoutStart: vi.fn() }));

import { useSubscription } from '@/hooks/useSubscription';

describe('createCheckout failure', () => {
  beforeEach(() => {
    invoke.mockReset();
    toast.mockReset();
  });

  it('rejects so the CTA can leave its loading state, and shows the server message', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('Edge Function returned a non-2xx status code'), {
        context: new Response(JSON.stringify({ error: "No such customer: 'founder_lifetime'" }), { status: 400 }),
      }),
    });
    const { result } = renderHook(() => useSubscription());

    await expect(result.current.createCheckout('plus', undefined, 'annual')).rejects.toThrow(
      "No such customer: 'founder_lifetime'",
    );
    expect(toast).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'Checkout Error', description: "No such customer: 'founder_lifetime'" }),
    );
  });

  it('rejects when the function answers without a checkout URL', async () => {
    invoke.mockResolvedValue({ data: {}, error: null });
    const { result } = renderHook(() => useSubscription());

    await expect(result.current.createCheckout('pro')).rejects.toThrow('No checkout URL received');
  });
});
